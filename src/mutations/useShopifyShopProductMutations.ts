import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { deleteShopifyShopProduct, triggerSolrIndex, upsertShopifyShopProduct } from "@/api/pim"
import type { ShopifyShopProduct } from "@/domain/types/product"

export interface ShopifyLinkKey { shopId: string; shopifyProductId: string }
export interface ShopifyLinkPayload extends ShopifyLinkKey { shopifyInventoryItemId: string }
import { qk } from "@/queries/keys"

export function useShopifyShopProductMutations(productId: () => string, parentProductId: () => string) {
  const queryClient = useQueryClient()
  const listKey = () => qk.product.shopifyShopProducts(productId())

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: listKey() })

    return queryClient.getQueryData<ShopifyShopProduct[]>(listKey())
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey() })
    triggerSolrIndex(parentProductId())
  }

  // A link's key is its shop plus its Shopify ID, so a product can have several links to one shop.
  const sameLink = (row: { shopId: string; shopifyProductId: string }, key: ShopifyLinkKey) =>
    row.shopId === key.shopId && row.shopifyProductId === key.shopifyProductId

  const upsert = useMutation({
    mutationFn: (payload: ShopifyLinkPayload) => upsertShopifyShopProduct({ productId: productId(), ...payload }),
    onMutate: async (payload) => {
      const previous = await snapshot()
      queryClient.setQueryData<ShopifyShopProduct[]>(listKey(), (rows = []) => {
        const entry: ShopifyShopProduct = { productId: productId(), ...payload }

        return rows.some((row) => sameLink(row, payload)) ? rows.map((row) => (sameLink(row, payload) ? entry : row)) : [...rows, entry]
      })

      return { previous }
    },
    onError: (_e, _p, ctx) => queryClient.setQueryData(listKey(), ctx?.previous),
    onSettled: invalidate
  })

  const remove = useMutation({
    mutationFn: (key: ShopifyLinkKey) => deleteShopifyShopProduct(productId(), key.shopId, key.shopifyProductId),
    onMutate: async (key) => {
      const previous = await snapshot()
      queryClient.setQueryData<ShopifyShopProduct[]>(listKey(), (rows = []) => rows.filter((row) => !sameLink(row, key)))

      return { previous }
    },
    onError: (_e, _p, ctx) => queryClient.setQueryData(listKey(), ctx?.previous),
    onSettled: invalidate
  })

  // A new Shopify ID is a new key: save the new link, then drop the old one. The old link stays if the
  // save fails, so a failed change never leaves the product unlinked.
  const replace = useMutation({
    mutationFn: async ({ from, to }: { from: ShopifyLinkKey; to: ShopifyLinkPayload }) => {
      await upsertShopifyShopProduct({ productId: productId(), ...to })
      if(!sameLink(to, from)) {await deleteShopifyShopProduct(productId(), from.shopId, from.shopifyProductId)}
    },
    onSettled: invalidate
  })

  return { upsert, remove, replace }
}

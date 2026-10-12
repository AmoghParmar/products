import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { addProductKeyword, removeProductKeyword, triggerSolrIndex } from "@/api/pim"
import { qk } from "@/queries/keys"
import type { ProductSummary } from "@/domain/types/product"

/** Optimistic add/remove for product keywords (tags).
 *
 * - Anchor/virtual product: tags live in the individual Solr cache (qk.product.solr).
 * - Variant product: tags live inside the family members array (qk.product.family).
 *   Pass `anchorProductId` to activate the family-cache path.
 */
export function useTagMutations(
  productId: () => string,
  options?: { anchorProductId?: () => string; parentProductId?: () => string }
) {
  const queryClient = useQueryClient()

  const isVariant = Boolean(options?.anchorProductId)

  const solrKey = () => qk.product.solr(productId())
  const familyKey = () => qk.product.family(options?.anchorProductId?.() ?? "")
  const getParentProductId = options?.parentProductId ?? productId

  const invalidate = () => {
    if(isVariant) {
      queryClient.invalidateQueries({ queryKey: familyKey(), refetchType: "none" })
    } else {
      queryClient.invalidateQueries({ queryKey: solrKey(), refetchType: "none" })
    }
    queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
    triggerSolrIndex(getParentProductId())
  }

  const snapshotSolr = async () => {
    await queryClient.cancelQueries({ queryKey: solrKey() })

    return queryClient.getQueryData<ProductSummary | null>(solrKey())
  }

  const snapshotFamily = async () => {
    await queryClient.cancelQueries({ queryKey: familyKey() })

    return queryClient.getQueryData<ProductSummary[]>(familyKey())
  }

  const add = useMutation({
    mutationFn: (keyword: string) => addProductKeyword(productId(), keyword),
    onMutate: async (keyword) => {
      if(isVariant) {
        const previous = await snapshotFamily()
        queryClient.setQueryData<ProductSummary[]>(familyKey(), (members = []) =>
          members.map((m) => m.productId === productId() ? { ...m, tags: [...m.tags, keyword] } : m))

        return { previous }
      }

      const previous = await snapshotSolr()
      queryClient.setQueryData<ProductSummary | null>(solrKey(), (data) =>
        data ? { ...data, tags: [...data.tags, keyword] } : data)

      return { previous }
    },
    onError: (_error, _keyword, context) => {
      if(isVariant) {
        queryClient.setQueryData(familyKey(), context?.previous)
      } else {
        queryClient.setQueryData(solrKey(), context?.previous)
      }
    },
    onSettled: invalidate
  })

  const remove = useMutation({
    mutationFn: (keyword: string) => removeProductKeyword(productId(), keyword),
    onMutate: async (keyword) => {
      if(isVariant) {
        const previous = await snapshotFamily()
        queryClient.setQueryData<ProductSummary[]>(familyKey(), (members = []) =>
          members.map((m) => m.productId === productId() ? { ...m, tags: m.tags.filter((t) => t !== keyword) } : m))

        return { previous }
      }

      const previous = await snapshotSolr()
      queryClient.setQueryData<ProductSummary | null>(solrKey(), (data) =>
        data ? { ...data, tags: data.tags.filter((t) => t !== keyword) } : data)

      return { previous }
    },
    onError: (_error, _keyword, context) => {
      if(isVariant) {
        queryClient.setQueryData(familyKey(), context?.previous)
      } else {
        queryClient.setQueryData(solrKey(), context?.previous)
      }
    },
    onSettled: invalidate
  })

  return { add, remove }
}

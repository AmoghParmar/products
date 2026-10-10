import { useQuery } from "@tanstack/vue-query"
import { type MaybeRefOrGetter, computed, toValue } from "vue"
import { productDocumentsOptions } from "@/queries/products"

/** Solr documents for a list of products in one request, so a list built from another API can show
 *  the product identifier setting. A product not found (or not loaded yet) has no document. */
export function useProductDocuments(productIds: MaybeRefOrGetter<string[]>) {
  const documentsQuery = useQuery(computed(() => productDocumentsOptions(toValue(productIds))))

  return {
    documentFor: (productId: string): Record<string, unknown> | undefined => documentsQuery.data.value?.[productId]
  }
}

import { useQuery } from "@tanstack/vue-query"
import { type MaybeRefOrGetter, computed, toValue } from "vue"
import { rowSalesAnalyticsOptions } from "@/queries/products"

/** Each listed product's last 30 days of sales, in one query, with the largest daily count so every
 *  row's sparkline shares one scale. A product is absent until the sales have loaded. */
export function useRowSales(productIds: MaybeRefOrGetter<string[]>) {
  const rowSalesQuery = useQuery(computed(() => rowSalesAnalyticsOptions(toValue(productIds))))
  const rowSales = computed(() => rowSalesQuery.data.value ?? {})
  const rowSalesMax = computed(() => Math.max(0, ...Object.values(rowSales.value).flatMap((spark) => spark.series)))

  return { rowSales, rowSalesMax }
}

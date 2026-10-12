import { infiniteQueryOptions } from "@tanstack/vue-query"
import { PRODUCT_CALENDAR_PAGE_SIZE, fetchProductCalendar } from "@/api/productCalendar"
import { qk } from "./keys"
import { fetchProductsById } from "./products"

/** ProductStore calendar rows, one server page at a time. The keyword is part of the key, so a new
 *  search starts again from page 0; the service's totalCount decides whether another page exists.
 *  Each page also carries the Solr documents of its products (image, identifiers); a failed lookup
 *  leaves the rows without images instead of failing the page. */
export function productCalendarOptions(productStoreId: string, keyword: string) {
  return infiniteQueryOptions({
    queryKey: qk.productCalendar.list(productStoreId, keyword),
    queryFn: async ({ pageParam }) => {
      const page = await fetchProductCalendar(productStoreId, pageParam, keyword)
      const products = await fetchProductsById(page.rows.map((row) => String(row.productId ?? "")))
        .catch((): Record<string, Record<string, unknown>> => ({}))

      return { ...page, products }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if(!lastPage.rows.length) {return undefined}
      if(lastPage.totalCount === null) {return lastPage.rows.length < PRODUCT_CALENDAR_PAGE_SIZE ? undefined : pages.length}
      const loaded = pages.reduce((count, page) => count + page.rows.length, 0)

      return loaded < lastPage.totalCount ? pages.length : undefined
    },
    enabled: Boolean(productStoreId)
  })
}

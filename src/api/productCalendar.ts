import type { ProductCalendarDateField } from "@/domain/product/calendar"
import { PRODUCT_CALENDAR_MAPPING_TYPE } from "@/utils/productCalendarMappings"
import { request, responseList } from "./http"

export const PRODUCT_CALENDAR_PAGE_SIZE = 50

/** Epoch millis sets a date, null clears it; fields left out are not sent and stay as they are. */
export type ProductCalendarDateChanges = Partial<Record<ProductCalendarDateField, number | null>>

export interface ProductCalendarPage {
  rows: Record<string, unknown>[]
  /** Rows matching the store and keyword across every page; null when the service omits it. */
  totalCount: number | null
  pageIndex: number
}

/** One page of findProductStoreProductCalendar. The service matches `keyword` against product ID,
 *  product name, and internal name, so search covers the whole store rather than loaded rows. */
export async function fetchProductCalendar(productStoreId: string, pageIndex = 0, keyword = ""): Promise<ProductCalendarPage> {
  if(!productStoreId) {return { rows: [], totalCount: 0, pageIndex }}

  const data = await request<Record<string, unknown>>({
    url: "oms/productStoreProductCalendar",
    method: "get",
    params: { productStoreId, pageIndex, pageSize: PRODUCT_CALENDAR_PAGE_SIZE, ...(keyword ? { keyword } : {}) }
  })

  return {
    rows: responseList(data),
    totalCount: typeof data?.totalCount === "number" ? data.totalCount : null,
    pageIndex
  }
}

/** store#ProductStoreProduct on the same resource: creates or updates the store membership row. */
export function storeProductCalendarDates(productStoreId: string, productId: string, changes: ProductCalendarDateChanges) {
  return request({
    url: "oms/productStoreProductCalendar",
    method: "post",
    data: { productStoreId, productId, ...changes }
  })
}

export async function fetchProductStoreShops(productStoreId: string) {
  if(!productStoreId) {return []}

  return responseList(await request({
    url: "sob/shopify/shops",
    method: "get",
    params: { productStoreId, pageSize: 200 }
  }))
}

export async function fetchProductCalendarMappings() {
  return responseList(await request({
    url: "sob/shopify/typeMappings",
    method: "get",
    params: { mappedTypeId: PRODUCT_CALENDAR_MAPPING_TYPE, pageSize: 500 }
  }))
}

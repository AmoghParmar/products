import { beforeEach, describe, expect, it, vi } from "vitest"
import { request } from "../http"

vi.mock("../http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../http")>()),
  request: vi.fn()
}))

import { fetchProductCalendar, fetchProductCalendarMappings, storeProductCalendarDates } from "../productCalendar"

describe("product calendar API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches one page of calendar dates within the selected ProductStore", async () => {
    vi.mocked(request).mockResolvedValueOnce({ pageIndex: 2, pageSize: 50, totalCount: 46632, calendarRows: [{ productId: "106447" }] })

    const page = await fetchProductCalendar("RAILS", 2)

    expect(request).toHaveBeenCalledWith({
      url: "oms/productStoreProductCalendar",
      method: "get",
      params: { productStoreId: "RAILS", pageIndex: 2, pageSize: 50 }
    })
    expect(page).toEqual({ rows: [{ productId: "106447" }], totalCount: 46632, pageIndex: 2 })
  })

  it("searches the whole ProductStore through the service keyword", async () => {
    vi.mocked(request).mockResolvedValueOnce({ totalCount: 92, calendarRows: [] })

    await fetchProductCalendar("RAILS", 0, "carson")

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      params: { productStoreId: "RAILS", pageIndex: 0, pageSize: 50, keyword: "carson" }
    }))
  })

  it("does not present loaded rows as the total when the service omits totalCount", async () => {
    vi.mocked(request).mockResolvedValueOnce({ calendarRows: [{ productId: "106447" }] })

    expect((await fetchProductCalendar("RAILS")).totalCount).toBeNull()
  })

  it("skips the request without a ProductStore", async () => {
    expect(await fetchProductCalendar("")).toEqual({ rows: [], totalCount: 0, pageIndex: 0 })
    expect(request).not.toHaveBeenCalled()
  })

  it("stores only the dates that changed, with null clearing a date", async () => {
    vi.mocked(request).mockResolvedValueOnce({ productId: "106447", productStoreId: "RAILS" })

    await storeProductCalendarDates("RAILS", "106447", { releaseDate: 1790838000000, salesDiscontinuationDate: null })

    expect(request).toHaveBeenCalledWith({
      url: "oms/productStoreProductCalendar",
      method: "post",
      data: { productStoreId: "RAILS", productId: "106447", releaseDate: 1790838000000, salesDiscontinuationDate: null }
    })
  })

  it("reads only calendar metafield mappings", async () => {
    vi.mocked(request).mockResolvedValueOnce([])

    await fetchProductCalendarMappings()

    expect(request).toHaveBeenCalledWith({
      url: "sob/shopify/typeMappings",
      method: "get",
      params: { mappedTypeId: "SHOPIFY_PRODUCT_CALENDAR_DATE", pageSize: 500 }
    })
  })
})

import { describe, expect, it, vi } from "vitest"

vi.mock("@/api/productCalendar", () => ({
  PRODUCT_CALENDAR_PAGE_SIZE: 2,
  fetchProductCalendar: vi.fn()
}))

vi.mock("../products", () => ({
  fetchProductsById: vi.fn()
}))

import { productCalendarOptions } from "../productCalendar"

const page = (size: number, totalCount: number | null, pageIndex: number) => ({
  rows: Array.from({ length: size }, (_, index) => ({ productId: `${pageIndex}-${index}` })),
  totalCount,
  pageIndex,
  products: {}
})

type Page = ReturnType<typeof page>

// Vue Query types the options as a union that hides these members; the tests only need their values.
const optionsFor = (productStoreId: string, keyword: string) => productCalendarOptions(productStoreId, keyword) as unknown as {
  queryKey: readonly unknown[]
  enabled: boolean
  getNextPageParam: (lastPage: Page, pages: Page[], lastPageParam: number, allPageParams: number[]) => number | undefined
}

describe("product calendar query", () => {
  const { getNextPageParam } = optionsFor("STORE", "")

  it("requests the next page until the service total is loaded", () => {
    const first = page(2, 5, 0)
    const second = page(2, 5, 1)
    const last = page(1, 5, 2)

    expect(getNextPageParam(first, [first], 0, [0])).toBe(1)
    expect(getNextPageParam(second, [first, second], 1, [0, 1])).toBe(2)
    expect(getNextPageParam(last, [first, second, last], 2, [0, 1, 2])).toBeUndefined()
  })

  it("stops on an empty page even when the total promises more rows", () => {
    const first = page(2, 9, 0)
    const empty = page(0, 9, 1)

    expect(getNextPageParam(empty, [first, empty], 1, [0, 1])).toBeUndefined()
  })

  it("pages by full pages when the service omits the total", () => {
    const full = page(2, null, 0)
    const partial = page(1, null, 1)

    expect(getNextPageParam(full, [full], 0, [0])).toBe(1)
    expect(getNextPageParam(partial, [full, partial], 1, [0, 1])).toBeUndefined()
  })

  it("keys each search separately and waits for a ProductStore", () => {
    expect(optionsFor("STORE", "carson").queryKey).toEqual(["productCalendar", "STORE", "carson"])
    expect(optionsFor("", "").enabled).toBe(false)
  })
})

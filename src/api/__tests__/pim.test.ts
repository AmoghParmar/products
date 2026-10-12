import { describe, expect, it, vi } from "vitest"
import { removeProductKeyword, triggerSolrIndex } from "../pim"
import { request } from "../http"

vi.mock("../http", () => ({
  request: vi.fn(() => Promise.resolve({})),
  responseList: vi.fn((data: unknown) => data)
}))

vi.mock("@/store/user", () => ({
  useUserStore: vi.fn()
}))

const mockedRequest = vi.mocked(request)

describe("triggerSolrIndex", () => {
  it("uses the oms product indexing endpoint", () => {
    mockedRequest.mockClear()

    triggerSolrIndex("M101989", { indexVariants: false })

    expect(mockedRequest).toHaveBeenCalledWith({
      url: "oms/search/index/product",
      method: "post",
      data: {
        productId: "M101989",
        indexVariants: false
      }
    })
  })
})

describe("removeProductKeyword", () => {
  it("disapproves the tag keyword instead of deleting it", async () => {
    mockedRequest.mockClear()

    await removeProductKeyword("M101989", "Women")

    expect(mockedRequest).toHaveBeenCalledWith({
      url: "oms/products/M101989/keywords",
      method: "post",
      data: { keyword: "Women", keywordTypeId: "KWT_TAG", statusId: "KW_DISAPPROVED" }
    })
  })
})

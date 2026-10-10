import { describe, expect, it } from "vitest"
import { identifierCoveragePayload, listPriceField, productScopeFilters, productSearchQueryText, productSort, rowSalesAnalyticsPayload, tagFacetPayload, workbenchSearchPayload } from "../productQuery"
import type { ProductSearchParams } from "../../types/product"

const params: ProductSearchParams = {
  queryString: "crew tee",
  productTypeId: "FINISHED_GOOD",
  productKind: "Variants",
  productStoreId: "PIM_STORE",
  tags: ["summer"],
  sort: "UpdatedDesc",
  pageSize: 25
}

describe("productScopeFilters", () => {
  it("builds scope filters from every active facet", () => {
    expect(productScopeFilters(params)).toEqual([
      "docType:PRODUCT",
      "productTypeId:FINISHED_GOOD",
      "isVariant:true",
      "productStoreIds:PIM_STORE",
      "tags:\"summer\""
    ])
  })

  it("treats All selections as no filter", () => {
    expect(productScopeFilters({ productTypeId: "All", productStoreId: "All", productKind: "All", tags: [] })).toEqual([
      "docType:PRODUCT"
    ])
  })
})

describe("search text", () => {
  it("tokenizes and wraps in wildcards", () => {
    expect(productSearchQueryText(" crew  tee ")).toBe("*crew tee*")
  })

  it("escapes solr specials", () => {
    expect(productSearchQueryText("a+b")).toBe("*a\\+b*")
  })

  it("matches all docs when empty", () => {
    expect(productSearchQueryText("   ")).toBe("*:*")
  })
})

describe("productSort", () => {
  it("sorts on indexed fields and breaks ties by productId so pages never overlap", () => {
    expect(productSort("IntroducedDesc")).toBe("introductionDate desc, productId asc")
    expect(productSort("UpdatedAsc")).toBe("updatedDatetime asc, productId asc")
    expect(productSort("NameDesc")).toBe("productName desc, productId asc")
    expect(productSort("SkuAsc")).toBe("sku asc, productId asc")
  })

  it("keeps a virtual ahead of its variants in the family sort", () => {
    expect(productSort("Family")).toBe("groupId asc, isVirtual desc, productName asc, productId asc")
  })

  it("sorts price on the store's field with unpriced products last, or falls back without one", () => {
    const field = listPriceField("STORE_GROUP", "USD")
    expect(field).toBe("LIST_PRICE_PURCHASE_USD_STORE_GROUP_price")
    expect(productSort("PriceDesc", field)).toBe(`${field} desc, productId asc`)
    expect(productSort("PriceAsc", field)).toBe(`def(${field},1e15) asc, productId asc`)
    expect(productSort("PriceAsc")).toBe(productSort("IntroducedDesc"))
  })

  it("builds no price field from a missing or unsafe store group", () => {
    expect(listPriceField("", "USD")).toBe("")
    expect(listPriceField("STORE GROUP) OR (x", "USD")).toBe("")
  })
})

describe("payloads", () => {
  it("pages with offset and searches across all identifier fields including upc", () => {
    const payload = workbenchSearchPayload(params, 2)
    expect(payload.offset).toBe(50)
    expect(payload.limit).toBe(25)
    expect(payload.params).toEqual({ "defType": "edismax", "q.op": "OR", "qf": "productId groupId parentProductName productName internalName sku upc" })
    expect(payload.sort).toBe("updatedDatetime desc, productId asc")
  })


  it("builds one batched row sales analytics facet for visible products", () => {
    const payload = rowSalesAnalyticsPayload(["SKU-1", "SKU+2", "SKU-1"], "2026-06-01T00:00:00Z")

    expect(payload.limit).toBe(0)
    expect(payload.params).toEqual({ "q.op": "AND" })
    expect(payload.filter).toEqual([
      "docType: ORDER",
      "orderTypeId: SALES_ORDER",
      "-orderStatusId: ORDER_CANCELLED",
      "-orderItemStatusId: ITEM_CANCELLED",
      "productId: (\"SKU\\-1\" OR \"SKU\\+2\")",
      "orderDate: [2026-06-01T00:00:00Z TO NOW]"
    ])
    expect(payload.facet?.byDay).toEqual({
      type: "range",
      field: "orderDate",
      start: "2026-06-01T00:00:00Z",
      end: "NOW",
      gap: "+1DAY",
      facet: {
        byProduct: { type: "terms", field: "productId", limit: 2 }
      }
    })
  })

  it("excludes the tag filter from the tag facet scope", () => {
    const payload = tagFacetPayload(params)
    expect(payload.filter).not.toContain("tags:\"summer\"")
    expect(payload.facet?.tags).toBeTruthy()
  })
})

describe("identifierCoveragePayload", () => {
  it("counts document fields with a value and identifications saved with one", () => {
    const payload = identifierCoveragePayload([
      { id: "groupName", isDocumentField: true },
      { id: "UPCA", isDocumentField: false }
    ])

    expect(payload.limit).toBe(0)
    expect(payload.filter).toEqual(["docType:PRODUCT"])
    expect(payload.facet).toEqual({
      i0: { type: "query", q: "groupName:[* TO *]" },
      i1: { type: "query", q: "goodIdentifications:UPCA/* -goodIdentifications:\"UPCA/null\"" }
    })
  })

  it("leaves out an id that is not a plain name, keeping the other facet keys", () => {
    const payload = identifierCoveragePayload([
      { id: "bad id) OR (x", isDocumentField: false },
      { id: "SKU", isDocumentField: false }
    ])

    expect(Object.keys(payload.facet ?? {})).toEqual(["i1"])
  })
})

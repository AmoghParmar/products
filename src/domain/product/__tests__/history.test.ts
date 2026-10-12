import { describe, expect, it } from "vitest"
import type { ProductHistoryEntry } from "../../types/product"
import { GOOD_IDENTIFICATION_ENTITY, PRODUCT_FACILITY_ENTITY, historyChange, historySubject } from "../history"

const entry = (overrides: Partial<ProductHistoryEntry>): ProductHistoryEntry => ({
  id: "1", productId: "M100054", changedEntityName: GOOD_IDENTIFICATION_ENTITY, changedFieldName: "idValue",
  oldValue: "", newValue: "", changedByUserId: "100051", changedByName: "HotWax User", changedDate: "",
  pkPrimaryValue: "SKU", pkSecondaryValue: "M100054", ...overrides
})

describe("historyChange", () => {
  it("tells a first value, a cleared one and a changed one apart", () => {
    expect(historyChange({ oldValue: "", newValue: "Hoodie-m" })).toEqual({ kind: "set", from: "", to: "Hoodie-m" })
    expect(historyChange({ oldValue: "Hoodie-m", newValue: " " })).toEqual({ kind: "cleared", from: "Hoodie-m", to: "" })
    expect(historyChange({ oldValue: "A", newValue: "B" })).toEqual({ kind: "changed", from: "A", to: "B" })
  })

  it("shows audited indicators as Yes and No", () => {
    expect(historyChange({ oldValue: "N", newValue: "Y" })).toEqual({ kind: "changed", from: "No", to: "Yes" })
  })
})

describe("historySubject", () => {
  it("reads the identification type from a GoodIdentification's first key", () => {
    expect(historySubject(entry({}))).toEqual({ kind: "identification", identificationTypeId: "SKU" })
  })

  it("reads the facility from a ProductFacility's second key", () => {
    expect(historySubject(entry({ changedEntityName: PRODUCT_FACILITY_ENTITY, changedFieldName: "minimumStock", pkPrimaryValue: "M100054", pkSecondaryValue: "BROADWAY" })))
      .toEqual({ kind: "facility", facilityId: "BROADWAY", field: "minimumStock" })
  })

  it("falls back to the entity and field for anything else", () => {
    expect(historySubject(entry({ changedEntityName: "org.apache.ofbiz.product.product.Product", changedFieldName: "productName" })))
      .toEqual({ kind: "other", entity: "Product", field: "productName" })
  })
})

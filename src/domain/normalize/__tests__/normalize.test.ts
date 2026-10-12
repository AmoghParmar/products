import { describe, expect, it } from "vitest"
import { normalizeProductCore, normalizeProductSummary, productDisplayName } from "../product"
import { expiresInDays, groupAssociations, normalizeAssociation } from "../association"
import { buildFeatureAxes, featureCatalogMap, normalizeFeatureApplication } from "../feature"
import { flagValue, isActive, isoDate, numberValue } from "../value"

describe("value helpers", () => {
  it("coerces flags from Y/N and booleans", () => {
    expect(flagValue("Y")).toBe(true)
    expect(flagValue("n")).toBe(false)
    expect(flagValue(true)).toBe(true)
    expect(flagValue(null)).toBe(false)
  })

  it("normalizes epoch millis and ISO-ish strings to ISO", () => {
    expect(isoDate(1738396800000)).toBe("2025-02-01T08:00:00.000Z")
    expect(isoDate("2025-02-01T08:00:00.000Z")).toBe("2025-02-01T08:00:00.000Z")
    expect(isoDate("")).toBeNull()
    expect(isoDate(null)).toBeNull()
  })

  it("computes active from from/thru dates", () => {
    const now = Date.parse("2025-06-01T00:00:00Z")
    expect(isActive("2025-01-01T00:00:00Z", null, now)).toBe(true)
    expect(isActive("2025-01-01T00:00:00Z", "2025-05-01T00:00:00Z", now)).toBe(false)
    expect(isActive("2025-07-01T00:00:00Z", null, now)).toBe(false)
  })

  it("parses numbers defensively", () => {
    expect(numberValue("1.5")).toBe(1.5)
    expect(numberValue("")).toBeNull()
    expect(numberValue("abc")).toBeNull()
  })
})

describe("product normalizers", () => {
  it("maps a pim solr doc to a summary", () => {
    const summary = normalizeProductSummary({
      productId: "P1", productName: "Tee", isVirtual: true, isVariant: false,
      sku: "SKU-1", tags: ["summer"], variantCount: 4, mainImageUrl: "http://img"
    })
    expect(summary.productId).toBe("P1")
    expect(summary.isVirtual).toBe(true)
    expect(summary.variantCount).toBe(4)
    expect(summary.imageUrl).toBe("http://img")
  })

  it("maps an entity record to a core with indicator + dimension fallbacks", () => {
    const core = normalizeProductCore({
      productId: "P1", returnable: "Y", salesDiscWhenNotAvail: "N",
      shippingWeight: "2.5", smallImageUrl: "", mediumImageUrl: "http://m"
    })
    expect(core.returnable).toBe(true)
    expect(core.salesDiscWhenNotAvail).toBe(false)
    expect(core.productWeight).toBe(2.5)
    expect(core.imageUrl).toBe("http://m")
  })

  it("sorts latest active prices first and keeps price primary-key context", () => {
    const latestFromDate = Date.UTC(2025, 8, 10, 9, 48, 44, 927)
    const olderFromDate = Date.UTC(2025, 7, 10, 9, 48, 44, 927)
    const expiredThruDate = Date.UTC(2025, 6, 10, 9, 48, 44, 927)
    const core = normalizeProductCore({
      productId: "P1",
      prices: [
        {
          productPriceTypeId: "DEFAULT_PRICE",
          productPricePurposeId: "LISTING",
          currencyUomId: "USD",
          productStoreId: "STORE",
          productStoreGroupId: "GROUP",
          price: "20",
          fromDate: latestFromDate
        },
        {
          productPriceTypeId: "DEFAULT_PRICE",
          productPricePurposeId: "LISTING",
          currencyUomId: "USD",
          productStoreId: "STORE",
          productStoreGroupId: "GROUP",
          price: "15",
          fromDate: olderFromDate
        },
        {
          productPriceTypeId: "DEFAULT_PRICE",
          productPricePurposeId: "LISTING",
          currencyUomId: "USD",
          productStoreId: "STORE",
          productStoreGroupId: "GROUP",
          price: "10",
          fromDate: "2026-04-01T00:00:00Z",
          thruDate: expiredThruDate
        }
      ]
    })

    expect(core.prices.map((price) => price.price)).toEqual([20, 15, 10])
    expect(core.prices[0]).toMatchObject({
      productStoreId: "STORE",
      productStoreGroupId: "GROUP",
      fromDate: "2025-09-10T09:48:44.927Z",
      active: true
    })
    expect(core.prices[2].active).toBe(false)
  })

  it("prefers the Solr-indexed detail image over legacy image fields", () => {
    const core = normalizeProductCore({
      productId: "P1", detailImageUrl: "http://detail", smallImageUrl: "http://small"
    })

    expect(core.imageUrl).toBe("http://detail")
  })

  it("falls back through the display-name chain", () => {
    expect(productDisplayName({ productId: "P1", productName: "", internalName: "int" })).toBe("int")
    expect(productDisplayName({ productId: "P1" })).toBe("P1")
  })
})

describe("associations", () => {
  const base = { productAssocTypeId: "PRODUCT_SUBSTITUTE", fromDate: "2025-01-01T00:00:00Z" }

  it("derives direction and the related product from the viewed product", () => {
    const outgoing = normalizeAssociation({ ...base, productId: "A", productIdTo: "B" }, "A")
    expect(outgoing.direction).toBe("outgoing")
    expect(outgoing.relatedProductId).toBe("B")

    const incoming = normalizeAssociation({ ...base, productId: "A", productIdTo: "B" }, "B")
    expect(incoming.direction).toBe("incoming")
    expect(incoming.relatedProductId).toBe("A")
  })

  it("groups outgoing links by card type", () => {
    const rows = [
      normalizeAssociation({ productId: "K", productIdTo: "C1", productAssocTypeId: "PRODUCT_COMPONENT", fromDate: base.fromDate }, "K"),
      normalizeAssociation({ productId: "K", productIdTo: "S1", productAssocTypeId: "PRODUCT_SUBSTITUTE", fromDate: base.fromDate }, "K"),
      normalizeAssociation({ productId: "V", productIdTo: "K", productAssocTypeId: "PRODUCT_VARIANT", fromDate: base.fromDate }, "K")
    ]
    const groups = groupAssociations(rows)
    expect(groups.components.map((assoc) => assoc.relatedProductId)).toEqual(["C1"])
    expect(groups.substitutes.map((assoc) => assoc.relatedProductId)).toEqual(["S1"])
    expect(groups.other).toHaveLength(1) // the incoming variant link
  })

  it("computes scheduled-expiry days", () => {
    const now = Date.parse("2025-06-01T00:00:00Z")
    const assoc = normalizeAssociation({ ...base, productId: "A", productIdTo: "B", thruDate: "2025-06-11T00:00:00Z" }, "A")
    expect(expiresInDays(assoc, now)).toBe(10)
    expect(expiresInDays({ ...assoc, thruDate: null }, now)).toBeNull()
  })
})

describe("features", () => {
  it("joins appls with the catalog and groups into sorted axes", () => {
    const catalog = featureCatalogMap([
      { productFeatureId: "F_RED", description: "Red", productFeatureTypeId: "COLOR" },
      { productFeatureId: "F_M", description: "M", productFeatureTypeId: "SIZE" }
    ])
    const labels = new Map([["COLOR", "Color"], ["SIZE", "Size"]])
    const appls = [
      normalizeFeatureApplication({ productId: "P", productFeatureId: "F_M", fromDate: "2025-01-01T00:00:00Z", sequenceNum: 1 }, catalog, labels),
      normalizeFeatureApplication({ productId: "P", productFeatureId: "F_RED", fromDate: "2025-01-01T00:00:00Z", sequenceNum: 1 }, catalog, labels)
    ]
    const axes = buildFeatureAxes(appls)
    expect(axes.map((axis) => axis.featureTypeDescription)).toEqual(["Color", "Size"])
    expect(axes[0].applications[0].description).toBe("Red")
  })

  it("excludes expired applications from axes", () => {
    const catalog = featureCatalogMap([{ productFeatureId: "F", description: "X", productFeatureTypeId: "T" }])
    const appl = normalizeFeatureApplication(
      { productId: "P", productFeatureId: "F", fromDate: "2025-01-01T00:00:00Z", thruDate: "2025-01-02T00:00:00Z" },
      catalog,
      new Map()
    )
    expect(buildFeatureAxes([appl])).toEqual([])
  })
})

import { describe, expect, it } from "vitest"
import {
  familyFeatureOptions, familyRouteFor, familyVariants, featureSelectionFromValues, variantForSelection
} from "../family"
import type { ProductSummary } from "../../types/product"

const member = (over: Partial<ProductSummary>): ProductSummary => ({
  productId: "", productName: "", internalName: "", brandName: "", productTypeId: "FINISHED_GOOD",
  isVirtual: false, isVariant: true, parentProductId: "TEE", parentProductName: "Tee",
  sku: "", upc: "", tags: [], featureValues: [], primaryProductCategoryId: "", primaryProductCategoryName: "",
  productStoreIds: [], imageUrl: "", createdDate: "", lastModifiedDate: "", variantCount: 0,
  goodIdentifications: [], groupId: "", groupName: "", title: "", ...over
})

const RED_S = member({ productId: "V1", sku: "T-R-S", featureValues: ["Color/Red", "Size/S"] })
const RED_M = member({ productId: "V2", sku: "T-R-M", featureValues: ["Color/Red", "Size/M"] })
const BLU_S = member({ productId: "V3", sku: "T-B-S", featureValues: ["Color/Blue", "Size/S"] })
const BLU_M = member({ productId: "V4", sku: "T-B-M", featureValues: ["Color/Blue", "Size/M"] })
const FAMILY = [BLU_M, RED_S, BLU_S, RED_M]

describe("familyRouteFor", () => {
  it("routes a variant to its parent with itself pre-selected", () => {
    expect(familyRouteFor({ productId: "V1", isVariant: true, parentProductId: "TEE" }))
      .toEqual({ path: "/products/TEE", query: { variantId: "V1" } })
  })
  it("routes a non-variant to itself", () => {
    expect(familyRouteFor({ productId: "TEE", isVariant: false, parentProductId: "" }))
      .toEqual({ path: "/products/TEE" })
  })
})

describe("featureSelectionFromValues", () => {
  it("parses Type/Value tokens into a per-axis map", () => {
    expect(featureSelectionFromValues(["Color/Red", "Size/M"])).toEqual({ Color: "Red", Size: "M" })
  })
  it("ignores malformed tokens", () => {
    expect(featureSelectionFromValues(["Color/Red", "bogus", ""])).toEqual({ Color: "Red" })
  })
})

describe("familyFeatureOptions", () => {
  it("unions axes/values across the family and sorts sizes naturally", () => {
    const options = familyFeatureOptions(FAMILY)
    const color = options.find((o) => o.axis === "Color")
    const size = options.find((o) => o.axis === "Size")
    expect(color?.values).toEqual(["Blue", "Red"])
    expect(size?.values).toEqual(["S", "M"]) // size order, not alphabetical (M<S alphabetically)
  })

})

describe("familyVariants", () => {
  it("orders siblings by feature combo (color, then size)", () => {
    expect(familyVariants(FAMILY).map((v) => v.productId)).toEqual(["V3", "V4", "V1", "V2"])
  })

  it("keeps duplicate product ids visible when Solr returns duplicate docs", () => {
    const variants = familyVariants([
      member({ productId: "V1", internalName: "old", imageUrl: "" }),
      member({ productId: "V1", internalName: "new", imageUrl: "http://new-image" })
    ])

    expect(variants).toHaveLength(2)
    expect(variants.map((variant) => variant.name)).toEqual(["new", "old"])
  })
})

describe("variantForSelection", () => {
  const variants = familyVariants(FAMILY)
  it("finds the exact combo match", () => {
    expect(variantForSelection(variants, { Color: "Red", Size: "M" }, "Color")).toBe("V2")
  })
  it("swapping one axis from Red/S → Blue/S lands on the right sibling", () => {
    expect(variantForSelection(variants, { Color: "Blue", Size: "S" }, "Color")).toBe("V3")
  })
  it("falls back to a partial match on the changed axis when no full combo exists", () => {
    // a 3-axis desired that no variant fully satisfies, but some carry Color:Blue
    expect(variantForSelection(variants, { Color: "Blue", Size: "XL" }, "Color")).toBe("V3")
  })
  it("returns null when nothing carries the changed value", () => {
    expect(variantForSelection(variants, { Color: "Green", Size: "S" }, "Color")).toBeNull()
  })
})

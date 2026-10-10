import { describe, expect, it } from "vitest"
import { candidateSearchRequest, defaultCandidateSearch, linkValidationRequest, parseCandidates, parseLinkValidation } from "../linkCandidates"

const variant = { sku: "MH09-L-Blue", isVirtual: false, childSku: "" }
const virtual = { sku: "", isVirtual: true, childSku: "MH09-L-Blue" }

describe("link candidates", () => {
  it("starts from the product's own SKU, or a variant's for a virtual", () => {
    expect(defaultCandidateSearch(variant)).toBe("sku:\"MH09-L-Blue\"")
    expect(defaultCandidateSearch(virtual)).toBe("sku:\"MH09-L-Blue\"")
    expect(defaultCandidateSearch({ sku: "", isVirtual: false, childSku: "" })).toBe("")
  })

  it("searches variants for a variant and products for a virtual", () => {
    expect(candidateSearchRequest(variant, " hoodie ").queryText).toContain("productVariants")
    expect(candidateSearchRequest(virtual, "hoodie").queryText).toContain("products(")
    expect(candidateSearchRequest(variant, " hoodie ").variables).toEqual({ query: "hoodie" })
  })

  it("reads variant and product results into numeric IDs", () => {
    expect(parseCandidates(variant, { productVariants: { edges: [{ node: {
      id: "gid://shopify/ProductVariant/43899491385597", sku: "MH09-L-Blue", displayName: "Abominable Hoodie - L / Blue",
      inventoryQuantity: 1400, inventoryItem: { id: "gid://shopify/InventoryItem/45995601756413" }
    } }] } })).toEqual([{
      shopifyProductId: "43899491385597", shopifyInventoryItemId: "45995601756413", title: "Abominable Hoodie - L / Blue", sku: "MH09-L-Blue", inventory: 1400
    }])
    expect(parseCandidates(virtual, { products: { edges: [{ node: { id: "gid://shopify/Product/8074451550461", title: "Abominable Hoodie", totalInventory: 22797 } }] } }))
      .toEqual([{ shopifyProductId: "8074451550461", shopifyInventoryItemId: "", title: "Abominable Hoodie", sku: "", inventory: 22797 }])
  })
})

describe("link validation", () => {
  const since = new Date("2026-09-11T00:00:00Z")

  it("looks up a typed variant ID with the product's SKU orders, or a product ID with its own orders", () => {
    expect(linkValidationRequest(variant, " 123 ", since).variables).toMatchObject({
      variantId: "gid://shopify/ProductVariant/123", isVariant: true, isProduct: false, orderQuery: "sku:\"MH09-L-Blue\" created_at:>=2026-09-11"
    })
    expect(linkValidationRequest(virtual, "456", since).variables).toMatchObject({
      productId: "gid://shopify/Product/456", isProduct: true, isVariant: false, orderQuery: "product_id:456 created_at:>=2026-09-11"
    })
  })

  it("reports what Shopify has for the ID, or that it is not there", () => {
    expect(parseLinkValidation(variant, {
      productVariant: { id: "gid://shopify/ProductVariant/1", displayName: "Hoodie - L", inventoryQuantity: 5, inventoryItem: { id: "gid://shopify/InventoryItem/9" } },
      ordersCount: { count: 2 }
    })).toEqual({ found: true, title: "Hoodie - L", shopifyInventoryItemId: "9", inventory: 5, orders30: 2 })
    expect(parseLinkValidation(variant, { productVariant: null, ordersCount: { count: 0 } }))
      .toEqual({ found: false, title: "", shopifyInventoryItemId: "", inventory: null, orders30: 0 })
  })
})

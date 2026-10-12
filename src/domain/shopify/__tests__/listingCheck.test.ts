import { describe, expect, it } from "vitest"
import { listingCheckRequest, parseListingCheck } from "../listingCheck"

const variantProduct = { sku: "MH09-L-Blue", isVirtual: false, childSku: "" }
const link = { shopId: "10000", productId: "10010", shopifyProductId: "43899491385597", shopifyInventoryItemId: "45995601756413" }
const since = new Date("2026-09-11T00:00:00Z")

describe("listingCheckRequest", () => {
  it("looks up a variant by its mapped ID and counts its orders by exact SKU", () => {
    const { variables } = listingCheckRequest(link, variantProduct, since)

    expect(variables).toMatchObject({
      variantId: "gid://shopify/ProductVariant/43899491385597",
      hasVariant: true,
      hasProduct: false,
      skuQuery: "sku:\"MH09-L-Blue\"",
      orderQuery: "sku:\"MH09-L-Blue\" created_at:>=2026-09-11",
      hasOrders: true
    })
  })

  it("looks up a virtual by its Shopify product and counts orders by product ID", () => {
    const { variables } = listingCheckRequest({ ...link, shopifyProductId: "8074451550461", shopifyInventoryItemId: "" }, { sku: "", isVirtual: true, childSku: "MH09-L-Blue" }, since)

    expect(variables).toMatchObject({
      productId: "gid://shopify/Product/8074451550461",
      hasProduct: true,
      hasVariant: false,
      skuQuery: "sku:\"MH09-L-Blue\"",
      orderQuery: "product_id:8074451550461 created_at:>=2026-09-11"
    })
  })

  it("skips the mapped lookup when no Shopify ID is saved", () => {
    const { variables } = listingCheckRequest({ ...link, shopifyProductId: "" }, variantProduct, since)

    expect(variables.hasVariant).toBe(false)
    expect(variables.hasSku).toBe(true)
  })
})

describe("parseListingCheck", () => {
  const found = {
    productVariant: {
      id: "gid://shopify/ProductVariant/43899491385597",
      inventoryQuantity: 1400,
      inventoryItem: { id: "gid://shopify/InventoryItem/45995601756413" },
      product: { id: "gid://shopify/Product/8074451550461" }
    },
    ordersCount: { count: 3 }
  }

  it("passes a mapping that matches Shopify and reports its orders and inventory", () => {
    expect(parseListingCheck(link, variantProduct, found)).toEqual({
      orders30: 3,
      inventory: 1400,
      issue: null,
      suggestion: null,
      adminPath: "products/8074451550461/variants/43899491385597"
    })
  })

  it("suggests Shopify's inventory item when the saved one differs", () => {
    const check = parseListingCheck({ ...link, shopifyInventoryItemId: "999" }, variantProduct, found)

    expect(check.issue).toBe("inventoryMismatch")
    expect(check.adminPath).toBeNull()
    expect(check.suggestion).toEqual({ shopifyProductId: "43899491385597", shopifyInventoryItemId: "45995601756413" })
  })

  it("suggests the variant with the exact SKU when the saved ID is not on Shopify", () => {
    const data = {
      productVariant: null,
      bySku: { edges: [
        { node: { id: "gid://shopify/ProductVariant/1", sku: "MH09-L-Blue-2", inventoryItem: { id: "gid://shopify/InventoryItem/11" } } },
        { node: { id: "gid://shopify/ProductVariant/2", sku: "MH09-L-Blue", inventoryItem: { id: "gid://shopify/InventoryItem/22" } } }
      ] },
      ordersCount: { count: 0 }
    }

    expect(parseListingCheck(link, variantProduct, data)).toEqual({
      orders30: 0,
      inventory: null,
      issue: "notFound",
      suggestion: { shopifyProductId: "2", shopifyInventoryItemId: "22" },
      adminPath: null
    })
  })

  it("reports a missing mapping with nothing to suggest when Shopify has no such SKU", () => {
    const check = parseListingCheck({ ...link, shopifyProductId: "", shopifyInventoryItemId: "" }, variantProduct, { bySku: { edges: [] } })

    expect(check).toEqual({ orders30: null, inventory: null, issue: "missing", suggestion: null, adminPath: null })
  })

  it("suggests a virtual's Shopify product from one of its variants", () => {
    const virtual = { sku: "", isVirtual: true, childSku: "MH09-L-Blue" }
    const data = { product: null, bySku: { edges: [{ node: { id: "gid://shopify/ProductVariant/2", sku: "MH09-L-Blue", product: { id: "gid://shopify/Product/8074451550461" } } }] } }

    expect(parseListingCheck({ ...link, shopifyProductId: "1", shopifyInventoryItemId: "" }, virtual, data).suggestion)
      .toEqual({ shopifyProductId: "8074451550461", shopifyInventoryItemId: "" })
  })

  it("links a validated virtual to its Shopify product", () => {
    const virtual = { sku: "", isVirtual: true, childSku: "MH09-L-Blue" }
    const data = { product: { id: "gid://shopify/Product/8074451550461", totalInventory: 22797 } }

    expect(parseListingCheck({ ...link, shopifyProductId: "8074451550461", shopifyInventoryItemId: "" }, virtual, data))
      .toMatchObject({ issue: null, inventory: 22797, adminPath: "products/8074451550461" })
  })
})

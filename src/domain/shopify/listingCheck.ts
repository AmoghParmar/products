import type { ShopifyShopProduct } from "../types/product"

/** The product a Shopify listing check is about. */
export interface ListingCheckProduct {
  /** The product's own SKU; variants are found and their orders counted by it. */
  sku: string
  /** A virtual (parent) maps to a Shopify product rather than a variant. */
  isVirtual: boolean
  /** For a virtual: one of its variants' SKUs, to find the Shopify product it belongs to. */
  childSku: string
}

export type ListingCheckIssue = "missing" | "notFound" | "inventoryMismatch"

export interface ListingCheckSuggestion {
  shopifyProductId: string
  shopifyInventoryItemId: string
}

export interface ShopifyListingCheck {
  /** Orders on Shopify in the last 30 days that include the product; null when not counted. */
  orders30: number | null
  /** Available units on Shopify for the mapped variant or product; null when the mapping is not found. */
  inventory: number | null
  /** Why the saved mapping does not match Shopify; null when it does. */
  issue: ListingCheckIssue | null
  /** Values found on Shopify that would fix the mapping; null when there is nothing to suggest. */
  suggestion: ListingCheckSuggestion | null
  /** Where the validated mapping lives in Shopify admin ("products/1/variants/2"); null unless it validates. */
  adminPath: string | null
}

const LISTING_CHECK_QUERY = `query ListingCheck(
  $variantId: ID!, $hasVariant: Boolean!,
  $productId: ID!, $hasProduct: Boolean!,
  $skuQuery: String!, $hasSku: Boolean!,
  $orderQuery: String!, $hasOrders: Boolean!
) {
  productVariant(id: $variantId) @include(if: $hasVariant) { id inventoryQuantity inventoryItem { id } product { id } }
  product(id: $productId) @include(if: $hasProduct) { id totalInventory }
  bySku: productVariants(first: 5, query: $skuQuery) @include(if: $hasSku) {
    edges { node { id sku inventoryQuantity inventoryItem { id } product { id } } }
  }
  ordersCount(query: $orderQuery) @include(if: $hasOrders) { count }
}`

/** Shopify search value in quotes, so a SKU such as "WJ08-XS-Gray" matches exactly instead of by its parts. */
function quoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`
}

/** A link's key: ShopifyShopProduct is keyed by shop plus Shopify ID, so one shop can have several. */
export function shopifyLinkKey(link: { shopId: string; shopifyProductId: string }): string {
  return `${link.shopId}|${link.shopifyProductId}`
}

/** "gid://shopify/ProductVariant/123" → "123". */
export function shopifyNumericId(gid: unknown): string {
  return String(gid ?? "").split("/").pop() ?? ""
}

/** One query per shop: the mapped record, a SKU search for suggestions, and the 30-day order count. */
export function listingCheckRequest(link: ShopifyShopProduct, product: ListingCheckProduct, since: Date) {
  const mappedId = link.shopifyProductId.trim()
  const lookupSku = product.isVirtual ? product.childSku : product.sku
  const createdSince = `created_at:>=${since.toISOString().slice(0, 10)}`
  // A variant's orders are found by its SKU; a virtual's by the Shopify product it maps to.
  const orderFilter = product.isVirtual ? (mappedId ? `product_id:${mappedId}` : "") : (product.sku ? `sku:${quoted(product.sku)}` : "")

  return {
    queryText: LISTING_CHECK_QUERY,
    variables: {
      variantId: `gid://shopify/ProductVariant/${mappedId || "0"}`,
      hasVariant: !product.isVirtual && Boolean(mappedId),
      productId: `gid://shopify/Product/${mappedId || "0"}`,
      hasProduct: product.isVirtual && Boolean(mappedId),
      skuQuery: lookupSku ? `sku:${quoted(lookupSku)}` : "",
      hasSku: Boolean(lookupSku),
      orderQuery: orderFilter ? `${orderFilter} ${createdSince}` : "",
      hasOrders: Boolean(orderFilter)
    }
  }
}

/** Compares the saved mapping with what Shopify returned for it. */
export function parseListingCheck(link: ShopifyShopProduct, product: ListingCheckProduct, data: any): ShopifyListingCheck {
  const orders30 = typeof data?.ordersCount?.count === "number" ? data.ordersCount.count : null
  const lookupSku = product.isVirtual ? product.childSku : product.sku
  const skuMatch = (data?.bySku?.edges ?? []).map((edge: any) => edge?.node).find((node: any) => node?.sku === lookupSku)
  const unmapped = link.shopifyProductId.trim() ? "notFound" : "missing"

  if(product.isVirtual) {
    if(data?.product) {
      return { orders30, inventory: data.product.totalInventory ?? null, issue: null, suggestion: null, adminPath: `products/${shopifyNumericId(data.product.id)}` }
    }

    const productId = shopifyNumericId(skuMatch?.product?.id)

    return { orders30, inventory: null, issue: unmapped, suggestion: productId ? { shopifyProductId: productId, shopifyInventoryItemId: "" } : null, adminPath: null }
  }

  const variant = data?.productVariant
  if(variant) {
    const inventoryItemId = shopifyNumericId(variant.inventoryItem?.id)
    const mismatch = Boolean(inventoryItemId) && inventoryItemId !== link.shopifyInventoryItemId.trim()

    const productId = shopifyNumericId(variant.product?.id)

    return {
      orders30,
      inventory: variant.inventoryQuantity ?? null,
      issue: mismatch ? "inventoryMismatch" : null,
      suggestion: mismatch ? { shopifyProductId: link.shopifyProductId.trim(), shopifyInventoryItemId: inventoryItemId } : null,
      adminPath: !mismatch && productId ? `products/${productId}/variants/${shopifyNumericId(variant.id)}` : null
    }
  }

  return {
    orders30,
    inventory: null,
    issue: unmapped,
    suggestion: skuMatch
      ? { shopifyProductId: shopifyNumericId(skuMatch.id), shopifyInventoryItemId: shopifyNumericId(skuMatch.inventoryItem?.id) }
      : null,
    adminPath: null
  }
}

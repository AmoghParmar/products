import type { ListingCheckProduct } from "./listingCheck"
import { shopifyNumericId } from "./listingCheck"

/** A Shopify variant (or, for a virtual, a Shopify product) that a link could point at. */
export interface ShopifyLinkCandidate {
  shopifyProductId: string
  shopifyInventoryItemId: string
  title: string
  sku: string
  inventory: number | null
}

/** What Shopify says about an ID typed into a link. */
export interface ShopifyLinkValidation {
  found: boolean
  title: string
  shopifyInventoryItemId: string
  inventory: number | null
  orders30: number | null
}

function quoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`
}

/** The search a picker starts with: the product's own SKU, or for a virtual one of its variants' SKUs. */
export function defaultCandidateSearch(product: ListingCheckProduct): string {
  const sku = product.isVirtual ? product.childSku : product.sku

  return sku ? `sku:${quoted(sku)}` : ""
}

const VARIANT_SEARCH = `query LinkCandidates($query: String!) {
  productVariants(first: 25, query: $query) {
    edges { node { id sku displayName inventoryQuantity inventoryItem { id } } }
  }
}`

const PRODUCT_SEARCH = `query LinkCandidates($query: String!) {
  products(first: 25, query: $query) {
    edges { node { id title totalInventory } }
  }
}`

/** Variants for a variant, products for a virtual; the term is Shopify search syntax or plain text. */
export function candidateSearchRequest(product: ListingCheckProduct, term: string) {
  return { queryText: product.isVirtual ? PRODUCT_SEARCH : VARIANT_SEARCH, variables: { query: term.trim() } }
}

export function parseCandidates(product: ListingCheckProduct, data: any): ShopifyLinkCandidate[] {
  if(product.isVirtual) {
    return (data?.products?.edges ?? []).map(({ node }: any) => ({
      shopifyProductId: shopifyNumericId(node.id),
      shopifyInventoryItemId: "",
      title: String(node.title ?? ""),
      sku: "",
      inventory: node.totalInventory ?? null
    }))
  }

  return (data?.productVariants?.edges ?? []).map(({ node }: any) => ({
    shopifyProductId: shopifyNumericId(node.id),
    shopifyInventoryItemId: shopifyNumericId(node.inventoryItem?.id),
    title: String(node.displayName ?? ""),
    sku: String(node.sku ?? ""),
    inventory: node.inventoryQuantity ?? null
  }))
}

const LINK_VALIDATION = `query LinkValidation(
  $variantId: ID!, $isVariant: Boolean!,
  $productId: ID!, $isProduct: Boolean!,
  $orderQuery: String!, $hasOrders: Boolean!
) {
  productVariant(id: $variantId) @include(if: $isVariant) { id displayName inventoryQuantity inventoryItem { id } }
  product(id: $productId) @include(if: $isProduct) { id title totalInventory }
  ordersCount(query: $orderQuery) @include(if: $hasOrders) { count }
}`

/** Looks up one typed ID: a variant ID for a variant, a product ID for a virtual, with its 30-day orders. */
export function linkValidationRequest(product: ListingCheckProduct, shopifyProductId: string, since: Date) {
  const id = shopifyProductId.trim()
  const createdSince = `created_at:>=${since.toISOString().slice(0, 10)}`
  const orderFilter = product.isVirtual ? `product_id:${id}` : (product.sku ? `sku:${quoted(product.sku)}` : "")

  return {
    queryText: LINK_VALIDATION,
    variables: {
      variantId: `gid://shopify/ProductVariant/${id}`,
      isVariant: !product.isVirtual,
      productId: `gid://shopify/Product/${id}`,
      isProduct: product.isVirtual,
      orderQuery: orderFilter ? `${orderFilter} ${createdSince}` : "",
      hasOrders: Boolean(orderFilter)
    }
  }
}

export function parseLinkValidation(product: ListingCheckProduct, data: any): ShopifyLinkValidation {
  const orders30 = typeof data?.ordersCount?.count === "number" ? data.ordersCount.count : null
  const record = product.isVirtual ? data?.product : data?.productVariant

  if(!record) {return { found: false, title: "", shopifyInventoryItemId: "", inventory: null, orders30 }}

  return {
    found: true,
    title: String((product.isVirtual ? record.title : record.displayName) ?? ""),
    shopifyInventoryItemId: product.isVirtual ? "" : shopifyNumericId(record.inventoryItem?.id),
    inventory: (product.isVirtual ? record.totalInventory : record.inventoryQuantity) ?? null,
    orders30
  }
}

import type { ProductSummary } from "../types/product"

/** Family navigation model (pattern borrowed from the preorder audit detail page):
 *  the detail route always anchors on the PARENT with the variant carried as ?variantId=,
 *  so users land in family context and can jump between siblings instantly — either by picking
 *  feature values (Color/Size chips) or from the thumbnail strip. */

export interface FamilyRoute {
  path: string
  query?: { variantId: string }
}

/** Where a product row should navigate: variants open their parent with themselves pre-selected. */
export function familyRouteFor(product: Pick<ProductSummary, "productId" | "isVariant" | "parentProductId">): FamilyRoute {
  if(product.isVariant && product.parentProductId) {
    return { path: `/products/${product.parentProductId}`, query: { variantId: product.productId } }
  }

  return { path: `/products/${product.productId}` }
}

export interface FamilyVariant {
  productId: string
  name: string
  sku: string
  imageUrl: string
  /** per-axis feature selection, e.g. { Color: "Red", Size: "M" } */
  selection: Record<string, string>
  /** The member's own row, for the product identifier setting. */
  product: ProductSummary
}

/** PIM Solr `featureValues` are "TypeDescription/ValueDescription" tokens (built by the pim doc
 *  builder). Parse one variant's tokens into a per-axis selection. */
export function featureSelectionFromValues(featureValues: string[]): Record<string, string> {
  const selection: Record<string, string> = {}
  for(const token of featureValues ?? []) {
    const slash = token.indexOf("/")
    if(slash > 0) {selection[token.slice(0, slash)] = token.slice(slash + 1)}
  }

  return selection
}

/** Variant family members (from a parentProductId Solr query) → the sibling list, ordered by
 *  feature combo when present (axis order, sizes naturally sorted) else by name. */
export function familyVariants(members: ProductSummary[]): FamilyVariant[] {
  const variants = members.map((member) => ({
    productId: member.productId,
    name: member.productName || member.internalName || member.productId,
    sku: member.sku,
    imageUrl: member.imageUrl,
    selection: featureSelectionFromValues(member.featureValues),
    product: member
  }))
  const axes = familyFeatureOptions(members)

  return variants.sort((a, b) => {
    for(const { axis, values } of axes) {
      const rank = values.indexOf(a.selection[axis]) - values.indexOf(b.selection[axis])
      if(rank !== 0) {return rank}
    }

    return a.name.localeCompare(b.name)
  })
}

export interface FeatureAxisOption {
  axis: string
  values: string[]
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]

function sortAxisValues(axis: string, values: string[]): string[] {
  const looksLikeSize = /size/i.test(axis)

  return [...values].sort((a, b) => {
    if(looksLikeSize) {
      const ai = SIZE_ORDER.indexOf(a.toUpperCase())
      const bi = SIZE_ORDER.indexOf(b.toUpperCase())
      if(ai !== -1 || bi !== -1) {return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)}
      const an = Number(a); const bn = Number(b)
      if(Number.isFinite(an) && Number.isFinite(bn)) {return an - bn}
    }

    return a.localeCompare(b)
  })
}

/** Union of feature axes/values across the family → the option grid the selector renders.
 *  Axis order follows first appearance; values are sorted (sizes naturally). */
export function familyFeatureOptions(members: ProductSummary[]): FeatureAxisOption[] {
  const axes = new Map<string, Set<string>>()
  for(const member of members) {
    const selection = featureSelectionFromValues(member.featureValues)
    for(const [axis, value] of Object.entries(selection)) {
      if(!axes.has(axis)) {axes.set(axis, new Set())}
      axes.get(axis)!.add(value)
    }
  }

  return [...axes.entries()].map(([axis, values]) => ({ axis, values: sortAxisValues(axis, [...values]) }))
}

/** Resolve a desired feature combo to a variant id. Prefers an exact full-combo match; otherwise
 *  the first variant that at least carries the just-changed axis value (preorder fallback). */
export function variantForSelection(
  variants: FamilyVariant[],
  desired: Record<string, string>,
  changedAxis: string
): string | null {
  let partial: string | null = null
  const axes = Object.keys(desired)
  for(const variant of variants) {
    if(axes.every((axis) => variant.selection[axis] === desired[axis])) {return variant.productId}
    if(partial === null && variant.selection[changedAxis] === desired[changedAxis]) {partial = variant.productId}
  }

  return partial
}

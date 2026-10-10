import type { ProductSearchParams, ProductSortOption } from "../types/product"

/** Builders for PIM Solr JSON Request API payloads. Pure functions — the ONLY place that knows
 *  how workbench filters translate to the pim-products index. */

export interface SolrJsonQuery {
  query: string
  filter: string[]
  limit?: number
  offset?: number
  sort?: string
  fields?: string
  facet?: Record<string, unknown>
  params?: Record<string, unknown>
}

const SOLR_SPECIALS = /[+\-&|!(){}[\]^"~*?:\\/]/g

export function escapeSolrValue(value: string): string {
  return value.replace(SOLR_SPECIALS, "\\$&")
}

export const DEFAULT_PRODUCT_SORT: ProductSortOption = "IntroducedDesc"

/** The indexed list price for a store group and currency: price type, purpose, currency, group.
 *  Empty when either part is missing or would not make a plain field name. */
export function listPriceField(productStoreGroupId?: string, currencyUomId?: string): string {
  const field = `LIST_PRICE_PURCHASE_${currencyUomId}_${productStoreGroupId}_price`

  return productStoreGroupId && currencyUomId && /^\w+$/.test(field) ? field : ""
}

export function isPriceSort(sort: ProductSortOption): boolean {
  return sort === "PriceDesc" || sort === "PriceAsc"
}

/** Solr sort for a workbench sort option. productId breaks ties, so a page boundary never repeats or
 *  skips a product. A missing value sorts as the lowest, so a price sort keeps unpriced products last. */
export function productSort(sort: ProductSortOption, priceField = ""): string {
  const tieBreak = "productId asc"
  const newestIntroduced = `introductionDate desc, ${tieBreak}`

  switch (sort) {
    case "IntroducedAsc": return `introductionDate asc, ${tieBreak}`
    case "UpdatedDesc": return `updatedDatetime desc, ${tieBreak}`
    case "UpdatedAsc": return `updatedDatetime asc, ${tieBreak}`
    case "NameAsc": return `productName asc, ${tieBreak}`
    case "NameDesc": return `productName desc, ${tieBreak}`
    // A virtual and its variants share a groupId; the virtual leads, then its variants by name.
    case "Family": return `groupId asc, isVirtual desc, productName asc, ${tieBreak}`
    case "SkuAsc": return `sku asc, ${tieBreak}`
    case "SkuDesc": return `sku desc, ${tieBreak}`
    // Without a store price field there is nothing to sort by, so the default order applies.
    case "PriceDesc": return priceField ? `${priceField} desc, ${tieBreak}` : newestIntroduced
    case "PriceAsc": return priceField ? `def(${priceField},1e15) asc, ${tieBreak}` : newestIntroduced
    default: return newestIntroduced
  }
}

/** Filter strings for the current workbench scope (everything except the text query). */
export function productScopeFilters(params: Partial<ProductSearchParams>): string[] {
  const filters = ["docType:PRODUCT"]
  if(params.productTypeId && params.productTypeId !== "All") {filters.push(`productTypeId:${escapeSolrValue(params.productTypeId)}`)}
  if(params.productKind === "Variants") {filters.push("isVariant:true")}
  if(params.productKind === "Virtuals") {filters.push("isVirtual:true")}
  if(params.productStoreId && params.productStoreId !== "All") {filters.push(`productStoreIds:${escapeSolrValue(params.productStoreId)}`)}
  for(const tag of params.tags ?? []) {filters.push(`tags:"${tag.replace(/"/g, "\\\"")}"`)}
  for(const groupId of params.groupIds ?? []) {filters.push(`groupId:${escapeSolrValue(groupId)}`)}

  return filters
}

export function productSearchQueryText(queryString: string): string {
  const tokens = queryString.trim().split(/\s+/).filter(Boolean).map(escapeSolrValue)
  if(!tokens.length) {return "*:*"}

  return `*${tokens.join(" ")}*`
}

export function workbenchSearchPayload(params: ProductSearchParams, pageIndex: number): SolrJsonQuery {
  return {
    query: productSearchQueryText(params.queryString),
    filter: productScopeFilters(params),
    sort: productSort(params.sort, params.priceField),
    limit: params.pageSize,
    offset: pageIndex * params.pageSize,
    params: {
      "defType": "edismax",
      "q.op": "OR",
      "qf": "productId groupId parentProductName productName internalName sku upc"
    }
  }
}

export interface IdentifierCoverageInput {
  id: string
  /** A product document field (productId, groupName, ...) rather than a goodIdentifications type. */
  isDocumentField: boolean
}

/** One request counting the products that have each identifier: a document field with a value, or a
 *  goodIdentifications entry other than the "TYPE/null" indexed for an identification saved without
 *  a value. Facet i<n> counts identifiers[n]; ids that are not plain names are left out. */
export function identifierCoveragePayload(identifiers: IdentifierCoverageInput[]): SolrJsonQuery {
  const facet = Object.fromEntries(identifiers.flatMap(({ id, isDocumentField }, index) => {
    if(!/^\w+$/.test(id)) {return []}
    const q = isDocumentField ? `${id}:[* TO *]` : `goodIdentifications:${id}/* -goodIdentifications:"${id}/null"`

    return [[`i${index}`, { type: "query", q }]]
  }))

  return { query: "*:*", filter: ["docType:PRODUCT"], limit: 0, facet }
}

/** Product documents for a known set of productIds (image and identifiers for rows from other APIs). */
export function productsByIdPayload(productIds: string[]): SolrJsonQuery {
  const ids = Array.from(new Set(productIds.filter(Boolean)))

  return {
    query: "*:*",
    filter: ["docType:PRODUCT", `productId: (${ids.map((id) => `"${escapeSolrValue(id)}"`).join(" OR ")})`],
    limit: ids.length
  }
}

export function rowSalesAnalyticsPayload(productIds: string[], startIso: string): SolrJsonQuery {
  const ids = Array.from(new Set(productIds.filter(Boolean)))

  return {
    query: "*:*",
    filter: [
      "docType: ORDER",
      "orderTypeId: SALES_ORDER",
      "-orderStatusId: ORDER_CANCELLED",
      "-orderItemStatusId: ITEM_CANCELLED",
      `productId: (${ids.map((id) => `"${escapeSolrValue(id)}"`).join(" OR ")})`,
      `orderDate: [${startIso} TO NOW]`
    ],
    limit: 0,
    params: { "q.op": "AND" },
    facet: {
      byDay: {
        type: "range",
        field: "orderDate",
        start: startIso,
        end: "NOW",
        gap: "+1DAY",
        facet: {
          byProduct: { type: "terms", field: "productId", limit: ids.length }
        }
      }
    }
  }
}

/** Tag facet over the current scope minus the tag filter itself (so more tags can be added). */
export function tagFacetPayload(params: ProductSearchParams): SolrJsonQuery {
  return {
    query: productSearchQueryText(params.queryString),
    filter: productScopeFilters({ ...params, tags: [] }),
    limit: 0,
    facet: { tags: { type: "terms", field: "tags", limit: 200, mincount: 1 } },
    params: { "q.op": "AND" }
  }
}

/** GroupId facet over the current scope minus the groupId filter and productKind check (isVariant/isVirtual)
 *  so facet counts reflect all docs in the group regardless of variant/virtual split. */
export function groupIdFacetPayload(params: ProductSearchParams): SolrJsonQuery {
  return {
    query: productSearchQueryText(params.queryString),
    filter: productScopeFilters({ ...params, groupIds: [], productKind: undefined }),
    limit: 0,
    facet: { groupId: { type: "terms", field: "groupId", limit: -1, mincount: 1 } },
    params: {
      "defType": "edismax",
      "q.op": "OR",
      "qf": "productId groupId parentProductName productName internalName sku upc"
    }
  }
}

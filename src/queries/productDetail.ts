import { queryOptions } from "@tanstack/vue-query"
import { fetchEntityAuditLogs } from "@/api/catalog"
import { fetchAssociations, fetchFeatureApplications, fetchFeatureCatalog, fetchIdentifications, fetchProductCategoryMembers, fetchProductRecord, fetchShopifyLinkOwners, fetchShopifyShopProducts } from "@/api/pim"
import { runShopifyGraphql } from "@/api/shopify"
import { runProductSolrQuery, solrDocs } from "@/api/solr"
import { queryClient } from "@/app/queryClient"
import { normalizeAssociations } from "@/domain/normalize/association"
import { featureCatalogMap, normalizeFeatureApplication } from "@/domain/normalize/feature"
import { normalizeAuditEntry } from "@/domain/normalize/history"
import { catalogOptionMap , normalizeIdentifications } from "@/domain/normalize/identification"
import { normalizeProductCore, normalizeProductSummary } from "@/domain/normalize/product"
import {
  type ShopifyLinkCandidate, type ShopifyLinkValidation, candidateSearchRequest, linkValidationRequest, parseCandidates, parseLinkValidation
} from "@/domain/shopify/linkCandidates"
import { type ListingCheckProduct, type ShopifyListingCheck, listingCheckRequest, parseListingCheck, shopifyLinkKey } from "@/domain/shopify/listingCheck"
import { escapeSolrValue } from "@/domain/solr/productQuery"
import type { ProductCategoryMembership, ProductSummary, ShopifyShop, ShopifyShopProduct } from "@/domain/types/product"
import { featureTypesOptions, identificationTypesOptions } from "./catalog"
import { qk } from "./keys"

/** Product detail = independent parallel queries. Cards load/fail/refresh on their own; a save
 *  invalidates exactly the slice it touched. The parent/variant segment is a key swap on productId. */

export function productCoreOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.core(productId),
    queryFn: async () => normalizeProductCore(await fetchProductRecord(productId)),
    staleTime: 15_000
  })
}

export function identificationsOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.identifications(productId),
    queryFn: async () => {
      const [rows, types] = await Promise.all([
        fetchIdentifications(productId),
        queryClient.ensureQueryData(identificationTypesOptions())
      ])

      return normalizeIdentifications(rows, catalogOptionMap(types))
    }
  })
}

export function associationsOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.associations(productId),
    queryFn: async () => normalizeAssociations(await fetchAssociations(productId), productId)
  })
}

/** All members of a variant family (one Solr query on parentProductId) — carries each variant's
 *  name, sku, image and featureValues, so it feeds both the variant strip and the feature selector. */
export function familyMembersOptions(parentProductId: string) {
  return queryOptions({
    queryKey: qk.product.family(parentProductId),
    queryFn: async () => {
      const response = await runProductSolrQuery({
        query: "*:*",
        filter: ["docType:PRODUCT", `groupId:${escapeSolrValue(parentProductId)}`, "isVirtual:false", "isVariant:true"],
        limit: 250,
        sort: "productName asc"
      })

      return solrDocs(response).map(normalizeProductSummary)
    },
    enabled: Boolean(parentProductId),
    staleTime: 30_000
  })
}

export function featureApplicationsOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.features(productId),
    queryFn: async () => {
      const [rows, catalog, types] = await Promise.all([
        fetchFeatureApplications(productId),
        queryClient.ensureQueryData(featureCatalogOptions()),
        queryClient.ensureQueryData(featureTypesOptions())
      ])
      const features = featureCatalogMap(catalog)
      const typeLabels = catalogOptionMap(types)

      return rows
        .filter((row) => !row.thruDate)
        .map((row) => normalizeFeatureApplication(row, features, typeLabels))
    }
  })
}

/** Single-product Solr lookup — used to get tags for the anchor (virtual) product,
 *  which isn't included in the family members query (that filters isVariant:true). */
export function productSolrOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.solr(productId),
    queryFn: async (): Promise<ProductSummary | null> => {
      const response = await runProductSolrQuery({
        query: "*:*",
        filter: ["docType:PRODUCT", `productId:${escapeSolrValue(productId)}`],
        limit: 1
      })
      const docs = solrDocs(response)

      return docs.length > 0 ? normalizeProductSummary(docs[0]) : null
    },
    staleTime: 30_000
  })
}

export function auditHistoryOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.audit(productId),
    queryFn: async () => (await fetchEntityAuditLogs(productId)).map(normalizeAuditEntry),
    staleTime: 60_000
  })
}

export function categoriesOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.categories(productId),
    queryFn: async (): Promise<ProductCategoryMembership[]> => {
      const rows = await fetchProductCategoryMembers(productId)

      return rows.map((raw) => ({
        productCategoryId: String(raw.productCategoryId ?? ""),
        categoryName: String(raw.categoryName ?? raw.productCategoryId ?? ""),
        fromDate: String(raw.fromDate ?? ""),
        thruDate: raw.thruDate ? String(raw.thruDate) : null,
        active: !raw.thruDate || new Date(String(raw.thruDate)) > new Date()
      }))
    }
  })
}

/** Full ProductFeature catalog rows (raw) — shared by feature pickers and appl normalization. */
export function featureCatalogOptions() {
  return queryOptions({
    queryKey: qk.catalog.features(),
    queryFn: fetchFeatureCatalog,
    staleTime: Infinity
  })
}

export function shopifyShopProductsOptions(productId: string) {
  return queryOptions({
    queryKey: qk.product.shopifyShopProducts(productId),
    queryFn: async (): Promise<ShopifyShopProduct[]> => {
      const rows = await fetchShopifyShopProducts(productId)

      return rows.map((raw) => ({
        shopId: String(raw.shopId ?? ""),
        productId: String(raw.productId ?? productId),
        shopifyProductId: String(raw.shopifyProductId ?? ""),
        shopifyInventoryItemId: String(raw.shopifyInventoryItemId ?? "")
      }))
    }
  })
}

export type ShopifyListingCheckResult = ShopifyListingCheck | { error: string }

/** A live check of each saved Shopify link against Shopify itself, one query per shop through that
 *  shop's main app connection. A shop that fails is reported on its own; the others still return. */
export function shopifyListingChecksOptions(params: {
  productId: string
  product: ListingCheckProduct
  links: ShopifyShopProduct[]
  shops: ShopifyShop[]
  enabled: boolean
}) {
  const { productId, product, links, shops } = params
  const signature = JSON.stringify([product, links.map((link) => [link.shopId, link.shopifyProductId, link.shopifyInventoryItemId])])

  return queryOptions({
    queryKey: qk.product.shopifyListingChecks(productId, signature),
    queryFn: async (): Promise<Record<string, ShopifyListingCheckResult>> => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const results = await Promise.allSettled(links.map(async (link) => {
        const remoteId = shops.find((shop) => shop.shopId === link.shopId)?.remoteId
        if(!remoteId) {throw new Error("This shop has no Shopify connection")}
        const { queryText, variables } = listingCheckRequest(link, product, since)

        return parseListingCheck(link, product, await runShopifyGraphql(remoteId, queryText, variables))
      }))

      return Object.fromEntries(links.map((link, index) => {
        const result = results[index]

        return [shopifyLinkKey(link), result.status === "fulfilled" ? result.value : { error: String(result.reason?.message ?? result.reason) }]
      }))
    },
    enabled: params.enabled && links.length > 0 && shops.length > 0,
    staleTime: 60_000,
    retry: false
  })
}

/** Which product each Shopify ID is already linked to on a shop, by Shopify ID. */
async function shopifyLinkOwners(shopId: string, shopifyProductIds: string[]): Promise<Record<string, string>> {
  const rows = await fetchShopifyLinkOwners(shopId, shopifyProductIds)

  return Object.fromEntries(rows.map((row) => [String(row.shopifyProductId ?? ""), String(row.productId ?? "")]))
}

/** Shopify variants (products, for a virtual) matching a search on one shop, with the product each is
 *  already linked to, if any. */
export function shopifyLinkCandidatesOptions(params: { shopId: string; remoteId: string; product: ListingCheckProduct; term: string }) {
  const { shopId, remoteId, product, term } = params

  return queryOptions({
    queryKey: ["shopifyLinkCandidates", shopId, product.isVirtual, term.trim()] as const,
    queryFn: async (): Promise<{ candidates: ShopifyLinkCandidate[]; owners: Record<string, string> }> => {
      const { queryText, variables } = candidateSearchRequest(product, term)
      const candidates = parseCandidates(product, await runShopifyGraphql(remoteId, queryText, variables))

      return { candidates, owners: await shopifyLinkOwners(shopId, candidates.map((candidate) => candidate.shopifyProductId)) }
    },
    enabled: Boolean(shopId && remoteId && term.trim()),
    staleTime: 30_000,
    retry: false
  })
}

/** What Shopify has for one typed ID on a shop, its 30-day orders, and the product it is linked to. */
export function shopifyLinkValidationOptions(params: { shopId: string; remoteId: string; product: ListingCheckProduct; shopifyProductId: string }) {
  const { shopId, remoteId, product } = params
  const shopifyProductId = params.shopifyProductId.trim()

  return queryOptions({
    queryKey: ["shopifyLinkValidation", shopId, product, shopifyProductId] as const,
    queryFn: async (): Promise<ShopifyLinkValidation & { ownerProductId: string }> => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const { queryText, variables } = linkValidationRequest(product, shopifyProductId, since)
      const [data, owners] = await Promise.all([
        runShopifyGraphql(remoteId, queryText, variables),
        shopifyLinkOwners(shopId, [shopifyProductId])
      ])

      return { ...parseLinkValidation(product, data), ownerProductId: owners[shopifyProductId] ?? "" }
    },
    enabled: Boolean(shopId && remoteId && /^\d+$/.test(shopifyProductId)),
    staleTime: 30_000,
    retry: false
  })
}

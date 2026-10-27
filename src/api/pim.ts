import { DateTime } from "luxon"
import type {
  AssociationCreate, AssociationKey, AssociationUpdate, DedupChange, FeatureApply, FeatureCreate,
  IdentificationCreate, IdentificationKey, ProductCreatePayload, ProductFieldsPatch, ProductPriceCreate
} from "@/domain/types/pim"
import { useUserStore } from "@/store/user"
import { request, responseList } from "./http"
import { logger } from "@common"

/** All calls against the oms component (/rest/s1/oms/...) — writes plus the reference reads it owns. */

type Raw = Record<string, unknown>

/** Fire-and-forget Solr re-index. Errors are swallowed intentionally —
 *  a failed index should never block or surface as a save error. */
export function triggerSolrIndex(
  productId: string,
  options: { indexVariants?: boolean } = { indexVariants: true }
): void {
  request({
    url: "oms/search/index/product",
    method: "post",
    data: {
      productId,
      indexVariants: options.indexVariants ?? true
    }
  }).catch((error) => {
    logger.error("Failed to index product in Solr:", error)
  })
}

// ---------- product ----------
export function fetchProductRecord(productId: string): Promise<Raw> {
  return request<Raw>({ url: `oms/products/${productId}`, method: "get" })
}

export function createProduct(payload: ProductCreatePayload): Promise<{ productId: string }> {
  return request<{ productId: string }>({ url: "oms/products", method: "post", data: payload })
}

export function updateProductFields(productId: string, patch: ProductFieldsPatch): Promise<unknown> {
  return request({ url: `oms/products/${productId}`, method: "put", data: patch })
}

// ---------- identifications ----------
export function fetchIdentifications(productId: string): Promise<Raw[]> {
  return request({ url: `oms/products/${productId}/identifications`, method: "get", params: { pageSize: 200 } }).then(responseList)
}

export function createIdentification(productId: string, payload: IdentificationCreate): Promise<unknown> {
  return request({ url: `oms/products/${productId}/identifications`, method: "post", data: payload })
}

export function updateIdentification(productId: string, key: IdentificationKey, idValue: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/identifications`, method: "post", data: { ...key, idValue } })
}

export function expireIdentification(productId: string, key: IdentificationKey): Promise<unknown> {
  return request({ url: `oms/products/${productId}/identifications`, method: "post", data: {
    ...key,
    thruDate: DateTime.now().toMillis()
  } })
}

// ---------- associations ----------
export function fetchAssociations(productId: string): Promise<Raw[]> {
  return request({ url: `oms/products/${productId}/associations`, method: "get", params: { pageSize: 500 } }).then(responseList)
}

export function createAssociation(productId: string, payload: AssociationCreate): Promise<unknown> {
  return request({ url: `oms/products/${productId}/assocs`, method: "post", data: payload })
}

export function updateAssociation(productId: string, payload: AssociationUpdate): Promise<unknown> {
  return request({ url: `oms/products/${productId}/associations`, method: "put", data: payload })
}

export function expireAssociation(productId: string, key: AssociationKey, thruDate?: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/assocs`, method: "post", data: { ...key, thruDate } })
}

export function reactivateAssociation(productId: string, key: AssociationKey): Promise<unknown> {
  return request({ url: `oms/products/${productId}/assocs`, method: "post", data: {
    ...key,
    thruDate: null
  } })
}

export function resequenceAssociations(productId: string, items: (AssociationKey & { sequenceNum: number })[]): Promise<unknown> {
  return request({ url: `oms/products/${productId}/associations/resequence`, method: "post", data: { items } })
}

// ---------- features ----------
export function fetchFeatureApplications(productId: string): Promise<Raw[]> {
  return request({ url: `oms/products/${productId}/features`, method: "get", params: { pageSize: 500 } }).then(responseList)
}

export function applyFeature(productId: string, payload: FeatureApply): Promise<unknown> {
  return request({ url: `oms/products/${productId}/features`, method: "post", data: payload })
}

export function removeFeatureApplication(productId: string, productFeatureId: string, fromDate: string, thruDate: string | number): Promise<unknown> {
  return request({ url: `oms/products/${productId}/features`, method: "post", data: { productId, productFeatureId, fromDate, thruDate } })
}

export function createFeature(payload: FeatureCreate): Promise<{ productFeatureId: string }> {
  return request({ url: "oms/products/features", method: "post", data: payload })
}

// ---------- reference catalogs ----------
export function fetchFeatureCatalog(): Promise<Raw[]> {
  return request({ url: "oms/products/features", method: "get", params: { pageSize: 500, orderByField: "description" } }).then(responseList)
}

export function fetchCatalogList(
  resource: "productTypes" | "featureTypes" | "featureApplTypes" | "associationTypes" | "goodIdentificationTypes" | "boxTypes",
  extraParams?: Record<string, unknown>
): Promise<Raw[]> {
  return request({ url: resource === "goodIdentificationTypes" ? "oms/goodIdentificationTypes" : `oms/products/${resource}`, method: "get", params: { pageSize: 200, ...extraParams } }).then(responseList)
}

export function fetchBoxTypes(extraParams?: Record<string, unknown>): Promise<Raw[]> {
  return request({ url: "oms/shippingGateways/shipmentBoxTypes", method: "get", params: { pageSize: 200, ...extraParams } }).then(responseList)
}

/** Units of measure of a given type (UT_LENGTH_MEASURE, UT_WEIGHT_MEASURE). */
export function fetchUoms(uomTypeEnumId: string): Promise<Raw[]> {
  return request({ url: "admin/uoms", method: "get", params: { uomTypeEnumId, pageSize: 200 } }).then(responseList)
}

// ---------- prices ----------
export function createProductPrice(productId: string, payload: ProductPriceCreate): Promise<unknown> {
  return request({ url: `oms/products/${productId}/prices`, method: "post", data: payload })
}

export function expireProductPrice(productId: string, productPriceTypeId: string, currencyUomId: string, fromDate: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/prices/expire`, method: "post", data: { productPriceTypeId, currencyUomId, fromDate } })
}

// ---------- categories ----------
export function fetchProductCategoryMembers(productId: string): Promise<Raw[]> {
  return request({ url: "admin/productCategories/member", method: "get", params: {
    pageSize: 200,
    productId
  } }).then(responseList)
}

/** ProductCategoryMember is keyed by category, product and fromDate, so storing the row again with a
 *  thruDate ends that membership (oms has no separate expire resource). */
export function expireProductCategoryMember(productId: string, productCategoryId: string, fromDate: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/categories`, method: "post", data: { productCategoryId, fromDate, thruDate: Date.now() } })
}

const CATEGORY_PAGE_SIZE = 200
// Stops a backend that ignores pageIndex from looping forever (25 pages = 5,000 categories).
const CATEGORY_MAX_PAGES = 25

/** Every catalog category of the store, read page by page: the entity list endpoint can't OR-search
 *  name, id and description, so callers filter the full list themselves. */
export async function fetchProductCategories(productStoreId: string = useUserStore().currentProductStore.productStoreId): Promise<any[]> {
  const categories: any[] = []
  for(let pageIndex = 0; pageIndex < CATEGORY_MAX_PAGES; pageIndex++) {
    const page = responseList(await request({
      url: "oms/productStores/categories",
      method: "get",
      params: { pageIndex, pageSize: CATEGORY_PAGE_SIZE, productStoreId }
    }))
    categories.push(...page)
    if(page.length < CATEGORY_PAGE_SIZE) {break}
  }

  // The view has a row per catalog and catalog category type, so one category can come back more than once.
  return [...new Map(categories.map((category) => [category.productCategoryId, category])).values()]
}

export function addProductCategoryMember(productId: string, productCategoryId: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/categories`, method: "post", data: { productCategoryId } })
}

// ---------- shopify shop products ----------
export function fetchShopifyShopProducts(productId: string): Promise<Raw[]> {
  return request({ url: `oms/products/${productId}/shopifyShopProducts`, method: "get", params: { productId, pageSize: 100 } }).then(responseList)
}

export function upsertShopifyShopProduct(payload: {
  productId: string
  shopId: string
  shopifyProductId?: string
  shopifyInventoryItemId?: string
}): Promise<unknown> {
  return request({ url: `oms/products/${payload.productId}/shopifyShopProducts`, method: "post", data: payload })
}

/** ShopifyShopProduct's key is shop plus Shopify ID (a product may have several links to one shop),
 *  so a delete names both; the shop alone matches no row. */
export function deleteShopifyShopProduct(productId: string, shopId: string, shopifyProductId: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/shopifyShopProducts`, method: "delete", data: { productId, shopId, shopifyProductId } })
}

/** The links a shop already has for these Shopify IDs, whichever product they belong to: a Shopify ID
 *  can be linked to one product only, and saving it again would move it to the saving product. */
export function fetchShopifyLinkOwners(shopId: string, shopifyProductIds: string[]): Promise<Raw[]> {
  const ids = Array.from(new Set(shopifyProductIds.map((id) => id.trim()).filter(Boolean)))
  if(!shopId || !ids.length) {return Promise.resolve([])}

  return request({
    url: "sob/shopify/shopProducts",
    method: "get",
    params: { shopId, shopifyProductId: ids.join(","), shopifyProductId_op: "in", pageSize: ids.length }
  }).then(responseList)
}

// ---------- keywords / tags ----------
export function addProductKeyword(productId: string, keyword: string): Promise<unknown> {
  return request({ url: `oms/products/${productId}/keywords`, method: "post", data: {
    keyword,
    keywordTypeId: "KWT_TAG",
    statusId: "KW_APPROVED"
  } })
}

export function removeProductKeyword(
  productId: string,
  keyword: string
): Promise<unknown> {
  return request({
    url: `oms/products/${productId}/keywords`,
    method: "post",
    data: {
      keyword,
      keywordTypeId: "KWT_TAG",
      statusId: "KW_DISAPPROVED"
    }
  })
}

// ---------- data quality ----------
export function resolveDuplicateIdentifiers(changes: DedupChange[]): Promise<{ updatedCount: number }> {
  return request({ url: "oms/dedup/resolveIdentifiers", method: "post", data: { changes } })
}

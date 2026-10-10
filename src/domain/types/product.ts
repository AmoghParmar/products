/** Core product domain types. Pure data shapes — no Vue, no transport. */

export type ProductKind = "All" | "Variants" | "Virtuals"
export type ProductSortOption =
  "IntroducedDesc" | "IntroducedAsc" |
  "UpdatedDesc" | "UpdatedAsc" |
  "NameAsc" | "NameDesc" | "Family" |
  "SkuAsc" | "SkuDesc" |
  "PriceDesc" | "PriceAsc"

/** Workbench filter state; doubles as the search query-key payload. */
export interface ProductSearchParams {
  queryString: string
  productTypeId: string
  productKind: ProductKind
  productStoreId: string
  tags: string[]
  groupIds: string[]
  sort: ProductSortOption
  pageSize: number
  /** Solr field holding the list price for the store in scope; only set for a price sort. */
  priceField?: string
}

/** A product row as indexed in the PIM Solr core (flat document, pim owns the shape). */
export interface ProductSummary {
  productId: string
  productName: string
  internalName: string
  brandName: string
  productTypeId: string
  isVirtual: boolean
  isVariant: boolean
  parentProductId: string
  parentProductName: string
  sku: string
  upc: string
  tags: any[] | unknown
  featureValues: string[]
  primaryProductCategoryId: string
  primaryProductCategoryName: string
  productStoreIds: string[]
  imageUrl: string
  createdDate: string
  lastModifiedDate: string
  variantCount: number
  /** Identifier fields read by the product identifier preference (PRDT_IDEN_PREF). */
  goodIdentifications: string[]
  groupId: string
  groupName: string
  title: string
}

export interface ProductSearchPage {
  products: ProductSummary[]
  total: number
  pageIndex: number
}

export interface RowSalesSpark {
  productId: string
  series: number[]
  unitsSold: number
}

export interface TagFacet {
  value: string
  count: number
}

export interface GroupIdFacet {
  value: string
  count: number
}

/** The editable product record (oms/products/{id} entity fields the editor binds to). */
export interface ProductCore {
  prices: ProductPrice[]
  productId: string
  productTypeId: string
  productName: string
  internalName: string
  brandName: string
  description: string
  longDescription: string
  comments: string
  primaryProductCategoryId: string
  isVirtual: boolean
  isVariant: boolean
  introductionDate: string | null
  releaseDate: string | null
  supportDiscontinuationDate: string | null
  salesDiscontinuationDate: string | null
  salesDiscWhenNotAvail: boolean
  returnable: boolean
  taxable: boolean
  chargeShipping: boolean
  inShippingBox: boolean
  defaultShipmentBoxTypeId: string
  productWeight: number | null
  productHeight: number | null
  productWidth: number | null
  productDepth: number | null
  weightUomId: string
  heightUomId: string
  widthUomId: string
  depthUomId: string
  imageUrl: string
  createdDate: string | null
  lastModifiedDate: string | null
  lastModifiedByUserLogin: string
}

/** GoodIdentification row (SKU, UPCA, SHOPIFY_PROD_ID, ...). */
export interface ProductIdentification {
  productId: string
  goodIdentificationTypeId: string
  typeDescription: string
  idValue: string
  fromDate: string
  thruDate: string | null
  active: boolean
}

/** ProductAssoc row, direction-aware. */
export interface ProductAssociation {
  productId: string
  productIdTo: string
  productAssocTypeId: string
  fromDate: string
  thruDate: string | null
  active: boolean
  direction: "outgoing" | "incoming"
  sequenceNum: number | null
  quantity: number | null
  scrapFactor: number | null
  instruction: string
  reason: string
  /** the product on the other end of the link, as the UI displays it */
  relatedProductId: string
  relatedName: string
  relatedSku: string
  relatedImageUrl: string
}

export interface AssociationGroups {
  variants: ProductAssociation[]
  components: ProductAssociation[]
  substitutes: ProductAssociation[]
  other: ProductAssociation[]
}

/** ProductFeatureAppl joined with its feature + type. */
export interface ProductFeatureApplication {
  productId: string
  productFeatureId: string
  productFeatureApplTypeId: string
  featureTypeId: string
  featureTypeDescription: string
  description: string
  fromDate: string
  thruDate: string | null
  active: boolean
  sequenceNum: number | null
}

/** Feature axes for a product family: per type, which values are selectable / applied. */
export interface FeatureAxis {
  featureTypeId: string
  featureTypeDescription: string
  applications: ProductFeatureApplication[]
}

export interface CatalogOption {
  id: string
  label: string
  abbreviation?: string
}

export interface ProductCategory {
  productCategoryId: string
  categoryName: string
  description: string
}

/** What the category picker saves: categories newly checked, and the IDs of ones unchecked. */
export interface CategoryPickerResult {
  added: ProductCategory[]
  removedCategoryIds: string[]
}

export interface ProductPrice {
  productPriceTypeId: string
  productPricePurposeId: string
  currencyUomId: string
  productStoreId: string
  productStoreGroupId: string
  price: number
  fromDate: string
  thruDate: string | null
  active: boolean
}

export interface ProductCategoryMembership {
  productCategoryId: string
  categoryName: string
  fromDate: string
  thruDate: string | null
  active: boolean
}

export interface StoreCatalogExposure {
  productStoreId: string
  storeName: string
  prodCatalogId: string
  productCategoryId: string
  categoryName: string
  fromDate: string
  thruDate: string | null
}

export interface ProductHistoryEntry {
  id: string
  productId: string
  changedEntityName: string
  changedFieldName: string
  oldValue: string
  newValue: string
  changedByUserId: string
  /** The changing user's display name, when the history service joins it. */
  changedByName: string
  changedDate: string
  pkPrimaryValue: string
  pkSecondaryValue: string
}

export interface ImportHistoryEntry {
  id: string
  productId: string
  shopId: string
  parentProductId: string
  sku: string
  status: string
  message: string
  createdDate: string
  identifications: Array<{ goodIdentificationTypeId: string; idValue: string }>
}

export type PresellState = "preorder" | "backorder" | null

export interface ShopifyShop {
  shopId: string
  name: string
  domain: string
  /** The shop's main app connection (SystemMessageRemote) for Shopify queries; "" when it has none. */
  remoteId: string
}

export interface ShopifyShopProduct {
  shopId: string
  productId: string
  shopifyProductId: string
  shopifyInventoryItemId: string
}

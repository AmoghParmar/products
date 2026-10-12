import type { ProductCore, ProductPrice, ProductSummary } from "../types/product"
import { flagValue, isActive, isoDate, numberValue, stringArray, textValue } from "./value"

type Raw = Record<string, unknown>

/** PIM Solr document → ProductSummary. The doc shape is owned by the pim component
 *  (co.hotwax.pim.PimSearchServices), so this mapping is intentionally boring. */
export function normalizeProductSummary(doc: Raw): ProductSummary {
  return {
    productId: textValue(doc.productId ?? doc.id),
    productName: textValue(doc.productName),
    internalName: textValue(doc.internalName),
    brandName: textValue(doc.brandName),
    productTypeId: textValue(doc.productTypeId),
    isVirtual: flagValue(doc.isVirtual),
    isVariant: flagValue(doc.isVariant),
    parentProductId: textValue(doc.groupId),
    parentProductName: textValue(doc.parentProductName),
    sku: textValue(doc.sku),
    upc: textValue(doc.upc),
    tags: stringArray(doc.tags),
    featureValues: stringArray(doc.featureValues),
    primaryProductCategoryId: textValue(doc.primaryProductCategoryId),
    primaryProductCategoryName: textValue(doc.primaryProductCategoryName),
    productStoreIds: stringArray(doc.productStoreIds),
    imageUrl: textValue(doc.mainImageUrl),
    createdDate: isoDate(doc.createdDate) ?? "",
    lastModifiedDate: isoDate(doc.lastModifiedDate) ?? "",
    variantCount: numberValue(doc.variantCount) ?? 0,
    goodIdentifications: stringArray(doc.goodIdentifications),
    groupId: textValue(doc.groupId),
    groupName: textValue(doc.groupName),
    title: textValue(doc.title)
  }
}

function normalizePrices(raw: unknown): ProductPrice[] {
  if(!Array.isArray(raw)) {return []}

  return raw
    .map((row: Raw) => {
      const fromDate = isoDate(row.fromDate) ?? ""
      const thruDate = isoDate(row.thruDate)

      return {
        productPriceTypeId: textValue(row.productPriceTypeId),
        productPricePurposeId: textValue(row.productPricePurposeId) || "LISTING",
        currencyUomId: textValue(row.currencyUomId),
        productStoreId: textValue(row.productStoreId),
        productStoreGroupId: textValue(row.productStoreGroupId),
        price: numberValue(row.price) ?? 0,
        fromDate,
        thruDate,
        active: isActive(fromDate || null, thruDate)
      }
    })
    .sort((a, b) => Number(b.active) - Number(a.active) || priceDateMs(b.fromDate) - priceDateMs(a.fromDate))
}

function priceDateMs(value: string): number {
  const parsed = Date.parse(value)

  return Number.isFinite(parsed) ? parsed : 0
}

/** oms/products/{id} entity record → ProductCore (the editor's source of truth). */
export function normalizeProductCore(record: Raw): ProductCore {
  return {
    productId: textValue(record.productId),
    productTypeId: textValue(record.productTypeId),
    productName: textValue(record.productName),
    internalName: textValue(record.internalName),
    brandName: textValue(record.brandName),
    description: textValue(record.description),
    longDescription: textValue(record.longDescription),
    comments: textValue(record.comments),
    primaryProductCategoryId: textValue(record.primaryProductCategoryId),
    isVirtual: flagValue(record.isVirtual),
    isVariant: flagValue(record.isVariant),
    introductionDate: isoDate(record.introductionDate),
    releaseDate: isoDate(record.releaseDate),
    supportDiscontinuationDate: isoDate(record.supportDiscontinuationDate),
    salesDiscontinuationDate: isoDate(record.salesDiscontinuationDate),
    salesDiscWhenNotAvail: flagValue(record.salesDiscWhenNotAvail),
    returnable: flagValue(record.returnable),
    taxable: flagValue(record.taxable),
    chargeShipping: flagValue(record.chargeShipping),
    inShippingBox: flagValue(record.inShippingBox),
    defaultShipmentBoxTypeId: textValue(record.defaultShipmentBoxTypeId),
    productWeight: numberValue(record.productWeight ?? record.shippingWeight),
    productHeight: numberValue(record.productHeight ?? record.shippingHeight),
    productWidth: numberValue(record.productWidth ?? record.shippingWidth),
    productDepth: numberValue(record.productDepth ?? record.shippingDepth),
    weightUomId: textValue(record.weightUomId),
    heightUomId: textValue(record.heightUomId),
    widthUomId: textValue(record.widthUomId),
    depthUomId: textValue(record.depthUomId),
    imageUrl: firstText(record.detailImageUrl, record.smallImageUrl, record.mediumImageUrl, record.largeImageUrl, record.originalImageUrl),
    createdDate: isoDate(record.createdDate),
    lastModifiedDate: isoDate(record.lastModifiedDate ?? record.lastUpdatedStamp),
    lastModifiedByUserLogin: textValue(record.lastModifiedByUserLogin),
    prices: normalizePrices(record.prices)
  }
}

/** First non-empty text among candidates ("" must fall through, so ?? alone won't do). */
function firstText(...candidates: unknown[]): string {
  for(const candidate of candidates) {
    const text = textValue(candidate)
    if(text) {return text}
  }

  return ""
}

/** Display-name fallback chain used everywhere a product is shown. */
export function productDisplayName(product: { productName?: string; internalName?: string; productId: string }): string {
  return textValue(product.productName) || textValue(product.internalName) || product.productId
}

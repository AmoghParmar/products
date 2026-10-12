import type { ProductPrice } from "../types/product"

/** A ProductPrice belongs to a ProductStoreGroup (there is no per-store field on the record), so the
 *  prices for a store are the ones for its primary store group. */
export const DEFAULT_PRICE_PURPOSE = "PURCHASE"

/** The Shopify connector reads and writes prices with the PURCHASE purpose. LISTING is what this app
 *  used to save, so both count as the store group's price and PURCHASE is what a replacement keeps. */
const PRICE_PURPOSES = [DEFAULT_PRICE_PURPOSE, "LISTING"]

const PRICE_TYPE_LABELS: Record<string, string> = {
  DEFAULT_PRICE: "Default price",
  LIST_PRICE: "List price",
  WHOLESALE_PRICE: "Wholesale price"
}
const PRICE_TYPE_ORDER = Object.keys(PRICE_TYPE_LABELS)

/** One price the system holds for a product in the store group: a price type in a currency. */
export interface PriceRow {
  key: string
  productPriceTypeId: string
  currencyUomId: string
  price: ProductPrice
}

export const priceRowKey = (productPriceTypeId: string, currencyUomId: string) => `${productPriceTypeId}|${currencyUomId}`

export function priceTypeLabel(productPriceTypeId: string): string {
  if(PRICE_TYPE_LABELS[productPriceTypeId]) {return PRICE_TYPE_LABELS[productPriceTypeId]}

  const words = productPriceTypeId.toLowerCase().split("_").filter(Boolean).join(" ")

  return words.charAt(0).toUpperCase() + words.slice(1)
}

function priceInStoreGroup(price: ProductPrice, productStoreGroupId: string): boolean {
  return price.active &&
    price.productStoreGroupId === productStoreGroupId &&
    PRICE_PURPOSES.includes(price.productPricePurposeId || DEFAULT_PRICE_PURPOSE)
}

/** The active prices the product has in a store group, newest first when a type and currency repeat. */
export function activePricesForRow(prices: ProductPrice[], productPriceTypeId: string, currencyUomId: string, productStoreGroupId: string): ProductPrice[] {
  return prices
    .filter((price) => priceInStoreGroup(price, productStoreGroupId) &&
      price.productPriceTypeId === productPriceTypeId &&
      price.currencyUomId === currencyUomId)
    .sort((a, b) => priceDateMs(b.fromDate) - priceDateMs(a.fromDate))
}

/** Only prices that exist are listed: one row per price type and currency in the store group, showing the
 *  latest one. The HotWax types come first, then the rest by name; the store's own currency leads. */
export function priceRowsForStoreGroup(prices: ProductPrice[], productStoreGroupId: string, preferredCurrencyUomId = ""): PriceRow[] {
  const rows = new Map<string, PriceRow>()
  for(const price of prices.filter((candidate) => priceInStoreGroup(candidate, productStoreGroupId))) {
    const key = priceRowKey(price.productPriceTypeId, price.currencyUomId)
    const existing = rows.get(key)
    if(!existing || priceDateMs(price.fromDate) > priceDateMs(existing.price.fromDate)) {
      rows.set(key, { key, productPriceTypeId: price.productPriceTypeId, currencyUomId: price.currencyUomId, price })
    }
  }

  return [...rows.values()].sort((a, b) =>
    typeRank(a.productPriceTypeId) - typeRank(b.productPriceTypeId) ||
    a.productPriceTypeId.localeCompare(b.productPriceTypeId) ||
    Number(b.currencyUomId === preferredCurrencyUomId) - Number(a.currencyUomId === preferredCurrencyUomId) ||
    a.currencyUomId.localeCompare(b.currencyUomId))
}

/** A price that replaces existing ones keeps their purpose, so the connector keeps finding it. When a
 *  PURCHASE price is among them it stays PURCHASE: orders and the Shopify connector read only PURCHASE,
 *  and every replaced price is retired, so a LISTING replacement would leave the product without one. */
export function purposeForNewPrice(replacedPrices: ProductPrice[]): string {
  const purposes = replacedPrices.map((price) => price.productPricePurposeId || DEFAULT_PRICE_PURPOSE)
  if(!purposes.length || purposes.includes(DEFAULT_PRICE_PURPOSE)) {return DEFAULT_PRICE_PURPOSE}

  const newest = replacedPrices.slice().sort((a, b) => priceDateMs(b.fromDate) - priceDateMs(a.fromDate))[0]

  return newest.productPricePurposeId || DEFAULT_PRICE_PURPOSE
}

function typeRank(productPriceTypeId: string): number {
  const rank = PRICE_TYPE_ORDER.indexOf(productPriceTypeId)

  return rank === -1 ? PRICE_TYPE_ORDER.length : rank
}

function priceDateMs(value: string): number {
  const parsed = Date.parse(value)

  return Number.isFinite(parsed) ? parsed : 0
}

import { describe, expect, it } from "vitest"
import type { ProductPrice } from "@/domain/types/product"
import {
  DEFAULT_PRICE_PURPOSE, activePricesForRow, priceRowKey, priceRowsForStoreGroup, priceTypeLabel, purposeForNewPrice
} from "../prices"

const price = (overrides: Partial<ProductPrice>): ProductPrice => ({
  productPriceTypeId: "LIST_PRICE",
  productPricePurposeId: "PURCHASE",
  currencyUomId: "USD",
  productStoreId: "",
  productStoreGroupId: "GROUP",
  price: 10,
  fromDate: "2026-06-01T00:00:00Z",
  thruDate: null,
  active: true,
  ...overrides
})

describe("prices shown for a store group", () => {
  it("lists only the prices that exist, even though the records name no store", () => {
    const rows = priceRowsForStoreGroup([price({ price: 180 })], "GROUP")

    expect(rows.map((row) => row.key)).toEqual(["LIST_PRICE|USD"])
    expect(rows[0].price.price).toBe(180)
  })

  it("shows nothing for a type the product has no price for", () => {
    const rows = priceRowsForStoreGroup([price({})], "GROUP")

    expect(rows.map((row) => row.productPriceTypeId)).toEqual(["LIST_PRICE"])
    expect(priceRowsForStoreGroup([], "GROUP")).toEqual([])
  })

  it("leaves out other store groups, retired prices, and purposes that are not the store price", () => {
    const rows = priceRowsForStoreGroup([
      price({ price: 1 }),
      price({ productStoreGroupId: "OTHER_GROUP", currencyUomId: "CAD" }),
      price({ currencyUomId: "EUR", active: false, thruDate: "2026-06-08T00:00:00Z" }),
      price({ currencyUomId: "GBP", productPricePurposeId: "RECURRING_CHARGE" })
    ], "GROUP")

    expect(rows.map((row) => row.key)).toEqual(["LIST_PRICE|USD"])
  })

  it("has one row per price type and currency, with the latest price when one repeats", () => {
    const older = price({ fromDate: "2026-05-01T00:00:00Z", price: 15 })
    const newer = price({ productPricePurposeId: "LISTING", fromDate: "2026-06-01T00:00:00Z", price: 20 })
    const eur = price({ currencyUomId: "EUR", price: 18 })
    const rows = priceRowsForStoreGroup([older, newer, eur], "GROUP")

    expect(rows.map((row) => row.key)).toEqual(["LIST_PRICE|EUR", "LIST_PRICE|USD"])
    expect(rows.find((row) => row.key === priceRowKey("LIST_PRICE", "USD"))?.price).toBe(newer)
  })

  it("orders the HotWax types first, then the others, with the store's currency leading", () => {
    const rows = priceRowsForStoreGroup([
      price({ productPriceTypeId: "MINIMUM_PRICE" }),
      price({ productPriceTypeId: "LIST_PRICE", currencyUomId: "CAD" }),
      price({ productPriceTypeId: "LIST_PRICE", currencyUomId: "USD" }),
      price({ productPriceTypeId: "DEFAULT_PRICE" })
    ], "GROUP", "USD")

    expect(rows.map((row) => row.key)).toEqual(["DEFAULT_PRICE|USD", "LIST_PRICE|USD", "LIST_PRICE|CAD", "MINIMUM_PRICE|USD"])
  })
})

describe("replacing a price", () => {
  it("retires only the active prices of that type and currency in the store group", () => {
    const target = price({ price: 20 })
    const prices = [
      target,
      price({ currencyUomId: "CAD" }),
      price({ productStoreGroupId: "OTHER_GROUP" }),
      price({ productPriceTypeId: "DEFAULT_PRICE" }),
      price({ active: false, thruDate: "2026-06-08T00:00:00Z" })
    ]

    expect(activePricesForRow(prices, "LIST_PRICE", "USD", "GROUP")).toEqual([target])
  })

  it("gives the new price the purpose of the price it replaces, PURCHASE when there is none", () => {
    const listing = price({ productPricePurposeId: "LISTING", fromDate: "2026-06-02T00:00:00Z" })

    // A newer LISTING price never displaces PURCHASE, which orders and the connector read.
    expect(purposeForNewPrice([price({}), listing])).toBe("PURCHASE")
    expect(purposeForNewPrice([listing])).toBe("LISTING")
    expect(purposeForNewPrice([price({ productPricePurposeId: "" }), listing])).toBe("PURCHASE")
    expect(purposeForNewPrice([])).toBe(DEFAULT_PRICE_PURPOSE)
  })
})

describe("price type labels", () => {
  it("names the HotWax types and spells out the others", () => {
    expect(priceTypeLabel("LIST_PRICE")).toBe("List price")
    expect(priceTypeLabel("SPECIAL_PROMO_PRICE")).toBe("Special promo price")
  })
})

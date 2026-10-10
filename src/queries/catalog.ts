import { queryOptions } from "@tanstack/vue-query"
import { fetchImportHistories, fetchProductStores, fetchShopifyShops } from "@/api/catalog"
import { fetchBoxTypes, fetchCatalogList, fetchUoms } from "@/api/pim"
import { normalizeImportEntry } from "@/domain/normalize/history"
import { normalizeCatalogOption } from "@/domain/normalize/identification"
import type { CatalogOption, ShopifyShop } from "@/domain/types/product"
import { qk } from "./keys"

/** Common units float to the top of the select; the rest stay available but out of the way. */
const COMMON_UOMS = ["LEN_cm", "LEN_mm", "LEN_m", "LEN_in", "LEN_ft", "WT_g", "WT_kg", "WT_lb", "WT_oz"]
function uomOptions(uomTypeEnumId: string) {
  return queryOptions({
    queryKey: qk.catalog.list(`uoms:${uomTypeEnumId}`),
    queryFn: async (): Promise<CatalogOption[]> => {
      const rows = (await fetchUoms(uomTypeEnumId)).map((row) => ({
        id: String(row.uomId ?? ""),
        abbreviation: String(row.abbreviation),
        label: String(row.description ?? row.abbreviation ?? row.uomId ?? "")
      }))

      return rows.sort((a, b) => {
        const ra = COMMON_UOMS.indexOf(a.id); const rb = COMMON_UOMS.indexOf(b.id)
        if(ra !== rb) {return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb)}

        return a.label.localeCompare(b.label)
      })
    },
    staleTime: Infinity
  })
}

export const lengthUomOptions = () => uomOptions("UT_LENGTH_MEASURE")
export const weightUomOptions = () => uomOptions("UT_WEIGHT_MEASURE")
export const currencyUomOptions = () => uomOptions("UT_CURRENCY_MEASURE")

/** Reference data: effectively immutable per session → staleTime Infinity, explicit refresh only. */

function catalogListOptions(
  resource: Parameters<typeof fetchCatalogList>[0],
  idField: string,
  extraParams?: Record<string, unknown>
) {
  return queryOptions({
    queryKey: qk.catalog.list(extraParams ? `${resource}:${JSON.stringify(extraParams)}` : resource),
    queryFn: async (): Promise<CatalogOption[]> =>
      (await fetchCatalogList(resource, extraParams)).map((row) => normalizeCatalogOption(row, idField)),
    staleTime: Infinity
  })
}

function boxListOptions(
  resource: Parameters<typeof fetchCatalogList>[0],
  idField: string,
  extraParams?: Record<string, unknown>
) {
  return queryOptions({
    queryKey: qk.catalog.list(extraParams ? `${resource}:${JSON.stringify(extraParams)}` : resource),
    queryFn: async (): Promise<CatalogOption[]> =>
      (await fetchBoxTypes(extraParams)).map((row) => normalizeCatalogOption(row, idField)),
    staleTime: Infinity
  })
}

export const productTypesOptions = () => catalogListOptions("productTypes", "productTypeId")
export const featureTypesOptions = () => catalogListOptions("featureTypes", "productFeatureTypeId")
export const featureApplTypesOptions = () => catalogListOptions("featureApplTypes", "productFeatureApplTypeId")
export const associationTypesOptions = () => catalogListOptions("associationTypes", "productAssocTypeId")
export const identificationTypesOptions = () => catalogListOptions("goodIdentificationTypes", "goodIdentificationTypeId", { parentTypeId: "HC_GOOD_ID_TYPE" })
export const boxTypesOptions = () => boxListOptions("boxTypes", "shipmentBoxTypeId")

/** A shop's main app connection: its remotes also include embedded POS apps, which are not meant for
 *  catalog queries. Falls back to the first remote when none is marked as the default app. */
function defaultAppRemoteId(remotes: unknown): string {
  const rows = Array.isArray(remotes) ? remotes as Record<string, unknown>[] : []
  const remote = rows.find((row) => row.purposeTypeId === "SsctShopifyDefaultApp") ?? rows[0]

  return String(remote?.systemMessageRemoteId ?? "")
}

/** Shopify shops by shop ID, keeping only the fields lists show (the records also carry shop config). */
export function shopifyShopsOptions() {
  return queryOptions({
    queryKey: qk.catalog.list("shopifyShops"),
    queryFn: async (): Promise<ShopifyShop[]> =>
      (await fetchShopifyShops()).map((row) => ({
        shopId: String(row.shopId ?? ""),
        name: String(row.name ?? row.shopId ?? ""),
        domain: String(row.myshopifyDomain ?? row.domain ?? ""),
        remoteId: defaultAppRemoteId(row.shopRemotes)
      })),
    staleTime: Infinity
  })
}

export function productStoresOptions() {
  return queryOptions({
    queryKey: qk.catalog.list("productStores"),
    queryFn: async (): Promise<CatalogOption[]> =>
      (await fetchProductStores()).map((row) => ({
        id: String(row.productStoreId ?? ""),
        label: String(row.storeName ?? row.productStoreId ?? "")
      })),
    staleTime: Infinity
  })
}

export function importHistoryOptions() {
  return queryOptions({
    queryKey: qk.imports,
    queryFn: async () => (await fetchImportHistories()).map(normalizeImportEntry)
  })
}

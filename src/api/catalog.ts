import { request, responseList } from "./http"

/** Reads served by oms/admin on origin/main (entity ops + data documents + utility services). */

type Raw = Record<string, unknown>

/** Generic DataDocument view query (co.hotwax.oms.common.CommonServices.get#DataDocumentView). */
export async function fetchDataDocument(
  dataDocumentId: string,
  customParametersMap: Record<string, unknown>,
  options: { pageSize?: number; filterByDate?: boolean } = {}
): Promise<Raw[]> {
  const data = {
    dataDocumentId,
    pageIndex: 0,
    pageSize: options.pageSize ?? 200,
    filterByDate: options.filterByDate ?? false,
    customParametersMap
  }
  const response = await request<{ entityValueList?: Raw[] }>({ url: "oms/dataDocumentView", method: "post", data })

  return response.entityValueList ?? responseList(response)
}

/** Field-level audit trail (oms/products/{id}/history). Upstream only GoodIdentification.idValue
 *  carries enable-audit-log, so identifier changes (incl. dedup fixes) are the recorded history. */
export async function fetchEntityAuditLogs(productId: string, pageSize = 50): Promise<Raw[]> {
  return responseList(await request({
    url: `oms/products/${productId}/history`,
    method: "get",
    params: { pageSize }
  }))
}

export async function fetchImportHistories(pageSize = 100): Promise<Raw[]> {
  return responseList(await request({
    url: "oms/products/productUpdateHistories",
    method: "get",
    params: { pageSize, orderByField: "-lastUpdatedStamp" }
  }))
}

export async function fetchProductStores(): Promise<Raw[]> {
  return responseList(await request({ url: "admin/productStores", method: "get", params: { pageSize: 100 } }))
}

/** Every Shopify shop the OMS is connected to (shop ID, name, domain, ProductStore). */
export async function fetchShopifyShops(): Promise<Raw[]> {
  return responseList(await request({ url: "sob/shopify/shops", method: "get", params: { pageSize: 200 } }))
}

/** Facility names for a few facility IDs (history entries name facilities by ID). */
export async function fetchFacilityNames(facilityIds: string[]): Promise<Raw[]> {
  const ids = Array.from(new Set(facilityIds.filter(Boolean)))
  if(!ids.length) {return []}

  return responseList(await request({ url: "oms/facilities", method: "get", params: { facilityId: ids.join(","), facilityId_op: "in", pageSize: ids.length } }))
}

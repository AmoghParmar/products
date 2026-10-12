import { fetchDataDocument } from "./catalog"
import { request, responseList } from "./http"

/** ProductStore setting shared by every AccxUI app that shows product identifiers. */
export const PRODUCT_IDENTIFICATION_SETTING = "PRDT_IDEN_PREF"

/** The ProductStore's PRDT_IDEN_PREF value (a JSON string), or undefined when it has none. */
export async function fetchProductIdentificationSetting(productStoreId: string): Promise<string | undefined> {
  const settings = await fetchDataDocument("ProductStoreSetting", {
    productStoreId,
    settingTypeEnumId: PRODUCT_IDENTIFICATION_SETTING
  })
  const setting = settings.find((row) => row.settingTypeEnumId === PRODUCT_IDENTIFICATION_SETTING)

  return typeof setting?.settingValue === "string" ? setting.settingValue : undefined
}

export function storeProductIdentificationSetting(productStoreId: string, settingValue: string) {
  return request({
    url: `admin/productStores/${productStoreId}/settings`,
    method: "post",
    data: { productStoreId, settingTypeEnumId: PRODUCT_IDENTIFICATION_SETTING, settingValue }
  })
}

export async function fetchGoodIdentificationTypes() {
  return responseList(await request({
    url: "oms/goodIdentificationTypes",
    method: "get",
    params: { parentTypeId: "HC_GOOD_ID_TYPE", pageSize: 50 }
  }))
}

import { commonUtil } from "@common"

export interface ProductIdentificationPref {
  primaryId: string
  secondaryId: string
}

export interface ProductIdentificationOption {
  goodIdentificationTypeId: string
  description?: string
}

/** Same default the other AccxUI apps use when a ProductStore has no PRDT_IDEN_PREF. */
export const DEFAULT_PRODUCT_IDENTIFICATION_PREF: ProductIdentificationPref = { primaryId: "SKU", secondaryId: "productId" }

/** Identification types offered even when the type list leaves them out: SKU is the default primary
 *  identifier but is not a child of HC_GOOD_ID_TYPE, so without this it could not be chosen again. */
export const ALWAYS_OFFERED_IDENTIFICATION_TYPES: ProductIdentificationOption[] = [
  { goodIdentificationTypeId: "SKU", description: "SKU" }
]

/** Product document fields offered next to the good identification types, as in the other apps. */
export const PRODUCT_DOCUMENT_IDENTIFIERS: ProductIdentificationOption[] = [
  { goodIdentificationTypeId: "productId", description: "Product ID" },
  { goodIdentificationTypeId: "groupId", description: "Group ID" },
  { goodIdentificationTypeId: "groupName", description: "Group name" },
  { goodIdentificationTypeId: "internalName", description: "Internal name" },
  { goodIdentificationTypeId: "parentProductName", description: "Parent product name" },
  { goodIdentificationTypeId: "primaryProductCategoryName", description: "Primary product category name" },
  { goodIdentificationTypeId: "title", description: "Title" }
]

export function parseProductIdentificationPref(settingValue: unknown): ProductIdentificationPref {
  if(typeof settingValue !== "string" || !settingValue) {return { ...DEFAULT_PRODUCT_IDENTIFICATION_PREF }}

  try {
    const parsed = JSON.parse(settingValue)

    return {
      primaryId: typeof parsed?.primaryId === "string" ? parsed.primaryId : DEFAULT_PRODUCT_IDENTIFICATION_PREF.primaryId,
      secondaryId: typeof parsed?.secondaryId === "string" ? parsed.secondaryId : DEFAULT_PRODUCT_IDENTIFICATION_PREF.secondaryId
    }
  } catch {
    return { ...DEFAULT_PRODUCT_IDENTIFICATION_PREF }
  }
}

// The index holds goodIdentifications such as "SKU/null" for values that were never set, and the
// shared resolver hands that text back as the value, so it counts as missing too.
const EMPTY_IDENTIFIER_TEXT = new Set(["", "null", "undefined"])

/** One identifier of a product document (a field or a goodIdentifications entry); "" when missing. */
export function productIdentifierValue(identifierId: string, product?: object | null): string {
  if(!identifierId || !product || !Object.keys(product).length) {return ""}
  const value = commonUtil.getProductIdentificationValue(identifierId, product)
  const text = value === undefined || value === null ? "" : String(value).trim()

  return EMPTY_IDENTIFIER_TEXT.has(text.toLowerCase()) ? "" : text
}

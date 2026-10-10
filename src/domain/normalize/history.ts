import type { ImportHistoryEntry, ProductHistoryEntry } from "../types/product"
import { isoDate, textValue } from "./value"

type Raw = Record<string, unknown>

/** oms/products/{id}/history row (EntityAuditLog, with userFullName) → ProductHistoryEntry. */
export function normalizeAuditEntry(record: Raw): ProductHistoryEntry {
  return {
    id: textValue(record.auditHistorySeqId ?? record.entityAuditLogId ?? `${record.changedEntityName}-${record.changedDate}`),
    productId: textValue(record.pkPrimaryValue ?? record.productId),
    changedEntityName: textValue(record.changedEntityName),
    changedFieldName: textValue(record.changedFieldName),
    pkPrimaryValue: textValue(record.pkPrimaryValue),
    oldValue: textValue(record.oldValueText ?? record.oldValue),
    newValue: textValue(record.newValueText ?? record.newValue),
    changedByUserId: textValue(record.changedByUserId ?? record.changedByUser),
    changedByName: textValue(record.userFullName),
    changedDate: isoDate(record.changedDate) ?? "",
    pkSecondaryValue: textValue(record.pkSecondaryValue)
  }
}

/** oms/products/productUpdateHistories row → ImportHistoryEntry. ProductUpdateHistory is the
 *  Shopify-sync state table keyed by (productId, shopId): hashes, price, assoc snapshot and the
 *  system message that produced it. */
export function normalizeImportEntry(record: Raw): ImportHistoryEntry {
  return {
    id: `${textValue(record.productId)}@${textValue(record.shopId)}`,
    productId: textValue(record.productId),
    shopId: textValue(record.shopId),
    parentProductId: textValue(record.parentProductId),
    sku: textValue(record.sku ?? record.shopifyProductSku),
    status: textValue(record.systemMessageId) ? "Synced" : "Recorded",
    message: textValue(record.systemMessageId) ? `System message: ${textValue(record.systemMessageId)}` : "",
    createdDate: isoDate(record.createdDate ?? record.lastUpdatedStamp) ?? ""
  }
}

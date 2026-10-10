import type { ProductHistoryEntry } from "../types/product"

export const GOOD_IDENTIFICATION_ENTITY = "org.apache.ofbiz.product.product.GoodIdentification"
export const PRODUCT_FACILITY_ENTITY = "org.apache.ofbiz.product.facility.ProductFacility"

/** The audited ProductFacility fields, as translation keys. */
export const PRODUCT_FACILITY_FIELD_LABELS: Record<string, string> = {
  minimumStock: "Minimum stock",
  allowPickup: "Allow pickup",
  allowBrokering: "Allow brokering"
}

export type HistoryChangeKind = "set" | "cleared" | "changed"

export interface HistoryChange {
  kind: HistoryChangeKind
  from: string
  to: string
}

/** Audited indicator fields hold Y/N. */
function displayValue(value: string): string {
  if(value === "Y") {return "Yes"}
  if(value === "N") {return "No"}

  return value
}

/** How a value moved: first set, cleared, or changed from one value to another. */
export function historyChange(entry: Pick<ProductHistoryEntry, "oldValue" | "newValue">): HistoryChange {
  const from = displayValue(entry.oldValue.trim())
  const to = displayValue(entry.newValue.trim())

  if(!from) {return { kind: "set", from, to }}
  if(!to) {return { kind: "cleared", from, to }}

  return { kind: "changed", from, to }
}

/** What a history entry is about, before labels are looked up: an identification type, or a facility
 *  setting. EntityAuditLog keeps keys positionally, so the type is a GoodIdentification's first key and
 *  the facility a ProductFacility's second. */
export function historySubject(entry: ProductHistoryEntry):
  { kind: "identification"; identificationTypeId: string } |
  { kind: "facility"; facilityId: string; field: string } |
  { kind: "other"; entity: string; field: string } {
  if(entry.changedEntityName === GOOD_IDENTIFICATION_ENTITY) {return { kind: "identification", identificationTypeId: entry.pkPrimaryValue }}
  if(entry.changedEntityName === PRODUCT_FACILITY_ENTITY) {return { kind: "facility", facilityId: entry.pkSecondaryValue, field: entry.changedFieldName }}

  return { kind: "other", entity: entry.changedEntityName.split(".").pop() ?? entry.changedEntityName, field: entry.changedFieldName }
}

import { DateTime } from "luxon"

/** ProductStoreProduct lifecycle dates, in the order the calendar shows them. */
export const PRODUCT_CALENDAR_DATE_FIELDS = ["introductionDate", "releaseDate", "supportDiscontinuationDate", "salesDiscontinuationDate"] as const
export type ProductCalendarDateField = typeof PRODUCT_CALENDAR_DATE_FIELDS[number]

export const PRODUCT_CALENDAR_DATE_LABELS: Record<ProductCalendarDateField, string> = {
  introductionDate: "Introduction",
  releaseDate: "Launch",
  supportDiscontinuationDate: "Support ends",
  salesDiscontinuationDate: "Sales ends"
}

/** One product as the dates editor shows it: identity for the header, current dates for the form. */
export interface ProductCalendarDatesItem {
  productId: string
  primary: string
  secondary: string
  imageUrl: string
  dates: Partial<Record<ProductCalendarDateField, unknown>>
}

/** Moqui REST returns timestamps as epoch millis; older rows may still carry ISO or SQL strings. */
export function parseCalendarDate(value: unknown): DateTime | null {
  if(!value) {return null}
  if(typeof value === "number" || (!isNaN(Number(value)) && !String(value).includes("-") && !String(value).includes(":"))) {
    const millis = DateTime.fromMillis(Number(value))
    if(millis.isValid) {return millis}
  }
  const iso = DateTime.fromISO(String(value))
  if(iso.isValid) {return iso}
  const sql = DateTime.fromSQL(String(value))

  return sql.isValid ? sql : null
}

export function formatCalendarDate(value: unknown): string {
  return parseCalendarDate(value)?.toLocaleString(DateTime.DATE_MED) ?? "-"
}

/** ion-datetime (presentation="date") works in ISO dates; the calendar stores the start of that local day. */
export function calendarDateInputValue(value: unknown): string | undefined {
  return parseCalendarDate(value)?.toISODate() ?? undefined
}

export function calendarDateFromInput(value: string): number | null {
  const date = DateTime.fromISO(value)

  return date.isValid ? date.startOf("day").toMillis() : null
}

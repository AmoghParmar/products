import { DateTime } from "luxon"
import { describe, expect, it } from "vitest"
import { calendarDateFromInput, calendarDateInputValue, formatCalendarDate, parseCalendarDate } from "../calendar"

describe("product calendar dates", () => {
  const localNoon = DateTime.fromISO("2026-09-23T12:00:00")

  it("reads epoch millis, ISO, and SQL timestamps", () => {
    expect(parseCalendarDate(localNoon.toMillis())?.toISODate()).toBe("2026-09-23")
    expect(parseCalendarDate(String(localNoon.toMillis()))?.toISODate()).toBe("2026-09-23")
    expect(parseCalendarDate("2026-09-23T12:00:00")?.toISODate()).toBe("2026-09-23")
    expect(parseCalendarDate("2026-09-23 12:00:00.000")?.toISODate()).toBe("2026-09-23")
  })

  it("treats empty and unreadable values as not set", () => {
    expect(parseCalendarDate(null)).toBeNull()
    expect(parseCalendarDate("")).toBeNull()
    expect(parseCalendarDate("not a date")).toBeNull()
    expect(formatCalendarDate(undefined)).toBe("-")
  })

  it("round-trips a picked day through the date picker value", () => {
    const millis = calendarDateFromInput("2026-09-23")

    expect(millis).toBe(DateTime.fromISO("2026-09-23").startOf("day").toMillis())
    expect(calendarDateInputValue(millis)).toBe("2026-09-23")
    expect(calendarDateInputValue(null)).toBeUndefined()
    expect(calendarDateFromInput("")).toBeNull()
  })
})

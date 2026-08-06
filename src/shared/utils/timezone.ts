/** Validate an IANA time-zone identifier at runtime. */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (typeof tz !== "string" || tz.length === 0) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Format a date in the requested time zone, falling back to UTC on invalid zones. */
export function formatInTimeZone(
  date: Date,
  timeZone: string | null | undefined,
  locale = "en-US",
): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  try {
    return date.toLocaleString(locale, { timeZone: zone });
  } catch {
    return date.toLocaleString(locale, { timeZone: "UTC" });
  }
}

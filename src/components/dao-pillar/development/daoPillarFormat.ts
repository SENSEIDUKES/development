/** Display helpers for server-issued calendar dates and claim times. */

const MONTH_DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };

const utcDate = (calendarDate: string) => new Date(`${calendarDate}T00:00:00Z`);

/** "Sep 18 – Oct 17, 2026" (or "Dec 20, 2026 – Jan 18, 2027" across years). */
export function formatCycleRange(startsOn: string, endsOn: string, locale?: string): string {
  const start = utcDate(startsOn);
  const end = utcDate(endsOn);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startText = start.toLocaleDateString(locale, sameYear ? MONTH_DAY : { ...MONTH_DAY, year: 'numeric' });
  const endText = end.toLocaleDateString(locale, { ...MONTH_DAY, year: 'numeric' });
  return `${startText} – ${endText}`;
}

/** "Thursday, September 18, 2026" for a scheduled date. */
export const formatScheduledDate = (calendarDate: string, locale?: string): string =>
  utcDate(calendarDate).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** The exact local moment a day was collected. */
export const formatClaimedAt = (iso: string, locale?: string): string =>
  new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

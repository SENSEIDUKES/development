/**
 * The server-controlled calendar boundary.
 *
 * Every "what day is it" question is answered here, in the cycle's IANA time
 * zone, from the server clock. Browsers never compute a date: the snapshot
 * tells them which scheduled day is today, and a claim always means "today".
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isCalendarDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && value === toCalendarDate(new Date(`${value}T00:00:00Z`));

const toCalendarDate = (date: Date): string => date.toISOString().slice(0, 10);

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
};

/** The YYYY-MM-DD calendar date of an instant in `timeZone`. */
export function calendarDateIn(timeZone: string, instant: Date | string | number): string {
  const parts = formatterFor(timeZone).formatToParts(new Date(instant));
  const read = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

/** `date` plus `days` whole calendar days (negative allowed). */
export function addCalendarDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return toCalendarDate(base);
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function calendarDaysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

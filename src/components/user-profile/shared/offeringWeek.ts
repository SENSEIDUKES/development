/**
 * ISO week id for the Weekly Offering hall.
 *
 * Copied verbatim from `getCurrentOfferingWeekId` in
 * `SENSEIDUKES/Light-Novels` `src/lib/artifacts.ts`. It is pure date maths and
 * decides which relics render as this week's unsubmitted offerings, so the
 * replica needs the real implementation.
 *
 * It lives in `shared/` rather than in each fork because it is unforked date
 * maths that the Workshop's preview data also reads. The rest of
 * `lib/artifacts.ts` reads and writes persisted inventory and stays behind the
 * services port (`submitCurrentWeekOfferings`).
 */

export function getCurrentOfferingWeekId(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

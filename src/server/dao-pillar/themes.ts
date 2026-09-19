import { type RewardEntry, type RewardType } from '@seihouse/library/dao-pillar';
import { addCalendarDays, calendarDaysBetween, isCalendarDate, isValidTimeZone } from './calendar';
import type { DaoPillarDaySchedule, DaoPillarTheme } from './types';

export class DaoPillarThemeError extends Error {
  readonly issues: string[];
  constructor(themeId: string, issues: string[]) {
    super(`Dao Pillar theme "${themeId}" is not valid: ${issues.join(' ')}`);
    this.name = 'DaoPillarThemeError';
    this.issues = issues;
  }
}

/**
 * The reward kinds the claim path can deliver today. Adding Relics, Titles,
 * Energy or Media Packs means adding their delivery (server + migration) and
 * listing them here; until then a theme that awards them cannot be activated.
 */
export const DELIVERABLE_REWARD_TYPES: readonly RewardType[] = ['qi'];

/**
 * BETA TEST — the first theme: a 30-day cultivation trial. 100 Qi a day,
 * 500 Qi on days 7, 14, 21 and 28.
 */
export const BETA_TEST_THEME: DaoPillarTheme = {
  id: 'beta-test',
  name: 'Beta Test',
  tagline: '30-Day Cultivation Trial',
  description: 'Thirty days of small, steady steps. Return each day to collect the Qi set aside for you; every seventh day carries a heavier reward.',
  motto: 'A quieter mind. A brighter tomorrow.',
  pillars: ['Study', 'Reflect', 'Cultivate', 'Together'],
  calendar: { startsOn: '2026-09-18', days: 30, timeZone: 'America/New_York' },
  rewards: {
    everyDay: [{ type: 'qi', amount: 100 }],
    milestoneDays: [7, 14, 21, 28],
    milestone: [{ type: 'qi', amount: 500 }],
  },
  visual: {
    bannerSrc: '/dao-pillar/beta-test-banner.jpg',
    seal: '道',
    accent: '#7dd3ff',
    gold: '#e2c46a',
  },
};

/** Every theme the Library knows. Activation is by configuration, see `config.ts`. */
export const DAO_PILLAR_THEMES: readonly DaoPillarTheme[] = [BETA_TEST_THEME];

export const findDaoPillarTheme = (themeId: string, registry: readonly DaoPillarTheme[] = DAO_PILLAR_THEMES): DaoPillarTheme | undefined =>
  registry.find(theme => theme.id === themeId);

const validRewardEntry = (entry: RewardEntry, issues: string[], where: string): void => {
  if (!entry || typeof entry !== 'object' || typeof entry.type !== 'string') {
    issues.push(`${where} has a malformed reward entry.`);
    return;
  }
  if (!DELIVERABLE_REWARD_TYPES.includes(entry.type)) {
    issues.push(`${where} awards "${entry.type}", which cannot be delivered yet.`);
  }
  if ((entry.type === 'qi' || entry.type === 'energy') && (!Number.isInteger(entry.amount) || entry.amount <= 0)) {
    issues.push(`${where} needs a positive whole ${entry.type} amount.`);
  }
};

/** Throws `DaoPillarThemeError` when a theme cannot be run as configured. */
export function validateDaoPillarTheme(theme: DaoPillarTheme): DaoPillarTheme {
  const issues: string[] = [];
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(theme.id)) issues.push('The id must be 1–64 lowercase letters, digits or dashes.');
  if (!theme.name.trim()) issues.push('A name is required.');
  if (!isCalendarDate(theme.calendar.startsOn)) issues.push('startsOn must be a YYYY-MM-DD date.');
  if (!Number.isInteger(theme.calendar.days) || theme.calendar.days < 1 || theme.calendar.days > 366) issues.push('days must be 1–366.');
  if (!isValidTimeZone(theme.calendar.timeZone)) issues.push(`"${theme.calendar.timeZone}" is not a known time zone.`);
  if (theme.rewards.everyDay.length === 0) issues.push('everyDay needs at least one reward entry.');
  theme.rewards.everyDay.forEach(entry => validRewardEntry(entry, issues, 'everyDay'));
  theme.rewards.milestone.forEach(entry => validRewardEntry(entry, issues, 'milestone'));
  for (const day of theme.rewards.milestoneDays) {
    if (!Number.isInteger(day) || day < 1 || day > theme.calendar.days) issues.push(`Milestone day ${day} is outside the cycle.`);
  }
  if (theme.rewards.milestoneDays.length > 0 && theme.rewards.milestone.length === 0) issues.push('milestone needs at least one reward entry.');
  for (const [dayKey, entries] of Object.entries(theme.rewards.overrides ?? {})) {
    const day = Number(dayKey);
    if (!Number.isInteger(day) || day < 1 || day > theme.calendar.days) issues.push(`Override day ${dayKey} is outside the cycle.`);
    if (entries.length === 0) issues.push(`Override day ${dayKey} needs at least one reward entry.`);
    entries.forEach(entry => validRewardEntry(entry, issues, `override day ${dayKey}`));
  }
  if (!theme.visual.bannerSrc) issues.push('A banner is required.');
  if (issues.length) throw new DaoPillarThemeError(theme.id, issues);
  return theme;
}

/** `<themeId>:<startsOn>`: running the same theme again is a new cycle. */
export const cycleIdFor = (theme: DaoPillarTheme): string => `${theme.id}:${theme.calendar.startsOn}`;

export const cycleEndsOn = (theme: DaoPillarTheme): string => addCalendarDays(theme.calendar.startsOn, theme.calendar.days - 1);

export const rewardsForDay = (theme: DaoPillarTheme, day: number): RewardEntry[] => {
  const override = theme.rewards.overrides?.[day];
  if (override) return override.map(entry => ({ ...entry }));
  const source = theme.rewards.milestoneDays.includes(day) ? theme.rewards.milestone : theme.rewards.everyDay;
  return source.map(entry => ({ ...entry }));
};

/** The full schedule: one entry per day with its date and reward payload. */
export function buildRewardSchedule(theme: DaoPillarTheme): DaoPillarDaySchedule[] {
  return Array.from({ length: theme.calendar.days }, (_, index) => {
    const day = index + 1;
    return {
      day,
      scheduledDate: addCalendarDays(theme.calendar.startsOn, index),
      rewards: rewardsForDay(theme, day),
      milestone: theme.rewards.milestoneDays.includes(day),
    };
  });
}

/** The scheduled day for a calendar date, or null outside the cycle. */
export function scheduledDayOn(theme: DaoPillarTheme, date: string): number | null {
  const offset = calendarDaysBetween(theme.calendar.startsOn, date);
  return offset >= 0 && offset < theme.calendar.days ? offset + 1 : null;
}

/** A copy of a theme with a different calendar — for previews and tests only. */
export const withCalendar = (theme: DaoPillarTheme, calendar: Partial<DaoPillarTheme['calendar']>, id = theme.id): DaoPillarTheme => ({
  ...theme,
  id,
  calendar: { ...theme.calendar, ...calendar },
});

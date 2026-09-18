import { describe, expect, it } from 'vitest';
import { addCalendarDays, calendarDateIn, calendarDaysBetween, isCalendarDate, isValidTimeZone } from './calendar';
import { resolveDaoPillarConfig } from './config';
import { BETA_TEST_THEME, buildRewardSchedule, cycleEndsOn, cycleIdFor, DaoPillarThemeError, scheduledDayOn, validateDaoPillarTheme, withCalendar } from './themes';

describe('Dao Pillar calendar boundary', () => {
  it('computes the calendar date in the cycle time zone, not the server zone', () => {
    // 03:30 UTC on the 19th is still the 18th in New York.
    expect(calendarDateIn('America/New_York', '2026-09-19T03:30:00Z')).toBe('2026-09-18');
    expect(calendarDateIn('UTC', '2026-09-19T03:30:00Z')).toBe('2026-09-19');
    expect(calendarDateIn('Asia/Tokyo', '2026-09-18T20:00:00Z')).toBe('2026-09-19');
  });

  it('moves and measures whole days across month boundaries', () => {
    expect(addCalendarDays('2026-09-18', 29)).toBe('2026-10-17');
    expect(addCalendarDays('2026-09-18', -1)).toBe('2026-09-17');
    expect(calendarDaysBetween('2026-09-18', '2026-10-17')).toBe(29);
    expect(calendarDaysBetween('2026-09-18', '2026-09-17')).toBe(-1);
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-09-18')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('maps dates onto scheduled days only inside the cycle', () => {
    const theme = withCalendar(BETA_TEST_THEME, { startsOn: '2026-09-18' });
    expect(cycleIdFor(theme)).toBe('beta-test:2026-09-18');
    expect(cycleEndsOn(theme)).toBe('2026-10-17');
    expect(scheduledDayOn(theme, '2026-09-17')).toBeNull();
    expect(scheduledDayOn(theme, '2026-09-18')).toBe(1);
    expect(scheduledDayOn(theme, '2026-09-30')).toBe(13);
    expect(scheduledDayOn(theme, '2026-10-17')).toBe(30);
    expect(scheduledDayOn(theme, '2026-10-18')).toBeNull();
  });
});

describe('Dao Pillar themes', () => {
  it('ships Beta Test as a valid thirty-day schedule with four milestone days', () => {
    const schedule = buildRewardSchedule(validateDaoPillarTheme(BETA_TEST_THEME));
    expect(schedule).toHaveLength(30);
    expect(schedule.filter(day => day.milestone).map(day => day.day)).toEqual([7, 14, 21, 28]);
    expect(schedule.filter(day => day.milestone).every(day => day.rewards[0].type === 'qi' && day.rewards[0].amount === 500)).toBe(true);
    expect(schedule.filter(day => !day.milestone).every(day => day.rewards[0].type === 'qi' && day.rewards[0].amount === 100)).toBe(true);
  });

  it('lets a future theme override single days without touching the calendar', () => {
    const theme = validateDaoPillarTheme({
      ...BETA_TEST_THEME,
      id: 'anniversary',
      rewards: { everyDay: [{ type: 'qi', amount: 50 }], milestoneDays: [30], milestone: [{ type: 'qi', amount: 5_000 }], overrides: { 1: [{ type: 'qi', amount: 1 }] } },
    });
    const schedule = buildRewardSchedule(theme);
    expect(schedule[0].rewards).toEqual([{ type: 'qi', amount: 1 }]);
    expect(schedule[29].rewards).toEqual([{ type: 'qi', amount: 5_000 }]);
    expect(schedule[10].rewards).toEqual([{ type: 'qi', amount: 50 }]);
  });

  it('refuses themes it cannot run', () => {
    expect(() => validateDaoPillarTheme(withCalendar(BETA_TEST_THEME, { startsOn: 'soon' }))).toThrow(DaoPillarThemeError);
    expect(() => validateDaoPillarTheme(withCalendar(BETA_TEST_THEME, { timeZone: 'Nowhere/Here' }))).toThrow(/time zone/);
    expect(() => validateDaoPillarTheme({ ...BETA_TEST_THEME, rewards: { ...BETA_TEST_THEME.rewards, milestoneDays: [31] } })).toThrow(/outside the cycle/);
    expect(() => validateDaoPillarTheme({ ...BETA_TEST_THEME, rewards: { ...BETA_TEST_THEME.rewards, milestone: [{ type: 'media-pack', packId: 'p' }] } })).toThrow(/cannot be delivered yet/);
    expect(() => validateDaoPillarTheme({ ...BETA_TEST_THEME, rewards: { ...BETA_TEST_THEME.rewards, everyDay: [{ type: 'qi', amount: 0 }] } })).toThrow(/positive whole qi/);
  });

  it('activates the configured theme and honours calendar overrides from the environment', () => {
    expect(resolveDaoPillarConfig({}, 'development').activeTheme.id).toBe('beta-test');
    const overridden = resolveDaoPillarConfig({ DAO_PILLAR_TIME_ZONE: 'UTC', DAO_PILLAR_STARTS_ON: '2026-12-01' }, 'development').activeTheme;
    expect(overridden.calendar).toEqual({ startsOn: '2026-12-01', days: 30, timeZone: 'UTC' });
    expect(() => resolveDaoPillarConfig({ DAO_PILLAR_ACTIVE_THEME: 'christmas' }, 'development')).toThrow(/No theme/);
    expect(() => resolveDaoPillarConfig({ DAO_PILLAR_STARTS_ON: 'never' }, 'development')).toThrow(DaoPillarThemeError);
  });
});

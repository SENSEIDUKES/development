import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/highlight-engine/shared/manuscript';

/**
 * Setting: when it is and what it is like, where the prose says so (SENSEI,
 * 2026-11-10, in place of the planned Scene tag).
 *
 * The tagger tags the sentence that mentions a time of day, the weather, a
 * season, a time jump or an in-world date (`[[setting: night | snow | heavy
 * snow under a blood moon]]`); novels say it only sometimes, so a chapter that
 * never says it has none. Unlike the other information tags, a setting
 * belongs to its chapter, not the world: it names no one, never reaches a
 * Codex card and never carries into the next chapter. Its time of day,
 * conditions and season come from the small fixed lists below, so a view can
 * draw them (night, falling snow); the novel's own words stay beside them.
 */

/** The attachment kind of a setting. */
export const SETTING_KIND = 'setting';

/** The times of day a setting may name, each with the other words a tag may use for it. */
export const SETTING_TIMES = {
  dawn: ['dawn', 'sunrise', 'daybreak', 'morning'],
  day: ['day', 'daytime', 'noon', 'midday', 'afternoon'],
  dusk: ['dusk', 'sunset', 'evening', 'twilight'],
  night: ['night', 'nighttime', 'midnight'],
} as const satisfies Record<string, readonly string[]>;

/** The conditions a setting may name. */
export const SETTING_CONDITIONS = {
  clear: ['clear', 'sunny', 'fair'],
  cloudy: ['cloudy', 'overcast'],
  rain: ['rain', 'raining', 'rainy', 'drizzle'],
  storm: ['storm', 'stormy', 'thunderstorm', 'lightning'],
  snow: ['snow', 'snowing', 'snowy', 'blizzard'],
  fog: ['fog', 'foggy', 'mist', 'misty'],
  wind: ['wind', 'windy', 'gale'],
} as const satisfies Record<string, readonly string[]>;

/** The seasons a setting may name. */
export const SETTING_SEASONS = {
  spring: ['spring'],
  summer: ['summer'],
  autumn: ['autumn', 'fall'],
  winter: ['winter'],
} as const satisfies Record<string, readonly string[]>;

export type SettingTime = keyof typeof SETTING_TIMES;
export type SettingCondition = keyof typeof SETTING_CONDITIONS;
export type SettingSeason = keyof typeof SETTING_SEASONS;

export interface SettingPayload {
  /** Who placed it: the HARNESS from a tag, or a person. */
  origin: 'harness' | 'manual';
  time?: SettingTime;
  conditions?: SettingCondition;
  season?: SettingSeason;
  /** The novel's own words for the moment: "heavy snow under a blood moon", "three years later". */
  words?: string;
}

/** Where a setting sits: the sentence its tag points at, as an exact span of its paragraph. */
export type SettingAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

/** One setting: a manuscript span attachment on the sentence that says when it is or what it is like. */
export interface SettingAttachment extends ManuscriptAttachment<SettingPayload> {
  kind: typeof SETTING_KIND;
  anchor: SettingAnchor;
}

/** A setting's id: its sentence, and its place among the chapter's settings. */
export const settingId = (blockId: string, start: number, end: number, index: number) => `setting:${blockId}:${start}-${end}:${index}`;

import { splitSentences } from '../../highlight-engine/shared/manuscript';
import { isSettingTagWord, type WordTag } from '../../../narrative/marks';
import {
  SETTING_CONDITIONS, SETTING_KIND, SETTING_SEASONS, SETTING_TIMES, settingId,
  type SettingAttachment, type SettingCondition, type SettingPayload, type SettingSeason, type SettingTime,
} from '../../../narrative/settings';
import { pointedSentence } from './holdings';

/**
 * Settings in the HARNESS: each setting tag read into a setting on the
 * sentence it points at, its parts matched against the fixed lists, and what
 * it is like at any point of a chapter worked out from that chapter's own
 * settings. A setting names no one, so nothing resolves when the chapter
 * commits, and it belongs to its chapter: no Codex card ever carries one, and
 * nothing of it crosses into the next chapter. Never a model.
 */

/** More of the novel's own words than a setting should carry: it says when it is and what it is like, not what happened. */
const SETTING_WORD_LIMIT = 10;

const spellings = <T extends string>(list: Readonly<Record<T, readonly string[]>>) =>
  new Map((Object.entries(list) as Array<[T, readonly string[]]>).flatMap(([value, words]) => words.map(word => [word, value] as const)));
const TIMES = spellings<SettingTime>(SETTING_TIMES);
const CONDITIONS = spellings<SettingCondition>(SETTING_CONDITIONS);
const SEASONS = spellings<SettingSeason>(SETTING_SEASONS);
const spellingOf = (part: string) => part.trim().toLowerCase().replace(/\s+/g, ' ');

export type ReadSettingTag =
  | { ok: true; setting: Omit<SettingPayload, 'origin'> }
  | { ok: false; problem: string };

/**
 * One word tag read as a setting. Its parts may come in any order: each one
 * that is a time of day, a condition or a season from the fixed lists fills
 * that slot, and every other part is the novel's own words.
 */
export function readSettingTag(tag: WordTag): ReadSettingTag {
  if (!isSettingTagWord(tag.word)) return { ok: false, problem: `a ${tag.word} tag is not a setting` };
  const setting: Omit<SettingPayload, 'origin'> = {};
  const words: string[] = [];
  for (const part of tag.parts) {
    const spelling = spellingOf(part);
    const time = TIMES.get(spelling);
    const conditions = CONDITIONS.get(spelling);
    const season = SEASONS.get(spelling);
    // A slot already filled leaves the second word as the novel's own ("snow | wind" keeps wind in words).
    if (time && !setting.time) setting.time = time;
    else if (conditions && !setting.conditions) setting.conditions = conditions;
    else if (season && !setting.season) setting.season = season;
    else if (part.trim()) words.push(part.trim());
  }
  const own = words.join('; ');
  if (own.split(/\s+/).length > SETTING_WORD_LIMIT) return { ok: false, problem: `a setting tag told what happened instead of when it is or what it is like, so it was set aside` };
  if (own) setting.words = own;
  if (!Object.keys(setting).length) return { ok: false, problem: 'a setting tag said nothing about when it is or what it is like' };
  return { ok: true, setting };
}

export interface SettingPlacement {
  /** Each setting on its sentence. */
  settings: SettingAttachment[];
  /** Plain reasons for every tag that could not become a setting. */
  problems: string[];
}

/** Places one setting for every readable setting tag, on the sentence it points at. */
export function placeSettings({ paragraphs, locale }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; wordTags: readonly WordTag[] }>;
  locale?: string;
}): SettingPlacement {
  const settings: SettingAttachment[] = [];
  const problems: string[] = [];
  for (const { blockId, text, wordTags } of paragraphs) {
    const tags = wordTags.filter(tag => isSettingTagWord(tag.word));
    if (!tags.length) continue;
    const sentences = splitSentences(text, locale);
    for (const tag of tags) {
      const read = readSettingTag(tag);
      if (!read.ok) { problems.push(read.problem); continue; }
      const sentence = pointedSentence(sentences, tag.offset);
      if (!sentence) { problems.push(`a setting tag (${tag.parts.join(' | ')}) pointed at no sentence`); continue; }
      settings.push({
        id: settingId(blockId, sentence.start, sentence.end, settings.length),
        kind: SETTING_KIND,
        anchor: { level: 'span', blockId, startOffset: sentence.start, endOffset: sentence.end, selectedText: text.slice(sentence.start, sentence.end) },
        payload: { origin: 'harness', ...read.setting },
      });
    }
  }
  return { settings, problems };
}

/** What it is like at one point of a chapter: what its settings so far add up to. */
export type CurrentSetting = Omit<SettingPayload, 'origin'>;

const paragraphIndex = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);

/**
 * What it is like at a point of a chapter (its paragraph and offset, or the
 * chapter's end when none is given), from that chapter's settings alone. The
 * time of day, the conditions and the season each hold until a later setting
 * names that part again; the novel's own words belong to the latest setting
 * only. Nothing comes from an earlier chapter. Undefined when no setting
 * stands before that point.
 */
export function settingAt(
  chapter: { settings?: readonly SettingAttachment[] },
  at?: { blockId: string; offset: number },
): CurrentSetting | undefined {
  const before = (record: SettingAttachment) => !at
    || paragraphIndex(record.anchor.blockId) < paragraphIndex(at.blockId)
    || (record.anchor.blockId === at.blockId && record.anchor.startOffset <= at.offset);
  const ordered = [...chapter.settings ?? []].filter(record => record.kind === SETTING_KIND && before(record))
    .sort((left, right) => paragraphIndex(left.anchor.blockId) - paragraphIndex(right.anchor.blockId) || left.anchor.startOffset - right.anchor.startOffset);
  if (!ordered.length) return undefined;
  const now: CurrentSetting = {};
  for (const { payload } of ordered) {
    if (payload.time) now.time = payload.time;
    if (payload.conditions) now.conditions = payload.conditions;
    if (payload.season) now.season = payload.season;
  }
  const words = ordered.at(-1)!.payload.words;
  return { ...now, ...(words ? { words } : {}) };
}

/** A setting as one line: "night · snow · heavy snow under a blood moon". */
export const settingLine = (setting: CurrentSetting | undefined) =>
  setting ? [setting.time, setting.conditions, setting.season, setting.words].filter(Boolean).join(' · ') : '';

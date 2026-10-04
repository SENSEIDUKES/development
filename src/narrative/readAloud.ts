import { splitSentences } from '../components/text-highlight-engine/shared/manuscript';
import { isSenLanguageCode, normalizeSenLanguageCode, senSpeechLanguageTags, type SenLanguageCode } from '../lib/language';
import type { ReaderPreferenceStorage } from './readerRuntime';
import { chapterTitleText } from './chapterTitle';
import { findSpokenLines, isSpeakerOnText, narratedSpeaker, type MainCharacterNames, type SpeakerAttachment } from './speech';
import { wordRanges } from './words';

/**
 * Read Aloud: a chapter read by three voices, sentence by sentence.
 *
 * The Narrator reads the prose, the Protagonist voice the main character's
 * spoken lines, and the Side voice everyone else's. A chapter becomes a script
 * of short lines, each inside one sentence of one paragraph, so a player can
 * light the sentence being spoken and a voice can change mid-sentence
 * (`“Run!” Lin Feng shouted.`). The script is built at read time from the
 * chapter's own paragraphs and speaker records; nothing here is saved with the
 * story.
 */

export type ReadAloudRole = 'narrator' | 'protagonist' | 'side';
export const READ_ALOUD_ROLES: readonly ReadAloudRole[] = ['narrator', 'protagonist', 'side'];

/**
 * The voice for a spoken line nobody was named for and whose narration names no
 * one else (“…,” he said.), including every quote in a chapter written
 * before speakers existed: the main character's, as production read it.
 */
export const UNTAGGED_SPEECH_ROLE: ReadAloudRole = 'protagonist';

/** Bumped whenever the same chapter would produce different lines (stored audio keys on them later). */
export const READ_ALOUD_SCRIPT_VERSION = 1;

/**
 * One line's limits, so no browser voice cuts it off: Chrome's network voices
 * stop near 15 seconds. The estimate is the prototype's measured default
 * voice (about 162 words a minute), and four characters a second for scripts
 * written without spaces.
 */
export const READ_ALOUD_LIMITS = { maxCharacters: 180, maxEstimatedMs: 8_000, wordsPerSecond: 2.7, nonSpacedPerSecond: 4 } as const;

export interface ReadAloudRange { start: number; end: number }

export interface ReadAloudLine {
  /** Stable for one chapter text and script version: `{blockId}:{start}-{end}`, or `title`. */
  key: string;
  /** The paragraph read; absent for the chapter title. */
  blockId?: string;
  /**
   * The sentence this line belongs to, the part a Reader lights: offsets into
   * the paragraph, or for the title line into the title the Reader shows.
   */
  sentence: ReadAloudRange;
  /**
   * The line's own place in the same text as `sentence`. For a paragraph line
   * it slices `text` back out of the paragraph; the title line covers the
   * shown title, while `text` is what is spoken for it ("Chapter 3. The Gate."
   * in English), so these offsets never index into `text`.
   */
  start: number;
  end: number;
  /** What is spoken. */
  text: string;
  role: ReadAloudRole;
  /** Who speaks it, when a speaker record names them. */
  speaker?: string;
}

export interface ReadAloudScript {
  version: number;
  lines: readonly ReadAloudLine[];
}

export interface ReadAloudChapter {
  chapterNumber: number;
  title?: string;
  /** The paragraphs in reading order, under the ids the Reader renders them with. */
  paragraphs: ReadonlyArray<{ id: string; text: string }>;
  speakers?: readonly SpeakerAttachment[];
  /** The story's language (a SEN language code): sentence rules, and whether "Chapter N." is spoken. */
  language?: string;
  /** Who the main character is, for speech nobody tagged: its narration says who speaks it. */
  mainCharacter?: MainCharacterNames;
}

const SPEAKABLE = /[\p{L}\p{N}]/u;
const NON_SPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/gu;

/** Whether any letter or number in any script would be heard. */
export const isSpeakable = (text: string) => SPEAKABLE.test(text);

/** About how long a text takes to speak at 1×, in milliseconds. */
export function estimateSpeechMs(text: string): number {
  const nonSpaced = text.match(NON_SPACED)?.length ?? 0;
  const words = text.replace(NON_SPACED, ' ').split(/\s+/u).filter(isSpeakable).length;
  return (words / READ_ALOUD_LIMITS.wordsPerSecond + nonSpaced / READ_ALOUD_LIMITS.nonSpacedPerSecond) * 1000;
}

const fits = (text: string, start: number, end: number) =>
  end - start <= READ_ALOUD_LIMITS.maxCharacters && estimateSpeechMs(text.slice(start, end)) <= READ_ALOUD_LIMITS.maxEstimatedMs;

const trimRange = (text: string, start: number, end: number): ReadAloudRange | undefined => {
  while (start < end && /\s/u.test(text[start])) start += 1;
  while (end > start && /\s/u.test(text[end - 1])) end -= 1;
  return start < end ? { start, end } : undefined;
};

let graphemeSegmenter: Intl.Segmenter | null | undefined;
const graphemeStarts = (text: string): number[] => {
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  }
  if (graphemeSegmenter) return Array.from(graphemeSegmenter.segment(text), part => part.index);
  const starts: number[] = [];
  let index = 0;
  for (const character of text) { starts.push(index); index += character.length; }
  return starts;
};

type CutLevel = 'clause' | 'space' | 'word' | 'character';
const CUT_LEVELS: readonly CutLevel[] = ['clause', 'space', 'word', 'character'];

/** Where a range may be cut at one level, as offsets strictly inside it. */
function cutPoints(text: string, start: number, end: number, level: CutLevel, locale: string): number[] {
  const slice = text.slice(start, end);
  const points = new Set<number>();
  if (level === 'clause') for (const match of slice.matchAll(/[,;:、，；：—–]+/gu)) points.add(match.index + match[0].length);
  else if (level === 'space') for (const match of slice.matchAll(/\s+/gu)) points.add(match.index + match[0].length);
  else if (level === 'word') for (const word of wordRanges(slice, locale)) { points.add(word.start); points.add(word.end); }
  else for (const index of graphemeStarts(slice)) points.add(index);
  return [...points].filter(point => point > 0 && point < slice.length).sort((left, right) => left - right).map(point => start + point);
}

/**
 * Cuts one part of a sentence into lines within the limits: at clause
 * punctuation first, then spaces, then between words (scripts without
 * spaces), then between characters. Every range is trimmed.
 */
export function boundSpeechRanges(text: string, start: number, end: number, locale = 'en', level = 0): ReadAloudRange[] {
  const trimmed = trimRange(text, start, end);
  if (!trimmed) return [];
  if (fits(text, trimmed.start, trimmed.end) || level >= CUT_LEVELS.length) return [trimmed];
  const cuts = cutPoints(text, trimmed.start, trimmed.end, CUT_LEVELS[level], locale);
  if (!cuts.length) return boundSpeechRanges(text, trimmed.start, trimmed.end, locale, level + 1);
  const ranges: ReadAloudRange[] = [];
  const bounds = [...cuts, trimmed.end];
  let pieceStart = trimmed.start;
  let pieceEnd = trimmed.start;
  const flush = () => {
    if (pieceEnd > pieceStart) ranges.push(...boundSpeechRanges(text, pieceStart, pieceEnd, locale, level + 1));
    pieceStart = pieceEnd;
  };
  for (const bound of bounds) {
    if (fits(text, pieceStart, bound)) { pieceEnd = bound; continue; }
    flush();
    if (fits(text, pieceStart, bound)) { pieceEnd = bound; continue; }
    // One piece between two cuts is still too long: cut it finer.
    ranges.push(...boundSpeechRanges(text, pieceStart, bound, locale, level + 1));
    pieceStart = bound;
    pieceEnd = bound;
  }
  flush();
  return ranges;
}

interface SpokenPart extends ReadAloudRange { role: ReadAloudRole; speaker?: string }

/**
 * A paragraph's spoken parts: its speaker records first, then any quoted line
 * nobody was named for, voiced by who its narration names (`narratedSpeaker`);
 * a line whose own narration names no one takes the speaker another untagged
 * line of the paragraph was given, one speaker to a paragraph as production
 * read it, and otherwise the main character's voice.
 */
function spokenParts(blockId: string, text: string, speakers: readonly SpeakerAttachment[], cast: MainCharacterNames): SpokenPart[] {
  const named: SpokenPart[] = [];
  const records = speakers
    .filter(record => isSpeakerOnText(record, blockId, text))
    .sort((left, right) => left.anchor.startOffset - right.anchor.startOffset);
  for (const record of records) {
    const previous = named.at(-1);
    if (previous && record.anchor.startOffset < previous.end) continue;
    named.push({
      start: record.anchor.startOffset, end: record.anchor.endOffset,
      role: record.payload.protagonist ? 'protagonist' : 'side', speaker: record.payload.speaker.trim(),
    });
  }
  const lines = findSpokenLines(text);
  const open = lines.flatMap((line, index) => (named.some(part => part.start < line.end && part.end > line.start) ? [] : [{ line, index }]));
  const told = open.map(({ index }) => narratedSpeaker(text, lines, index, cast));
  const paragraphSpeaker = told.find(Boolean);
  const untagged = open.map(({ line }, position): SpokenPart => {
    const who = told[position] ?? paragraphSpeaker;
    if (who === 'other') return { ...line, role: 'side' };
    return { ...line, role: who === 'main' ? 'protagonist' : UNTAGGED_SPEECH_ROLE, ...(who === 'main' && cast.names[0] ? { speaker: cast.names[0] } : {}) };
  });
  return [...named, ...untagged].sort((left, right) => left.start - right.start);
}

/** One sentence cut into narrated and spoken parts, in order. */
function sentenceParts(sentence: ReadAloudRange, spoken: readonly SpokenPart[]): SpokenPart[] {
  const parts: SpokenPart[] = [];
  let cursor = sentence.start;
  for (const part of spoken) {
    if (part.end <= sentence.start || part.start >= sentence.end) continue;
    const start = Math.max(part.start, sentence.start);
    const end = Math.min(part.end, sentence.end);
    if (start > cursor) parts.push({ start: cursor, end: start, role: 'narrator' });
    parts.push({ ...part, start, end });
    cursor = end;
  }
  if (cursor < sentence.end) parts.push({ start: cursor, end: sentence.end, role: 'narrator' });
  return parts;
}

/**
 * The chapter as lines to speak, in reading order: its title, then every
 * paragraph sentence by sentence. Spoken lines are found across the whole
 * paragraph before it is cut into sentences, so a quote that spans two
 * sentences keeps its voice.
 */
export function buildReadAloudScript(chapter: ReadAloudChapter): ReadAloudScript {
  const language = normalizeSenLanguageCode(chapter.language);
  const lines: ReadAloudLine[] = [];
  // "Chapter 3" is said once: a title that repeats the number ("Chapter 3: The Gate", or the bare fallback) is read without it.
  const written = chapter.title?.trim() ?? '';
  const named = chapterTitleText(written);
  const title = named || written;
  const heading = language === 'en' ? `Chapter ${chapter.chapterNumber}.${named ? ` ${named}` : ''}` : title;
  if (isSpeakable(heading)) {
    lines.push({ key: 'title', sentence: { start: 0, end: title.length }, start: 0, end: title.length, text: heading, role: 'narrator' });
  }
  // Everyone the writer tagged is a known name too, so their untagged lines are recognised as theirs.
  const tagged = (chapter.speakers ?? []).filter(record => !record.payload?.protagonist).map(record => record.payload?.speaker ?? '');
  const cast: MainCharacterNames = {
    names: chapter.mainCharacter?.names ?? [],
    others: [...new Set([...(chapter.mainCharacter?.others ?? []), ...tagged].map(name => name.trim()).filter(Boolean))],
  };
  for (const { id, text } of chapter.paragraphs) {
    if (!text.trim()) continue;
    const spoken = spokenParts(id, text, chapter.speakers ?? [], cast);
    for (const sentence of splitSentences(text, language)) {
      for (const part of sentenceParts(sentence, spoken)) {
        for (const range of boundSpeechRanges(text, part.start, part.end, language)) {
          const words = text.slice(range.start, range.end);
          if (!isSpeakable(words)) continue;
          lines.push({
            key: `${id}:${range.start}-${range.end}`, blockId: id, sentence: { start: sentence.start, end: sentence.end },
            start: range.start, end: range.end, text: words, role: part.role, ...(part.speaker ? { speaker: part.speaker } : {}),
          });
        }
      }
    }
  }
  return { version: READ_ALOUD_SCRIPT_VERSION, lines };
}

/** The sentence a line belongs to, as one comparable key. */
export const readAloudSentenceKey = (line: ReadAloudLine) => `${line.blockId ?? 'title'}:${line.sentence.start}`;

// ─── Voices ─────────────────────────────────────────────────────────────────

/** A device voice, as the browser lists it. */
export interface ReadAloudVoice {
  voiceURI: string;
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

export type ReadAloudVoiceChoice = Partial<Record<ReadAloudRole, ReadAloudVoice>>;

/**
 * A host's preferred voices, by SEN language and role, best first. Each entry
 * is a voice name matched as whole words ("Daniel" matches "Daniel (Enhanced)").
 * SEN itself prefers nothing: it only keeps the three voices distinct.
 */
export type ReadAloudVoicePicks = Partial<Record<SenLanguageCode, Partial<Record<ReadAloudRole, readonly string[]>>>>;

const normalizeTag = (tag: string) => tag.replace(/_/g, '-').toLowerCase();

/** The voices that can read a language, best language match first, then in the device's order. */
export function voicesForLanguage(voices: readonly ReadAloudVoice[], language: string): ReadAloudVoice[] {
  const tags = senSpeechLanguageTags(normalizeSenLanguageCode(language)).map(normalizeTag);
  return voices
    .map((voice, index) => {
      const lang = normalizeTag(voice.lang);
      return { voice, index, rank: tags.findIndex(tag => lang === tag || lang.startsWith(`${tag}-`)) };
    })
    .filter(entry => entry.rank >= 0)
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(entry => entry.voice);
}

/** The language tag an utterance carries when no voice was chosen. */
export const speechLanguageTag = (language: string) => senSpeechLanguageTags(normalizeSenLanguageCode(language))[0];

/** Apple's novelty, legacy and Eloquence voices: listed, but never chosen automatically. */
const NOVELTY_VOICES = new Set([
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ', 'superstar', 'trinoids',
  'whisper', 'wobble', 'zarvox', 'fred', 'junior', 'kathy', 'ralph', 'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley',
]);
export const isNoveltyVoice = (voice: ReadAloudVoice) =>
  /com\.apple\.eloquence/i.test(voice.voiceURI) || NOVELTY_VOICES.has(voice.name.replace(/\s*\(.*$/u, '').trim().toLowerCase());

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameMatches = (name: string, pick: string) =>
  new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(pick.trim())}(?:$|[^\\p{L}\\p{N}])`, 'iu').test(name);
const quality = (voice: ReadAloudVoice) => (/premium/i.test(voice.name) ? 2 : /enhanced|natural|neural/i.test(voice.name) ? 1 : 0);

/** A voice on the device rather than fetched online for every line: it starts at once. */
export const isDeviceVoice = (voice: ReadAloudVoice) => voice.localService !== false;

/**
 * The voices each role reads with by default, for one language, chosen the
 * way production chose them: the host's picks first, then the device's default
 * voice for the narrator, then the first voice not yet taken. A voice on the
 * device always comes before an online one, which pauses to fetch every line,
 * and a pick's standard voice before its Enhanced or Premium one, which
 * reloads its speech data whenever the voice changes. Roles in `taken` keep
 * their voice. With no voice for the language, a role is left empty and
 * speech carries only the language.
 */
export function chooseDefaultVoices(
  voices: readonly ReadAloudVoice[],
  language: string,
  picks?: ReadAloudVoicePicks,
  taken: ReadAloudVoiceChoice = {},
): ReadAloudVoiceChoice {
  const code = normalizeSenLanguageCode(language);
  const pool = voicesForLanguage(voices, code).filter(voice => !isNoveltyVoice(voice));
  const ordered = [...pool.filter(isDeviceVoice), ...pool.filter(voice => !isDeviceVoice(voice))];
  const choice: ReadAloudVoiceChoice = {};
  for (const role of READ_ALOUD_ROLES) if (taken[role]) choice[role] = taken[role];
  const free = (voice: ReadAloudVoice) => !READ_ALOUD_ROLES.some(role => choice[role]?.voiceURI === voice.voiceURI);
  const picked = (role: ReadAloudRole) => {
    for (const deviceOnly of [true, false]) {
      for (const name of picks?.[code]?.[role] ?? []) {
        const matches = ordered.filter(voice => free(voice) && (!deviceOnly || isDeviceVoice(voice)) && nameMatches(voice.name, name));
        if (matches.length) return [...matches].sort((left, right) => quality(left) - quality(right))[0];
      }
    }
    return undefined;
  };
  for (const role of READ_ALOUD_ROLES) {
    if (choice[role]) continue;
    const voice = picked(role)
      ?? (role === 'narrator' ? ordered.find(candidate => candidate.default && free(candidate) && isDeviceVoice(candidate)) : undefined)
      ?? ordered.find(free)
      ?? (role === 'side' ? choice.protagonist : undefined)
      ?? choice.narrator;
    if (voice) choice[role] = voice;
  }
  return choice;
}

// ─── Preferences ────────────────────────────────────────────────────────────

/** A chosen voice as saved: Safari's voice URIs change when an Enhanced voice is downloaded, so the name and language travel too. */
export interface StoredReadAloudVoice { uri: string; name: string; lang: string }

/** The reader's narration choices on this device: never synced to an account. */
export interface ReadAloudPreferences {
  rate: number;
  voices: Partial<Record<SenLanguageCode, Partial<Record<ReadAloudRole, StoredReadAloudVoice>>>>;
}

export const READ_ALOUD_PREFERENCE_KEY = 'read-aloud';
/** Slower than 0.75× would stretch a line past what network voices finish. */
export const READ_ALOUD_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export const DEFAULT_READ_ALOUD_PREFERENCES: ReadAloudPreferences = { rate: 1, voices: {} };

const clampRate = (rate: unknown) =>
  typeof rate === 'number' && Number.isFinite(rate) ? Math.min(2, Math.max(0.75, rate)) : DEFAULT_READ_ALOUD_PREFERENCES.rate;

const storedVoice = (value: unknown): StoredReadAloudVoice | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const { uri, name, lang } = value as Record<string, unknown>;
  const text = (field: unknown) => (typeof field === 'string' && field.length <= 300 ? field : undefined);
  return text(uri) && text(name) !== undefined && text(lang) !== undefined ? { uri: text(uri)!, name: text(name)!, lang: text(lang)! } : undefined;
};

/** Reads saved preferences; anything malformed falls back to the defaults. */
export function parseReadAloudPreferences(raw: string | null | undefined): ReadAloudPreferences {
  if (!raw) return DEFAULT_READ_ALOUD_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; rate?: unknown; voices?: unknown };
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 1) return DEFAULT_READ_ALOUD_PREFERENCES;
    const voices: ReadAloudPreferences['voices'] = {};
    if (parsed.voices && typeof parsed.voices === 'object') {
      for (const [language, roles] of Object.entries(parsed.voices as Record<string, unknown>)) {
        if (!isSenLanguageCode(language) || !roles || typeof roles !== 'object') continue;
        const kept: Partial<Record<ReadAloudRole, StoredReadAloudVoice>> = {};
        for (const role of READ_ALOUD_ROLES) {
          const voice = storedVoice((roles as Record<string, unknown>)[role]);
          if (voice) kept[role] = voice;
        }
        if (Object.keys(kept).length) voices[language] = kept;
      }
    }
    return { rate: clampRate(parsed.rate), voices };
  } catch {
    return DEFAULT_READ_ALOUD_PREFERENCES;
  }
}

export const serializeReadAloudPreferences = (preferences: ReadAloudPreferences) =>
  JSON.stringify({ v: 1, rate: clampRate(preferences.rate), voices: preferences.voices });

/** Saved preferences from the host's storage; storage that fails reads as the defaults. */
export function readReadAloudPreferences(storage?: ReaderPreferenceStorage): ReadAloudPreferences {
  try {
    return parseReadAloudPreferences(storage?.read(READ_ALOUD_PREFERENCE_KEY));
  } catch {
    return DEFAULT_READ_ALOUD_PREFERENCES;
  }
}

/** Saves preferences; preferences are advisory, so a failed write changes nothing else. */
export function writeReadAloudPreferences(storage: ReaderPreferenceStorage | undefined, preferences: ReadAloudPreferences): void {
  try {
    storage?.write(READ_ALOUD_PREFERENCE_KEY, serializeReadAloudPreferences(preferences));
  } catch {
    // Advisory only.
  }
}

export const toStoredReadAloudVoice = (voice: ReadAloudVoice): StoredReadAloudVoice => ({ uri: voice.voiceURI, name: voice.name, lang: voice.lang });

/** A saved voice on this device: by its URI, else by its name and language. */
export function findStoredVoice(voices: readonly ReadAloudVoice[], stored: StoredReadAloudVoice): ReadAloudVoice | undefined {
  return voices.find(voice => voice.voiceURI === stored.uri)
    ?? voices.find(voice => voice.name === stored.name && normalizeTag(voice.lang) === normalizeTag(stored.lang));
}

/** The voice each role reads with for one language: the reader's saved choices, then the defaults. */
export function resolveReadAloudVoices(
  voices: readonly ReadAloudVoice[],
  language: string,
  preferences: ReadAloudPreferences,
  picks?: ReadAloudVoicePicks,
): ReadAloudVoiceChoice {
  const code = normalizeSenLanguageCode(language);
  const saved = preferences.voices[code] ?? {};
  const taken: ReadAloudVoiceChoice = {};
  for (const role of READ_ALOUD_ROLES) {
    const voice = saved[role] && findStoredVoice(voices, saved[role]!);
    if (voice) taken[role] = voice;
  }
  return chooseDefaultVoices(voices, code, picks, taken);
}

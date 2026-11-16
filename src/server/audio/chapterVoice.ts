/**
 * Chapter voices: server only.
 *
 * A chapter's spoken lines are made with a paid voice, one line a call; its
 * narration never is (NOVEL_EXPANDED.md, How we build). This module does the
 * two server parts: choosing a cast voice for a character from what its Codex
 * card says, and turning one spoken line into audio in that voice.
 *
 * The provider key, the provider voice ID and the model stay here. The
 * browser sends the card's words or a line and a provider-neutral voice key.
 */

import { getTtsAvailable, loadVoiceCatalog, resolveVoiceKeyToProviderId, type PublicVoiceMeta } from './voiceCatalog';
import {
  ElevenLabsVoiceSpeechProvider,
  loadCodexVoiceConfig,
  type CodexVoiceEnvironment,
  type VoiceSpeechProvider,
} from './codexVoiceQuote';

/** The longest spoken line accepted: Read Aloud never cuts a line longer than this. */
export const CHAPTER_VOICE_LINE_LIMIT = 400;
/** The most characters one cast request may carry. */
export const CHAPTER_VOICE_CAST_LIMIT = 60;
const CARD_TEXT_LIMIT = 600;

/** What a Codex character card says that a voice can be chosen from. */
export interface ChapterVoiceCharacter {
  /** The card's key; the answer names each voice by it. */
  key: string;
  /** The character's name: a title in it ("Sect Master") says what they are. */
  name?: string;
  gender?: string;
  age?: string;
  /** How the card says the character sounds. */
  voice?: string;
  bio?: string;
  mainCharacter?: boolean;
}

export interface ChapterVoiceChoice {
  /** Provider-neutral cast voice key. */
  voiceKey: string;
  /** The cast voice's plain name, e.g. "Arrogant Young Master". */
  name: string;
}

const text = (value: unknown, limit = CARD_TEXT_LIMIT): string | undefined =>
  (typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : undefined);

const cardGender = (value: string | undefined): 'female' | 'male' | undefined => {
  if (!value) return undefined;
  if (/\b(?:female|woman|girl|lady|she|her)\b/iu.test(value)) return 'female';
  if (/\b(?:male|man|boy|he|him)\b/iu.test(value)) return 'male';
  return undefined;
};

/** The years a minor figure's age word stands for: all the record says of them is young, middle-aged or old. */
const AGE_WORD_YEARS: ReadonlyArray<[RegExp, number]> = [[/\b(?:young|boy|girl|child)\b/iu, 20], [/\bmiddle[- ]aged?\b/iu, 45], [/\b(?:old|elder|elderly)\b/iu, 70]];
/** What a name itself says ("the veiled woman"): only a plain word, never a pronoun, which is a surname in some stories (He, Her). */
const nameGender = (name: string | undefined): 'female' | 'male' | undefined => {
  if (!name) return undefined;
  if (/\b(?:woman|girl|lady)\b/iu.test(name)) return 'female';
  if (/\b(?:man|boy)\b/iu.test(name)) return 'male';
  return undefined;
};

const cardAge = (value: string | undefined): number | undefined => {
  const years = value?.match(/\d{1,4}/u)?.[0];
  if (years !== undefined) return Number(years);
  return value ? AGE_WORD_YEARS.find(([word]) => word.test(value))?.[1] : undefined;
};

const STOP_WORDS = new Set(['with', 'that', 'this', 'from', 'their', 'whose', 'voice', 'tone', 'delivery', 'character', 'young', 'into', 'always', 'never', 'full']);
/** Words that say the same thing about a voice, read as one. */
const SAME_WORD: Readonly<Record<string, string>> = { wisdom: 'wise', elder: 'old', elderly: 'old', aged: 'old', ancient: 'old' };
const words = (value: string): Set<string> =>
  new Set((value.toLowerCase().match(/[a-z]{3,}/gu) ?? []).map(word => SAME_WORD[word] ?? word).filter(word => word.length > 3 || word === 'old').filter(word => !STOP_WORDS.has(word)));

/** No cast voice is older than this: a cultivator of 142 is heard as an elder. */
const OLDEST_VOICE_AGE = 80;

/** How well a cast voice suits a character: the same sex first, then the nearest age, then shared words. */
const voiceScore = (character: ChapterVoiceCharacter, voice: PublicVoiceMeta, taken: ReadonlySet<string>): number => {
  let score = 0;
  // A minor figure the record says little of is read from the name they go by ("the veiled woman", "elder").
  const gender = cardGender(character.gender) ?? nameGender(character.name);
  if (gender) score += voice.gender === gender ? 1_000 : voice.gender === 'unisex' ? 100 : 0;
  const written = cardAge(character.age) ?? cardAge(character.name?.replace(/\d+/gu, ''));
  if (written !== undefined) {
    const age = Math.min(written, OLDEST_VOICE_AGE);
    if (!voice.ageYears) score -= 60;
    else {
      const [youngest, oldest] = voice.ageYears;
      score += age >= youngest && age <= oldest ? 40 : -2 * Math.min(Math.abs(age - youngest), Math.abs(age - oldest));
    }
  }
  const said = words(`${character.name ?? ''} ${character.voice ?? ''} ${character.bio ?? ''}`);
  const voiceWords = words(`${voice.archetype} ${voice.compatibleRoles.join(' ')} ${voice.description}`);
  let shared = 0;
  for (const word of said) if (voiceWords.has(word)) shared += 1;
  score += Math.min(shared, 6) * 8;
  if (character.mainCharacter && (voiceWords.has('protagonist') || voiceWords.has('hero') || voiceWords.has('heroine'))) score += 20;
  // Two characters of one story share a voice only when nothing else suits.
  if (taken.has(voice.internalKey)) score -= 80;
  return score;
};

/**
 * Chooses a cast voice for each character, the main character first. A voice
 * already `kept` for a character is never changed. Voices made for one fixed
 * being (a dragon, a machine, the narrator) are left out.
 */
export function castChapterVoices(
  characters: readonly ChapterVoiceCharacter[],
  kept: Readonly<Record<string, string>> = {},
  voices: readonly PublicVoiceMeta[] = loadVoiceCatalog().publicView,
): Record<string, ChapterVoiceChoice> {
  const available = getTtsAvailable([...voices])
    .filter(voice => voice.classification === 'flexible')
    .sort((left, right) => left.internalKey.localeCompare(right.internalKey));
  const cast: Record<string, ChapterVoiceChoice> = {};
  // Every voice the story's cast already uses is taken, whether or not its character is in this request.
  const taken = new Set(Object.values(kept).filter(voiceKey => available.some(voice => voice.internalKey === voiceKey)));
  const ordered = [...characters].sort((left, right) => Number(Boolean(right.mainCharacter)) - Number(Boolean(left.mainCharacter)));
  for (const character of ordered) {
    const keptVoice = available.find(voice => voice.internalKey === kept[character.key]);
    if (!keptVoice) continue;
    cast[character.key] = { voiceKey: keptVoice.internalKey, name: keptVoice.archetype };
    taken.add(keptVoice.internalKey);
  }
  for (const character of ordered) {
    if (cast[character.key] || !available.length) continue;
    let best = available[0];
    let bestScore = voiceScore(character, best, taken);
    for (const voice of available.slice(1)) {
      const score = voiceScore(character, voice, taken);
      if (score > bestScore) { best = voice; bestScore = score; }
    }
    cast[character.key] = { voiceKey: best.internalKey, name: best.archetype };
    taken.add(best.internalKey);
  }
  return cast;
}

/** Reads the characters of a cast request; anything unusable is refused with a reason. */
export function parseChapterVoiceCharacters(value: unknown): ChapterVoiceCharacter[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Name at least one character to cast.');
  if (value.length > CHAPTER_VOICE_CAST_LIMIT) throw new Error(`Cast at most ${CHAPTER_VOICE_CAST_LIMIT} characters at once.`);
  return value.map(entry => {
    const record = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
    const key = text(record.key, 200);
    if (!key) throw new Error('Every character to cast needs its card key.');
    return {
      key, name: text(record.name, 200), gender: text(record.gender, 80), age: text(record.age, 80), voice: text(record.voice), bio: text(record.bio),
      mainCharacter: record.mainCharacter === true,
    };
  });
}

export interface ChapterVoiceService {
  /** The Model Router id of the voice model lines are made with. */
  model: string;
  /** One spoken line in a cast voice, as audio bytes. Rejects when the voice is not in the cast. */
  speak(line: { text: string; voiceKey: string }): Promise<Uint8Array>;
}

export class UnknownChapterVoiceError extends Error {}

/** The chapter voice service, or nothing on a server without the voice provider's key. */
export function createChapterVoiceService(
  environment: CodexVoiceEnvironment,
  dependencies: { provider?: VoiceSpeechProvider; fetch?: typeof fetch } = {},
): ChapterVoiceService | undefined {
  const config = loadCodexVoiceConfig(environment);
  if (!config) return undefined;
  const provider = dependencies.provider ?? new ElevenLabsVoiceSpeechProvider(
    config.elevenLabsApiKey, config.elevenLabsModel, config.elevenLabsTimeoutMs, dependencies.fetch,
  );
  return {
    model: config.elevenLabsModel,
    speak({ text: line, voiceKey }) {
      const providerVoiceId = resolveVoiceKeyToProviderId(voiceKey);
      if (!providerVoiceId) return Promise.reject(new UnknownChapterVoiceError('That voice is not in the cast.'));
      return provider.synthesize({ providerVoiceId, text: line });
    },
  };
}

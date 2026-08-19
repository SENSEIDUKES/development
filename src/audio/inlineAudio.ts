import {
  getByUrl,
  loadLibraryCues,
  type LibraryCue,
  type LibraryCueCategory,
  type LibraryCuesLoadResult,
} from './libraryCues';

export const INLINE_AUDIO_CUE_CATEGORIES = [
  'beasts',
  'weapons',
  'artifacts',
  'locations',
  'factions',
] as const satisfies readonly LibraryCueCategory[];

export type InlineAudioCueCategory = (typeof INLINE_AUDIO_CUE_CATEGORIES)[number];

/** A curated one-shot already published in the client-safe Library Cue catalog. */
export interface InlineAudioSoundAction {
  type: 'sound';
  /** Exact public URL from the Library Cue catalog; arbitrary remote audio is rejected. */
  cueUrl: string;
}

/**
 * Provider-neutral future quote request. The browser never receives a
 * provider voice ID; a later server synthesis boundary will resolve voiceKey.
 */
export interface InlineAudioVoiceAction {
  type: 'voice';
  voiceKey: string;
  quoteText: string;
}

export type InlineAudioAction = InlineAudioSoundAction | InlineAudioVoiceAction;

/** Workshop/consumer instruction for one literal word or short phrase in prose. */
export interface InlineAudioHighlight {
  id: string;
  phrase: string;
  action: InlineAudioAction;
  /** Entity/category color token when the caller has one. */
  accentColor?: string;
}

export type InlineSoundCueResolution =
  | { ok: true; cue: LibraryCue & { category: InlineAudioCueCategory } }
  | {
      ok: false;
      reason: 'not-found' | 'reserved-category';
      message: string;
    };

const DEFAULT_LIBRARY_CUES = loadLibraryCues();
const INLINE_CATEGORY_SET = new Set<LibraryCueCategory>(INLINE_AUDIO_CUE_CATEGORIES);

/**
 * Resolve through the Phase 1 catalog instead of treating an action URL as a
 * free-form playback source. Atmosphere and System cues keep their existing
 * owners and are intentionally unavailable to inline prose.
 */
export function resolveInlineSoundAction(
  action: InlineAudioSoundAction,
  loaded: LibraryCuesLoadResult = DEFAULT_LIBRARY_CUES,
): InlineSoundCueResolution {
  const cue = getByUrl(loaded, action.cueUrl);
  if (!cue) {
    return {
      ok: false,
      reason: 'not-found',
      message: 'This sound is not available in the Library Cue catalog.',
    };
  }
  if (!INLINE_CATEGORY_SET.has(cue.category)) {
    return {
      ok: false,
      reason: 'reserved-category',
      message: `${cue.category} cues belong to another audio surface.`,
    };
  }
  return {
    ok: true,
    cue: cue as LibraryCue & { category: InlineAudioCueCategory },
  };
}

/** Session-only identity; it is never written into chapter or story data. */
export function getInlineCueTrackId(cue: LibraryCue): string {
  return `reader-inline:${cue.public_url}`;
}

export interface InlineAudioTextSegment {
  text: string;
  highlight?: InlineAudioHighlight;
}

const WORD_EDGE = /[\p{L}\p{N}_]/u;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const boundedPattern = (phrase: string) => {
  const escaped = escapeRegExp(phrase);
  const prefix = WORD_EDGE.test(phrase[0]) ? '(?<![\\p{L}\\p{N}_])' : '';
  const suffix = WORD_EDGE.test(phrase[phrase.length - 1]) ? '(?![\\p{L}\\p{N}_])' : '';
  return `${prefix}${escaped}${suffix}`;
};

/** Longest-first literal matching keeps configured phrases from overlapping. */
export function splitByInlineAudioHighlights(
  text: string,
  highlights: readonly InlineAudioHighlight[],
): InlineAudioTextSegment[] {
  const byPhrase = new Map<string, InlineAudioHighlight>();
  for (const highlight of highlights) {
    const phrase = highlight.phrase.trim();
    const key = phrase.toLocaleLowerCase();
    if (!phrase || byPhrase.has(key)) continue;
    byPhrase.set(key, { ...highlight, phrase });
  }

  const ordered = [...byPhrase.values()].sort((left, right) => (
    right.phrase.length - left.phrase.length
  ));
  if (ordered.length === 0) return [{ text }];

  let matcher: RegExp;
  try {
    matcher = new RegExp(`(${ordered.map(item => boundedPattern(item.phrase)).join('|')})`, 'giu');
  } catch {
    return [{ text }];
  }

  const parts = text.split(matcher);
  if (parts.length === 1) return [{ text }];
  return parts.map((part, index) => (
    index % 2 === 0
      ? { text: part }
      : { text: part, highlight: byPhrase.get(part.toLocaleLowerCase()) }
  ));
}

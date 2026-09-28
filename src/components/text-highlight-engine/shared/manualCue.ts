import { INLINE_AUDIO_CUE_CATEGORIES, resolvePlayableAudioMoment, type ResolvedAudioMoment } from '../../../audio/inlineAudio';
import { isMediaResourceProvenance, type MediaCatalog } from '../../../audio/media';
import { isPublicHttpsMediaUrl } from '../../../audio/mediaUrl';
import { soundCueWordIssue } from '../../../audio/soundCueRules';
import type { AudioCue } from '../../../audio/cues';
import { wholeWordRange } from '../../../narrative/words';
import { isValidPassage, type PassageSelection, type TextHighlightBlock } from './selection';

export type ManualCueResult =
  | { ok: true; moment: ResolvedAudioMoment }
  | { ok: false; reason: 'stale-selection' | 'partial-word' | 'too-many-words' | 'unrepresentable-occurrence' | 'overlapping-placement' | 'unavailable-cue' };

export type SoundCueSelection =
  | { ok: true; selection: PassageSelection }
  | { ok: false; reason: 'no-words' | 'too-many-words' };

/**
 * The whole words a selection touches, as a Sound Cue holds them: a start or
 * end inside a word widens to the word, and edge spaces or punctuation fall
 * away ("Somewher" → "Somewhere"). Otherwise, why the words cannot hold one.
 */
export function snapSoundCueSelection(block: TextHighlightBlock, selection: PassageSelection, locale?: string): SoundCueSelection {
  const whole = wholeWordRange(block.text, selection.startOffset, selection.endOffset, locale);
  if (!whole) return { ok: false, reason: 'no-words' };
  if (soundCueWordIssue(block.text, whole.start, whole.end, locale) === 'too-many-words') return { ok: false, reason: 'too-many-words' };
  return { ok: true, selection: { blockId: block.id, startOffset: whole.start, endOffset: whole.end, selectedText: block.text.slice(whole.start, whole.end) } };
}

/** Exact occurrence semantics match the existing inline renderer, including its non-overlapping search. */
function occurrenceAt(text: string, phrase: string, startOffset: number): number | null {
  let from = 0;
  let index = 0;
  while (from <= text.length - phrase.length) {
    const found = text.indexOf(phrase, from);
    if (found < 0 || found > startOffset) return null;
    if (found === startOffset) return index;
    from = found + phrase.length;
    index += 1;
  }
  return null;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Host-authorized manual asset choice; the selection contract remains media-agnostic. */
export function createManualCueMoment(
  block: TextHighlightBlock,
  selection: PassageSelection,
  chosen: AudioCue,
  catalog: MediaCatalog,
  occupiedSelections: readonly PassageSelection[] = [],
): ManualCueResult {
  if (!isValidPassage(block, selection)) return { ok: false, reason: 'stale-selection' };
  // A cue never sits mid-word or on a whole passage; hosts snap selections first, this keeps every placement honest.
  const wordIssue = soundCueWordIssue(block.text, selection.startOffset, selection.endOffset);
  if (wordIssue) return { ok: false, reason: wordIssue === 'too-many-words' ? 'too-many-words' : 'partial-word' };
  if (occupiedSelections.some(occupied => occupied.blockId === block.id
    && selection.startOffset < occupied.endOffset && selection.endOffset > occupied.startOffset)) {
    return { ok: false, reason: 'overlapping-placement' };
  }
  const occurrenceIndex = occurrenceAt(block.text, selection.selectedText, selection.startOffset);
  if (occurrenceIndex === null) return { ok: false, reason: 'unrepresentable-occurrence' };
  const approved = catalog.soundCues.byUrl.get(chosen.public_url);
  const provenance = catalog.soundCueProvenanceByUrl.get(chosen.public_url);
  if (!approved || !provenance || !isMediaResourceProvenance(provenance)
    || !isPublicHttpsMediaUrl(approved.public_url)
    || approved.category !== chosen.category
    || approved.metadata.broad_variation !== chosen.metadata.broad_variation
    || !INLINE_AUDIO_CUE_CATEGORIES.includes(approved.category as typeof INLINE_AUDIO_CUE_CATEGORIES[number])) {
    return { ok: false, reason: 'unavailable-cue' };
  }
  const idSeed = [block.id, selection.selectedText, occurrenceIndex, approved.public_url].join('\u001f');
  const moment: ResolvedAudioMoment = {
    id: `manual-world-cue:${stableHash(idSeed)}`,
    origin: 'manual',
    blockId: block.id,
    triggerPhrase: selection.selectedText,
    occurrenceIndex,
    sourceCategory: approved.category as typeof INLINE_AUDIO_CUE_CATEGORIES[number],
    variation: approved.metadata.broad_variation,
    semanticTags: [...approved.metadata.soft_tags],
    cue: { publicUrl: approved.public_url, provenance: structuredClone(provenance) },
  };
  if (!resolvePlayableAudioMoment(moment).ok) return { ok: false, reason: 'unavailable-cue' };
  return { ok: true, moment };
}

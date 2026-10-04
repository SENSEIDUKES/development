import { SOUND_CUE_KIND, resolvePlayableSoundCue, type SoundCueAttachment } from '../../../audio/inlineAudio';
import { isMediaResourceProvenance, type MediaCatalog } from '../../../audio/media';
import { isPublicHttpsMediaUrl } from '../../../audio/mediaUrl';
import { soundCueWordIssue } from '../../../audio/soundCueRules';
import type { AudioCue } from '../../../audio/cues';
import { wholeWordRange } from '../../../narrative/words';
import { isValidPassage, type PassageSelection, type TextHighlightBlock } from './selection';

export type ManualCueResult =
  | { ok: true; cue: SoundCueAttachment }
  | { ok: false; reason: 'stale-selection' | 'partial-word' | 'too-many-words' | 'overlapping-placement' | 'unavailable-cue' };

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

/**
 * A Sound Cue an author places by hand: the same record the HARNESS stores,
 * with origin manual. The recording must be one the host's catalog approves,
 * with a public HTTPS URL, provenance and a sound word; the selection must be
 * current, whole words (1–8) and free of other cues. The selection contract
 * itself stays media-agnostic.
 */
export function createManualSoundCue(
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
  const approved = catalog.soundCues.byUrl.get(chosen.public_url);
  const provenance = catalog.soundCueProvenanceByUrl.get(chosen.public_url);
  const sound = approved?.metadata.sound;
  if (!approved || !sound || !provenance || !isMediaResourceProvenance(provenance)
    || !isPublicHttpsMediaUrl(approved.public_url)
    || approved.category !== chosen.category) {
    return { ok: false, reason: 'unavailable-cue' };
  }
  const tags = approved.metadata.studio_tags;
  const cue: SoundCueAttachment = {
    id: `sound-cue:${block.id}:${selection.startOffset}-${selection.endOffset}`,
    kind: SOUND_CUE_KIND,
    anchor: { level: 'span', blockId: block.id, startOffset: selection.startOffset, endOffset: selection.endOffset, selectedText: selection.selectedText },
    payload: {
      origin: 'manual',
      sound,
      ...(tags?.energy ? { energy: tags.energy } : {}),
      cue: { publicUrl: approved.public_url, provenance: structuredClone(provenance), category: approved.category, ...(tags ? { tags: { ...tags } } : {}) },
    },
  };
  if (!resolvePlayableSoundCue(cue).ok) return { ok: false, reason: 'unavailable-cue' };
  return { ok: true, cue };
}

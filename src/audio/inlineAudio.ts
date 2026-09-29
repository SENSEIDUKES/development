import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/text-highlight-engine/shared/manuscript';
import type { AudioEnergy, AudioTags } from './audioTags';
import type { AudioCueCategory } from './cues';
import { isMediaResourceProvenance, type MediaResourceProvenance } from './media';
import { isPublicHttpsMediaUrl } from './mediaUrl';

/**
 * Sound Cues: a sound played on the exact words where it happens in the prose.
 *
 * A placed Sound Cue is a manuscript attachment: a span of one paragraph (its
 * block id, offsets and the words themselves) with the resolved recording as
 * its payload. The HARNESS places one from a writer's mark and sound word; a
 * person places one directly. Either way the same record is saved with the
 * chapter and read by the Reader, and it never names a file, asset or catalog
 * row beyond the recording's public URL and provenance.
 */
export const SOUND_CUE_KIND = 'sound-cue';

/** Where a Sound Cue sits: an exact span of one paragraph. */
export type SoundCueAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

export interface SoundCuePayload {
  /** Who placed it: the HARNESS from a writer's mark, or a person. */
  origin: 'harness' | 'manual';
  /** The sound word it answers ("blade drawn"). */
  sound: string;
  /** The Energy the writer asked for, when it asked. */
  energy?: AudioEnergy;
  /** The recording chosen for it. */
  cue: {
    publicUrl: string;
    provenance: MediaResourceProvenance;
    /** The recording's category, its Studio parent tag. */
    category: AudioCueCategory;
    tags?: AudioTags;
  };
}

export interface SoundCueAttachment extends ManuscriptAttachment<SoundCuePayload> {
  kind: typeof SOUND_CUE_KIND;
  anchor: SoundCueAnchor;
}

export type PlayableSoundCue =
  | { ok: true; publicUrl: string }
  | { ok: false; reason: 'invalid-cue' | 'detached' | 'unavailable'; message: string };

export interface InlineAudioTextSegment {
  text: string;
  cue?: SoundCueAttachment;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** A saved Sound Cue is played only while its record is whole and its recording is still a public, provenanced HTTPS file. */
export function resolvePlayableSoundCue(value: SoundCueAttachment): PlayableSoundCue {
  const anchor = isPlainObject(value) ? value.anchor : undefined;
  const payload = isPlainObject(value) ? value.payload : undefined;
  if (
    !isPlainObject(value) || value.kind !== SOUND_CUE_KIND || typeof value.id !== 'string' || !value.id
    || !isPlainObject(anchor) || anchor.level !== 'span' || typeof anchor.blockId !== 'string'
    || !Number.isInteger(anchor.startOffset) || !Number.isInteger(anchor.endOffset) || anchor.endOffset <= anchor.startOffset
    || typeof anchor.selectedText !== 'string' || !anchor.selectedText.trim()
    || !isPlainObject(payload) || typeof payload.sound !== 'string' || !payload.sound
    || (payload.origin !== 'harness' && payload.origin !== 'manual') || !isPlainObject(payload.cue)
  ) {
    return { ok: false, reason: 'invalid-cue', message: 'This Sound Cue record is incomplete.' };
  }
  if (anchor.detached) return { ok: false, reason: 'detached', message: 'An edit changed these words, so the cue came off the page.' };
  if (typeof payload.cue.publicUrl !== 'string' || !isPublicHttpsMediaUrl(payload.cue.publicUrl) || !isMediaResourceProvenance(payload.cue.provenance)) {
    return { ok: false, reason: 'unavailable', message: 'This Sound Cue recording is not available.' };
  }
  return { ok: true, publicUrl: payload.cue.publicUrl };
}

/** Playback identity per placed cue, so two cues on the same recording keep their own state. */
export const soundCueTrackId = (cue: SoundCueAttachment) => `reader-inline:${cue.id}`;

/**
 * Splits one paragraph's text at its Sound Cues. A cue is placed only where
 * its offsets still hold its exact words; one that no longer matches, or that
 * overlaps an earlier cue, leaves the prose plain.
 */
export function splitBySoundCues(text: string, cues: readonly SoundCueAttachment[]): InlineAudioTextSegment[] {
  const placements = cues
    .filter(cue => cue.anchor.startOffset >= 0 && cue.anchor.endOffset <= text.length
      && text.slice(cue.anchor.startOffset, cue.anchor.endOffset) === cue.anchor.selectedText)
    .sort((left, right) => left.anchor.startOffset - right.anchor.startOffset || left.id.localeCompare(right.id));
  const segments: InlineAudioTextSegment[] = [];
  let cursor = 0;
  for (const cue of placements) {
    if (cue.anchor.startOffset < cursor) continue;
    if (cue.anchor.startOffset > cursor) segments.push({ text: text.slice(cursor, cue.anchor.startOffset) });
    segments.push({ text: cue.anchor.selectedText, cue });
    cursor = cue.anchor.endOffset;
  }
  if (cursor < text.length || segments.length === 0) segments.push({ text: text.slice(cursor) });
  return segments;
}

const LEADING_INLINE_AUDIO_PUNCTUATION = /^[,.;:!?…—–"'”’)}\]]+/u;

/** Punctuation right after a cue's words stays joined to its glyph. */
export const matchLeadingInlineAudioPunctuation = (value: string): string => (
  value.match(LEADING_INLINE_AUDIO_PUNCTUATION)?.[0] ?? ''
);

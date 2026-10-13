import { soundtrackChangeWord } from '../../../audio/soundtrackChanges';
import { resolveAnchor, type Manuscript, type ManuscriptState } from './manuscript';
import type { OverlayMark, OverlayPin } from './overlay';

/**
 * The page's overlays, like a strategy game's map modes: each shows one kind of
 * added effect. The Workshop lab and the Reader's Create mode share them.
 */
export type ManuscriptOverlayMode = 'off' | 'audio';

/**
 * One color per kind of added effect, so every effect of a kind is found at a
 * glance: all Sound Cues are blue. A new kind joins with its own color. How
 * much text a tint covers already shows whether it holds words, a sentence or
 * a paragraph.
 */
export const ATTACHMENT_COLORS: Readonly<Record<string, { label: string; tone: string }>> = {
  'sound-cue': { label: 'Sound Cue', tone: 'rgba(59, 130, 246, .38)' },
  'soundscape-change': { label: 'Soundscape', tone: 'rgba(168, 85, 247, .4)' },
  'atmosphere-change': { label: 'Atmosphere', tone: 'rgba(34, 197, 94, .36)' },
};

/** The attachment kinds each overlay shows. */
export const OVERLAY_KINDS: Readonly<Record<Exclude<ManuscriptOverlayMode, 'off'>, readonly string[]>> = {
  audio: ['sound-cue', 'soundscape-change', 'atmosphere-change'],
};

/**
 * The page's numbering as the model addresses it (P2 S6), drawn the way a
 * reader already knows it: ¶2 in the margin beside each paragraph, and a
 * small raised 6 above each sentence's first letter, counted through the page.
 */
export function structurePins(manuscript: Manuscript): OverlayPin[] {
  let sentenceNumber = 0;
  return manuscript.paragraphs.flatMap((paragraph, index) => {
    const pins: OverlayPin[] = [{ id: `pin:${paragraph.id}`, blockId: paragraph.id, offset: paragraph.sentences[0]?.start ?? 0, label: `¶${index + 1}`, placement: 'margin' }];
    for (const sentence of paragraph.sentences) {
      sentenceNumber += 1;
      pins.push({ id: `pin:${sentence.id}`, blockId: paragraph.id, offset: sentence.start, label: String(sentenceNumber), placement: 'raised' });
    }
    return pins;
  });
}

/**
 * The chapter's opening soundscape and atmosphere, on its first word: they
 * begin there, before any change. Each keeps its kind's color; when both
 * open the chapter the word is split between the two.
 */
export function openingSoundMark(manuscript: Manuscript, opening: { soundscape?: boolean; atmosphere?: boolean }): OverlayMark | undefined {
  const first = manuscript.paragraphs[0];
  const letter = first?.text.search(/[\p{L}\p{N}]/u) ?? -1;
  if (!first || letter < 0 || !(opening.soundscape || opening.atmosphere)) return undefined;
  const word = soundtrackChangeWord(first.text, letter, letter + 1, manuscript.locale) ?? { start: letter, end: letter + 1 };
  const soundscape = ATTACHMENT_COLORS['soundscape-change'].tone;
  const atmosphere = ATTACHMENT_COLORS['atmosphere-change'].tone;
  return {
    id: 'mark:opening-sound',
    selection: { blockId: first.id, startOffset: word.start, endOffset: word.end, selectedText: first.text.slice(word.start, word.end) },
    tone: opening.soundscape && opening.atmosphere ? `linear-gradient(90deg, ${soundscape} 50%, ${atmosphere} 50%)` : opening.soundscape ? soundscape : atmosphere,
  };
}

/**
 * Every attachment of the given kinds as a tint in its kind's color. One whose
 * words changed keeps its color and is underlined for attention, so it is still
 * found with its kind. A span whose words an edit replaced has no place left on
 * the page; the inspector lists it instead.
 */
export function attachmentMarks<Payload>(state: ManuscriptState<Payload>, kinds: readonly string[]): OverlayMark[] {
  return state.attachments.filter(attachment => kinds.includes(attachment.kind)).flatMap(attachment => {
    const color = ATTACHMENT_COLORS[attachment.kind];
    const resolution = resolveAnchor(state.manuscript, attachment.anchor);
    const selection = resolution.status === 'placed' ? resolution.selection : resolution.status === 'changed' ? resolution.current : undefined;
    if (!color || !selection) return [];
    const mark: OverlayMark = { id: `mark:${attachment.id}`, selection, tone: color.tone };
    return [resolution.status === 'changed' ? { ...mark, attention: true } : mark];
  });
}

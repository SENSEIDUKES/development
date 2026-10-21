import { soundtrackChangeWord, type SoundtrackChangeKind } from '../../../audio/soundtrackChanges';
import { resolveAnchor, type Manuscript, type ManuscriptState } from './manuscript';
import type { OverlayMark, OverlayPin } from './overlay';
import type { PassageSelection } from './selection';

/**
 * The page's overlays, like a strategy game's map modes: each shows one kind of
 * added effect and nothing else, so Sound Cues, soundscapes and atmospheres are
 * each found on their own. The Workshop lab and the Reader's Create mode share them.
 */
export type ManuscriptOverlayMode = 'off' | 'cues' | 'soundscapes' | 'atmospheres';

export interface ManuscriptOverlayGroup {
  id: string;
  label: string;
  overlays: ReadonlyArray<{ mode: Exclude<ManuscriptOverlayMode, 'off'>; label: string }>;
}

/**
 * The overlays by category, in the switch's order: a category is chosen
 * first, then one overlay inside it. Audio holds the three sounds; later
 * kinds of tagging join as categories of their own.
 */
export const MANUSCRIPT_OVERLAY_GROUPS: readonly ManuscriptOverlayGroup[] = [
  { id: 'audio', label: 'Audio', overlays: [
    { mode: 'cues', label: 'Sound Cues' },
    { mode: 'soundscapes', label: 'Soundscapes' },
    { mode: 'atmospheres', label: 'Atmospheres' },
  ] },
];

/** Every overlay, in the switch's order. */
export const MANUSCRIPT_OVERLAYS = MANUSCRIPT_OVERLAY_GROUPS.flatMap(group => group.overlays);

/** The category an overlay belongs to. */
export const overlayGroupOf = (mode: ManuscriptOverlayMode) =>
  MANUSCRIPT_OVERLAY_GROUPS.find(group => group.overlays.some(overlay => overlay.mode === mode));

/**
 * One color per kind of added effect, so every effect of a kind is found at a
 * glance: all Sound Cues are blue. A new kind joins with its own color. How
 * much text a tint covers already shows whether it holds words, a sentence or
 * a paragraph.
 */
export const ATTACHMENT_COLORS: Readonly<Record<string, { label: string; tone: string }>> = {
  'sound-cue': { label: 'Sound Cue', tone: 'rgba(22, 139, 255, .6)' },
  'soundscape-change': { label: 'Soundscape', tone: 'rgba(255, 65, 79, .6)' },
  // Yellow needs less opacity than blue/red to keep light prose readable on dark pages.
  'atmosphere-change': { label: 'Atmosphere', tone: 'rgba(255, 196, 0, .45)' },
};

/** The attachment kind each overlay shows. */
export const OVERLAY_KINDS: Readonly<Record<Exclude<ManuscriptOverlayMode, 'off'>, readonly string[]>> = {
  cues: ['sound-cue'],
  soundscapes: ['soundscape-change'],
  atmospheres: ['atmosphere-change'],
};

/** The soundtrack kind an overlay shows, for the opening it marks. */
export const OVERLAY_SOUNDTRACK_KIND: Partial<Record<ManuscriptOverlayMode, SoundtrackChangeKind>> = {
  soundscapes: 'soundscape-change',
  atmospheres: 'atmosphere-change',
};

/**
 * Whether a selection is in the chapter's first sentence: there a soundscape
 * or atmosphere is the chapter's opening, locked at its start, never a change.
 */
export function isChapterOpening(manuscript: Manuscript, selection: PassageSelection): boolean {
  const first = manuscript.paragraphs[0];
  return Boolean(first) && selection.blockId === first.id && selection.startOffset < (first.sentences[0]?.end ?? first.text.length);
}

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
 * The chapter's opening soundscape or atmosphere, on its first word, in its
 * kind's color: it begins there, before any change.
 */
export function openingSoundMark(manuscript: Manuscript, kind: SoundtrackChangeKind): OverlayMark | undefined {
  const first = manuscript.paragraphs[0];
  const letter = first?.text.search(/[\p{L}\p{N}]/u) ?? -1;
  if (!first || letter < 0) return undefined;
  const word = soundtrackChangeWord(first.text, letter, letter + 1, manuscript.locale) ?? { start: letter, end: letter + 1 };
  return {
    id: `mark:opening:${kind}`,
    selection: { blockId: first.id, startOffset: word.start, endOffset: word.end, selectedText: first.text.slice(word.start, word.end) },
    tone: ATTACHMENT_COLORS[kind].tone,
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

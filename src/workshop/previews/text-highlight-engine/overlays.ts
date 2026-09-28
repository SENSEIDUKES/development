import {
  resolveAnchor,
  type Manuscript, type ManuscriptState, type OverlayMark, type OverlayPin,
} from '@seihouse/sen/text-highlight-engine';

/** The lab's overlays, like a strategy game's map modes: each shows one kind of added effect. */
export type LabOverlay = 'off' | 'cues';

/**
 * One color per kind of added effect, so every effect of a kind is found at a
 * glance: all Sound Cues are blue. A new kind joins with its own color. How
 * much text a tint covers already shows whether it holds words, a sentence or
 * a paragraph.
 */
export const ATTACHMENT_COLORS: Readonly<Record<string, { label: string; tone: string }>> = {
  'sound-cue': { label: 'Sound Cue', tone: 'rgba(59, 130, 246, .38)' },
};

/** The attachment kinds each overlay shows. */
export const OVERLAY_KINDS: Readonly<Record<Exclude<LabOverlay, 'off'>, readonly string[]>> = {
  cues: ['sound-cue'],
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

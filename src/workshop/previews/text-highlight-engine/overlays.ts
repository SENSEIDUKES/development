import {
  resolveAnchor,
  type Manuscript, type ManuscriptAnchorLevel, type ManuscriptState, type OverlayMark, type OverlayPin,
} from '@seihouse/sen/text-highlight-engine';

/** The lab's overlays, like a strategy game's map modes: each tints one kind of attachment. */
export type LabOverlay = 'off' | 'cues';

export const OVERLAY_TONES: Record<ManuscriptAnchorLevel | 'flagged', string> = {
  span: 'rgba(45, 212, 191, .32)',
  sentence: 'rgba(56, 189, 248, .26)',
  paragraph: 'rgba(129, 140, 248, .2)',
  flagged: 'rgba(251, 191, 36, .34)',
};

/** The Cues overlay's key: what each tint means, in the order a reader meets them. */
export const CUE_LEGEND: ReadonlyArray<{ label: string; tone: string }> = [
  { label: 'Words', tone: OVERLAY_TONES.span },
  { label: 'Sentence', tone: OVERLAY_TONES.sentence },
  { label: 'Paragraph', tone: OVERLAY_TONES.paragraph },
  { label: 'Changed', tone: OVERLAY_TONES.flagged },
];

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
 * Every Sound Cue on the page as a tint: one tone per attachment level, amber
 * where the cue's words changed. A span whose words an edit replaced has no
 * place left on the page; the inspector lists it instead.
 */
export function cueMarks<Payload>(state: ManuscriptState<Payload>, kind = 'sound-cue'): OverlayMark[] {
  return state.attachments.filter(attachment => attachment.kind === kind).flatMap(attachment => {
    const resolution = resolveAnchor(state.manuscript, attachment.anchor);
    const selection = resolution.status === 'placed' ? resolution.selection : resolution.status === 'changed' ? resolution.current : undefined;
    if (!selection) return [];
    return [{ id: `mark:${attachment.id}`, selection, tone: resolution.status === 'placed' ? OVERLAY_TONES[attachment.anchor.level] : OVERLAY_TONES.flagged }];
  });
}

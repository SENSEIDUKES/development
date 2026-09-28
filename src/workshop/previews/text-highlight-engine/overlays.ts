import {
  locateSelection, resolveAnchor,
  type Manuscript, type ManuscriptAnchorLevel, type ManuscriptState, type OverlayMark, type OverlayPin, type PassageSelection,
} from '@seihouse/sen/text-highlight-engine';

/** The lab's overlays, like a strategy game's map modes: each tints one kind of attachment. */
export type LabOverlay = 'off' | 'cues';

export const OVERLAY_TONES: Record<ManuscriptAnchorLevel | 'flagged', string> = {
  span: 'rgba(45, 212, 191, .32)',
  sentence: 'rgba(56, 189, 248, .26)',
  paragraph: 'rgba(129, 140, 248, .2)',
  flagged: 'rgba(251, 191, 36, .34)',
};

const LEVEL_WORD: Record<ManuscriptAnchorLevel, string> = { span: 'words', sentence: 'sentence', paragraph: 'paragraph' };

/** The page's numbering as the model would address it: P1… per paragraph, S1… per saved sentence, counted through the page. */
export function structurePins(manuscript: Manuscript): OverlayPin[] {
  let sentenceNumber = 0;
  return manuscript.paragraphs.flatMap((paragraph, index) => {
    const pins: OverlayPin[] = [{ id: `pin:${paragraph.id}`, blockId: paragraph.id, offset: paragraph.sentences[0]?.start ?? 0, label: `P${index + 1}`, placement: 'above' }];
    for (const sentence of paragraph.sentences) {
      sentenceNumber += 1;
      pins.push({ id: `pin:${sentence.id}`, blockId: paragraph.id, offset: sentence.start, label: `S${sentenceNumber}`, placement: 'raised' });
    }
    return pins;
  });
}

/** "P1 S3", "P1 S3–S4", or just "P2" for a whole-paragraph attachment. */
function addressLabel(manuscript: Manuscript, selection: PassageSelection, level: ManuscriptAnchorLevel): string {
  const address = locateSelection(manuscript, selection);
  if (!address) return '';
  const numbers = address.sentences.map(sentence => sentence.number);
  if (level === 'paragraph' || !numbers.length) return `P${address.paragraph.number}`;
  return `P${address.paragraph.number} S${numbers[0]}${numbers.length > 1 ? `–S${numbers.at(-1)}` : ''}`;
}

/**
 * Every Sound Cue on the page as an overlay mark: one tone per attachment
 * level, amber where the cue's words changed. A span whose words an edit
 * replaced has no place left on the page; the inspector lists it instead.
 */
export function cueMarks<Payload>(state: ManuscriptState<Payload>, kind = 'sound-cue'): OverlayMark[] {
  return state.attachments.filter(attachment => attachment.kind === kind).flatMap(attachment => {
    const { level } = attachment.anchor;
    const resolution = resolveAnchor(state.manuscript, attachment.anchor);
    const selection = resolution.status === 'placed' ? resolution.selection : resolution.status === 'changed' ? resolution.current : undefined;
    if (!selection) return [];
    const flagged = resolution.status !== 'placed';
    return [{
      id: `mark:${attachment.id}`,
      selection,
      tone: flagged ? OVERLAY_TONES.flagged : OVERLAY_TONES[level],
      label: `Cue · ${addressLabel(state.manuscript, selection, level)} · ${LEVEL_WORD[level]}${flagged ? ' changed' : ''}`,
    }];
  });
}

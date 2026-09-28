import { describe, expect, it } from 'vitest';
import {
  anchorAtLevel, applyPassageEdit, replacePassage,
  type ManuscriptAttachment, type ManuscriptIdFactory, type ManuscriptState, type PassageSelection,
} from '@seihouse/sen/text-highlight-engine';
import { createPreviewManuscript, previewParagraphs } from './previewData';
import { OVERLAY_TONES, cueMarks, structurePins } from './overlays';

const ids = (): ManuscriptIdFactory => { let count = 0; return kind => `${kind[0]}${++count}`; };
const words = (state: ManuscriptState<string>, index: number, phrase: string): PassageSelection => {
  const paragraph = state.manuscript.paragraphs[index];
  const start = paragraph.text.indexOf(phrase);
  return { blockId: paragraph.id, selectedText: phrase, startOffset: start, endOffset: start + phrase.length };
};
const cue = (state: ManuscriptState<string>, id: string, selection: PassageSelection, level: 'span' | 'sentence' | 'paragraph'): ManuscriptAttachment<string> =>
  ({ id, kind: 'sound-cue', anchor: anchorAtLevel(state.manuscript, selection, level)!, payload: id });

describe('Lab overlays', () => {
  it('numbers the page the way the model addresses it', () => {
    const manuscript = createPreviewManuscript(ids());
    const pins = structurePins(manuscript);
    expect(pins.filter(pin => pin.placement === 'above').map(pin => pin.label)).toEqual(['P1', 'P2', 'P3']);
    const sentences = pins.filter(pin => pin.placement === 'raised');
    expect(sentences.map(pin => pin.label)).toEqual(Array.from({ length: 15 }, (_, index) => `S${index + 1}`));
    // Paragraph 2's first sentence is S6: numbering runs through the whole page.
    const second = manuscript.paragraphs[1];
    expect(sentences.find(pin => pin.label === 'S6')).toMatchObject({ blockId: second.id, offset: second.sentences[0].start });
  });

  it('tints every cue by its level and labels it with its address', () => {
    const state: ManuscriptState<string> = { manuscript: createPreviewManuscript(ids()), attachments: [] };
    state.attachments = [
      cue(state, 'roar', words(state, 0, 'the beast roared again'), 'span'),
      cue(state, 'bells', words(state, 1, 'temple bells'), 'sentence'),
      cue(state, 'cave', words(state, 2, 'cold fire'), 'paragraph'),
    ];
    const marks = cueMarks(state);
    expect(marks.map(mark => mark.label)).toEqual(['Cue · P1 S3 · words', 'Cue · P2 S8 · sentence', 'Cue · P3 · paragraph']);
    expect(marks.map(mark => mark.tone)).toEqual([OVERLAY_TONES.span, OVERLAY_TONES.sentence, OVERLAY_TONES.paragraph]);
    expect(marks[0].selection.selectedText).toBe('the beast roared again');
    expect(marks[2].selection.selectedText).toBe(previewParagraphs[2]);
  });

  it('shows a cue whose sentence changed in amber where the sentence is now, and leaves detached words to the inspector', () => {
    const start: ManuscriptState<string> = { manuscript: createPreviewManuscript(ids()), attachments: [] };
    start.attachments = [
      cue(start, 'roar', words(start, 0, 'the beast roared again'), 'span'),
      cue(start, 'dust', words(start, 0, 'Dust swallowed'), 'sentence'),
    ];
    const edit = (state: ManuscriptState<string>, selection: PassageSelection, replacement: string) => {
      const before = state.manuscript.paragraphs.find(paragraph => paragraph.id === selection.blockId)!;
      const result = applyPassageEdit(state, { operation: 'replace', selection, before, after: replacePassage(before, selection, replacement)! });
      if (!result.ok) throw new Error(result.reason);
      return result.state;
    };
    const refilled = edit(start, words(start, 0, 'swallowed'), 'filled');
    const changed = edit(refilled, words(refilled, 0, 'beast roared'), 'wind howled');
    const marks = cueMarks(changed);
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ tone: OVERLAY_TONES.flagged, label: 'Cue · P1 S2 · sentence changed', selection: { selectedText: 'Dust filled the courtyard.' } });
  });
});

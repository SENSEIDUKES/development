import { describe, expect, it } from 'vitest';
import {
  anchorAtLevel, applyPassageEdit, replacePassage,
  type ManuscriptAttachment, type ManuscriptIdFactory, type ManuscriptState, type PassageSelection,
} from '@seihouse/sen/highlight-engine';
import { createPreviewManuscript, previewParagraphs } from './previewData';
import { ATTACHMENT_COLORS, OVERLAY_KINDS, attachmentMarks, openingSoundMark, structurePins } from '@seihouse/sen/highlight-engine';

const ids = (): ManuscriptIdFactory => { let count = 0; return kind => `${kind[0]}${++count}`; };
const words = (state: ManuscriptState<string>, index: number, phrase: string): PassageSelection => {
  const paragraph = state.manuscript.paragraphs[index];
  const start = paragraph.text.indexOf(phrase);
  return { blockId: paragraph.id, selectedText: phrase, startOffset: start, endOffset: start + phrase.length };
};
const cue = (state: ManuscriptState<string>, id: string, selection: PassageSelection, level: 'span' | 'sentence' | 'paragraph'): ManuscriptAttachment<string> =>
  ({ id, kind: 'sound-cue', anchor: anchorAtLevel(state.manuscript, selection, level)!, payload: id });

describe('Lab overlays', () => {
  it('numbers the page the way the model addresses it, in the form a reader already knows', () => {
    const manuscript = createPreviewManuscript(ids());
    const pins = structurePins(manuscript);
    expect(pins.filter(pin => pin.placement === 'margin').map(pin => pin.label)).toEqual(['¶1', '¶2', '¶3']);
    const sentences = pins.filter(pin => pin.placement === 'raised');
    expect(sentences.map(pin => pin.label)).toEqual(Array.from({ length: 15 }, (_, index) => String(index + 1)));
    // Paragraph 2's first sentence is 6 (the model's P2 S6): numbering runs through the whole page.
    const second = manuscript.paragraphs[1];
    expect(sentences.find(pin => pin.label === '6')).toMatchObject({ blockId: second.id, offset: second.sentences[0].start });
    expect(pins.find(pin => pin.label === '¶2')).toMatchObject({ blockId: second.id, offset: second.sentences[0].start });
  });

  it('gives each overlay its kinds, one color per kind', () => {
    expect(OVERLAY_KINDS.audio).toEqual(['sound-cue', 'soundscape-change', 'atmosphere-change']);
    expect(ATTACHMENT_COLORS['soundscape-change'].label).toBe('Soundscape');
    expect(ATTACHMENT_COLORS['atmosphere-change'].label).toBe('Atmosphere');
    expect(ATTACHMENT_COLORS['sound-cue'].label).toBe('Sound Cue');
  });

  it('marks where the opening soundscape and atmosphere begin: the first word, in their colors', () => {
    const manuscript = createPreviewManuscript(ids());
    const first = manuscript.paragraphs[0];
    const firstWord = first.text.match(/[\p{L}\p{N}]+/u)![0];
    const both = openingSoundMark(manuscript, { soundscape: true, atmosphere: true })!;
    expect(both.selection).toMatchObject({ blockId: first.id, selectedText: firstWord });
    expect(both.tone).toBe(`linear-gradient(90deg, ${ATTACHMENT_COLORS['soundscape-change'].tone} 50%, ${ATTACHMENT_COLORS['atmosphere-change'].tone} 50%)`);
    expect(openingSoundMark(manuscript, { atmosphere: true })!.tone).toBe(ATTACHMENT_COLORS['atmosphere-change'].tone);
    // A chapter with neither opening keeps the one before playing: nothing begins here.
    expect(openingSoundMark(manuscript, {})).toBeUndefined();
  });

  it('tints every Sound Cue blue, whether it holds words, a sentence or a paragraph, and nothing of another kind', () => {
    const state: ManuscriptState<string> = { manuscript: createPreviewManuscript(ids()), attachments: [] };
    state.attachments = [
      cue(state, 'roar', words(state, 0, 'the beast roared again'), 'span'),
      cue(state, 'bells', words(state, 1, 'temple bells'), 'sentence'),
      cue(state, 'cave', words(state, 2, 'cold fire'), 'paragraph'),
      { ...cue(state, 'rain', words(state, 1, 'paper lanterns'), 'sentence'), kind: 'soundscape' },
    ];
    const marks = attachmentMarks(state, OVERLAY_KINDS.audio);
    expect(marks.map(mark => mark.id)).toEqual(['mark:roar', 'mark:bells', 'mark:cave']);
    expect(new Set(marks.map(mark => mark.tone))).toEqual(new Set([ATTACHMENT_COLORS['sound-cue'].tone]));
    expect(marks.some(mark => mark.attention)).toBe(false);
    // How much text a tint covers shows what it is attached to.
    expect(marks[0].selection.selectedText).toBe('the beast roared again');
    expect(marks[1].selection.selectedText).toBe(state.manuscript.paragraphs[1].text.slice(
      state.manuscript.paragraphs[1].sentences[2].start, state.manuscript.paragraphs[1].sentences[2].end));
    expect(marks[2].selection.selectedText).toBe(previewParagraphs[2]);
  });

  it('keeps a cue whose sentence changed blue and underlines it where the sentence is now, and leaves detached words to the inspector', () => {
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
    const marks = attachmentMarks(changed, OVERLAY_KINDS.audio);
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ tone: ATTACHMENT_COLORS['sound-cue'].tone, attention: true, selection: { selectedText: 'Dust filled the courtyard.' } });
  });
});

import { describe, expect, it } from 'vitest';
import {
  MANUSCRIPT_PROTOTYPE_WORD_LIMIT, anchorAtLevel, applyPassageEdit, createManuscript, insertParagraph, keepAttachment,
  locateSelection, placeAttachment, resolveAnchor, sealManuscript, splitSentences,
  type Manuscript, type ManuscriptAnchor, type ManuscriptAttachment, type ManuscriptIdFactory, type ManuscriptParagraph, type ManuscriptState,
} from './manuscript';
import { replacePassage, type PassageEdit, type PassageSelection } from './selection';

const ids = (): ManuscriptIdFactory => {
  let count = 0;
  return kind => `${kind === 'paragraph' ? 'p' : 's'}${++count}`;
};
const PAGE = [
  'The gate split. Dust swallowed the courtyard. “Get up!” someone shouted. The beast roared again.',
  'Qinglan rose in nine terraces. The temple bells rang.',
];
const page = () => createManuscript(PAGE, { createId: ids() });
const sentenceTexts = (paragraph: ManuscriptParagraph) => paragraph.sentences.map(sentence => paragraph.text.slice(sentence.start, sentence.end));
const span = (manuscript: Manuscript, paragraphIndex: number, words: string, occurrence = 0): PassageSelection => {
  const paragraph = manuscript.paragraphs[paragraphIndex];
  let start = -1;
  for (let found = 0; found <= occurrence; found += 1) start = paragraph.text.indexOf(words, start + 1);
  return { blockId: paragraph.id, selectedText: words, startOffset: start, endOffset: start + words.length };
};
const attach = (id: string, anchor: ManuscriptAnchor): ManuscriptAttachment<string> => ({ id, kind: 'sound-cue', anchor, payload: id });
const edit = (state: ManuscriptState<string>, selection: PassageSelection, replacement: string, operation: 'replace' | 'delete' = 'replace'): PassageEdit => {
  const before = state.manuscript.paragraphs.find(paragraph => paragraph.id === selection.blockId)!;
  return { operation, selection, before, after: replacePassage(before, selection, replacement)! };
};
const apply = (state: ManuscriptState<string>, change: PassageEdit, createId = ids()) => {
  const result = applyPassageEdit(state, change, { createId: kind => `new-${createId(kind)}` });
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};
const status = (state: ManuscriptState<string>, id: string) =>
  resolveAnchor(state.manuscript, state.attachments.find(attachment => attachment.id === id)!.anchor).status;

describe('Manuscript page', () => {
  it('saves paragraphs and sentences with permanent IDs, keeping spoken lines and System lines whole', () => {
    const manuscript = page();
    expect(manuscript.status).toBe('draft');
    expect(manuscript.paragraphs.map(paragraph => paragraph.id)).toEqual(['p1', 'p6']);
    expect(sentenceTexts(manuscript.paragraphs[0])).toEqual([
      'The gate split.', 'Dust swallowed the courtyard.', '“Get up!” someone shouted.', 'The beast roared again.',
    ]);
    expect(manuscript.paragraphs[0].sentences.map(sentence => sentence.id)).toEqual(['s2', 's3', 's4', 's5']);
    expect(splitSentences('Qi surged. [Breakthrough: Foundation Establishment, Lv. 1] He opened his eyes. Mr. Chen bowed.')
      .map(range => 'Qi surged. [Breakthrough: Foundation Establishment, Lv. 1] He opened his eyes. Mr. Chen bowed.'.slice(range.start, range.end)))
      .toEqual(['Qi surged.', '[Breakthrough: Foundation Establishment, Lv. 1]', 'He opened his eyes.', 'Mr. Chen bowed.']);
  });

  it('keeps identity separate from order when a paragraph is inserted before others', () => {
    const manuscript = page();
    const selection = span(manuscript, 1, 'The temple bells rang.');
    expect(locateSelection(manuscript, selection)).toMatchObject({ paragraph: { id: 'p6', number: 2 }, sentences: [{ id: 's8', number: 6 }], exactSentence: true });
    const inserted = insertParagraph(manuscript, 0, 'A new opening line.', { createId: ids() });
    expect(inserted.paragraphs.slice(1)).toEqual(manuscript.paragraphs);
    expect(locateSelection(inserted, selection)).toMatchObject({ paragraph: { id: 'p6', number: 3 }, sentences: [{ id: 's8', number: 7 }] });
  });

  it('caps the prototype page at the word limit', () => {
    expect(() => createManuscript([Array.from({ length: MANUSCRIPT_PROTOTYPE_WORD_LIMIT + 1 }, () => 'word').join(' ')])).toThrow(RangeError);
    const state: ManuscriptState<string> = { manuscript: createManuscript(['Short start.', Array.from({ length: MANUSCRIPT_PROTOTYPE_WORD_LIMIT - 2 }, () => 'word').join(' ')]), attachments: [] };
    const result = applyPassageEdit(state, edit(state, span(state.manuscript, 0, 'Short'), 'A much longer'));
    expect(result).toEqual({ ok: false, reason: 'word-limit' });
  });

  it('offers a selection at its words, its one sentence, or its paragraph', () => {
    const manuscript = page();
    const words = span(manuscript, 0, 'swallowed');
    expect(anchorAtLevel(manuscript, words, 'span')).toMatchObject({ level: 'span', selectedText: 'swallowed' });
    expect(anchorAtLevel(manuscript, words, 'sentence')).toEqual({ level: 'sentence', blockId: 'p1', sentenceId: 's3', text: 'Dust swallowed the courtyard.' });
    expect(anchorAtLevel(manuscript, words, 'paragraph')).toEqual({ level: 'paragraph', blockId: 'p1', text: PAGE[0] });
    expect(anchorAtLevel(manuscript, span(manuscript, 0, 'courtyard. “Get'), 'sentence')).toBeUndefined();
    expect(locateSelection(manuscript, span(manuscript, 0, 'courtyard. “Get'))?.sentences.map(sentence => sentence.number)).toEqual([2, 3]);
  });
});

describe('One edit rule for every attachment', () => {
  const setup = () => {
    const manuscript = page();
    const anchor = (level: 'span' | 'sentence' | 'paragraph', selection: PassageSelection) => anchorAtLevel(manuscript, selection, level)!;
    return {
      manuscript,
      attachments: [
        attach('before', anchor('span', span(manuscript, 0, 'gate split'))),
        attach('inside', anchor('span', span(manuscript, 0, 'the courtyard'))),
        attach('after', anchor('span', span(manuscript, 0, 'beast roared'))),
        attach('sentence', anchor('sentence', span(manuscript, 0, 'swallowed'))),
        attach('untouched-sentence', anchor('sentence', span(manuscript, 0, 'beast roared'))),
        attach('paragraph', anchor('paragraph', span(manuscript, 0, 'gate'))),
        attach('other-paragraph', anchor('span', span(manuscript, 1, 'temple bells'))),
      ],
    } satisfies ManuscriptState<string>;
  };

  it('keeps earlier attachments, shifts later ones, and flags only what the edit touched', () => {
    const state = setup();
    const next = apply(state, edit(state, span(state.manuscript, 0, 'courtyard'), 'whole courtyard'));
    expect(next.manuscript.paragraphs[0].text).toBe(PAGE[0].replace('courtyard', 'whole courtyard'));
    expect(next.manuscript.paragraphs[0].sentences.map(sentence => sentence.id)).toEqual(['s2', 's3', 's4', 's5']);
    expect(status(next, 'before')).toBe('placed');
    expect(status(next, 'after')).toBe('placed');
    expect(resolveAnchor(next.manuscript, next.attachments.find(attachment => attachment.id === 'after')!.anchor))
      .toMatchObject({ selection: { selectedText: 'beast roared', startOffset: PAGE[0].indexOf('beast roared') + 'whole '.length } });
    expect(status(next, 'inside')).toBe('changed');
    expect(next.attachments.find(attachment => attachment.id === 'inside')!.anchor).toMatchObject({ detached: true, selectedText: 'the courtyard' });
    expect(status(next, 'sentence')).toBe('changed');
    expect(resolveAnchor(next.manuscript, next.attachments.find(attachment => attachment.id === 'sentence')!.anchor))
      .toMatchObject({ status: 'changed', current: { selectedText: 'Dust swallowed the whole courtyard.' } });
    expect(status(next, 'untouched-sentence')).toBe('placed');
    expect(status(next, 'paragraph')).toBe('changed');
    expect(status(next, 'other-paragraph')).toBe('placed');
    expect(next.manuscript.paragraphs[1]).toBe(state.manuscript.paragraphs[1]);

    const kept = keepAttachment(keepAttachment(next, 'sentence'), 'inside');
    expect(status(kept, 'sentence')).toBe('placed');
    expect(kept.attachments.find(attachment => attachment.id === 'sentence')!.anchor).toMatchObject({ text: 'Dust swallowed the whole courtyard.' });
    expect(status(kept, 'inside')).toBe('changed');
  });

  it('splits and merges only the touched sentences, and the first piece keeps its identity', () => {
    const state = setup();
    const split = apply(state, edit(state, span(state.manuscript, 0, 'swallowed the'), 'rose. Smoke filled the'));
    expect(sentenceTexts(split.manuscript.paragraphs[0])).toEqual([
      'The gate split.', 'Dust rose.', 'Smoke filled the courtyard.', '“Get up!” someone shouted.', 'The beast roared again.',
    ]);
    expect(split.manuscript.paragraphs[0].sentences.map(sentence => sentence.id)).toEqual(['s2', 's3', 'new-s1', 's4', 's5']);

    const merged = apply(state, edit(state, span(state.manuscript, 0, 'courtyard. “Get up!” someone shouted'), 'courtyard while someone shouted'));
    expect(sentenceTexts(merged.manuscript.paragraphs[0])).toEqual(['The gate split.', 'Dust swallowed the courtyard while someone shouted.', 'The beast roared again.']);
    expect(merged.manuscript.paragraphs[0].sentences.map(sentence => sentence.id)).toEqual(['s2', 's3', 's5']);
    const gone = attach('spoken', { level: 'sentence', blockId: 'p1', sentenceId: 's4', text: '“Get up!” someone shouted.' });
    expect(resolveAnchor(merged.manuscript, gone.anchor).status).toBe('missing');
  });

  it('restores the exact sentences and attachments when a deletion is undone', () => {
    const state = setup();
    const deletion = edit(state, span(state.manuscript, 0, 'Dust swallowed the courtyard. “Get up!” someone shouted. '), '', 'delete');
    const deleted = apply(state, deletion);
    expect(deleted.manuscript.paragraphs[0].text).toBe('The gate split. The beast roared again.');
    expect(status(deleted, 'inside')).toBe('changed');
    expect(status(deleted, 'sentence')).toBe('missing');
    expect(status(deleted, 'after')).toBe('placed');

    const current = deleted.manuscript.paragraphs[0];
    const restored = apply(deleted, { operation: 'undo', selection: deletion.selection, before: current, after: { ...current, text: deletion.before.text } });
    expect(restored.manuscript.paragraphs[0]).toEqual(state.manuscript.paragraphs[0]);
    for (const attachment of state.attachments) expect(status(restored, attachment.id)).toBe('placed');
    expect([...restored.attachments].sort((left, right) => left.id.localeCompare(right.id)))
      .toEqual([...state.attachments].sort((left, right) => left.id.localeCompare(right.id)));
    expect(restored.deletion).toBeUndefined();
  });

  it('rejects stale edits and freezes a sealed page', () => {
    const state = setup();
    const stale = edit(state, span(state.manuscript, 0, 'gate'), 'door');
    expect(applyPassageEdit(state, { ...stale, before: { ...stale.before, text: 'Other text.' } })).toEqual({ ok: false, reason: 'stale' });

    const flagged = apply(state, edit(state, span(state.manuscript, 0, 'courtyard'), 'yard'));
    expect(sealManuscript(flagged)).toEqual({ ok: false, reason: 'flagged-attachments', count: 3 });
    const resolved: ManuscriptState<string> = { ...flagged, attachments: flagged.attachments.filter(attachment => status(flagged, attachment.id) === 'placed') };
    const sealed = sealManuscript(resolved);
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    expect(sealed.state.manuscript.status).toBe('sealed');
    expect(applyPassageEdit(sealed.state, edit(sealed.state, span(sealed.state.manuscript, 0, 'gate'), 'door'))).toEqual({ ok: false, reason: 'sealed' });
    expect(placeAttachment(sealed.state, attach('late', anchorAtLevel(sealed.state.manuscript, span(sealed.state.manuscript, 0, 'gate'), 'span')!)))
      .toBe(sealed.state);
    expect(insertParagraph(sealed.state.manuscript, 0, 'No.')).toBe(sealed.state.manuscript);
  });
});

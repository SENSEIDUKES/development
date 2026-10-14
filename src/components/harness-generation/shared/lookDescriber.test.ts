import { describe, expect, it } from 'vitest';
import {
  LOOK_PASSAGE_CHARACTERS,
  chapterLooks,
  lookPassage,
  readDescribedLooks,
  type AppearanceAttachment,
  type HarnessLookSubject,
} from '@seihouse/sen/harness-generation';

/** The look step's two plain halves, without a model: the passage it reads, and how its answer is read. */

const appearance = (blockId: string, start: number, text: string): AppearanceAttachment => ({
  id: `appearance:${blockId}:${start}`, kind: 'appearance',
  anchor: { level: 'span', blockId, startOffset: start, endOffset: start + text.length, selectedText: text },
  payload: { origin: 'harness', event: 'appears', subject: { name: 'Old Wu' }, entity: 'character' },
});
const subject = (id: string, entity: HarnessLookSubject['entity'] = 'character'): HarnessLookSubject => ({ id, name: id, entity, event: 'appears', passage: 'A passage.' });

describe('The look step\'s passage', () => {
  it('reads from the tagged sentence to the end of the next paragraph', () => {
    const paragraphs = ['The forge roared. A stooped smith waited.', 'His forearms were scarred by sparks.', 'Far away, a bell rang.'];
    expect(lookPassage({ paragraphs }, appearance('c1-p1', 18, 'A stooped smith waited.'))).toBe('A stooped smith waited.\n\nHis forearms were scarred by sparks.');
  });

  it('stops at the last sentence that fits, and cuts a sentence too long to fit', () => {
    const sentence = 'The smith had a long grey beard that fell to his belt. ';
    const long = sentence.repeat(30).trim();
    const passage = lookPassage({ paragraphs: [long] }, appearance('c1-p1', 0, sentence.trim()));
    expect(passage.length).toBeLessThanOrEqual(LOOK_PASSAGE_CHARACTERS);
    expect(passage.endsWith('belt.')).toBe(true);
    const unbroken = 'x'.repeat(LOOK_PASSAGE_CHARACTERS + 50);
    expect(lookPassage({ paragraphs: [unbroken] }, appearance('c1-p1', 0, unbroken))).toBe(`${'x'.repeat(LOOK_PASSAGE_CHARACTERS)}…`);
  });
});

describe('Reading the look step\'s answer', () => {
  it('keeps only looks it asked about, once each, with only the traits of their kind, in the order asked', () => {
    const subjects = [subject('a1'), subject('a2', 'thing')];
    const looks = readDescribedLooks(JSON.stringify({ looks: [
      { id: 'a2', summary: 'An old iron blade.', traits: { material: 'iron', hair: 'none', colour: 'rust red' } },
      { id: 'a1', summary: '  A stooped   old smith. ', traits: { build: 'stooped', eyes: '', marks: 'x '.repeat(20) }, conflict: 'The author gave him no scars.' },
      { id: 'a1', summary: 'A second answer, never kept.' },
      { id: 'a9', summary: 'Never asked about.' },
      { id: 'a2', summary: '' },
    ] }), subjects);
    expect(looks).toEqual([
      { appearanceId: 'a1', summary: 'A stooped old smith.', traits: { build: 'stooped' }, conflict: 'The author gave him no scars.' },
      { appearanceId: 'a2', summary: 'An old iron blade.', traits: { material: 'iron', colour: 'rust red' } },
    ]);
  });

  it('sets aside a summary that is too long or carries a tag, and an answer that is not a list of looks', () => {
    const subjects = [subject('a1')];
    expect(readDescribedLooks(JSON.stringify({ looks: [{ id: 'a1', summary: 'word '.repeat(31) }] }), subjects)).toEqual([]);
    expect(readDescribedLooks(JSON.stringify({ looks: [{ id: 'a1', summary: '[[look: MC | x]] A smith.' }] }), subjects)).toEqual([]);
    expect(readDescribedLooks('{"fixes":[]}', subjects)).toEqual([]);
    expect(readDescribedLooks('not json', subjects)).toEqual([]);
  });

  it('records what was written, or why nothing was', () => {
    const subjects = [subject('a1')];
    expect(chapterLooks({ subjects, raw: JSON.stringify({ looks: [{ id: 'a1', summary: 'A smith.' }] }), model: 'm', at: 'now' }))
      .toEqual({ status: 'described', at: 'now', model: 'm', looks: [{ appearanceId: 'a1', summary: 'A smith.', traits: {} }] });
    expect(chapterLooks({ subjects, error: 'Busy.', at: 'now' })).toEqual({ status: 'failed', at: 'now', looks: [], problem: 'Busy.' });
    expect(chapterLooks({ subjects, raw: '{}', at: 'now' })).toEqual({ status: 'failed', at: 'now', looks: [], problem: 'The answer held no look that could be read.' });
  });
});

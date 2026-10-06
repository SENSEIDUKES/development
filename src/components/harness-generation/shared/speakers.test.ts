import { describe, expect, it } from 'vitest';
import { readMarks } from '../../../narrative/marks';
import { isMainCharacterTag, isProtagonist, placeSpeakers, protagonistNames } from './speakers';

const CAST = {
  cast: [{ name: 'Wei Lin', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }, { name: 'Elder Mo', role: 'Mentor' }],
  identities: [
    { name: 'Wei Lin', aliases: ['Young Master Wei'], kind: 'character' as const, evidence: 'The main character.' },
    { name: 'Lin Shuang', kind: 'character' as const, evidence: 'His cousin.' },
  ],
};
const MAIN = protagonistNames(CAST, [{ name: 'Wei Lin', aliases: ['the Outer Disciple'], facts: {} }]);

/** Paragraphs as the HARNESS reads them: clean text with the writer's tags. */
const paragraphs = (...texts: string[]) => texts.map((text, index) => ({ blockId: `c1-p${index + 1}`, ...readMarks(text) }));
const placed = (...texts: string[]) => {
  const result = placeSpeakers({ paragraphs: paragraphs(...texts), protagonist: MAIN });
  return { ...result, lines: result.speakers.map(record => [record.anchor.blockId, record.anchor.selectedText, record.payload.speaker, record.payload.protagonist]) };
};

describe('the main character\'s names', () => {
  it('come from the frozen cast, its identity\'s aliases and its canonical aliases', () => {
    expect(MAIN.names).toEqual(['Wei Lin', 'Young Master Wei', 'the Outer Disciple']);
    expect(MAIN.others).toEqual(['Elder Mo', 'Lin Shuang']);
    expect(protagonistNames({ cast: [{ name: 'Elder Mo' }] })).toEqual({ names: [], others: ['Elder Mo'] });
  });

  it('match exactly, or by a part of a name, word for word, that no other character shares', () => {
    expect(isProtagonist('wei lin', MAIN)).toBe(true);
    expect(isProtagonist('Young Master Wei', MAIN)).toBe(true);
    expect(isProtagonist('Wei', MAIN)).toBe(true);
    expect(isProtagonist('Master Wei', MAIN)).toBe(true);
    // "Lin" is also Lin Shuang's: never guessed.
    expect(isProtagonist('Lin', MAIN)).toBe(false);
    expect(isProtagonist('Elder Mo', MAIN)).toBe(false);
    expect(isProtagonist('Wei Lin Shuang', MAIN)).toBe(false);
    expect(isProtagonist('Wei Master', MAIN)).toBe(false);
    expect(isProtagonist('', MAIN)).toBe(false);
  });

  it('match a shortened name of more than one word, as a hyphenated given name reads', () => {
    const hunters = protagonistNames({
      cast: [{ name: 'Sung Jin-Woo', isMainCharacter: true }],
      identities: [{ name: 'Sung Jin-Woo', kind: 'character', evidence: 'The hunter.' }, { name: 'Sung Jin-Ah', kind: 'character', evidence: 'His sister.' }],
    });
    expect(isProtagonist('Jin-Woo', hunters)).toBe(true);
    expect(isProtagonist('jin woo', hunters)).toBe(true);
    // Shared with his sister: never guessed.
    expect(isProtagonist('Sung', hunters)).toBe(false);
    expect(isProtagonist('Jin', hunters)).toBe(false);
    expect(isProtagonist('Jin-Ah', hunters)).toBe(false);
  });
});

describe('the main character\'s own tag', () => {
  it('is [[@MC]], whatever the case or spacing, and always the main character', () => {
    expect(['MC', 'mc', ' Mc ', 'Main Character'].map(isMainCharacterTag)).toEqual([true, true, true, true]);
    expect(['M.C. Lin', 'Mace', 'Wei Lin'].map(isMainCharacterTag)).toEqual([false, false, false]);
    expect(isProtagonist('MC', MAIN)).toBe(true);
    expect(isProtagonist('MC', protagonistNames({}))).toBe(true);
  });
});

describe('placeSpeakers', () => {
  it('gives each spoken line the nearest tag before it, or the paragraph\'s first tag', () => {
    const result = placed(
      '[[@Wei Lin]] “Run!” he shouted. [[@Elder Mo]] “Never.”',
      '“They are drowned,” she whispered. [[@Lin Shuang]]',
    );
    expect(result.lines).toEqual([
      ['c1-p1', '“Run!”', 'Wei Lin', true],
      ['c1-p1', '“Never.”', 'Elder Mo', false],
      ['c1-p2', '“They are drowned,”', 'Lin Shuang', false],
    ]);
    expect(result.speakers[0]).toMatchObject({ id: 'speaker:c1-p1:0-6', kind: 'speaker', anchor: { level: 'span', startOffset: 0, endOffset: 6 }, payload: { origin: 'harness' } });
    expect([result.untagged, result.unused]).toEqual([0, 0]);
  });

  it('keeps the speaker of a speech that runs on into the next paragraph', () => {
    const result = placed('[[@Elder Mo]] “The first oath binds the blood,', '“and the second binds the name.”', '“Who said that?” a voice called.');
    expect(result.lines).toEqual([
      ['c1-p1', '“The first oath binds the blood,', 'Elder Mo', false],
      ['c1-p2', '“and the second binds the name.”', 'Elder Mo', false],
    ]);
    expect(result.untagged).toBe(1);
  });

  it('counts untagged speech and tags with nothing to name', () => {
    const result = placed('“Who goes there?”', '[[@Wei Lin]] He said nothing.');
    expect(result.lines).toEqual([]);
    expect([result.untagged, result.unused]).toEqual([1, 1]);
  });

  it('saves the main character\'s tagged lines under the name the story gives them', () => {
    const result = placed('[[@MC]] “Run!” he shouted. “Now!”', '[[@Elder Mo]] “Never.”', '“The river is rising,” someone said.');
    expect(result.lines).toEqual([
      ['c1-p1', '“Run!”', 'Wei Lin', true],
      ['c1-p1', '“Now!”', 'Wei Lin', true],
      ['c1-p2', '“Never.”', 'Elder Mo', false],
    ]);
    expect(result.untagged).toBe(1);
    // A story that names no main character still voices the tag as theirs.
    const unnamed = placeSpeakers({ paragraphs: paragraphs('[[@MC]] “Hold.”'), protagonist: protagonistNames({}) });
    expect(unnamed.speakers.map(record => [record.payload.speaker, record.payload.protagonist])).toEqual([['Main character', true]]);
  });

  it('keeps the main character\'s own tag through a speech that runs on into the next paragraph', () => {
    const result = placed('[[@MC]] “The gate holds,', '“and so do we.”');
    expect(result.lines).toEqual([
      ['c1-p1', '“The gate holds,', 'Wei Lin', true],
      ['c1-p2', '“and so do we.”', 'Wei Lin', true],
    ]);
  });

  it('is the same every time for the same chapter', () => {
    const chapter = ['[[@Wei Lin]] “Hold.”', '[[@Elder Mo]] “Go.”'];
    expect(placed(...chapter)).toEqual(placed(...chapter));
  });
});

describe('a placeholder copied from a tag form', () => {
  it('counts as no tag, so its lines take their speaker from the narration', () => {
    const result = placed('[[@Name]] “Twenty years,” Bo said. “Twenty years in this mine.”', '[[@Elder Mo]] “Enough.”');
    expect(result.placeholders).toBe(1);
    expect(result.untagged).toBe(2);
    expect(result.lines).toEqual([['c1-p2', '“Enough.”', 'Elder Mo', false]]);
  });

  it('is a real speaker when the story has someone by that name', () => {
    const named = protagonistNames({ cast: [{ name: 'Wei Lin', isMainCharacter: true }, { name: 'Speaker' }] });
    const result = placeSpeakers({ paragraphs: paragraphs('[[@Speaker]] “Order.”'), protagonist: named });
    expect(result.placeholders).toBe(0);
    expect(result.speakers.map(record => record.payload.speaker)).toEqual(['Speaker']);
  });
});

import { describe, expect, it } from 'vitest';
import { readMarks } from '../../../narrative/marks';
import { isProtagonist, placeSpeakers, protagonistNames } from './speakers';

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

  it('match exactly, or by one word of the name that no other character shares', () => {
    expect(isProtagonist('wei lin', MAIN)).toBe(true);
    expect(isProtagonist('Young Master Wei', MAIN)).toBe(true);
    expect(isProtagonist('Wei', MAIN)).toBe(true);
    // "Lin" is also Lin Shuang's: never guessed.
    expect(isProtagonist('Lin', MAIN)).toBe(false);
    expect(isProtagonist('Elder Mo', MAIN)).toBe(false);
    expect(isProtagonist('Wei Lin Shuang', MAIN)).toBe(false);
    expect(isProtagonist('', MAIN)).toBe(false);
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

  it('is the same every time for the same chapter', () => {
    const chapter = ['[[@Wei Lin]] “Hold.”', '[[@Elder Mo]] “Go.”'];
    expect(placed(...chapter)).toEqual(placed(...chapter));
  });
});

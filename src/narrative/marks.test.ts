import { describe, expect, it } from 'vitest';
import { readMarks, stripMarks } from './marks';

const words = (reading: ReturnType<typeof readMarks>) => reading.marks.map(mark => [mark.id, reading.text.slice(mark.start, mark.end)]);

describe('readMarks', () => {
  it('removes span marks and reports where their words sit in the clean text', () => {
    const reading = readMarks('Wei Lin [[1|drew his sword]] as the beast [[2|roared]].');
    expect(reading.text).toBe('Wei Lin drew his sword as the beast roared.');
    expect(words(reading)).toEqual([[1, 'drew his sword'], [2, 'roared']]);
    expect(reading.issues).toEqual([]);
  });

  it('leaves text without marks exactly as it was', () => {
    const plain = 'The sign read [[CLOSED]], and [Level 2] flashed; a lone ]] stays.';
    expect(readMarks(plain)).toEqual({ text: plain, marks: [], issues: [], speakers: [], speakerIssues: [], wordTags: [], wordTagIssues: [] });
  });

  it('reads the slips a writer makes', () => {
    expect(words(readMarks('He [[ 1 | drew his sword ]] fast.'))).toEqual([[1, 'drew his sword']]);
    expect(readMarks('He [[ 1 | drew his sword ]] fast.').text).toBe('He drew his sword fast.');
    expect(words(readMarks('He [[1:drew]] it.'))).toEqual([[1, 'drew']]);
    expect(words(readMarks('He [[1 drew]] it.'))).toEqual([[1, 'drew']]);
    expect(words(readMarks('He [[1|drew his sword] fast.'))).toEqual([[1, 'drew his sword']]);
    expect(words(readMarks('He [1|drew his sword] fast.'))).toEqual([[1, 'drew his sword']]);
    expect(words(readMarks('He [[drew his sword|1]] fast.'))).toEqual([[1, 'drew his sword']]);
    expect(words(readMarks('He [[1st strike|2]] landed.'))).toEqual([[2, '1st strike']]);
    expect(words(readMarks('[[1|2]] blows'))).toEqual([[1, '2']]);
  });

  it('reads full-width brackets, pipes and digits in CJK prose', () => {
    const reading = readMarks('林は［［１｜剣を抜いた］］。');
    expect(reading.text).toBe('林は剣を抜いた。');
    expect(words(reading)).toEqual([[1, '剣を抜いた']]);
    expect(words(readMarks('彼は[[2|剣を抜いた]]。'))).toEqual([[2, '剣を抜いた']]);
  });

  it('removes a point mark without leaving a double space, and reports it', () => {
    expect(readMarks('Wei Lin [[1]] drew his sword.')).toEqual({ text: 'Wei Lin drew his sword.', marks: [], issues: [{ kind: 'point', id: 1 }], speakers: [], speakerIssues: [], wordTags: [], wordTagIssues: [] });
    expect(readMarks('[[3]] Dawn broke.').text).toBe('Dawn broke.');
  });

  it('keeps the words of a mark that never closes', () => {
    expect(readMarks('He [[4|drew his sword as the beast lunged.')).toEqual({
      text: 'He drew his sword as the beast lunged.', marks: [], issues: [{ kind: 'unclosed', id: 4 }], speakers: [], speakerIssues: [],
      wordTags: [], wordTagIssues: [],
    });
  });

  it('counts only the outer span when one opens inside another', () => {
    const reading = readMarks('He [[1|drew [[2|his]] sword]] fast.');
    expect(reading.text).toBe('He drew his sword fast.');
    expect(words(reading)).toEqual([[1, 'drew his sword']]);
    expect(reading.issues).toEqual([{ kind: 'nested', id: 2 }]);
  });

  it('keeps only the first use of a number and reports empty spans', () => {
    const reading = readMarks('[[1|Rain]] fell and [[1|thunder]] rolled [[2|]] on.');
    expect(reading.text).toBe('Rain fell and thunder rolled on.');
    expect(words(reading)).toEqual([[1, 'Rain']]);
    expect(reading.issues).toEqual([{ kind: 'duplicate', id: 1 }, { kind: 'empty', id: 2 }]);
  });

  it('trims the ends and shifts every span with them', () => {
    const reading = readMarks('  [[1|Steel]] rang.  ');
    expect(reading.text).toBe('Steel rang.');
    expect(words(reading)).toEqual([[1, 'Steel']]);
  });

  it('never lets a mark reach the clean text', () => {
    const samples = [
      'A [[1|b]] c [[2]] d [[3|e f', '[[drew|9]] [[10|x] y', '［［７｜剣］］と[[8:盾]]', 'x [[1 [[2|y]] z]] w', '[[999|a]]',
    ];
    for (const sample of samples) expect(readMarks(sample).text).not.toMatch(/[[［]{2}\s*[0-9０-９]/);
  });
});

describe('speaker tags', () => {
  const tags = (reading: ReturnType<typeof readMarks>) => reading.speakers.map(tag => [tag.name, reading.text.slice(tag.offset)]);

  it('removes a tag and reports who speaks the speech that follows it', () => {
    const reading = readMarks('[[@Lin Feng]] “Run!” he shouted. [[@Elder Mo]] “Never.”');
    expect(reading.text).toBe('“Run!” he shouted. “Never.”');
    expect(tags(reading)).toEqual([['Lin Feng', '“Run!” he shouted. “Never.”'], ['Elder Mo', '“Never.”']]);
    expect(reading.issues).toEqual([]);
    expect(reading.speakerIssues).toEqual([]);
  });

  it('reads the slips a writer makes, and full-width CJK brackets', () => {
    expect(tags(readMarks('[[ @ Lin Feng ]] “Run!”'))).toEqual([['Lin Feng', '“Run!”']]);
    expect(tags(readMarks('[[@Lin Feng] “Run!”'))).toEqual([['Lin Feng', '“Run!”']]);
    expect(tags(readMarks('［［＠林］］「行くぞ」'))).toEqual([['林', '「行くぞ」']]);
    expect(tags(readMarks('[@Mara] “Hold the gate.”'))).toEqual([['Mara', '“Hold the gate.”']]);
    // A number written after the name is dropped; words written inside the tag stay.
    expect(readMarks('[[@Mara|1]] “Hold the gate.”').text).toBe('“Hold the gate.”');
    const inside = readMarks('[[@Mara|“Hold the gate.”]] she said.');
    expect(inside.text).toBe('“Hold the gate.” she said.');
    expect(tags(inside)).toEqual([['Mara', '“Hold the gate.” she said.']]);
  });

  it('is read before marks: never a reversed span, and a tag inside a span leaves the span whole', () => {
    const reading = readMarks('The door [[1|slammed [[@Mara]] shut]].');
    expect(reading.text).toBe('The door slammed shut.');
    expect(words(reading)).toEqual([[1, 'slammed shut']]);
    expect(tags(reading)).toEqual([['Mara', 'shut.']]);
    expect(readMarks('[[@Mara|2]] “Go.”').marks).toEqual([]);
  });

  it('removes a tag that names nobody, and leaks nothing', () => {
    for (const sample of ['[[@]] “Go.”', `[[@${'A very long name '.repeat(4)}]] “Go.”`, '[[@Mara “Go.”']) {
      const reading = readMarks(sample);
      expect(reading.text).toBe('“Go.”');
      expect(reading.speakers).toEqual([]);
      expect(reading.speakerIssues).toEqual([{ kind: 'unnamed' }]);
    }
  });

  it('leaves ordinary brackets, emails and untagged names alone', () => {
    for (const plain of ['[Level 2] flashed.', 'The sign read [[CLOSED]].', 'Write to name@example.com today.', '[[Mara]] waited.', 'He said [@Mara] later.']) {
      expect(readMarks(plain)).toEqual({ text: plain, marks: [], issues: [], speakers: [], speakerIssues: [], wordTags: [], wordTagIssues: [] });
    }
  });

  it('never lets a tag reach the clean text', () => {
    const samples = ['[[@A]] x [[@B|y]] z', '［［＠林］］と[[@Mo|3]]', 'x [[1|a [[@B]] b]] [[@C', '[[@]]', '  [[@Mara]]  “Go.”  '];
    for (const sample of samples) expect(readMarks(sample).text).not.toMatch(/[[［]{1,2}\s*[@＠]/);
    expect(readMarks('  [[@Mara]]  “Go.”  ').speakers).toEqual([{ name: 'Mara', offset: 0 }]);
  });

  it('strips tags from fields that carry none', () => {
    expect(stripMarks('Previously, [[@Mara]] Mara held the gate.')).toBe('Previously, Mara held the gate.');
  });
});

describe('word tags', () => {
  /** Each tag as [word, parts, the clean text it points at]. */
  const read = (reading: ReturnType<typeof readMarks>) => reading.wordTags.map(tag => [tag.word, tag.parts, reading.text.slice(tag.offset)]);

  it('removes a tag and reports what it says and the text it points at', () => {
    const reading = readMarks('He searched the rack. [[gained: MC | Rusted Iron Sword]] He took the old blade. [[equipped: MC | Rusted Iron Sword]]');
    expect(reading.text).toBe('He searched the rack. He took the old blade.');
    expect(read(reading)).toEqual([
      ['gained', ['MC', 'Rusted Iron Sword'], 'He took the old blade.'],
      ['equipped', ['MC', 'Rusted Iron Sword'], ''],
    ]);
    expect(reading.wordTagIssues).toEqual([]);
  });

  it('keeps every part, so a count, a level or a reason travels with the tag', () => {
    expect(read(readMarks('[[gained: MC | Spirit Pill | 3]] Three pills.'))).toEqual([['gained', ['MC', 'Spirit Pill', '3'], 'Three pills.']]);
    expect(read(readMarks('[[improved: Wei Lin | Iron Palm | Minor Success]] It flowed.'))).toEqual([['improved', ['Wei Lin', 'Iron Palm', 'Minor Success'], 'It flowed.']]);
  });

  it('reads the slips a writer makes, and keeps another spelling of a tag word', () => {
    expect(read(readMarks('[[ Gained : MC|Sword ]] x'))).toEqual([['gained', ['MC', 'Sword'], 'x']]);
    expect(read(readMarks('[[gained: MC | Sword] x'))).toEqual([['gained', ['MC', 'Sword'], 'x']]);
    expect(read(readMarks('［［gained：MC｜剣］］彼は剣を取った。'))).toEqual([['gained', ['MC', '剣'], '彼は剣を取った。']]);
    expect(read(readMarks('[[Put-Away: MC | Sword]] x'))).toEqual([['unequipped', ['MC', 'Sword'], 'x']]);
    expect(readMarks('[[obtained: MC | Sword]] x').wordTags).toEqual([{ word: 'gained', spelling: 'obtained', parts: ['MC', 'Sword'], offset: 0 }]);
    expect(readMarks('[[consumed: MC | Spirit Pill | 1]] x').wordTags[0]).toMatchObject({ word: 'lost', spelling: 'consumed' });
  });

  it('is never read as a span, and a tag inside a span leaves the span whole', () => {
    const reading = readMarks('He [[1|drew [[equipped: MC | Sword]] his sword]] fast.');
    expect(reading.text).toBe('He drew his sword fast.');
    expect(words(reading)).toEqual([[1, 'drew his sword']]);
    expect(read(reading)).toEqual([['equipped', ['MC', 'Sword'], 'his sword fast.']]);
    expect(readMarks('[[gained: MC | Spirit Pill | 3]] x').marks).toEqual([]);
  });

  it('removes a tag it cannot read, and leaks nothing', () => {
    const cases: Array<[string, string, ReturnType<typeof readMarks>['wordTagIssues']]> = [
      ['[[gained: Sword]] He took it.', 'He took it.', [{ kind: 'incomplete', word: 'gained' }]],
      // It never closed, so where its last part ends is unknown: the sentence it ran into goes with it.
      ['[[gained: MC | Sword He took it. She smiled.', 'She smiled.', [{ kind: 'unclosed', word: 'gained' }]],
      ['[[obtainedd: MC | Sword]] He took it.', 'He took it.', [{ kind: 'unknown', word: 'obtainedd' }]],
    ];
    for (const [sample, text, issues] of cases) {
      const reading = readMarks(sample);
      expect(reading.text).toBe(text);
      expect(reading.wordTags).toEqual([]);
      expect(reading.wordTagIssues).toEqual(issues);
    }
  });

  it('leaves a bracketed note with no pipe and no tag word alone', () => {
    for (const plain of ['The board read [[Note: back soon]].', '[[Wei Lin]] waited.', 'He said: [gained] nothing.']) {
      expect(readMarks(plain)).toEqual({ text: plain, marks: [], issues: [], speakers: [], speakerIssues: [], wordTags: [], wordTagIssues: [] });
    }
  });

  it('never lets a tag reach the clean text', () => {
    const samples = ['[[gained: MC | A]] x [[lost: MC | B | broken]] y', '［［learned：MC｜剣術］］と', 'x [[1|a [[has: MC | B]] b]] [[sealed: MC | C', '[[rank: MC]]', '  [[knows: MC | Iron Palm]]  It.  '];
    for (const sample of samples) expect(readMarks(sample).text).not.toMatch(/[[［]{1,2}\s*[A-Za-z]+\s*[:：]/);
    expect(readMarks('  [[knows: MC | Iron Palm]]  It.  ').wordTags).toEqual([{ word: 'knows', parts: ['MC', 'Iron Palm'], offset: 0 }]);
  });

  it('strips tags from fields that carry none', () => {
    expect(stripMarks('Previously, [[gained: MC | Sword]] Wei Lin took the sword.')).toBe('Previously, Wei Lin took the sword.');
  });
});

describe('stripMarks', () => {
  it('cleans a field that should carry no marks', () => {
    expect(stripMarks('Chapter 3: The [[1|Blade]] Awakens')).toBe('Chapter 3: The Blade Awakens');
  });
});

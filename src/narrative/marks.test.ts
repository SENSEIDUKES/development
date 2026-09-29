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
    expect(readMarks(plain)).toEqual({ text: plain, marks: [], issues: [] });
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
    expect(readMarks('Wei Lin [[1]] drew his sword.')).toEqual({ text: 'Wei Lin drew his sword.', marks: [], issues: [{ kind: 'point', id: 1 }] });
    expect(readMarks('[[3]] Dawn broke.').text).toBe('Dawn broke.');
  });

  it('keeps the words of a mark that never closes', () => {
    expect(readMarks('He [[4|drew his sword as the beast lunged.')).toEqual({
      text: 'He drew his sword as the beast lunged.', marks: [], issues: [{ kind: 'unclosed', id: 4 }],
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

describe('stripMarks', () => {
  it('cleans a field that should carry no marks', () => {
    expect(stripMarks('Chapter 3: The [[1|Blade]] Awakens')).toBe('Chapter 3: The Blade Awakens');
  });
});

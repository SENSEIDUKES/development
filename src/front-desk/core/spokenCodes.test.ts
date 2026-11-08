import { describe, expect, it } from 'vitest';
import { parseSpokenCode as parse, spokenNumber, type SpokenCodeWords } from './spokenCodes';

/** A host's letters: Novel Expanded's, as an example. */
const LETTERS: SpokenCodeWords = {
  N: ['n', 'en', 'and', 'novel', 'story', 'world'],
  C: ['c', 'see', 'sea', 'si', 'chapter'],
  F: ['f', 'ef', 'eff', 'fate', 'path'],
};
const parseSpokenCode = (text: string) => parse(text, LETTERS);

describe('spoken codes', () => {
  it('reads a code however speech recognition writes it down', () => {
    for (const said of ['N3', 'n3', 'n 3', 'N 3.', 'novel 3', 'novel three', 'and three', 'en 3', 'story three', 'world 3'])
      expect(parseSpokenCode(said), said).toEqual({ letter: 'N', number: 3 });
    for (const said of ['C12', 'c 12', 'chapter 12', 'chapter twelve', 'see 12', 'sea twelve'])
      expect(parseSpokenCode(said), said).toEqual({ letter: 'C', number: 12 });
    for (const said of ['F2', 'f 2', 'fate 2', 'fate two', 'path two', 'F too'])
      expect(parseSpokenCode(said), said).toEqual({ letter: 'F', number: 2 });
    expect(parseSpokenCode('chapter one hundred twenty three')).toEqual({ letter: 'C', number: 123 });
    expect(parseSpokenCode('chapter forty-two')).toEqual({ letter: 'C', number: 42 });
  });

  it('reads only a code alone, never ordinary speech or numbers out of range', () => {
    for (const said of ['N0', 'n 1000', 'and', 'novel', 'chapter', 'and then', 'open my energy', 'conflict', 'fate decide', 'see you', 'N3 please', 'x 3', ''])
      expect(parseSpokenCode(said), said).toBeUndefined();
    expect(spokenNumber('twenty one')).toBe(21);
    expect(spokenNumber('zero')).toBeUndefined();
  });

  it('reads only the host\'s own letters', () => {
    expect(parse('N3', {})).toBeUndefined();
    expect(parse('x 3', { X: ['x', 'ex'] })).toEqual({ letter: 'X', number: 3 });
    expect(parse('ex three', { X: ['x', 'ex'] })).toEqual({ letter: 'X', number: 3 });
    expect(parse('q3', LETTERS)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { countWords, isWordBoundary, wholeWordRange, wordAt, wordRanges } from './words';

const slice = (text: string, range?: { start: number; end: number }) => range && text.slice(range.start, range.end);
const LINE = 'Somewhere behind the smoke, “Get up!” Lin Wei’s cross-legged guard drew his sword.';

function checkWords() {
  expect(wordRanges(LINE).map(range => slice(LINE, range)))
    .toEqual(['Somewhere', 'behind', 'the', 'smoke', 'Get', 'up', 'Lin', 'Wei’s', 'cross', 'legged', 'guard', 'drew', 'his', 'sword']);
  // A start or end inside a word widens to the word; edge spaces, quotes and punctuation fall away.
  expect(slice(LINE, wholeWordRange(LINE, 0, 'Somewher'.length))).toBe('Somewhere');
  const quoted = LINE.indexOf('“Get up!”');
  expect(slice(LINE, wholeWordRange(LINE, quoted, quoted + '“Get up!”'.length))).toBe('Get up');
  const drew = LINE.indexOf('drew');
  expect(slice(LINE, wholeWordRange(LINE, drew + 1, LINE.indexOf('sword') + 2))).toBe('drew his sword');
  expect(wholeWordRange(LINE, LINE.indexOf(', '), LINE.indexOf(', ') + 2)).toBeUndefined();
  expect(countWords(LINE, drew, LINE.indexOf('sword') + 5)).toBe(3);
  expect(slice(LINE, wordAt(LINE, drew + 2))).toBe('drew');
  expect(wordAt(LINE, drew - 1)).toBeUndefined();
  expect(isWordBoundary('swords', 5)).toBe(false);
  expect(isWordBoundary('sword s', 5)).toBe(true);
  expect(isWordBoundary(LINE, drew)).toBe(true);
}

describe('word edges', () => {
  it('finds words, snaps ranges to whole words, and counts them', checkWords);

  it('gives the same answers where the runtime has no word segmenter', () => {
    const intl = Intl as { Segmenter?: typeof Intl.Segmenter };
    const segmenter = intl.Segmenter;
    intl.Segmenter = undefined;
    try { checkWords(); } finally { intl.Segmenter = segmenter; }
  });
});

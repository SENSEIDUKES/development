/**
 * Spoken codes: the short names on the Familiar's badges (N3, C12, F2), read
 * from what a reader typed or what speech recognition wrote down, which is
 * rarely "N3": more often "n 3", "novel three", "and three" or "chapter
 * twelve". Only a code alone is read as one; anything else is ordinary speech.
 */

export type SpokenCodeLetter = 'N' | 'C' | 'F';
export interface SpokenCode { letter: SpokenCodeLetter; number: number }

/** How each letter is written down when spoken: the letter, its sound, and the word it stands for. */
const LETTER_WORDS: Record<SpokenCodeLetter, readonly string[]> = {
  N: ['n', 'en', 'and', 'novel', 'story', 'world'],
  C: ['c', 'see', 'sea', 'si', 'chapter'],
  F: ['f', 'ef', 'eff', 'fate', 'path'],
};

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** What speech recognition writes for some numbers alone. */
const SOUNDALIKES: Record<string, number> = { won: 1, to: 2, too: 2, for: 4, fore: 4, ate: 8 };

/** The largest number a code can have. */
export const SPOKEN_CODE_MAX = 999;

/** A number in digits or words, 1 to 999; undefined otherwise. */
export function spokenNumber(text: string): number | undefined {
  const words = text.trim().toLowerCase().replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return undefined;
  if (words.length === 1 && /^\d+$/.test(words[0])) return valid(Number(words[0]));
  if (words.length === 1 && words[0] in SOUNDALIKES) return SOUNDALIKES[words[0]];
  let total = 0;
  let current = 0;
  for (const word of words) {
    if (word === 'and') continue;
    const one = ONES.indexOf(word);
    const ten = TENS.indexOf(word);
    if (one > 0) current += one;
    else if (ten > 1) current += ten * 10;
    else if (word === 'hundred' && current > 0) { total += current * 100; current = 0; }
    else return undefined;
  }
  return valid(total + current);
}

const valid = (value: number) => Number.isInteger(value) && value >= 1 && value <= SPOKEN_CODE_MAX ? value : undefined;

/** The code the reader said, when what they said is only a code: "N3", "n 3", "novel three", "and three", "C12", "fate 2". */
export function parseSpokenCode(text: string): SpokenCode | undefined {
  const said = text.trim().toLowerCase().replace(/[.!?,]+$/, '').trim();
  // Letter and digits written together: "n3", "c12", "f2".
  const joined = /^([ncf])\s*(\d{1,3})$/.exec(said);
  if (joined) {
    const number = valid(Number(joined[2]));
    return number ? { letter: joined[1].toUpperCase() as SpokenCodeLetter, number } : undefined;
  }
  const [first, ...rest] = said.split(/\s+/);
  if (!first || !rest.length) return undefined;
  for (const [letter, words] of Object.entries(LETTER_WORDS) as [SpokenCodeLetter, readonly string[]][]) {
    if (!words.includes(first)) continue;
    const number = spokenNumber(rest.join(' '));
    if (number) return { letter, number };
  }
  return undefined;
}

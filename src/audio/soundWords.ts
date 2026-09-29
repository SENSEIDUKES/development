import { countWords } from '../narrative/words';

/**
 * A sound word: the event a Sound Cue recording answers, in plain lowercase
 * English ("blade drawn"). Media Packs declare their words and every
 * recording names one; a story's words are the only sounds its writer may
 * name. The word says what happened; Studio tags (`audioTags.ts`) say what
 * the recording sounds like.
 */
export interface SoundWord {
  word: string;
  /**
   * One to five words showing the kind of moment that makes this sound
   * ("drew his sword"). The writer is shown it as an example of what to wrap.
   */
  example: string;
  /** A one-line meaning, only when the word needs telling apart from another. */
  meaning?: string;
}

/**
 * Size limits for a story's sound words. They keep the list short enough to
 * travel in the writer's instructions without crowding out its other skills.
 */
export const SOUND_WORD_LIMITS = {
  maxWords: 32,
  wordCharacters: 24,
  exampleWords: 5,
  exampleCharacters: 40,
  meaningCharacters: 60,
} as const;

const SOUND_WORD = /^[a-z]+(?: [a-z]+){0,2}$/;
/** Brackets, pipes, braces, angle brackets, backslashes, line breaks and links never belong in writer-facing sound text. */
const UNSAFE_TEXT = /[[\]{}|<>\\\r\n]|:\/\//;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cleanLine = (value: string) => value.trim().replace(/\s+/g, ' ');

/** One spelling for a sound word: lower case, single spaces, `_` and `-` read as spaces. */
export const normalizeSoundWord = (value: string) => cleanLine(value.toLowerCase().replace(/[_-]+/g, ' '));

/** One to three lowercase English words, at most 24 characters: "bell rings". */
export const isSoundWord = (value: string) =>
  value.length <= SOUND_WORD_LIMITS.wordCharacters && SOUND_WORD.test(value);

/**
 * Reads a declared list of sound words from untrusted data, or throws with the
 * first problem. Words are unique; each example is one to five words of plain
 * text; a meaning, when present, is one short line.
 */
export function validateSoundWords(value: unknown): SoundWord[] {
  if (!Array.isArray(value)) throw new Error('Sound words must be a list.');
  if (value.length > SOUND_WORD_LIMITS.maxWords) {
    throw new Error(`A sound list holds at most ${SOUND_WORD_LIMITS.maxWords} words.`);
  }
  const seen = new Set<string>();
  return value.map((entry, index) => {
    const label = `Sound word ${index + 1}`;
    if (!isPlainObject(entry)) throw new Error(`${label} must be an object.`);
    const unexpected = Object.keys(entry).find(key => !['word', 'example', 'meaning'].includes(key));
    if (unexpected) throw new Error(`${label} has unsupported field ${unexpected}.`);
    const word = typeof entry.word === 'string' ? normalizeSoundWord(entry.word) : '';
    if (!isSoundWord(word)) {
      throw new Error(`${label} must be one to three lowercase English words of at most ${SOUND_WORD_LIMITS.wordCharacters} characters.`);
    }
    if (seen.has(word)) throw new Error(`The sound word "${word}" is declared twice.`);
    seen.add(word);
    const example = typeof entry.example === 'string' ? cleanLine(entry.example) : '';
    const exampleWords = countWords(example, 0, example.length, 'en');
    if (
      !example
      || example.length > SOUND_WORD_LIMITS.exampleCharacters
      || UNSAFE_TEXT.test(example)
      || exampleWords < 1
      || exampleWords > SOUND_WORD_LIMITS.exampleWords
    ) {
      throw new Error(`The example for "${word}" must be one to five words of plain text, at most ${SOUND_WORD_LIMITS.exampleCharacters} characters.`);
    }
    if (entry.meaning === undefined) return { word, example };
    const meaning = typeof entry.meaning === 'string' ? cleanLine(entry.meaning) : '';
    if (!meaning || meaning.length > SOUND_WORD_LIMITS.meaningCharacters || UNSAFE_TEXT.test(meaning)) {
      throw new Error(`The meaning of "${word}" must be one line of plain text, at most ${SOUND_WORD_LIMITS.meaningCharacters} characters.`);
    }
    return { word, example, meaning };
  });
}

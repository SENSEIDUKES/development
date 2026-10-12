import { countWords } from '../narrative/words';

/**
 * A sound word: the event a Sound Cue recording answers, in plain lowercase
 * English ("unsheathe"). Every recording names one. A story keeps its own
 * list of sound words, apart from its recordings (`HarnessStory.soundWords`):
 * they are the only sounds its writer may name, and the writer sees the words
 * alone. The word says what happened; Studio tags (`audioTags.ts`) say what
 * the recording sounds like.
 */
export interface SoundWord {
  word: string;
  /**
   * One to five words showing the kind of moment that makes this sound
   * ("drew his sword"), kept by a recording catalog for the people who curate
   * it. Never shown to the writer, and a story's own words carry none.
   */
  example?: string;
  /** A one-line meaning, only when the word needs telling apart from another. Never shown to the writer. */
  meaning?: string;
}

/**
 * Size limits for a story's sound words. They keep the list short enough to
 * travel in the writer's instructions without crowding out its other skills.
 */
export const SOUND_WORD_LIMITS = {
  maxWords: 30,
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
 * first problem. Words are unique; an example, when present, is one to five
 * words of plain text; a meaning, when present, is one short line.
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
    const described = (example?: string) => {
      if (entry.meaning === undefined) return { word, ...(example ? { example } : {}) };
      const meaning = typeof entry.meaning === 'string' ? cleanLine(entry.meaning) : '';
      if (!meaning || meaning.length > SOUND_WORD_LIMITS.meaningCharacters || UNSAFE_TEXT.test(meaning)) {
        throw new Error(`The meaning of "${word}" must be one line of plain text, at most ${SOUND_WORD_LIMITS.meaningCharacters} characters.`);
      }
      return { word, ...(example ? { example } : {}), meaning };
    };
    if (entry.example === undefined) return described();
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
    return described(example);
  });
}

/**
 * Reads a story's sound words, or a Sound Words pack's, from untrusted data:
 * a list of at most 30 plain words, each spelled as `normalizeSoundWord`
 * spells it, none twice. Throws with the first problem. An empty list is a
 * real choice: the story plays no Sound Cues.
 */
export function validateSoundWordList(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('Sound words must be a list of words.');
  if (value.length > SOUND_WORD_LIMITS.maxWords) {
    throw new Error(`A sound list holds at most ${SOUND_WORD_LIMITS.maxWords} words.`);
  }
  const seen = new Set<string>();
  return value.map((entry, index) => {
    const word = typeof entry === 'string' ? normalizeSoundWord(entry) : '';
    if (!isSoundWord(word)) {
      throw new Error(`Sound word ${index + 1} must be one to three lowercase English words of at most ${SOUND_WORD_LIMITS.wordCharacters} characters.`);
    }
    if (seen.has(word)) throw new Error(`The sound word "${word}" is listed twice.`);
    seen.add(word);
    return word;
  });
}

/**
 * A ready list of sound words a story can start from (a genre's, a host's
 * default, or one installed from a Sound Words package). Choosing one copies
 * its words into the story; editing the story's list never changes it.
 */
export interface SoundWordsPreset {
  /** Stable identity; a package keeps it across versions. */
  id: string;
  /** Each version's words never change once installed. */
  version: string;
  name: string;
  description?: string;
  words: string[];
  /** Where an installed preset came from: the package and the exact file of its words. */
  source?: { packageId: string; packageVersion: string; path: string; sha256: string };
}

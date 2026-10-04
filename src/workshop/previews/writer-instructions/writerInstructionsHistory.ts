import type { WriterInstructionId } from './writerInstructions';

export interface WriterInstructionsChange {
  /** The real calendar date of the change, YYYY-MM-DD. */
  date: string;
  /** What changed and why, in plain words. */
  summary: string;
  /** Each block the change touched, with the fingerprint of its text afterwards (`fingerprintText`). */
  changed: Partial<Record<WriterInstructionId, string>>;
}

/**
 * Every change to the writer's instructions, newest first. A test compares
 * each block's text with the fingerprint its latest entry recorded, so any
 * change to the words the writer reads fails until it is written down here.
 *
 * To record a change: add an entry at the top with today's date, say in plain
 * words what changed and why, and list each changed block with the new
 * fingerprint the failing test names.
 */
export const WRITER_INSTRUCTIONS_HISTORY: readonly WriterInstructionsChange[] = [
  {
    date: '2026-10-04',
    summary: 'The tag instructions were rewritten in one shape for every kind of tag, approved by SENSEI: JOB, FORMAT, REQUIRED, FORBIDDEN and CHECK BEFORE YOU RETURN, with nothing the writer does not need. The rules every tag shares are now said once, as the tag rules. Sound Cues 2.0.0: the writer puts a sound tag on the words where a sound happens ([[sound: Sound Word | Words | Energy]]) instead of a numbered mark and a separate list, a sound may cover up to 8 words, and the sound list is one line per word. Speakers 2.0.0: every chapter including the first, and one speaker per paragraph. Holdings 2.0.0: the same rules, reshaped as a table. The official output requirements now say a sound tag\'s words are the story\'s own.',
    changed: {
      'tag-rules': '13b83835cc36f7',
      'sound-cues': '1cdaa989cc05d5',
      speakers: '1d276b8474ca67',
      holdings: '1e5849138affb8',
      'official-requirements': '0eaedd2928918d',
    },
  },
  {
    date: '2026-10-04',
    summary: 'The history begins. The Author, Fate Survival, Reading Mode instructions and the response contract are recorded as they stand.',
    changed: {
      author: '1d2fa67be9baf8',
      'response-contract': '0a407346f7dec8',
      'fate-survival': '0b97dc7c4c673d',
      'clear-reading': '115ccea68dabbc',
      'easy-read': '00d194ac81946a',
      'literal-reading': '004ed5d7b31f69',
    },
  },
];

/** The latest recorded change to one block. */
export const lastChange = (id: WriterInstructionId) => WRITER_INSTRUCTIONS_HISTORY.find(change => change.changed[id] !== undefined);

import {
  HARNESS_TAG_RULES,
  SEN_FATE_SURVIVAL_SKILL,
  SEN_HOLDINGS_SKILL,
  SEN_NOVEL_AUTHOR_SKILL,
  SEN_READING_MODE_SKILLS,
  SEN_SOUND_CUES_SKILL,
  SEN_SOUNDTRACK_SKILL,
  SEN_SPEAKERS_SKILL,
  assembleCapaPrompt,
  buildHarnessOfficialOutputRequirements,
  presentSoundVocabulary,
  presentSoundtrackVocabulary,
  type HarnessSkillManifest,
} from '@seihouse/sen/harness-generation';
import { soundtrackVocabulary } from '@seihouse/sen/audio';
import { LIBRARY_BASE_MEDIA, LIBRARY_SOUND_WORDS } from '../../../host/media/libraryCatalog';
import { HARNESS_RESPONSE_CONTRACT } from '../../../server/harness-generation/prompt';
import { HOLDINGS_FIXER_INSTRUCTIONS } from '../../../server/harness-generation/holdingsFixer';

/**
 * The writer's instructions, read from the live code: every block of text the
 * chapter writer is given before the story itself, in the order it reads them.
 * Nothing here is a copy, so this page can never drift from what the writer
 * sees. A change to any block must be recorded in the dated history
 * (`writerInstructionsHistory.ts`); a test fails until it is.
 */

export type WriterInstructionId =
  | 'author'
  | 'tag-rules'
  | 'sound-cues'
  | 'soundtrack'
  | 'speakers'
  | 'holdings'
  | 'response-contract'
  | 'fate-survival'
  | 'clear-reading'
  | 'easy-read'
  | 'literal-reading'
  | 'official-requirements'
  | 'holdings-fixer';

export interface WriterInstruction {
  id: WriterInstructionId;
  title: string;
  /** Whose words these are: a SEN skill, with its version, or the HARNESS itself. */
  source: string;
  /** When, and where, the writer reads them. */
  when: string;
  /** The exact text. */
  text: string;
}

const skillSource = (skill: HarnessSkillManifest) => `${skill.name} v${skill.version}`;
const skillText = (skill: HarnessSkillManifest) => skill.instructions!.trim();

/** The story's sound list as the writer sees it, here with the default library a story starts with. */
const DEFAULT_SOUND_LIST = presentSoundVocabulary(LIBRARY_SOUND_WORDS);

/** The story's music moods and atmospheres as the writer sees them, from the default soundscapes and atmospheres. */
const DEFAULT_SOUNDTRACK_WORDS = soundtrackVocabulary(LIBRARY_BASE_MEDIA);

/** Read on every chapter, in this order. */
export const EVERY_CHAPTER: readonly WriterInstruction[] = [
  {
    id: 'author', title: 'Author', source: skillSource(SEN_NOVEL_AUTHOR_SKILL),
    when: 'Every chapter, first. This is SEN\'s default Author; a story may equip another.',
    text: skillText(SEN_NOVEL_AUTHOR_SKILL),
  },
  {
    id: 'tag-rules', title: 'Tag rules', source: 'HARNESS',
    when: 'Every chapter, once, just before the first kind of tag. No skill can change them.',
    text: HARNESS_TAG_RULES,
  },
  {
    id: 'sound-cues', title: 'Sound Cues', source: skillSource(SEN_SOUND_CUES_SKILL),
    when: 'Every chapter of a story with sound words. The list is the story\'s Sound Cue Pack; shown here with the default library.',
    text: `${skillText(SEN_SOUND_CUES_SKILL)}\n${DEFAULT_SOUND_LIST}`,
  },
  {
    id: 'soundtrack', title: 'Soundtrack', source: skillSource(SEN_SOUNDTRACK_SKILL),
    when: 'Every chapter of a story with music or atmospheres. The lists are the story\'s soundscapes and atmospheres; shown here with SEN Soundscapes and SEN Atmospheres, Volume 1.',
    text: `${skillText(SEN_SOUNDTRACK_SKILL)}\n${presentSoundtrackVocabulary(DEFAULT_SOUNDTRACK_WORDS)}`,
  },
  {
    id: 'speakers', title: 'Speakers', source: skillSource(SEN_SPEAKERS_SKILL),
    when: 'Every chapter.',
    text: skillText(SEN_SPEAKERS_SKILL),
  },
  {
    id: 'holdings', title: 'Holdings', source: skillSource(SEN_HOLDINGS_SKILL),
    when: 'Every chapter.',
    text: skillText(SEN_HOLDINGS_SKILL),
  },
  {
    id: 'response-contract', title: 'Response and evidence contract', source: 'HARNESS',
    when: 'Every chapter, last, after every skill. No skill can change it.',
    text: HARNESS_RESPONSE_CONTRACT,
  },
];

/** Read only in some stories, each in its own place among the blocks above. */
export const SOME_STORIES: readonly WriterInstruction[] = [
  {
    id: 'fate-survival', title: 'Fate Survival', source: skillSource(SEN_FATE_SURVIVAL_SKILL),
    when: 'Fate Survival stories, after the Author.',
    text: skillText(SEN_FATE_SURVIVAL_SKILL),
  },
  ...([['clear-reading', 'Clear Reading'], ['easy-read', 'Easy Read'], ['literal-reading', 'Literal Reading']] as const).map(([id, mode]) => ({
    id, title: mode, source: skillSource(SEN_READING_MODE_SKILLS[mode]),
    when: `Stories read in ${mode}, before the tag rules.`,
    text: skillText(SEN_READING_MODE_SKILLS[mode]),
  })),
  {
    id: 'official-requirements', title: 'Official output requirements', source: 'HARNESS',
    when: 'Stories not written in English or read in a Reading Mode, after every skill and before the response contract. Shown at its fullest: a Japanese story with a Translation skill, read in a Reading Mode. Lines a story does not need are left out.',
    text: buildHarnessOfficialOutputRequirements({ originalLanguage: 'ja', accessibility: true, translation: true })!,
  },
];

/** Read after a chapter, by a separate small call: never by the chapter writer. */
export const AFTER_A_CHAPTER: readonly WriterInstruction[] = [
  {
    id: 'holdings-fixer', title: 'Holdings fixer', source: 'HARNESS',
    when: 'After a chapter is saved, only when its holdings checks found problems that need a model: one short call with the chapter\'s model, which reads these instructions and the small cases (a sentence, its tags, what the record shows), never the whole chapter.',
    text: HOLDINGS_FIXER_INSTRUCTIONS,
  },
];

export const WRITER_INSTRUCTIONS: readonly WriterInstruction[] = [...EVERY_CHAPTER, ...SOME_STORIES, ...AFTER_A_CHAPTER];

/**
 * Everything a default English story's writer reads before the story, exactly
 * as the HARNESS assembles it: the CAPA Prompt with the default sound list and
 * soundtrack words, then the response contract. The page's blocks are this text, in this order.
 */
export const defaultSystemInstruction = () => [
  assembleCapaPrompt({
    capturedAt: 'now',
    originalLanguage: 'en',
    skills: [SEN_NOVEL_AUTHOR_SKILL, SEN_SOUND_CUES_SKILL, SEN_SOUNDTRACK_SKILL, SEN_SPEAKERS_SKILL, SEN_HOLDINGS_SKILL],
    soundVocabulary: LIBRARY_SOUND_WORDS,
    soundtrackVocabulary: DEFAULT_SOUNDTRACK_WORDS,
  }).text,
  HARNESS_RESPONSE_CONTRACT,
].join('\n\n');

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * A short, stable fingerprint of a text (cyrb53): the same words always give
 * the same fingerprint, and any change to them gives another.
 */
export const fingerprintText = (text: string) => {
  let first = 0xdeadbeef;
  let second = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
  return (4294967296 * (2097151 & second) + (first >>> 0)).toString(16).padStart(14, '0');
};

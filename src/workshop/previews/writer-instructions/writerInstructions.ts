import {
  HARNESS_TAG_RULES,
  SEN_FATE_SURVIVAL_PLANNING,
  SEN_FATE_SURVIVAL_SKILL,
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
import {
  HARNESS_HARD_RULES,
  HARNESS_READING_GUIDE,
  HARNESS_RETURN_FORMAT,
  HARNESS_ROLE,
  HARNESS_WRITING_RULES,
  composeHarnessSystemInstruction,
  type HarnessPromptPart,
} from '../../../server/harness-generation/prompt';
import {
  CHAPTER_PLANNER_HARD_RULES,
  CHAPTER_PLANNER_HEADINGS,
  CHAPTER_PLANNER_READING_GUIDE,
  CHAPTER_PLANNER_ROLE,
  CHAPTER_PLANNER_RULES,
  composeChapterPlannerInstruction,
} from '../../../server/harness-generation/chapterPlanner';

/**
 * The instructions of a chapter's two calls, read from the live code (SENSEI,
 * 2026-10-20: the chapter loop): every block of text the planner is given
 * before the story, then every block the writer is, each in the order it
 * reads them. Nothing here is a copy, so this page can never drift from what
 * either call sees. A change to any block must be recorded in the dated
 * history (`writerInstructionsHistory.ts`); a test fails until it is.
 */

export type WriterInstructionId =
  | 'planner-role'
  | 'planner-reading-guide'
  | 'planner-rules'
  | 'planner-hard-rules'
  | 'fate-survival-planning'
  | 'role'
  | 'author'
  | 'writing-rules'
  | 'tag-rules'
  | 'sound-cues'
  | 'soundtrack'
  | 'speakers'
  /** Retired 2026-10-20: the plan records what someone has; nothing is tagged for the record. */
  | 'holdings'
  /** Retired 2026-10-20: the plan casts everyone, with their look. */
  | 'appearance'
  | 'reading-guide'
  | 'return-format'
  | 'hard-rules'
  /** Retired 2026-10-16: split into the role, writing rules, reading guide, return format and hard rules. */
  | 'response-contract'
  | 'fate-survival'
  | 'clear-reading'
  | 'easy-read'
  | 'literal-reading'
  | 'official-requirements'
  /** Retired 2026-10-20 with the holdings tags. */
  | 'holdings-fixer'
  /** Retired 2026-10-20: Manifest draws the look the plan gave. */
  | 'look-step';

/** The parts of the planner's prompt, in the order it reads them. */
export type PlannerPromptPart = 'role' | 'reading' | 'planning' | 'hardRules';
export const PLANNER_PROMPT_PARTS: readonly PlannerPromptPart[] = ['role', 'reading', 'planning', 'hardRules'];

export interface WriterInstruction {
  id: WriterInstructionId;
  title: string;
  /** The part of the chapter writer's prompt the block sits in (`HARNESS_PROMPT_PARTS`). */
  part?: HarnessPromptPart;
  /** The part of the planner's prompt the block sits in. */
  plannerPart?: PlannerPromptPart;
  /** Whose words these are: a SEN skill, with its version, or the HARNESS itself. */
  source: string;
  /** When, and where, the writer reads them. */
  when: string;
  /** The exact text. */
  text: string;
}

const skillSource = (skill: HarnessSkillManifest) => `${skill.name} v${skill.version}`;
const skillText = (skill: HarnessSkillManifest) => skill.instructions!.trim();

/** The story's sound list as the writer sees it, here with the Library's preset a new story starts with. */
const DEFAULT_SOUND_LIST = presentSoundVocabulary(LIBRARY_SOUND_WORDS);

/** The story's music and atmosphere categories as the writer sees them, from the default soundscapes and atmospheres. */
const DEFAULT_SOUNDTRACK_WORDS = soundtrackVocabulary(LIBRARY_BASE_MEDIA);

/** The planner reads these before every chapter, in this order (SENSEI, 2026-10-20). */
export const PLANNER: readonly WriterInstruction[] = [
  {
    id: 'planner-role', title: 'Role and mission', source: 'HARNESS', plannerPart: 'role',
    when: 'Every chapter, first: the planner is Fate, and decides what happens before the chapter is written. No skill can change it.',
    text: CHAPTER_PLANNER_ROLE,
  },
  {
    id: 'planner-reading-guide', title: 'How to read the story information', source: 'HARNESS', plannerPart: 'reading',
    when: 'Every chapter: what each section of the story information, the Codex and this chapter\'s request means. No skill can change it.',
    text: CHAPTER_PLANNER_READING_GUIDE,
  },
  {
    id: 'planner-rules', title: 'How to plan the chapter', source: 'HARNESS', plannerPart: 'planning',
    when: 'Every chapter, closing How to plan the chapter, after the planner\'s skills (Pacing, Fate Survival\'s planning half and Continuity, when a story has them): the cast, the events, the facts, the arc goal and the end. No skill can change it.',
    text: CHAPTER_PLANNER_RULES,
  },
  {
    id: 'planner-hard-rules', title: 'Hard rules', source: 'HARNESS', plannerPart: 'hardRules',
    when: 'Every chapter, last in the planner\'s instructions. No skill can change them.',
    text: CHAPTER_PLANNER_HARD_RULES,
  },
];

/** The writer reads these on every chapter, in this order. */
export const EVERY_CHAPTER: readonly WriterInstruction[] = [
  {
    id: 'role', title: 'Role and mission', source: 'HARNESS', part: 'role',
    when: 'Every chapter, first: who the writer is and its job. No skill can change it.',
    text: HARNESS_ROLE,
  },
  {
    id: 'author', title: 'Author', source: skillSource(SEN_NOVEL_AUTHOR_SKILL), part: 'writing',
    when: 'Every chapter, first under How to write, before the other writing skills. This is SEN\'s default Author; a story may equip another.',
    text: skillText(SEN_NOVEL_AUTHOR_SKILL),
  },
  {
    id: 'writing-rules', title: 'HARNESS writing rules', source: 'HARNESS', part: 'writing',
    when: 'Every chapter, closing How to write, after every writing skill. No skill can change them.',
    text: HARNESS_WRITING_RULES,
  },
  {
    id: 'tag-rules', title: 'Tag rules', source: 'HARNESS', part: 'tagging',
    when: 'Every chapter with a tag skill, first under How to tag. No skill can change them.',
    text: HARNESS_TAG_RULES,
  },
  {
    id: 'sound-cues', title: 'Sound Cues', source: skillSource(SEN_SOUND_CUES_SKILL), part: 'tagging',
    when: 'Every chapter of a story with sound words. The list is the story\'s own Sound Words that a recording plays; shown here with the Library\'s preset a new story starts with.',
    text: `${skillText(SEN_SOUND_CUES_SKILL)}\n${DEFAULT_SOUND_LIST}`,
  },
  {
    id: 'soundtrack', title: 'Soundtrack', source: skillSource(SEN_SOUNDTRACK_SKILL), part: 'tagging',
    when: 'Every chapter of a story with music or atmospheres. The lists are the story\'s music and atmosphere categories; shown here with SEN Soundscapes and SEN Atmospheres, Volume 1.',
    text: `${skillText(SEN_SOUNDTRACK_SKILL)}\n${presentSoundtrackVocabulary(DEFAULT_SOUNDTRACK_WORDS)}`,
  },
  {
    id: 'speakers', title: 'Speakers', source: skillSource(SEN_SPEAKERS_SKILL), part: 'tagging',
    when: 'Every chapter.',
    text: skillText(SEN_SPEAKERS_SKILL),
  },
  {
    id: 'reading-guide', title: 'How to read the story information', source: 'HARNESS', part: 'reading',
    when: 'Every chapter: what each section of the story information and the chapter request means. No skill can change it.',
    text: HARNESS_READING_GUIDE,
  },
  {
    id: 'return-format', title: 'How to return the chapter', source: 'HARNESS', part: 'returning',
    when: 'Every chapter. No skill can change it.',
    text: HARNESS_RETURN_FORMAT,
  },
  {
    id: 'hard-rules', title: 'Hard rules', source: 'HARNESS', part: 'hardRules',
    when: 'Every chapter, last in the instructions. No skill can change them.',
    text: HARNESS_HARD_RULES,
  },
];

/** Read only in some stories, each in its own place among the blocks above. */
export const SOME_STORIES: readonly WriterInstruction[] = [
  {
    id: 'fate-survival-planning', title: 'Fate Survival: planning', source: skillSource(SEN_FATE_SURVIVAL_SKILL), plannerPart: 'planning',
    when: 'Fate Survival stories: the planner reads it under How to plan the chapter, before the HARNESS\'s own rules.',
    text: SEN_FATE_SURVIVAL_PLANNING,
  },
  {
    id: 'fate-survival', title: 'Fate Survival: writing', source: skillSource(SEN_FATE_SURVIVAL_SKILL), part: 'writing',
    when: 'Fate Survival stories: the writer reads it under How to write, after the Author.',
    text: skillText(SEN_FATE_SURVIVAL_SKILL),
  },
  ...([['clear-reading', 'Clear Reading'], ['easy-read', 'Easy Read'], ['literal-reading', 'Literal Reading']] as const).map(([id, mode]) => ({
    id, title: mode, source: skillSource(SEN_READING_MODE_SKILLS[mode]), part: 'writing' as const,
    when: `Stories read in ${mode}, under How to write, after the other writing skills.`,
    text: skillText(SEN_READING_MODE_SKILLS[mode]),
  })),
  {
    id: 'official-requirements', title: 'Official output requirements', source: 'HARNESS', part: 'writing',
    when: 'Stories not written in English or read in a Reading Mode, under How to write, after every writing skill and before the HARNESS writing rules. Shown at its fullest: a Japanese story with a Translation skill, read in a Reading Mode. Lines a story does not need are left out.',
    text: buildHarnessOfficialOutputRequirements({ originalLanguage: 'ja', accessibility: true, translation: true })!,
  },
];

export const WRITER_INSTRUCTIONS: readonly WriterInstruction[] = [...PLANNER, ...EVERY_CHAPTER, ...SOME_STORIES];

/** Blocks no longer read, kept so the history can still name them. */
export const RETIRED_WRITER_INSTRUCTIONS: ReadonlyMap<WriterInstructionId, string> = new Map([
  ['response-contract', 'Response and evidence contract (retired)'],
  ['holdings', 'Holdings (retired)'],
  ['appearance', 'Appearance (retired)'],
  ['holdings-fixer', 'Holdings fixer (retired)'],
  ['look-step', 'Look writer (retired)'],
]);

/** The heading of each part of the planner's prompt. */
export const PLANNER_PART_HEADINGS: Readonly<Record<PlannerPromptPart, string>> = {
  role: CHAPTER_PLANNER_HEADINGS.role,
  reading: CHAPTER_PLANNER_HEADINGS.reading,
  planning: CHAPTER_PLANNER_HEADINGS.planning,
  hardRules: CHAPTER_PLANNER_HEADINGS.hardRules,
};

/** Everything a Regular Reader story's planner reads before the story, exactly as the HARNESS assembles it. */
export const defaultPlannerInstruction = () => composeChapterPlannerInstruction();

/**
 * Everything a default English story's writer reads before the story, exactly
 * as the HARNESS assembles it: the CAPA Prompt with the default sound list and
 * soundtrack categories, in the HARNESS's skeleton. The page's blocks are this
 * text, in this order, under the skeleton's headings.
 */
export const defaultSystemInstruction = () => composeHarnessSystemInstruction(assembleCapaPrompt({
  capturedAt: 'now',
  originalLanguage: 'en',
  skills: [SEN_NOVEL_AUTHOR_SKILL, SEN_SOUND_CUES_SKILL, SEN_SOUNDTRACK_SKILL, SEN_SPEAKERS_SKILL],
  soundVocabulary: LIBRARY_SOUND_WORDS,
  soundtrackVocabulary: DEFAULT_SOUNDTRACK_WORDS,
}));

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

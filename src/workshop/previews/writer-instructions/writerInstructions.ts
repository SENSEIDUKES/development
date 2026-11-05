import {
  HARNESS_TAG_RULES,
  SEN_APPEARANCE_INSTRUCTIONS,
  SEN_FATE_SURVIVAL_SKILL,
  SEN_HOLDINGS_INSTRUCTIONS,
  SEN_NOVEL_AUTHOR_SKILL,
  SEN_READING_MODE_SKILLS,
  SEN_SOUND_CUES_INSTRUCTIONS,
  SEN_SOUNDTRACK_INSTRUCTIONS,
  SEN_SPEAKERS_INSTRUCTIONS,
  SEN_STATUS_INSTRUCTIONS,
  SEN_PLACE_INSTRUCTIONS,
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
import { HOLDINGS_FIXER_INSTRUCTIONS } from '../../../server/harness-generation/holdingsFixer';
import { WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS } from '../../../server/story-seed-blueprint/prompt';
import { HARNESS_TAGGER_RETURN, HARNESS_TAGGER_ROLE } from '../../../server/harness-generation/tagger';
import { LOOK_DESCRIBER_INSTRUCTIONS } from '../../../server/harness-generation/lookDescriber';

/**
 * The writer's instructions, read from the live code: every block of text the
 * chapter writer is given before the story itself, in the order it reads them.
 * Nothing here is a copy, so this page can never drift from what the writer
 * sees. A change to any block must be recorded in the dated history
 * (`writerInstructionsHistory.ts`); a test fails until it is.
 */

export type WriterInstructionId =
  | 'role'
  | 'author'
  | 'writing-rules'
  | 'tag-rules'
  | 'sound-cues'
  | 'soundtrack'
  | 'speakers'
  | 'holdings'
  | 'appearance'
  | 'status'
  | 'place'
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
  | 'holdings-fixer'
  | 'look-step'
  | 'tagger'
  | 'world-builder';

export interface WriterInstruction {
  id: WriterInstructionId;
  title: string;
  /** The part of the chapter writer's prompt the block sits in (`HARNESS_PROMPT_PARTS`); absent for the small calls after a chapter. */
  part?: HarnessPromptPart;
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

/** Read on every chapter, in this order. */
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
    id: 'fate-survival', title: 'Fate Survival', source: skillSource(SEN_FATE_SURVIVAL_SKILL), part: 'writing',
    when: 'Fate Survival stories, under How to write, after the Author.',
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

/** Read before the story exists, by the call that builds its world: never by the chapter writer. */
export const BEFORE_THE_STORY: readonly WriterInstruction[] = [
  {
    id: 'world-builder', title: 'World builder: the world at Chapter 0', source: 'HARNESS',
    when: 'Once, when a World Blueprint is generated from a Story Seed, before the story begins. These words tell the Blueprint model to fill every Codex card the world opens with, slot by slot, and are read beside the Seed itself and the Blueprint\'s other rules (the logline, Arc 1, the style bible).',
    text: WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS,
  },
];

/** Read after a chapter, by a separate small call: never by the chapter writer. */
export const AFTER_A_CHAPTER: readonly WriterInstruction[] = [
  {
    id: 'holdings-fixer', title: 'Fixer', source: 'HARNESS',
    when: 'After a chapter is saved, only when its checks found problems that need a model (its holdings; someone who speaks but never appeared; a name no card has that shares a word with a character\'s; someone dead who speaks or acts; someone who acts after the chapter names another place than the one the record has them in): one short call with the chapter\'s model, which reads these instructions and the small cases (a sentence, its tags, what the record shows), never the whole chapter.',
    text: HOLDINGS_FIXER_INSTRUCTIONS,
  },
  {
    id: 'tagger', title: 'Chapter tagger', source: 'HARNESS',
    when: 'After a chapter is written: one call that reads the finished chapter and writes the app\'s tags for it as notes in the margin (a paragraph, the exact words, the tag), never handing the chapter back. It reads these words, the tag teaching below, who and what the story already has, and what each character was carrying. It is told nothing about how the story got here: no Foundation, no arc, no Destined Ending, no Story Information Packet, so it tags a chapter an author wrote themselves exactly as well as a generated one (SENSEI, 2026-10-24).',
    text: [HARNESS_TAGGER_ROLE, HARNESS_TAGGER_RETURN].join('\n\n'),
  },
  {
    id: 'tag-rules', title: 'Tag rules', source: 'HARNESS',
    when: 'Every chapter the tagger reads, first among the tags: what holds for every kind. No skill can change them.',
    text: HARNESS_TAG_RULES,
  },
  {
    id: 'speakers', title: 'Speakers', source: 'HARNESS',
    when: 'Every chapter the tagger reads.',
    text: SEN_SPEAKERS_INSTRUCTIONS,
  },
  {
    id: 'holdings', title: 'Holdings', source: 'HARNESS',
    when: 'Every chapter the tagger reads.',
    text: SEN_HOLDINGS_INSTRUCTIONS,
  },
  {
    id: 'appearance', title: 'Appearance', source: 'HARNESS',
    when: 'Every chapter the tagger reads.',
    text: SEN_APPEARANCE_INSTRUCTIONS,
  },
  {
    id: 'status', title: 'Status', source: 'HARNESS',
    when: 'Every chapter the tagger reads. The tagger is told each character\'s status so far beside their name.',
    text: SEN_STATUS_INSTRUCTIONS,
  },
  {
    id: 'place', title: 'Place', source: 'HARNESS',
    when: 'Every chapter the tagger reads. The tagger is told each character\'s place so far beside their name, and the story\'s places under PLACES.',
    text: SEN_PLACE_INSTRUCTIONS,
  },
  {
    id: 'sound-cues', title: 'Sound Cues', source: 'HARNESS',
    when: 'Every chapter of a story with sound words. The list is the story\'s own Sound Words that a recording plays; shown here with the Library\'s preset a new story starts with.',
    text: `${SEN_SOUND_CUES_INSTRUCTIONS}\n${DEFAULT_SOUND_LIST}`,
  },
  {
    id: 'soundtrack', title: 'Soundtrack', source: 'HARNESS',
    when: 'Every chapter of a story with music or atmospheres. The lists are the story\'s music and atmosphere categories; shown here with SEN Soundscapes and SEN Atmospheres, Volume 1.',
    text: `${SEN_SOUNDTRACK_INSTRUCTIONS}\n${presentSoundtrackVocabulary(DEFAULT_SOUNDTRACK_WORDS)}`,
  },
  {
    id: 'look-step', title: 'Look writer', source: 'HARNESS',
    when: 'Never after a chapter: only when something made from the story needs one entry\'s full look (a picture, a manga, a game) and the look kept on its Codex entry is missing or a newer tag changed it. One short call with the latest chapter\'s model, which reads these instructions and every passage that shows that one entry (with the author\'s notes on a character), never a whole chapter.',
    text: LOOK_DESCRIBER_INSTRUCTIONS,
  },
];

export const WRITER_INSTRUCTIONS: readonly WriterInstruction[] = [...EVERY_CHAPTER, ...SOME_STORIES, ...BEFORE_THE_STORY, ...AFTER_A_CHAPTER];

/** Blocks no longer read, kept so the history can still name them. */
export const RETIRED_WRITER_INSTRUCTIONS: ReadonlyMap<WriterInstructionId, string> = new Map([
  ['response-contract', 'Response and evidence contract (retired)'],
]);

/**
 * Everything a default English story's writer reads before the story, exactly
 * as the HARNESS assembles it: the CAPA Prompt in the HARNESS's skeleton. The
 * page's blocks are this text, in this order, under the skeleton's headings.
 */
export const defaultSystemInstruction = () => composeHarnessSystemInstruction(assembleCapaPrompt({
  capturedAt: 'now',
  originalLanguage: 'en',
  skills: [SEN_NOVEL_AUTHOR_SKILL],
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

export type PipelineStepId = 'world' | 'writer' | 'tagger' | 'fixer' | 'look';

/** One model call in the story's pipeline, with every block it reads. */
export interface PipelineStep {
  id: PipelineStepId;
  name: string;
  /** When it runs, in a few words. */
  runs: string;
  /** Its job, in one plain sentence. */
  job: string;
  /** What it is given, besides the instructions below. */
  reads: readonly string[];
  /** What it hands back, and where that goes. */
  gives: readonly string[];
  /** Its instructions, in the order it reads them; a step with stories that differ shows them as a second group. */
  groups: ReadonlyArray<{ label: string; blocks: readonly WriterInstruction[] }>;
}

const blocksOf = (ids: readonly WriterInstructionId[]) => ids.map(id => WRITER_INSTRUCTIONS.find(block => block.id === id)!);

/**
 * The story's model calls, in the order a story meets them (SENSEI,
 * 2026-11-05: "I have no workspace or nothing to be able to see what we're
 * telling this model for each specific tag … how the pipeline feeds into each
 * other"). Every block of the page belongs to exactly one step.
 */
export const PIPELINE: readonly PipelineStep[] = [
  {
    id: 'world', name: 'World builder', runs: 'Once, before Chapter 1',
    job: 'Builds the world the story opens with: every character, thing, ability, place and faction card in the Codex.',
    reads: ['The Story Seed you wrote', 'The World Blueprint\'s other rules (logline, Arc 1, style)'],
    gives: ['The World at Chapter 0: the Codex cards the story starts with → read by the Writer every chapter'],
    groups: [{ label: 'What it reads', blocks: blocksOf(['world-builder']) }],
  },
  {
    id: 'writer', name: 'Writer', runs: 'Every chapter',
    job: 'Writes the chapter. It never writes tags.',
    reads: [
      'The Story Information: Foundation, Destined Ending, the arc goal, recaps of earlier chapters',
      'The Codex as it stands now: who has appeared and how they look, their status, where they are, what they hold',
      'The chapter request (the reader\'s direction, when there is one)',
    ],
    gives: ['The chapter\'s paragraphs → read by the Tagger', 'A short recap → read by later chapters', 'A list of what the main character holds at the end → checked against the Tagger\'s tags'],
    groups: [
      { label: 'Every chapter, in order', blocks: EVERY_CHAPTER },
      { label: 'Only in some stories', blocks: SOME_STORIES },
    ],
  },
  {
    id: 'tagger', name: 'Tagger', runs: 'After every chapter',
    job: 'Reads the finished chapter and writes its tags in the margin. It never changes a word.',
    reads: [
      'The finished chapter, paragraph by paragraph',
      'Who and what the story already has, each character with their status and place so far',
      'What each character was carrying going into the chapter',
      'The story\'s sound words, music and atmospheres',
    ],
    gives: ['Tags on the chapter: who speaks, what is held, who appears, status, place, sounds, music → checked by code, then saved into the Codex'],
    groups: [{ label: 'What it reads, in order', blocks: blocksOf(['tagger', 'tag-rules', 'speakers', 'holdings', 'appearance', 'status', 'place', 'sound-cues', 'soundtrack']) }],
  },
  {
    id: 'fixer', name: 'Fixer', runs: 'Only when the checks find a problem',
    job: 'Settles the small problems plain code found in the chapter\'s tags.',
    reads: ['Only the cases: one sentence, its tags, and what the Codex says. Never the whole chapter.'],
    gives: ['For each case: fix the tags, rewrite one sentence, leave it, or flag it as major → saved into the Codex'],
    groups: [{ label: 'What it reads', blocks: blocksOf(['holdings-fixer']) }],
  },
  {
    id: 'look', name: 'Look writer', runs: 'Only when something asks for a look',
    job: 'Writes one Codex entry\'s full look, for a picture, a manga or a game.',
    reads: ['Every sentence the tags saved for that one entry (and your notes on a character)'],
    gives: ['That entry\'s look, trait by trait → kept on its Codex card'],
    groups: [{ label: 'What it reads', blocks: blocksOf(['look-step']) }],
  },
];

/** Where plain code, not a model, checks the tags: between the Tagger and the Fixer. */
export const PIPELINE_CHECKS = { name: 'Checks', runs: 'No model', after: 'tagger' as PipelineStepId };

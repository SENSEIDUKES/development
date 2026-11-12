import {
  HARNESS_TAG_RULES,
  SEN_APPEARANCE_INSTRUCTIONS,
  SEN_FATE_SURVIVAL_SKILL,
  SEN_HOLDINGS_INSTRUCTIONS,
  SEN_ARC_PLANNER_SKILL,
  SEN_EASTERN_FANTASY_ORIGIN_SKILL,
  SEN_NOVEL_AUTHOR_SKILL,
  SEN_WORLD_BUILDER_SKILL,
  SEN_READING_MODE_SKILLS,
  SEN_SOUND_CUES_INSTRUCTIONS,
  SEN_SOUNDTRACK_INSTRUCTIONS,
  SEN_SPEAKERS_INSTRUCTIONS,
  SEN_STATUS_INSTRUCTIONS,
  SEN_PLACE_INSTRUCTIONS,
  SEN_TIE_INSTRUCTIONS,
  SEN_SETTING_INSTRUCTIONS,
  HARNESS_CHAPTER_TARGET_MAX_WORDS,
  HARNESS_CHAPTER_TARGET_MIN_WORDS,
  assembleCapaPrompt,
  buildMissionReminder,
  harnessChapterParagraphTarget,
  buildHarnessOfficialOutputRequirements,
  presentSoundVocabulary,
  presentSoundtrackVocabulary,
  type HarnessSkillManifest,
} from '@seihouse/sen/harness-generation';
import { createEmptyStorySeedInput, type StoryStyle } from '@seihouse/sen/story-seed';
import { soundtrackVocabulary } from '@seihouse/sen/audio';
import { LIBRARY_BASE_MEDIA, LIBRARY_SOUND_WORDS } from '../../../host/media/libraryCatalog';
import {
  HARNESS_HARD_RULES,
  HARNESS_READING_GUIDE,
  HARNESS_RETURN_FORMAT,
  HARNESS_ROLE,
  HARNESS_WRITING_RULES,
  buildHarnessChapterResponseSchema,
  composeHarnessSystemInstruction,
  composeHarnessUserPrompt,
  presentImmediateChapterRequest,
  type HarnessPromptPart,
} from '../../../server/harness-generation/prompt';
import { HOLDINGS_FIXER_INSTRUCTIONS, buildHoldingsFixerPrompt } from '../../../server/harness-generation/holdingsFixer';
import { BLUEPRINT_PERMANENT_RULES, BLUEPRINT_PROMPT_HEADINGS, WORLD_BLUEPRINT_SYSTEM_PROMPT, blueprintRole, buildWorldBlueprintPrompt, worldBlueprintResponseSchema } from '../../../server/story-seed-blueprint/prompt';
import { OFFICIAL_CAPA_DEFAULT_REFERENCES, OFFICIAL_STYLE_REFERENCES } from '../../../host/generation/capa/officialCapaSkills';
import { HARNESS_TAGGER_RETURN, HARNESS_TAGGER_ROLE, buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { LOOK_DESCRIBER_INSTRUCTIONS, buildLookDescriberPrompt } from '../../../server/harness-generation/lookDescriber';
import { buildStorySparkPrompt, STORY_SPARK_RESPONSE_SCHEMA } from '../../../server/story-spark/prompt';

/**
 * The writer's instructions, read from the live code: every block of text the
 * chapter writer is given before the story itself, in the order it reads them.
 * Nothing here is a copy, so this page can never drift from what the writer
 * sees. A change to any block must be recorded in the dated history
 * (`writerInstructionsHistory.ts`); a test fails until it is.
 */

export type WriterInstructionId =
  | 'story-spark-system'
  | 'story-spark-requests'
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
  | 'ties'
  | 'setting'
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
  /** Retired 2026-11-05: split into the Origin, World and Arc skills and the Blueprint's permanent rules. */
  | 'world-builder'
  | 'blueprint-role'
  | 'origin-skill'
  | 'world-skill'
  | 'arc-skill'
  | 'blueprint-rules';

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
    id: 'author', title: 'SEN Novel Author', source: skillSource(SEN_NOVEL_AUTHOR_SKILL), part: 'writing',
    when: 'Only a story that never chose an Author: one started in the Workshop without a Story Seed, or an older story. Every story made in Novel Expanded reads CAPA AUTHOR instead, with Pacing, Continuity and its Style (above).',
    text: skillText(SEN_NOVEL_AUTHOR_SKILL),
  },
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

/**
 * Read before the story exists, by the Blueprint: never by the chapter
 * writer. Who it is, its Origin, World and Arc skills, then the rules no skill
 * can replace (SENSEI, 2026-11-05), in the writer's skeleton (2026-11-06).
 */
export const BEFORE_THE_STORY: readonly WriterInstruction[] = [
  {
    id: 'blueprint-role', title: 'Role and mission', source: 'HARNESS',
    when: 'Once, when a Blueprint is generated from a Story Seed, before the story begins; read first. Who it is, in SEN\'s own identity word for word, and its job.',
    text: `${BLUEPRINT_PROMPT_HEADINGS.role}\n\n${blueprintRole()}`,
  },
  {
    id: 'origin-skill', title: 'Origin', source: skillSource(SEN_EASTERN_FANTASY_ORIGIN_SKILL),
    when: 'Every Blueprint, first under How to build. The kind of fiction the world is built in: its tradition, names, style bible and trope rules. A replaceable skill: a publisher who licenses SEN can give its own Origin, such as Western Fantasy.',
    text: skillText(SEN_EASTERN_FANTASY_ORIGIN_SKILL),
  },
  {
    id: 'world-skill', title: 'World', source: skillSource(SEN_WORLD_BUILDER_SKILL),
    when: 'Every Blueprint, after the Origin: how to build the world as Chapter 1 opens, and what each of the main character\'s own slots means. A replaceable skill.',
    text: skillText(SEN_WORLD_BUILDER_SKILL),
  },
  {
    id: 'arc-skill', title: 'Arc', source: skillSource(SEN_ARC_PLANNER_SKILL),
    when: 'Every Blueprint, after the World: the Destined Ending and the story\'s length first, then Arc 1 and the look-ahead. A replaceable skill. Arcs after Arc 1 are planned later by their own call, which does not read it yet.',
    text: skillText(SEN_ARC_PLANNER_SKILL),
  },
  {
    id: 'blueprint-rules', title: 'Blueprint rules', source: 'HARNESS',
    when: 'Every Blueprint, after its three skills, whichever skills it reads: how to read the Story Seed (the creator\'s words win), how to return the Blueprint (one name for one thing across the cards, how lists are written, and every Codex card slot by slot), and the hard rules. No skill can change them.',
    text: BLUEPRINT_PERMANENT_RULES,
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
    when: 'Every chapter the tagger reads. The tagger is told what each character carries so far beside their name.',
    text: SEN_STATUS_INSTRUCTIONS,
  },
  {
    id: 'place', title: 'Place', source: 'HARNESS',
    when: 'Every chapter the tagger reads. The tagger is told each character\'s place so far beside their name, and the story\'s places under PLACES.',
    text: SEN_PLACE_INSTRUCTIONS,
  },
  {
    id: 'ties', title: 'Ties', source: 'HARNESS',
    when: 'Every chapter the tagger reads. The tagger is told each character\'s ties so far beside their name.',
    text: SEN_TIE_INSTRUCTIONS,
  },
  {
    id: 'setting', title: 'Setting', source: 'HARNESS',
    when: 'Every chapter the tagger reads. A setting belongs to its chapter: nothing of it is listed beside a name, and the writer reads only where each recent chapter ended, in Previously On.',
    text: SEN_SETTING_INSTRUCTIONS,
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

/** Alternative requests: one is sent per Spark call, never all of them together. */
const sparkPromptExamples = [
  buildStorySparkPrompt({ genre: 'Mystery Cultivation' }),
  buildStorySparkPrompt({ genre: 'Mystery Cultivation', tags: ['mystery', 'academy'], protagonistAge: 'young', protagonistGender: 'female', idea: '⟨the reader’s own idea⟩', avoid: ['⟨a recent premise⟩'], fateSurvival: true }),
  buildStorySparkPrompt({ inventGenre: true, protagonistAge: 'middle', protagonistGender: 'male' }),
  buildStorySparkPrompt({ genre: 'Xianxia', protagonistAge: 'old' }),
];
export const STORY_SPARK_INSTRUCTIONS: readonly WriterInstruction[] = [
  {
    id: 'story-spark-system', title: 'Story Spark instructions', source: 'Story Spark',
    when: 'When the reader asks for a Spark, before a Story Seed exists. The existing Story Spark call, not the chapter writer.',
    text: sparkPromptExamples[0].systemInstruction,
  },
  {
    id: 'story-spark-requests', title: 'Story Spark request lines', source: 'Story Spark',
    when: 'Alternative request examples built by the live prompt builder: no preferences; tags, young, female, own idea, survival and recent premises; invented genre, middle and male; old. Each call reads only its own request.',
    text: sparkPromptExamples.map(prompt => prompt.userPrompt).join('\n\n'),
  },
];
export const WRITER_INSTRUCTIONS: readonly WriterInstruction[] = [...STORY_SPARK_INSTRUCTIONS, ...EVERY_CHAPTER, ...SOME_STORIES, ...BEFORE_THE_STORY, ...AFTER_A_CHAPTER];

/** Blocks no longer read, kept so the history can still name them. */
export const RETIRED_WRITER_INSTRUCTIONS: ReadonlyMap<WriterInstructionId, string> = new Map([
  ['response-contract', 'Response and evidence contract (retired)'],
  ['world-builder', 'World builder: the world at Chapter 0 (retired)'],
]);

/** The official CAPA skills every story made in Novel Expanded starts with, in the order the writer reads them. */
export const OFFICIAL_WRITER_SKILLS = (style: StoryStyle) => [
  OFFICIAL_CAPA_DEFAULT_REFERENCES.author,
  OFFICIAL_CAPA_DEFAULT_REFERENCES.pacing,
  OFFICIAL_CAPA_DEFAULT_REFERENCES.continuity,
  OFFICIAL_STYLE_REFERENCES[style],
];

/** The official skills, found among those the host installed, in reading order. */
export const officialWriterSkills = (installed: readonly HarnessSkillManifest[], style: StoryStyle) =>
  OFFICIAL_WRITER_SKILLS(style).map(reference => installed.find(skill => skill.id === reference.id && skill.version === reference.version)).filter((skill): skill is HarnessSkillManifest => Boolean(skill));

/** One message of a whole prompt: what the model is told first, then what it is given. */
export interface PromptMessage {
  label: string;
  text: string;
  /** How the message reaches the model, when that differs by provider. */
  note?: string;
}

/** Where something changes every time it is sent: the page shows its place, never a story's own words. */
const slot = (what: string) => `⟨${what}⟩`;
/** A number a builder writes into its text, shown as its place instead. */
const numberSlot = (what: string) => slot(what) as unknown as number;

/**
 * The shape the answer must take. Claude and MiniMax models read it at the end
 * of the instructions, after "Return only the JSON answer, without Markdown
 * fences."; the other providers are given it as the answer's format.
 */
const answerShape = (schema: unknown): PromptMessage => ({
  label: 'The answer\'s shape',
  note: 'Claude and MiniMax models read this at the end of the instructions, after "Return only the JSON answer, without Markdown fences." Other models are given it as the answer\'s format.',
  text: JSON.stringify(schema, null, 2),
});

const assembledWriterPrompt = (skills: readonly HarnessSkillManifest[]) => assembleCapaPrompt({ capturedAt: 'now', originalLanguage: 'en', skills: [...skills] });

/**
 * Everything an English story's writer reads before the story, exactly as the
 * HARNESS assembles it: the CAPA Prompt from the story's skills in the
 * HARNESS's skeleton.
 */
export const writerSystemInstruction = (skills: readonly HarnessSkillManifest[]) => composeHarnessSystemInstruction(assembledWriterPrompt(skills));

/** The chapter the writer's whole prompt is shown for: the second, with the path left to the HARNESS. */
export const WRITER_EXAMPLE_CHAPTER = 2;

/**
 * The writer's whole prompt, built by the functions that send it: its
 * instructions, then the next message with the chapter request and the
 * Mission Reminder exactly as they are written for Chapter 2 (the Story
 * Information is the story's own, so only its place is shown), then the
 * answer's shape.
 */
export const writerPrompt = (skills: readonly HarnessSkillManifest[]): PromptMessage[] => {
  const capaPrompt = assembledWriterPrompt(skills);
  const paragraphs = harnessChapterParagraphTarget('example', WRITER_EXAMPLE_CHAPTER);
  return [
    { label: 'Its instructions', text: composeHarnessSystemInstruction(capaPrompt) },
    {
      label: 'The next message (changes every chapter)',
      text: composeHarnessUserPrompt({
        story: [slot('The Story Information, section by section: the Foundation, the Destined Ending, the arc goal, the World at Chapter 0, who has appeared and how they look, status, place, holdings, the Previously On recaps')],
        request: presentImmediateChapterRequest({
          chapterNumber: WRITER_EXAMPLE_CHAPTER, continuation: true,
          chapterScale: { minWords: HARNESS_CHAPTER_TARGET_MIN_WORDS, maxWords: HARNESS_CHAPTER_TARGET_MAX_WORDS, paragraphs },
        }),
        reminder: buildMissionReminder(capaPrompt).text,
      }),
    },
    answerShape(buildHarnessChapterResponseSchema(paragraphs)),
  ];
};

/**
 * Every other step's whole prompt, built by the same functions that send it,
 * with each changing part shown by its place: the Tagger's with the story's
 * default sound words, music and atmospheres; the fixer's with one case
 * carrying every part a case can have (a real case carries only those it
 * needs); the look writer's with one subject; the Blueprint's with an
 * empty Story Seed where the creator's goes.
 */
export const WHOLE_PROMPTS: Record<Exclude<PipelineStepId, 'writer'>, readonly PromptMessage[]> = (() => {
  const tag = buildHarnessTagPrompt({
    operation: 'tag-chapter', storyId: '', chapterId: '', chapterNumber: numberSlot('number'), model: '', language: slot('language'),
    paragraphs: [slot('the chapter\'s first paragraph'), slot('every paragraph after it, one by one')],
    subjects: [
      { kind: 'character', name: slot('each character'), conditions: [slot('each condition they carry so far')], place: slot('where they are so far'), ties: [{ with: slot('each one they are tied to'), tie: slot('how they stand') }] },
      { kind: 'thing', name: slot('each thing') },
      { kind: 'ability', name: slot('each ability') },
      { kind: 'place', name: slot('each place') },
    ],
    holdings: { characters: [{ name: slot('each character'), inHand: [slot('what they hold in hand')], carries: [slot('what they carry')], knows: [slot('what they know')] }] },
    soundWords: LIBRARY_SOUND_WORDS,
    soundtrack: DEFAULT_SOUNDTRACK_WORDS,
  });
  // The two sample paragraphs stand for every paragraph: their count is the chapter's.
  const tagMessage = tag.userPrompt.replace(/\b2 paragraphs\b/g, `${slot('number')} paragraphs`);
  const fix = buildHoldingsFixerPrompt({
    operation: 'fix-holdings', storyId: '', chapterId: '', chapterNumber: numberSlot('number'), model: '', language: slot('language'),
    mainCharacter: slot('the main character'), direction: slot('the reader\'s direction, when there is one'),
    cases: [{
      id: slot('case id'),
      problems: [slot('what the checks found')],
      passage: { before: slot('the sentence before'), sentence: slot('the sentence'), after: slot('the sentence after') },
      tags: slot('the tags the sentence carries'),
      mentions: [{ id: slot('id'), sentence: slot('each sentence that names it') }],
      record: [slot('what the record shows')],
      answers: ['record', 'prose', 'fine', 'major'],
    }],
  });
  const look = buildLookDescriberPrompt({
    operation: 'describe-looks', storyId: '', chapterId: '', chapterNumber: numberSlot('number'), model: '', language: slot('language'),
    subjects: [{
      id: slot('id'), name: slot('name'), entity: 'character', event: 'appears',
      passage: slot('the tagged sentence and the rest of its paragraph'),
      declared: slot('the author\'s notes on them, when there are any'),
    }],
  });
  const seed = createEmptyStorySeedInput();
  return {
    spark: [
      { label: 'Its instructions', text: STORY_SPARK_INSTRUCTIONS[0].text },
      { label: 'Alternative requests (one per call, with example reader data)', text: STORY_SPARK_INSTRUCTIONS[1].text },
      answerShape(STORY_SPARK_RESPONSE_SCHEMA),
    ],
    world: [
      { label: 'Its instructions', text: WORLD_BLUEPRINT_SYSTEM_PROMPT },
      { label: 'The next message, with an empty Story Seed where yours goes', text: buildWorldBlueprintPrompt(seed) },
      // Its answer's shape, as generateWorldBlueprint sends it (review finding, Codex, 2026-11-05).
      answerShape(worldBlueprintResponseSchema(seed.story.optional.arcCount)),
    ],
    tagger: [
      { label: 'Its instructions', text: tag.systemInstruction },
      { label: 'The next message (changes every chapter)', text: tagMessage },
      answerShape(tag.responseJsonSchema),
    ],
    fixer: [
      { label: 'Its instructions', text: fix.systemInstruction },
      { label: 'The next message (changes every chapter)', text: fix.userPrompt },
      answerShape(fix.responseJsonSchema),
    ],
    look: [
      { label: 'Its instructions', text: look.systemInstruction },
      { label: 'The next message', text: look.userPrompt },
      answerShape(look.responseJsonSchema),
    ],
  };
})();

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

export type PipelineStepId = 'spark' | 'world' | 'writer' | 'tagger' | 'fixer' | 'look';

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
    id: 'spark', name: 'Story Spark', runs: 'When you ask for a Spark',
    job: 'Offers a short beginning for a Story Seed, shaped by the reader’s choices.',
    reads: ['Genre or invent a genre, optional Story Tags, protagonist gender and age, the reader’s idea, Survival and recent premises'],
    gives: ['A premise and title → used or saved as a Story Seed, with the chosen Story Tags first'],
    groups: [{ label: 'What it reads', blocks: STORY_SPARK_INSTRUCTIONS }],
  },
  {
    id: 'world', name: 'Blueprint', runs: 'Once, before Chapter 1',
    job: 'Builds the world the story opens with: every character, thing, ability, place and faction card in the Codex.',
    reads: ['The Story Seed you wrote', 'Its role, its Origin, World and Arc skills, and the rules no skill can change'],
    gives: ['The World at Chapter 0: the Codex cards the story starts with → read by the Writer every chapter'],
    groups: [{ label: 'What it reads', blocks: blocksOf(['blueprint-role', 'origin-skill', 'world-skill', 'arc-skill', 'blueprint-rules']) }],
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
    groups: [{ label: 'What it reads, in order', blocks: blocksOf(['tagger', 'tag-rules', 'speakers', 'holdings', 'appearance', 'status', 'place', 'ties', 'setting', 'sound-cues', 'soundtrack']) }],
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

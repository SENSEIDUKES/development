import type { SoundCueAttachment } from '../audio/inlineAudio';
import type { ChapterOpeningSound, SoundtrackChangeAttachment } from '../audio/soundtrackChanges';
import type { SpeakerAttachment } from './speech';
import type { CodexEntry, CodexEntryKind, HoldingChangeAttachment, HoldingsSection } from './holdings';
import type { WorldCard, WorldRecord } from './worldRecord';
import type { AppearanceAttachment, AppearanceEntity, AppearanceEvent, AppearancesSection, ChapterLooks, Look } from './appearances';
import type { SoundWord } from '../audio/soundWords';
import type { AudioTags } from '../audio/audioTags';
import type { SoundtrackVocabulary } from '../audio/soundtrackVocabulary';
import type { FrozenNarrativeMedia, ResolvedSoundscape, StoryMediaSelection } from '../audio/media';
import type { SenLanguageCode } from '../lib/language';
import type { ChapterWritingStyle } from './readingMode';
import type { StoryBlock } from './chapter';
import type { ChapterFunction, ChapterRecap, FatePressure, HardPin, NextChapterSuggestions } from './storyDirection';

/** Independent Harness Generation contracts. Bump this on any change to a
 * persisted shape (attempt, chapter, or workspace state fields) and add the
 * matching upgrade step to `HARNESS_WORKSPACE_MIGRATIONS` in `repository.ts`,
 * so saved stories carry over. Storage with no migration path is preserved
 * untouched by the host and replaced with an empty workspace. Schema 22
 * (chapters are paragraphs plus Sound Cues) deliberately has no upgrade step
 * from earlier versions; 23 adds the optional paragraph counter; 24 plans
 * each arc when it begins (the Foundation keeps Arc 1 and a hidden look-ahead
 * instead of a whole roadmap); 25 adds the optional speaker records; 26 adds
 * holdings: each chapter's holding changes and closing list, and the
 * workspace's Codex entries; 27 counts arcs of 30 chapters (nothing before it
 * upgrades); 28 adds the optional rewrite request and replaced-by record, and
 * each chapter's optional Holdings fixer record; 31 adds the story's optional
 * own sound words; 32 adds each chapter's optional appearances and the looks
 * written down from them. 33 was the chapter loop's, rolled back on
 * 2026-10-22, so a workspace that loop saved is never read as current; 34 adds
 * the Foundation's optional world at Chapter 0, and every saved story reads as
 * it is (a story made before it simply has no world recorded); 35 carries that
 * world to the writer as its own packet section, so every attempt keeps the
 * packet it froze; 36 gives every world card the chapter it entered in, and
 * every card saved before it is the world the story opened with; 37 gives the
 * world record a home of its own on the workspace, so a chapter can add a card
 * to it, seeded from each story's active Foundation; 40 numbers every saved
 * workspace with its revision, so a save made from an older one (another tab)
 * is refused instead of overwriting it. */
export const HARNESS_GENERATION_SCHEMA_VERSION = 41 as const;

/** The most an Author's notes may hold, in characters. */
export const AUTHOR_NOTES_LIMIT = 2000;

/** Output buckets assign processor categories; legacy event arrays remain readable. */
export const HARNESS_MEMORY_CATEGORIES = {
  characters: 'character', decisions: 'decision', relationships: 'relationship', locations: 'location',
  factions: 'faction', deadlines: 'deadline', timeline: 'timeline', progression: 'progression',
  threads: 'plot-thread', mysteries: 'mystery', clues: 'clue', revelations: 'revelation', artifacts: 'artifact',
} as const;

export interface HarnessStorySeedSnapshot {
  kind: 'story-seed';
  sourceId: string;
  sourceUpdatedAt: string;
  schemaVersion: number;
  seed: unknown;
  blueprint?: unknown;
}

/**
 * The story's Fate mode, chosen in the Story Seed and fixed once the story
 * begins. Off is Regular Reader mode: automatic Rhythm directs by default, the
 * reader may direct any chapter, and the Destined Ending is guaranteed. On is
 * Fate Survival: the reader directs every chapter within its pre-set Arc Goal,
 * and the Destined Ending is not guaranteed; the story can fail it.
 */
export interface FateSurvivalContext {
  enabled: boolean;
}

/** `regular` is Regular Reader mode; `survival` is Fate Survival. */
export type HarnessStoryMode = 'regular' | 'survival';

export interface StoryFoundationInput {
  initialHardPins?: import('./storyDirection').HardPinInput[];
  funSettings?: import('./storyDirection').FunSettings;
  fateSurvival?: FateSurvivalContext;
  destinedEnding?: string;
  /**
   * The story's canonical Fate Pressure tier (storyteller intensity). Copied
   * from the Story Seed domain value at the boundary; never read from a
   * visible label and never written by a model reply.
   */
  fatePressure?: FatePressure;
  /**
   * Arc 1's reviewed goal plan, the only arc a World Blueprint plans. HARNESS
   * copies it once, at story creation; every later arc is planned when it
   * begins, and plan edits are story revisions, never Foundation edits.
   */
  initialArcPlan?: import('../components/arc-goals/shared/arcGoals').ArcPlan;
  /**
   * The Blueprint's hidden look-ahead for the arcs after Arc 1, copied once
   * onto the story at creation. Only the arc planner reads it.
   */
  initialArcLookahead?: import('../components/arc-goals/shared/arcGoals').ArcLookaheadEntry[];
  /**
   * The story's length in arcs: the route to its Destined Ending, whose last
   * arc arrives there. Fixed once set. A story with a planned length plans each
   * arc when the reader begins it and reviews its goals before its first chapter.
   */
  plannedArcCount?: number;
  title?: string;
  /** The only author field required to start a Harness story. */
  premise: string;
  permanentInstructions?: string;
  toneStyle?: string;
  genre?: string;
  openingSituation?: string;
  declaredCanon?: string;
  /** The experience the creator asked for (Story Seed Story Tags): direction, never facts. */
  storyTags?: string[];
  characters?: string;
  /** Known identities supplied by the host; never inferred from paragraph order. */
  cast?: HarnessCastMember[];
  worldFacts?: string;
  intendedDirection?: string;
  /** Host-declared identities; names and aliases are author data, not model IDs. */
  identities?: Array<{ name: string; aliases?: string[]; kind: 'character' | 'location-world' | 'faction'; evidence: string }>;
  /**
   * The world as it already stands when the story opens: the Codex's own card
   * kinds, filled by the author in the Story Seed and completed by the World
   * Blueprint before Chapter 1 (`WorldRecord`). The Codex shows it from
   * the start, so the record knows the world rather than inventing it when
   * something first appears. The chapters add to it; they never replace it.
   */
  worldAtChapterZero?: import('./worldRecord').WorldRecord;
  /** Immutable source evidence copied at the Story Seed -> Harness boundary. */
  sourceSnapshot?: HarnessStorySeedSnapshot;
}

export interface HarnessStorySeedOption {
  id: string;
  title: string;
  updatedAt: string;
  hasBlueprint: boolean;
  /** The seed's own Original Language, frozen onto the story it starts. */
  originalLanguage: SenLanguageCode;
  /** The seed's Reading Mode, copied onto the story it starts. Absent means Standard. */
  chapterWritingStyle?: ChapterWritingStyle;
  /** Host-resolved package identities to equip only when this story is created. */
  initialSkillLoadout?: Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>;
  foundation: StoryFoundationInput;
}

/** Host-provided one-way input. The Harness never imports Story Seed internals. */
export interface HarnessStorySeedSource {
  list(): Promise<HarnessStorySeedOption[]>;
  manageHref?: string;
}

export interface StoryFoundationRevision {
  id: string;
  storyId: string;
  revision: number;
  createdAt: string;
  input: StoryFoundationInput;
}

export interface HarnessStoryHead {
  nextChapterNumber: number;
  lastCommittedChapterId?: string;
  lastCommittedAt?: string;
}

export interface HarnessStory {
  arcPlans?: import('../components/arc-goals/shared/arcGoals').ArcPlanRevision[];
  goalCompletions?: import('../components/arc-goals/shared/arcGoals').ArcGoalCompletion[];
  id: string;
  title: string;
  /**
   * Permanent story identity, assigned once at creation from the Story Seed.
   * Chapters are authored in this language. A Foundation revision can never
   * change it, and no reader preference is stored here.
   */
  originalLanguage: SenLanguageCode;
  createdAt: string;
  updatedAt: string;
  activeFoundationRevisionId: string;
  foundationRevisionIds: string[];
  head: HarnessStoryHead;
  /**
   * The reader's choice for the next chapter only, made on the Fate page. It
   * survives failed attempts so the same choice can be retried, and is
   * consumed when that chapter commits. Absent means Rhythm chooses
   * automatically (Regular Reader mode only).
   */
  nextChapterDirection?: HarnessChapterDirection;
  /**
   * Persistent directions saved before one-chapter directions replaced them.
   * Kept as the author's record; never sent to the writer again.
   */
  earlierSteering?: HarnessEarlierSteering[];
  /**
   * Fate Survival: set once, when the route to the Destined Ending breaks. The
   * next chapter must end the story; it never begins another arc.
   */
  brokenRoute?: HarnessBrokenRoute;
  /** Set once when the story reaches or fails its Destined Ending. No chapter is written after it. */
  conclusion?: HarnessStoryConclusion;
  /**
   * The story's Reading Mode, a Story Setting copied from its Story Seed and
   * changed only by the story's owner. It applies to chapters written from then
   * on; committed chapters keep the mode they were written in. Absent means
   * Standard. The HARNESS turns it into the managed Accessibility skill.
   */
  chapterWritingStyle?: ChapterWritingStyle;
  /**
   * Per-story references to host-installed skills for the hand-equipped CAPA
   * slots. Managed slots (Fate, Accessibility, Translation) never appear here:
   * the HARNESS resolves them from story state. The full manifests are frozen per request.
   */
  skillLoadout?: Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>;
  /** Entitled Media Packs equipped for this story. Separate from CAPA skills. */
  mediaLoadout?: StoryMediaSelection;
  /**
   * The story's own sound words (at most 30): the only sounds its writer may
   * name, kept apart from its recordings, so changing the Sound Cue pack never
   * changes them. Chosen from a preset and edited in Story Settings. An empty
   * list means the story plays no Sound Cues. Absent (a story from before the
   * list existed) means the words its recordings answer, until it is edited.
   */
  soundWords?: string[];
  /** User-created story-wide intentions (at most `HARD_PIN_LIMIT`). Only the user writes them. */
  hardPins?: HardPin[];
  /** The deterministic Fate Pressure recommendation for the next chapter, refreshed at every commit. */
  rhythmRecommendation?: import('../components/harness-generation/shared/rhythm').HarnessRhythmRecommendation;
  /** Who may read the novel. Arc Goals stay editable in Regular Reader mode only while it is private. Absent means private. */
  visibility?: HarnessStoryVisibility;
  /**
   * The creator's notes to readers, shown with the world's information. Never
   * sent to the chapter writer. Absent means none.
   */
  authorNotes?: string;
  /**
   * Each arc's goal review, one entry per arc: the plan is reviewed (edited or
   * accepted as written) before the arc's first chapter. Fate Survival's review
   * is its one-time edit, locked when that arc's generation begins; a story with
   * a planned length reviews every arc in Regular Reader mode too.
   */
  arcGoalReviews?: HarnessArcGoalReview[];
  /**
   * The arc planner's private direction for the next arcs (at most two), set
   * from the Blueprint and replaced each time an arc is planned. Never shown to
   * readers and never sent to the chapter writer.
   */
  arcLookahead?: import('../components/arc-goals/shared/arcGoals').ArcLookaheadEntry[];
}

export type HarnessStoryVisibility = 'private' | 'shared' | 'public';

export interface HarnessArcGoalReview {
  arcNumber: number;
  /** When the user used the arc's one-time review. Absent until then. */
  reviewedAt?: string;
  /** Whether that review edited the plan (true) or accepted it as written (false). */
  edited?: boolean;
  /** Where the review happened: the Blueprint review before the story began, or the novel's Blueprint. */
  source?: 'blueprint-creation' | 'novel-blueprint' | 'migration';
  /** Set when generation of the arc begins. A locked plan is never revised. */
  lockedAt?: string;
}

/**
 * Rhythm metadata the writer returns beside the chapter: the function this
 * chapter served and one short possibility per function for the next chapter.
 * HARNESS validates each piece independently; a malformed piece is omitted
 * with a warning and never touches the prose.
 */
export interface HarnessChapterRhythm {
  chapterFunction?: ChapterFunction;
  nextChapterSuggestions?: NextChapterSuggestions;
}

export type HarnessSkillSlotId =
  | 'author'
  | 'pacing'
  | 'fate'
  | 'continuity'
  | 'style'
  | 'accessibility'
  | 'translation';

export type HarnessSkillApplication =
  | 'generation'
  | 'post-commit'
  | 'reader';

export interface HarnessSkillReference {
  id: string;
  version: string;
}

/** One canonical term and the rendering an equipped Translation skill requires. */
export interface HarnessTranslationGlossaryEntry {
  /** The canonical (English) term, matched against frozen story information. */
  term: string;
  aliases?: string[];
  /** How the term must read in the skill's target language. */
  translation: string;
  note?: string;
}

/**
 * A language-specific glossary installed alongside a Translation skill. It is
 * a reference resource, never prompt text: only the entries a chapter actually
 * touches are selected into the CAPA Prompt.
 */
export interface HarnessTranslationGlossaryResource {
  /** Must equal the skill's declared target language. */
  targetLanguage: SenLanguageCode;
  entries: HarnessTranslationGlossaryEntry[];
  /** Provenance of the selected resource file inside its package. */
  source?: { path: string; sha256: string };
}

/**
 * Structural Translation metadata. The target language is declared, never
 * inferred from a skill's name, filename, instructions, or package title.
 */
export interface HarnessTranslationSkillMetadata {
  /** Exactly one supported target language. */
  targetLanguage: SenLanguageCode;
  glossary?: HarnessTranslationGlossaryResource;
}

/** A provider-neutral manifest supplied by the host's installed-skill library. */
export interface HarnessSkillManifest extends HarnessSkillReference {
  name: string;
  description: string;
  slot: HarnessSkillSlotId;
  applications: HarnessSkillApplication[];
  /** Trusted, author-installed directions included only when generation is declared. */
  instructions?: string;
  /** Required by a `translation` slot skill; forbidden on every other slot. */
  translation?: HarnessTranslationSkillMetadata;
  author?: string;
  assetCount?: number;
  runtimeLabel?: string;
  /** Original container identity and selected file; metadata is not model instruction text. */
  source?: {
    packageId: string;
    packageVersion: string;
    path: string;
    sha256: string;
    /** Optional whole-container identity retained by hosts that keep the original SPP. */
    archiveSha256?: string;
    /** Exact package inventory retained as provenance; resource bytes never enter CAPA. */
    resources?: Array<{ path: string; mediaType: string; sha256: string }>;
  };
}

/** Exact installed manifests frozen in CAPA Schema order before CAPA assembly. */
export interface HarnessSkillLoadoutSnapshot {
  skills: HarnessSkillManifest[];
  capturedAt: string;
  /**
   * The story's Original Language when the loadout was frozen. A non-English
   * story's CAPA Prompt carries the HARNESS-owned Story Language requirement,
   * with or without a Translation skill. Absent is read as English.
   */
  originalLanguage?: SenLanguageCode;
}

/** One equipped CAPA Skill recorded in the CAPA Prompt. Its instructions live only in `CapaPrompt.text`. */
export interface CapaPromptSkill {
  id: string;
  version: string;
  name: string;
  slot: HarnessSkillSlotId;
  applications: HarnessSkillApplication[];
  /** Whether this skill's instructions are part of the assembled text. */
  authoring: boolean;
  /** Declared by a Translation skill; retained as frozen provenance. */
  targetLanguage?: SenLanguageCode;
  source?: HarnessSkillManifest['source'];
}

/**
 * CAPA Prompt: every active generation skill, including Author, assembled once
 * in CAPA Schema order. It is the model's complete authoring instruction and
 * never carries story information. It is all writing: the tag teaching belongs
 * to the tagger, not the writer (SENSEI, 2026-10-24).
 */
export interface CapaPrompt {
  capturedAt: string;
  skills: CapaPromptSkill[];
  text: string;
  estimatedTokens: number;
  /**
   * The exact glossary entries selected for this attempt. Frozen so a retry or
   * replay reuses the same reference instead of reselecting against new state.
   */
  translationGlossary?: HarnessSelectedTranslationGlossary;
}

/**
 * A short, inspectable reminder that the model is the author of this novel,
 * sourced from the Author portion of the assembled CAPA Prompt. Built by
 * `buildMissionReminder`; it performs no story analysis and no model call.
 */
export interface HarnessMissionReminder {
  text: string;
  /** The equipped Author skill the excerpt was taken from. */
  sourceSkill: { id: string; version: string; name: string };
}

/** The selected, already-rendered glossary reference for one attempt. */
export interface HarnessSelectedTranslationGlossary {
  skillId: string;
  skillVersion: string;
  targetLanguage: SenLanguageCode;
  /** Exact installed resource that produced this attempt's selected entries. */
  source?: HarnessTranslationGlossaryResource['source'];
  entries: HarnessTranslationGlossaryEntry[];
  /** How many entries the installed resource held before selection. */
  availableEntryCount: number;
}

/**
 * Immediate Chapter Request: the HARNESS-owned instruction for the one chapter
 * being generated now, including the reader's direction for this chapter.
 */
export interface ImmediateChapterRequest {
  chapterNumber: number;
  /** True when a committed chapter precedes this one; false for the story opening. */
  continuation: boolean;
  /** The reader's choice for this chapter. Absent when Rhythm chooses automatically. */
  direction?: HarnessChapterDirection;
  /**
   * Present when the reader asked for the story's latest chapter to be written
   * again. The request is prepared from the story as it stood before that
   * chapter, which stays saved until the new version commits in its place.
   */
  rewrite?: HarnessChapterRewrite;
  /**
   * The HARNESS-owned chapter-scale target for this attempt. It is mechanics,
   * not a CAPA skill and not canonical Story Information: the Pacing skill
   * decides how the chapter uses the space this range allows.
   */
  chapterScale: {
    minWords: number;
    maxWords: number;
    /**
     * The exact number of paragraphs this chapter must have, rolled by the
     * HARNESS for this chapter and frozen with the attempt, so a retry keeps it.
     * Absent on attempts frozen before the counter existed.
     */
    paragraphs?: number;
  };
}

/** The longest note a reader may leave when asking for a chapter to be written again. */
export const CHAPTER_REWRITE_NOTE_LIMIT = 1_200 as const;

/** The reader's request to write the story's latest chapter again. */
export interface HarnessChapterRewrite {
  /** The saved chapter the new version replaces when it commits. */
  replacesChapterId: string;
  /** What the reader wants changed, in their words. Absent when they left no note. */
  note?: string;
  /** The version being replaced, as the writer is shown it: its title and saved recap, never its prose. */
  previous: { title: string; recap?: string };
}

/** One path for the next chapter, chosen by the reader. */
export type ChapterDirectionChoice =
  /** One of the writer's three next-chapter ideas, or its chapter function alone. */
  | { kind: 'chapter-function'; chapterFunction: ChapterFunction; suggestion?: string }
  /** The reader's own direction, in their words. Never one of the chapter functions. */
  | { kind: 'reader'; text: string };

/** The longest reader direction the Fate page accepts. */
export const CHAPTER_DIRECTION_TEXT_LIMIT = 1_200 as const;

/** A reader's pending choice for exactly one chapter. */
export interface HarnessChapterDirection {
  id: string;
  /** The chapter this choice directs. It is consumed when that chapter commits. */
  forChapter: number;
  choice: ChapterDirectionChoice;
  chosenAt: string;
}

/** How a committed chapter's path was decided: automatically by Rhythm, or by the reader's choice. */
export type HarnessChapterPath =
  | { kind: 'automatic'; chapterFunction: ChapterFunction; suggestion?: string }
  | ({ directionId: string } & ChapterDirectionChoice);

/** A persistent direction from before one-chapter directions. Read-only history. */
export interface HarnessEarlierSteering {
  direction: string;
  mode: 'future' | 'revise-history';
  effectiveChapter: number;
  createdAt: string;
}

/** A goal whose deadline chapter committed without the goal achieved. */
export interface HarnessMissedGoal {
  goalId: string;
  text: string;
  /** The deadline chapter it was missed in. */
  chapterNumber: number;
}

/**
 * Fate Survival: the route to the Destined Ending broke when this chapter
 * committed, because at least half of one arc's goals were missed or the
 * final goal was. The next chapter must bring the story to its end.
 */
export interface HarnessBrokenRoute {
  /** The chapter whose commit broke the route. The chapter after it must end the story. */
  chapterNumber: number;
  arcNumber: number;
  reason: 'arc-goals-missed' | 'final-goal-missed';
  goalsInArc: number;
  /** The arc's missed goals when it broke, in order. */
  missedGoals: HarnessMissedGoal[];
  recordedAt: string;
}

/**
 * Where the story stands on its route to the Destined Ending as of one
 * chapter. Sent with the Active Arc Goal so the writer knows it.
 */
export type HarnessArcRoute =
  /** No goal of this arc has been missed. */
  | { status: 'on-track' }
  /** Goals of this arc were missed; the route still leads to the Destined Ending. */
  | { status: 'off-track'; missedGoals: HarnessMissedGoal[] }
  /** Regular Reader: the final goal was missed. The story keeps pursuing the Destined Ending, with no further goal. */
  | { status: 'past-final-goal'; missedGoals: HarnessMissedGoal[]; finalGoalMissedInChapter: number }
  /** Fate Survival: the route broke, so this chapter must bring the story to its end. */
  | {
    status: 'broken';
    missedGoals: HarnessMissedGoal[];
    brokenInChapter: number;
    reason: HarnessBrokenRoute['reason'];
  };

/** The Active Arc Goal section: the Arc Plan authority for one chapter, with where the story stands on its route. */
export type HarnessArcContext = import('../components/arc-goals/shared/arcGoals').ArcGenerationContext & { route?: HarnessArcRoute };

/**
 * How the story ended, recorded only when committed prose shows it. Regular
 * Reader mode never fails its fate: it ends by reaching the Destined Ending,
 * on its final goal or, after that goal was missed, by pursuing the ending
 * until the prose reaches it. Fate Survival may also end in failure, when the
 * writer shows the story ending with a verbatim passage: a fatal ending at any
 * point, or the ending the chapter after a broken route must write.
 */
export interface HarnessStoryConclusion {
  outcome: 'destined-ending-reached' | 'fate-failed';
  reason: 'final-goal-completed' | 'reached-after-final-goal-missed' | 'story-ended';
  chapterNumber: number;
  /** The verbatim passage from the committed prose that shows it. */
  evidence: string;
  recordedAt: string;
}

export type HarnessModelPlan = string | {
  intent?: string;
  beats?: string[];
};

/** Derived chapter measurements. Persisted with every frozen attempt and committed chapter. */
/**
 * A chapter the reader changed in Create mode. `editedAt` marks it as changed,
 * so it is read again when it is sealed; an untouched chapter never is.
 * `waiting` holds the effects (Sound Cues, speakers, holding changes, appearances) whose
 * words a change replaced: they keep their place in the list, off the page,
 * until the reader removes them or the chapter is sealed.
 */
export interface HarnessChapterAuthoring {
  editedAt: string;
  waiting?: Array<SoundCueAttachment | SpeakerAttachment | HoldingChangeAttachment | AppearanceAttachment>;
}

export interface HarnessChapterMetrics {
  wordCount: number;
  paragraphCount: number;
  /** False when the chapter falls below the HARNESS chapter-scale target; the prose is still preserved. */
  meetsScaleTarget: boolean;
  /** The exact paragraph count the HARNESS asked for, when it asked for one. A miss is kept and flagged. */
  paragraphTarget?: number;
}

export interface HarnessAcceptedChapterDraft {
  /** The authoritative model-authored chapter body, one entry per prose paragraph. */
  paragraphs: string[];
  /** Readable chapter derived by joining the accepted paragraphs with blank lines. */
  prose: string;
  metrics: HarnessChapterMetrics;
  /** Sound Cues the HARNESS placed from the writer's marks, on paragraph spans. */
  soundCues?: SoundCueAttachment[];
  /** Who speaks each spoken line the writer tagged, on paragraph spans. */
  speakers?: SpeakerAttachment[];
  /**
   * Every holding change the writer tagged, on the sentence its tag points at.
   * Names are as written; they resolve to Codex entries when the chapter commits.
   */
  holdingChanges?: HoldingChangeAttachment[];
  /** The writer's closing list: the main character's things and abilities by name, after this chapter. */
  closingHoldings?: string[];
  /**
   * Every appearance the writer tagged (who or what stepped onto the page, and
   * each change to a look), on the sentence its tag points at. Present, even
   * empty, when the chapter was written with the Appearance skill. Names are
   * as written; they resolve to Codex entries when the chapter commits.
   */
  appearances?: AppearanceAttachment[];
  /** The chapter's music and atmosphere, from the writer's soundscape and atmosphere tags. */
  scene?: HarnessChapterScene;
  title: string;
  titleSource: 'model' | 'harness-fallback';
  plan?: HarnessModelPlan;
  /** The writer's short "Previously On" recap of this chapter, saved only when the chapter commits. */
  recap?: string;
  rhythm?: HarnessChapterRhythm;
  responseMode: 'json' | 'plain-prose-recovery';
}

/** A character the Foundation declares, as its author wrote them. */
export interface HarnessCastMember {
  name: string;
  role?: string;
  relationshipToMC?: string;
  isMainCharacter?: boolean;
}

export interface HarnessWarning {
  code:
    | 'plain_prose_recovery'
    | 'missing_title'
    | 'invalid_plan_omitted'
    | 'invalid_events_omitted'
    | 'ignored_model_identity'
    | 'optional_event_rejected'
    | 'optional_event_field_omitted'
    | 'chapter_block_normalized'
    | 'chapter_structure_quality'
    | 'chapter_scale_below_target'
    | 'chapter_paragraphs_off_target'
    | 'chapter_body_recovered'
    | 'optional_chapter_structure_omitted'
    | 'competing_prose_ignored'
    | 'provider_outcome_unknown'
    | 'persistence_retry_required'
    | 'event_preservation_retry_required'
    | 'usage_unavailable'
    | 'capability_failed'
    | 'capability_unresolved'
    | 'projection_failed'
    | 'projection_unresolved'
    | 'post_commit_processing_pending'
    | 'batch_paused'
    | 'arc_plan_pending'
    | 'optional_recap_omitted'
    | 'optional_rhythm_metadata_omitted'
    | 'ignored_model_story_direction'
    | 'ignored_story_ending'
    | 'unconfirmed_arc_completion'
    | 'sound_cue_set_aside'
    | 'sound_tag_moved'
    | 'prose_marks_removed'
    | 'speaker_tags_incomplete'
    | 'soundtrack_incomplete'
    | 'holding_tags_incomplete'
    | 'appearance_tags_incomplete'
    /** A note the tagger wrote could not be placed on its paragraph (its words are not there, or not there once) and was dropped on its own. */
    | 'tag_note_dropped';
  message: string;
}

export interface HarnessUsageReceipt {
  source: 'reported' | 'estimated' | 'unavailable';
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface HarnessProviderReceipt {
  provider: string;
  model: string;
  generatedAt: string;
  durationMs?: number;
  usage: HarnessUsageReceipt;
}

/** How a story's narration tells the main character: as "I", or by their name. */
export type NarrativePointOfView = 'first-person' | 'third-person';

/**
 * Current Story Information: the compact, model-facing projection of the
 * active Foundation. It reads stable domain fields (a visible "Core Premise"
 * or "Synopsis" label never reaches here) and carries no Story Seed snapshot,
 * storage record, or duplicated copy of the same text.
 */
export interface CurrentStoryProjection {
  funSettings?: import('./storyDirection').FunSettings;
  title: string;
  /** The story's permanent authoring language, carried as explicit story information. */
  originalLanguage: SenLanguageCode;
  premise: string;
  genre?: string;
  toneStyle?: string;
  permanentInstructions?: string;
  openingSetup?: string;
  intendedDirection?: string;
  declaredCanon?: string;
  storyTags?: string[];
  characters?: string;
  worldFacts?: string;
  cast?: HarnessCastMember[];
  identities?: Array<{ name: string; aliases?: string[]; kind: 'character' | 'location-world' | 'faction'; evidence: string }>;
  /**
   * The point of view the story opened in, read from its earliest committed
   * chapter that shows one clearly, so every later chapter keeps it. Absent
   * before the first chapter (the Style skill chooses) and when no chapter
   * shows one clearly.
   */
  pointOfView?: NarrativePointOfView;
  /** Explicit author corrections, newest first, compacted to their meaning. */
  corrections: Array<{
    kind: HarnessCorrectionKind;
    reason: string;
    targets?: string[];
    referenceLabel?: string;
    acceptedAlias?: string;
    resolvedEntity?: string;
    replacement?: { kind: HarnessCanonicalKind; label?: string; facts: Record<string, string> };
    /** Semantic Reader/Codex edits only; presentation fields never travel. */
    readerEdit?: { chapterNumber: number; changes: Array<{ path: string; value?: unknown; remove?: true }> };
  }>;
}

/** The Destined Ending beside the user's Hard Pins, in the user's order, and the mode that decides what the ending's promise means. */
export interface StoryDirectionSection {
  destinedEnding?: string;
  hardPins: string[];
  /** Absent in packets frozen before modes reached the writer; those read as `regular`. */
  fateMode?: HarnessStoryMode;
}

/** Compact Fate Pressure rhythm direction: tier, recent sequence, recommendation, reason, matching suggestion. */
export interface RhythmDirectionSection {
  fatePressure: FatePressure;
  recentFunctions: Array<{ chapterNumber: number; chapterFunction: ChapterFunction }>;
  recommendedFunction: ChapterFunction;
  reason: string;
  /** The previous chapter's suggestion matching the recommended function, when one was saved. */
  suggestion?: string;
}

export interface PreviouslyOnEntry {
  chapterNumber: number;
  title: string;
  recap: string;
}

/** The latest applicable state of one resolved entity: concise facts, never evidence passages. */
export interface CanonicalEntityState {
  name: string;
  aliases?: string[];
  /** The latest committed chapter that changed this entity; absent for Foundation-only identities. */
  asOfChapter?: number;
  facts: Record<string, string>;
}

/** The latest absolute quantity observed for one owner's named resource. */
export interface CanonicalResourceState {
  owner: string;
  name: string;
  value: string;
  unit?: string;
  asOfChapter?: number;
}

/** Current canonical state: only the latest applicable state per resolved entity. */
export interface CanonicalStateProjection {
  characters: CanonicalEntityState[];
  relationships: CanonicalEntityState[];
  locations: CanonicalEntityState[];
  factions: CanonicalEntityState[];
  artifacts: CanonicalEntityState[];
  abilities: CanonicalEntityState[];
  resources: CanonicalResourceState[];
}

export type PacketSectionId =
  | 'capaPrompt'
  | 'currentStory'
  | 'storyDirection'
  | 'arc'
  | 'rhythm'
  | 'previouslyOn'
  | 'worldAtChapterZero'
  | 'canonicalState'
  | 'holdings'
  | 'appearances'
  | 'missionReminder'
  | 'immediateChapterRequest';

export interface PacketSectionMeasurement {
  section: PacketSectionId;
  estimatedTokens: number;
  budgetTokens?: number;
  protected: boolean;
  overBudget: boolean;
}

export interface PacketOmission {
  section: PacketSectionId;
  label: string;
  reason: string;
  sourceRecordIds: string[];
}

/** A probable near-duplicate identity the HARNESS refused to merge silently. */
export interface CanonicalIdentityAmbiguity {
  kind: HarnessCanonicalKind;
  labels: string[];
  recordIds: string[];
  reason: string;
}

/**
 * HARNESS diagnostics about how the packet was assembled. Inspectable in
 * Development; never presented to the provider.
 */
export interface StoryInformationDiagnostics {
  budgetSource: string;
  sections: PacketSectionMeasurement[];
  omitted: PacketOmission[];
  identityAmbiguities: CanonicalIdentityAmbiguity[];
  /** Storage totals at assembly time, so growth stays visible while the packet stays compact. */
  storage: { chapters: number; canonicalRecords: number; activeRecords: number; recaps: number };
}

/**
 * Story Information Packet: the story information selected, weighted,
 * organized, and frozen by the HARNESS for one generation attempt. Each
 * section stays a distinct structured source until the provider boundary
 * presents them in the approved order. It contains story data only; CAPA
 * skill instructions never enter it.
 */
export interface StoryInformationPacket {
  id: string;
  storyId: string;
  attemptId: string;
  foundationRevisionId: string;
  foundationRevision: number;
  storyHead: HarnessStoryHead;
  chapterNumber: number;
  createdAt: string;
  /** Section 2. */
  currentStory: CurrentStoryProjection;
  /** Section 3. */
  storyDirection: StoryDirectionSection;
  /** Section 4: the existing Arc Plan authority, frozen, with where the story stands on its route. */
  arc?: HarnessArcContext;
  /** Section 5: present only when Rhythm chooses this chapter's path automatically. */
  rhythm?: RhythmDirectionSection;
  /** Section 6: the latest saved recaps, oldest first. */
  previouslyOn: PreviouslyOnEntry[];
  /**
   * Section 7, ahead of what the chapters changed: the world the story opens
   * with, as the Story Seed and its World Blueprint set it down. The record is
   * the Foundation's, carried whole; the facts its slots mark as unchanging
   * hold for the whole story, and a fact a chapter later changed is superseded
   * by Current Canonical State and Holdings. Absent from packets frozen before
   * the Chapter 0 world existed, and from a story whose Foundation has none.
   */
  worldAtChapterZero?: import('./worldRecord').WorldRecord;
  /** Section 8. */
  canonicalState: CanonicalStateProjection;
  /**
   * Section 9: what each character has now, starting from what the Chapter 0
   * world gives each character and worked on from there by the committed
   * chapters' holding changes. The main character first, always. Absent only
   * from packets frozen before holdings existed.
   */
  holdings?: HoldingsSection;
  /**
   * Section 9, beside Holdings: every character and thing already on the
   * page, with its look, worked out from the committed chapters' appearances.
   * The Chapter 0 world never seeds it: a card nobody has described yet is
   * not yet on the page.
   * Absent from packets frozen before appearances existed.
   */
  appearances?: AppearancesSection;
  /** HARNESS-only; the provider boundary never presents it. */
  diagnostics: StoryInformationDiagnostics;
}

/**
 * The music and atmosphere a chapter is read with, chosen once by its writer
 * at the chapter's start (never more than one of each, so a passing fight
 * never changes them).
 */
export interface HarnessChapterScene {
  /**
   * The chapter's music: a category of its soundscapes and the SEN audio tags
   * the writer gave it. The pieces of that category closest to the tags play
   * one after another.
   */
  music?: { category: string } & AudioTags;
  /** A mood of the chapter's soundscapes, from chapters written before music had categories. */
  soundscape?: string;
  /** The id of one atmosphere from the host's atmosphere catalog. */
  atmosphere?: string;
}

export interface HarnessChapter {
  id: string;
  storyId: string;
  attemptId: string;
  foundationRevisionId: string;
  storyInformationPacketId: string;
  chapterNumber: number;
  title: string;
  titleSource: 'model' | 'harness-fallback';
  /** The authoritative chapter result: the accepted model paragraphs joined with blank lines. */
  prose: string;
  /** The accepted model-authored paragraphs, preserved exactly and in order. */
  paragraphs: string[];
  metrics: HarnessChapterMetrics;
  /**
   * Sound Cues placed on the paragraphs: exact spans (`c{n}-p{i}` paragraph
   * ids) with their resolved recordings. Later loadout changes cannot rewrite them.
   */
  soundCues?: SoundCueAttachment[];
  /**
   * Who speaks each spoken line the writer tagged: exact spans of the quoted
   * words, each naming its speaker and whether that is the main character.
   * Read Aloud gives them the Protagonist or Side voice.
   */
  speakers?: SpeakerAttachment[];
  /**
   * What changed in what characters have, use, know and are: one holding
   * change per tag, on the sentence it points at, with every name resolved
   * to a Codex entry. Holdings are worked out from these, never stored.
   */
  holdingChanges?: HoldingChangeAttachment[];
  /** The writer's closing list for this chapter, checked against the holdings it leaves. */
  closingHoldings?: string[];
  /**
   * Who and what stepped onto the page, and each change to a look: one
   * appearance per tag, on the sentence it points at, with its name resolved
   * to a Codex entry. Present, even empty, when the chapter was written with
   * the Appearance skill. Who has appeared is worked out from these, never stored.
   */
  appearances?: AppearanceAttachment[];
  /**
   * The looks the look step wrote down after the chapter committed, one per
   * appearance it read. Absent when it found nothing to describe, or did not run.
   */
  looks?: ChapterLooks;
  /**
   * The reader's own changes in the Reader's Create mode, until the chapter is
   * sealed (the next chapter is written). Absent from a chapter nobody changed.
   */
  authoring?: HarnessChapterAuthoring;
  /** The chapter's music and atmosphere, as its writer chose them. Absent before scenes were chosen. */
  scene?: HarnessChapterScene;
  /** The reader's own opening music or atmosphere (Create mode), in place of the writer's; locked at the start. */
  openingSound?: ChapterOpeningSound;
  /**
   * The reader's changes of music and of atmosphere partway through (Create
   * mode): at most one of each, on the word where it begins.
   */
  soundtrackChanges?: SoundtrackChangeAttachment[];
  /** Pack/version provenance of the frozen catalog that produced this media. */
  mediaLoadout: FrozenNarrativeMedia;
  plan?: HarnessModelPlan;
  /** Saved once at commit; later chapters never regenerate it, and the author may edit it. */
  recap?: ChapterRecap;
  /** The completed chapter's function and the three next-chapter possibilities, saved at commit. */
  rhythm?: HarnessChapterRhythm;
  /** How this chapter's path was decided. Absent for chapters committed before paths were recorded. */
  path?: HarnessChapterPath;
  /**
   * What the Holdings fixer checked after the chapter committed and what it
   * changed: its holding records, or a sentence. Absent when it found nothing
   * to look at, or did not run.
   */
  fixer?: HarnessHoldingsFixRecord;
  /** What tagging this chapter came to, and why it placed no tag when it placed none. */
  tagging?: HarnessChapterTagging;
  responseMode: 'json' | 'plain-prose-recovery';
  createdAt: string;
  committedAt: string;
}

export type HarnessAttemptStage =
  | 'request_started'
  | 'provider_outcome_unknown'
  | 'raw_received'
  | 'prose_accepted'
  /** The chapter has been read by the tagger, and its tags sit on the accepted draft. */
  | 'tagged'
  | 'accepted_not_durable'
  | 'committed'
  | 'generation_failed'
  | 'abandoned';

export interface HarnessAttemptFailure {
  stage: 'provider' | 'response' | 'persistence';
  message: string;
}

export interface HarnessGenerationAttempt {
  id: string;
  storyId: string;
  foundationRevisionId: string;
  foundationSnapshot: StoryFoundationRevision;
  /** The frozen CAPA Prompt: an installed skill update cannot change an in-flight attempt. */
  capaPrompt: CapaPrompt;
  /** Frozen runtime resources. Never serialized into the Generation Model Call. */
  mediaLoadout: FrozenNarrativeMedia;
  /** The frozen Story Information Packet for this attempt. */
  storyInformation: StoryInformationPacket;
  immediateChapterRequest: ImmediateChapterRequest;
  /** Frozen for inspection and later packet assembly; not part of the Generation Model Call yet. */
  missionReminder: HarnessMissionReminder;
  model: string;
  chapterNumber: number;
  stage: HarnessAttemptStage;
  startedAt: string;
  rawReceivedAt?: string;
  proseAcceptedAt?: string;
  taggedAt?: string;
  /** What tagging this chapter came to, carried to the commit that writes it onto the chapter. */
  tagging?: HarnessChapterTagging;
  committedAt?: string;
  rawProviderResponse?: string;
  providerReceipt?: HarnessProviderReceipt;
  /** The measured size of the serialized request this attempt actually sent. */
  requestMeasurement?: HarnessRequestMeasurement;
  acceptedDraft?: HarnessAcceptedChapterDraft;
  pendingChapterId?: string;
  committedChapterId?: string;
  /**
   * Set when the reader had this attempt's chapter written again: the chapter
   * that replaced it. The attempt keeps the replaced version's reply and
   * accepted draft, so an export still shows it.
   */
  replacedByChapterId?: string;
  batchId?: string;
  warnings: HarnessWarning[];
  failure?: HarnessAttemptFailure;
  /** The exact checkpoint that must be durably retried. */
  recoveryStage?: 'raw_received' | 'prose_accepted' | 'tagged' | 'committed' | 'generation_failed';
}

export type HarnessCapabilityId =
  | 'general-narrative-event'
  | 'characters'
  | 'relationships'
  | 'locations-world'
  | 'factions'
  | 'plot-threads'
  | 'mysteries'
  | 'timeline'
  | 'artifacts'
  | 'progression';

export type HarnessCanonicalKind =
  | 'narrative-event'
  | 'character'
  | 'relationship'
  | 'location-world'
  | 'faction'
  | 'plot-thread'
  | 'mystery'
  | 'timeline-event'
  | 'artifact'
  | 'progression';

export type HarnessConfidence = 'resolved' | 'unresolved' | 'conflicted';

export interface HarnessEntityReference {
  label: string;
  resolution: 'exact' | 'alias' | 'active-context' | 'unresolved' | 'conflicted';
  resolvedRecordId?: string;
  entityId?: string;
  candidateRecordIds?: string[];
}

export interface HarnessCanonicalRecord {
  id: string;
  storyId: string;
  chapterId?: string;
  sourceEventId?: string;
  sourceCorrectionId?: string;
  sourceFoundationRevisionId?: string;
  entityId?: string;
  aliases?: string[];
  capabilityId: HarnessCapabilityId | 'author-correction';
  capabilityVersion: string;
  kind: HarnessCanonicalKind;
  evidence: string;
  confidence: HarnessConfidence;
  label?: string;
  references?: HarnessEntityReference[];
  /** Small semantic facts only; never prose, provider output, or presentation payloads. */
  facts: Record<string, string | string[] | boolean | undefined>;
  createdAt: string;
  supersededAt?: string;
  supersededByCorrectionId?: string;
  supersededByRecordId?: string;
  warnings: string[];
}

export type HarnessProjectionKind =
  | 'codex-candidate'
  | 'narrative-notification'
  | 'mechanical-display'
  | 'world-notice'
  | 'fate'
  | 'consequence-badge'
  | 'color-code';

export type HarnessCorrectionKind =
  | 'reader-edit'
  | 'resolve-entity'
  | 'correct-fact'
  | 'mark-incorrect'
  | 'add-missing-fact'
  | 'supersede-interpretation';

export interface HarnessAuthorCorrection {
  /** Durable author deltas, applied to derived Reader/Codex views by HARNESS. */
  readerEdit?: { chapterNumber: number; changes: HarnessReaderChange[] };
  id: string;
  storyId: string;
  kind: HarnessCorrectionKind;
  reason: string;
  createdAt: string;
  targetRecordIds: string[];
  sourceEventId?: string;
  referenceLabel?: string;
  resolvedRecordId?: string;
  acceptedAlias?: string;
  replacement?: {
    kind: HarnessCanonicalKind;
    label?: string;
    evidence: string;
    facts: Record<string, string | string[] | boolean | undefined>;
  };
}

export interface HarnessReaderChange {
  path: Array<string | { id: string }>;
  value?: unknown;
  remove?: true;
}

export interface HarnessCanonicalStoryView {
  storyId: string;
  records: HarnessCanonicalRecord[];
  characters: HarnessCanonicalRecord[];
  relationships: HarnessCanonicalRecord[];
  locations: HarnessCanonicalRecord[];
  factions: HarnessCanonicalRecord[];
  threads: HarnessCanonicalRecord[];
  /** Latest supported status per thread; `threads` retains the full evidence history. */
  currentThreads: HarnessCanonicalRecord[];
  mysteries: HarnessCanonicalRecord[];
  timeline: HarnessCanonicalRecord[];
  artifacts: HarnessCanonicalRecord[];
  progression: HarnessCanonicalRecord[];
  narrativeEvents: HarnessCanonicalRecord[];
  conflicts: HarnessCanonicalRecord[];
  corrections: HarnessAuthorCorrection[];
}

export interface HarnessBatchUsageAggregate {
  reportedCalls: number;
  estimatedCalls: number;
  unavailableCalls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface HarnessBatchRun {
  id: string;
  storyId: string;
  model: string;
  requestedChapterCount: number;
  startChapterNumber: number;
  completedChapterIds: string[];
  status: 'running' | 'pause_requested' | 'paused' | 'failed' | 'provider_outcome_unknown' | 'completed';
  currentAttemptId?: string;
  createdAt: string;
  updatedAt: string;
  failure?: string;
  usage: HarnessBatchUsageAggregate;
}

/**
 * What tagging one chapter came to: the record the chapter keeps. The tags
 * themselves are not here — they go on the chapter's own `soundCues`,
 * `speakers`, `holdingChanges`, `appearances` and `scene`, exactly where a
 * writer's tags went before, so nothing downstream can tell who wrote them.
 *
 * A chapter is never refused for its tagging (SENSEI, 2026-10-24). One that
 * failed keeps every word of its prose, carries this record saying why, and can
 * be tagged again.
 */
export interface HarnessChapterTagging {
  status: 'tagged' | 'failed';
  at: string;
  /** The model that read the chapter. */
  model?: string;
  providerReceipt?: HarnessProviderReceipt;
  /** The tagger's reply as it came back, for inspection. */
  rawProviderResponse?: string;
  /** Why the answer placed no tag. */
  problem?: string;
  /**
   * How many notes the tagger wrote and how many the HARNESS placed on the
   * chapter's own paragraphs. Absent when the answer was no list of notes at
   * all, or the chapter was tagged before notes were counted.
   */
  notes?: { written: number; placed: number };
  /** What the tag reader set aside or could not use, as plain warnings. */
  warnings?: HarnessWarning[];
}

export interface HarnessWorkspaceState {
  schemaVersion: typeof HARNESS_GENERATION_SCHEMA_VERSION;
  /**
   * How many times this workspace has been saved. A state carries the revision
   * it was read at; the repository saves it only while the stored workspace is
   * still at that revision, as the next one, so a page that opened the
   * workspace before another one saved it cannot overwrite what that one wrote.
   */
  revision: number;
  stories: HarnessStory[];
  foundations: StoryFoundationRevision[];
  attempts: HarnessGenerationAttempt[];
  chapters: HarnessChapter[];
  canonicalRecords: HarnessCanonicalRecord[];
  corrections: HarnessAuthorCorrection[];
  batches: HarnessBatchRun[];
  arcPlanOperations: HarnessArcPlanOperation[];
  /** Every story's Codex entries: the people, things and abilities its holdings name, each with an app-made ID. */
  codexEntries: CodexEntry[];
  /**
   * Every story's world record as it stands: the cards the Story Seed and its
   * World Blueprint wrote before Chapter 1, and each one a chapter brought in
   * after them.
   *
   * It lives here, beside the Codex entries, because a chapter has to be able
   * to add to it. The Foundation keeps its own `worldAtChapterZero`: that is
   * the **author's** opening world, which they revise, and those cards are
   * copied in here as the opening of this record. A chapter never writes to
   * the Foundation.
   */
  worldCards: StoryWorldCard[];
}

/**
 * One card of a story's world record, as the workspace stores it: the portable
 * card with the story it belongs to, the way a Codex entry carries its own
 * `storyId`.
 */
export interface StoryWorldCard extends WorldCard {
  storyId: string;
}

export interface HarnessGenerationServerInfo {
  provider: string;
  configured: boolean;
  models: Array<{ id: string; label: string }>;
  defaultModel: string;
}

/**
 * Generation Model Call input. The HARNESS prepares the CAPA Prompt (how the
 * model authors) and the Story Information Packet plus Immediate Chapter
 * Request (what it authors) separately, then combines them in one provider call.
 */
export interface HarnessGenerationRequest {
  storyId: string;
  attemptId: string;
  model: string;
  capaPrompt: CapaPrompt;
  storyInformation: StoryInformationPacket;
  /** Section 9: the frozen Mission Reminder, kept distinct until the provider boundary. */
  missionReminder: HarnessMissionReminder;
  immediateChapterRequest: ImmediateChapterRequest;
}

/** The size of the serialized provider request the host actually sent, measured at the provider boundary. */
export interface HarnessRequestMeasurement {
  systemInstructionCharacters: number;
  userPromptCharacters: number;
  responseSchemaCharacters: number;
  totalCharacters: number;
  estimatedTokens: number;
  /** Serialized characters of each presented packet section, in presentation order. */
  sections: Array<{ section: PacketSectionId; characters: number }>;
}

export interface HarnessGenerationResponse {
  rawProviderResponse: string;
  providerReceipt: HarnessProviderReceipt;
  /** Present for chapter requests measured at the provider boundary. */
  requestMeasurement?: HarnessRequestMeasurement;
}

export interface HarnessGenerationModelAdapter {
  getServerInfo(): Promise<HarnessGenerationServerInfo>;
  generate(request: HarnessGenerationRequest): Promise<HarnessGenerationResponse>;
  arcOperation?(request: HarnessArcRequest): Promise<HarnessGenerationResponse>;
  /** The Holdings fixer's one small call after a chapter commits. Without it, the fixer does not run. */
  fixHoldings?(request: HarnessHoldingsFixRequest): Promise<HarnessGenerationResponse>;
  /** The look step's one small call after a chapter commits. Without it, no look is written down. */
  describeLooks?(request: HarnessLookRequest): Promise<HarnessGenerationResponse>;
  /** The tagger's one call on a chapter that is already written. Without it, a chapter is simply not tagged. */
  tagChapter?(request: HarnessTagRequest): Promise<HarnessGenerationResponse>;
}

/**
 * One appearance the look step is asked to write down: who or what, the
 * passage that shows it (the tagged sentence and the few after it), and what
 * is already known of its look. Never the whole chapter.
 */
export interface HarnessLookSubject {
  /** The appearance's id (`AppearanceAttachment.id`): the answer names it. */
  id: string;
  name: string;
  entity: AppearanceEntity;
  /** On the page for the first time (`appears`), or a change to a look (`look`). */
  event: AppearanceEvent;
  /** A look tag's change, in the writer's words. */
  change?: string;
  /** The tagged sentence and the sentences after it in its paragraph. */
  passage: string;
  /** The look the story's author declared for them, in the author's words, when they declared one. */
  declared?: string;
  /** The look the record held before this appearance, for a change. */
  previous?: Look;
}

/** The look step's call: each appearance of one committed chapter, with the chapter's own model. */
export interface HarnessLookRequest {
  operation: 'describe-looks';
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  model: string;
  /** The story's language: every look is written in it. */
  language: string;
  subjects: HarnessLookSubject[];
}

/**
 * One person, thing or ability the story already has, as the tagger is told
 * it: the name the story writes it by, and every other name it answers to.
 *
 * Without this list a tagger invents a second identity every time the prose
 * calls someone "the old man" or a sword "his blade", and the record fills
 * with strangers. With it, a tag lands on the card the story already holds.
 */
export interface HarnessTagSubject {
  name: string;
  kind: CodexEntryKind;
  /** The other names the story calls them by. */
  aliases?: string[];
  /** The one subject whose tags use the main character's own tag instead of a name. */
  mainCharacter?: true;
}

/**
 * The tagger's one call, on a chapter that is already written (SENSEI,
 * 2026-10-24). It reads the finished prose and writes the app's tags into it:
 * the sounds, who speaks, what changed hands, and who stepped onto the page.
 *
 * It is deliberately told nothing about how the story got here. No Foundation,
 * no arc, no Destined Ending, no Story Information Packet: a chapter an author
 * wrote themselves and brought in here has none of those, and the tagger has
 * to work on that chapter exactly as well as on a generated one. What it gets
 * is the chapter, who and what already exists, what the main character was
 * carrying, and the words it is allowed to name.
 */
export interface HarnessTagRequest {
  operation: 'tag-chapter';
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  /** The model that reads the chapter: the host's choice for the tagger, else the chapter's own writer. */
  model: string;
  /**
   * How hard the tagger thinks, when the host chose (`HarnessTaggerChoice`).
   * The server checks it against the model's levels; absent or unknown, the
   * tagger thinks as little as the model allows.
   */
  reasoningLevel?: string;
  /** The story's language: the tagger reads the chapter in it and writes no prose at all. */
  language: string;
  /** The chapter as it stands, one entry per paragraph, carrying no tag. */
  paragraphs: string[];
  /** Who and what the story already has, so no tag invents a second identity. */
  subjects: HarnessTagSubject[];
  /**
   * What each character had going into this chapter. Without it a thing
   * already theirs reads as one they just got, and "drew his sword" is tagged
   * as gaining a sword.
   */
  holdings?: HoldingsSection;
  /** The story's sound words. Without them nothing is tagged with a sound. */
  soundWords?: SoundWord[];
  /** The story's music and atmosphere categories. Without them no soundtrack is chosen. */
  soundtrack?: SoundtrackVocabulary;
}

/**
 * The host's choice for the Chapter Tagger (SENSEI, 2026-10-29: "maybe cheap
 * models with high reasoning are really good for tagging"): the model that
 * reads each chapter, and how hard it thinks. Either absent means the old
 * behaviour: the chapter's own writer, thinking as little as it allows. In the
 * Library it is the Model Router's Chapter Tagger choice.
 */
export interface HarnessTaggerChoice {
  model?: string;
  reasoningLevel?: string;
}

/**
 * How far the Holdings fixer may go: not at all, a chapter's holding records
 * only, or its records and, one at a time, a sentence of its prose. The host
 * (in the Library, the Familiar) chooses.
 */
export type HarnessHoldingsFixerPolicy = 'off' | 'records-only' | 'records-and-sentences';

/** What the fixer may answer a case with. */
export type HarnessHoldingsFixAnswer = 'record' | 'prose' | 'fine' | 'major';

/**
 * One small problem the Holdings fixer is asked about: the sentence it is on
 * (or the sentences that name the item, or two names that may be one), what
 * the checks found there, and what the record shows. Never the whole chapter.
 */
export interface HarnessHoldingsFixCase {
  id: string;
  /** What the checks found, in plain words. */
  problems: string[];
  /** The sentence the problem is on, with the sentences around it. */
  passage?: { before?: string; sentence: string; after?: string };
  /** Every holding tag that sentence carries, as the record has it. */
  tags?: string;
  /** What the record shows: what the holder had, and the item's history. */
  record?: string[];
  /** Sentences of the chapter that name the item, each with the id an answer uses. */
  mentions?: Array<{ id: string; sentence: string }>;
  /** The answers this case allows. */
  answers: HarnessHoldingsFixAnswer[];
}

/** The Holdings fixer's call: the chapter's small problems, with the chapter's own model. */
export interface HarnessHoldingsFixRequest {
  operation: 'fix-holdings';
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  model: string;
  /** The story's language: a corrected sentence is written in it. */
  language: string;
  /** The main character, whom tags name MC. */
  mainCharacter?: string;
  /** The reader's direction for the chapter, so a change they asked for stays. */
  direction?: string;
  cases: HarnessHoldingsFixCase[];
}

/** One problem the fixer looked at, and what became of it. */
export interface HarnessHoldingsFix {
  /** The checks that found it. */
  checks: import('./holdings').HoldingFlagKind[];
  /** What they found, in plain words. */
  problems: string[];
  /**
   * `fixed-tags`: the record was corrected. `fixed-sentence`: one sentence was
   * corrected. `merged`: two names became one entry. `fine`: nothing was
   * wrong. `major`: a contradiction no small fix can settle, kept as it is.
   * `skipped`: no fix was safe to make.
   */
  outcome: 'fixed-tags' | 'fixed-sentence' | 'merged' | 'fine' | 'major' | 'skipped';
  /** The paragraph it was in. */
  blockId?: string;
  /** The tags or sentence before the fix. */
  before?: string;
  /** The tags or sentence after it. */
  after?: string;
  /** The fixer's reason, or why nothing was changed. */
  reason?: string;
  /** For a merge: the entry kept and the name it now also answers to, so a rewrite of the chapter can take it back. */
  merged?: { keptEntryId: string; alias?: string };
}

/** The Holdings fixer's record on a chapter: what it checked and what it changed. */
export interface HarnessHoldingsFixRecord {
  checkedAt: string;
  /** The model asked, when one was. Problems settled without a call ask none. */
  model?: string;
  providerReceipt?: HarnessProviderReceipt;
  /** The fixer's reply as it came back, for inspection. */
  rawProviderResponse?: string;
  /** Why the call did not complete. The chapter stays as it was committed. */
  error?: string;
  fixes: HarnessHoldingsFix[];
}

export interface HarnessArcRequest {
  operation: 'plan-arc';
  storyId: string;
  model: string;
  storyInformation: StoryInformationPacket;
  /** What only the arc planner receives. Absent on requests saved before schema 24. */
  planning?: HarnessArcPlanningContext;
}

/** One earlier arc as the arc planner sees it: its goals and how each turned out. */
export interface HarnessPlannedArcHistory {
  arcNumber: number;
  goals: Array<{ text: string; outcome: 'completed' | 'missed' | 'unresolved' }>;
}

/**
 * The arc planner's own context, beside the Story Information Packet: which
 * arc it plans within the story's length, how the earlier arcs went, and the
 * hidden look-ahead. The chapter writer never receives it.
 */
export interface HarnessArcPlanningContext {
  arcNumber: number;
  /** The story's length in arcs, when it has one. */
  plannedArcCount?: number;
  /** This arc is the story's last: its final goal is reaching the Destined Ending. */
  finalArc: boolean;
  /** The last three arcs before this one, in order, with every goal's outcome. */
  previousArcs: HarnessPlannedArcHistory[];
  /** A one-line tally of any arcs before those three. */
  earlierArcs?: string;
  /** The current look-ahead: earlier direction for this arc and the next. */
  lookahead: import('../components/arc-goals/shared/arcGoals').ArcLookaheadEntry[];
}

/** Durable checkpoint for the required Arc planner provider operation. */
export interface HarnessArcPlanOperation {
  id: string;
  storyId: string;
  foundationRevisionId: string;
  request: HarnessArcRequest;
  startedAt: string;
  status: 'request_started' | 'provider_outcome_unknown' | 'raw_received' | 'completed' | 'abandoned' | 'failed';
  rawProviderResponse?: string;
  providerReceipt?: HarnessProviderReceipt;
  failure?: string;
}

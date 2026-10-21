/**
 * `@seihouse/sen/harness-generation` — an independent, checkpoint-first
 * novel core. A host may inject a neutral Story Seed source, but the package
 * has no dependency on Story Seed internals or the legacy generation cycle.
 * A derived adapter and session compose the existing SEN Reader/Codex surfaces.
 */
export {
  HarnessGenerationController,
  exportHarnessStory,
  type HarnessChapterWrite,
  type HarnessEventPreserver,
  type HarnessGenerationControllerOptions,
} from '../../components/harness-generation/shared/controller';
export {
  createEmptyHarnessWorkspaceState,
  isCurrentHarnessWorkspaceState,
  migrateHarnessWorkspaceState,
  readHarnessWorkspaceState,
  type HarnessGenerationRepository,
} from '../../components/harness-generation/shared/repository';
export {
  HarnessCapabilityRegistry,
  buildHarnessProjectionIntents,
  defaultHarnessCapabilityHandlers,
  resolveHarnessEntity,
  type HarnessCapabilityContext,
  type HarnessCapabilityHandler,
  type HarnessCapabilityResult,
  type HarnessProjectionBuilder,
} from '../../components/harness-generation/shared/capabilities';
export {
  buildCanonicalStoryView,
  type AppendHarnessCorrectionInput,
} from '../../components/harness-generation/shared/canonicalState';
export { compileStoryInformationPacket, projectCurrentStory } from '../../components/harness-generation/shared/context';
export { projectCanonicalState, normalizeIdentityLabel, type CanonicalProjectionInput, type CanonicalProjectionResult } from '../../components/harness-generation/shared/canonicalProjection';
export { GENERATION_PACKET_BUDGET, PACKET_SECTION_ORDER, PLANNER_SECTION_ORDER, WRITER_SECTION_ORDER, estimatePacketTokens, type PacketSectionBudget } from '../../components/harness-generation/shared/packetBudget';
export {
  ALWAYS_LOADED_SKILLS,
  CAPA_SCHEMA,
  CAPA_PROMPT_TOKEN_LIMIT,
  HARNESS_SKILL_INSTRUCTION_LIMIT,
  assembleCapaPrompt,
  capaPromptParts,
  buildHarnessOfficialOutputRequirements,
  createHarnessSkillCatalog,
  freezeHarnessSkillLoadout,
  harnessSkillKey,
  managedCapaSkillSignature,
  managedCapaSlotReason,
  resolveHarnessSkill,
  resolveManagedCapaSkills,
  resolveStoryLanguagePackage,
  validateHarnessSkillManifest,
  type CapaSlotDefinition,
  type CapaSlotManager,
  type StoryLanguagePackage,
} from '../../components/harness-generation/shared/skills';
export {
  HARNESS_CANONICAL_LANGUAGE,
  TRANSLATION_GLOSSARY_ENTRY_LIMIT,
  buildSelectedTranslationGlossary,
  isTranslationPackageFor,
  presentSelectedTranslationGlossary,
  resolveTranslationPackage,
  selectTranslationGlossaryEntries,
  translationMatchSource,
  translationSkillContentDigest,
  translationTargetLanguage,
  validateTranslationGlossaryResource,
  validateTranslationSkillMetadata,
  type TranslationPackageApplication,
  type TranslationPackageResolution,
  type TranslationPackageSelection,
} from '../../narrative/translationSkill';
export { buildImmediateChapterRequest } from '../../components/harness-generation/shared/immediateChapterRequest';
export { activeAttemptForStory, isBlockingAttempt } from '../../components/harness-generation/shared/attempts';
export { chapterRewriteGap, latestStoryChapter, readRewriteNote, withoutLatestChapter } from '../../components/harness-generation/shared/chapterRewrite';
export { attemptChapterPath, chapterDirectionGap, nextChapterWaitsOnReader, pendingChapterDirection, validateChapterDirectionChoice } from '../../components/harness-generation/shared/chapterDirection';
export { CHAPTER_DIRECTION_TEXT_LIMIT } from '../../narrative/generation';
export {
  FATE_PRESSURE_RHYTHM_CONFIG,
  buildRhythmRecommendation,
  recommendNextChapterFunction,
  type ChapterFunctionRecord,
  type FatePressureRhythmConfig,
  type FatePressureTierProfile,
  type HarnessRhythmRecommendation,
} from '../../components/harness-generation/shared/rhythm';
export {
  MISSION_REMINDER_OPENING,
  MISSION_REMINDER_TEXT_LIMIT,
  buildMissionReminder,
} from '../../components/harness-generation/shared/missionReminder';
export { arcGoalEditState, arcPlanGap, arcReviewGap, goalsThatBreakRoute, harnessArcContext, harnessArcPlan, harnessChapterArc, harnessStoryMode, missedGoalsBreakRoute, missingRequiredEnding, nextArcStep, regularFinalGoalMissed, routeCompleteGap, storyConclusionGap, type HarnessArcGoalEditState, type HarnessNextArcStep, type HarnessStoryMode } from '../../components/harness-generation/shared/arcState';
export * from '../../narrative/storyDirection';
export {
  includeBundledHarnessSkills,
  SEN_NOVEL_AUTHOR_SKILL,
} from '../../components/harness-generation/shared/authorSkill';
export { SEN_FATE_SURVIVAL_INSTRUCTIONS, SEN_FATE_SURVIVAL_PLANNING, SEN_FATE_SURVIVAL_SKILL } from '../../components/harness-generation/shared/fateSurvivalSkill';
export { SEN_READING_MODE_SKILLS } from '../../components/harness-generation/shared/readingModeSkills';
export { SEN_SOUND_CUES_INSTRUCTIONS, SEN_SOUND_CUES_SKILL, presentSoundVocabulary } from '../../components/harness-generation/shared/soundCuesSkill';
export { SEN_SOUNDTRACK_INSTRUCTIONS, SEN_SOUNDTRACK_SKILL, presentSoundtrackVocabulary } from '../../components/harness-generation/shared/soundtrackSkill';
export { chapterSoundtrack, type ChapterSoundtrackReading } from '../../components/harness-generation/shared/soundtrack';
export { SEN_SPEAKERS_INSTRUCTIONS, SEN_SPEAKERS_SKILL } from '../../components/harness-generation/shared/speakersSkill';
export { MAIN_CHARACTER_SPEAKER_TAG, UNNAMED_SPEAKER } from '../../narrative/speech';
export { HARNESS_TAG_RULES } from '../../components/harness-generation/shared/tagRules';
export { isStraySoundTag, settleStraySoundTags, trimLeadingStrayPunctuation } from '../../components/harness-generation/shared/soundTagRepair';
export {
  HOLDING_VERB_OF_CHANGE,
  UNNAMED_MAIN_CHARACTER,
  abilityLabel,
  declaredCharacters,
  deriveHoldings,
  holdingRecordId,
  holdingTargetKind,
  namesNearlyMatch,
  createCodexEntryResolver,
  thingLabel,
  type CharacterHoldings,
  type CodexEntryResolver,
  type DeclaredCharacter,
  type HeldThing,
  type HoldingEvent,
  type HoldingFlag,
  type HoldingFlagKind,
  type HoldingPassage,
  type HoldingsChapter,
  type HoldingsState,
  type KnownAbility,
} from '../../components/harness-generation/shared/holdings';
export {
  checkChapterPlan,
  readChapterPlan,
  readPlanRef,
  resolveChapterPlan,
  unresolvedPlan,
  writerChapterPlan,
  type ChapterPlanReading,
  type CheckedChapterPlan,
} from '../../components/harness-generation/shared/chapterPlan';
export {
  PlanRecordBuilder,
  blockedFact,
  conditionLabel,
  derivePlanRecord,
  openCommitments,
  openGoal,
  type RecordChapter,
  type RecordPassage,
  type RecordedCommitment,
  type RecordedCondition,
  type RecordedEntity,
  type RecordedGoal,
  type RecordedParty,
  type RecordedStance,
  type RecordedStatus,
  type RecordedValue,
} from '../../components/harness-generation/shared/planRecord';
export { buildCodexSection } from '../../components/harness-generation/shared/codexSection';
export {
  deriveStoryCodex,
  type CodexCharacter,
  type CodexCheck,
  type CodexFaction,
  type CodexItem,
  type CodexItemEvent,
  type CodexPassage,
  type CodexPictureCard,
  type CodexPictures,
  type CodexPictureMade,
  type CodexPictureMaker,
  type CodexVoice,
  type StoryCodexChapter,
  type StoryCodexRecord,
} from '../../components/harness-generation/shared/storyCodex';
export { factionNamed, type DeclaredFaction as CodexDeclaredFaction } from '../../components/harness-generation/shared/factions';
export { firstVoices, readAloudVoicesOf, resolveSpeakers } from '../../components/harness-generation/shared/voices';
export * from '../../narrative/holdings';
export * from '../../narrative/looks';
export * from '../../narrative/chapterPlan';
export { createHarnessSenStory } from '../../components/harness-generation/shared/senAdapter';
export * from '../../narrative/generation';
export { HarnessReaderSession, type HarnessReaderWriting, type ReaderHostTools } from '../../components/harness-generation/development/HarnessReaderSession';
export { ProseChapterBody } from '../../components/harness-generation/development/ProseChapterBody';
export { ReaderAudioNote } from '../../components/harness-generation/development/ReaderAudioNote';
export { ReaderPanel, useWideReader } from '../../components/harness-generation/development/ReaderPanel';
export type { ReaderLayer } from '../../components/harness-generation/development/HarnessReaderSession';
export type { ReaderChapter, ReaderChapterBody, ReaderChapterBodyProps } from '../../components/harness-generation/development/readerChapterBody';
export type { NarrationHighlight } from '../../components/harness-generation/development/useFollowNarration';
export { FatePage } from '../../components/harness-generation/development/FatePage';
export { StoryCodex } from '../../components/harness-generation/development/StoryCodex';
export { BlueprintArcPage } from '../../components/harness-generation/development/BlueprintArcPage';
export { useNextChapterWriter, type NextChapterWriter } from '../../components/harness-generation/development/useNextChapterWriter';
export {
  CHAPTER_FUNCTION_LABELS,
  FATE_MODE_LABELS,
  FateArcGoalCard,
  FateConclusion,
  FateDestinedEnding,
  FatePathChooser,
  describeChapterPath,
} from '../../components/harness-generation/development/FatePanel';
export { findStory, findFoundationRevision } from '../../components/harness-generation/shared/foundation';
export * from '../../components/harness-generation/shared/chapterSignals';
export * from '../../components/harness-generation/shared/chapterBody';
export { chapterTitleText } from '../../narrative/chapterTitle';

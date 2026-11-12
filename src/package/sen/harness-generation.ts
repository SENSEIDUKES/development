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
  type HarnessGenerationControllerOptions,
} from '../../components/harness-generation/shared/controller';
export {
  createEmptyHarnessWorkspaceState,
  HARNESS_WORKSPACE_CONFLICT_MESSAGE,
  HarnessWorkspaceConflictError,
  isCurrentHarnessWorkspaceState,
  migrateHarnessWorkspaceState,
  nextHarnessWorkspaceRevision,
  readHarnessWorkspaceState,
  type HarnessGenerationRepository,
} from '../../components/harness-generation/shared/repository';
export {
  buildCanonicalStoryView,
  type AppendHarnessCorrectionInput,
} from '../../components/harness-generation/shared/canonicalState';
export { compileStoryInformationPacket, projectCurrentStory } from '../../components/harness-generation/shared/context';
export { projectCanonicalState, normalizeIdentityLabel, type CanonicalProjectionInput, type CanonicalProjectionResult } from '../../components/harness-generation/shared/canonicalProjection';
export { GENERATION_PACKET_BUDGET, PACKET_SECTION_ORDER, estimatePacketTokens, type PacketSectionBudget } from '../../components/harness-generation/shared/packetBudget';
export {
  CAPA_SCHEMA,
  CAPA_WRITER_SLOTS,
  CAPA_BLUEPRINT_SLOTS,
  CAPA_PROMPT_TOKEN_LIMIT,
  HARNESS_SKILL_INSTRUCTION_LIMIT,
  assembleBlueprintSkills,
  assembleCapaPrompt,
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
  type CapaSlotReader,
  type StoryLanguagePackage,
} from '../../components/harness-generation/shared/skills';
export {
  SEN_ARC_PLANNER_SKILL,
  SEN_BLUEPRINT_DEFAULT_SKILLS,
  SEN_EASTERN_FANTASY_ORIGIN_SKILL,
  SEN_WORLD_BUILDER_SKILL,
} from '../../components/harness-generation/shared/blueprintSkills';
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
export { SEN_FATE_SURVIVAL_INSTRUCTIONS, SEN_FATE_SURVIVAL_SKILL } from '../../components/harness-generation/shared/fateSurvivalSkill';
export { SEN_READING_MODE_SKILLS } from '../../components/harness-generation/shared/readingModeSkills';
export { SEN_SOUND_CUES_INSTRUCTIONS, presentSoundVocabulary } from '../../components/harness-generation/shared/soundCuesSkill';
export { SEN_SOUNDTRACK_INSTRUCTIONS, presentSoundtrackVocabulary } from '../../components/harness-generation/shared/soundtrackSkill';
export { chapterSoundtrack, type ChapterSoundtrackReading } from '../../components/harness-generation/shared/soundtrack';
export { SEN_SPEAKERS_INSTRUCTIONS } from '../../components/harness-generation/shared/speakersSkill';
export { SEN_HOLDINGS_INSTRUCTIONS } from '../../components/harness-generation/shared/holdingsSkill';
export { SEN_APPEARANCE_INSTRUCTIONS, SEN_APPEARANCE_INSTRUCTIONS_WITHOUT_CARDS } from '../../components/harness-generation/shared/appearanceSkill';
export { SEN_STATUS_INSTRUCTIONS } from '../../components/harness-generation/shared/statusSkill';
export { SEN_PLACE_INSTRUCTIONS } from '../../components/harness-generation/shared/placeSkill';
export { SEN_TIE_INSTRUCTIONS } from '../../components/harness-generation/shared/tieSkill';
export { SEN_SETTING_INSTRUCTIONS } from '../../components/harness-generation/shared/settingSkill';
export { HARNESS_TAG_RULES, HARNESS_TAG_RULES_WITHOUT_CARDS } from '../../components/harness-generation/shared/tagRules';
export { isStraySoundTag, settleStraySoundTags, trimLeadingStrayPunctuation } from '../../components/harness-generation/shared/soundTagRepair';
export {
  HOLDINGS_SECTION_OTHER_CHARACTERS,
  declaredCharacters,
  deriveHoldings,
  holdingName,
  holdingTargetKind,
  holdingsSection,
  namesNearlyMatch,
  placeHoldingChanges,
  readHoldingTag,
  resolveHoldingChanges,
  createCodexEntryResolver,
  codexEntriesWithWorldCards,
  isMinorEntry,
  type CharacterHoldings,
  type CodexEntryResolver,
  type DeclaredCharacter,
  type HeldThing,
  type HoldingEvent,
  type HoldingFlag,
  type HoldingFlagKind,
  type HoldingPassage,
  type HoldingPlacement,
  type HoldingsChapter,
  type HoldingsState,
  type KnownAbility,
  type ReadHoldingTag,
  type ResolvedHoldingChanges,
} from '../../components/harness-generation/shared/holdings';
export {
  HOLDINGS_FIXER_CASE_LIMIT,
  applyHoldingsFixes,
  chapterHoldingFlags,
  holdingTagText,
  planHoldingsFix,
  readFixTags,
  readHoldingsFixReply,
  type HoldingsFixApplyInput,
  type HoldingsFixInput,
  type HoldingsFixPlan,
  type HoldingsFixPlanCase,
  type HoldingsFixResult,
} from '../../components/harness-generation/shared/holdingsFixer';
export {
  deriveStoryCodex,
  type CodexCharacter,
  type CodexCheck,
  type CodexFaction,
  type CodexItem,
  type CodexItemEvent,
  type CodexCondition,
  type CodexMinor,
  type CodexPassage,
  type CodexPromotedCard,
  type CodexPictureCard,
  type CodexPictures,
  type CodexPictureMade,
  type CodexPictureMaker,
  type CodexVoice,
  type StoryCodexChapter,
  type StoryCodexRecord,
} from '../../components/harness-generation/shared/storyCodex';
export {
  STORY_KNOWLEDGE_CATEGORIES,
  storyCodexOf,
  storyKnowledge,
  storyKnowledgeOf,
} from '../../components/harness-generation/shared/storyKnowledge';
export { factionNamed, type DeclaredFaction as CodexDeclaredFaction } from '../../components/harness-generation/shared/factions';
export {
  APPEARED_SECTION_CHARACTERS,
  APPEARED_SECTION_THINGS,
  appearancesSection,
  deriveAppearances,
  describableAppearances,
  placeAppearances,
  placeAppearancesFromPlaces,
  readAppearanceTag,
  resolveAppearances,
  thingAppearancesFromHoldings,
  type AppearanceFlag,
  type AppearancePassage,
  type AppearancePlacement,
  type AppearanceSubject,
  type AppearancesChapter,
  type AppearancesState,
  type LookChange,
  type ReadAppearanceTag,
  type RecordedLook,
  type ResolvedAppearances,
} from '../../components/harness-generation/shared/appearances';
export {
  placeStatuses,
  readStatusTag,
  resolveStatuses,
  statusKey,
  type ReadStatusTag,
  type StatusPlacement,
} from '../../components/harness-generation/shared/statuses';
export {
  derivePlaces,
  placeKey,
  placeOfEntry,
  placePlaces,
  readPlaceTag,
  resolvePlaces,
  type CurrentPlace,
  type PlacePlacement,
  type ReadPlaceTag,
} from '../../components/harness-generation/shared/places';
export {
  TAG_SUBJECT_TIES,
  deriveTies,
  placeTies,
  readTieTag,
  resolveTies,
  tieKey,
  tiesLine,
  tiesOfEntry,
  type CurrentTie,
  type EntryTie,
  type ReadTieTag,
  type TiePlacement,
} from '../../components/harness-generation/shared/ties';
export {
  placeSettings,
  readSettingTag,
  settingAt,
  settingLine,
  type CurrentSetting,
  type ReadSettingTag,
  type SettingPlacement,
} from '../../components/harness-generation/shared/settings';
export {
  LOOK_DECLARED_CHARACTERS,
  LOOK_PASSAGE_CHARACTERS,
  LOOK_SUBJECT_LIMIT,
  LOOK_SUMMARY_WORDS,
  LOOK_TRAITS,
  LOOK_TRAIT_WORDS,
  chapterLooks,
  lookPassage,
  planLookSubjects,
  CODEX_LOOK_PASSAGE_CHARACTERS,
  planCodexLook,
  readDescribedLooks,
} from '../../components/harness-generation/shared/lookDescriber';
export {
  notesOfTaggedChapter,
  placeTagNotes,
  planChapterTagging,
  readChapterTagging,
  retagChapterGap,
  tagSubjectsOfStory,
  type ChapterTagging,
  type ChapterTags,
  type PlacedTagNotes,
  type TagNote,
} from '../../components/harness-generation/shared/tagger';
export { TAG_SUBJECT_CONDITIONS, TAG_SUBJECT_WHO_CHARACTERS } from '../../components/harness-generation/shared/tagger';
export { leftOutTagFlags, tagsOfCards, type LeftOutTagFlag, type NamingTags, type TagsOfCards } from '../../components/harness-generation/shared/minorFigures';
export * from '../../narrative/holdings';
export * from '../../narrative/appearances';
export * from '../../narrative/statuses';
export * from '../../narrative/places';
export * from '../../narrative/ties';
export * from '../../narrative/settings';
export { createHarnessSenStory } from '../../components/harness-generation/shared/senAdapter';
export * from '../../narrative/generation';
export { HarnessReaderSession, type HarnessReaderWriting, type ReaderGenerationCost, type ReaderHostTools, type ReaderSoundAuthoring } from '../../components/harness-generation/development/HarnessReaderSession';
export { ProseChapterBody } from '../../components/harness-generation/development/ProseChapterBody';
export { ReaderAudioNote } from '../../components/harness-generation/development/ReaderAudioNote';
export { ReaderPanel, useWideReader } from '../../components/harness-generation/development/ReaderPanel';
export type { ReaderLayer } from '../../components/harness-generation/development/HarnessReaderSession';
export type { ReaderChapter, ReaderChapterBody, ReaderChapterBodyProps } from '../../components/harness-generation/development/readerChapterBody';
export type { NarrationHighlight } from '../../components/harness-generation/development/useFollowNarration';
export { FatePage } from '../../components/harness-generation/development/FatePage';
export { StoryCodex } from '../../components/harness-generation/development/StoryCodex';
export { CodexCardArt, CodexCardButton, CodexProfileHeader, type CodexCardCategory } from '../../components/harness-generation/development/codexCardParts';
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
export { findStory, findFoundationRevision, findActiveFoundationRevision, storyWorldRecord } from '../../components/harness-generation/shared/foundation';
export { createHarnessStory } from '../../components/harness-generation/shared/foundation';
export {
  conditionLabel, conditionsSection, deriveConditions,
  type CarriedCondition, type CharacterConditions, type ConditionFlag, type ConditionsChapter, type ConditionsState,
} from '../../components/harness-generation/shared/conditions';
export { PROMOTED_CARD_SLOT_CHARACTERS, fillPromotedCard, promoteMinorFigure, promotedCardSlots } from '../../components/harness-generation/shared/promotion';
export * from '../../components/harness-generation/shared/chapterSignals';
export * from '../../components/harness-generation/shared/chapterBody';
export { chapterTitleText } from '../../narrative/chapterTitle';
export {
  chapterTagFindings,
  describeChapterTagging,
  storyTaggingSummary,
  type ChapterTagFindings,
  type ChapterTaggingAccount,
  type ChapterTaggingKind,
  type ChapterTaggingKindLine,
} from '../../components/harness-generation/shared/chapterTagging';

/**
 * `@seihouse/sen/harness-generation` — an independent, checkpoint-first
 * novel core. A host may inject a neutral Story Seed source, but the package
 * has no dependency on Story Seed internals or the legacy generation cycle.
 * A derived adapter and session compose the existing SEN Reader/Codex surfaces.
 */
export {
  HarnessGenerationController,
  exportHarnessStory,
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
export { GENERATION_PACKET_BUDGET, PACKET_SECTION_ORDER, estimatePacketTokens, type PacketSectionBudget } from '../../components/harness-generation/shared/packetBudget';
export {
  CAPA_SCHEMA,
  CAPA_PROMPT_TOKEN_LIMIT,
  HARNESS_SKILL_INSTRUCTION_LIMIT,
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
export { attemptChapterPath, chapterDirectionGap, pendingChapterDirection, validateChapterDirectionChoice } from '../../components/harness-generation/shared/chapterDirection';
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
export { arcGoalEditState, goalsThatBreakRoute, harnessArcContext, harnessArcPlan, harnessChapterArc, harnessStoryMode, missedGoalsBreakRoute, missingRequiredEnding, regularFinalGoalMissed, storyConclusionGap, type HarnessArcGoalEditState, type HarnessStoryMode } from '../../components/harness-generation/shared/arcState';
export * from '../../narrative/storyDirection';
export {
  includeBundledHarnessSkills,
  SEN_NOVEL_AUTHOR_SKILL,
} from '../../components/harness-generation/shared/authorSkill';
export { SEN_FATE_SURVIVAL_INSTRUCTIONS, SEN_FATE_SURVIVAL_SKILL } from '../../components/harness-generation/shared/fateSurvivalSkill';
export { SEN_READING_MODE_SKILLS } from '../../components/harness-generation/shared/readingModeSkills';
export { createHarnessSenStory } from '../../components/harness-generation/shared/senAdapter';
export * from '../../narrative/generation';
export { HarnessReaderSession } from '../../components/harness-generation/development/HarnessReaderSession';
export { FatePage } from '../../components/harness-generation/development/FatePage';
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

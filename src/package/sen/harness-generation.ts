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
  HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS,
  HARNESS_SKILL_INSTRUCTION_LIMIT,
  assembleCapaPrompt,
  createHarnessSkillCatalog,
  freezeHarnessSkillLoadout,
  harnessSkillKey,
  resolveHarnessSkill,
  validateHarnessSkillManifest,
  type CapaSlotDefinition,
} from '../../components/harness-generation/shared/skills';
export {
  TRANSLATION_GLOSSARY_ENTRY_LIMIT,
  buildSelectedTranslationGlossary,
  isTranslationSkillCompatible,
  presentSelectedTranslationGlossary,
  selectTranslationGlossaryEntries,
  translationCompatibilityError,
  translationMatchSource,
  translationTargetLanguage,
  validateTranslationGlossaryResource,
  validateTranslationSkillMetadata,
} from '../../narrative/translationSkill';
export { buildImmediateChapterRequest } from '../../components/harness-generation/shared/immediateChapterRequest';
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
export { arcGoalEditState, harnessArcContext, harnessArcPlan, harnessStoryMode, type HarnessArcGoalEditState, type HarnessStoryMode } from '../../components/harness-generation/shared/arcState';
export * from '../../narrative/storyDirection';
export {
  includeBundledHarnessSkills,
  SEN_NOVEL_AUTHOR_SKILL,
} from '../../components/harness-generation/shared/authorSkill';
export { createHarnessSenStory } from '../../components/harness-generation/shared/senAdapter';
export * from '../../narrative/generation';
export { HarnessReaderSession } from '../../components/harness-generation/development/HarnessReaderSession';
export { findStory, findFoundationRevision } from '../../components/harness-generation/shared/foundation';
export * from '../../components/harness-generation/shared/chapterSignals';
export * from '../../components/harness-generation/shared/chapterBody';

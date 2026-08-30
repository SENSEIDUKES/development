/**
 * `@seihouse/sen/harness-generation` — an independent, checkpoint-first
 * novel core. It intentionally has no dependency on the legacy Chapter
 * Generation, Story Seed, Reader, Codex, or presentation systems.
 */
export {
  HarnessGenerationWorkspace,
  type HarnessGenerationWorkspaceProps,
} from '../../components/harness-generation/development/HarnessGenerationWorkspace';
export {
  HarnessGenerationController,
  exportHarnessStory,
  type HarnessEventPreserver,
  type HarnessGenerationControllerOptions,
} from '../../components/harness-generation/shared/controller';
export {
  IndexedDbHarnessGenerationRepository,
  HARNESS_GENERATION_INDEXED_DB_NAME,
  type HarnessGenerationRepository,
} from '../../components/harness-generation/shared/repository';
export { HarnessGenerationHttpClient } from '../../components/harness-generation/shared/httpClient';
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
export { DEFAULT_HARNESS_CONTEXT_POLICY } from '../../components/harness-generation/shared/context';
export * from '../../components/harness-generation/shared/types';

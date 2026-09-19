/**
 * Small import bridge used by the production Codex views in DEV. It points at
 * existing Reader/shared primitives and explicit Workshop-local seams only.
 */
export { useAppStore } from '../../../components/reader-codex/shared/appStore';
export { vibrate } from '../../../components/reader-codex/shared/vibration';
export { generateId, generateUUID } from '@seihouse/sen/reader-chamber';
export { useDialect } from '@seihouse/sen/reader-chamber';
export { AGENTS } from './agents';
export { canonicalAssetId, isSameAssetId } from '@seihouse/sen/reader-codex';
export { handleDownload } from '@seihouse/sen/reader-codex';
export {
  HUB_STORY_ID_MARKERS,
  hasDemoMatrixIdPrefix,
  hasHubStoryIdPrefix,
  isHubStory,
  isHubStoryLockedForUser,
  isMortalTier,
} from './hubStories';
export {
  extractWorkshopGlossaryTerms,
  type WorkshopGlossaryInput,
  type WorkshopGlossaryTerm,
} from '../../../components/reader-codex/shared/workshopGlossary';

import type { CinematicScrollStateName } from '../../../components/reader-chamber/shared/stubs';

export type PreviewState =
  | 'reading'
  | 'preferences-open'
  | 'bookmarks-open'
  | 'alter-fate-open'
  | 'continuity-warning'
  | 'generating'
  | 'translating'
  | 'fullscreen'
  | 'death-scene'
  | 'empty-chapter'
  | 'auto-scroll-paused';

/**
 * `uiAction` names a real in-chamber control the simulator clicks after the
 * chamber remounts, so every state exercises the production interaction path
 * instead of faking it with Workshop-only props.
 */
export type PreviewUiAction = 'preferences' | 'bookmarks' | 'alter-fate' | 'seal';

/**
 * Internal scenario groups consumed by the shared Workshop Controls menu:
 *
 * - `pages` renders in the canonical Pages section.
 * - `reading` and `menus` render together in the canonical States section.
 * - `effects` labels preview-only theme and particle controls in Effects; no
 *   Reader scenario is currently assigned to it.
 */
export type PreviewCategory = 'reading' | 'effects' | 'menus' | 'pages';

export const PREVIEW_CATEGORIES: { id: PreviewCategory; label: string }[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'effects', label: 'Effects' },
  { id: 'menus', label: 'Menus' },
  { id: 'pages', label: 'Pages' },
];

export interface PreviewScenario {
  id: PreviewState;
  label: string;
  /** Which section of the preview-control menu this state appears under. */
  category: Exclude<PreviewCategory, 'effects'>;
  /** Chapter the chamber opens on for this state. */
  chapter: number;
  isGenerating?: boolean;
  isTranslating?: boolean;
  isReaderFullscreen?: boolean;
  cinematicScrollState?: CinematicScrollStateName;
  uiAction?: PreviewUiAction;
}

export const scenarios: PreviewScenario[] = [
  { id: 'reading', label: 'Reading (rich blocks chapter)', category: 'reading', chapter: 1 },
  { id: 'fullscreen', label: 'Fullscreen reading', category: 'reading', chapter: 1, isReaderFullscreen: true },
  { id: 'preferences-open', label: 'Reader Settings open', category: 'menus', chapter: 1, uiAction: 'preferences' },
  { id: 'bookmarks-open', label: 'Comments (Chronicle Anchors) open', category: 'menus', chapter: 1, uiAction: 'bookmarks' },
  { id: 'alter-fate-open', label: 'Alter Fate panel open', category: 'menus', chapter: 1, uiAction: 'alter-fate' },
  { id: 'auto-scroll-paused', label: 'Auto-scroll paused (resume pill)', category: 'pages', chapter: 1, cinematicScrollState: 'yielded' },
  { id: 'generating', label: 'Generating chapter (skeleton)', category: 'pages', chapter: 4, isGenerating: true },
  { id: 'translating', label: 'Translating (Heavenly Dao spinner)', category: 'pages', chapter: 1, isTranslating: true },
  { id: 'empty-chapter', label: 'Unmanifested Segment (empty ch. 4)', category: 'pages', chapter: 4 },
  { id: 'death-scene', label: 'Death / critical scene (sealed ch. 3)', category: 'pages', chapter: 3 },
  { id: 'continuity-warning', label: 'Continuity Guard warning (Seal flow)', category: 'pages', chapter: 1, uiAction: 'seal' },
];

export function scenariosInCategory(category: PreviewCategory): PreviewScenario[] {
  return scenarios.filter((scenario) => scenario.category === category);
}

export const READER_THEMES = ['void', 'crimson', 'abyss', 'sepia', 'emerald'] as const;
export type ReaderTheme = (typeof READER_THEMES)[number];

export const PARTICLE_INTENSITIES = ['off', 'low', 'default', 'high'] as const;
export type ParticleIntensity = (typeof PARTICLE_INTENSITIES)[number];

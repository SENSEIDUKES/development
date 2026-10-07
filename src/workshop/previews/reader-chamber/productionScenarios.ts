/**
 * Scenes for the Original Reference pane: production's Reader screen
 * (Light-Novels main @ 647165a), mounted unchanged by
 * `components/reader-chamber/reference/host/ProductionReaderHost.tsx`.
 *
 * Each scene reloads the sample story with these settings, then opens a
 * production surface through its own control (`action`), so the Workshop
 * never reaches into production component state.
 */

export interface ProductionReaderScenario {
  /** The chapter the Reader opens on; -1 opens production's steering screen. */
  chapter: number;
  /** Days since the reader last read; more than half a day shows the recap. */
  awayForDays?: number;
  /** Production's Fate Survival story: genre string plus Hardcore Fate. */
  fateSurvival?: boolean;
  /** A chapter is being written when the Reader opens. */
  writing?: boolean;
  fullscreen?: boolean;
  codexOpen?: boolean;
  shortcutsOpen?: boolean;
}

export type ProductionSceneAction =
  | { kind: 'click'; label: string }
  | { kind: 'click-text'; pattern: RegExp }
  | { kind: 'event'; name: string };

export type ProductionSceneGroup = 'reading' | 'panels' | 'story';

export interface ProductionScene {
  id: string;
  label: string;
  group: ProductionSceneGroup;
  scenario: ProductionReaderScenario;
  action?: ProductionSceneAction;
}

export const PRODUCTION_SCENE_GROUPS: { id: ProductionSceneGroup; label: string }[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'panels', label: 'Panels and settings' },
  { id: 'story', label: 'Story moments' },
];

export const PRODUCTION_SCENES: ProductionScene[] = [
  { id: 'reading', label: 'Chapter 1 · system panels, World Card, reveals', group: 'reading', scenario: { chapter: 1 } },
  { id: 'continuity-note', label: 'Chapter 3 · dialogue and a continuity note', group: 'reading', scenario: { chapter: 3 } },
  { id: 'legacy-prose', label: 'Chapter 4 · older prose chapter with continuity warnings', group: 'reading', scenario: { chapter: 4 } },
  { id: 'death-flag', label: 'Chapter 5 · sealed death-flag chapter', group: 'reading', scenario: { chapter: 5 } },
  { id: 'fullscreen', label: 'Fullscreen reading', group: 'reading', scenario: { chapter: 1, fullscreen: true } },
  { id: 'settings', label: 'Reader Settings (Aetherial Styles)', group: 'panels', scenario: { chapter: 1 }, action: { kind: 'click', label: 'Aetherial Styles' } },
  { id: 'immersion', label: 'Immersion settings', group: 'panels', scenario: { chapter: 1 }, action: { kind: 'click', label: 'Immersion Settings' } },
  { id: 'bookmarks', label: 'Bookmarks (The Chronicle Anchors)', group: 'panels', scenario: { chapter: 1 }, action: { kind: 'click', label: 'The Chronicle Anchors' } },
  { id: 'glossary', label: 'Lore Glossary', group: 'panels', scenario: { chapter: 1 }, action: { kind: 'event', name: 'toggle-glossary-panel' } },
  { id: 'codex', label: 'Codex sheet', group: 'panels', scenario: { chapter: 1, codexOpen: true } },
  { id: 'shortcuts', label: 'Keyboard shortcuts', group: 'panels', scenario: { chapter: 1, shortcutsOpen: true } },
  { id: 'alter-fate', label: 'Alter Fate (Branch)', group: 'story', scenario: { chapter: 3 }, action: { kind: 'click', label: 'Alter Fate (Branch)' } },
  { id: 'seal', label: 'Seal a chapter (Continuity Guard)', group: 'story', scenario: { chapter: 3 }, action: { kind: 'click-text', pattern: /Seal Chapter|^Publish$/ } },
  { id: 'unwritten', label: 'Chapter 6 · unwritten (write it)', group: 'story', scenario: { chapter: 6 } },
  { id: 'writing', label: 'A chapter being written', group: 'story', scenario: { chapter: 6, writing: true } },
  { id: 'recap', label: 'Welcome-back recap', group: 'story', scenario: { chapter: 3, awayForDays: 2 } },
  { id: 'steering', label: 'Steer the next arc', group: 'story', scenario: { chapter: -1 } },
  { id: 'fate-survival', label: 'Fate Survival story', group: 'story', scenario: { chapter: 2, fateSurvival: true } },
];

export const DEFAULT_PRODUCTION_SCENE = PRODUCTION_SCENES[0];

/** Runs a scene's action against the production frame through its real controls. */
export function runProductionSceneAction(action: ProductionSceneAction, frame: ParentNode = document): boolean {
  if (action.kind === 'event') {
    window.dispatchEvent(new CustomEvent(action.name));
    return true;
  }
  // Production renders some controls twice (a mobile and a desktop copy); use the one on screen.
  const buttons = Array.from(frame.querySelectorAll<HTMLButtonElement>('.production-reader-frame button'))
    .filter((button) => button.getClientRects().length > 0);
  const target = buttons.find((button) => (
    action.kind === 'click'
      ? button.getAttribute('aria-label') === action.label
      : action.pattern.test(button.textContent?.trim() ?? '')
  ));
  target?.click();
  return Boolean(target);
}

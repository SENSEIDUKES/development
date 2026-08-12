import React, { useCallback, useEffect, useState } from 'react';
import ReferenceReaderChamber from '../../../components/reader-chamber/reference/ReaderChamber';
import DevelopmentReaderChamber from '../../../components/reader-chamber/development/ReaderChamber';
import { CodexSheetOverlay as ReferenceCodexSheetOverlay } from '../../../components/reader-codex/reference/CodexSheetOverlay';
import { CodexSheetOverlay as DevelopmentCodexSheetOverlay } from '../../../components/reader-codex/development/CodexSheetOverlay';
import type {
  ReaderPreferences,
  StoryMemory,
  UpdateStoryFields,
} from '../../../components/reader-chamber/shared/types';
import {
  resetMockState,
  updateMockStory,
  useAppStore,
} from '../../../components/reader-chamber/shared/stubs';
import { DEFAULT_READER_TYPOGRAPHY } from '../../../components/reader-chamber/shared/readerTypography';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import {
  ARC_TITLE,
  CURRENT_POWER_STAGE,
  createMockReaderFallback,
  mockReaderPreferences,
  MOCK_READER_FALLBACK_LABEL,
  MOCK_STORY_ID,
} from './previewData';
import {
  PARTICLE_INTENSITIES,
  PREVIEW_CATEGORIES,
  READER_THEMES,
  scenarios,
  scenariosInCategory,
  PreviewCategory,
  PreviewState,
} from './previewStates';
import '../../../components/reader-chamber/shared/reader-chamber.css';

type ReaderTab = 'reader' | 'codex' | 'memory';

type CodexOverlayComponent = typeof ReferenceCodexSheetOverlay;

function PreviewCanvas({
  children,
  CodexOverlay,
  onJumpToChapter,
}: {
  children: React.ReactElement;
  CodexOverlay: CodexOverlayComponent;
  onJumpToChapter: (chapterNumber: number) => void;
}) {
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const activeStory = useAppStore((s) => s.stories[0]);
  const chamber = React.cloneElement(children, {
    onSwitchTab: (tab: ReaderTab) => {
      if (tab === 'codex') setIsCodexOpen(true);
    },
  } as Partial<unknown>);

  if (!activeStory) return chamber;

  const updateStoryFields: UpdateStoryFields = (storyId, updates, options) =>
    useAppStore.getState().updateStory(storyId, updates, options);

  const updateMemory = (memory: StoryMemory) => {
    void updateStoryFields(activeStory.id, { memory });
  };

  return (
    <div className="relative">
      {chamber}
      <CodexOverlay
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        activeStory={activeStory}
        onUpdateMemory={updateMemory}
        updateStoryFields={updateStoryFields}
        onJumpToChapter={chapterNumber => {
          onJumpToChapter(chapterNumber);
          setIsCodexOpen(false);
        }}
      />
    </div>
  );
}

/** Click real in-chamber buttons by their accessible label so preview states
 *  drive the production interaction path (toggles, drawers, modals). Both
 *  panes render `id="reader-chamber-root"`, so in Compare mode this reaches
 *  the reference and development chambers alike. */
function clickInChamber(predicate: (button: HTMLButtonElement) => boolean) {
  document
    .querySelectorAll<HTMLButtonElement>('#reader-chamber-root button')
    .forEach((button) => {
      if (predicate(button)) button.click();
    });
}

export function ReaderChamberWorkspace() {
  const entry = workshopEntries.find((e) => e.id === 'reader-chamber')!;
  const [activeState, setActiveState] = useState<PreviewState>('reading');
  const [activeCategory, setActiveCategory] = useState<PreviewCategory>('reading');
  const [selectedChapterNum, setSelectedChapterNum] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const activeStory = useAppStore((s) => s.stories[0]);

  // Boot the mock store with a fresh story.
  useEffect(() => {
    resetMockState({ stories: [createMockReaderFallback().story], activeStoryId: MOCK_STORY_ID });
  }, []);

  const applyScenario = useCallback((stateId: PreviewState) => {
    const scenario = scenarios.find((s) => s.id === stateId)!;
    setActiveState(stateId);
    setSelectedChapterNum(scenario.chapter);
    setIsGenerating(Boolean(scenario.isGenerating));
    resetMockState({
      stories: [createMockReaderFallback().story],
      activeStoryId: MOCK_STORY_ID,
      isTranslating: Boolean(scenario.isTranslating),
      isReaderFullscreen: Boolean(scenario.isReaderFullscreen),
      cinematicScrollState: scenario.cinematicScrollState ?? 'idle',
    });
  }, []);

  // After the chambers remount for a scenario, drive its UI action (open the
  // Reader Settings panel, the bookmarks drawer, the Alter Fate modal, or start
  // the Seal flow that surfaces the Continuity Guard warning).
  useEffect(() => {
    const scenario = scenarios.find((s) => s.id === activeState);
    if (!scenario?.uiAction) return;
    const timer = setTimeout(() => {
      if (scenario.uiAction === 'preferences') {
        clickInChamber((b) => b.getAttribute('aria-label') === 'Reader Settings');
      } else if (scenario.uiAction === 'bookmarks') {
        // The Comments button reuses the Chronicle Anchors drawer for now.
        clickInChamber((b) => b.getAttribute('aria-label') === 'Comments');
      } else if (scenario.uiAction === 'alter-fate') {
        // Alter Fate lives in the header Quick Action menu — open it first
        // (discrete click updates flush synchronously, so the menu item is
        // clickable immediately after).
        clickInChamber((b) => b.getAttribute('aria-label') === 'Quick Actions');
        clickInChamber((b) => (b.getAttribute('aria-label') || '').includes('Alter Fate'));
      } else if (scenario.uiAction === 'seal') {
        clickInChamber((b) => /Seal Chapter|^Publish$/.test(b.textContent?.trim() ?? ''));
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [activeState]);

  const updateStoryFields: UpdateStoryFields = useCallback(
    (storyId, updates, options) =>
      useAppStore.getState().updateStory(storyId, updates, options),
    [],
  );

  const patchReaderPreferences = useCallback(
    (patch: Partial<ReaderPreferences>) => {
      void updateStoryFields(MOCK_STORY_ID, (current) => ({
        readerPreferences: {
          ...mockReaderPreferences,
          ...DEFAULT_READER_TYPOGRAPHY,
          ...current.readerPreferences,
          ...patch,
        },
      }));
    },
    [updateStoryFields],
  );

  if (!activeStory) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/40">
        Preparing mock story…
      </div>
    );
  }

  const chapters = activeStory.arcs[0]?.chapters ?? [];
  const currentTheme = activeStory.readerPreferences?.themeOverride ?? 'void';
  const currentParticles = activeStory.readerPreferences?.particleIntensity ?? 'default';

  const chamberProps = {
    chapters,
    currentPowerStage: CURRENT_POWER_STAGE,
    onGenerateChapter: async (chapterNumber: number) => {
      console.log(`[Preview] Generate chapter ${chapterNumber}`);
    },
    onGenerateNextFiveChapters: async (fromChapterNumber: number) => {
      console.log(`[Preview] Generate next five chapters from ${fromChapterNumber}`);
    },
    isGenerating,
    selectedChapterNum,
    setSelectedChapterNum,
    onToggleRead: (chapterNumber: number) => {
      updateMockStory(MOCK_STORY_ID, (current) => ({
        arcs: current.arcs.map((arc) => ({
          ...arc,
          chapters: arc.chapters.map((c) =>
            c.number === chapterNumber
              ? { ...c, status: (c.status === 'read' ? 'unread' : 'read') as typeof c.status }
              : c,
          ),
        })),
      }));
    },
    arcTitle: ARC_TITLE,
    onSwitchTab: undefined as ((tab: ReaderTab) => void) | undefined,
    activeStory,
    updateStoryFields,
    handleAlterFate: async (chapterNumber: number, direction: string, customPrompt: string) => {
      console.log('[Preview] Alter Fate', { chapterNumber, direction, customPrompt });
    },
    handleSealChapter: async (chapterNumber: number) => {
      updateMockStory(MOCK_STORY_ID, (current) => ({
        arcs: current.arcs.map((arc) => ({
          ...arc,
          chapters: arc.chapters.map((c) =>
            c.number === chapterNumber ? { ...c, isSealed: true, sealedAt: Date.now() } : c,
          ),
        })),
      }));
    },
    handleCheckConsistency: async (chapterNumber: number) => {
      console.log(`[Preview] Consistency check for chapter ${chapterNumber}`);
      return [
        'Elder Kang is recorded as deceased in the Codex (Chapter 0) but speaks three lines of dialogue in this chapter.',
        'The Ashen Sword is described as “unbroken” here; the Codex records it shattered in the Prologue.',
      ];
    },
  };

  // Shared button skin. `stateButton` wraps long scenario labels onto multiple
  // lines; `chipButton` stays compact for short tokens (chapter, theme, particles).
  // Both keep a ~44px minimum touch target without bulking up the desktop panel.
  const buttonBase =
    'min-h-[2.75rem] rounded-lg border text-xs leading-snug transition-all duration-200';
  const buttonTone = (active: boolean) =>
    active
      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-100'
      : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10';
  const stateButton = (active: boolean) =>
    `${buttonBase} ${buttonTone(active)} w-full px-3 py-2 text-left break-words hyphens-auto`;
  const chipButton = (active: boolean) =>
    `${buttonBase} ${buttonTone(active)} px-3 py-2 text-center`;

  const stateList = (category: PreviewCategory) => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {scenariosInCategory(category).map((scenario) => (
        <button
          key={scenario.id}
          type="button"
          onClick={() => applyScenario(scenario.id)}
          className={stateButton(activeState === scenario.id)}
        >
          {scenario.label}
        </button>
      ))}
    </div>
  );

  const chipGroup = (label: string, children: React.ReactNode) => (
    <div className="min-w-0">
      <span className="mb-2 block text-[10px] font-mono uppercase tracking-widest text-white/50">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  const activeScenario = scenarios.find((s) => s.id === activeState);

  const controls = (
    <div className="w-full min-w-0 max-w-6xl space-y-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4">
      <p className="rounded-lg border border-amber-400/20 bg-amber-500/[0.08] px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-amber-100/70">
        {MOCK_READER_FALLBACK_LABEL}
      </p>
      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/70">
          Preview States
        </h2>
        {/* Compact four-category selector — one row that always fits the mobile
            viewport, so only the selected category's controls are rendered below. */}
        <div
          role="tablist"
          aria-label="Preview control categories"
          className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/25 p-1 sm:max-w-md"
        >
          {PREVIEW_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`min-h-[2.5rem] rounded-lg px-1 text-[11px] font-medium tracking-wide transition-colors sm:text-xs ${
                activeCategory === category.id
                  ? 'bg-cyan-500/20 text-cyan-100'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {activeCategory === 'reading' && (
        <div className="space-y-4">
          {stateList('reading')}
          {chipGroup(
            'Chapter',
            chapters.map((c) => (
              <button
                key={c.number}
                type="button"
                onClick={() => setSelectedChapterNum(c.number)}
                className={`${chipButton(selectedChapterNum === c.number)} min-w-[2.75rem]`}
              >
                {c.number}
              </button>
            )),
          )}
        </div>
      )}

      {activeCategory === 'effects' && (
        <div className="space-y-4">
          {chipGroup(
            'Theme',
            READER_THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => patchReaderPreferences({ themeOverride: theme })}
                className={chipButton(currentTheme === theme)}
              >
                {theme}
              </button>
            )),
          )}
          {chipGroup(
            'Particles',
            PARTICLE_INTENSITIES.map((intensity) => (
              <button
                key={intensity}
                type="button"
                onClick={() => patchReaderPreferences({ particleIntensity: intensity })}
                className={chipButton(currentParticles === intensity)}
              >
                {intensity}
              </button>
            )),
          )}
        </div>
      )}

      {activeCategory === 'menus' && stateList('menus')}
      {activeCategory === 'pages' && stateList('pages')}

      {/* The active state can live in a category that isn't on screen, so name it. */}
      {activeScenario && activeScenario.category !== activeCategory && (
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">
          Active state · {activeScenario.label}
        </p>
      )}
    </div>
  );

  return (
    <FeatureWorkspace
      entry={entry}
      controls={controls}
      allowCompare
      renderReference={() => (
        <PreviewCanvas
          key={`reference-${activeState}`}
          CodexOverlay={ReferenceCodexSheetOverlay}
          onJumpToChapter={setSelectedChapterNum}
        >
          <ReferenceReaderChamber {...chamberProps} />
        </PreviewCanvas>
      )}
      renderDevelopment={() => (
        <PreviewCanvas
          key={`development-${activeState}`}
          CodexOverlay={DevelopmentCodexSheetOverlay}
          onJumpToChapter={setSelectedChapterNum}
        >
          <DevelopmentReaderChamber {...chamberProps} />
        </PreviewCanvas>
      )}
    />
  );
}

export default ReaderChamberWorkspace;

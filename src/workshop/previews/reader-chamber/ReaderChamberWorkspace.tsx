import React, { useCallback, useEffect, useState } from 'react';
import ReferenceReaderChamber from '../../../components/reader-chamber/reference/ReaderChamber';
import { CodexSheetOverlay as ReferenceCodexSheetOverlay } from '../../../components/reader-codex/reference/CodexSheetOverlay';
import {
  DEFAULT_READER_TYPOGRAPHY,
  ReaderChamber as DevelopmentReaderChamber,
  type ReaderPreferences,
  type StoryMemory,
  type UpdateStoryFields,
} from '@seihouse/sen/reader-chamber';
import { CodexSheetOverlay as DevelopmentCodexSheetOverlay } from '@seihouse/sen/reader-codex';
import {
  resetMockState,
  updateMockStory,
  useAppStore,
} from '../../../components/reader-chamber/shared/stubs';
import { FeatureWorkspace, type WorkshopControlsConfig } from '../../FeatureWorkspace';
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
  READER_THEMES,
  scenarios,
  scenariosInCategory,
  type PreviewCategory,
  type PreviewState,
} from './previewStates';

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

  const sectionHeading = (label: string) => (
    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
      {label}
    </h3>
  );
  const activeStatus = activeScenario ? (
    <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">
      Active state · {activeScenario.label}
    </p>
  ) : null;
  const workshopControls: WorkshopControlsConfig = {
    defaultSection: 'states',
    description: MOCK_READER_FALLBACK_LABEL,
    sections: [
      {
        id: 'pages',
        description: 'Open Reader-owned pages through their real buttons, or choose the active mock chapter.',
        content: (
          <div className="space-y-5">
            <section>
              {sectionHeading('Reader pages')}
              {stateList('pages')}
            </section>
            {chipGroup(
              'Chapter',
              chapters.map((chapter) => (
                <button
                  key={chapter.number}
                  type="button"
                  aria-pressed={selectedChapterNum === chapter.number}
                  onClick={() => setSelectedChapterNum(chapter.number)}
                  className={`${chipButton(selectedChapterNum === chapter.number)} min-w-[2.75rem]`}
                >
                  {chapter.number}
                </button>
              )),
            )}
            {activeStatus}
          </div>
        ),
      },
      {
        id: 'states',
        description: 'Apply deterministic reading, generation, modal, and drawer states to every mounted pane.',
        content: (
          <div className="space-y-5">
            <section>
              {sectionHeading('Reading states')}
              {stateList('reading')}
            </section>
            <section>
              {sectionHeading('Menus and drawers')}
              {stateList('menus')}
            </section>
            {activeStatus}
          </div>
        ),
      },
      {
        id: 'effects',
        description: 'Preview Reader-owned theme and particle preferences without persisting them.',
        content: (
          <div className="space-y-4">
            {chipGroup(
              'Theme',
              READER_THEMES.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  aria-pressed={currentTheme === theme}
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
                  aria-pressed={currentParticles === intensity}
                  onClick={() => patchReaderPreferences({ particleIntensity: intensity })}
                  className={chipButton(currentParticles === intensity)}
                >
                  {intensity}
                </button>
              )),
            )}
            {activeStatus}
          </div>
        ),
      },
    ],
  };

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={workshopControls}
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

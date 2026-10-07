/**
 * The Workshop's stand-in for production's App around the Reader.
 *
 * Production's `src/App.tsx` (Light-Novels main @ 647165a) mounts the Reader
 * screen inside its page frame (the star field, the footer, the Codex sheet,
 * the error toast, keyboard shortcuts and the reader's audio conductor) and
 * hands it the story engine's actions. This host reproduces that frame and
 * mounts the copied production components unchanged. The actions that need
 * production services (writing chapters, steering, Alter Fate, the
 * continuity check) are simulated locally, and the few direct AI calls are
 * answered by the production API guard. Nothing leaves the browser.
 */
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { ReaderScreen } from '../light-novels/src/components/ReaderScreen';
import { CodexSheetOverlay } from '../light-novels/src/components/CodexSheetOverlay';
import { KeyboardShortcuts } from '../light-novels/src/components/KeyboardShortcuts';
import { ParticleSystem } from '../light-novels/src/components/ParticleSystem';
import { AtmosphericAudio } from '../light-novels/src/components/AtmosphericAudio';
import { resetWorkshopAppState, useAppStore } from '../light-novels/src/store/useAppStore';
import { selectIsGenerating } from '../light-novels/src/store/useGenerationStore';
import { seedWorkshopChapterContents, storyStorage } from '../light-novels/src/lib/storage';
import { seedWorkshopPersistence } from '../light-novels/src/lib/persistence';
import { awardQi } from '../light-novels/src/lib/qi';
import type { Chapter, StoryBlock, StoryMemory, UpdateStoryFields } from '../light-novels/src/types';
import {
  createWorkshopChapterContents,
  createWorkshopStory,
  WORKSHOP_GLOSSARY,
  WORKSHOP_STORY_ID,
} from './workshopStory';
import { installProductionApiGuard } from './productionApiGuard';
import type { ProductionReaderScenario } from '../../../../workshop/previews/reader-chamber/productionScenarios';
import './production-reader.css';

export interface ProductionReaderHostProps {
  scenario: ProductionReaderScenario;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const WRITTEN_CHAPTER: StoryBlock[] = [
  { id: 'c6-b1', type: 'paragraph', text: 'Beyond the Ninth Door there was no sky, only a second, older version of the sect, built from the same stone and lit by the same dying ember.', metadata: { sceneType: 'lost_sect', atmosphereCategory: 'wind', emotion: 'awe', intensity: 6, mysticism: 9, music: { mood: 'mystery', region: 'chinese', intensity: 5 } } },
  { id: 'c6-b2', type: 'paragraph', text: 'A disciple in robes three centuries out of fashion looked up from a ledger as Li Wei stepped through. "You are late," she said. "The oath was due an hour ago."', metadata: { speakerName: 'Unknown Disciple', mode: 'dialogue', tension: 7 } },
  { id: 'c6-b3', type: 'system', text: '[A new region has been recorded in the Codex.]', system: { kind: 'status', promptType: 'codex_update', title: 'Codex Updated', rows: [{ label: 'Location', value: 'The Sect Beyond the Door' }, { label: 'Danger', value: 'Unknown' }] } },
  { id: 'c6-b4', type: 'paragraph', text: 'He knew her handwriting before he knew her face. It was the hand that had written his name in the Ledger of Ash.', metadata: { emotion: 'shock', intensity: 8 } },
];

/** Workshop notice for actions production would send to its services. */
function WorkshopNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed left-1/2 top-4 z-[120] w-[min(92vw,34rem)] -translate-x-1/2 rounded-lg border border-cyan-400/40 bg-[#06141c]/95 px-4 py-3 font-sans text-xs leading-relaxed text-cyan-50 shadow-xl" role="status">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded border border-cyan-400/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-cyan-200">Workshop</span>
        <p className="min-w-0 flex-1">{message}</p>
        <button type="button" onClick={onDismiss} className="shrink-0 text-cyan-200/70 hover:text-cyan-50" aria-label="Dismiss Workshop notice">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/** Stands in for production screens that are not part of the Reader. */
function WorkshopElsewhere({ screen }: { screen: string }) {
  const setCurrentScreen = useAppStore((state) => state.setCurrentScreen);
  const setActiveStoryId = useAppStore((state) => state.setActiveStoryId);
  // Production's Home shortcut also closes the story, so the way back reopens it.
  const backToReader = () => {
    setActiveStoryId(WORKSHOP_STORY_ID);
    setCurrentScreen('reader');
  };
  return (
    <div className="mx-auto mt-24 max-w-md rounded-lg border border-cyan-400/30 bg-[#06141c]/90 p-6 text-center font-sans text-sm text-cyan-50">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-200">Workshop</p>
      <p className="mt-3 leading-relaxed">
        Production would open its “{screen === 'reader' ? 'library' : screen}” screen here. Only the Reader was brought into the Workshop.
      </p>
      <button type="button" onClick={backToReader} className="mt-5 rounded border border-cyan-400/50 px-4 py-2 text-xs uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/10">
        Back to the Reader
      </button>
    </div>
  );
}

const updateChapter = (chapterNumber: number, patch: Partial<Chapter> | ((chapter: Chapter) => Partial<Chapter>)) =>
  useAppStore.getState().updateStory(WORKSHOP_STORY_ID, (story) => ({
    arcs: story.arcs.map((arc) => ({
      ...arc,
      chapters: arc.chapters.map((chapter) => (
        chapter.number === chapterNumber
          ? { ...chapter, ...(typeof patch === 'function' ? patch(chapter) : patch) }
          : chapter
      )),
    })),
  }), { markEdited: false });

export function ProductionReaderHost({ scenario }: ProductionReaderHostProps) {
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const currentScreen = useAppStore((state) => state.currentScreen);
  const stories = useAppStore((state) => state.stories);
  const activeStoryId = useAppStore((state) => state.activeStoryId);
  const appError = useAppStore((state) => state.appError);
  const setAppError = useAppStore((state) => state.setAppError);
  const setIsCodexSheetOpen = useAppStore((state) => state.setIsCodexSheetOpen);
  const activeStory = stories.find((story) => story.id === activeStoryId);

  // Load the sample story into the stand-ins before the Reader first renders.
  useLayoutEffect(() => {
    const awayMs = (scenario.awayForDays ?? 0) * 24 * 60 * 60 * 1000;
    const story = createWorkshopStory({ lastReadAt: new Date(Date.now() - awayMs).toISOString() });
    if (scenario.fateSurvival) {
      story.genre = 'Fate Survival';
      story.hardcoreFateMode = true;
      story.fatePressure = 'Hardcore';
    }
    seedWorkshopChapterContents(createWorkshopChapterContents());
    seedWorkshopPersistence({ glossary: WORKSHOP_GLOSSARY });
    resetWorkshopAppState({
      stories: [story],
      activeStoryId: story.id,
      currentScreen: 'reader',
      selectedChapterNum: scenario.chapter,
      isReaderFullscreen: Boolean(scenario.fullscreen),
      isCodexSheetOpen: Boolean(scenario.codexOpen),
      isShortcutsOpen: Boolean(scenario.shortcutsOpen),
      activeGenerationRun: scenario.writing
        ? { runId: 'workshop-run', authSessionGeneration: 0, userId: null, operation: 'chapter', storyId: story.id, chapterNumber: 6, startedAt: new Date().toISOString() }
        : null,
      activeAgentId: scenario.writing ? 'versa' : null,
    });
    setReady(true);
  }, [scenario]);

  // Production's AI routes are answered locally while this Reader is on screen.
  useEffect(() => installProductionApiGuard(), []);

  const say = (message: string) => setNotice(message);

  const updateStoryFields: UpdateStoryFields = async (storyId, updates, options) => {
    await useAppStore.getState().updateStory(storyId, updates as never, { markEdited: false, touchUpdatedAt: true, ...options });
  };

  const handleUpdateMemoryManual = async (updatedMemory: StoryMemory) => {
    await useAppStore.getState().updateStory(WORKSHOP_STORY_ID, { memory: updatedMemory }, { markEdited: false, touchUpdatedAt: true });
  };

  const handleToggleRead = async (chapterNumber: number) => {
    if (selectIsGenerating(useAppStore.getState())) return;
    let didTransitionToRead = false;
    await updateChapter(chapterNumber, (chapter) => {
      const status = chapter.status === 'read' ? 'unread' : 'read';
      didTransitionToRead = status === 'read';
      return { status };
    });
    if (didTransitionToRead) void awardQi('chapter_finished');
  };

  const handleSealChapter = async (chapterNumber: number) => {
    if (selectIsGenerating(useAppStore.getState())) return;
    await delay(600);
    await updateChapter(chapterNumber, { isSealed: true, sealedAt: Date.now(), contentHash: `workshop-${chapterNumber}` });
  };

  const handleCheckConsistency = async (chapterNumber: number): Promise<string[]> => {
    await delay(1200);
    return [
      `Chapter ${chapterNumber}: Mei Lin’s sword is described as whole, but the Codex records it cracked since Chapter 1.`,
      `Chapter ${chapterNumber}: Elder Kang is said to be at the Pavilion, but he is presiding over this scene.`,
    ];
  };

  const handleGenerateChapter = async (chapterNumber: number) => {
    const state = useAppStore.getState();
    if (selectIsGenerating(state)) return;
    const chapter = state.stories[0]?.arcs.flatMap((arc) => arc.chapters).find((item) => item.number === chapterNumber);
    if (!chapter) return;
    useAppStore.setState({
      activeGenerationRun: { runId: `workshop-${Date.now()}`, authSessionGeneration: 0, userId: null, operation: 'chapter', storyId: WORKSHOP_STORY_ID, chapterNumber, startedAt: new Date().toISOString() },
      activeAgentId: 'versa',
    });
    // Production streams the chapter in as it is written; so does the sample.
    for (let count = 1; count <= WRITTEN_CHAPTER.length; count += 1) {
      await delay(700);
      const blocks = WRITTEN_CHAPTER.slice(0, count);
      useAppStore.setState({ streamingChapter: { number: chapterNumber, content: blocks.map((block) => block.text).join('\n\n'), blocks } });
    }
    await storyStorage.saveChapterContent({
      storyId: WORKSHOP_STORY_ID,
      chapterNumber,
      generatedContent: WRITTEN_CHAPTER.map((block) => block.text).join('\n\n'),
      blocks: WRITTEN_CHAPTER,
      summary: 'Li Wei steps through the Ninth Door into a sect that died three hundred years ago and meets the hand that wrote his name.',
    });
    await updateChapter(chapterNumber, { hasContent: true, status: 'unread', summary: 'Li Wei steps through the Ninth Door and meets the hand that wrote his name.' });
    useAppStore.setState({ streamingChapter: null, activeGenerationRun: null, activeAgentId: null });
  };

  const handleGenerateNextFiveChapters = async (fromChapterNumber: number) => {
    say(`Production would now write Chapters ${fromChapterNumber} to ${fromChapterNumber + 4} one after another with its chapter writer. Writing is simulated for one chapter at a time in the Workshop.`);
  };

  const handleSteerArc = async (direction: string, customPrompt: string) => {
    useAppStore.setState({
      activeGenerationRun: { runId: `workshop-steer-${Date.now()}`, authSessionGeneration: 0, userId: null, operation: 'steer', storyId: WORKSHOP_STORY_ID, chapterNumber: null, startedAt: new Date().toISOString() },
    });
    await delay(1500);
    const story = useAppStore.getState().stories[0];
    const next = story.arcs.flatMap((arc) => arc.chapters).reduce((max, chapter) => Math.max(max, chapter.number), 0) + 1;
    const premise = customPrompt.trim() || `Follow the ${direction} path.`;
    await useAppStore.getState().updateStory(WORKSHOP_STORY_ID, (current) => ({
      arcs: [
        ...current.arcs.map((arc) => ({ ...arc, isCompleted: true })),
        {
          title: `Volume ${current.arcs.length + 1}: The Steered Path`,
          isCompleted: false,
          chapters: [0, 1, 2].map((offset) => ({
            number: next + offset,
            title: `Steered Chapter ${next + offset}`,
            premise,
            status: 'unlocked' as const,
            hasContent: false,
          })),
        },
      ],
    }), { markEdited: false });
    useAppStore.setState({ activeGenerationRun: null, selectedChapterNum: next });
    say(`Production would plan the next arc with its story writer (“${direction}”). The Workshop added three unwritten chapters so the Reader can continue.`);
  };

  const handleAlterFate = async (chapterNumber: number, direction: string) => {
    say(`Production would fork this story at Chapter ${chapterNumber} into a new timeline (“${direction}”) and rewrite from there. Forking is not simulated in the Workshop.`);
  };

  if (!ready) return null;

  return (
    <div className="production-reader-frame relative min-h-dvh bg-[#050505] text-[#dfd8cf] font-serif overflow-x-hidden selection:bg-human/30 pb-safe">
      <ParticleSystem />

      <main className="relative z-10 w-full min-h-[calc(100dvh-140px)]">
        <AnimatePresence mode="wait">
          {currentScreen === 'reader' && activeStory ? (
            <motion.div
              key="reader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ReaderScreen
                handleGenerateChapter={handleGenerateChapter}
                handleGenerateNextFiveChapters={handleGenerateNextFiveChapters}
                handleToggleRead={handleToggleRead}
                handleSteerArc={handleSteerArc}
                updateStoryFields={updateStoryFields}
                setIsCodexSheetOpen={setIsCodexSheetOpen}
                handleAlterFate={handleAlterFate}
                handleSealChapter={handleSealChapter}
                handleCheckConsistency={handleCheckConsistency}
              />
            </motion.div>
          ) : (
            <motion.div key={`elsewhere-${currentScreen}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WorkshopElsewhere screen={currentScreen} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Production's footer (src/App.tsx). */}
      <footer className="relative z-0 border-t border-neutral-950 bg-black/60 pt-10 pb-16 mt-20 text-[10px] text-neutral-600 font-sans">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="tracking-widest uppercase font-sc text-neutral-500 font-semibold">
            SEIHouse: A Better Time Capsule and Translator of Artistic Expression
          </p>
          <p className="max-w-xl mx-auto tracking-[0.3em] font-sans text-neutral-400 hover:text-portal transition-all duration-500 font-semibold text-[11px] uppercase py-2 select-none">
            ⓈSEN
          </p>
        </div>
      </footer>

      <CodexSheetOverlay
        handleUpdateMemoryManual={handleUpdateMemoryManual}
        updateStoryFields={updateStoryFields}
      />

      {/* Production's error toast (src/components/ModalsAndToasts.tsx). */}
      <div className="fixed bottom-32 right-4 md:right-6 z-[100] flex flex-col-reverse gap-3 w-[calc(100%-2rem)] md:w-[380px] items-end pointer-events-none">
        <AnimatePresence>
          {appError && (
            <motion.div
              key="appError"
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="bg-neutral-900 border border-human/60 border-b-2 border-b-human shadow-2xl p-4 pr-12 rounded w-full overflow-hidden pointer-events-auto relative"
            >
              <div className="flex items-start">
                <div className="pt-1 pr-3 text-human shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-sc font-bold text-human tracking-[0.1em] text-xs uppercase mb-1 drop-shadow-md">
                    Celestial Disruption
                  </h4>
                  <p className="font-mono text-[11px] leading-relaxed text-neutral-300">{appError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppError(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-signal transition-colors p-1 bg-black/20 rounded backdrop-blur"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
              <div className="absolute top-0 right-0 w-32 h-32 bg-human/5 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <KeyboardShortcuts />
      <AtmosphericAudio />

      {notice && <WorkshopNotice message={notice} onDismiss={() => setNotice(null)} />}
    </div>
  );
}

export default ProductionReaderHost;

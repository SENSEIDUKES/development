import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Sparkles, BookA } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { selectIsGenerating } from "../store/useGenerationStore";
import StorySteeringModal from "./StorySteeringModal";
import ReaderChamber from "./ReaderChamber";
import { GlossarySidePanel } from "./GlossarySidePanel";
import { Chapter, ChapterContent, ReaderChapter, Story, StoryBlock, StreamingChapter, UpdateStoryFields } from "../types";
import { applyStreamingChapter, toReaderChapter } from "../lib/chapterViews";
import { awardQi } from "../lib/qi";
import { RecapScreen } from "./RecapScreen";
import { countWords } from "../utils/textUtils";
import { storyStorage } from "../lib/storage";
import { LOCAL_ONLY_MODE, auth } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const clockFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const blockWordCountCache = new WeakMap<StoryBlock[], number>();
const generatedContentWordCountCache = new Map<string, number>();

/**
 * Isolated component for rendering the ticking clock
 * This prevents the large ReaderScreen component from re-rendering every second.
 */
function ReaderClock() {
  const [clockTime, setClockTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex items-center space-x-1"
      title="Current Local Time"
    >
      <span className="text-jade-accent">Time:</span>
      <span>{clockFormatter.format(clockTime)}</span>
    </div>
  );
}

function buildReaderChapters(
  activeStory: Story | undefined,
  streamingChapter: StreamingChapter | null,
  localChapterCache: Record<number, ChapterContent>,
): ReaderChapter[] {
  if (!activeStory) return [];

  return activeStory.arcs
    .flatMap((a) => a.chapters)
    .map((ch) => {
      if (streamingChapter && ch.number === streamingChapter.number) {
        // applyStreamingChapter owns the pipeline's partial wire shape and
        // drops the generation internals, so the reader never has to know
        // either.
        return {
          ...applyStreamingChapter(ch, streamingChapter),
          status: "read" as const,
          contextManifest: undefined,
        };
      }

      const readerChapter = toReaderChapter(ch);
      const cached = localChapterCache[ch.number];
      if (cached) {
        return {
          ...readerChapter,
          generatedContent: cached.generatedContent,
          blocks: cached.blocks,
          summary: cached.summary || ch.summary,
          statsChangeMessage: cached.statsChangeMessage || ch.statsChangeMessage,
          cuePayload: cached.cuePayload || ch.cuePayload,
          contextManifest: cached.contextManifest || ch.contextManifest,
        };
      }

      return readerChapter;
    });
}

export const ReaderScreen: React.FC<{
  handleSteerArc: (direction: string, customPrompt: string) => Promise<void>;
  handleAlterFate: (
    chapterNumber: number,
    direction: string,
    customPrompt: string,
  ) => Promise<void>;
  handleGenerateChapter: (chapterNumber: number) => Promise<void>;
  handleGenerateNextFiveChapters: (fromChapterNumber: number) => Promise<void>;
  handleToggleRead: (ch: number) => void;
  updateStoryFields: UpdateStoryFields;
  setIsCodexSheetOpen: (open: boolean) => void;
  handleSealChapter: (chapterNumber: number) => Promise<void>;
  handleCheckConsistency?: (chapterNumber: number) => Promise<string[]>;
}> = ({
  handleSteerArc,
  handleAlterFate,
  handleGenerateChapter,
  handleGenerateNextFiveChapters,
  handleToggleRead,
  updateStoryFields,
  setIsCodexSheetOpen,
  handleSealChapter,
  handleCheckConsistency,
}) => {
  const currentScreen = useAppStore(state => state.currentScreen);
    const setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const activeStoryId = useAppStore(state => state.activeStoryId);
    const stories = useAppStore(state => state.stories);
    const selectedChapterNum = useAppStore(state => state.selectedChapterNum);
    const setSelectedChapterNum = useAppStore(state => state.setSelectedChapterNum);
    const isGenerating = useAppStore(selectIsGenerating);
    const routingConfig = useAppStore(state => state.routingConfig);
    const streamingChapter = useAppStore(state => state.streamingChapter);
    const isReaderFullscreen = useAppStore(state => state.isReaderFullscreen);
    const currentUser = useAppStore(state => state.currentUser);

  const activeStory = stories.find((s) => s.id === activeStoryId);

  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [localChapterCache, setLocalChapterCache] = useState<
    Record<number, ChapterContent>
  >({});
  const [localChapterCacheStoryId, setLocalChapterCacheStoryId] = useState<string | null>(null);
  const selectedChapterCachedContent = localChapterCache[selectedChapterNum];
  const pendingFetches = React.useRef<Set<string>>(new Set());
  const recapCheckedForStoryId = React.useRef<string | null>(null);

  // Reading time tracking state
  const [localStatsDelta, setLocalStatsDelta] = useState<{
    total: number;
    arc: Record<number, number>;
  }>({ total: 0, arc: {} });
  const readingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastActiveTimeRef = React.useRef<number>(Date.now());

  // Determine current arc index
  const currentArcIndex =
    activeStory?.arcs.findIndex((a) =>
      a.chapters.some((c) => c.number === selectedChapterNum),
    ) ?? -1;

  useEffect(() => {
    if (
      !activeStory ||
      currentScreen !== "reader" ||
      selectedChapterNum === -1
    ) {
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
      return;
    }

    lastActiveTimeRef.current = Date.now();

    const timer = setInterval(() => {
      if (!document.hidden) {
        const now = Date.now();
        const deltaMs = now - lastActiveTimeRef.current;
        lastActiveTimeRef.current = now;

        setLocalStatsDelta((prev) => {
          const newArc = { ...prev.arc };
          if (currentArcIndex !== -1) {
            newArc[currentArcIndex] = (newArc[currentArcIndex] || 0) + deltaMs;
          }
          return {
            total: prev.total + deltaMs,
            arc: newArc,
          };
        });
      } else {
        lastActiveTimeRef.current = Date.now();
      }
    }, 1000);
    readingTimerRef.current = timer;

    return () => clearInterval(timer);
  }, [activeStory, currentScreen, selectedChapterNum, currentArcIndex]);

  const activeStoryRef = React.useRef(activeStory);
  useEffect(() => { activeStoryRef.current = activeStory; }, [activeStory]);
  const localStatsDeltaRef = React.useRef(localStatsDelta);
  useEffect(() => { localStatsDeltaRef.current = localStatsDelta; }, [localStatsDelta]);

  // Flush stats to store periodically
  useEffect(() => {
    const flushInterval = setInterval(() => {
      const currentStory = activeStoryRef.current;
      const currentDelta = localStatsDeltaRef.current;
      if (currentStory && currentDelta.total > 0) {
        void updateStoryFields(currentStory.id, (current) => {
          const stats = current.readingStats || {
            totalReadingTimeMs: 0,
            arcReadingTimeMs: {},
          };
          const newArcTimes = { ...(stats.arcReadingTimeMs || {}) };
          for (const [arcIdx, timeMs] of Object.entries(currentDelta.arc)) {
            newArcTimes[Number(arcIdx)] =
              (newArcTimes[Number(arcIdx)] || 0) + timeMs;
          }
          return {
          readingStats: {
            totalReadingTimeMs: (stats.totalReadingTimeMs || 0) + currentDelta.total,
            arcReadingTimeMs: newArcTimes,
          },
          };
        });

        // Reset delta
        setLocalStatsDelta({ total: 0, arc: {} });
      }
    }, 300000);

    return () => {
      clearInterval(flushInterval);
    };
  }, [updateStoryFields]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const storyTotalTimeS =
    ((activeStory?.readingStats?.totalReadingTimeMs || 0) +
      (localStatsDelta.total || 0)) /
    1000;

  // Word count calculations
  const chaptersWithLoadedContent = React.useMemo(() => {
    const cacheForActiveStory = localChapterCacheStoryId === activeStory?.id
      ? localChapterCache
      : {};
    return buildReaderChapters(activeStory, streamingChapter, cacheForActiveStory);
  }, [activeStory, streamingChapter, localChapterCache, localChapterCacheStoryId]);

  useEffect(() => {
    pendingFetches.current.clear();
    setLocalChapterCache({});
    setLocalChapterCacheStoryId(activeStoryId);
  }, [activeStoryId]);

  const getChapterWordCount = React.useCallback((ch: Chapter): number => {
    if (ch.blocks && ch.blocks.length > 0) {
      const cached = blockWordCountCache.get(ch.blocks);
      if (cached !== undefined) return cached;

      const count = ch.blocks.reduce(
        (sum: number, block) => sum + countWords(block.text),
        0,
      );
      blockWordCountCache.set(ch.blocks, count);
      return count;
    }

    if (ch.generatedContent) {
      const cached = generatedContentWordCountCache.get(ch.generatedContent);
      if (cached !== undefined) return cached;

      const count = countWords(ch.generatedContent);
      generatedContentWordCountCache.set(ch.generatedContent, count);
      return count;
    }

    return 0;
  }, []);

  const totalStoryWords = React.useMemo(() => {
    return chaptersWithLoadedContent.reduce((sum, ch) => {
      const count = getChapterWordCount(ch);
      if (count > 0) return sum + count;
      // Estimate 2,200 words for generated chapters that aren't loaded in memory
      if (ch.hasContent || ch.status === "read") return sum + 2200;
      return sum;
    }, 0);
  }, [chaptersWithLoadedContent, getChapterWordCount]);

  const activeChapter = React.useMemo(() => chaptersWithLoadedContent.find(
    (ch) => ch.number === selectedChapterNum
  ), [chaptersWithLoadedContent, selectedChapterNum]);

  const activeChapterWords = React.useMemo(() => {
    return activeChapter ? getChapterWordCount(activeChapter) : 0;
  }, [activeChapter, getChapterWordCount]);

  // Listen to custom DOM event to toggle glossary sidelobe via global hotkey
  useEffect(() => {
    const handleToggleGlossary = () => {
      setIsGlossaryOpen((prev) => !prev);
    };
    window.addEventListener("toggle-glossary-panel", handleToggleGlossary);
    return () => {
      window.removeEventListener("toggle-glossary-panel", handleToggleGlossary);
    };
  }, []);

  useEffect(() => {
    if (activeStory && currentScreen === "reader") {
      const currentChapter = activeStory.arcs
        .flatMap((a) => a.chapters)
        .find((c) => c.number === selectedChapterNum);
      if (
        currentChapter &&
        currentChapter.status === "unread" &&
        currentChapter.hasContent
      ) {
        awardQi("chapter_read");
      }

      // Check if we need to show recap (has been gone for > 24 hours)
      // Only do this check once per story load to avoid showing it between chapter generations
      if (recapCheckedForStoryId.current !== activeStoryId) {
        recapCheckedForStoryId.current = activeStoryId;
        
        if (activeStory.lastReadAt) {
          const lastReadDate = new Date(activeStory.lastReadAt).getTime();
          const now = Date.now();
          const hrsElapsed = (now - lastReadDate) / (1000 * 60 * 60);
          if (hrsElapsed > 12) {
            setShowRecap(true);
          } else {
            setShowRecap(false);
          }
        } else if (selectedChapterNum > 2) {
          setShowRecap(true);
        } else {
          setShowRecap(false);
        }
      }
    } else {
      setShowRecap(false);
      recapCheckedForStoryId.current = null;
    }
  }, [activeStoryId, currentScreen, activeStory, selectedChapterNum]);

  useEffect(() => {
    if (
      activeStory &&
      currentScreen === "reader" &&
      selectedChapterNum !== -1
    ) {
      const currentChapter = activeStory.arcs
        .flatMap((a) => a.chapters)
        .find((c) => c.number === selectedChapterNum);
      if (
        currentChapter &&
        currentChapter.hasContent &&
        !currentChapter.generatedContent &&
        (!currentChapter.blocks || currentChapter.blocks.length === 0)
      ) {
        const hasCachedContent = (
          localChapterCacheStoryId === activeStory.id
          && Boolean(selectedChapterCachedContent)
        );
        if (
          !hasCachedContent &&
          !pendingFetches.current.has(`${activeStory.id}:${selectedChapterNum}`)
        ) {
          const storyId = activeStory.id;
          const cacheKey = `${storyId}:${selectedChapterNum}`;
          pendingFetches.current.add(cacheKey);
          storyStorage
            .getChapterContent(storyId, selectedChapterNum)
            .then((content) => {
              if (content && useAppStore.getState().activeStoryId === storyId) {
                setLocalChapterCache((prev) => ({
                  ...prev,
                  [selectedChapterNum]: content,
                }));
                setLocalChapterCacheStoryId(storyId);
              }
            })
            .catch(console.error)
            .finally(() => {
              pendingFetches.current.delete(cacheKey);
            });
        }
      }
    }
  }, [
    activeStory,
    currentScreen,
    selectedChapterNum,
    selectedChapterCachedContent,
    localChapterCacheStoryId,
  ]);

  if (currentScreen !== "reader") return null;

  if (!activeStory) return null;

  if (showRecap) {
    return (
      <RecapScreen
        story={activeStory}
        lastReadChapter={selectedChapterNum}
        onContinue={() => setShowRecap(false)}
      />
    );
  }

  return (
    <motion.div
      key="reader-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`space-y-6 ${isReaderFullscreen ? "!space-y-0 relative" : ""}`}
    >
      {!isReaderFullscreen && (
        <div className="flex flex-col bg-black/60 border border-neutral-900 rounded shadow-md backdrop-blur-md sticky top-0 z-30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={() => setCurrentScreen("detail")}
                className="text-neutral-500 hover:text-gold-accent transition-colors flex-shrink-0"
                aria-label="Back to story details"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="font-sc uppercase tracking-[0.12em] text-gold-accent font-bold text-[10px] sm:text-xs flex-shrink-0">
                {activeStory.genre}
              </span>
              <span className="text-neutral-700 font-mono flex-shrink-0">•</span>
              <span className="text-neutral-400 font-display text-xs sm:text-sm truncate pr-2">
                {activeStory.title}
              </span>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-black/40 border border-neutral-800 rounded text-neutral-400 font-mono text-[10px]">
                <ReaderClock />
                <span className="text-neutral-700">|</span>
                <div
                  className="flex items-center space-x-1"
                  title="Total Story Words"
                >
                  <span className="text-gold-accent">Chapter:</span>
                  <span className="mr-2">{activeChapterWords.toLocaleString()}</span>
                  <span className="text-gold-accent">Total:</span>
                  <span>{totalStoryWords.toLocaleString()}</span>
                </div>
              </div>
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={() => setIsGlossaryOpen(true)}
                className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-sc font-bold uppercase tracking-wider rounded hover:bg-neutral-800 hover:text-white transition-all flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-[10px]"
                aria-label="Open Lore Glossary"
              >
                <BookA size={11} />
                <span className="hidden sm:inline">Lore Glossary</span>
                <span className="sm:hidden">Lore</span>
              </button>
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={() => setIsCodexSheetOpen(true)}
                className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-all flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-[10px]"
                aria-label="Open Codex Sheet"
              >
                <Sparkles size={11} />
                <span>Codex</span>
              </button>
            </div>
          </div>
          
          {/* Arc Progress Bar */}
          {(() => {
            const displayedArcIndex = currentArcIndex !== -1 ? currentArcIndex : (activeStory ? activeStory.arcs.length - 1 : -1);
            const displayedArc = activeStory?.arcs[displayedArcIndex];
            const arcChaptersCount = displayedArc ? displayedArc.chapters.length : 0;
            return (
              <div className="w-full h-1 bg-neutral-900 relative flex group" title={`Arc Progress: ${arcChaptersCount}/100 Chapters`}>
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 bottom-0 w-[2px] bg-neutral-800/80 z-10" 
                    style={{ left: `${(i + 1) * 10}%` }}
                  />
                ))}
                <div 
                  className="h-full bg-portal transition-all duration-500 ease-out z-0 relative"
                  style={{ width: `${(arcChaptersCount / 100) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {!currentUser && !LOCAL_ONLY_MODE &&
      (selectedChapterNum === -1 || selectedChapterNum > 10) ? (
        <div className="max-w-xl mx-auto mt-20 text-center bg-black/60 border border-neutral-900 p-10 rounded-xl shadow-2xl animate-fadeIn">
          <h2 className="font-display font-bold text-3xl text-signal mb-4">
            Authentication Required
          </h2>
          <p className="text-neutral-400 font-sans text-sm mb-8 leading-relaxed">
            {selectedChapterNum === -1
              ? "You must sync your spirit (sign in) to forge new destinies and steer the narrative."
              : "You have reached the limit of anonymous reading (10 chapters). Please sync your spirit (sign in) to continue your ascension and unlock unlimited chapters."}
          </p>
          <button
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            onClick={() => {
              signInWithPopup(auth, new GoogleAuthProvider());
            }}
            className="px-8 py-3 bg-human text-signal font-sc font-bold uppercase tracking-widest text-sm rounded border border-human shadow-[0_0_15px_rgba(139,0,0,0.4)] hover:bg-void transition-all"
          >
            Sync Spirit (Sign In)
          </button>
        </div>
      ) : selectedChapterNum === -1 ? (
        <div className="animate-fadeIn max-w-4xl mx-auto shadow-2xl">
          <StorySteeringModal
            isSteering={isGenerating}
            onSteerArc={handleSteerArc}
            currentArcIndex={activeStory.arcs.length}
            activeStory={activeStory}
            routingConfig={routingConfig}
          />
        </div>
      ) : (
        <div className="mx-auto">
          <ReaderChamber
            chapters={chaptersWithLoadedContent}
            arcTitle={
              activeStory.arcs.find((a) =>
                a.chapters.some((c) => c.number === selectedChapterNum),
              )?.title || activeStory.arcs.at(-1)?.title || ""
            }
            currentPowerStage={activeStory.memory.currentPowerStage}
            onGenerateChapter={handleGenerateChapter}
            onGenerateNextFiveChapters={handleGenerateNextFiveChapters}
            isGenerating={isGenerating}
            selectedChapterNum={selectedChapterNum}
            setSelectedChapterNum={setSelectedChapterNum}
            onToggleRead={handleToggleRead}
            onSwitchTab={(tab) => {
              if (tab === "codex") setIsCodexSheetOpen(true);
            }}
            activeStory={activeStory}
            updateStoryFields={updateStoryFields}
            handleAlterFate={handleAlterFate}
            handleSealChapter={handleSealChapter}
            handleCheckConsistency={handleCheckConsistency}
          />

          {activeStory.arcs.at(-1)?.isCompleted && (
            <div className="mt-4 max-w-4xl mx-auto p-4 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-sans">
                All chapters of this arc generated! Steer next segment.
              </span>
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={() => setSelectedChapterNum(-1)}
                className="px-4 py-1.5 bg-human text-signal text-[10px] font-bold font-sc uppercase tracking-wider rounded border border-human hover:bg-void transition-all"
                aria-label="Steer Story Fate"
              >
                Steer Story Fate
              </button>
            </div>
          )}
        </div>
      )}

      <GlossarySidePanel
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
        novelId={activeStory.id}
      />
    </motion.div>
  );
};

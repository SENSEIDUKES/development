import { useMemo, useRef, useState } from "react";
import ReaderChamber from "../../reader-chamber/development/ReaderChamber";
import { CodexSheetOverlay } from "../../reader-codex/development/CodexSheetOverlay";
import {
  createChapterScopedCodexStory,
  createCompletedSingleChapterReaderSession,
} from "../../reader-chamber/shared/batchToReaderAdapter";
import type {
  StoryMemory,
  StoryWorld,
  UpdateStoryFields,
} from "../../reader-chamber/shared/types";
import type { ManifestChapterResponse } from "../shared/liveChapterGeneration";
import "../../reader-chamber/shared/reader-chamber.css";

export interface SingleChapterReaderSessionProps {
  result: ManifestChapterResponse;
  onClose: () => void;
}

/**
 * Disposable one-chapter composition over the existing Reader Chamber and
 * complete Reader Codex. All edits remain local to this generated session.
 */
export function SingleChapterReaderSession({
  result,
  onClose,
}: SingleChapterReaderSessionProps) {
  const session = useMemo(
    () => createCompletedSingleChapterReaderSession(result),
    [result],
  );
  const initialChapterNumber = session.chapters[0].number;
  const [selectedChapterNum, setSelectedChapterNum] = useState(initialChapterNumber);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [storyPatch, setStoryPatch] = useState<Partial<StoryWorld>>({});
  const [memoryPatch, setMemoryPatch] = useState<StoryMemory | null>(null);
  const currentStoryRef = useRef<StoryWorld | null>(null);

  const activeMemory = memoryPatch ?? session.codexSnapshots[0].memory;
  const readerStory: StoryWorld = {
    ...session.story,
    ...storyPatch,
    memory: activeMemory,
    arcs: storyPatch.arcs ?? session.story.arcs,
    currentChapterNumber: selectedChapterNum,
  };
  const codexStory = createChapterScopedCodexStory(
    readerStory,
    activeMemory,
    selectedChapterNum,
  );
  currentStoryRef.current = readerStory;

  const updateStoryFields: UpdateStoryFields = async (storyId, updates) => {
    if (storyId !== session.story.id) return;
    const currentStory = currentStoryRef.current ?? readerStory;
    const patch = typeof updates === "function" ? updates(currentStory) : updates;
    if (patch.memory) setMemoryPatch(patch.memory);
    const { memory: _memory, ...storyFields } = patch;
    setStoryPatch(current => ({ ...current, ...storyFields }));
  };

  const toggleRead = (chapterNumber: number) => {
    setStoryPatch(current => {
      const currentArcs = current.arcs ?? session.story.arcs;
      return {
        ...current,
        arcs: currentArcs.map(arc => ({
          ...arc,
          chapters: arc.chapters.map(chapter => chapter.number === chapterNumber
            ? { ...chapter, status: chapter.status === "read" ? "unread" : "read" }
            : chapter),
        })),
      };
    });
  };

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-2 py-3 sm:px-4">
      <ReaderChamber
        chapters={readerStory.arcs[0].chapters}
        currentPowerStage={activeMemory.currentPowerStage ?? "Not yet established"}
        onGenerateChapter={async () => undefined}
        onGenerateNextFiveChapters={async () => undefined}
        isGenerating={false}
        selectedChapterNum={selectedChapterNum}
        setSelectedChapterNum={setSelectedChapterNum}
        onToggleRead={toggleRead}
        arcTitle={session.arcTitle}
        onBack={onClose}
        onSwitchTab={tab => {
          if (tab === "codex") setIsCodexOpen(true);
        }}
        activeStory={readerStory}
        updateStoryFields={updateStoryFields}
      />
      <CodexSheetOverlay
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        activeStory={codexStory}
        onUpdateMemory={memory => {
          void updateStoryFields(readerStory.id, { memory });
        }}
        updateStoryFields={updateStoryFields}
        onJumpToChapter={chapterNumber => {
          setSelectedChapterNum(chapterNumber);
          setIsCodexOpen(false);
        }}
      />
    </main>
  );
}

export default SingleChapterReaderSession;

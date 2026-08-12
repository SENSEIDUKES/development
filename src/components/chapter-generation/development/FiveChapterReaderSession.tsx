import { ArrowLeft, Download, FlaskConical, Sigma } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import ReaderChamber from "../../reader-chamber/development/ReaderChamber";
import { CodexSheetOverlay } from "../../reader-codex/development/CodexSheetOverlay";
import {
  buildFiveChapterReaderExport,
  createChapterScopedCodexStory,
  createCompletedBatchReaderSession,
} from "../../reader-chamber/shared/batchToReaderAdapter";
import type {
  ReaderTokenUsageTotals,
  StoryMemory,
  StoryWorld,
  UpdateStoryFields,
} from "../../reader-chamber/shared/types";
import type { FiveChapterBatchState } from "../shared/batch/chapterBatch";
import ChapterGenerationWorkspace from "./ChapterGenerationWorkspace";
import "../../reader-chamber/shared/reader-chamber.css";

type SessionView = "reader" | "diagnostics";

const formatTokens = (value: number) => value.toLocaleString();

function TokenCell({ label, totals }: { label: string; totals: ReaderTokenUsageTotals }) {
  return (
    <div className="min-w-[8.5rem] rounded-lg border border-white/10 bg-black/25 px-3 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-white/75">
        <span>In {formatTokens(totals.inputTokens)}</span>
        <span>Out {formatTokens(totals.outputTokens)}</span>
        <span>Total {formatTokens(totals.totalTokens)}</span>
      </div>
    </div>
  );
}

function SessionAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

export interface FiveChapterReaderSessionProps {
  batch: FiveChapterBatchState;
  onClose: () => void;
}

/**
 * Disposable composition layer: the real Reader Chamber consumes the adapter
 * output while Diagnostics continues to render its existing four-stage view.
 */
export function FiveChapterReaderSession({ batch, onClose }: FiveChapterReaderSessionProps) {
  const resolution = useMemo(() => createCompletedBatchReaderSession(batch), [batch]);
  const [selectedChapterNum, setSelectedChapterNum] = useState(1);
  const [view, setView] = useState<SessionView>("reader");
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [storyPatch, setStoryPatch] = useState<Partial<StoryWorld>>({});
  const [memoryPatches, setMemoryPatches] = useState<Record<number, StoryMemory>>({});
  const currentStoryRef = useRef<StoryWorld | null>(null);

  if (!resolution.ok) {
    return (
      <section role="alert" className="mx-auto max-w-3xl rounded-xl border border-amber-400/25 bg-amber-500/10 p-5 text-sm text-amber-100/85">
        <h2 className="font-semibold">Reader Chamber is unavailable</h2>
        <p className="mt-2 leading-relaxed">{resolution.reason}</p>
        <button type="button" onClick={onClose} className="mt-4 min-h-10 rounded-lg border border-amber-200/25 px-3 font-semibold">
          Return to Chapter Generation
        </button>
      </section>
    );
  }

  const { session } = resolution;
  const selectedChapter = session.chapters.find(chapter => chapter.number === selectedChapterNum)
    ?? session.chapters[0];
  const snapshot = session.codexSnapshots
    .filter(candidate => candidate.chapterNumber <= selectedChapter.number)
    .at(-1)!;
  const activeMemory = memoryPatches[selectedChapter.number] ?? snapshot.memory;
  const readerStory: StoryWorld = {
    ...session.story,
    ...storyPatch,
    memory: activeMemory,
    arcs: storyPatch.arcs ?? session.story.arcs,
    currentChapterNumber: selectedChapter.number,
  };
  const codexStory = createChapterScopedCodexStory(
    readerStory,
    activeMemory,
    selectedChapter.number,
  );
  currentStoryRef.current = readerStory;
  const chapterUsage = selectedChapter.generationUsage!;

  const updateStoryFields: UpdateStoryFields = async (storyId, updates) => {
    if (storyId !== session.story.id) return;
    const currentStory = currentStoryRef.current ?? readerStory;
    const patch = typeof updates === "function" ? updates(currentStory) : updates;
    if (patch.memory) {
      setMemoryPatches(current => ({
        ...current,
        [selectedChapter.number]: patch.memory!,
      }));
    }
    const { memory: _memory, ...storyFields } = patch;
    setStoryPatch(currentPatch => ({ ...currentPatch, ...storyFields }));
  };

  const toggleRead = (chapterNumber: number) => {
    setStoryPatch(currentPatch => {
      const currentArcs = currentPatch.arcs ?? session.story.arcs;
      return {
        ...currentPatch,
        arcs: currentArcs.map(arc => ({
          ...arc,
          chapters: arc.chapters.map(chapter => chapter.number === chapterNumber
            ? { ...chapter, status: chapter.status === "read" ? "unread" : "read" }
            : chapter),
        })),
      };
    });
  };

  const downloadSession = () => {
    const blob = new Blob([buildFiveChapterReaderExport(session)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${session.story.title.replace(/[^a-z0-9]+/gi, "_")}_Chapters_1-5.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedRun = batch.chapters.find(chapter => chapter.chapterNumber === selectedChapter.number)?.result;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 overflow-x-hidden px-2 py-3 sm:px-4">
      <section aria-label="Generated Reader session controls" className="rounded-xl border border-cyan-400/20 bg-[#070b13]/95 p-3 shadow-xl sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/60">
              Disposable generated session · Chapter {selectedChapter.number} of 5
            </p>
            <h1 className="mt-1 font-display text-lg text-white/90">{session.story.title}</h1>
            <p className="mt-1 text-xs text-white/45">Reader Codex knowledge is limited through Chapter {selectedChapter.number}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SessionAction onClick={onClose}><ArrowLeft size={13} /> Generation Tester</SessionAction>
            <SessionAction onClick={() => setView("diagnostics")}><FlaskConical size={13} /> Chapter {selectedChapter.number} Diagnostics</SessionAction>
            <SessionAction onClick={downloadSession}><Download size={13} /> Export All 5 Chapters</SessionAction>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Reader generation token usage">
          <TokenCell label={`Chapter ${selectedChapter.number} tokens`} totals={chapterUsage.totals} />
          <TokenCell label="Five-chapter batch tokens" totals={session.batchUsage.totals} />
          {chapterUsage.repair && <TokenCell label={`Repair usage · ${chapterUsage.repair.callCount} calls`} totals={chapterUsage.repair.totals} />}
          {chapterUsage.retry && <TokenCell label={`Retry usage · ${chapterUsage.retry.attemptCount} attempts`} totals={chapterUsage.retry.totals} />}
          {!chapterUsage.repair && !chapterUsage.retry && (
            <div className="flex min-h-[3.75rem] items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.06] px-3 text-[10px] text-emerald-100/60">
              <Sigma size={12} /> No repair or retry usage for this chapter
            </div>
          )}
        </div>
      </section>

      {view === "reader" && (
        <>
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
        </>
      )}

      {view === "diagnostics" && selectedRun && (
        <section aria-label={`Chapter ${selectedChapter.number} Diagnostics`} className="overflow-hidden rounded-xl border border-violet-400/20 bg-black/25">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/80">Chapter {selectedChapter.number} Diagnostics</h2>
              <p className="mt-1 text-[10px] text-white/40">Existing four-stage Diagnostics for the currently selected Reader chapter.</p>
            </div>
            <button type="button" onClick={() => setView("reader")} className="min-h-10 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/70">
              Back to Reader
            </button>
          </div>
          <ChapterGenerationWorkspace
            run={selectedRun.run}
            generationSource={{ provider: selectedRun.provider, model: selectedRun.model }}
          />
        </section>
      )}
    </main>
  );
}

export default FiveChapterReaderSession;

import React from 'react';
import { ArrowLeft, ArrowRight, ListMusic, Loader2, MessageSquare } from 'lucide-react';
import { ReaderControlsProps } from './types';
import { PlaybackControls } from './PlaybackControls';

const ACTION_BUTTON_CLASSES =
  "p-2 border rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 bg-void border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900 disabled:opacity-25 disabled:cursor-not-allowed";

/**
 * The bottom action bar carries reading actions only — Previous Chapter,
 * Comments, Play/Pause (primary center action), Codex, Next Chapter — in one
 * unified row on every breakpoint. Settings and audio configuration live in
 * the header; Alter Fate lives in the header Quick Action menu.
 */
export function ReaderControls({
  selectedChapter,
  navigation,
  playback,
  comments,
}: ReaderControlsProps) {
  const { selectedChapterNum, maxChapterNum, navigatePrev, navigateNext, continueAfterLatest, onSwitchTab } = navigation;
  // At the newest chapter, Next runs the host's action there, when it offers one.
  const continueAction = selectedChapterNum === maxChapterNum ? continueAfterLatest : undefined;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-900 z-40 px-4 py-2 sm:py-3 pb-6 sm:pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 sm:gap-2">
        {/* Previous Chapter */}
        <button
          type="button"
          onClick={navigatePrev}
          disabled={selectedChapterNum <= 1}
          aria-label="Previous Chapter"
          title="Previous Chapter"
          className={`${ACTION_BUTTON_CLASSES} enabled:hover:text-portal`}
        >
          <ArrowLeft size={16} />
        </button>

        {/* Mind Palace — the passages the reader chose to keep */}
        <button
          type="button"
          onClick={comments.onToggle}
          aria-label="Mind Palace"
          aria-expanded={comments.open}
          title="Mind Palace"
          className={`p-2 border rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 relative ${
            comments.open
              ? "border-portal bg-portal/10 text-portal"
              : comments.count > 0
                ? "border-portal/40 bg-portal/5 text-portal"
                : "bg-void border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
          }`}
        >
          <MessageSquare size={16} />
          {comments.count > 0 && (
            <span className="absolute -top-1 -right-1 bg-human text-signal text-[8px] h-3.5 w-3.5 flex items-center justify-center rounded-full font-mono font-bold">
              {comments.count}
            </span>
          )}
        </button>

        {/* Play / Pause — primary center action */}
        <div className="flex items-center justify-center relative shrink-0">
          <PlaybackControls selectedChapter={selectedChapter} playback={playback} />
        </div>

        {/* Codex */}
        <button
          type="button"
          onClick={() => onSwitchTab && onSwitchTab("codex")}
          aria-label="Open Codex"
          title="Codex"
          className={`${ACTION_BUTTON_CLASSES} hover:text-portal`}
        >
          <ListMusic size={16} />
        </button>

        {/* Next Chapter */}
        <button
          type="button"
          onClick={navigateNext}
          disabled={selectedChapterNum === maxChapterNum && (!continueAction || continueAction.busy)}
          aria-label={continueAction ? `Next Chapter: ${continueAction.label}` : "Next Chapter"}
          title={continueAction?.label ?? "Next Chapter"}
          className={`${ACTION_BUTTON_CLASSES} enabled:hover:text-human`}
        >
          {continueAction?.busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}

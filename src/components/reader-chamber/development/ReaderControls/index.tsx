import React from 'react';
import { ArrowLeft, ArrowRight, GitBranch, ListMusic, MessageSquare } from 'lucide-react';
import { ReaderControlsProps } from './types';
import { PlaybackControls } from './PlaybackControls';

const ACTION_BUTTON_CLASSES =
  "p-2 border rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 bg-void border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900 disabled:opacity-25 disabled:cursor-not-allowed";

/**
 * The bottom action bar carries reading actions only — Previous Chapter,
 * Comments, Play/Pause (primary center action), Codex, Alter Fate, Next
 * Chapter — in one unified row on every breakpoint. Settings and audio
 * configuration live in the header. Alter Fate is its own reader tab
 * (switched via `onSwitchTab`), not a modal.
 */
export function ReaderControls({
  selectedChapter,
  navigation,
  playback,
  comments,
  alterFate,
}: ReaderControlsProps) {
  const { selectedChapterNum, maxChapterNum, navigatePrev, navigateNext, onSwitchTab } = navigation;

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

        {/* Comments — reuses the Chronicle Anchors panel for now */}
        <button
          type="button"
          onClick={comments.onToggle}
          aria-label="Comments"
          aria-expanded={comments.open}
          title="Comments"
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

        {/* Alter Fate — opens the dedicated Alter Fate reader tab */}
        {alterFate && (
          <button
            type="button"
            onClick={alterFate.onOpen}
            disabled={!alterFate.enabled}
            aria-label="Alter Fate"
            title={alterFate.lockMessage || "Alter Fate"}
            className={`${ACTION_BUTTON_CLASSES} enabled:hover:text-portal`}
          >
            <GitBranch size={16} />
          </button>
        )}

        {/* Next Chapter */}
        <button
          type="button"
          onClick={navigateNext}
          disabled={selectedChapterNum === maxChapterNum}
          aria-label="Next Chapter"
          title="Next Chapter"
          className={`${ACTION_BUTTON_CLASSES} enabled:hover:text-human`}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

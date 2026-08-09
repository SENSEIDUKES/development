import React from 'react';
import { ArrowLeft, Lock, SlidersHorizontal as Sliders, Volume2 } from 'lucide-react';
import { ReaderChapter } from '../shared/types';

interface ReaderHeaderProps {
  arcTitle: string;
  selectedChapter: ReaderChapter;
  onBack?: () => void;
  onOpenAudioControls: () => void;
  showReaderSettings: boolean;
  setShowReaderSettings: (show: boolean) => void;
  getHeaderThemeClasses: () => string;
  /** Scroll-direction visibility from the chamber. Defaults to pinned visible. */
  isVisible?: boolean;
}

const HEADER_BUTTON_CLASSES =
  "p-2 rounded-full border flex items-center justify-center transition-all";

/**
 * The top header is navigation and controls only: Back, story/chapter title,
 * Audio, and Settings. Reading actions (chapter navigation, comments,
 * play/pause, codex, Alter Fate) live in the bottom action bar.
 */
export function ReaderHeader({
  arcTitle,
  selectedChapter,
  onBack,
  onOpenAudioControls,
  showReaderSettings,
  setShowReaderSettings,
  getHeaderThemeClasses,
  isVisible = true
}: ReaderHeaderProps) {
  return (
    <div
      data-cue-type="narrative.chapter.enter"
      data-cue-id={`chapter-enter-${selectedChapter.number}`}
      data-cue-value={
        selectedChapter.cuePayload
          ? JSON.stringify(selectedChapter.cuePayload)
          : undefined
      }
      className={`narrative-trigger sticky top-[0px] z-20 backdrop-blur-md px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 border-b transition-[color,background-color,border-color,transform] duration-300 motion-reduce:transition-none ${isVisible ? "translate-y-0" : "-translate-y-full"} ${getHeaderThemeClasses()}`}
    >
      <div className="min-w-0 flex-1 flex items-center gap-1.5 sm:gap-3">
        <button
          onClick={onBack ?? (() => window.history.back())}
          className={`${HEADER_BUTTON_CLASSES} shrink-0 border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900`}
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <span className="font-sc font-semibold text-[10px] text-jade-accent tracking-[0.2em] uppercase flex items-center gap-1.5 line-clamp-1">
            <span>
              {arcTitle} • Chapter {selectedChapter.number}
            </span>
            {selectedChapter.isSealed && (
              <span title="Published & Sealed" className="flex items-center">
                <Lock size={10} className="text-portal shrink-0" />
              </span>
            )}
            {selectedChapter.hasContinuityFaults && (
              <span title="A hard contradiction couldn't be fully reconciled with your Codex — the chapter is still fully readable." className="flex items-center bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded text-[8px] font-sans font-bold uppercase tracking-normal gap-1">
                <span className="animate-pulse">●</span> Timeline Divergence
              </span>
            )}
          </span>
          <h2 className="font-display font-medium text-signal text-base sm:text-xl line-clamp-1 mt-0.5">
            {selectedChapter.title}
          </h2>
        </div>
      </div>
      <div className="flex space-x-1 sm:space-x-2 items-center shrink-0">
        <button
          onClick={onOpenAudioControls}
          className={`${HEADER_BUTTON_CLASSES} border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900`}
          title="Audio & Narration"
          aria-label="Audio & Narration"
        >
          <Volume2 size={14} />
        </button>

        <button
          onClick={() => setShowReaderSettings(!showReaderSettings)}
          aria-expanded={showReaderSettings}
          className={`${HEADER_BUTTON_CLASSES} ${
            showReaderSettings
              ? "border-portal bg-portal/10 text-portal"
              : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
          }`}
          title="Reader Settings"
          aria-label="Reader Settings"
        >
          <Sliders size={14} />
        </button>
      </div>
    </div>
  );
}

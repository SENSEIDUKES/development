import React, { useState } from 'react';
import { ArrowLeft, History, Lock, Volume2, Zap } from 'lucide-react';
import { ReaderChapter } from '../shared/types';
import { SENSettingsIcon } from '../../library-shell/development/SENGlobalIcon';

interface ReaderHeaderProps {
  arcTitle: string;
  selectedChapter: ReaderChapter;
  onBack?: () => void;
  onOpenAudioControls: () => void;
  showReaderSettings: boolean;
  setShowReaderSettings: (show: boolean) => void;
  onAlterFate?: () => void;
  alterFateLockMessage?: string | null;
  getHeaderThemeClasses: () => string;
  /** Scroll-direction visibility from the chamber. Defaults to pinned visible. */
  isVisible?: boolean;
}

const HEADER_BUTTON_CLASSES =
  "p-2 rounded-full border flex items-center justify-center transition-all";

/**
 * Header Quick Action slot — placeholder for the future "last used tool"
 * shortcut. For now it opens a small menu so more actions can be pinned here
 * later; Alter Fate (Branch) is the first entry.
 */
function QuickActionMenu({
  onAlterFate,
  alterFateLockMessage,
}: {
  onAlterFate?: () => void;
  alterFateLockMessage?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Quick Action"
        aria-label="Quick Actions"
        className={`${HEADER_BUTTON_CLASSES} ${
          open
            ? "border-portal bg-portal/10 text-portal"
            : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
        }`}
      >
        <History size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 z-40 w-56 rounded-lg border border-neutral-800 bg-[#0b0b0b]/95 backdrop-blur-md p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          >
            <p className="px-2 pb-1.5 text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-600">
              Quick Actions
            </p>
            {onAlterFate && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onAlterFate();
                }}
                disabled={Boolean(alterFateLockMessage)}
                title={alterFateLockMessage || 'Alter Fate (Branch)'}
                aria-label={alterFateLockMessage || 'Alter Fate (Branch)'}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] font-sc uppercase tracking-wider text-portal transition-colors hover:bg-portal/10 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Zap size={13} />
                Alter Fate (Branch)
              </button>
            )}
            {alterFateLockMessage && (
              <p className="px-2 pt-1 text-[9px] leading-tight text-neutral-500">
                {alterFateLockMessage}
              </p>
            )}
            <p className="px-2 pt-1.5 text-[9px] leading-tight text-neutral-600">
              Your last used tools will pin here.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The top header is navigation and controls only: Back, story/chapter title,
 * Audio, Settings, and the Quick Action slot. Reading actions (chapter
 * navigation, comments, play/pause, codex) live in the bottom action bar.
 */
export function ReaderHeader({
  arcTitle,
  selectedChapter,
  onBack,
  onOpenAudioControls,
  showReaderSettings,
  setShowReaderSettings,
  onAlterFate,
  alterFateLockMessage,
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
          <SENSettingsIcon size={14} />
        </button>

        <QuickActionMenu
          onAlterFate={onAlterFate}
          alterFateLockMessage={alterFateLockMessage}
        />
      </div>
    </div>
  );
}

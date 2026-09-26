import React, { useState } from 'react';
import { ArrowLeft, History, Lock, Volume2, Zap } from 'lucide-react';
import { ReaderChapter } from '../../../narrative/story';
import { NarrativeIcon } from '../../../presentation';
import { SEIPopover, SEIPopoverContent, SEIPopoverTitle, SEIPopoverTrigger } from '@seihouse/ui';

interface ReaderHeaderProps {
  arcTitle: string;
  selectedChapter: ReaderChapter;
  onBack?: () => void;
  onOpenAudioControls: () => void;
  showReaderSettings: boolean;
  setShowReaderSettings: (show: boolean) => void;
  /** Opens the host's Fate page. */
  onOpenFate?: () => void;
  getHeaderThemeClasses: () => string;
  /** Scroll-direction visibility from the chamber. Defaults to pinned visible. */
  isVisible?: boolean;
  /** Host-owned control, such as a Library Familiar recall. SEN only reserves its space. */
  headerAccessory?: React.ReactNode;
  headerRef?: React.Ref<HTMLDivElement>;
  onFocusCapture?: React.FocusEventHandler<HTMLDivElement>;
}

const HEADER_BUTTON_CLASSES =
  "w-11 h-11 rounded-full border flex items-center justify-center transition-all";

/**
 * Header Quick Action slot — placeholder for the future "last used tool"
 * shortcut. For now it opens a small menu so more actions can be pinned here
 * later; Alter Fate, which opens the host's Fate page, is the first entry.
 */
function QuickActionMenu({ onOpenFate }: { onOpenFate?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <SEIPopover open={open} onOpenChange={setOpen}>
      <SEIPopoverTrigger
        title="Quick Action"
        aria-label="Quick Actions"
        className={`${HEADER_BUTTON_CLASSES} ${
          open
            ? "border-portal bg-portal/10 text-portal"
            : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
        }`}
      >
        <History size={14} />
      </SEIPopoverTrigger>
      <SEIPopoverContent
        side="bottom"
        align="end"
        collisionPadding={8}
        className="w-56 rounded-lg border border-neutral-800 bg-[#0b0b0b]/95 backdrop-blur-md p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
      >
        <SEIPopoverTitle className="px-2 pb-1.5 text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-600">
          Quick Actions
        </SEIPopoverTitle>
        {onOpenFate && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenFate();
            }}
            title="Alter Fate: where the story is headed and the next chapter's path"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] font-sc uppercase tracking-wider text-portal transition-colors hover:bg-portal/10"
          >
            <Zap size={13} />
            Alter Fate
          </button>
        )}
        <p className="px-2 pt-1.5 text-[9px] leading-tight text-neutral-600">
          Your last used tools will pin here.
        </p>
      </SEIPopoverContent>
    </SEIPopover>
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
  onOpenFate,
  getHeaderThemeClasses,
  isVisible = true,
  headerAccessory,
  headerRef,
  onFocusCapture,
}: ReaderHeaderProps) {
  return (
    <div
      ref={headerRef}
      onFocusCapture={onFocusCapture}
      data-cue-type="narrative.chapter.enter"
      data-cue-id={`chapter-enter-${selectedChapter.number}`}
      data-cue-value={
        selectedChapter.cuePayload
          ? JSON.stringify(selectedChapter.cuePayload)
          : undefined
      }
      className={`narrative-trigger reader-chamber-header ${headerAccessory ? 'reader-chamber-header-with-accessory' : ''} sticky top-[0px] z-20 backdrop-blur-md px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 border-b transition-[color,background-color,border-color,transform] duration-300 motion-reduce:transition-none ${isVisible ? "translate-y-0" : "-translate-y-full"} ${getHeaderThemeClasses()}`}
    >
      <div className="reader-chamber-header-main min-w-0 flex-1 flex items-center gap-1.5 sm:gap-3">
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
      <div className="reader-chamber-header-actions flex gap-1 sm:gap-2 items-center shrink-0">
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
          <NarrativeIcon name="settings" size={14} />
        </button>

        <QuickActionMenu
          onOpenFate={onOpenFate}
        />
        {headerAccessory && <div className="reader-chamber-header-accessory flex w-11 h-11 shrink-0 items-center justify-center">{headerAccessory}</div>}
      </div>
    </div>
  );
}

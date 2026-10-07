import React from 'react';
import { Lock, Check, Sliders, Bookmark as BookmarkIcon } from 'lucide-react';
import { ReaderChapter, Bookmark } from '../types';
import { AudioWidget } from './AudioWidget';

interface ReaderHeaderProps {
  arcTitle: string;
  selectedChapter: ReaderChapter;
  chapters: ReaderChapter[];
  selectedChapterNum: number;
  setSelectedChapterNum: (num: number) => void;
  onToggleRead: (chapterNumber: number) => void;
  showReaderPreferences: boolean;
  setShowReaderPreferences: (show: boolean) => void;
  showBookmarksPanel: boolean;
  setShowBookmarksPanel: (show: boolean) => void;
  activeBookmarks: Bookmark[];
  getHeaderThemeClasses: () => string;
}

export function ReaderHeader({
  arcTitle,
  selectedChapter,
  chapters,
  selectedChapterNum,
  setSelectedChapterNum,
  onToggleRead,
  showReaderPreferences,
  setShowReaderPreferences,
  showBookmarksPanel,
  setShowBookmarksPanel,
  activeBookmarks,
  getHeaderThemeClasses
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
      className={`narrative-trigger sticky top-[0px] z-20 backdrop-blur-md px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 border-b transition-colors duration-500 ${getHeaderThemeClasses()}`}
    >
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
      <div className="flex space-x-1 sm:space-x-2 items-center shrink-0">
        <AudioWidget />
        <button
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onToggleRead(selectedChapter.number)}
          className={`p-2 rounded-full border flex items-center justify-center transition-all ${
            selectedChapter.status === "read"
              ? "border-gold-accent bg-gold-accent/10 text-gold-accent"
              : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
          }`}
          title={selectedChapter.status === "read" ? "Mark Chapter as Unread" : "Mark Chapter as Finished & Read"}
          aria-label={selectedChapter.status === "read" ? "Mark Chapter as Unread" : "Mark Chapter as Finished & Read"}
        >
          <Check size={14} />
        </button>

        <button
          onClick={() => setShowReaderPreferences(!showReaderPreferences)}
          aria-expanded={showReaderPreferences}
          className={`p-2 rounded-full border flex items-center justify-center transition-all ${
            showReaderPreferences
              ? "border-portal bg-portal/10 text-portal"
              : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
          }`}
          title="Aetherial Styles"
          aria-label="Aetherial Styles"
        >
          <Sliders size={14} />
        </button>

        <button
          onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
          aria-expanded={showBookmarksPanel}
          className={`p-2 rounded-full border flex items-center justify-center transition-all relative ${
            showBookmarksPanel
              ? "border-gold-accent bg-gold-accent/15 text-gold-accent"
              : activeBookmarks.length > 0
                ? "border-portal/40 bg-portal/5 text-portal"
                : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
          }`}
          title="The Chronicle Anchors"
          aria-label="The Chronicle Anchors"
        >
          <BookmarkIcon size={14} />
          {activeBookmarks.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-human text-signal text-[8px] h-3.5 w-3.5 flex items-center justify-center rounded-full font-mono font-bold">
              {activeBookmarks.length}
            </span>
          )}
        </button>

        <div className="flex sm:flex relative top-0 z-50 items-center space-x-2">
          <select
            value={selectedChapterNum}
            onChange={(e) =>
              setSelectedChapterNum(parseInt(e.target.value))
            }
            className="hidden sm:block bg-void border border-neutral-800 py-1 px-3 rounded text-xs text-neutral-400 font-sans cursor-pointer focus:outline-none"
          >
            {chapters.map((ch) => (
              <option key={ch.number} value={ch.number}>
                Ch. {ch.number}: {ch.title.substring(0, 20)}...{ch.hasContinuityFaults ? " ⚠️" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark as BookmarkIcon, Trash2, ChevronRight } from 'lucide-react';
import { VirtualizedList } from '../../../presentation/VirtualizedList';
import { Chapter, Bookmark } from '../../../narrative/story';
import { bookmarkPassageText } from '../shared/mindPalace';

interface CosmicBookmarksPanelProps {
  showBookmarksPanel: boolean;
  setShowBookmarksPanel: (show: boolean) => void;
  activeBookmarks: Bookmark[];
  chapters: Chapter[];
  handleRemoveBookmark: (bookmarkId: string) => void;
  handleJumpToBookmark: (bookmark: Bookmark) => void;
}

// Performance Optimization: Cache Intl.DateTimeFormat at module level to avoid costly recreation during render loops
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const safeFormatDate = (dateVal: any) => {
  if (!dateVal) return 'Unknown';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'Unknown' : dateFormatter.format(d);
};

export const CosmicBookmarksPanel: React.FC<CosmicBookmarksPanelProps> = ({
  showBookmarksPanel,
  setShowBookmarksPanel,
  activeBookmarks,
  chapters,
  handleRemoveBookmark,
  handleJumpToBookmark
}) => {
  return (
    <>
      {showBookmarksPanel && (
        <div
          onClick={() => setShowBookmarksPanel(false)}
          className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm transition-opacity" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowBookmarksPanel(false); } }}
        />
      )}
      <AnimatePresence>
        {showBookmarksPanel && (
          <motion.div
            key="bookmarks-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 24, stiffness: 180 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-black border-l border-neutral-900 z-50 p-6 flex flex-col justify-between shadow-[2px_0_20px_rgba(0,0,0,0.95)]"
          >
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-900 mb-6">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 bg-portal/10 text-portal rounded">
                    <BookmarkIcon size={18} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-sc font-bold text-sm text-signal tracking-widest uppercase">
                      Mind Palace
                    </h3>
                    <p className="text-[10px] text-neutral-550 uppercase tracking-wider font-semibold font-sc">
                      Passages you chose to keep
                    </p>
                  </div>
                </div>
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowBookmarksPanel(false)}
                  className="p-1.5 text-neutral-400 hover:text-signal rounded border border-neutral-900 hover:border-neutral-850 transition-all font-sc text-[10px] uppercase tracking-wider"
                >
                  Close
                </button>
              </div>

              {/* Scroll list */}
              <div className="flex-1 min-h-0">
                <VirtualizedList
                  items={activeBookmarks}
                  itemHeight={180} // Estimated height of each memoir card element with annotations
                  containerHeight="100%"
                  className="pr-1"
                  emptyPlaceholder={
                    <div className="h-full flex flex-col items-center justify-center text-center text-neutral-650 space-y-3 py-16">
                      <BookmarkIcon
                        size={36}
                        className="text-neutral-800 animate-pulse animate-duration-1000"
                      />
                      <p className="font-serif italic text-xs max-w-xs px-4">
                        "Nothing is kept here yet. Use the marker beside any
                        passage to keep it, with an optional note."
                      </p>
                    </div>
                  }
                  renderItem={(bookmark) => {
                    const bookmarkedChapter = chapters.find(
                      (c) => c.number === bookmark.chapterNumber,
                    );
                    return (
                      <div
                        key={bookmark.id}
                        className="p-4 bg-neutral-950 border border-neutral-900 hover:border-portal/40 rounded-lg space-y-2.5 transition-all text-left relative group mb-4"
                      >
                        {/* Title metadata */}
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-sc font-bold text-gold-accent tracking-wider uppercase">
                            Ch. {bookmark.chapterNumber} •{" "}
                            {bookmarkedChapter
                              ? bookmarkedChapter.title.length > 24
                                ? `${bookmarkedChapter.title.slice(0, 24)}…`
                                : bookmarkedChapter.title
                              : "Sacred Chapter"}
                          </span>
                          <span className="text-neutral-600 font-mono text-[9px]">
                            {safeFormatDate(bookmark.createdAt)}
                          </span>
                        </div>

                        {/* Passage snippet */}
                        <p className="font-serif italic text-xs text-neutral-400 line-clamp-3 leading-relaxed border-l border-neutral-800 pl-2.5">
                          "{bookmarkPassageText(bookmark)}"
                        </p>

                        {/* Anchor feedback notes */}
                        {bookmark.note && (
                          <div className="bg-portal/5 border border-portal/10 p-2 rounded text-[11px] font-sans text-neutral-200 italic">
                            <span className="font-sc font-bold text-[8px] text-portal tracking-widest uppercase block not-italic mb-0.5">
                              Your note
                            </span>
                            {bookmark.note}
                          </div>
                        )}

                        {/* Controls row */}
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-900/60">
                          <button
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() =>
                              handleRemoveBookmark(bookmark.id)
                            }
                            className="text-neutral-600 hover:text-red-500 text-[10px] font-sc font-bold uppercase tracking-wider flex items-center space-x-1"
                            title="Remove from Mind Palace"
                            aria-label="Remove from Mind Palace"
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>

                          <button
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleJumpToBookmark(bookmark)}
                            className="px-3 py-1 bg-portal/11 hover:bg-portal text-portal hover:text-void text-[10px] font-sc font-bold uppercase tracking-wider rounded transition-all flex items-center space-x-1.5"
                          >
                            <span>Go to passage</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

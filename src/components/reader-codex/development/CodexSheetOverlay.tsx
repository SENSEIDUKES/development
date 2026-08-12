import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import ReaderCodex from './ReaderCodex';
import type { StoryMemory, StoryWorld, UpdateStoryFields } from '../shared/types';

export interface CodexSheetOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeStory: StoryWorld;
  onUpdateMemory: (memory: StoryMemory) => void;
  updateStoryFields: UpdateStoryFields;
  onJumpToChapter: (chapterNumber: number) => void;
}

export const CodexSheetOverlay: React.FC<CodexSheetOverlayProps> = ({
  isOpen,
  onClose,
  activeStory,
  onUpdateMemory,
  updateStoryFields,
  onJumpToChapter,
}) => {
  return (
    <AnimatePresence>
      {isOpen && activeStory && (
        <motion.div
          key="codex-sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center pointer-events-none"
        >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/90 sm:backdrop-blur-sm pointer-events-auto"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClose();
              }
            }}
            aria-label="Close Codex"
          />

          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full sm:w-[95dvw] lg:w-[90dvw] sm:max-h-[90dvh] h-[95dvh] sm:h-auto bg-[#0a0a0a] border border-neutral-900 rounded-t-3xl sm:rounded-xl shadow-2xl pointer-events-auto flex flex-col pt-2 sm:pt-0"
            role="dialog"
            aria-label="Codex"
          >
            <div className="w-12 h-1.5 bg-neutral-800 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

            <div className="flex items-center space-x-2 bg-black/60 border border-neutral-900 px-3 py-3 sm:px-4 sm:py-2 rounded shadow-md backdrop-blur-md mb-2 sm:mb-6 sticky top-0 z-30 mx-4 mt-2 sm:mt-6 shrink-0">
              <button
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
                onClick={onClose}
                className="text-neutral-500 hover:text-portal transition-colors flex-shrink-0"
                aria-label="Close Codex Sheet"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="text-portal font-display text-sm sm:text-lg font-bold truncate">
                {activeStory.title || 'Untitled Story'}
              </span>
              <span className="text-neutral-600 font-sans text-xs sm:text-sm flex-shrink-0">
                - Reader Codex
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-12 custom-scrollbar">
              <div className="max-w-6xl mx-auto">
                <ReaderCodex
                  memory={activeStory.memory ?? ({} as StoryMemory)}
                  arcs={Array.isArray(activeStory.arcs) ? activeStory.arcs : []}
                  onUpdateMemory={onUpdateMemory}
                  mcName={activeStory.mcName || 'Main Character'}
                  onJumpToChapter={(chapterNumber) => {
                    onJumpToChapter(chapterNumber);
                    onClose();
                  }}
                  onSwitchTab={(tab) => {
                    if (tab === 'reader') onClose();
                  }}
                  activeStory={activeStory}
                  updateStoryFields={updateStoryFields}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import ReaderCodex from './ReaderCodex';
import { UpdateStoryFields } from '../types';

export const CodexSheetOverlay: React.FC<{
  handleUpdateMemoryManual: (updated: any) => void,
  updateStoryFields: UpdateStoryFields
}> = ({ handleUpdateMemoryManual, updateStoryFields }) => {

  const isCodexSheetOpen = useAppStore(state => state.isCodexSheetOpen);
    const setIsCodexSheetOpen = useAppStore(state => state.setIsCodexSheetOpen);
    const stories = useAppStore(state => state.stories);
    const activeStoryId = useAppStore(state => state.activeStoryId);
    const setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const setSelectedChapterNum = useAppStore(state => state.setSelectedChapterNum);
    const routingConfig = useAppStore(state => state.routingConfig);
  const activeStory = stories.find(s => s.id === activeStoryId);

  return (
    <AnimatePresence>
      {isCodexSheetOpen && activeStory && (
        <motion.div
          key="codex-sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none"
        >
          <div
            onClick={() => setIsCodexSheetOpen(false)}
            className="absolute inset-0 bg-black/90 sm:backdrop-blur-sm pointer-events-auto" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsCodexSheetOpen(false); } }}
            aria-label="Close Codex"
          />
          
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full sm:w-[95dvw] lg:w-[90dvw] sm:max-h-[90dvh] h-[95dvh] sm:h-auto bg-[#0a0a0a] border border-neutral-900 rounded-t-3xl sm:rounded-xl shadow-2xl pointer-events-auto flex flex-col pt-2 sm:pt-0"
            role="dialog"
            aria-label="Codex"
          >
            <div className="w-12 h-1.5 bg-neutral-800 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />
            
            <div className="flex items-center space-x-2 bg-black/60 border border-neutral-900 px-3 py-3 sm:px-4 sm:py-2 rounded shadow-md backdrop-blur-md mb-2 sm:mb-6 sticky top-0 z-30 mx-4 mt-2 sm:mt-6 shrink-0">
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={() => setIsCodexSheetOpen(false)}
                className="text-neutral-500 hover:text-portal transition-colors flex-shrink-0"
                aria-label="Close Codex Sheet"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="text-portal font-display text-sm sm:text-lg font-bold truncate">{activeStory.title}</span>
              <span className="text-neutral-600 font-sans text-xs sm:text-sm flex-shrink-0">- Reader Codex</span>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-12 custom-scrollbar">
              <div className="max-w-6xl mx-auto">
                <ReaderCodex
                  memory={activeStory.memory}
                  arcs={activeStory.arcs}
                  onUpdateMemory={handleUpdateMemoryManual}
                  mcName={activeStory.mcName}
                  onJumpToChapter={(num) => {
                    setSelectedChapterNum(num);
                    setCurrentScreen('reader');
                    setIsCodexSheetOpen(false);
                  }}
                  onSwitchTab={(tab) => {
                    if (tab === 'reader') setIsCodexSheetOpen(false);
                  }}
                  activeStory={activeStory}
                  updateStoryFields={updateStoryFields}
                  routingConfig={routingConfig}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

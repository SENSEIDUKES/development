import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, FastForward, Play } from 'lucide-react';
import { StoryWorld } from '../types';

interface RecapScreenProps {
  story: StoryWorld;
  lastReadChapter: number;
  onContinue: () => void;
}

export const RecapScreen: React.FC<RecapScreenProps> = ({ story, lastReadChapter, onContinue }) => {
  const [show, setShow] = useState(true);

  // We want to stitch the summaries of up to the last 5 chapters BEFORE the currently selected chapter (lastReadChapter).
  const allChapters = story.arcs.flatMap(a => a.chapters).filter(c => c.number <= lastReadChapter && (c.summary || c.generatedContent));
  
  // Get last 3 summaries
  const recentChapters = allChapters.slice(-3);

  // If there's barely any history, just skip.
  useEffect(() => {
    if (recentChapters.length === 0) {
      onContinue();
    }
  }, [recentChapters, onContinue]);

  if (recentChapters.length === 0) return null;

  const getShortSummary = (summaryText: string): string => {
    if (!summaryText) return "The journey evolved rapidly.";
    const sentences = summaryText.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (!sentences || sentences.length <= 3) {
      return summaryText.trim();
    }
    return sentences.slice(0, 3).join("").trim();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[100] bg-black/95 overflow-y-auto text-center"
          id="recap-screen-overlay"
        >
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-portal/10 via-black to-black pointer-events-none" id="recap-radial-gradient" />

          <div className="min-h-full w-full flex flex-col items-center py-12 sm:py-24 px-4 sm:px-8 relative z-10" id="recap-content-wrapper">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1.5 }}
              className="w-full max-w-2xl relative my-auto"
              id="recap-content-body"
            >
              <h2 className="text-portal font-sc tracking-[0.2em] sm:tracking-[0.3em] uppercase text-xs sm:text-sm mb-6 sm:mb-8 font-bold flex items-center justify-center gap-2 sm:gap-3" id="recap-heading">
                <FastForward size={14} className="sm:w-4 sm:h-4" />
                <span>Previously on {story.title}</span>
                <FastForward size={14} className="sm:w-4 sm:h-4" />
              </h2>

              <div className="space-y-4 sm:space-y-6 text-left" id="recap-chapters-list">
                {recentChapters.map((ch, idx) => (
                  <motion.div
                    key={ch.number}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + (idx * 1.5), duration: 1 }}
                    className="pl-3 sm:pl-4 border-l-2 border-portal/30"
                    id={`recap-chapter-${ch.number}`}
                  >
                    <p className="text-neutral-500 font-mono text-[9px] sm:text-[10px] uppercase mb-1">
                      Chapter {ch.number}: {ch.title}
                    </p>
                    <p className="text-signal font-serif text-sm sm:text-base md:text-lg leading-relaxed shadow-portal/10 drop-shadow-md">
                      {getShortSummary(ch.summary || "")}
                    </p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mt-8 sm:mt-16"
                id="recap-actions"
              >
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                    setShow(false);
                    setTimeout(onContinue, 1000);
                  }}
                  className="px-6 py-2.5 sm:px-8 sm:py-3 bg-portal/20 text-portal border border-portal hover:bg-portal hover:text-white transition-all rounded font-sc uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold flex items-center gap-2 mx-auto shadow-[0_0_20px_rgba(4,172,255,0.3)] text-xs sm:text-sm"
                  id="recap-resume-button"
                >
                  <Play size={14} className="sm:w-4 sm:h-4" />
                  <span>Resume Reading</span>
                </button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

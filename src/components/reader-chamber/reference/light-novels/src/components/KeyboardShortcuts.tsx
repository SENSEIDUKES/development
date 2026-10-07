import React, { useEffect } from 'react';
import FocusLock from 'react-focus-lock';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Home, PenTool, User, Sliders, BookOpen, Minimize2, Maximize2, HelpCircle, BookText, ScrollText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const isTyping = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (!target) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
};

export const KeyboardShortcuts: React.FC = () => {
  const currentScreen = useAppStore(state => state.currentScreen);
    const setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const setActiveStoryId = useAppStore(state => state.setActiveStoryId);
    const activeStoryId = useAppStore(state => state.activeStoryId);
    const stories = useAppStore(state => state.stories);
    const selectedChapterNum = useAppStore(state => state.selectedChapterNum);
    const setSelectedChapterNum = useAppStore(state => state.setSelectedChapterNum);
    const isSettingsOpen = useAppStore(state => state.isSettingsOpen);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const isCodexSheetOpen = useAppStore(state => state.isCodexSheetOpen);
    const setIsCodexSheetOpen = useAppStore(state => state.setIsCodexSheetOpen);
    const isReaderFullscreen = useAppStore(state => state.isReaderFullscreen);
    const setIsReaderFullscreen = useAppStore(state => state.setIsReaderFullscreen);
    const isShortcutsOpen = useAppStore(state => state.isShortcutsOpen);
    const setIsShortcutsOpen = useAppStore(state => state.setIsShortcutsOpen);
    const immersion = useAppStore(state => state.immersion);
    const setImmersion = useAppStore(state => state.setImmersion);

  const activeStory = stories.find(s => s.id === activeStoryId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is actively writing in a form field.
      if (isTyping(e)) {
        // Allow escape to blur/close even if typing
        if (e.key === 'Escape') {
          const target = e.target as HTMLElement;
          target.blur();
        }
        return;
      }

      const key = e.key.toLowerCase();
      const alt = e.altKey;

      // Escape Handling
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (isCodexSheetOpen) {
          setIsCodexSheetOpen(false);
          return;
        }
        if (isReaderFullscreen) {
          setIsReaderFullscreen(false);
          return;
        }
        // In-app Go Back Navigation
        if (currentScreen === 'reader') {
          setCurrentScreen('detail');
          return;
        }
        if (currentScreen === 'detail') {
          setCurrentScreen('home');
          setActiveStoryId(null);
          return;
        }
        if (currentScreen === 'creator' || currentScreen === 'profile') {
          setCurrentScreen('home');
          return;
        }
      }

      // Help manual/cheat sheet toggle
      if (e.key === '?' || (alt && key === '?')) {
        e.preventDefault();
        setIsShortcutsOpen(!isShortcutsOpen);
        return;
      }

      // Global Screen Navigation Shortcuts
      if (key === 'h' || (alt && key === 'h')) {
        e.preventDefault();
        setCurrentScreen('home');
        setActiveStoryId(null);
        return;
      }
      if (key === 'c' || (alt && key === 'c')) {
        e.preventDefault();
        setCurrentScreen('creator');
        return;
      }
      if (key === 'p' || (alt && key === 'p')) {
        e.preventDefault();
        setCurrentScreen('profile');
        return;
      }

      // Global UI Overlay Toggles
      if (key === 's' || (alt && key === 's')) {
        e.preventDefault();
        setIsSettingsOpen(!isSettingsOpen);
        return;
      }
      if (key === 'k' || (alt && key === 'k')) {
        e.preventDefault();
        setIsCodexSheetOpen(!isCodexSheetOpen);
        return;
      }

      // Reader-specific Navigation & Settings Shortcuts
      if (currentScreen === 'reader' && activeStory) {
        const chapters = activeStory.arcs.flatMap(a => a.chapters);
        
        // Prev/Next Chapter Selection
        if (e.key === '[' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevCh = selectedChapterNum - 1;
          const chapterExists = chapters.some(c => c.number === prevCh);
          if (chapterExists && prevCh >= 1) {
            setSelectedChapterNum(prevCh);
          }
          return;
        }
        if (e.key === ']' || e.key === 'ArrowRight') {
          e.preventDefault();
          const nextCh = selectedChapterNum + 1;
          const chapterExists = chapters.some(c => c.number === nextCh);
          if (chapterExists) {
            setSelectedChapterNum(nextCh);
          }
          return;
        }

        // Reader Fullscreen Mode
        if (key === 'f' || (alt && key === 'f')) {
          e.preventDefault();
          setIsReaderFullscreen(!isReaderFullscreen);
          return;
        }

        // Glossary Panel toggle (via helper custom event dispatch)
        if (key === 'g' || (alt && key === 'g')) {
          e.preventDefault();
          const ev = new CustomEvent('toggle-glossary-panel');
          window.dispatchEvent(ev);
          return;
        }

        // AutoScroll Immersion switch
        if (key === 'i' || (alt && key === 'i')) {
          e.preventDefault();
          setImmersion({ autoScroll: !immersion.autoScroll });
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    currentScreen,
    activeStoryId,
    stories,
    selectedChapterNum,
    isSettingsOpen,
    isCodexSheetOpen,
    isReaderFullscreen,
    isShortcutsOpen,
    immersion.autoScroll,
    setCurrentScreen,
    setActiveStoryId,
    setIsSettingsOpen,
    setIsCodexSheetOpen,
    setIsReaderFullscreen,
    setIsShortcutsOpen,
    setSelectedChapterNum,
    setImmersion,
    activeStory
  ]);

  return (
    <AnimatePresence>
      {isShortcutsOpen && (
        <FocusLock>
          <motion.div
            key="shortcuts-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 selection:bg-portal/20"
        >
          {/* Backdrop Blur */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setIsShortcutsOpen(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsShortcutsOpen(false); } }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-[#000000] border border-neutral-900 rounded-xl shadow-[0_0_50px_rgba(4,172,255,0.15)] max-w-lg w-full p-6 text-left z-10 font-sans max-h-[85dvh] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800"
          >
            {/* Energy Meridian Top Accents */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-human via-portal to-gold-accent opacity-75 rounded-t-xl"></div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-portal">
                  <Keyboard size={20} className="drop-shadow-[0_0_8px_rgba(4,172,255,0.4)]" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-signal tracking-wide uppercase">Shortcuts Meridian</h2>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest leading-none mt-1">Celestial Matrix Navigation</p>
                </div>
              </div>
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsShortcutsOpen(false)}
                className="p-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 rounded-md text-neutral-400 hover:text-signal transition-all"
                aria-label="Close shortcuts"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content Groupings */}
            <div className="space-y-6">
              {/* SECTION 1: GLOBAL CONTROL */}
              <div className="space-y-3">
                <h3 className="font-sc font-bold text-xs text-portal tracking-widest uppercase">Global Projections</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <Home size={12} className="text-neutral-500 shrink-0" />
                      <span>Celestial Library (Home)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Alt</kbd>
                      <span className="text-neutral-600 text-[10px] font-bold font-mono">+</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">H</kbd>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <PenTool size={12} className="text-neutral-500 shrink-0" />
                      <span>Creation Portal</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Alt</kbd>
                      <span className="text-neutral-600 text-[10px] font-bold font-mono">+</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">C</kbd>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <User size={12} className="text-neutral-500 shrink-0" />
                      <span>Spirit Profile</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Alt</kbd>
                      <span className="text-neutral-600 text-[10px] font-bold font-mono">+</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">P</kbd>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <Sliders size={12} className="text-neutral-500 shrink-0" />
                      <span>Aether Router (Settings)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Alt</kbd>
                      <span className="text-neutral-600 text-[10px] font-bold font-mono">+</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">S</kbd>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <BookOpen size={12} className="text-neutral-500 shrink-0" />
                      <span>Codex Core Matrix</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Alt</kbd>
                      <span className="text-neutral-600 text-[10px] font-bold font-mono">+</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-portal px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">K</kbd>
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: READER SPECIFIC */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-sc font-bold text-xs text-human tracking-widest uppercase">Immersion Chambers</h3>
                  <span className="text-[8px] font-mono text-neutral-500 uppercase">Only inside Active Reader</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <BookText size={12} className="text-neutral-500 shrink-0" />
                      <span>Lore Glossary Side Panel</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Alt</kbd>
                      <span className="text-neutral-600 text-[10px] font-bold font-mono">+</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">G</kbd>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <span>Navigate Core Chapters</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-2 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">[</kbd>
                      <span className="text-neutral-600 font-serif text-[10px]">/</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-2 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">←</kbd>
                      <span className="text-neutral-600 font-serif text-[10px] mx-1">and</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-2 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">]</kbd>
                      <span className="text-neutral-600 font-serif text-[10px]">/</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-2 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">→</kbd>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      {isReaderFullscreen ? (
                        <Minimize2 size={12} className="text-neutral-500 shrink-0" />
                      ) : (
                        <Maximize2 size={12} className="text-neutral-500 shrink-0" />
                      )}
                      <span>Immersive Fullscreen View</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Alt</kbd>
                      <span className="text-neutral-600 text-[10px] font-bold font-mono">+</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">F</kbd>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <ScrollText size={12} className="text-neutral-500 shrink-0" />
                      <span>Toggle AutoScroll Loop</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Alt</kbd>
                      <span className="text-neutral-600 text-[10px] font-bold font-mono">+</span>
                      <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-human px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">I</kbd>
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SYSTEM OVERLAYS */}
              <div className="space-y-3">
                <h3 className="font-sc font-bold text-xs text-neutral-500 tracking-widest uppercase">Aether Navigation</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <HelpCircle size={12} className="text-neutral-500 shrink-0" />
                      <span>This Shortcuts Meridian</span>
                    </span>
                    <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-neutral-400 px-2 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">?</kbd>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-neutral-950/40 border border-neutral-900/60 rounded">
                    <span className="text-neutral-300 font-serif flex items-center space-x-2">
                      <span>Close Projection / Step Out</span>
                    </span>
                    <kbd className="border border-neutral-800 bg-void text-[10px] font-mono font-bold text-neutral-400 px-1.5 py-0.5 rounded shadow border-b-[2px] border-b-neutral-700">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-neutral-950 pt-3 text-center">
              <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest leading-none">
                SEIHouse Fiction Engine • Transcendental Flow Synchronized
              </span>
            </div>
          </motion.div>
        </motion.div>
        </FocusLock>
      )}
    </AnimatePresence>
  );
};

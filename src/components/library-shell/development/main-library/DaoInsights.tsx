import FocusLock from 'react-focus-lock';
import { useHeaderClipboard } from '../MainLibraryHeader';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, Layers, Compass, HelpCircle, X, ChevronRight, Copy, Check } from 'lucide-react';
import {
  useMainLibraryAdapter as useAppStore,
  type DaoQuoteCategory,
} from '../../shared/MainLibraryAdapter';

export interface DaoQuote {
  quote: string;
  author: string;
  category: 'comedic' | 'inspirational' | 'comforting';
}

const STATIC_DAO_QUOTES: DaoQuote[] = [
  // --- COMEDIC (Wuxia Self-Aware / Healing Academic Sadness) ---
  {
    quote: "If your Qi is blocked, perhaps you are simply holding your breath to avoid the smell of your roommate's low-grade medicinal stew.",
    author: "Sleepless Master of the Nine Tea Cups",
    category: 'comedic',
  },
  {
    quote: "Failing the imperial examinations is the first step toward becoming a legendary rogue cultivator. After all, nobody ever forged a peerless flying sword out of exam papers.",
    author: "Arch-Elder of the Rejected Inkstone",
    category: 'comedic',
  },
  {
    quote: "Do not vex yourself over high-tier scriptures. Even the Heaven-Trampling Sect Leader started by accidentally lighting his own robes on fire while trying to kindle an inner flame.",
    author: "Drunken Quill Immortal",
    category: 'comedic',
  },
  {
    quote: "They say money cannot buy the Great Dao, yet a single low-grade spiritual stone can buy three bowls of warm scallion noodles. To a hungry scholar, noodles ARE the Dao.",
    author: "Gluttonous Hermit of Blue-Wave Pier",
    category: 'comedic',
  },
  {
    quote: "If you cannot master the celestial flying sword, try walking with a really long, polished bamboo pole. The mortals will still think you are incredibly profound.",
    author: "Fairy Chef of the Red Lotus Valley",
    category: 'comedic',
  },
  {
    quote: "Ten years of hard study under a dim oil lamp, only to realize thy calligraphy was actually a recipe for pan-fried pork buns. Do not weep; pork buns are sacred.",
    author: "Grand Scholar of the Burnt Wok",
    category: 'comedic',
  },

  // --- INSPIRATIONAL (Rivers, Swords, Meridians, Sky) ---
  {
    quote: "The ink of a weary scholar's pen flows along the same currents as the sword-intent of a celestial king. Both trace the eternal brushstrokes of fate.",
    author: "Jade Scholar of the Northern Star",
    category: 'inspirational',
  },
  {
    quote: "Though thy spirit-root is ranked mortal, the sky has no ceiling for those who dare paint magnificent wings upon their own hearts.",
    author: "Ancestor of the Unfaded Ink",
    category: 'inspirational',
  },
  {
    quote: "The highest, cloud-shrouded peaks are climbed not by the fastest feet, but by the quietest hearts that refuse to look back.",
    author: "Hermit of the Whispering Pines",
    category: 'inspirational',
  },
  {
    quote: "Your current tribulation is but a rough whetstone. It does not exist to shatter you, but to polish the blade of your resolve until it reflects the stars.",
    author: "Wandering Sword-Saint of Crimson River",
    category: 'inspirational',
  },
  {
    quote: "A single, focused drop of starlight ink can change the entire course of an empire’s scroll. Never believe your quiet efforts are lost to the wind.",
    author: "Sentinel of the Quiet Valley",
    category: 'inspirational',
  },
  {
    quote: "The river does not cut through the ancient granite by sheer strength alone, but by committing its entire spirit to the inevitable flows of time.",
    author: "Sage of the Gushing Torrent",
    category: 'inspirational',
  },

  // --- COMFORTING / GOOD FEELING (Rest, Tea, Sunset, Acceptance) ---
  {
    quote: "Draw comfort, young scholar, for even the eternal constellations hide behind the gray rain clouds when they are tired of shining.",
    author: "Mother of the Gentle Breeze",
    category: 'comforting',
  },
  {
    quote: "Close your dusty scrolls. Light a single stick of cedar incense. The Great Dao is not found in old papers, but in the warmth of the tea steam rising to meet your face.",
    author: "Old Auntie of the Peach Blossom Orchard",
    category: 'comforting',
  },
  {
    quote: "It is okay to rest a while beneath the weeping willow tree. Even the legendary wind-riders must touch the grass occasionally to remember the scent of the earth.",
    author: "Free-Spirited Wanderer of Southern Reach",
    category: 'comforting',
  },
  {
    quote: "If thou hast no gold in thy purse and no qi in thy dantian today, come sit. The moon shines just as brightly upon a beggar's copper cup as it does upon the Jade Emperor's throne.",
    author: "Old Taoist of the Drunken Clay Pot",
    category: 'comforting',
  },
  {
    quote: "A warm, slow-simmered bowl of sweet congee on a snowy night is worth more than ten thousand high-grade pills. May your belly be full, and your heart untangled.",
    author: "Guardian of the Red Hearth",
    category: 'comforting',
  },
  {
    quote: "Success and failure are but alternating tides of the silver river. Tonight, let the brush rest; you are here, you are breathing, and that is a masterpiece in itself.",
    author: "Sleepless Master of the Nine Tea Cups",
    category: 'comforting',
  }
];

export const DaoInsights: React.FC = () => {
  const copyText = useHeaderClipboard();
  const [copyError, setCopyError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<DaoQuote>(STATIC_DAO_QUOTES[0]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'comedic' | 'inspirational' | 'comforting'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [daoStatus, setDaoStatus] = useState<'connected' | 'checking' | 'disconnected'>('checking');

  const requestDao = useAppStore(state => state.requestDao);

  // Pick a random quote initially and set mounted state
  useEffect(() => {
    setMounted(true);
    const rIdx = Math.floor(Math.random() * STATIC_DAO_QUOTES.length);
    setCurrentQuote(STATIC_DAO_QUOTES[rIdx]);
  }, []);

  // Fetch Dao Connection State
  useEffect(() => {
    const checkState = async () => {
      try {
        const res = await requestDao('status');
        if (res.ok) {
          const stats = await res.json();
          setDaoStatus(stats.hasServerGemini ? 'connected' : 'disconnected');
        } else {
          setDaoStatus('disconnected');
        }
      } catch {
        setDaoStatus('disconnected');
      }
    };
    checkState();
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Soft Auto-rotation loop inside Header (every 14 seconds)
  useEffect(() => {
    if (isOpen) return; // Freeze auto-rotation if details overlay is open

    const interval = setInterval(() => {
      const filtered = STATIC_DAO_QUOTES.filter(q =>
        categoryFilter === 'all' ? true : q.category === categoryFilter
      );
      if (filtered.length === 0) return;

      // Ensure we pick a different one if possible
      let nextQuote = filtered[Math.floor(Math.random() * filtered.length)];
      if (filtered.length > 1 && nextQuote.quote === currentQuote.quote) {
        const filteredWithoutCurrent = filtered.filter(q => q.quote !== currentQuote.quote);
        nextQuote = filteredWithoutCurrent[Math.floor(Math.random() * filteredWithoutCurrent.length)];
      }
      setCurrentQuote(nextQuote);
    }, 14000);

    return () => clearInterval(interval);
  }, [categoryFilter, currentQuote, isOpen]);

  const seekDaoInsights = async () => {
    if (isRolling || isAiGenerating) return;
    setIsRolling(true);
    setCopied(false);

    // Filter static quotes for animation cycling
    const filtered = STATIC_DAO_QUOTES.filter(q => {
      if (categoryFilter === 'all') return true;
      return q.category === categoryFilter;
    });

    const currentCategory: DaoQuoteCategory = categoryFilter === 'all'
      ? (['comedic', 'inspirational', 'comforting'][Math.floor(Math.random() * 3)] as DaoQuoteCategory)
      : categoryFilter;

    // Start cycling local quotes for a beautiful scrolling slots effect
    let counter = 0;
    const maxTicks = 12; // 1.2 seconds of glorious spinning carousel
    const tickInterval = setInterval(() => {
      const tempQuote = filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentQuote(tempQuote);
      counter++;
      if (counter >= maxTicks) {
        clearInterval(tickInterval);
      }
    }, 100);

    // Combine timeout and API fetch using Promise.all to guarantee the spin completes beautifully first
    const delayPromise = new Promise(resolve => setTimeout(resolve, maxTicks * 100));

    if (daoStatus === 'connected') {
      setIsAiGenerating(true);
      try {
        const [response] = await Promise.all([
          requestDao(currentCategory),
          delayPromise
        ]);

        if (!response.ok) {
          throw new Error("Divination flow interrupted");
        }

        const outcome = await response.json();
        setCurrentQuote({
          quote: outcome.quote,
          author: outcome.author,
          category: outcome.category || currentCategory
        });
      } catch (err) {
        console.warn("AI generation failed, holding fallback jade slip close:", err);
        // Ensure delay is satisfied first if there is a quick error
        await delayPromise;
      } finally {
        setIsAiGenerating(false);
        setIsRolling(false);
      }
    } else {
      // Offline/Local mode: Wait for the delay & finish rolling
      await delayPromise;
      setIsRolling(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await copyText(`"${currentQuote.quote}" — ${currentQuote.author} (${currentQuote.category.toUpperCase()})`);
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopyError(true); }
  };

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  return (
    <>
      {/* 1. COMPACT CENTER DISPLAY BLOCK inside GlobalHeader */}
      <div
        id="dao-insights-header-center"
        onClick={() => setIsOpen(true)}
        className="dao-insights-trigger flex flex-col flex-1 min-w-0 items-center justify-center max-w-[200px] sm:max-w-[340px] xl:max-w-md mx-2 sm:mx-4 px-2 py-1 bg-neutral-950/40 border border-neutral-900 hover:border-portal/30 hover:bg-neutral-950/70 rounded-xl transition-all duration-300 cursor-pointer select-none group text-center overflow-hidden h-10 sm:h-12"
        role="button" aria-haspopup="dialog" aria-expanded={isOpen} aria-label="Insights from the Dao"
        title="Insights From The Dao — Click to Seek Divine Fortune" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(true); } }}
      >
        <div className="flex items-center space-x-1 mb-0.5 shrink-0">
          <Sparkles size={11} className="text-portal shrink-0 group-hover:rotate-12 transition-transform" />
          <span className="font-sc font-bold text-[8px] tracking-[0.18em] text-neutral-500 uppercase leading-none group-hover:text-portal transition-colors">
            Insights from the Dao
          </span>
        </div>

        {/* Animated Fading quote container */}
        <div className="w-full relative h-[18px] overflow-hidden flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentQuote.quote}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-[11px] font-sans font-medium text-signal truncate w-full italic px-1"
            >
              "{currentQuote.quote}"
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* 2. THE CELESTIAL ORACLE MODAL/DETAILS PANEL */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="dao-overlay-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 selection:bg-portal/20"
            >
              {/* Backdrop Blur */}
              <div
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
                onClick={() => setIsOpen(false)} aria-hidden="true"
              />

              {/* Modal Body */}
              <FocusLock returnFocus className="contents">
              <motion.div role="dialog" aria-modal="true" aria-label="The Dao Insights Oracle"
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="library-header-dialog relative bg-[#000000] border border-neutral-900 rounded-2xl shadow-[0_0_60px_rgba(4,172,255,0.18)] max-w-lg w-full p-4 sm:p-6 text-left z-10 font-sans max-h-[90vh] sm:max-h-[85vh] overflow-y-auto flex flex-col"
              >
                {/* Grand Energy Meridian Line */}
                <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-human via-portal to-gold-accent rounded-t-2xl animate-pulse" />

                {/* Close Button */}
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 p-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 rounded-md text-neutral-400 hover:text-signal transition-all"
                  aria-label="Close divination overlay"
                >
                  <X size={15} />
                </button>

                {/* Header Title */}
                <div className="flex items-center space-x-3 border-b border-neutral-900 pb-4 mb-5">
                  <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-xl text-portal shadow-[0_0_15px_rgba(4,172,255,0.1)] overflow-hidden">
                    <motion.div
                      animate={{ rotate: isRolling ? [0, 360, 1080] : [0, 360] }}
                      transition={{
                        duration: isRolling ? 1.2 : 12,
                        repeat: isRolling ? 0 : Infinity,
                        ease: isRolling ? "easeInOut" : "linear"
                      }}
                      className="flex items-center justify-center"
                    >
                      <Compass size={22} className="text-portal" />
                    </motion.div>
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl text-signal tracking-wide uppercase flex items-center space-x-2">
                      <span>The Dao Insights Oracle</span>
                      <span className="text-[10px] py-0.5 px-2 bg-portal/10 text-portal rounded-full border border-portal/20 font-sans tracking-widest uppercase font-semibold">
                        Divined
                      </span>
                    </h2>
                    <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest leading-none mt-1">
                      Healing the Spirits of Weary Scholars & Wandering Immortals
                    </p>
                  </div>
                </div>

                {/* Category Filter Pills (Rubik/System) */}
                <div className="flex flex-wrap gap-1.5 mb-5 shrink-0">
                  {(['all', 'comedic', 'inspirational', 'comforting'] as const).map(cat => (
                    <button
                      key={cat} aria-pressed={categoryFilter === cat}
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                        setCategoryFilter(cat);
                        setCopied(false);
                      }}
                      className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold font-sans rounded-md border transition-all duration-300 ${
                        categoryFilter === cat
                          ? cat === 'comedic'
                            ? 'bg-amber-950/20 border-amber-600/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                            : cat === 'inspirational'
                            ? 'bg-portal/10 border-portal/50 text-portal shadow-[0_0_10px_rgba(4,172,255,0.15)]'
                            : cat === 'comforting'
                            ? 'bg-human/10 border-human/50 text-red-400 shadow-[0_0_10px_rgba(139,0,0,0.15)]'
                            : 'bg-neutral-850 border-neutral-700 text-signal'
                          : 'bg-neutral-950 border-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {cat === 'all' && 'All Energies'}
                      {cat === 'comedic' && 'Comedic Dao'}
                      {cat === 'inspirational' && 'Inspirational Qi'}
                      {cat === 'comforting' && 'Good Feeling'}
                    </button>
                  ))}
                </div>

                {copyError && <p role="alert">Could not copy wisdom. Please try again.</p>}
                {/* Quote Reading Screen Card */}
                <div
                  onClick={copyToClipboard}
                  className="relative bg-neutral-950 hover:bg-neutral-950/80 border border-neutral-900 hover:border-portal/40 cursor-pointer rounded-xl p-6 mb-6 overflow-hidden min-h-[140px] flex flex-col justify-between group transition-all"
                  title="Click to copy quote" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyToClipboard(); } }}
                >
                  {/* Visual Accent behind quote */}
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-portal/2 rounded-full blur-2xl group-hover:bg-portal/4 transition-colors" />

                  {/* Copy Status Badge */}
                  <div className="absolute top-3 right-3 flex items-center space-x-1 text-[9px] font-mono select-none">
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.span
                          key="copied"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="text-emerald-400 flex items-center gap-1 font-semibold"
                        >
                          <Check size={11} /> COPIED WISDOM
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.4 }}
                          className="text-neutral-400 group-hover:opacity-100 flex items-center gap-1 transition-opacity"
                        >
                          <Copy size={11} /> CLICK TO COPY
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuote.quote}
                      initial={{ opacity: 0, scale: 0.98, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -5 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col h-full justify-between"
                    >
                      <div>
                        {/* Category Label badge inside reader display */}
                        <span className={`text-[8px] font-mono tracking-widest uppercase font-extrabold block mb-3 leading-none ${
                          currentQuote.category === 'comedic'
                            ? 'text-amber-450'
                            : currentQuote.category === 'inspirational'
                            ? 'text-portal'
                            : 'text-rose-500'
                        }`}>
                          ◆ {currentQuote.category} insight
                        </span>

                        {/* Profound Quote Body (Friendly Sans format) */}
                        <p
                          className="text-base sm:text-lg font-sans font-medium text-signal leading-relaxed italic pr-4 selection:bg-portal/20 select-text transition-all duration-150"
                          style={{ filter: isRolling ? 'blur(1.5px)' : 'none' }}
                        >
                          "{currentQuote.quote}"
                        </p>
                      </div>

                      {/* Author (Noto Serif Format) */}
                      <p className="text-xs font-serif text-neutral-400 mt-5 self-end text-right">
                        — <span className="text-neutral-300 font-semibold">{currentQuote.author}</span>
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Divination Action Controls */}
                <div className="flex flex-col gap-3">
                  {/* UNIFIED DESIGNER DAO INSIGHTS BUTTON */}
                  <button
                    type="button"
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={seekDaoInsights}
                    disabled={isRolling || isAiGenerating}
                    className="w-full px-5 py-3 bg-portal/5 border border-portal/40 hover:border-portal text-portal shadow-[0_0_20px_rgba(4,172,255,0.15)] hover:bg-portal/10 disabled:opacity-50 hover:text-signal rounded-xl font-sans text-sm flex items-center justify-center space-x-2.5 font-bold tracking-wider uppercase transition-all duration-300 transform active:scale-[0.98]"
                    title="Channel cosmic energy from the Dao to seek divine insights and fortune!"
                  >
                    <motion.div
                      animate={{ rotate: isRolling ? 1080 : 0 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                      className="flex items-center justify-center shrink-0"
                    >
                      <Sparkles size={16} className={isRolling ? "text-portal text-portal" : "text-portal group-hover:text-signal"} />
                    </motion.div>
                    <span>
                      {isAiGenerating ? 'Invoking the Dao...' : isRolling ? 'Divine Tuning...' : 'Seek Dao Insights'}
                    </span>
                  </button>
                </div>


              </motion.div>
              </FocusLock>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

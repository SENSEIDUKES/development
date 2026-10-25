import FocusLock from 'react-focus-lock';
import { useHeaderClipboard } from '../mainLibraryClipboard';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkPlus, Check, ChevronLeft, Compass, Copy, Feather, Shuffle, Skull, Sparkle, Sparkles, Wand2, X } from 'lucide-react';
import { getStoryStyleLabel, STORY_SPARK_IDEA_MAX_LENGTH, storySparkTags, type StorySpark, type StorySparkRequest } from '@seihouse/sen/story-seed';
import { NarrativeTextArea as LibraryTextArea } from '@seihouse/sen/presentation';
import { GENRE_PATH_SIGILS, OriginGenrePicker } from '../../../story-seed/development/workspaces/origin/OriginGenrePicker';
import type { DaoSparkHost } from '../../shared/MainLibraryAdapter';
import { DAO_GENRES, handSpark } from './daoSparks';

/**
 * Dao Insights: a wandering elder's lost ramblings that are really story
 * sparks — a whole Origin for a Story Seed: premise, genre, title, novel
 * tradition and the Story Tags its premise calls for, written for Fate
 * Survival when the writer turns it on. The panel fits one phone screen. The spark leads the panel; below it the writer shapes the
 * next one. Random lets the Dao ramble a spark; Custom shapes the writer's own
 * rough beginning into a real premise. The genre is chosen with Story Seed's
 * own path picker: no path lets the Dao wander, a path or the writer's own
 * genre steers it, and Conjure asks it for a genre no list holds. A spark is
 * begun as a new Story Seed or kept in the Story Bank.
 *
 * The writing comes from the host (`DaoSparkHost`, a model behind the Story
 * Spark route). Without one the Dao offers its own hand-written sparks, and a
 * Custom beginning is kept exactly as written.
 */

type SparkMode = 'random' | 'custom';

const RECENT_LIMIT = 6;
const TICKER_MS = 14_000;
/** The muttering beat before a spark lands, so even a hand-written one arrives. */
const SETTLE_MS = 900;

const genreSigil = (genre: string, invented: boolean) => (invented ? Sparkles : GENRE_PATH_SIGILS[genre] ?? Sparkle);
const genreName = (genre: string) => DAO_GENRES.find(preset => preset.id === genre)?.name ?? genre;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DaoInsights: React.FC<{ host?: DaoSparkHost }> = ({ host }) => {
  const copyText = useHeaderClipboard();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SparkMode>('random');
  /** Empty: the Dao wanders any path. Otherwise a Story Seed path or the writer's own genre. */
  const [genre, setGenre] = useState('');
  const [conjuring, setConjuring] = useState(false);
  /** Story Paths open: the panel shows the paths in place of the spark. */
  const [pathsOpen, setPathsOpen] = useState(false);
  /** Ask for a Fate Survival spark: planted with Survival on. */
  const [survival, setSurvival] = useState(false);
  const [idea, setIdea] = useState('');
  const [spark, setSpark] = useState<StorySpark>(() => handSpark({}));
  /** The writer has sought a spark: the header stops turning over its own. */
  const [sought, setSought] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'note'; text: string } | null>(null);
  const [kept, setKept] = useState<StorySpark | null>(null);
  const [acting, setActing] = useState<'keep' | 'begin' | null>(null);
  const [copied, setCopied] = useState(false);

  const recentRef = useRef<string[]>([]);
  const mountedRef = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // Whether a model writes the sparks. Until it answers, the Dao's own are used.
  useEffect(() => {
    let cancelled = false;
    const check = host?.requestSpark ? host.checkSparks?.() ?? Promise.resolve(true) : Promise.resolve(false);
    check.then(value => { if (!cancelled) setConnected(value); }, () => { if (!cancelled) setConnected(false); });
    return () => { cancelled = true; };
  }, [host]);

  // While closed and before the writer seeks, the header turns over the Dao's own sparks.
  useEffect(() => {
    if (isOpen || sought) return;
    const interval = setInterval(() => setSpark(current => handSpark({}, current)), TICKER_MS);
    return () => clearInterval(interval);
  }, [isOpen, sought]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const remember = (next: StorySpark) => {
    recentRef.current = [next.premise, ...recentRef.current.filter(item => item !== next.premise)].slice(0, RECENT_LIMIT);
  };

  const seek = async () => {
    if (seeking) return;
    const beginning = idea.trim();
    if (mode === 'custom' && !beginning) {
      setMessage({ tone: 'error', text: 'Write the beginning of your idea first. A few words is enough.' });
      return;
    }
    const invent = conjuring;
    const chosen = genre.trim();
    const sparkGenre = invent ? undefined
      : chosen || DAO_GENRES[Math.floor(Math.random() * DAO_GENRES.length)].id;
    const custom = mode === 'custom' ? { idea: beginning } : {};
    const avoid = recentRef.current.length ? { avoid: recentRef.current } : {};
    const fate = survival ? { fateSurvival: true as const } : {};
    const request: StorySparkRequest = invent
      ? { inventGenre: true, ...custom, ...avoid, ...fate }
      : { genre: sparkGenre!, ...custom, ...avoid, ...fate };

    setSeeking(true);
    setPathsOpen(false);
    setMessage(null);
    setCopied(false);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    let next: StorySpark | null = null;
    let note: string | null = null;
    try {
      if (connected && host?.requestSpark) {
        try {
          [next] = await Promise.all([host.requestSpark(request, controller.signal), wait(SETTLE_MS)]);
        } catch (error) {
          if (controller.signal.aborted) return;
          const reason = error instanceof Error && error.message ? error.message : 'The Dao was silent. Seek again.';
          if (mode === 'custom') {
            if (mountedRef.current) setMessage({ tone: 'error', text: reason });
            return;
          }
          // A rambling never fails outright: an older spark surfaces instead.
          note = `${reason} An older spark surfaced instead.`;
        }
      } else {
        await wait(SETTLE_MS);
      }
      if (!mountedRef.current || controller.signal.aborted) return;
      if (!next) {
        const handWritten = handSpark(invent ? { inventGenre: true, survival } : { genre: sparkGenre, survival }, spark);
        // The writer's own genre has no hand-written sparks: the premise is borrowed, the genre kept.
        const fallback = !invent && handWritten.genre !== sparkGenre ? { ...handWritten, genre: sparkGenre! } : handWritten;
        next = mode === 'custom'
          ? { ...fallback, premise: beginning.slice(0, 600), title: '', aside: 'The Dao is resting tonight. Your words stand as you wrote them.' }
          : fallback;
        if (mode === 'custom' && !note) note = 'No model is connected, so your beginning is kept as written.';
      }
      // Whoever wrote it, the spark is planted the way the writer asked.
      next = { ...next, survival };
      remember(next);
      setSpark(next);
      setSought(true);
      scrollRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
      if (note) setMessage({ tone: 'note', text: note });
    } finally {
      if (mountedRef.current && requestRef.current === controller) {
        requestRef.current = null;
        setSeeking(false);
      }
    }
  };

  const act = async (action: 'keep' | 'begin') => {
    const run = action === 'keep' ? host?.keepSpark : host?.beginSpark;
    if (!run || acting) return;
    setActing(action);
    setMessage(null);
    try {
      await run(spark);
      if (!mountedRef.current) return;
      if (action === 'keep') {
        setKept(spark);
        setMessage({ tone: 'note', text: 'Kept in your Story Bank. Open it from Create whenever the spark calls.' });
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      if (mountedRef.current) setMessage({ tone: 'error', text: error instanceof Error && error.message ? error.message : 'The spark could not be planted. Please try again.' });
    } finally {
      if (mountedRef.current) setActing(null);
    }
  };

  const copySpark = useCallback(async () => {
    try {
      await copyText([spark.title, spark.premise, `Genre: ${spark.genre}`, `Style: ${getStoryStyleLabel(spark.style)}`, spark.survival ? 'Fate Survival: on' : ''].filter(Boolean).join('\n'));
      if (!mountedRef.current) return;
      setCopied(true);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      if (mountedRef.current) setMessage({ tone: 'error', text: 'Could not copy the spark. Please try again.' });
    }
  }, [copyText, spark]);

  const chooseMode = (next: SparkMode) => { setMode(next); setMessage(null); };
  const chooseGenre = (next: string) => { setGenre(next); setConjuring(false); setMessage(null); };
  const toggleConjure = () => { setConjuring(current => !current); setMessage(null); };

  const sparkKey = `${spark.genre}\u0000${spark.premise}`;
  const isKept = kept === spark;
  const SparkSigil = genreSigil(spark.genre, spark.inventedGenre);
  const sparkTags = useMemo(() => storySparkTags(spark).slice(0, 3), [spark]);
  const sideAction = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(196,182,148,0.18)] bg-[rgba(11,14,30,0.6)] text-neutral-300 transition-colors hover:border-[rgba(205,178,113,0.45)] hover:text-signal disabled:opacity-60';

  return (
    <>
      {/* 1. The compact trigger: a spark turning over in the header or Home. */}
      <div
        id="dao-insights-header-center"
        onClick={() => setIsOpen(true)}
        className="dao-insights-trigger flex flex-col flex-1 min-w-0 items-center justify-center max-w-[220px] sm:max-w-[360px] xl:max-w-md mx-2 sm:mx-4 px-3 py-1 bg-[rgba(11,14,30,0.55)] border border-[rgba(196,182,148,0.14)] hover:border-[rgba(205,178,113,0.4)] hover:bg-[rgba(11,14,30,0.8)] rounded-xl transition-all duration-300 cursor-pointer select-none group text-center overflow-hidden h-10 sm:h-12"
        role="button" aria-haspopup="dialog" aria-expanded={isOpen} aria-label="Insights from the Dao: story sparks"
        title="Insights from the Dao — seek a spark for your next story" tabIndex={0}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setIsOpen(true); } }}
      >
        {/* One line at every width: phones read the short "Dao Insights". */}
        <div className="flex max-w-full min-w-0 items-center gap-1 mb-0.5 shrink-0 whitespace-nowrap">
          <Sparkles size={11} className="text-[#CDB271] shrink-0 group-hover:rotate-12 transition-transform" />
          <span className="truncate font-sc font-bold text-[8px] tracking-[0.18em] text-[#CDB271]/80 uppercase leading-none group-hover:text-[#E3C878] transition-colors">
            <span className="hidden min-[480px]:inline">Insights from the Dao</span>
            <span className="min-[480px]:hidden">Dao Insights</span>
          </span>
        </div>
        <div className="w-full relative h-[18px] overflow-hidden flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p key={sparkKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex w-full items-center justify-center gap-1 text-[11px] font-serif font-medium text-signal italic px-1">
              <SparkSigil size={11} aria-hidden="true" className="shrink-0 text-[#A78BFA]" />
              <span className="truncate">{spark.premise}</span>
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* 2. The spark panel: a bottom sheet on phones, a centered card above. It
          fits one phone screen: the spark, the few choices that shape the next
          one, and the actions, with the Story Paths opening in the spark's place. */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div key="dao-overlay-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 selection:bg-portal/20">
              <div className="absolute inset-0 bg-[rgba(2,3,10,0.86)] backdrop-blur-md" onClick={() => setIsOpen(false)} aria-hidden="true" />
              <FocusLock returnFocus className="contents">
                <motion.div role="dialog" aria-modal="true" aria-label="Dao Insights"
                  initial={{ y: 32, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="library-header-dialog dao-spark-panel seed-field-scope relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] sm:rounded-3xl border border-[rgba(196,182,148,0.16)] text-left font-sans max-h-[94dvh] sm:max-h-[90vh]">
                  <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-human via-portal to-gold-accent" aria-hidden="true" />

                  {/* Header: a grab bar on phones, then sigil, title and close in one row. */}
                  <div className="relative shrink-0 px-4 pt-2 pb-2 sm:px-6 sm:pt-4">
                    <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgba(205,178,113,0.4)] bg-[rgba(205,178,113,0.08)] text-[#CDB271] shadow-[0_0_14px_rgba(205,178,113,0.18)]">
                        <motion.div animate={{ rotate: seeking ? 720 : 0 }} transition={{ duration: seeking ? 1.2 : 0.4, ease: 'easeInOut', repeat: seeking ? Infinity : 0 }}>
                          <Compass size={17} />
                        </motion.div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-lg font-bold uppercase tracking-[0.12em] text-signal leading-tight sm:text-xl">Dao Insights</h2>
                        <p className="dao-spark-subtitle hidden truncate text-xs text-neutral-400 sm:block">Lost ramblings of the Dao, each a story waiting to be told.</p>
                      </div>
                      <button type="button" onClick={() => setIsOpen(false)} aria-label="Close Dao Insights"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[rgba(196,182,148,0.18)] bg-[rgba(11,14,30,0.6)] text-neutral-300 hover:border-[rgba(205,178,113,0.45)] hover:text-signal transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div ref={scrollRef} data-dao-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1 sm:px-6 space-y-3">
                    {pathsOpen ? (
                      /* Story Paths in the spark's place, so the grid never stacks under it. */
                      <div className="space-y-3">
                        <button type="button" onClick={() => setPathsOpen(false)}
                          className="inline-flex h-11 items-center gap-1.5 font-sc text-[11px] font-bold uppercase tracking-[0.16em] text-[#CDB271] hover:text-[#E3C878]">
                          <ChevronLeft size={15} aria-hidden="true" />Back to the spark
                        </button>
                        <OriginGenrePicker idPrefix="dao" genre={genre} onChange={chooseGenre} required={false} compact
                          open onOpenChange={setPathsOpen} onSelectPath={() => setPathsOpen(false)}
                          emptyTitle="Any path" emptyHint="The Dao wanders wherever it likes"
                          conjure={{ active: conjuring, onSelect: toggleConjure, title: 'Let the Dao conjure one', hint: 'A genre no list holds, and a story only it could tell.' }} />
                      </div>
                    ) : <>
                      {/* The spark leads: it is what the writer came for. */}
                      <section aria-label="Story spark" aria-live="polite" aria-busy={seeking}
                        data-seeking={seeking || undefined}
                        className="dao-spark-scroll relative overflow-hidden rounded-2xl border border-[rgba(205,178,113,0.22)] p-4 sm:p-5">
                        <AnimatePresence mode="wait">
                          <motion.div key={sparkKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: seeking ? 0.35 : 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[rgba(167,139,250,0.45)] bg-[rgba(167,139,250,0.1)] py-0.5 pl-0.5 pr-2.5">
                                <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-[rgba(167,139,250,0.18)]">
                                  <SparkSigil size={11} className="text-[#C4B5FD]" />
                                </span>
                                <span className="truncate font-sc text-[10px] font-bold uppercase tracking-[0.12em] text-signal">{genreName(spark.genre)}</span>
                              </span>
                              {spark.inventedGenre && <span className="font-sc text-[10px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]">Conjured genre</span>}
                              {spark.survival && <span className="inline-flex items-center gap-1 font-sc text-[10px] font-bold uppercase tracking-[0.16em] text-[#F87171]"><Skull size={11} aria-hidden="true" />Fate Survival</span>}
                            </div>
                            {spark.title && <h3 className="mt-2.5 font-display text-base font-bold uppercase tracking-[0.08em] text-[#E3C878] leading-snug">{spark.title}</h3>}
                            <p className={`${spark.title ? 'mt-1' : 'mt-2.5'} ${mode === 'custom' ? 'line-clamp-3' : 'line-clamp-5'} select-text font-serif text-[15px] leading-relaxed text-[#F3EDE0]`}>{spark.premise}</p>
                            {spark.genreNote && <p className="mt-1.5 line-clamp-2 text-xs text-neutral-400">{spark.genreNote}</p>}

                            {/* The rest of the Origin this spark plants, on one line. */}
                            <p className="mt-2 truncate text-xs text-[#CDB271]" aria-label="Origin this spark plants">
                              {[`${getStoryStyleLabel(spark.style)} tradition`, ...sparkTags].join(' · ')}
                            </p>
                            {/* The aside gives way to the writer's beginning, and on short screens. */}
                            {(spark.aside || spark.voice) && mode !== 'custom' && (
                              <p className="dao-spark-aside mt-2 line-clamp-2 border-t border-[rgba(205,178,113,0.14)] pt-2 text-xs leading-relaxed text-neutral-400">
                                {spark.aside && <span className="italic">“{spark.aside}”</span>}
                                {spark.voice && <span className="font-sc font-bold text-[#CDB271]/80"> — {spark.voice}</span>}
                              </p>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </section>

                      {message && <p role={message.tone === 'error' ? 'alert' : 'status'}
                        className={`rounded-lg border px-3 py-2 text-xs ${message.tone === 'error' ? 'border-red-500/30 bg-red-500/5 text-red-300' : 'border-[rgba(205,178,113,0.25)] bg-[rgba(205,178,113,0.05)] text-[#E3C878]'}`}>{message.text}</p>}

                      {/* Shape the next spark: mode and Survival in one row, then the path. */}
                      <div className="flex items-stretch gap-2">
                        <div role="group" aria-label="Spark mode" className="grid flex-1 grid-cols-2 gap-1 rounded-xl border border-[rgba(196,182,148,0.15)] bg-[rgba(11,14,30,0.6)] p-1">
                          {([
                            ['random', Shuffle, 'Random', 'The Dao rambles'],
                            ['custom', Feather, 'Custom', 'Shape your own idea'],
                          ] as const).map(([value, Icon, label, hint]) => {
                            const selected = mode === value;
                            return (
                              <button key={value} type="button" aria-pressed={selected} onClick={() => chooseMode(value)} title={hint}
                                className={`flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg font-sc text-[11px] font-bold uppercase tracking-[0.06em] min-[360px]:gap-1.5 min-[360px]:tracking-[0.14em] transition-all ${selected
                                  ? 'border border-[rgba(167,139,250,0.45)] bg-[rgba(167,139,250,0.12)] text-signal'
                                  : 'border border-transparent text-neutral-400 hover:text-neutral-200'}`}>
                                <Icon size={13} aria-hidden="true" />{label}
                              </button>
                            );
                          })}
                        </div>
                        <button type="button" role="switch" aria-checked={survival} aria-label="Fate Survival"
                          title={survival
                            ? 'Fate Survival on: you direct every chapter, and death is possible.'
                            : 'Fate Survival off: fate guides each chapter. Turn on for a spark where survival is at stake.'}
                          onClick={() => { setSurvival(current => !current); setMessage(null); }}
                          className={`flex shrink-0 items-center gap-2 rounded-xl border px-2.5 transition-colors ${survival ? 'border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.08)] text-[#FCA5A5]' : 'border-[rgba(196,182,148,0.15)] bg-[rgba(11,14,30,0.6)] text-neutral-400'}`}>
                          <span className="flex flex-col items-start leading-none">
                            <span className="font-sc text-[9px] font-bold uppercase tracking-[0.14em]">Fate</span>
                            <span className="font-sc text-[11px] font-bold uppercase tracking-[0.1em]">Survival</span>
                          </span>
                          <span aria-hidden="true" className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${survival ? 'border-red-400/60 bg-red-400/50' : 'border-neutral-700 bg-neutral-800'}`}>
                            <span className={`ml-0.5 size-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${survival ? 'translate-x-4' : 'translate-x-0'}`} />
                          </span>
                        </button>
                      </div>

                      {/* The genre: Story Seed's own path picker, one line until opened. */}
                      <OriginGenrePicker idPrefix="dao" genre={genre} onChange={chooseGenre} required={false} compact
                        open={false} onOpenChange={setPathsOpen}
                        emptyTitle="Any path" emptyHint="The Dao wanders wherever it likes"
                        conjure={{ active: conjuring, onSelect: toggleConjure, title: 'Let the Dao conjure one', hint: 'A genre no list holds, and a story only it could tell.' }} />

                      {/* Custom: the writer's own beginning */}
                      {mode === 'custom' && (
                        <LibraryTextArea id="dao-spark-beginning" aria-label="Your beginning" size="compact"
                          value={idea} maxLength={STORY_SPARK_IDEA_MAX_LENGTH} rows={2}
                          onChange={value => { setIdea(value); if (message?.tone === 'error') setMessage(null); }}
                          placeholder="Your beginning: a girl who can hear swords… whatever you have so far." />
                      )}
                    </>}
                  </div>

                  {/* Seek and what to do with the spark, in one row within the thumb's reach. */}
                  <div className="flex shrink-0 items-center gap-2 border-t border-[rgba(196,182,148,0.12)] bg-[rgba(5,7,16,0.92)] px-4 pt-2.5 sm:px-6 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                    <button type="button" onClick={seek} disabled={seeking}
                      className="dao-seek-button flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(205,178,113,0.5)] px-3 font-sc text-[13px] font-bold uppercase tracking-[0.12em] text-[#F3E3B5] transition-all hover:border-[#E3C878] hover:text-white active:scale-[0.98] disabled:opacity-60">
                      <motion.span animate={{ rotate: seeking ? 360 : 0 }} transition={{ duration: 1.2, ease: 'linear', repeat: seeking ? Infinity : 0 }} className="flex shrink-0">
                        {mode === 'custom' ? <Wand2 size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                      </motion.span>
                      <span className="truncate">{seeking ? 'Muttering…' : mode === 'custom'
                        ? <>Shape<span className="sr-only min-[420px]:not-sr-only"> my premise</span></>
                        : <>Seek<span className="sr-only min-[420px]:not-sr-only"> a spark</span></>}</span>
                    </button>
                    {host?.beginSpark && (
                      <button type="button" onClick={() => act('begin')} disabled={seeking || acting !== null}
                        className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-portal px-3 text-sm font-bold text-black shadow-[0_0_18px_rgba(4,172,255,0.25)] transition-opacity hover:opacity-90 disabled:opacity-50">
                        <Feather size={15} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{acting === 'begin' ? 'Planting…' : <>Begin<span className="sr-only min-[420px]:not-sr-only"> this story</span></>}</span>
                      </button>
                    )}
                    {host?.keepSpark && (
                      <button type="button" onClick={() => act('keep')} disabled={seeking || acting !== null || isKept}
                        aria-label={isKept ? 'Kept in your Story Bank' : 'Keep in Story Bank'} title={isKept ? 'Kept in your Story Bank' : 'Keep in Story Bank'}
                        className={sideAction}>
                        {isKept ? <Check size={16} className="text-emerald-400" aria-hidden="true" /> : <BookmarkPlus size={16} aria-hidden="true" />}
                      </button>
                    )}
                    <button type="button" onClick={copySpark} aria-label={copied ? 'Spark copied' : 'Copy spark'} title="Copy the spark's Origin"
                      className={sideAction}>
                      {copied ? <Check size={16} className="text-emerald-400" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </motion.div>
              </FocusLock>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

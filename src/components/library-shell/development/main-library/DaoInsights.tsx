import FocusLock from 'react-focus-lock';
import { useHeaderClipboard } from '../mainLibraryClipboard';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkPlus, Check, Compass, Copy, Feather, Shuffle, Sparkles, Wand2, X } from 'lucide-react';
import { STORY_SPARK_IDEA_MAX_LENGTH, type StorySpark, type StorySparkRequest } from '@seihouse/sen/story-seed';
import type { DaoSparkHost } from '../../shared/MainLibraryAdapter';
import { DAO_GENRES, handSpark } from './daoSparks';

/**
 * Dao Insights: a wandering elder's lost ramblings that are really story
 * sparks — a premise and a genre, enough direction to start a Story Seed and
 * nothing more. The genre comes first. Random lets the Dao ramble a spark in
 * it; Custom shapes the writer's own rough beginning into a real premise in
 * it. A spark is begun as a new Story Seed or kept in the Story Bank.
 *
 * The writing comes from the host (`DaoSparkHost`, a model behind the Story
 * Spark route). Without one the Dao offers its own hand-written sparks, and a
 * Custom beginning is kept exactly as written.
 */

type SparkMode = 'random' | 'custom';
/** `any` rolls one of the genres; `invent` conjures one no list holds. */
type GenreChoice = 'any' | 'invent' | string;

const RECENT_LIMIT = 6;
const TICKER_MS = 14_000;
/** The muttering beat before a spark lands, so even a hand-written one arrives. */
const SETTLE_MS = 900;

const genreIcon = (genre: string, invented: boolean) =>
  invented ? '✨' : DAO_GENRES.find(preset => preset.id === genre)?.icon ?? '📜';
const genreName = (genre: string) => DAO_GENRES.find(preset => preset.id === genre)?.name ?? genre;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DaoInsights: React.FC<{ host?: DaoSparkHost }> = ({ host }) => {
  const copyText = useHeaderClipboard();
  const ideaId = useId();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SparkMode>('random');
  const [genreChoice, setGenreChoice] = useState<GenreChoice>('any');
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
    const invent = genreChoice === 'invent';
    const genre = invent ? undefined
      : genreChoice === 'any' ? DAO_GENRES[Math.floor(Math.random() * DAO_GENRES.length)].id : genreChoice;
    const custom = mode === 'custom' ? { idea: beginning } : {};
    const avoid = recentRef.current.length ? { avoid: recentRef.current } : {};
    const request: StorySparkRequest = invent ? { inventGenre: true, ...custom, ...avoid } : { genre: genre!, ...custom, ...avoid };

    setSeeking(true);
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
        const fallback = handSpark(invent ? { inventGenre: true } : { genre }, spark);
        next = mode === 'custom'
          ? { ...fallback, premise: beginning.slice(0, 600), aside: 'The Dao is resting tonight. Your words stand as you wrote them.' }
          : fallback;
        if (mode === 'custom' && !note) note = 'No model is connected, so your beginning is kept as written.';
      }
      remember(next);
      setSpark(next);
      setSought(true);
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
      await copyText(`${spark.premise}\nGenre: ${spark.genre}`);
      if (!mountedRef.current) return;
      setCopied(true);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      if (mountedRef.current) setMessage({ tone: 'error', text: 'Could not copy the spark. Please try again.' });
    }
  }, [copyText, spark]);

  const chooseMode = (next: SparkMode) => { setMode(next); setMessage(null); };
  const chooseGenre = (next: GenreChoice) => { setGenreChoice(next); setMessage(null); };

  const sparkKey = `${spark.genre}\u0000${spark.premise}`;
  const isKept = kept === spark;
  const seekLabel = seeking ? 'The Dao is muttering…' : mode === 'custom' ? 'Shape my premise' : 'Seek a spark';

  const genreChip = (choice: GenreChoice, icon: string, label: string) => {
    const selected = genreChoice === choice;
    return <button key={choice} type="button" aria-pressed={selected} onClick={() => chooseGenre(choice)}
      className={`dao-genre-chip shrink-0 snap-start inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-sans transition-colors ${selected
        ? 'border-portal bg-portal/10 text-signal shadow-[0_0_10px_rgba(4,172,255,0.15)]'
        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'}`}>
      <span aria-hidden="true">{icon}</span>{label}
    </button>;
  };

  return (
    <>
      {/* 1. The compact trigger: a spark turning over in the header or Home. */}
      <div
        id="dao-insights-header-center"
        onClick={() => setIsOpen(true)}
        className="dao-insights-trigger flex flex-col flex-1 min-w-0 items-center justify-center max-w-[220px] sm:max-w-[360px] xl:max-w-md mx-2 sm:mx-4 px-3 py-1 bg-neutral-950/40 border border-neutral-900 hover:border-portal/30 hover:bg-neutral-950/70 rounded-xl transition-all duration-300 cursor-pointer select-none group text-center overflow-hidden h-10 sm:h-12"
        role="button" aria-haspopup="dialog" aria-expanded={isOpen} aria-label="Insights from the Dao: story sparks"
        title="Insights from the Dao — seek a spark for your next story" tabIndex={0}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setIsOpen(true); } }}
      >
        <div className="flex items-center space-x-1 mb-0.5 shrink-0">
          <Sparkles size={11} className="text-portal shrink-0 group-hover:rotate-12 transition-transform" />
          <span className="font-sc font-bold text-[8px] tracking-[0.18em] text-neutral-500 uppercase leading-none group-hover:text-portal transition-colors">
            Insights from the Dao
          </span>
        </div>
        <div className="w-full relative h-[18px] overflow-hidden flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p key={sparkKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-[11px] font-sans font-medium text-signal truncate w-full italic px-1">
              {genreIcon(spark.genre, spark.inventedGenre)} {spark.premise}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* 2. The spark panel: a bottom sheet on phones, a centered card above. */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div key="dao-overlay-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 selection:bg-portal/20">
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsOpen(false)} aria-hidden="true" />
              <FocusLock returnFocus className="contents">
                <motion.div role="dialog" aria-modal="true" aria-label="Dao Insights"
                  initial={{ y: 24, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="library-header-dialog dao-spark-panel relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-neutral-900 bg-[#000000] text-left font-sans shadow-[0_0_60px_rgba(4,172,255,0.18)] max-h-[92dvh] sm:max-h-[88vh]">
                  <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-human via-portal to-gold-accent" aria-hidden="true" />

                  {/* Header: icon, one-line title and the close control in one row, so nothing overlaps. */}
                  <div className="flex items-center gap-3 border-b border-neutral-900 px-4 pt-5 pb-4 sm:px-6">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-portal">
                      <motion.div animate={{ rotate: seeking ? 720 : 0 }} transition={{ duration: seeking ? 1.2 : 0.4, ease: 'easeInOut', repeat: seeking ? Infinity : 0 }}>
                        <Compass size={20} />
                      </motion.div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-signal leading-tight">Dao Insights</h2>
                      <p className="mt-0.5 text-[11px] text-neutral-500 leading-snug">Lost ramblings of the Dao. Listen closely: each one is a story waiting to be told.</p>
                    </div>
                    <button type="button" onClick={() => setIsOpen(false)} aria-label="Close Dao Insights"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400 hover:bg-neutral-900 hover:text-signal transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 space-y-5">
                    {/* Mode */}
                    <div role="group" aria-label="Spark mode" className="grid grid-cols-2 gap-1 rounded-xl border border-neutral-900 bg-neutral-950 p-1">
                      {([
                        ['random', Shuffle, 'Random', 'The Dao rambles'],
                        ['custom', Feather, 'Custom', 'Shape your idea'],
                      ] as const).map(([value, Icon, label, hint]) => (
                        <button key={value} type="button" aria-pressed={mode === value} onClick={() => chooseMode(value)}
                          className={`flex flex-col items-center justify-center rounded-lg px-2 py-1.5 transition-colors ${mode === value ? 'bg-neutral-800 text-signal' : 'text-neutral-500 hover:text-neutral-200'}`}>
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"><Icon size={13} aria-hidden="true" />{label}</span>
                          <span className="text-[10px] text-neutral-500">{hint}</span>
                        </button>
                      ))}
                    </div>

                    {/* Genre first */}
                    <fieldset>
                      <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Choose a genre</legend>
                      <div className="dao-genre-row -mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                        {genreChip('any', '🎲', 'Any genre')}
                        {DAO_GENRES.map(preset => genreChip(preset.id, preset.icon, preset.name))}
                        {genreChip('invent', '✨', 'Conjure a genre')}
                      </div>
                      {genreChoice === 'invent' && <p className="mt-2 text-[11px] text-neutral-500">The Dao invents a genre no list holds, and a story only it could tell.</p>}
                    </fieldset>

                    {/* Custom: the writer's own beginning */}
                    {mode === 'custom' && (
                      <div>
                        <label htmlFor={ideaId} className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Your beginning</label>
                        <textarea id={ideaId} value={idea} maxLength={STORY_SPARK_IDEA_MAX_LENGTH} rows={3}
                          onChange={event => { setIdea(event.target.value); if (message?.tone === 'error') setMessage(null); }}
                          placeholder="A girl who can hear swords… a sect that runs a noodle shop… whatever you have so far."
                          className="w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-signal placeholder:text-neutral-600 focus:border-portal focus:outline-none" />
                        <p className="mt-1 text-[11px] text-neutral-500">The Dao shapes it into a real premise in your genre, and keeps your idea.</p>
                      </div>
                    )}

                    <button type="button" onClick={seek} disabled={seeking}
                      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-portal/40 bg-portal/5 px-5 py-3 text-sm font-bold uppercase tracking-wider text-portal shadow-[0_0_20px_rgba(4,172,255,0.15)] transition-all hover:border-portal hover:bg-portal/10 hover:text-signal active:scale-[0.98] disabled:opacity-60">
                      <motion.span animate={{ rotate: seeking ? 360 : 0 }} transition={{ duration: 1.2, ease: 'linear', repeat: seeking ? Infinity : 0 }} className="flex">
                        {mode === 'custom' ? <Wand2 size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                      </motion.span>
                      <span>{seekLabel}</span>
                    </button>

                    {message && <p role={message.tone === 'error' ? 'alert' : 'status'}
                      className={`text-xs ${message.tone === 'error' ? 'text-red-400' : 'text-portal'}`}>{message.text}</p>}

                    {/* The spark */}
                    <section aria-label="Story spark" aria-live="polite" aria-busy={seeking}
                      className="relative overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950 p-4 sm:p-5">
                      <AnimatePresence mode="wait">
                        <motion.div key={sparkKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: seeking ? 0.35 : 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-portal/30 bg-portal/10 px-2.5 py-1 text-[11px] font-semibold text-portal">
                              <span aria-hidden="true">{genreIcon(spark.genre, spark.inventedGenre)}</span>{genreName(spark.genre)}
                            </span>
                            {spark.inventedGenre && <span className="text-[10px] font-bold uppercase tracking-widest text-gold-accent">Conjured genre</span>}
                          </div>
                          {spark.genreNote && <p className="mt-2 text-xs text-neutral-400">{spark.genreNote}</p>}
                          {spark.aside && <p className="mt-3 text-sm italic text-neutral-400 leading-relaxed">“{spark.aside}”</p>}
                          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Premise</p>
                          <p className="mt-1 select-text font-serif text-base sm:text-lg text-signal leading-relaxed">{spark.premise}</p>
                          {spark.voice && <p className="mt-4 text-right text-xs font-serif text-neutral-500">— <span className="font-semibold text-neutral-300">{spark.voice}</span></p>}
                        </motion.div>
                      </AnimatePresence>
                    </section>
                  </div>

                  {/* What to do with the spark */}
                  <div className="flex items-center gap-2 border-t border-neutral-900 bg-black px-4 py-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {host?.beginSpark && (
                      <button type="button" onClick={() => act('begin')} disabled={seeking || acting !== null}
                        className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-portal px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50">
                        <Feather size={15} aria-hidden="true" /><span className="truncate">{acting === 'begin' ? 'Planting…' : 'Begin this story'}</span>
                      </button>
                    )}
                    {host?.keepSpark && (
                      <button type="button" onClick={() => act('keep')} disabled={seeking || acting !== null || isKept}
                        aria-label={isKept ? 'Kept in your Story Bank' : 'Keep in Story Bank'} title={isKept ? 'Kept in your Story Bank' : 'Keep in Story Bank'}
                        className={`flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:border-neutral-700 hover:text-signal disabled:opacity-60 ${host.beginSpark ? '' : 'flex-1'}`}>
                        {isKept ? <Check size={15} className="text-emerald-400" aria-hidden="true" /> : <BookmarkPlus size={15} aria-hidden="true" />}
                        <span className={host.beginSpark ? 'hidden sm:inline' : ''}>{isKept ? 'Kept' : 'Keep'}</span>
                      </button>
                    )}
                    <button type="button" onClick={copySpark} aria-label={copied ? 'Spark copied' : 'Copy spark'} title="Copy the premise and genre"
                      className={`flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:border-neutral-700 hover:text-signal ${host?.beginSpark || host?.keepSpark ? '' : 'flex-1'}`}>
                      {copied ? <Check size={15} className="text-emerald-400" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                      <span className={host?.beginSpark || host?.keepSpark ? 'hidden sm:inline' : ''}>{copied ? 'Copied' : 'Copy'}</span>
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

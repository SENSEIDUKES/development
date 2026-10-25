import FocusLock from 'react-focus-lock';
import { useHeaderClipboard } from '../mainLibraryClipboard';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkPlus, Check, Compass, Copy, Feather, Shuffle, Sparkle, Sparkles, Wand2, X } from 'lucide-react';
import { getStoryStyleLabel, STORY_SPARK_IDEA_MAX_LENGTH, storySparkTags, type StorySpark, type StorySparkRequest } from '@seihouse/sen/story-seed';
import { NarrativeTextArea as LibraryTextArea } from '@seihouse/sen/presentation';
import { GENRE_PATH_SIGILS, OriginGenrePicker } from '../../../story-seed/development/workspaces/origin/OriginGenrePicker';
import type { DaoSparkHost } from '../../shared/MainLibraryAdapter';
import { DAO_GENRES, handSpark } from './daoSparks';

/**
 * Dao Insights: a wandering elder's lost ramblings that are really story
 * sparks — a whole Origin for a Story Seed: premise, genre, title, novel
 * tradition, Pressure and the Story Tags its premise calls for. The spark leads the panel; below it the writer shapes the
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
const PRESSURE_LABELS: Record<StorySpark['pressure'], string> = { heaven: 'Heaven', immortal: 'Immortal', mortal: 'Mortal' };
const genreName = (genre: string) => DAO_GENRES.find(preset => preset.id === genre)?.name ?? genre;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** The ornamental "✦ — title — ✦" heading Story Seed's path picker uses. */
const Ornament = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center gap-2.5">
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span className="h-px w-6 bg-gradient-to-r from-transparent to-[rgba(205,178,113,0.55)] sm:w-10" />
      <Sparkle size={9} className="text-[#CDB271]" />
    </span>
    <span className="whitespace-nowrap font-sc text-[11px] font-bold uppercase tracking-[0.22em] text-[#CDB271]">{children}</span>
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <Sparkle size={9} className="text-[#CDB271]" />
      <span className="h-px w-6 bg-gradient-to-l from-transparent to-[rgba(205,178,113,0.55)] sm:w-10" />
    </span>
  </div>
);

export const DaoInsights: React.FC<{ host?: DaoSparkHost }> = ({ host }) => {
  const copyText = useHeaderClipboard();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SparkMode>('random');
  /** Empty: the Dao wanders any path. Otherwise a Story Seed path or the writer's own genre. */
  const [genre, setGenre] = useState('');
  const [conjuring, setConjuring] = useState(false);
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
    const request: StorySparkRequest = invent ? { inventGenre: true, ...custom, ...avoid } : { genre: sparkGenre!, ...custom, ...avoid };

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
        const handWritten = handSpark(invent ? { inventGenre: true } : { genre: sparkGenre }, spark);
        // The writer's own genre has no hand-written sparks: the premise is borrowed, the genre kept.
        const fallback = !invent && handWritten.genre !== sparkGenre ? { ...handWritten, genre: sparkGenre! } : handWritten;
        next = mode === 'custom'
          ? { ...fallback, premise: beginning.slice(0, 600), title: '', aside: 'The Dao is resting tonight. Your words stand as you wrote them.' }
          : fallback;
        if (mode === 'custom' && !note) note = 'No model is connected, so your beginning is kept as written.';
      }
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
      await copyText([spark.title, spark.premise, `Genre: ${spark.genre}`, `Style: ${getStoryStyleLabel(spark.style)}`, `Pressure: ${PRESSURE_LABELS[spark.pressure]}`].filter(Boolean).join('\n'));
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
  const seekLabel = seeking ? 'The Dao is muttering…' : mode === 'custom' ? 'Shape my premise' : 'Seek a spark';
  const SparkSigil = genreSigil(spark.genre, spark.inventedGenre);
  const sparkTags = useMemo(() => storySparkTags(spark).slice(0, 5), [spark]);
  const sideAction = 'flex h-12 min-w-12 items-center justify-center gap-2 rounded-xl border border-[rgba(196,182,148,0.18)] bg-[rgba(11,14,30,0.6)] px-3 text-sm text-neutral-300 transition-colors hover:border-[rgba(205,178,113,0.45)] hover:text-signal disabled:opacity-60';

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
        <div className="flex items-center space-x-1 mb-0.5 shrink-0">
          <Sparkles size={11} className="text-[#CDB271] shrink-0 group-hover:rotate-12 transition-transform" />
          <span className="font-sc font-bold text-[8px] tracking-[0.18em] text-[#CDB271]/80 uppercase leading-none group-hover:text-[#E3C878] transition-colors">
            Insights from the Dao
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

      {/* 2. The spark panel: a bottom sheet on phones, a centered card above. */}
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
                  className="library-header-dialog dao-spark-panel seed-field-scope relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] sm:rounded-3xl border border-[rgba(196,182,148,0.16)] text-left font-sans max-h-[94dvh] sm:max-h-[90vh]">
                  <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-human via-portal to-gold-accent" aria-hidden="true" />

                  {/* Header: a grab bar on phones, then sigil, title and close in one row. */}
                  <div className="relative shrink-0 px-4 pt-2.5 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
                    <div aria-hidden="true" className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[rgba(205,178,113,0.4)] bg-[rgba(205,178,113,0.08)] text-[#CDB271] shadow-[0_0_18px_rgba(205,178,113,0.18)]">
                        <motion.div animate={{ rotate: seeking ? 720 : 0 }} transition={{ duration: seeking ? 1.2 : 0.4, ease: 'easeInOut', repeat: seeking ? Infinity : 0 }}>
                          <Compass size={20} />
                        </motion.div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-xl font-bold uppercase tracking-[0.12em] text-signal leading-tight sm:text-2xl">Dao Insights</h2>
                        <p className="dao-spark-subtitle mt-0.5 text-xs leading-snug text-neutral-400">Lost ramblings of the Dao, each a story waiting to be told.</p>
                      </div>
                      <button type="button" onClick={() => setIsOpen(false)} aria-label="Close Dao Insights"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[rgba(196,182,148,0.18)] bg-[rgba(11,14,30,0.6)] text-neutral-300 hover:border-[rgba(205,178,113,0.45)] hover:text-signal transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-6 space-y-5">
                    {/* The spark leads: it is what the writer came for. */}
                    <section aria-label="Story spark" aria-live="polite" aria-busy={seeking}
                      data-seeking={seeking || undefined}
                      className="dao-spark-scroll relative overflow-hidden rounded-2xl border border-[rgba(205,178,113,0.22)] px-5 py-6 sm:px-8 sm:py-8">
                      <AnimatePresence mode="wait">
                        <motion.div key={sparkKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: seeking ? 0.35 : 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(167,139,250,0.45)] bg-[rgba(167,139,250,0.1)] py-1 pl-1 pr-3 shadow-[0_0_12px_rgba(167,139,250,0.2)]">
                              <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-[rgba(167,139,250,0.18)]">
                                <SparkSigil size={13} className="text-[#C4B5FD]" />
                              </span>
                              <span className="font-sc text-[11px] font-bold uppercase tracking-[0.12em] text-signal">{genreName(spark.genre)}</span>
                            </span>
                            {spark.inventedGenre && <span className="font-sc text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Conjured genre</span>}
                          </div>
                          {spark.genreNote && <p className="mt-2 text-center text-sm text-neutral-400">{spark.genreNote}</p>}

                          {spark.title && <h3 className="mt-5 text-center font-display text-lg font-bold uppercase tracking-[0.1em] text-[#E3C878] sm:text-xl">{spark.title}</h3>}
                          <p className={`${spark.title ? 'mt-3' : 'mt-5'} select-text text-center font-serif text-[1.15rem] leading-[1.7] text-[#F3EDE0] sm:text-[1.3rem]`}>{spark.premise}</p>

                          {/* The rest of the Origin this spark plants. */}
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5" aria-label="Origin this spark plants">
                            <span className="dao-origin-chip">{getStoryStyleLabel(spark.style)} tradition</span>
                            <span className="dao-origin-chip">{PRESSURE_LABELS[spark.pressure]} pressure</span>
                            {sparkTags.map(tag => <span key={tag} className="dao-origin-chip dao-origin-chip-tag">{tag}</span>)}
                          </div>

                          {spark.aside && <>
                            <div aria-hidden="true" className="mx-auto my-5 h-px w-24 bg-gradient-to-r from-transparent via-[rgba(205,178,113,0.5)] to-transparent" />
                            <p className="text-center text-sm italic leading-relaxed text-neutral-400">“{spark.aside}”</p>
                          </>}
                          {spark.voice && <p className="mt-3 text-center font-sc text-[11px] font-bold uppercase tracking-[0.14em] text-[#CDB271]">— {spark.voice}</p>}
                        </motion.div>
                      </AnimatePresence>
                    </section>

                    {message && <p role={message.tone === 'error' ? 'alert' : 'status'}
                      className={`rounded-xl border px-3 py-2.5 text-sm ${message.tone === 'error' ? 'border-red-500/30 bg-red-500/5 text-red-300' : 'border-[rgba(205,178,113,0.25)] bg-[rgba(205,178,113,0.05)] text-[#E3C878]'}`}>{message.text}</p>}

                    {/* Shape the next spark */}
                    <div className="space-y-3">
                      <Ornament>Seek the next spark</Ornament>

                      <div role="group" aria-label="Spark mode" className="grid grid-cols-2 gap-1 rounded-2xl border border-[rgba(196,182,148,0.15)] bg-[rgba(11,14,30,0.6)] p-1">
                        {([
                          ['random', Shuffle, 'Random', 'The Dao rambles'],
                          ['custom', Feather, 'Custom', 'Shape your idea'],
                        ] as const).map(([value, Icon, label, hint]) => {
                          const selected = mode === value;
                          return (
                            <button key={value} type="button" aria-pressed={selected} onClick={() => chooseMode(value)}
                              className={`flex min-h-[3.5rem] flex-col items-center justify-center rounded-xl px-2 py-2 transition-all ${selected
                                ? 'border border-[rgba(167,139,250,0.45)] bg-[rgba(167,139,250,0.12)] text-signal shadow-[0_0_14px_rgba(167,139,250,0.2)]'
                                : 'border border-transparent text-neutral-400 hover:text-neutral-200'}`}>
                              <span className="flex items-center gap-1.5 font-sc text-xs font-bold uppercase tracking-[0.16em]"><Icon size={14} aria-hidden="true" />{label}</span>
                              <span className="mt-0.5 text-xs text-neutral-400">{hint}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* The genre: Story Seed's own path picker. */}
                      <OriginGenrePicker idPrefix="dao" genre={genre} onChange={chooseGenre} required={false}
                        emptyTitle="Any path" emptyHint="The Dao wanders wherever it likes — or pick a path"
                        conjure={{ active: conjuring, onSelect: toggleConjure, title: 'Let the Dao conjure one', hint: 'A genre no list holds, and a story only it could tell.' }} />

                      {/* Custom: the writer's own beginning */}
                      {mode === 'custom' && (
                        <section className="glass-panel p-4 sm:p-5">
                          <LibraryTextArea id="dao-spark-beginning" label="Your beginning" icon={Feather} size="compact"
                            value={idea} maxLength={STORY_SPARK_IDEA_MAX_LENGTH} rows={3}
                            onChange={value => { setIdea(value); if (message?.tone === 'error') setMessage(null); }}
                            placeholder="A girl who can hear swords… a sect that runs a noodle shop… whatever you have so far."
                            helpText="The Dao shapes it into a real premise in your genre, and keeps your idea." />
                        </section>
                      )}
                    </div>
                  </div>

                  {/* Seek, then what to do with the spark: always in reach of the thumb. */}
                  <div className="shrink-0 space-y-2 border-t border-[rgba(196,182,148,0.12)] bg-[rgba(5,7,16,0.92)] px-4 pt-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                    <button type="button" onClick={seek} disabled={seeking}
                      className="dao-seek-button flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[rgba(205,178,113,0.5)] px-5 font-sc text-sm font-bold uppercase tracking-[0.16em] text-[#F3E3B5] transition-all hover:border-[#E3C878] hover:text-white active:scale-[0.98] disabled:opacity-60">
                      <motion.span animate={{ rotate: seeking ? 360 : 0 }} transition={{ duration: 1.2, ease: 'linear', repeat: seeking ? Infinity : 0 }} className="flex">
                        {mode === 'custom' ? <Wand2 size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                      </motion.span>
                      <span>{seekLabel}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      {host?.beginSpark && (
                        <button type="button" onClick={() => act('begin')} disabled={seeking || acting !== null}
                          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-portal px-4 text-sm font-bold text-black shadow-[0_0_18px_rgba(4,172,255,0.25)] transition-opacity hover:opacity-90 disabled:opacity-50">
                          <Feather size={16} aria-hidden="true" /><span className="truncate">{acting === 'begin' ? 'Planting…' : 'Begin this story'}</span>
                        </button>
                      )}
                      {host?.keepSpark && (
                        <button type="button" onClick={() => act('keep')} disabled={seeking || acting !== null || isKept}
                          aria-label={isKept ? 'Kept in your Story Bank' : 'Keep in Story Bank'} title={isKept ? 'Kept in your Story Bank' : 'Keep in Story Bank'}
                          className={`${sideAction} ${host.beginSpark ? '' : 'flex-1'}`}>
                          {isKept ? <Check size={16} className="text-emerald-400" aria-hidden="true" /> : <BookmarkPlus size={16} aria-hidden="true" />}
                          <span className={host.beginSpark ? 'hidden min-[400px]:inline' : ''}>{isKept ? 'Kept' : 'Keep'}</span>
                        </button>
                      )}
                      <button type="button" onClick={copySpark} aria-label={copied ? 'Spark copied' : 'Copy spark'} title="Copy the spark's Origin"
                        className={`${sideAction} ${host?.beginSpark || host?.keepSpark ? '' : 'flex-1'}`}>
                        {copied ? <Check size={16} className="text-emerald-400" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                        <span className={host?.beginSpark || host?.keepSpark ? 'hidden min-[400px]:inline' : ''}>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
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

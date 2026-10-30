import FocusLock from 'react-focus-lock';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkPlus, ChevronDown, ChevronLeft, Shuffle, Sparkles, X } from 'lucide-react';
import { STORY_SPARK_IDEA_MAX_LENGTH, type StorySpark, type StorySparkRequest } from '../../story-seed/shared/storySpark';
import { CreationButton, NarrativeIcon, NarrativeTextArea } from '@seihouse/sen/presentation';
import { OriginGenrePicker } from './StoryGenrePicker';
import type { SparkHost, StorySparkUsage } from '../shared/SparkHost';
import { DAO_GENRES, handSpark } from '../shared/builtInSparks';

/**
 * Sparks: a beginning for a Story Seed. The title and premise lead; the
 * Origin metadata stays in the seed rather than filling the panel.
 * The panel fits one phone screen. Below the spark the writer shapes the
 * next one. Random lets the Dao ramble a spark; Custom shapes the writer's own
 * rough beginning into a real premise. The genre is chosen with Story Seed's
 * own path picker: no path lets the Dao wander, a path or the writer's own
 * genre steers it, and Conjure asks it for a genre no list holds. A spark is
 * begun as a new Story Seed or kept in the Story Bank. Inside a Story Seed
 * (`purpose="fill-seed"`) it is used to fill that seed's Origin instead.
 *
 * It opens from a spark icon button where writers create: the Creator Space
 * and Story Seed's Origin.
 *
 * The writing comes from the host (`SparkHost`, a model behind the Story
 * Spark route). Without one the Dao offers its own hand-written sparks, and a
 * Custom beginning is kept exactly as written.
 */

type SparkMode = 'random' | 'custom';

const RECENT_LIMIT = 6;
/** The muttering beat before a spark lands, so even a hand-written one arrives. */
const SETTLE_MS = 900;

const genreName = (genre: string) => DAO_GENRES.find(preset => preset.id === genre)?.name ?? genre;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const Sparks: React.FC<{
  host?: SparkHost;
  /** `new-seed`: Begin plants a new Story Seed. `fill-seed`: the spark fills the open seed's Origin. */
  purpose?: 'new-seed' | 'fill-seed';
}> = ({ host, purpose = 'new-seed' }) => {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SparkMode>('random');
  const [protagonistGender, setProtagonistGender] = useState<'any' | 'male' | 'female'>('any');
  /** Empty: the Dao wanders any path. Otherwise a Story Seed path or the writer's own genre. */
  const [genre, setGenre] = useState('');
  const [conjuring, setConjuring] = useState(false);
  /** Story Paths open: the panel shows the paths in place of the spark. */
  const [pathsOpen, setPathsOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [spark, setSpark] = useState<StorySpark>(() => handSpark({}));
  const [seeking, setSeeking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'note'; text: string } | null>(null);
  const [kept, setKept] = useState<StorySpark | null>(null);
  const [acting, setActing] = useState<'keep' | 'begin' | null>(null);
  const [usage, setUsage] = useState<StorySparkUsage>();
  const [statusRefresh, setStatusRefresh] = useState(0);
  const usageRevision = useRef(0);

  const recentRef = useRef<string[]>([]);
  const mountedRef = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  // Reopening (or refocusing) refreshes the existing server budget without spending it.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const revision = usageRevision.current;
    const check = host?.requestSpark ? host.checkSparks?.() ?? Promise.resolve(true) : Promise.resolve(false);
    check.then(value => {
      if (cancelled) return;
      setConnected(typeof value === 'boolean' ? value : value.configured);
      if (usageRevision.current === revision) setUsage(typeof value === 'boolean' ? undefined : value.usage);
    }, () => { if (!cancelled) { setConnected(false); setUsage(undefined); } });
    return () => { cancelled = true; };
  }, [host, isOpen, statusRefresh]);

  const resetsAt = usage && !usage.unlimited ? usage.resetsAt : null;
  useEffect(() => {
    if (!isOpen) return;
    const refresh = () => setStatusRefresh(value => value + 1);
    window.addEventListener('focus', refresh);
    const timer = resetsAt === null ? undefined : setTimeout(refresh, Math.max(0, resetsAt - Date.now()) + 100);
    return () => { window.removeEventListener('focus', refresh); clearTimeout(timer); };
  }, [isOpen, resetsAt]);

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
      // The beginning is written beside the spark: go back there to write it.
      setPathsOpen(false);
      setMessage({ tone: 'error', text: 'Write the beginning of your idea first. A few words is enough.' });
      return;
    }
    if (protagonistGender !== 'any' && (!connected || !host?.requestSpark)) {
      setMessage({ tone: 'error', text: 'Choosing a protagonist needs a connected model. Choose Any to browse the built-in sparks.' });
      return;
    }
    const invent = conjuring;
    const chosen = genre.trim();
    const sparkGenre = invent ? undefined
      : chosen || DAO_GENRES[Math.floor(Math.random() * DAO_GENRES.length)].id;
    const custom = {
      ...(mode === 'custom' ? { idea: beginning } : {}),
      ...(protagonistGender !== 'any' ? { protagonistGender } : {}),
    };
    const avoid = recentRef.current.length ? { avoid: recentRef.current } : {};
    const request: StorySparkRequest = invent
      ? { inventGenre: true, ...custom, ...avoid }
      : { genre: sparkGenre!, ...custom, ...avoid };

    setSeeking(true);
    setPathsOpen(false);
    setMessage(null);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    let next: StorySpark | null = null;
    let note: string | null = null;
    try {
      if (connected && host?.requestSpark) {
        try {
          [next] = await Promise.all([host.requestSpark(request, controller.signal, nextUsage => {
            usageRevision.current += 1;
            if (mountedRef.current && !controller.signal.aborted) setUsage(nextUsage);
          }), wait(SETTLE_MS)]);
        } catch (error) {
          if (controller.signal.aborted) return;
          const reason = error instanceof Error && error.message ? error.message : 'No spark arrived. Try again.';
          if (mode === 'custom' || protagonistGender !== 'any') {
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
          ? { ...fallback, premise: beginning.slice(0, 600), title: '', aside: 'Your words stand as you wrote them.' }
          : fallback;
        if (mode === 'custom' && !note) note = 'No model is connected, so your beginning is kept as written.';
      }
      remember(next);
      setSpark(next);
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
        setMessage({ tone: 'note', text: 'Spark saved.' });
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      if (mountedRef.current) setMessage({ tone: 'error', text: error instanceof Error && error.message ? error.message : 'The spark could not be saved. Please try again.' });
    } finally {
      if (mountedRef.current) setActing(null);
    }
  };

  const chooseMode = (next: SparkMode) => { setMode(next); setMessage(null); };
  const chooseGenre = (next: string) => { setGenre(next); setConjuring(false); setMessage(null); };
  const toggleConjure = () => { setConjuring(current => !current); setMessage(null); };

  const sparkKey = `${spark.genre}\u0000${spark.premise}`;
  const isKept = kept === spark;
  /** What became of the last action. Shown in the spark and the Story Paths alike: the footer acts in both. */
  const feedback = message && <p role={message.tone === 'error' ? 'alert' : 'status'}
    className={`rounded-lg border px-3 py-2 text-xs ${message.tone === 'error' ? 'border-red-500/30 bg-red-500/5 text-red-300' : 'border-[rgba(205,178,113,0.25)] bg-[rgba(205,178,113,0.05)] text-[#E3C878]'}`}>{message.text}</p>;
  const sideAction = 'dao-spark-control flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-60';

  return (
    <>
      {/* 1. The trigger: a spark icon where writers create. */}
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}
        className="dao-sparks-trigger dao-spark-control group inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full border px-3 transition-colors"
        aria-haspopup="dialog" aria-expanded={isOpen} aria-label="Sparks: story ideas" title="Sparks: seek a story idea">
        <Sparkles size={20} aria-hidden="true" className="shrink-0 transition-transform group-hover:rotate-12" />
        <span className="hidden font-sc text-[12px] font-bold uppercase tracking-[0.14em] sm:inline">Sparks</span>
      </button>

      {/* 2. The spark panel: a bottom sheet on phones, a centered card above. It
          fits one phone screen: the spark, the few choices that shape the next
          one, and the actions, with the Story Paths opening in the spark's place. */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div key="dao-overlay-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 selection:bg-portal/20">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} aria-hidden="true" />
              <FocusLock returnFocus className="contents">
                <motion.div role="dialog" aria-modal="true" aria-label="Sparks"
                  initial={{ y: 32, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  data-sen-spark="panel"
                  className="sen-spark-dialog dao-spark-panel relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] sm:rounded-3xl border border-[var(--spark-edge,#ffffff30)] text-start font-sans max-h-[94dvh] sm:max-h-[90vh]">

                  {/* Header: a grab bar on phones, then sigil, title and close in one row. */}
                  <div className="relative shrink-0 px-4 pt-2 pb-2 sm:px-6 sm:pt-4">
                    <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center text-[var(--spark-accent,#a5b4fc)]">
                        <motion.div animate={{ rotate: seeking ? 720 : 0 }} transition={{ duration: seeking ? 1.2 : 0.4, ease: 'easeInOut', repeat: seeking ? Infinity : 0 }}>
                          <Sparkles size={22} aria-hidden="true" />
                        </motion.div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-lg font-bold uppercase tracking-[0.12em] text-signal leading-tight sm:text-xl">Sparks</h2>
                      </div>
                      {usage && <span aria-label="Daily sparks" aria-live="polite"
                        title={usage.unlimited ? 'Owner access has no daily limit' : `Generated sparks remaining${usage.resetsAt ? `. Resets ${new Date(usage.resetsAt).toLocaleString()}` : ''}`}
                        className="shrink-0 text-[11px] tabular-nums text-[var(--spark-muted,#b8b8c2)]">
                        {usage.unlimited ? 'No daily limit' : `${usage.remaining} / ${usage.limit} left`}
                      </span>}
                      <button type="button" onClick={() => setIsOpen(false)} aria-label="Close Sparks"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-white/5 hover:text-signal transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div ref={scrollRef} data-dao-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1 sm:px-6 space-y-3">
                    {pathsOpen ? (
                      /* Story Paths in the spark's place, so the grid never stacks under it. */
                      <div className="space-y-3">
                        <button type="button" onClick={() => setPathsOpen(false)}
                          className="inline-flex h-11 items-center gap-1.5 font-sc text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--spark-accent,#a5b4fc)] hover:text-[#E3C878]">
                          <ChevronLeft size={15} aria-hidden="true" />Back to the spark
                        </button>
                        {feedback}
                        <OriginGenrePicker idPrefix="dao" genre={genre} onChange={chooseGenre} required={false} compact
                          open onOpenChange={setPathsOpen} onSelectPath={() => setPathsOpen(false)}
                          emptyTitle="Any genre" emptyHint="See where an idea takes you"
                          conjure={{ active: conjuring, onSelect: toggleConjure, title: 'Invent a genre', hint: 'Something familiar, something unexpected.' }} />
                      </div>
                    ) : <>
                      {/* The spark leads: it is what the writer came for. */}
                      <section aria-label="Story spark" aria-live="polite" aria-busy={seeking}
                        data-seeking={seeking || undefined}
                        data-sen-spark="premise"
                        className="dao-spark-scroll relative overflow-hidden rounded-2xl border border-[var(--spark-edge,#ffffff30)] p-4 sm:p-5">
                        <AnimatePresence mode="wait">
                          <motion.div key={sparkKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: seeking ? 0.35 : 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                            <p className="text-xs font-medium text-[var(--spark-accent,#a5b4fc)] break-words">{genreName(spark.genre)}</p>
                            {spark.title && <h3 className="mt-2 font-sans text-xl font-semibold text-[var(--spark-text,#fff)] leading-snug break-words">{spark.title}</h3>}
                            <p className="mt-2 select-text whitespace-pre-wrap break-words font-sans text-[17px] leading-relaxed text-[var(--spark-text,#fff)] sm:text-lg">{spark.premise}</p>
                            {spark.genreNote && <p className="mt-3 text-[13px] leading-relaxed text-[var(--spark-muted,#b8b8c2)] break-words">{spark.genreNote}</p>}
                          </motion.div>
                        </AnimatePresence>
                      </section>

                      {feedback}

                      {/* The next spark: mode and genre share a single compact row. */}
                      <div className="flex items-center gap-2">
                        <div role="group" aria-label="Spark mode" className="dao-spark-modes grid shrink-0 grid-cols-2 gap-0.5 rounded-xl p-1">
                          {([
                            ['random', Shuffle, 'Random', 'Find a new beginning'],
                            ['custom', Sparkles, 'Custom', 'Shape your own idea'],
                          ] as const).map(([value, Icon, label, hint]) => {
                            const selected = mode === value;
                            return (
                              <button key={value} type="button" aria-pressed={selected} onClick={() => chooseMode(value)} title={hint}
                                className="dao-spark-control flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors">
                                <Icon size={13} aria-hidden="true" className="hidden min-[360px]:block" />{label}
                              </button>
                            );
                          })}
                        </div>
                        <button type="button" onClick={() => setPathsOpen(true)} aria-expanded={false}
                          aria-label={`Genre: ${conjuring ? 'Invent a genre' : genre || 'Any genre'}. Pick a path`}
                          className="dao-spark-genre flex h-11 min-w-0 flex-1 items-center justify-end gap-1.5 rounded-lg px-2 text-xs text-neutral-300 hover:bg-white/5 hover:text-white">
                          <span className="truncate">{conjuring ? 'Invent a genre' : genre ? genreName(genre) : 'Any genre'}</span>
                          <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
                        </button>
                      </div>

                      <div role="group" aria-label="Protagonist gender" className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[var(--spark-muted,#b8b8c2)]">Protagonist</span>
                        <div className="flex gap-1">
                          {(['any', 'male', 'female'] as const).map(value => (
                            <button key={value} type="button" aria-pressed={protagonistGender === value} disabled={seeking}
                              onClick={() => { setProtagonistGender(value); setMessage(null); }}
                              className="dao-spark-control flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors disabled:opacity-60">
                              {value === 'any' ? 'Any' : value === 'male' ? 'Male' : 'Female'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom: the writer's own beginning */}
                      {mode === 'custom' && (
                        <NarrativeTextArea id="dao-spark-beginning" aria-label="Your beginning" size="compact"
                          value={idea} maxLength={STORY_SPARK_IDEA_MAX_LENGTH} rows={2}
                          onChange={value => { setIdea(value); if (message?.tone === 'error') setMessage(null); }}
                          placeholder="A flower that can cultivate… a few words is enough." />
                      )}
                    </>}
                  </div>

                  {purpose === 'fill-seed' && host?.beginSpark && <p data-spark-fill-note
                    className="dao-spark-actions shrink-0 border-t border-[var(--spark-edge,#ffffff30)] px-4 pt-2 text-[11px] leading-snug text-[var(--spark-muted,#b8b8c2)] sm:px-6">
                    Using a spark replaces this seed's premise, genre, tradition, Story Tags and Fate Survival, and its title when the spark has one.
                  </p>}
                  {/* Seek and what to do with the spark, in one row within the thumb's reach. */}
                  <div className="dao-spark-actions flex shrink-0 items-center gap-2 border-t border-[var(--spark-edge,#ffffff30)] px-4 pt-2.5 sm:px-6 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
                    <button type="button" onClick={seek} disabled={seeking}
                      className="dao-seek-button dao-spark-control flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-3 font-sc text-[13px] font-bold uppercase tracking-[0.12em] transition-all active:scale-[0.98] disabled:opacity-60">
                      <motion.span animate={{ rotate: seeking ? 360 : 0 }} transition={{ duration: 1.2, ease: 'linear', repeat: seeking ? Infinity : 0 }} className="hidden shrink-0 min-[360px]:flex">
                        <NarrativeIcon name="spark" size={19} aria-hidden="true" />
                      </motion.span>
                      <span className="truncate">{seeking ? 'Creating…' : mode === 'custom'
                        ? <>Shape<span className="sr-only min-[420px]:not-sr-only"> my premise</span></>
                        : <>Seek<span className="sr-only min-[420px]:not-sr-only"> a spark</span></>}</span>
                    </button>
                    {host?.beginSpark && (
                      <CreationButton type="button" onClick={() => act('begin')} disabled={seeking || acting !== null}
                        data-sen-spark="use" className="dao-spark-use h-11 min-w-0 flex-1 rounded-xl px-3 text-sm">
                        <NarrativeIcon name="generating" size={18} aria-hidden="true" className="hidden shrink-0 min-[360px]:block" />
                        <span className="truncate">{acting === 'begin' ? (purpose === 'fill-seed' ? 'Filling…' : 'Opening…') : <>Use<span className="sr-only min-[420px]:not-sr-only"> this spark</span></>}</span>
                      </CreationButton>
                    )}
                    {host?.keepSpark && (
                      <button type="button" onClick={() => act('keep')} disabled={seeking || acting !== null || isKept}
                        aria-label={isKept ? 'Kept in your Story Bank' : 'Keep in Story Bank'} title={isKept ? 'Kept in your Story Bank' : 'Keep in Story Bank'}
                        className={sideAction}>
                        {isKept ? <NarrativeIcon name="save" size={18} className="text-emerald-400" aria-hidden="true" /> : <BookmarkPlus size={16} aria-hidden="true" />}
                      </button>
                    )}
                  </div>
                </motion.div>
              </FocusLock>
            </motion.div>
          )}
        </AnimatePresence>,
        // Keep the portal in its host look so saved accent and background tint inherit.
        triggerRef.current?.closest('[data-narrative-overlay-root]') ?? document.body,
      )}
    </>
  );
};

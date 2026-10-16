import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode, type Ref } from 'react';
import { SEIOverlayScrollbar, SEIPopover, SEIPopoverContent, SEIPopoverTitle, SEIPopoverTrigger } from '@seihouse/ui';
import { BookOpen, Check, ChevronLeft, ChevronRight, Compass, ListOrdered, LocateFixed, Pause, Play, RotateCcw, SkipBack, SkipForward, SlidersHorizontal, Zap } from 'lucide-react';
import { READ_ALOUD_RATES, type ReadAloud, type ReadAloudRole } from '@seihouse/sen/reader-runtime';
import { controlFeedback, pickerHeading, pickerList, pickerRow, pickerSelected, pickerSurface } from './readerPicker';

/** A saved chapter to open, or the story's next step at the newest chapter. */
export interface ReaderChapterStep {
  label: string;
  run: () => void;
  busy?: boolean;
  /** Shown but not yet available (Fate Survival: the chapter waits on Fate first). */
  disabled?: boolean;
}

/** Create mode, at the far right: the reader authors the newest chapter in place. */
export interface ReaderCreateStep {
  active: boolean;
  onToggle: () => void;
  /** Why it is closed: only the newest chapter, before the next is written, can be changed. */
  unavailable?: string;
}

/** Fate, between the chapter arrows. */
export interface ReaderFateStep {
  run: () => void;
  /** Fate Survival: closed until the reader reaches the chapter's last paragraph. */
  disabled?: boolean;
  /** Fate Survival: the next chapter waits on Fate, so it calls for the reader. */
  attention?: boolean;
}

const ROLE_LABELS: Record<ReadAloudRole, string> = { narrator: 'Narrator', protagonist: 'Protagonist', side: 'Side character' };
const RATE_LABELS: Readonly<Record<number, string>> = { 0.5: '½', 0.75: '¾', 1: '1', 1.25: '1¼', 1.5: '1½', 1.75: '1¾', 2: '2' };

const round = 'reader-glass-control inline-flex min-h-11 min-w-9 max-[380px]:min-w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-neutral-100 hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-11';
const mainAction = `inline-flex h-12 w-12 max-sm:h-14 max-sm:w-14 max-sm:flex-col max-sm:gap-1 shrink-0 items-center justify-center rounded-full max-sm:rounded-2xl border ${controlFeedback}`;
const primary = `reader-glass-primary ${mainAction} border-cyan-200/25 bg-cyan-400 text-neutral-950 hover:bg-cyan-300 active:bg-cyan-500`;
const secondary = `reader-glass-control ${mainAction} border-white/15 bg-white/10 text-neutral-100 hover:bg-white/15 active:bg-white/20`;
const controlPill = 'reader-glass-control inline-flex shrink-0 items-center justify-self-center rounded-full border border-white/10 bg-white/[0.025]';
const pillStep = `inline-flex h-11 min-w-11 items-center justify-center text-neutral-100 enabled:hover:bg-white/10 enabled:active:bg-white/15 disabled:opacity-35 ${controlFeedback}`;
const pickerTrigger = `inline-flex h-11 w-11 items-center justify-center rounded-md font-mono tabular-nums hover:bg-white/10 active:bg-white/15 disabled:opacity-35 ${controlFeedback}`;
// Fate (a compass) sits inside the chapter pill between its arrows, a plain step like them, so both pills match.
// When the next chapter waits on it, only its icon takes the portal's cyan.
const fateCalling = 'text-cyan-200';

const compactQuery = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(max-width: 639px)') : undefined;
const subscribeCompact = (change: () => void) => {
  const query = compactQuery();
  query?.addEventListener('change', change);
  return () => query?.removeEventListener('change', change);
};
const compactSnapshot = () => Boolean(compactQuery()?.matches);
const fullLayout = () => false;
const actionLabel = 'text-[10px] leading-none sm:sr-only';

function IconButton({ label, icon: Icon, onClick, disabled, className = round }: {
  label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; onClick: () => void; disabled?: boolean; className?: string;
}) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={className}>
    <Icon className="h-4 w-4" aria-hidden />
  </button>;
}

/**
 * The Reader frame's bottom bar, across the bottom of the screen, holds what
 * the reader acts with: Listen and sentence navigation on the left, Codex in
 * the middle, the chapter arrows with Fate (a compass) between them, and Create
 * mode (a lightning bolt) at the far right. Below 640px, Playback and Chapters
 * open compact popovers instead of squeezing their individual controls into the bar.
 * Wider screens expose both groups inline, with 44px targets. Back to narration floats above the left end
 * only when needed; the story audio note floats above the right. A
 * right-to-left story mirrors the bar: Listen at the right, the chapter arrows
 * pointing the way its pages turn. The sentence controls keep their
 * left-to-right order, as media controls do in every language. Where the
 * browser can't read aloud, Codex stays available and the skip controls are
 * disabled. The chapter list opens from the story and chapter in the top bar.
 */
export function ReaderBottomBar({ readAloud, onListen, offscreen, onBackToNarration, barRef, note, onOpenCodex, fate, create, previous, next, direction = 'ltr' }: {
  readAloud: ReadAloud;
  /** Starts reading where the reader is on the page. Absent before the story has a chapter. */
  onListen?: () => void;
  offscreen: boolean;
  onBackToNarration: () => void;
  barRef?: Ref<HTMLDivElement>;
  /** The story audio note (the soundtrack's mute), placed above the bar. */
  note?: ReactNode;
  onOpenCodex: () => void;
  fate: ReaderFateStep;
  /** Absent before the story has a chapter, or where the host cannot save one. */
  create?: ReaderCreateStep;
  previous?: ReaderChapterStep;
  next?: ReaderChapterStep;
  /** The chapter popover is portaled outside the frame and needs its reading direction. */
  direction?: 'ltr' | 'rtl';
}) {
  const [picker, setPicker] = useState<'speed'>();
  const compact = useSyncExternalStore(subscribeCompact, compactSnapshot, fullLayout);
  const [group, setGroup] = useState<'playback' | 'chapters'>();
  const chapterTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setPicker(undefined); setGroup(undefined); }, [compact]);
  const currentSpeedButton = useRef<HTMLButtonElement>(null);
  const { supported, status, line, notice } = readAloud;
  const listening = supported && status !== 'idle';
  const player = supported && (Boolean(onListen) || listening);
  const speaking = status === 'ended' ? 'End of chapter' : line ? line.speaker ?? ROLE_LABELS[line.role] : '';
  const playback = !player ? null
    : status === 'playing' ? { label: 'Pause', icon: Pause, run: readAloud.pause }
      : status === 'paused' ? { label: 'Resume', icon: Play, run: readAloud.resume }
        : status === 'ended' ? { label: 'Listen from the start', icon: RotateCcw, run: () => readAloud.play(0) }
          : onListen ? { label: 'Listen', icon: Play, run: onListen } : null;
  const PlaybackIcon = playback?.icon;
  const rateChoices = READ_ALOUD_RATES.map(rate => <button key={rate} type="button" ref={rate === readAloud.rate ? currentSpeedButton : undefined}
    aria-label={`Narration speed: ${rate}`} aria-pressed={rate === readAloud.rate}
    onClick={() => { setPicker(undefined); readAloud.setRate(rate); }}
    className={`${pickerRow} ${rate === readAloud.rate ? pickerSelected : 'text-neutral-300'}`}>
    <span className="flex-1 font-mono tabular-nums">{RATE_LABELS[rate]}</span>
    {rate === readAloud.rate && <Check className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden />}
  </button>);
  return <div ref={barRef} data-testid="reader-bottom-bar" role="region" aria-label="Reader controls"
    className="reader-glass reader-glass-bar sticky bottom-0 z-20 -mx-4 mt-8 border-t border-white/10 bg-neutral-950/90 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-[max(1rem,env(safe-area-inset-left))]">
    {listening && offscreen && <div className="absolute bottom-full start-4 mb-2" data-testid="back-to-narration-float">
      {/* A round glass button, like the story audio note floating on the other side. */}
      <button type="button" aria-label="Back to narration" title="Back to narration" onClick={onBackToNarration}
        className="reader-glass-float inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-100">
        <LocateFixed className="h-5 w-5" aria-hidden />
      </button>
    </div>}
    <div className="w-full" data-testid={player ? 'read-aloud-player' : undefined} data-status={player ? status : undefined}>
      {notice && <p role="status" className="absolute bottom-full left-4 right-4 mb-2 rounded-lg bg-neutral-950/95 p-2 text-center text-xs text-amber-200">{notice}</p>}
      {listening && <p className="sr-only" data-testid="read-aloud-speaker">{speaking}</p>}
      {/* Main actions anchor the edges and center; each pill centers in the space between them. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] min-h-[calc(3rem+0.75rem)] items-center gap-2 pt-3 max-[480px]:gap-1.5 max-[380px]:gap-1" data-testid="reader-controls-row">
        <div className="contents">
          {playback && PlaybackIcon
            ? <button type="button" aria-label={playback.label} title={playback.label} onClick={playback.run} data-testid="read-aloud-play" className={secondary}>
                <PlaybackIcon className="h-6 w-6" aria-hidden /><span className={actionLabel}>{status === 'ended' ? 'Replay' : playback.label}</span>
              </button>
            : <span className="h-12 w-12 max-sm:h-14 max-sm:w-14 shrink-0" aria-hidden />}
          {compact ? <SEIPopover open={group === 'playback'} onOpenChange={open => setGroup(open ? 'playback' : undefined)}>
            <SEIPopoverTrigger aria-label="Playback controls" className={`${secondary} justify-self-center`}>
              <SlidersHorizontal className="h-5 w-5" aria-hidden /><span className={actionLabel}>Playback</span>
            </SEIPopoverTrigger>
            <SEIPopoverContent side="top" align="start" collisionPadding={8} variant="dark" className={pickerSurface}>
              <SEIPopoverTitle className={pickerHeading}>Playback</SEIPopoverTitle>
              <div className="flex gap-2 p-1" dir="ltr">
                <button type="button" aria-label="Previous sentence" disabled={!player} onClick={() => readAloud.skip(-1)} className={`${pickerRow} disabled:opacity-35`}>
                  <SkipBack className="h-4 w-4 shrink-0" aria-hidden />Previous sentence
                </button>
                <button type="button" aria-label="Next sentence" disabled={!player || status === 'ended'} onClick={() => readAloud.skip(1)} className={`${pickerRow} disabled:opacity-35`}>
                  Next sentence<SkipForward className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              </div>
              <p className={pickerHeading}>Narration speed</p>
              <SEIOverlayScrollbar fades={false} className={`reader-scroll-region ${pickerList}`}>
                <fieldset disabled={!supported} className="m-0 grid grid-cols-3 gap-1 border-0 p-0 disabled:opacity-35" aria-label="Narration speed">{rateChoices}</fieldset>
              </SEIOverlayScrollbar>
            </SEIPopoverContent>
          </SEIPopover> : <div role="group" aria-label="Playback controls" className={controlPill} dir="ltr">
            <IconButton label="Previous sentence" icon={SkipBack} onClick={() => readAloud.skip(-1)} disabled={!player} className={`${pillStep} rounded-l-full`} />
            <SEIPopover open={picker === 'speed'} onOpenChange={open => setPicker(open ? 'speed' : undefined)}>
              <SEIPopoverTrigger aria-label="Narration playback speed" title={`Narration playback speed: ${readAloud.rate}×`} disabled={!supported} className={pickerTrigger}>
                {/* At normal speed a quiet divider; a changed speed shows itself. */}
                {readAloud.rate === 1
                  ? <span data-testid="reader-narration-speed" className="text-base font-semibold leading-none text-neutral-400">∶</span>
                  : <span data-testid="reader-narration-speed" className="text-sm font-semibold text-cyan-100">{RATE_LABELS[readAloud.rate] ?? readAloud.rate}</span>}
              </SEIPopoverTrigger>
              <SEIPopoverContent side="top" align="center" collisionPadding={8} variant="dark" initialFocus={currentSpeedButton}
                className={pickerSurface} data-testid="reader-speed-picker">
                <SEIPopoverTitle className={pickerHeading}>Narration speed</SEIPopoverTitle>
                <SEIOverlayScrollbar fades={false} className={`reader-scroll-region ${pickerList}`}>
                  {rateChoices}
                </SEIOverlayScrollbar>
              </SEIPopoverContent>
            </SEIPopover>
            <IconButton label="Next sentence" icon={SkipForward} onClick={() => readAloud.skip(1)} disabled={!player || status === 'ended'} className={`${pillStep} rounded-r-full`} />
          </div>}
        </div>
        <div className="flex shrink-0 justify-center">
          <button type="button" aria-label="Open Codex" title="Codex: the story's world" onClick={onOpenCodex} data-testid="reader-codex-button"
            className={primary}>
            <BookOpen className="h-6 w-6" aria-hidden /><span className={actionLabel}>Codex</span>
          </button>
        </div>
        <div className="contents">
        {compact ? <SEIPopover open={group === 'chapters'} onOpenChange={open => setGroup(open ? 'chapters' : undefined)}>
          <SEIPopoverTrigger render={<button type="button" ref={chapterTrigger} />} aria-label="Chapter controls" className={`${secondary} justify-self-center ${fate.attention ? fateCalling : ''}`}>
            <ListOrdered className="h-5 w-5" aria-hidden /><span className={actionLabel}>Chapters</span>
          </SEIPopoverTrigger>
          <SEIPopoverContent side="top" align="end" collisionPadding={8} variant="dark" dir={direction} className={pickerSurface}>
            <SEIPopoverTitle className={pickerHeading}>Chapters</SEIPopoverTitle>
            <nav aria-label="Chapters" className="space-y-1">
              <button type="button" aria-label={previous?.label ?? 'Previous Chapter'} disabled={!previous}
                onClick={() => { setGroup(undefined); previous?.run(); }} className={`${pickerRow} disabled:opacity-35`}>
                <ChevronLeft className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden />Previous chapter
              </button>
              <button type="button" aria-label="Open Fate" data-testid="reader-fate-button" data-attention={fate.attention || undefined}
                disabled={fate.disabled} onClick={() => { setGroup(undefined); chapterTrigger.current?.focus(); fate.run(); }} className={`${pickerRow} disabled:opacity-35 ${fate.attention ? fateCalling : ''}`}>
                <Compass className="h-4 w-4 shrink-0" aria-hidden />Fate
              </button>
              <button type="button" aria-label={next?.label ?? 'Next Chapter'} disabled={!next || next.busy || next.disabled} aria-busy={next?.busy || undefined}
                onClick={() => { setGroup(undefined); next?.run(); }} className={`${pickerRow} disabled:opacity-35`}>
                <ChevronRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden />{next?.label ?? 'Next chapter'}
              </button>
            </nav>
          </SEIPopoverContent>
        </SEIPopover> : <nav aria-label="Chapters" className={controlPill}>
          <button type="button" aria-label={previous?.label ?? 'Previous Chapter'} title={previous?.label ?? 'Previous Chapter'} disabled={!previous}
            onClick={previous?.run} className={`${pillStep} rounded-s-full`}>
            <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          </button>
          <button type="button" aria-label="Open Fate" data-testid="reader-fate-button" data-attention={fate.attention || undefined}
            title={fate.disabled ? 'Fate opens when you reach the end of the chapter' : fate.attention ? 'Fate: direct the next chapter' : 'Fate: decide what happens next'}
            onClick={fate.run} disabled={fate.disabled} className={`${pickerTrigger} ${fate.attention ? fateCalling : ''}`}>
            <Compass className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" aria-label={next?.label ?? 'Next Chapter'} title={next?.label ?? 'Next Chapter'} disabled={!next || next.busy || next.disabled}
            aria-busy={next?.busy || undefined} onClick={next?.run}
            className={`${pillStep} rounded-e-full`}>
            <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          </button>
        </nav>}
          {/* Create mode at the far right, balancing Listen; the story audio note floats above it. */}
          <div className="relative h-12 w-12 shrink-0 max-sm:h-14 max-sm:w-14" data-testid="reader-create-slot">
          {note && <div className="pointer-events-none absolute bottom-full left-1/2 mb-4 -translate-x-1/2 [&>*]:pointer-events-auto" data-testid="story-audio-note">{note}</div>}
          {create && <button type="button" aria-label="Create mode" aria-pressed={create.active} data-testid="reader-create-button"
            title={create.unavailable ?? (create.active ? 'Back to reading' : 'Create mode: change this chapter\'s words and Sound Cues')}
            disabled={Boolean(create.unavailable) && !create.active} onClick={create.onToggle}
            className={`${create.active ? primary : secondary} disabled:cursor-not-allowed disabled:opacity-35`}>
            <Zap className="h-6 w-6" aria-hidden /><span className={actionLabel}>Create</span>
          </button>}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

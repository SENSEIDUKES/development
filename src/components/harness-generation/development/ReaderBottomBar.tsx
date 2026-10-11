import { useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react';
import { SEIOverlayScrollbar, SEIPopover, SEIPopoverContent, SEIPopoverTitle, SEIPopoverTrigger } from '@seihouse/ui';
import { BookOpen, Check, ChevronLeft, ChevronRight, LocateFixed, Pause, Play, RotateCcw, SkipBack, SkipForward, Zap } from 'lucide-react';
import { READ_ALOUD_RATES, type ReadAloud, type ReadAloudRole } from '@seihouse/sen/reader-runtime';

/** A saved chapter to open, or the story's next step at the newest chapter. */
export interface ReaderChapterStep {
  label: string;
  run: () => void;
  busy?: boolean;
}

const ROLE_LABELS: Record<ReadAloudRole, string> = { narrator: 'Narrator', protagonist: 'Protagonist', side: 'Side character' };
const RATE_LABELS: Readonly<Record<number, string>> = { 0.5: '½', 0.75: '¾', 1: '1', 1.25: '1¼', 1.5: '1½', 1.75: '1¾', 2: '2' };

const round = 'reader-glass-control inline-flex min-h-11 min-w-9 max-[380px]:min-w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-neutral-100 hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-11';
const controlFeedback = 'motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200';
const mainAction = `inline-flex h-12 w-12 max-[380px]:h-11 max-[380px]:w-11 shrink-0 items-center justify-center rounded-full border ${controlFeedback}`;
const primary = `reader-glass-primary ${mainAction} border-cyan-200/25 bg-cyan-400 text-neutral-950 hover:bg-cyan-300 active:bg-cyan-500`;
const secondary = `reader-glass-control ${mainAction} border-white/15 bg-white/10 text-neutral-100 hover:bg-white/15 active:bg-white/20`;
const controlPill = 'reader-glass-control inline-flex shrink-0 items-center justify-self-center rounded-full border border-white/10 bg-white/[0.025]';
// Extend the compact pill controls vertically without crowding neighboring targets.
const pillTarget = `relative after:absolute after:inset-x-0 after:-inset-y-1 ${controlFeedback}`;
const pillStep = `inline-flex h-9 min-w-8 max-[480px]:min-w-6 max-[380px]:min-w-5 items-center justify-center text-neutral-100 enabled:hover:bg-white/10 enabled:active:bg-white/15 disabled:opacity-35 ${pillTarget}`;
const pickerTrigger = `inline-flex h-9 w-9 max-[480px]:w-8 max-[380px]:w-7 items-center justify-center rounded-md font-mono tabular-nums hover:bg-white/10 active:bg-white/15 disabled:opacity-35 ${pillTarget}`;
const pickerSurface = 'reader-glass reader-glass-menu reader-glass-picker w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/95 p-1.5 font-sans text-neutral-100 shadow-lg backdrop-blur-xl';
const pickerHeading = 'mx-1.5 mb-1 border-b border-white/10 px-1.5 pb-2.5 pt-2 text-xs font-medium text-neutral-400';
const pickerList = 'max-h-[min(20rem,60dvh)] overflow-y-auto overscroll-contain p-0.5';
const pickerRow = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm leading-5 hover:bg-white/10 active:bg-white/15 motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-200';
const pickerSelected = 'bg-white/10 font-medium text-neutral-100';

function IconButton({ label, icon: Icon, onClick, disabled, className = round }: {
  label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; onClick: () => void; disabled?: boolean; className?: string;
}) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={className}>
    <Icon className="h-4 w-4" aria-hidden />
  </button>;
}

/**
 * The Reader frame's bottom bar, always at the bottom of the screen, holds
 * what the reader acts with: Listen and sentence navigation on the left, Codex in the middle,
 * Fate on the right. Sentence navigation and its speed selector are always visible beside the
 * play/pause button. Back to narration floats above the left end
 * only when needed; the story audio note floats above the right. Where the browser
 * can't read aloud, Codex stays available and the skip controls are disabled.
 */
export function ReaderBottomBar({ readAloud, onListen, offscreen, onBackToNarration, barRef, note, onOpenCodex, onOpenFate, previous, next, chapterSelection }: {
  readAloud: ReadAloud;
  /** Starts reading where the reader is on the page. Absent before the story has a chapter. */
  onListen?: () => void;
  offscreen: boolean;
  onBackToNarration: () => void;
  barRef?: Ref<HTMLDivElement>;
  /** The story audio note (the soundtrack's mute), placed above the bar. */
  note?: ReactNode;
  onOpenCodex: () => void;
  onOpenFate: () => void;
  previous?: ReaderChapterStep;
  next?: ReaderChapterStep;
  /** Saved chapters only; choosing one uses the frame's existing navigation and saved place. */
  chapterSelection?: { current: number; entries: readonly { number: number; title: string }[]; onSelect: (number: number) => void };
}) {
  const [picker, setPicker] = useState<'chapters' | 'speed'>();
  const currentChapterButton = useRef<HTMLButtonElement>(null);
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
  return <div ref={barRef} data-testid="reader-bottom-bar" role="region" aria-label="Reader controls"
    className="reader-glass reader-glass-bar sticky bottom-0 z-20 -mx-4 mt-8 border-t border-white/10 bg-neutral-950/90 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-[max(1rem,env(safe-area-inset-left))]">
    {listening && offscreen && <div className="absolute bottom-full left-4 mb-2" data-testid="back-to-narration-float">
      {/* A round glass button, like the story audio note floating on the other side. */}
      <button type="button" aria-label="Back to narration" title="Back to narration" onClick={onBackToNarration}
        className="reader-glass-float inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-100">
        <LocateFixed className="h-5 w-5" aria-hidden />
      </button>
    </div>}
    <div className="mx-auto max-w-3xl" data-testid={player ? 'read-aloud-player' : undefined} data-status={player ? status : undefined}>
      {notice && <p role="status" className="absolute bottom-full left-4 right-4 mb-2 rounded-lg bg-neutral-950/95 p-2 text-center text-xs text-amber-200">{notice}</p>}
      {listening && <p className="sr-only" data-testid="read-aloud-speaker">{speaking}</p>}
      {/* Main actions anchor the edges and center; each pill centers in the space between them. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 pt-2 max-[480px]:gap-1.5 max-[380px]:gap-1" data-testid="reader-controls-row">
        <div className="contents">
          {playback && PlaybackIcon
            ? <button type="button" aria-label={playback.label} title={playback.label} onClick={playback.run} data-testid="read-aloud-play" className={secondary}>
                <PlaybackIcon className="h-6 w-6" aria-hidden /><span className="sr-only">{playback.label}</span>
              </button>
            : <span className="h-12 w-12 max-[380px]:h-11 max-[380px]:w-11 shrink-0" aria-hidden />}
          <div role="group" aria-label="Playback controls" className={controlPill}>
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
                  {READ_ALOUD_RATES.map(rate => <button key={rate} type="button" ref={rate === readAloud.rate ? currentSpeedButton : undefined}
                    aria-label={`Narration speed: ${rate}`} aria-pressed={rate === readAloud.rate}
                    onClick={() => { setPicker(undefined); readAloud.setRate(rate); }}
                    className={`${pickerRow} ${rate === readAloud.rate ? pickerSelected : 'text-neutral-300'}`}>
                    <span className="flex-1 font-mono tabular-nums">{RATE_LABELS[rate]}</span>
                    {rate === readAloud.rate && <Check className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden />}
                  </button>)}
                </SEIOverlayScrollbar>
              </SEIPopoverContent>
            </SEIPopover>
            <IconButton label="Next sentence" icon={SkipForward} onClick={() => readAloud.skip(1)} disabled={!player || status === 'ended'} className={`${pillStep} rounded-r-full`} />
          </div>
        </div>
        <div className="flex shrink-0 justify-center">
          <button type="button" aria-label="Open Codex" title="Codex: the story's world" onClick={onOpenCodex} data-testid="reader-codex-button"
            className={primary}>
            <BookOpen className="h-6 w-6" aria-hidden /><span className="sr-only">Codex</span>
          </button>
        </div>
        <div className="contents">
        <nav aria-label="Chapters" className={controlPill}>
          <button type="button" aria-label={previous?.label ?? 'Previous Chapter'} title={previous?.label ?? 'Previous Chapter'} disabled={!previous}
            onClick={previous?.run} className={`${pillStep} rounded-l-full`}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          {chapterSelection && <SEIPopover open={picker === 'chapters'} onOpenChange={open => setPicker(open ? 'chapters' : undefined)}>
            <SEIPopoverTrigger aria-label={`Select chapter: Chapter ${chapterSelection.current}`}
              title={`Chapter ${chapterSelection.current}: ${chapterSelection.entries.find(entry => entry.number === chapterSelection.current)?.title ?? ''}`}
              className={pickerTrigger}>
              <span data-testid="reader-chapter-position" className="text-sm font-semibold text-cyan-100">{chapterSelection.current}</span>
            </SEIPopoverTrigger>
            <SEIPopoverContent side="top" align="center" collisionPadding={8} variant="dark" initialFocus={currentChapterButton}
              className={pickerSurface} data-testid="reader-chapter-picker">
              <SEIPopoverTitle className={pickerHeading}>Chapters</SEIPopoverTitle>
              <SEIOverlayScrollbar fades={false} className={`reader-scroll-region ${pickerList}`}>
                {chapterSelection.entries.map(entry => <button key={entry.number} type="button" ref={entry.number === chapterSelection.current ? currentChapterButton : undefined}
                  aria-label={`Chapter ${entry.number}: ${entry.title}`} aria-current={entry.number === chapterSelection.current ? 'page' : undefined}
                  onClick={() => { setPicker(undefined); chapterSelection.onSelect(entry.number); }}
                  className={`${pickerRow} ${entry.number === chapterSelection.current ? pickerSelected : 'text-neutral-300'}`}>
                  <span className="min-w-6 font-mono text-xs tabular-nums text-neutral-400">{entry.number}</span>
                  <span className="min-w-0 flex-1 break-words">{entry.title}</span>
                  {entry.number === chapterSelection.current && <Check className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden />}
                </button>)}
              </SEIOverlayScrollbar>
            </SEIPopoverContent>
          </SEIPopover>}
          <button type="button" aria-label={next?.label ?? 'Next Chapter'} title={next?.label ?? 'Next Chapter'} disabled={!next || next.busy}
            aria-busy={next?.busy || undefined} onClick={next?.run}
            className={`${pillStep} rounded-r-full`}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
          <div className="relative shrink-0">
          {note && <div className="pointer-events-none absolute bottom-full left-1/2 mb-4 -translate-x-1/2 [&>*]:pointer-events-auto" data-testid="story-audio-note">{note}</div>}
          <button type="button" aria-label="Open Fate" title="Fate: decide what happens next" onClick={onOpenFate}
            className={secondary}>
            <Zap className="h-6 w-6" aria-hidden />
          </button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

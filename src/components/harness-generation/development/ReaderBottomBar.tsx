import type { ComponentType, ReactNode, Ref } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, LocateFixed, Pause, Play, RotateCcw, SkipBack, SkipForward, Zap } from 'lucide-react';
import type { ReadAloud, ReadAloudRole } from '@seihouse/sen/reader-runtime';

/** A saved chapter to open, or the story's next step at the newest chapter. */
export interface ReaderChapterStep {
  label: string;
  run: () => void;
  busy?: boolean;
}

const ROLE_LABELS: Record<ReadAloudRole, string> = { narrator: 'Narrator', protagonist: 'Protagonist', side: 'Side character' };

const round = 'inline-flex min-h-11 min-w-9 max-[380px]:min-w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-neutral-100 hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-11';
const mainAction = 'inline-flex h-14 w-14 max-[380px]:h-12 max-[380px]:w-12 shrink-0 items-center justify-center rounded-full border-2';
const primary = `${mainAction} border-cyan-200/70 bg-cyan-400 text-neutral-950 shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:bg-cyan-300`;
const secondary = `${mainAction} border-neutral-400/60 bg-neutral-700 text-neutral-100 hover:bg-neutral-600`;
const controlPill = 'inline-flex shrink-0 items-center justify-self-center rounded-full border border-white/15';
const pillStep = 'inline-flex h-9 min-w-8 max-[380px]:min-w-6 sm:min-w-9 items-center justify-center text-neutral-100 disabled:opacity-35';

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
 * Fate on the right. Sentence navigation is always visible beside the
 * play/pause button. Back to narration floats above the left end
 * only when needed; the story audio note floats above the right. Where the browser
 * can't read aloud, Codex stays available and the skip controls are disabled.
 */
export function ReaderBottomBar({ readAloud, onListen, offscreen, onBackToNarration, barRef, note, onOpenCodex, onOpenFate, previous, next, position }: {
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
  /** Where the reader is, such as "5/10". */
  position?: string;
}) {
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
    className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-white/10 bg-neutral-950/90 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-[max(1rem,env(safe-area-inset-left))]">
    {note && <div className="pointer-events-none absolute bottom-full right-4 mb-2 [&>*]:pointer-events-auto" data-testid="story-audio-note">{note}</div>}
    {listening && offscreen && <div className="absolute bottom-full left-4 mb-2" data-testid="back-to-narration-float">
      <IconButton label="Back to narration" icon={LocateFixed} onClick={onBackToNarration} />
    </div>}
    <div className="mx-auto max-w-3xl" data-testid={player ? 'read-aloud-player' : undefined} data-status={player ? status : undefined}>
      {notice && <p role="status" className="absolute bottom-full left-4 right-4 mb-2 rounded-lg bg-neutral-950/95 p-2 text-center text-xs text-amber-200">{notice}</p>}
      {listening && <p className="sr-only" data-testid="read-aloud-speaker">{speaking}</p>}
      {/* Main actions anchor the edges and center; each pill centers in the space between them. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 pt-2 max-[380px]:gap-1" data-testid="reader-controls-row">
        <div className="contents">
          {playback && PlaybackIcon
            ? <button type="button" aria-label={playback.label} title={playback.label} onClick={playback.run} data-testid="read-aloud-play" className={secondary}>
                <PlaybackIcon className="h-6 w-6" aria-hidden /><span className="sr-only">{playback.label}</span>
              </button>
            : <span className="h-14 w-14 max-[380px]:h-12 max-[380px]:w-12 shrink-0" aria-hidden />}
          <div role="group" aria-label="Playback controls" className={controlPill}>
            <IconButton label="Previous sentence" icon={SkipBack} onClick={() => readAloud.skip(-1)} disabled={!player} className={`${pillStep} rounded-l-full`} />
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
          {position && <span className="font-mono text-[11px] tabular-nums text-neutral-300 sm:text-xs" data-testid="reader-chapter-position">{position}</span>}
          <button type="button" aria-label={next?.label ?? 'Next Chapter'} title={next?.label ?? 'Next Chapter'} disabled={!next || next.busy}
            aria-busy={next?.busy || undefined} onClick={next?.run}
            className={`${pillStep} rounded-r-full`}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
          <button type="button" aria-label="Open Fate" title="Fate: decide what happens next" onClick={onOpenFate}
            className={secondary}>
            <Zap className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  </div>;
}

import type { ComponentType, ReactNode, Ref } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, LocateFixed, Pause, Play, RotateCcw, SkipBack, SkipForward, Square, Zap } from 'lucide-react';
import type { ReadAloud, ReadAloudRole } from '@seihouse/sen/reader-runtime';

const ROLE_LABELS: Record<ReadAloudRole, string> = { narrator: 'Narrator', protagonist: 'Protagonist', side: 'Side character' };

const round = 'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-neutral-100 hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40';

function IconButton({ label, icon: Icon, onClick, disabled }: {
  label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; onClick: () => void; disabled?: boolean;
}) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={round}>
    <Icon className="h-4 w-4" aria-hidden />
  </button>;
}

/** One way to move between chapters: a chapter to open, or the story's next step at the newest chapter. */
export interface ReaderChapterStep {
  /** The button's name, such as "Next Chapter" or "Next Chapter: Write Chapter 4". */
  label: string;
  run: () => void;
  busy?: boolean;
}

/**
 * The Reader frame's bottom bar, always at the bottom of the screen, holds
 * what the reader acts with: the Codex on the left, Listen in the middle,
 * Fate and the chapters (previous, where the reader is, next) on the right. While Listen reads, a
 * strip above it names who is speaking and steps a sentence back or forward,
 * stops, and offers the way back to the sentence when it has scrolled away.
 * The story audio note floats just above its right end. Where the browser
 * can't read aloud, the middle is empty and the rest stays.
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
  const center = !player ? null
    : status === 'playing' ? { label: 'Pause', icon: Pause, run: readAloud.pause }
      : status === 'paused' ? { label: 'Resume', icon: Play, run: readAloud.resume }
        : status === 'ended' ? { label: 'Listen from the start', icon: RotateCcw, run: () => readAloud.play(0) }
          : onListen ? { label: 'Listen', icon: Play, run: onListen } : null;
  const CenterIcon = center?.icon;
  return <div ref={barRef} data-testid="reader-bottom-bar" role="region" aria-label="Reader controls"
    className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-white/10 bg-neutral-950/90 px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-[max(1rem,env(safe-area-inset-left))]">
    {note && <div className="pointer-events-none absolute bottom-full right-4 mb-2 [&>*]:pointer-events-auto" data-testid="story-audio-note">{note}</div>}
    <div className="mx-auto max-w-3xl" data-testid={player ? 'read-aloud-player' : undefined} data-status={player ? status : undefined}>
      {notice && <p role="status" className="pt-2 text-center text-xs text-amber-200">{notice}</p>}
      {listening && <div className="flex items-center gap-2 pt-2" data-testid="read-aloud-strip">
        <p className="min-w-0 flex-1 truncate text-xs text-neutral-400" data-testid="read-aloud-speaker">{speaking}</p>
        {offscreen && <button type="button" onClick={onBackToNarration}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-cyan-300/40 px-3 text-xs text-cyan-50 hover:bg-cyan-400/15">
          <LocateFixed className="h-4 w-4" aria-hidden /> Back to narration
        </button>}
        <IconButton label="Previous sentence" icon={SkipBack} onClick={() => readAloud.skip(-1)} />
        {status !== 'ended' && <IconButton label="Next sentence" icon={SkipForward} onClick={() => readAloud.skip(1)} />}
        <IconButton label="Stop" icon={Square} onClick={readAloud.stop} />
      </div>}
      {/* Two equal sides keep Listen in the middle of the screen. Where the right side can't fit in
          its half (the narrowest phones), the left gives way, so nothing ever overlaps. */}
      <div className="flex items-center gap-1 pt-2 sm:gap-2">
        <div className="flex min-w-0 flex-1 basis-0 justify-start">
          <button type="button" aria-label="Open Codex" title="Codex: the story's world" onClick={onOpenCodex}
            className={`${round} gap-1.5 sm:px-4`}>
            <BookOpen className="h-4 w-4" aria-hidden /><span className="hidden text-sm sm:inline" aria-hidden>Codex</span>
          </button>
        </div>
        <div className="flex shrink-0 justify-center">
          {center && CenterIcon
            ? <button type="button" aria-label={center.label} title={center.label} onClick={center.run} data-testid="read-aloud-play"
                className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-200/70 bg-cyan-400 text-neutral-950 shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:bg-cyan-300">
                <CenterIcon className="h-6 w-6" aria-hidden /><span className="sr-only">{center.label}</span>
              </button>
            : <span className="h-14 w-14" aria-hidden />}
        </div>
        <div className="flex min-w-max flex-1 basis-0 items-center justify-end gap-1 sm:gap-1.5">
          <button type="button" aria-label="Open Fate" title="Fate: decide what happens next" onClick={onOpenFate}
            className={`${round} min-w-10 border-cyan-300/40 text-cyan-100 hover:border-cyan-300/70 sm:min-w-11`}>
            <Zap className="h-4 w-4" aria-hidden />
          </button>
          <nav aria-label="Chapters" className="inline-flex shrink-0 items-center rounded-full border border-white/15">
            <button type="button" aria-label={previous?.label ?? 'Previous Chapter'} title={previous?.label ?? 'Previous Chapter'} disabled={!previous}
              onClick={previous?.run} className="inline-flex min-h-11 min-w-9 items-center justify-center rounded-l-full text-neutral-100 disabled:opacity-35 sm:min-w-10">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            {/* Where the reader is ("5/10"). */}
            {position && <span className="font-mono text-[11px] tabular-nums text-neutral-300 sm:text-xs" data-testid="reader-chapter-position">{position}</span>}
            <button type="button" aria-label={next?.label ?? 'Next Chapter'} title={next?.label ?? 'Next Chapter'} disabled={!next || next.busy}
              aria-busy={next?.busy || undefined} onClick={next?.run}
              className="inline-flex min-h-11 min-w-9 items-center justify-center rounded-r-full text-neutral-100 disabled:opacity-35 sm:min-w-10">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>;
}

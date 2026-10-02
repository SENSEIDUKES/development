import type { ComponentType, Ref } from 'react';
import { Headphones, LocateFixed, Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import type { ReadAloud, ReadAloudRole } from '@seihouse/sen/reader-runtime';

const ROLE_LABELS: Record<ReadAloudRole, string> = { narrator: 'Narrator', protagonist: 'Protagonist', side: 'Side character' };

const control = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 text-neutral-100 hover:border-white/35 disabled:opacity-40';

function IconButton({ label, icon: Icon, onClick }: { label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={control}>
    <Icon className="h-4 w-4" aria-hidden />
  </button>;
}

/**
 * The Listen bar: always reachable at the bottom of the chapter. Idle, it
 * offers Listen; while reading it pauses, resumes, steps a sentence back or
 * forward, stops, and shows who is speaking. When the sentence being read has
 * scrolled away, it offers the way back to it.
 */
export function ReadAloudPlayer({ readAloud, onListen, offscreen, onBackToNarration, playerRef }: {
  readAloud: ReadAloud;
  /** Starts reading where the reader is on the page. */
  onListen: () => void;
  offscreen: boolean;
  onBackToNarration: () => void;
  playerRef?: Ref<HTMLDivElement>;
}) {
  if (!readAloud.supported) return null;
  const { status, line, notice } = readAloud;
  const speaking = status === 'ended' ? 'End of chapter' : line ? line.speaker ?? ROLE_LABELS[line.role] : '';
  return <div ref={playerRef} role="region" aria-label="Listen" data-testid="read-aloud-player" data-status={status}
    className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-white/10 bg-neutral-950/90 px-4 pt-2 backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))]">
    {notice && <p role="status" className="mb-2 text-center text-xs text-amber-200">{notice}</p>}
    <div className="mx-auto flex max-w-3xl items-center gap-2">
      {status === 'idle'
        ? <button type="button" onClick={onListen}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-50 hover:bg-cyan-400/20">
            <Headphones className="h-4 w-4" aria-hidden /> Listen
          </button>
        : <>
            <IconButton label="Previous sentence" icon={SkipBack} onClick={() => readAloud.skip(-1)} />
            {status === 'playing'
              ? <IconButton label="Pause" icon={Pause} onClick={readAloud.pause} />
              : status === 'ended'
                ? <IconButton label="Listen from the start" icon={Play} onClick={() => readAloud.play(0)} />
                : <IconButton label="Resume" icon={Play} onClick={readAloud.resume} />}
            {status !== 'ended' && <IconButton label="Next sentence" icon={SkipForward} onClick={() => readAloud.skip(1)} />}
            <IconButton label="Stop" icon={Square} onClick={readAloud.stop} />
            <p className="min-w-0 flex-1 truncate text-xs text-neutral-400" data-testid="read-aloud-speaker">{speaking}</p>
            {offscreen && <button type="button" onClick={onBackToNarration}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-cyan-300/40 px-3 text-xs text-cyan-50 hover:bg-cyan-400/15">
              <LocateFixed className="h-4 w-4" aria-hidden /> Back to narration
            </button>}
          </>}
    </div>
  </div>;
}

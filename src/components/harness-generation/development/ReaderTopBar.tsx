import type { ReactNode, Ref } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';

const action = 'reader-glass-control inline-flex h-12 w-12 max-[380px]:h-11 max-[380px]:w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-neutral-100 hover:bg-white/15 active:bg-white/20 motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200';

/**
 * The Reader frame's top bar: Back (exit), the story and chapter, the host's own
 * companion (the Library's Familiar), and Reader Settings: settings and what
 * the reader is reading. It stays at the top of the screen while the chapter
 * scrolls. Chapter navigation lives between Codex and Fate in the bottom bar.
 * Codex, Listen and Fate stay
 * in the bottom bar.
 */
export function ReaderTopBar({ storyTitle, place, onBack, onOpenSettings, companion, barRef }: {
  storyTitle: string;
  /** Where the reader is: "Chapter 3", or the story start. */
  place: string;
  onBack: () => void;
  onOpenSettings: () => void;
  /** The host's companion beside Reader Settings (the Library puts its Familiar here). */
  companion?: ReactNode;
  barRef?: Ref<HTMLElement>;
}) {
  return <header ref={barRef} data-testid="reader-top-bar"
    className="reader-glass reader-glass-bar sticky top-0 z-30 -mx-4 border-b border-white/10 bg-neutral-950/90 px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] backdrop-blur sm:px-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]">
    <div className="mx-auto flex max-w-3xl items-center gap-3 py-2 max-[380px]:gap-2">
      <button type="button" aria-label="Back" title="Back" onClick={onBack}
        className={action}>
        <ChevronLeft className="h-5 w-5" aria-hidden /><span className="sr-only">Back</span>
      </button>
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-sm font-medium leading-5 text-neutral-100" title={storyTitle} data-testid="reader-story-title">{storyTitle}</p>
        <p className="truncate text-xs leading-5 text-neutral-400">{place}</p>
      </div>
      {companion && <div className="flex shrink-0 items-center" data-testid="reader-companion">{companion}</div>}
      <button type="button" aria-label="Reader Settings" title="Reader Settings" aria-haspopup="dialog" onClick={onOpenSettings}
        className={action}>
        <Settings className="h-5 w-5" aria-hidden />
      </button>
    </div>
  </header>;
}

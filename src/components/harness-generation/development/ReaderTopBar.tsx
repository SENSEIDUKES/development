import type { ReactNode, Ref } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';

const pill = 'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border text-sm';

/**
 * The Reader frame's top bar: Back (exit), the story and chapter, the host's own
 * companion (the Library's Familiar), and Reader Settings: settings and what
 * the reader is reading. It stays at the top of the screen while the chapter
 * scrolls and fits one row on the narrowest phones; Back shows its word from
 * small tablets up. What the reader acts with (the Codex, Listen, Fate and the
 * chapters) is in the bottom bar.
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
    className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-neutral-950/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
    <div className="mx-auto flex min-h-14 max-w-3xl items-center gap-1.5 sm:gap-2">
      <button type="button" aria-label="Back" title="Back" onClick={onBack}
        className={`${pill} border-white/15 text-neutral-200 hover:border-white/30 sm:pl-2 sm:pr-4`}>
        <ChevronLeft className="h-4 w-4" aria-hidden /><span className="hidden sm:inline" aria-hidden>Back</span>
      </button>
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/70" data-testid="reader-story-title">{storyTitle}</p>
        <p className="truncate text-xs text-neutral-400">{place}</p>
      </div>
      {companion && <div className="flex shrink-0 items-center" data-testid="reader-companion">{companion}</div>}
      <button type="button" aria-label="Reader Settings" title="Reader Settings" aria-haspopup="dialog" onClick={onOpenSettings}
        className={`${pill} border-white/15 text-neutral-200 hover:border-white/30`}>
        <Settings className="h-4 w-4" aria-hidden />
      </button>
    </div>
  </header>;
}

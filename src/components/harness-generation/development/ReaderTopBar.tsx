import type { Ref } from 'react';
import { Backpack, ChevronLeft, Settings } from 'lucide-react';

const pill = 'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border text-sm';

/**
 * The Reader frame's top bar: Back, the story and chapter, and the Reader's
 * own pages (Holdings, Fate, Reader Settings). It stays at the top of the
 * screen while the chapter scrolls, so the pages are always one tap away, and
 * fits one row on the narrowest phones: Back and Holdings show their words
 * from small tablets up, Fate always does.
 */
export function ReaderTopBar({ storyTitle, place, onBack, onOpenHoldings, onOpenFate, onOpenSettings, barRef }: {
  storyTitle: string;
  /** Where the reader is: "Chapter 3", or the story start. */
  place: string;
  onBack: () => void;
  onOpenHoldings: () => void;
  onOpenFate: () => void;
  onOpenSettings: () => void;
  barRef?: Ref<HTMLElement>;
}) {
  return <header ref={barRef} data-testid="reader-top-bar"
    className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-neutral-950/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
    <div className="mx-auto flex min-h-14 max-w-3xl items-center gap-1.5 sm:gap-2">
      <button type="button" aria-label="Back" title="Back" onClick={onBack}
        className={`${pill} border-white/15 text-neutral-200 hover:border-white/30 sm:pl-2 sm:pr-4`}>
        <ChevronLeft className="h-4 w-4" aria-hidden /><span className="hidden sm:inline" aria-hidden>Back</span>
      </button>
      <div className="min-w-0 flex-1 px-1 text-center">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/70" data-testid="reader-story-title">{storyTitle}</p>
        <p className="truncate text-xs text-neutral-400">{place}</p>
      </div>
      <button type="button" aria-label="Open Holdings" title="Holdings: what each character has now" onClick={onOpenHoldings}
        className={`${pill} border-white/15 text-neutral-200 hover:border-white/30 sm:px-4`}>
        <Backpack className="h-4 w-4 sm:hidden" aria-hidden /><span className="hidden sm:inline" aria-hidden>Holdings</span>
      </button>
      <button type="button" aria-label="Open Fate" title="Fate: decide what happens next" onClick={onOpenFate}
        className={`${pill} border-cyan-300/30 px-4 text-cyan-50 hover:border-cyan-300/60`}>Fate</button>
      <button type="button" aria-label="Reader Settings" title="Reader Settings" aria-haspopup="dialog" onClick={onOpenSettings}
        className={`${pill} border-white/15 text-neutral-200 hover:border-white/30`}>
        <Settings className="h-4 w-4" aria-hidden />
      </button>
    </div>
  </header>;
}

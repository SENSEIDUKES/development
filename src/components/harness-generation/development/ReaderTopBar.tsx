import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { scrollerFor } from './useFollowNarration';
import './reader-top-bar.css';

const action = 'reader-glass-control inline-flex h-12 w-12 max-[380px]:h-11 max-[380px]:w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-neutral-100 hover:bg-white/15 active:bg-white/20 motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200';

/**
 * The Reader frame's top bar: Back (exit), the story and chapter, the host's own
 * companion (the Library's Familiar), and Reader Settings: settings and what
 * the reader is reading. It clears the page on downward scroll and returns
 * on upward scroll. Chapter navigation stays in the bottom bar.
 * Codex, Listen and Fate stay
 * in the bottom bar.
 */
export function ReaderTopBar({ storyTitle, place, onBack, onOpenSettings, companion, barRef, pinned = false }: {
  storyTitle: string;
  /** Where the reader is: "Chapter 3", or the story start. */
  place: string;
  onBack: () => void;
  onOpenSettings: () => void;
  /** The host's companion beside Reader Settings (the Library puts its Familiar here). */
  companion?: ReactNode;
  barRef?: Ref<HTMLElement>;
  /** Keep controls available while a Reader panel is open. */
  pinned?: boolean;
}) {
  const element = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  useImperativeHandle(barRef, () => element.current!, []);
  useEffect(() => {
    setHidden(false);
    const header = element.current;
    if (!header) return;
    const scroller = scrollerFor(header);
    const target = scroller ?? window;
    const position = () => {
      const max = scroller ? scroller.scrollHeight - scroller.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      return Math.max(0, Math.min(scroller ? scroller.scrollTop : window.scrollY, Math.max(0, max)));
    };
    let previous = position();
    let travel = 0;
    const onScroll = () => {
      // Clamp Safari overscroll so bouncing at an end does not flip direction.
      const y = position();
      const delta = y - previous;
      previous = y;
      const top = scroller?.getBoundingClientRect().top ?? 0;
      const distance = top - (header.parentElement?.getBoundingClientRect().top ?? 0);
      if (pinned || distance <= 80 || header.querySelector('[aria-expanded="true"]')) {
        travel = 0;
        setHidden(false);
        return;
      }
      if (!delta) return;
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      // Ignore small touch jitter; reveal sooner than we hide.
      if (travel >= 16) { setHidden(true); travel = 0; }
      else if (travel <= -8) { setHidden(false); travel = 0; }
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [pinned, place]);
  return <header ref={element} data-testid="reader-top-bar" data-scroll-hidden={hidden && !pinned}
    onFocusCapture={() => setHidden(false)}
    className="reader-top-bar reader-glass reader-glass-bar sticky top-0 z-30 -mx-4 border-b border-white/10 bg-neutral-950/90 px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] backdrop-blur sm:px-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]">
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

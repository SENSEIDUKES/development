import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { scrollerFor } from './useFollowNarration';
import { controlFeedback } from './readerPicker';
import './reader-top-bar.css';
import './reader-colors.css';

const action = `reader-glass-control inline-flex h-12 w-12 max-[380px]:h-11 max-[380px]:w-11 shrink-0 items-center justify-center rounded-full border border-(--reader-light)/15 bg-(--reader-light)/10 text-(--reader-text) hover:bg-(--reader-light)/15 active:bg-(--reader-light)/20 ${controlFeedback}`;

/**
 * The Reader frame's top bar, across the whole screen: Back (exit), the story
 * and chapter, the host's own companion (the Library's Familiar), and Reader
 * Settings. The story and chapter identify the reader's place.
 * It clears the page on downward scroll and returns on upward scroll. Listen,
 * Codex, Fate and the chapter arrows stay in the bottom bar.
 */
export function ReaderTopBar({ storyTitle, place, onBack, onOpenSettings, companion, barRef, pinned = false }: {
  storyTitle: string;
  /** Where the reader is: "Chapter 3 · The Bell Keeper", or the story start. */
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
  const heading = <>
    <span className="block truncate text-base font-semibold leading-6 text-(--reader-text-bright) lg:text-lg lg:leading-7" title={storyTitle} data-testid="reader-story-title">{storyTitle}</span>
    <span className="flex min-w-0 items-center gap-1 text-sm leading-5 text-(--reader-text-muted)">
      <span className="truncate" data-testid="reader-place">{place}</span>
    </span>
  </>;
  return <header ref={element} data-testid="reader-top-bar" data-scroll-hidden={hidden && !pinned}
    onFocusCapture={() => setHidden(false)}
    className="reader-top-bar reader-glass reader-glass-bar sticky top-0 z-30 -mx-4 border-b border-(--reader-light)/10 bg-(--reader-surface)/90 px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] backdrop-blur sm:px-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]">
    <div className="reader-bar-row flex w-full items-center gap-3 max-[380px]:gap-2">
      <button type="button" aria-label="Back" title="Back" onClick={onBack}
        className={action}>
        <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden /><span className="sr-only">Back</span>
      </button>
      <div className="min-w-0 flex-1 px-2 py-1">{heading}</div>
      {companion && <div className="flex shrink-0 items-center" data-testid="reader-companion">{companion}</div>}
      <button type="button" aria-label="Reader Settings" title="Reader Settings" aria-haspopup="dialog" onClick={onOpenSettings}
        className={action}>
        <Settings className="h-5 w-5" aria-hidden />
      </button>
    </div>
  </header>;
}

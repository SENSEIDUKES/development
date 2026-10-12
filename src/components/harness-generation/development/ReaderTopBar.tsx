import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { SEIOverlayScrollbar, SEIPopover, SEIPopoverContent, SEIPopoverTitle, SEIPopoverTrigger } from '@seihouse/ui';
import { Check, ChevronDown, ChevronLeft, Settings } from 'lucide-react';
import { scrollerFor } from './useFollowNarration';
import { controlFeedback, pickerHeading, pickerList, pickerRow, pickerSelected, pickerSurface } from './readerPicker';
import './reader-top-bar.css';

const action = `reader-glass-control inline-flex h-12 w-12 max-[380px]:h-11 max-[380px]:w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-neutral-100 hover:bg-white/15 active:bg-white/20 ${controlFeedback}`;

/** The story's saved chapters, for the chapter list the title opens. */
export interface ReaderChapterSelection {
  current: number;
  entries: readonly { number: number; title: string }[];
  onSelect: (number: number) => void;
}

/**
 * The Reader frame's top bar, across the whole screen: Back (exit), the story
 * and chapter, the host's own companion (the Library's Familiar), and Reader
 * Settings. Tapping the story and chapter opens the list of saved chapters.
 * It clears the page on downward scroll and returns on upward scroll. Listen,
 * Codex, Fate and the chapter arrows stay in the bottom bar.
 */
export function ReaderTopBar({ storyTitle, place, chapterSelection, onBack, onOpenSettings, companion, barRef, pinned = false }: {
  storyTitle: string;
  /** Where the reader is: "Chapter 3 · The Bell Keeper", or the story start. */
  place: string;
  /** Saved chapters only; choosing one uses the frame's existing navigation and saved place. */
  chapterSelection?: ReaderChapterSelection;
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
  const [picking, setPicking] = useState(false);
  const currentChapterButton = useRef<HTMLButtonElement>(null);
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
    <span className="block truncate text-base font-semibold leading-6 text-neutral-50 lg:text-lg lg:leading-7" title={storyTitle} data-testid="reader-story-title">{storyTitle}</span>
    <span className="flex min-w-0 items-center gap-1 text-sm leading-5 text-neutral-300">
      <span className="truncate" data-testid="reader-place">{place}</span>
      {chapterSelection && <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />}
    </span>
  </>;
  return <header ref={element} data-testid="reader-top-bar" data-scroll-hidden={hidden && !pinned}
    onFocusCapture={() => setHidden(false)}
    className="reader-top-bar reader-glass reader-glass-bar sticky top-0 z-30 -mx-4 border-b border-white/10 bg-neutral-950/90 px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] backdrop-blur sm:px-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]">
    <div className="reader-bar-row flex w-full items-center gap-3 max-[380px]:gap-2">
      <button type="button" aria-label="Back" title="Back" onClick={onBack}
        className={action}>
        <ChevronLeft className="h-5 w-5" aria-hidden /><span className="sr-only">Back</span>
      </button>
      {chapterSelection
        ? <SEIPopover open={picking} onOpenChange={setPicking}>
            <SEIPopoverTrigger aria-label={`Select chapter: Chapter ${chapterSelection.current}`} title="Chapters" data-testid="reader-chapter-menu"
              className={`min-w-0 flex-1 rounded-xl px-2 py-1 text-left hover:bg-white/[0.06] active:bg-white/10 ${controlFeedback}`}>
              {heading}
            </SEIPopoverTrigger>
            <SEIPopoverContent side="bottom" align="start" collisionPadding={8} variant="dark" initialFocus={currentChapterButton}
              className={pickerSurface} data-testid="reader-chapter-picker">
              <SEIPopoverTitle className={pickerHeading}>Chapters</SEIPopoverTitle>
              <SEIOverlayScrollbar fades={false} className={`reader-scroll-region ${pickerList}`}>
                {chapterSelection.entries.map(entry => <button key={entry.number} type="button" ref={entry.number === chapterSelection.current ? currentChapterButton : undefined}
                  aria-label={`Chapter ${entry.number}: ${entry.title}`} aria-current={entry.number === chapterSelection.current ? 'page' : undefined}
                  onClick={() => { setPicking(false); chapterSelection.onSelect(entry.number); }}
                  className={`${pickerRow} ${entry.number === chapterSelection.current ? pickerSelected : 'text-neutral-300'}`}>
                  <span className="min-w-6 font-mono text-xs tabular-nums text-neutral-400">{entry.number}</span>
                  <span className="min-w-0 flex-1 break-words">{entry.title}</span>
                  {entry.number === chapterSelection.current && <Check className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden />}
                </button>)}
              </SEIOverlayScrollbar>
            </SEIPopoverContent>
          </SEIPopover>
        : <div className="min-w-0 flex-1 px-2 py-1">{heading}</div>}
      {companion && <div className="flex shrink-0 items-center" data-testid="reader-companion">{companion}</div>}
      <button type="button" aria-label="Reader Settings" title="Reader Settings" aria-haspopup="dialog" onClick={onOpenSettings}
        className={action}>
        <Settings className="h-5 w-5" aria-hidden />
      </button>
    </div>
  </header>;
}

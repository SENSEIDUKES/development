import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import './world-card.css';

/** One slide of the Feature carousel. `render` learns whether it is the slide on screen. */
export interface WorldCardFeatureSlide {
  id: string;
  /** The slide's name for its progress segment (usually the world's title). */
  label: string;
  /** Keep this slide mounted while another shows, so its own video resumes where it was. */
  keepMounted?: boolean;
  render: (onScreen: boolean) => ReactNode;
}

/** How long each slide stays before the next, unless the reader is holding it. */
export const FEATURE_SLIDE_MS = 8000;
/** How far a finger must travel sideways before the carousel turns. */
const SWIPE_PX = 40;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * The Feature card's one way of moving: sideways, one slide at a time. It advances on its own,
 * and a segmented bar along the bottom fills for the slide on screen, like a story. Pointing at
 * it, focusing in it or resting a finger on it holds the slide (the bar pauses where it is); a
 * sideways swipe turns it, a tap on a segment jumps to that slide, and a pause button stops it until
 * the reader plays it again. It is the only thing on a
 * page that moves by itself. Home, Discover and the Workshop all use this one carousel.
 */
export function WorldCardFeatureCarousel({ slides, active = true, label = 'Featured', slideMs = FEATURE_SLIDE_MS, onSlideChange, className = '', style, ...rest }: {
  slides: readonly WorldCardFeatureSlide[];
  /** False while the page is hidden: nothing advances or plays. */
  active?: boolean;
  label?: string;
  slideMs?: number;
  onSlideChange?: (index: number) => void;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>) {
  const count = slides.length;
  const [slide, setSlide] = useState(0);
  const [held, setHeld] = useState(false);
  // The reader's own pause stays until they play again; a hold clears on its own.
  const [paused, setPaused] = useState(false);
  const current = count ? slide % count : 0;
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const remaining = useRef(slideMs);
  const onChange = useRef(onSlideChange);
  onChange.current = onSlideChange;
  const show = (next: number) => { if (count) setSlide(((next % count) + count) % count); };

  useEffect(() => { onChange.current?.(current); }, [current]);
  // A new slide gets its full time; a held one keeps what it had left, as its bar does.
  useEffect(() => { remaining.current = slideMs; }, [current, slideMs]);
  const reducedMotion = prefersReducedMotion();
  const moving = active && count > 1 && !held && !paused && !reducedMotion;
  useEffect(() => {
    if (!moving) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => setSlide(value => (value + 1) % count), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [moving, current, count, slideMs]);

  if (!count) return null;
  return <section aria-roledescription="carousel" aria-label={label} {...rest}
    className={`world-card-carousel ${className}`.trim()} data-moving={moving ? 'true' : 'false'}
    style={{ '--world-card-carousel-ms': `${slideMs}ms`, ...style } as CSSProperties}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHeld(true); }}
    onPointerLeave={event => { if (event.pointerType === 'mouse') setHeld(false); }}
    // Focus holds the slide, except on the pause button, so Play takes effect at once.
    onFocus={event => { if (!(event.target as Element).closest('.world-card-carousel-pause')) setHeld(true); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false); }}
    onPointerDown={event => {
      swiped.current = false;
      if (event.pointerType === 'mouse') { swipeStart.current = null; return; }
      // A resting finger holds the slide, like a story.
      setHeld(true);
      swipeStart.current = { x: event.clientX, y: event.clientY };
    }}
    onPointerUp={event => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (event.pointerType !== 'mouse') setHeld(false);
      if (!start || count < 2) return;
      const dx = event.clientX - start.x;
      // A sideways swipe turns the slide; a mostly vertical one is the page scrolling.
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(event.clientY - start.y)) return;
      swiped.current = true;
      // Slides run in the page's reading direction, so a right-to-left page swipes the other way.
      const forward = getComputedStyle(event.currentTarget).direction === 'rtl' ? dx > 0 : dx < 0;
      show(current + (forward ? 1 : -1));
    }}
    onPointerCancel={() => { swipeStart.current = null; setHeld(false); }}
    // A swipe ends on the card; it must not also open it.
    onClickCapture={event => { if (swiped.current) { swiped.current = false; event.preventDefault(); event.stopPropagation(); } }}>
    {slides.map((item, index) => (index === current || item.keepMounted) && <div key={item.id}
      className="world-card-carousel-slide" aria-roledescription="slide" aria-label={item.label}
      hidden={index !== current} aria-hidden={index !== current ? true : undefined}>
      {item.render(index === current && active)}
    </div>)}
    {count > 1 && <>
      <div className="world-card-carousel-progress" role="group" aria-label={`${label} slides`}>
        {slides.map((item, index) => <button key={item.id} type="button" className="world-card-carousel-segment"
          data-state={index < current ? 'done' : index === current ? 'current' : 'next'}
          aria-label={item.label} aria-current={index === current ? 'true' : undefined} onClick={() => show(index)}>
          {/* Keyed to the slide, so the bar starts empty each time its slide comes back. */}
          <span key={index === current ? `on-${current}` : 'off'} className="world-card-carousel-fill" />
        </button>)}
      </div>
      {/* A visible pause for anything that moves on its own (WCAG 2.2.2); none when nothing moves. */}
      {!reducedMotion && <button type="button" className="world-card-carousel-pause" aria-pressed={paused}
        aria-label={paused ? `Play ${label.toLowerCase()}` : `Pause ${label.toLowerCase()}`} onClick={() => setPaused(value => !value)}>
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>}
      {/* Small glass arrows on the edges for pointers; touch swipes instead. */}
      <button type="button" className="world-card-carousel-step" data-side="previous" aria-label={`Previous ${label.toLowerCase()}`} onClick={() => show(current - 1)}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <button type="button" className="world-card-carousel-step" data-side="next" aria-label={`Next ${label.toLowerCase()}`} onClick={() => show(current + 1)}>
        <ChevronRight aria-hidden="true" />
      </button>
    </>}
  </section>;
}

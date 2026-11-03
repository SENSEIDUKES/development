import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * The workspace bar's real height, the safe area included, while the bar is
 * on screen (phones and tablets); 0 once the desktop rail replaces it.
 */
function useWorkspaceBarHeight(anchor: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const bar = anchor.current?.closest('.library-navigation-layout')
      ?.querySelector<HTMLElement>(':scope > .library-workspace-navigation');
    if (!bar) return undefined;
    const follow = () => setHeight(bar.offsetHeight);
    follow();
    window.addEventListener('resize', follow);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(follow);
    observer?.observe(bar);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', follow);
    };
  }, [anchor]);
  return height;
}

/**
 * Back / Next or Create, pinned at the bottom of the Seed creator and the
 * World Blueprint. On phones and tablets it rests on the workspace bar,
 * placed by the bar's measured height, so it never floats above the bar or
 * slips under it whatever the device's safe area. On a laptop, where the
 * rail replaces the bar, it pins to the bottom of the page.
 */
export function PinnedFooter({ children, ...data }: { children: ReactNode } & Record<`data-${string}`, string | boolean>) {
  const ref = useRef<HTMLDivElement>(null);
  const barHeight = useWorkspaceBarHeight(ref);
  return (
    <div ref={ref} className="seed-creator-footer" style={{ '--seed-bar-height': `${barHeight}px` } as CSSProperties} {...data}>
      {children}
    </div>
  );
}

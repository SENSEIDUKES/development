import { useSyncExternalStore } from 'react';

/**
 * One place for the workspace breakpoints so the header, the drawer, the
 * bottom controls and the desktop sidebar can never disagree about what
 * "mobile", "tablet" and "desktop" mean.
 *
 * - Compact (`< 1280px`): the header keeps its secondary actions in the
 *   overflow menu. `SEIAppHeader` is a single row that never reflows, so the
 *   threshold is the width at which a full workspace action set — a wide
 *   primary action included — actually fits beside the Library badge rather
 *   than crushing it.
 * - Desktop (`>= 1024px`): the persistent sidebar rail replaces the drawer and
 *   the bottom controls. Below it, phones and tablets keep both. The rail's
 *   own visibility is the canonical shell's `sidebarBreakpoint="lg"`; this
 *   query is for the pieces the shell does not own, such as closing an open
 *   drawer once the rail appears.
 */
export const COMPACT_HEADER_QUERY = '(max-width: 1279px)';
export const DESKTOP_NAVIGATION_QUERY = '(min-width: 1024px)';

function subscribe(query: string) {
  return (notify: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  };
}

const compactSubscribe = subscribe(COMPACT_HEADER_QUERY);
export function useCompactHeader() {
  return useSyncExternalStore(
    compactSubscribe,
    () => window.matchMedia(COMPACT_HEADER_QUERY).matches,
    () => false,
  );
}


const desktopSubscribe = subscribe(DESKTOP_NAVIGATION_QUERY);
/** True from the desktop breakpoint, where the Pathways sidebar replaces the strip. */
export function useDesktopNavigation() {
  return useSyncExternalStore(
    desktopSubscribe,
    () => window.matchMedia(DESKTOP_NAVIGATION_QUERY).matches,
    () => false,
  );
}

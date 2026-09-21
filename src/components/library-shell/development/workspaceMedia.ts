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
 *   the bottom controls. Below it, phones and tablets keep both.
 * - Wide footer (`>= 1024px`): the platform footer opens its three menus into
 *   side-by-side columns instead of stacked accordions. `library-footer.css`
 *   keys its wide layout off the same width, so markup and layout agree.
 */
export const COMPACT_HEADER_QUERY = '(max-width: 1279px)';
export const DESKTOP_NAVIGATION_QUERY = '(min-width: 1024px)';
export const WIDE_FOOTER_QUERY = '(min-width: 1024px)';

function subscribe(query: string) {
  return (notify: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  };
}

const compactSubscribe = subscribe(COMPACT_HEADER_QUERY);
const desktopSubscribe = subscribe(DESKTOP_NAVIGATION_QUERY);
const wideFooterSubscribe = subscribe(WIDE_FOOTER_QUERY);
export function useCompactHeader() {
  return useSyncExternalStore(
    compactSubscribe,
    () => window.matchMedia(COMPACT_HEADER_QUERY).matches,
    () => false,
  );
}

/**
 * True only once the viewport is genuinely wide enough for the narrow rail.
 * Server and first paint answer `false`, so the drawer and bottom controls own
 * navigation until the desktop sidebar really fits.
 */
export function useDesktopNavigation() {
  return useSyncExternalStore(
    desktopSubscribe,
    () => window.matchMedia(DESKTOP_NAVIGATION_QUERY).matches,
    () => false,
  );
}

/** True where the footer has room to show every menu open beside the identity. */
export function useWideFooter() {
  return useSyncExternalStore(
    wideFooterSubscribe,
    () => window.matchMedia(WIDE_FOOTER_QUERY).matches,
    () => false,
  );
}

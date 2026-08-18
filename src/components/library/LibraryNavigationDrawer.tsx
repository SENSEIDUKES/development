import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';

import { cn } from './cn';
import { LibraryButton } from './LibraryButton';

/**
 * LibraryNavigationDrawer — the Celestial Library navigation drawer/menu shell.
 *
 * Ported from the SEIHouse UI repo's `SEINavigationDrawer`
 * (`UI/packages/seihouse-ui/src/layout/sei-navigation-drawer.tsx`, inspected
 * 2026-08-04). The original is built on the Base UI Dialog primitive and
 * SEIHouse theme CSS variables, which this repository does not carry; this
 * port keeps the same structure and mobile behavior (profile header, grouped
 * icon + label destinations, 44px rows, 85vw drawer capped at 20rem, scrim
 * tap / Escape / close button to dismiss, scroll lock, overscroll-contained
 * nav, safe-area bottom padding) on the Workshop stack: `motion` for the
 * slide transition and the Library theme tokens (void black, gold, portal
 * blue, Alegreya SC labels).
 *
 * The shell is presentational: the parent owns the open state, the selected
 * destination, and what happens on selection. `LibraryNavigationDrawerPanel`
 * is the content half and can also render standalone — e.g. as a static
 * desktop sidebar — while `LibraryNavigationDrawer` adds the mobile scrim and
 * slide-in behavior around it.
 *
 * The optional `profile` block at the top is a persistent placeholder for the
 * future Library profile tab/menu access. It renders no account behavior.
 */

export type LibraryNavigationDrawerAccent = 'portal' | 'gold';

export interface LibraryNavigationDrawerItem {
  /** Stable id used as the React key and passed to `onSelect`. */
  id: string;
  /** Visible label rendered next to the icon. */
  label: string;
  /** Decorative icon node (e.g. a Lucide icon), hidden from assistive tech. */
  icon?: React.ReactNode;
  /** Marks the item as the current destination (`aria-current="page"`). */
  active?: boolean;
  /** Active-row accent — portal blue or Library gold. Defaults to gold. */
  accent?: LibraryNavigationDrawerAccent;
  /** Renders a red `*` after the label for required destinations. */
  required?: boolean;
  /** Optional right-side status affordance (check, dot, chevron, …). */
  trailing?: React.ReactNode;
  /** Called with the item `id` when the item is selected. */
  onSelect?: (id: string) => void;
}

export interface LibraryNavigationDrawerSection {
  /** Stable id used as the React key. */
  id: string;
  /** Optional heading rendered above the section's items. */
  label?: string;
  /** Small secondary line under the heading. */
  tagline?: string;
  /** Decorative heading icon node, hidden from assistive tech. */
  icon?: React.ReactNode;
  /** Destinations grouped under this section. */
  items: LibraryNavigationDrawerItem[];
  /** Optional guidance rendered under the section's items. */
  footer?: React.ReactNode;
}

export interface LibraryNavigationDrawerProfile {
  /** Display name shown in the header; the first letter seeds the emblem. */
  name: string;
  /** Secondary line under the name (e.g. "Cultivator Profile"). */
  detail?: string;
  /** Small status label above the name. */
  eyebrow?: string;
  /** Custom emblem node. Defaults to a gold-rimmed initial medallion. */
  emblem?: React.ReactNode;
}

export interface LibraryNavigationDrawerPanelProps {
  /** Accessible label for the navigation landmark (required for a11y). */
  'aria-label': string;
  /** Grouped destinations rendered as icon + label rows. */
  sections: LibraryNavigationDrawerSection[];
  /** Optional profile placeholder pinned to the header. */
  profile?: LibraryNavigationDrawerProfile;
  /** When provided, a close button renders in the header. */
  onClose?: () => void;
  /** Accessible name for the header close button. */
  closeLabel?: string;
  className?: string;
}

const ROW_BASE = [
  // `py-3` keeps the row at a comfortable 44px+ touch target.
  'group relative flex w-full touch-manipulation items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left',
  'transition-[background,border-color,color,box-shadow,transform] duration-150',
  'motion-reduce:transition-none',
  'outline-none focus-visible:ring-2 focus-visible:ring-portal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
].join(' ');

const ROW_INACTIVE = [
  'border-white/[0.07] bg-white/[0.025] text-neutral-400',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_26px_-22px_rgba(0,0,0,0.9)]',
  'hover:border-white/[0.14] hover:bg-white/[0.055] hover:text-neutral-200',
].join(' ');

const ROW_ACTIVE: Record<LibraryNavigationDrawerAccent, string> = {
  portal: [
    'border-portal/55 bg-[linear-gradient(135deg,rgba(4,172,255,0.16),rgba(124,58,237,0.16)_48%,rgba(12,16,38,0.68))] text-signal',
    'shadow-[0_0_0_1px_rgba(159,196,255,0.08),0_0_24px_-8px_rgba(4,172,255,0.46),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_28px_-24px_rgba(167,139,250,0.65)]',
  ].join(' '),
  gold: [
    'border-gold-accent/45 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(124,58,237,0.12)_52%,rgba(12,16,38,0.68))] text-signal',
    'shadow-[0_0_0_1px_rgba(255,229,153,0.08),0_0_22px_-10px_rgba(212,175,55,0.5),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_28px_-24px_rgba(212,175,55,0.5)]',
  ].join(' '),
};

function DrawerRow({ item }: { item: LibraryNavigationDrawerItem }) {
  return (
    <button
      type="button"
      aria-current={item.active ? 'page' : undefined}
      data-selected={item.active ? 'true' : undefined}
      onClick={() => item.onSelect?.(item.id)}
      className={cn(ROW_BASE, item.active ? ROW_ACTIVE[item.accent ?? 'gold'] : ROW_INACTIVE)}
    >
      {item.active ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-1 w-1 rounded-full bg-gradient-to-b from-portal via-violet-300 to-gold-accent opacity-80 blur-[0.2px]"
        />
      ) : null}
      {item.icon ? (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-full border',
            'bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.11),rgba(124,58,237,0.09)_45%,rgba(5,8,20,0.62))]',
            item.active
              ? 'border-white/20 text-signal shadow-[0_0_18px_-7px_rgba(4,172,255,0.75)]'
              : 'border-white/10 text-neutral-500 group-hover:border-white/15 group-hover:text-neutral-300',
          )}
        >
          {item.icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate font-sc text-sm font-bold uppercase tracking-widest">
        {item.label}
        {item.required ? (
          <span className="ml-1 text-human" aria-label="required">*</span>
        ) : null}
      </span>
      {item.trailing ? (
        <span className="inline-flex shrink-0 items-center gap-1.5">{item.trailing}</span>
      ) : null}
    </button>
  );
}

/**
 * Presentational navigation content: an optional profile header with close
 * button, grouped icon + label destinations in a scrollable nav, and bottom
 * safe-area padding. Rendered inside `LibraryNavigationDrawer` on mobile;
 * also usable standalone (e.g. as a static desktop sidebar).
 */
export function LibraryNavigationDrawerPanel({
  sections,
  profile,
  onClose,
  closeLabel = 'Close menu',
  className,
  'aria-label': ariaLabel,
}: LibraryNavigationDrawerPanelProps) {
  const showHeader = Boolean(profile) || Boolean(onClose);

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-[radial-gradient(22rem_16rem_at_12%_0%,rgba(124,58,237,0.16),transparent_62%),radial-gradient(20rem_14rem_at_100%_18%,rgba(4,172,255,0.1),transparent_66%),linear-gradient(180deg,rgba(10,13,30,0.96),rgba(4,7,18,0.98))]', className)}>
      {showHeader ? (
        <div className="relative flex items-center gap-3 border-b border-white/10 pb-4 pl-[max(1rem,env(safe-area-inset-left))] pr-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-[inset_0_-1px_0_rgba(205,178,113,0.08)]">
          {profile ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {profile.emblem ?? (
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-gold-accent/45 bg-[radial-gradient(circle_at_50%_35%,rgba(212,175,55,0.22),rgba(124,58,237,0.12)_50%,rgba(0,0,0,0.45))] font-sc text-sm font-bold text-gold-accent shadow-[0_0_22px_-10px_rgba(212,175,55,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]"
                >
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 text-left">
                {profile.eyebrow ? (
                  <span className="mb-1 flex items-center gap-1.5 font-sc text-[9px] font-bold uppercase tracking-[0.24em] text-gold-accent/80">
                    <Sparkles size={10} aria-hidden="true" />
                    {profile.eyebrow}
                  </span>
                ) : null}
                <span className="block truncate font-serif text-base font-normal tracking-wide text-[#F3E2B0]">
                  {profile.name}
                </span>
                {profile.detail ? (
                  <span className="block truncate font-sans text-[11px] text-neutral-400">
                    {profile.detail}
                  </span>
                ) : null}
              </span>
            </div>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {onClose ? (
            <LibraryButton
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label={closeLabel}
              icon={X}
            />
          ) : null}
        </div>
      ) : null}

      <nav
        aria-label={ariaLabel}
        className="min-h-0 flex-1 overscroll-contain overflow-y-auto py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-3"
      >
        <div className="space-y-5">
          {sections.map(section => (
            <div
              key={section.id}
              role={section.label ? 'group' : undefined}
              aria-label={section.label}
            >
              {section.label ? (
                <div className="mb-2.5 flex items-center gap-2 px-3 after:h-px after:min-w-0 after:flex-1 after:bg-gradient-to-r after:from-white/10 after:via-white/5 after:to-transparent">
                  {section.icon ? (
                    <span aria-hidden="true" className="inline-flex shrink-0 items-center">
                      {section.icon}
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-sc text-[11px] font-bold uppercase tracking-[0.26em] text-neutral-400">
                      {section.label}
                    </p>
                    {section.tagline ? (
                      <p className="font-sans text-[10px] text-neutral-400">{section.tagline}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <ul className="space-y-2">
                {section.items.map(item => (
                  <li key={item.id}>
                    <DrawerRow item={item} />
                  </li>
                ))}
              </ul>
              {section.footer ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{section.footer}</div> : null}
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

export interface LibraryNavigationDrawerProps extends LibraryNavigationDrawerPanelProps {
  /** Controls visibility (controlled — the parent owns the state). */
  open: boolean;
  /** Called when the drawer asks to close (close button, Escape, scrim tap). */
  onClose: () => void;
  /**
   * Restrict the drawer to below the `lg` breakpoint (default true), where
   * the desktop layout renders `LibraryNavigationDrawerPanel` as a static
   * sidebar instead. Set false for surfaces that want the drawer on desktop.
   */
  mobileOnly?: boolean;
}

/**
 * Mobile navigation drawer that slides in from the left over a scrim.
 *
 * On phones the panel caps at 85vw so a scrim sliver (and its tap-to-close
 * affordance) stays visible; from `sm` up the compact 20rem width takes over.
 * Escape closes, body scroll locks while open, and the slide transition
 * collapses under `prefers-reduced-motion`. Presentational by design: the
 * parent owns selection state and closes via `onClose`.
 */
export function LibraryNavigationDrawer({
  open,
  onClose,
  mobileOnly = true,
  className,
  ...panelProps
}: LibraryNavigationDrawerProps) {
  const reduceMotion = useReducedMotion();

  // Escape closes the drawer — the Base UI original gets this from Dialog.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Lock body scroll while the drawer is open so only the nav list scrolls.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-[250]', mobileOnly && 'lg:hidden')}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="library-overlay-scrim absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label={panelProps['aria-label']}
            className={cn(
              'absolute inset-y-0 left-0 w-[85vw] max-w-xs overflow-hidden border-r border-white/15 bg-neutral-950/95',
              'shadow-[0_40px_120px_rgba(0,0,0,0.55)]',
              className,
            )}
          >
            <LibraryNavigationDrawerPanel {...panelProps} onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

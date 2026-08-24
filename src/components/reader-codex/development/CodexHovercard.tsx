import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, Swords, User } from 'lucide-react';
import { Character, Faction, Artifact, Location } from '../shared/types';
import { useAppStore } from '../shared/codexCompatibility';
import { SPECTRAL_EDGE } from '../../library/LibraryPanel';
import { LibraryDragonCycleIcon } from '../../library/LibraryDragonCycleIcon';
import { CodexCardAmbience } from './CodexCardAmbience';
import { getManifestBackdrop } from './codexManifestBackdrop';
import { getColorCodeStyle } from '../../reader-chamber/shared/colorCodes';
import { resolveCodexEntityAccent, resolveCodexEntityColorCode } from './codexEntityAccent';

interface CodexHovercardProps {
  term: string;
  type: 'character' | 'faction' | 'artifact' | 'location';
  entry: Character | Faction | Artifact | Location;
  children: React.ReactNode;
}

const DESKTOP_HOVERCARD_QUERY = '(min-width: 1280px) and (hover: hover) and (pointer: fine)';
const VIEWPORT_GUTTER = 16;
const TRIGGER_GAP = 8;

interface DesktopHovercardPosition {
  left: number;
  top: number;
}

/**
 * Reports whether the current viewport should use desktop contextual
 * placement (wide, hover-capable, fine pointer) instead of mobile docking.
 */
function matchesDesktopHovercardViewport(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(DESKTOP_HOVERCARD_QUERY).matches;
}

/**
 * The card's spectral-glass skin: the approved LibraryPanel/LibraryCard glass
 * recipe at hovercard scale — translucent black-blue depth, top-light falloff,
 * inner rim lighting, the masked 1px spectral edge — tinted by the entity's
 * own ambient accent through `--codex-card-accent`. No accent hairline: the
 * accent speaks through the aura, particles, border, rim glow, and seal, never
 * as a solid line across the top edge. The glass lives on the outer shell so
 * the scrollable content region never drags the spectral edge away.
 */
const HOVERCARD_GLASS_CLASS = [
  'pointer-events-auto relative w-56 sm:w-64 max-w-full overflow-hidden rounded-[1.35rem] border',
  'text-neutral-200 backdrop-blur-md backdrop-saturate-150',
  '[background-image:radial-gradient(130%_100%_at_50%_0%,rgba(130,180,255,0.09),transparent_52%),linear-gradient(168deg,rgba(205,225,255,0.09),rgba(255,255,255,0.02)_40%,rgba(3,6,12,0.14))]',
  'bg-[rgba(8,12,20,0.95)] supports-[backdrop-filter]:bg-[rgba(8,12,20,0.60)]',
  'border-[color-mix(in_srgb,var(--codex-card-accent)_34%,rgba(190,216,255,0.26))]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(150,195,255,0.07),0_18px_50px_rgba(0,0,0,0.6),0_0_42px_-10px_color-mix(in_srgb,var(--codex-card-accent)_50%,transparent)]',
  SPECTRAL_EDGE,
].join(' ');

/**
 * The Manifest seal matches the Codex Card's dragon-cycle portal at hovercard
 * scale: an enlarged `LibraryDragonCycleIcon` forms the entire boundary —
 * cyan head chasing violet tail — turning counterclockwise inside a soft
 * cyan→violet aura, around a dark glass core holding the Manifest label and
 * the awakening caption. The seal is the button: keyboard-operable, with the Manifesting
 * state inside the core. The Library glyph is reused unchanged and purely
 * decorative — two stacked `currentColor` copies, the cyan one masked so it
 * dissolves down the body, tint the single silhouette into the cyan→violet
 * gradient. The aura's conic gradient carries two diametrically opposed
 * bright bands so the blurred glow stays centered through the whole spin.
 * Every animation carries `motion-reduce:animate-none` so the seal rests
 * under `prefers-reduced-motion`.
 */
const SEAL_BUTTON_CLASS = [
  'codex-seal group/seal relative flex h-32 w-32 sm:h-36 sm:w-36 shrink-0 items-center justify-center rounded-full',
  'cursor-pointer transition-transform duration-300 active:scale-[0.97]',
  'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
  'focus-visible:ring-[rgba(4,172,255,0.7)]',
  'disabled:cursor-wait',
].join(' ');

const SEAL_AURA_CLASS = [
  'pointer-events-none absolute -inset-2 rounded-full blur-lg transition-opacity duration-500',
  'bg-[conic-gradient(from_210deg,#04ACFF,#7C5CFF_25%,#04ACFF_50%,#7C5CFF_75%,#04ACFF)]',
  'opacity-35 animate-[spin_26s_linear_infinite] motion-reduce:animate-none',
  'group-hover/seal:opacity-70 group-active/seal:opacity-80 group-disabled/seal:opacity-60',
].join(' ');

const SEAL_DRAGON_CLASS = [
  'pointer-events-none absolute inset-0',
  'animate-[spin_24s_linear_infinite_reverse] motion-reduce:animate-none',
  '[filter:drop-shadow(0_0_9px_rgba(4,172,255,0.42))_drop-shadow(0_0_26px_rgba(124,92,255,0.36))]',
  'transition-[filter] duration-500',
  'group-hover/seal:[filter:drop-shadow(0_0_13px_rgba(4,172,255,0.62))_drop-shadow(0_0_38px_rgba(124,92,255,0.55))]',
  'group-active/seal:[filter:drop-shadow(0_0_15px_rgba(4,172,255,0.72))_drop-shadow(0_0_44px_rgba(124,92,255,0.62))]',
].join(' ');

const SEAL_DRAGON_VIOLET_CLASS = 'absolute inset-0 h-full w-full text-[#7C5CFF]';

// The cyan twin wears a vertical mask so it owns the head and upper coil and
// dissolves before the tail — the single-tone glyph reads as one cyan→violet
// dragon without touching the shared primitive.
const SEAL_DRAGON_CYAN_CLASS = [
  'absolute inset-0 h-full w-full text-[#04ACFF]',
  '[-webkit-mask-image:linear-gradient(180deg,black_15%,transparent_68%)]',
  '[mask-image:linear-gradient(180deg,black_15%,transparent_68%)]',
].join(' ');

const SEAL_CORE_CLASS = [
  'relative z-10 flex h-[58%] w-[58%] flex-col items-center justify-center gap-1 rounded-full',
  'border border-white/10 bg-[rgba(1,11,20,0.72)] backdrop-blur-sm',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
].join(' ');

/**
 * Highlighted-term Codex card: the trigger is the entity name inline in the
 * Reader prose; clicking, tapping, or keyboard-activating it opens the
 * spectral-glass hovercard in a portal — docked at the safe viewport edge on
 * mobile, contextually placed and clamped near the term on desktop. Carries
 * the entity ambient accent, the mote field, the story's Manifest backdrop
 * behind the glass until a portrait exists, and the dragon-cycle Manifest
 * seal (matching the Codex Card) for eligible entries.
 */
export const CodexHovercard: React.FC<CodexHovercardProps> = ({ type, entry, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPortalMounted, setIsPortalMounted] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openedWithKeyboardRef = useRef(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(matchesDesktopHovercardViewport);
  const [desktopPosition, setDesktopPosition] = useState<DesktopHovercardPosition | null>(null);
  const persistedImageUrl = 'imageUrl' in entry ? entry.imageUrl : undefined;
  const imageAssetId = entry.imageAssetId;
  const [localImageUrl, setLocalImageUrl] = useState<string>();
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const imageUrl = persistedImageUrl || localImageUrl;
  const canManifestImage = type !== 'faction';

  /**
   * Runs the local one-off manifestation: builds a deterministic placeholder
   * portrait SVG for the entry and keeps it component-local, matching the
   * Workshop compatibility boundary (no production image pipeline).
   */
  const handleManifest = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      await Promise.resolve();
      const safeName = entry.name.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
      }[character] || character));
      const hue = [...entry.id].reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="384" viewBox="0 0 768 384"><defs><radialGradient id="a"><stop stop-color="hsl(${hue} 70% 32%)"/><stop offset="1" stop-color="#03050a"/></radialGradient></defs><rect width="768" height="384" fill="url(#a)"/><circle cx="384" cy="160" r="105" fill="none" stroke="hsla(${hue} 90% 75% / .4)"/><text x="384" y="315" text-anchor="middle" fill="#fafafa" font-family="serif" font-size="34" letter-spacing="3">${safeName}</text></svg>`;
      setLocalImageUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const activeStoryId = useAppStore((state) => state.activeStoryId);
  const activeStory = useAppStore((state) =>
    state.stories.find((s) => s.id === activeStoryId)
  );

  const colorCode = resolveCodexEntityColorCode(type, entry, activeStory?.mcName);
  const colorCodeStyle = getColorCodeStyle(colorCode);
  const accent = resolveCodexEntityAccent(type, entry, activeStory?.mcName);
  // The story's assigned Manifest backdrop wins when present; otherwise the
  // stable pool pick, so the card always shows the same art for an entity.
  const manifestBackdrop = activeStory?.assignedRevealBackdrops?.[entry.id] ?? getManifestBackdrop(entry.id);

  /** The entity-type icon inherits the shared Color Code. */
  const getIcon = () => {
    switch (type) {
      case 'character': return <User size={14} className="text-current" style={colorCodeStyle} />;
      case 'faction': return <Shield size={14} className="text-current" style={colorCodeStyle} />;
      case 'artifact': return <Swords size={14} className="text-current" style={colorCodeStyle} />;
      case 'location': return <MapPin size={14} className="text-current" style={colorCodeStyle} />;
      default: return null;
    }
  };

  /**
   * The trigger text classes for the story's configured highlight style
   * (`full`, `underline`, or `tint`), all colored by the shared Color Code.
   */
  const getTextStyles = () => {
    const highlightStyle = activeStory?.readerPreferences?.highlightStyle || 'full';
    if (highlightStyle === 'underline') {
      return 'text-current font-medium px-0.5 cursor-pointer transition-colors border-b border-dashed border-[color-mix(in_srgb,currentColor_30%,transparent)] hover:bg-neutral-800/10';
    } else if (highlightStyle === 'tint') {
      return 'text-current font-medium px-0.5 cursor-pointer transition-all duration-300 hover:bg-neutral-800/10 rounded-sm';
    }
    return 'text-current bg-[color-mix(in_srgb,currentColor_10%,transparent)] font-medium px-1 rounded-sm cursor-pointer hover:bg-[color-mix(in_srgb,currentColor_20%,transparent)] transition-colors border-b border-[color-mix(in_srgb,currentColor_30%,transparent)]';
  };

  useEffect(() => {
    /** Closes the card when the press lands outside both trigger and card. */
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || cardRef.current?.contains(target)) return;
      cardRef.current?.removeAttribute('data-slot');
      setIsOpen(false);
    };

    /** Closes the card on Escape and returns focus to the highlighted term. */
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cardRef.current?.removeAttribute('data-slot');
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !isPortalMounted || !openedWithKeyboardRef.current) return;
    openedWithKeyboardRef.current = false;
    cardRef.current?.focus();
  }, [isOpen, isPortalMounted]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia(DESKTOP_HOVERCARD_QUERY);
    /** Keeps the docking mode in sync when the viewport crosses the breakpoint. */
    const syncViewportMode = () => setIsDesktopViewport(mediaQuery.matches);
    syncViewportMode();
    mediaQuery.addEventListener('change', syncViewportMode);
    return () => mediaQuery.removeEventListener('change', syncViewportMode);
  }, []);

  useLayoutEffect(() => {
    if (!isPortalMounted || !isDesktopViewport) {
      setDesktopPosition(null);
      return;
    }
    if (!isOpen) return;

    /**
     * Computes the desktop card position: centered on the trigger, clamped to
     * the safe viewport gutter, flipped above the trigger when there is no
     * room below.
     */
    const updateDesktopPosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const card = cardRef.current;
      if (!trigger || !card) return;

      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const safeLeft = viewportLeft + VIEWPORT_GUTTER;
      const safeTop = viewportTop + VIEWPORT_GUTTER;
      const safeRight = viewportLeft + viewportWidth - VIEWPORT_GUTTER;
      const safeBottom = viewportTop + viewportHeight - VIEWPORT_GUTTER;
      const cardRect = card.getBoundingClientRect();
      const cardWidth = card.offsetWidth || cardRect.width;
      const cardHeight = card.offsetHeight || cardRect.height;

      const centeredLeft = trigger.left + (trigger.width / 2) - (cardWidth / 2);
      const left = Math.min(Math.max(centeredLeft, safeLeft), Math.max(safeLeft, safeRight - cardWidth));
      const belowTop = trigger.bottom + TRIGGER_GAP;
      const aboveTop = trigger.top - TRIGGER_GAP - cardHeight;
      const hasRoomBelow = belowTop + cardHeight <= safeBottom;
      const hasRoomAbove = aboveTop >= safeTop;
      const preferredTop = hasRoomBelow || !hasRoomAbove ? belowTop : aboveTop;
      const top = Math.min(Math.max(preferredTop, safeTop), Math.max(safeTop, safeBottom - cardHeight));

      setDesktopPosition((current) => (
        current?.left === left && current.top === top ? current : { left, top }
      ));
    };

    let positionFrame = 0;
    /** Coalesces position recalculations onto the next animation frame. */
    const scheduleDesktopPosition = () => {
      if (positionFrame) return;
      positionFrame = window.requestAnimationFrame(() => {
        positionFrame = 0;
        updateDesktopPosition();
      });
    };

    updateDesktopPosition();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleDesktopPosition);
    if (resizeObserver && cardRef.current) resizeObserver.observe(cardRef.current);

    window.addEventListener('resize', scheduleDesktopPosition);
    window.addEventListener('scroll', scheduleDesktopPosition, { capture: true, passive: true });
    window.visualViewport?.addEventListener('resize', scheduleDesktopPosition);
    window.visualViewport?.addEventListener('scroll', scheduleDesktopPosition);

    return () => {
      if (positionFrame) window.cancelAnimationFrame(positionFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleDesktopPosition);
      window.removeEventListener('scroll', scheduleDesktopPosition, true);
      window.visualViewport?.removeEventListener('resize', scheduleDesktopPosition);
      window.visualViewport?.removeEventListener('scroll', scheduleDesktopPosition);
    };
  }, [imageUrl, isDesktopViewport, isGeneratingImage, isOpen, isPortalMounted]);

  /**
   * Toggles the hovercard. Keyboard opens are remembered so focus can move
   * into the portal card once it mounts.
   */
  const handleToggle = (
    e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent,
    openedWithKeyboard = false,
  ) => {
    e.stopPropagation();
    const nextOpen = !isOpen;
    openedWithKeyboardRef.current = nextOpen && openedWithKeyboard;
    if (nextOpen) {
      setIsPortalMounted(true);
    } else {
      cardRef.current?.removeAttribute('data-slot');
    }
    setIsOpen(nextOpen);
  };

  const hovercardLayer = typeof document === 'undefined' || !isPortalMounted ? null : createPortal(
    <div
      data-slot="codex-hovercard-layer"
      className={`fixed z-[100] pointer-events-none ${isDesktopViewport ? '' : 'flex items-start justify-end'}`}
      style={isDesktopViewport ? {
        left: desktopPosition?.left ?? 0,
        top: desktopPosition?.top ?? 0,
        visibility: desktopPosition ? 'visible' : 'hidden',
      } : {
        top: 'max(1rem, env(safe-area-inset-top, 0px))',
        right: 'max(1rem, env(safe-area-inset-right, 0px))',
        bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        left: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingBlock: 'min(5.5rem, 15dvh)',
      }}
    >
      <AnimatePresence onExitComplete={() => {
        if (!isOpen) setIsPortalMounted(false);
      }}>
        {isOpen && (
          <motion.div
            ref={cardRef}
            data-slot="codex-hovercard"
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={HOVERCARD_GLASS_CLASS}
            style={{ ...colorCodeStyle, '--codex-card-accent': accent } as CSSProperties}
            data-color-code={colorCode}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`${entry.name} Codex details`}
            tabIndex={-1}
          >
            {!imageUrl && (
              <>
                <img
                  src={manifestBackdrop}
                  alt=""
                  aria-hidden="true"
                  data-slot="manifest-backdrop"
                  className="absolute inset-0 h-full w-full object-cover opacity-[0.25] pointer-events-none mix-blend-screen"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent pointer-events-none" />
              </>
            )}
            <CodexCardAmbience accent={accent} />
            <div
              data-slot="codex-hovercard-content"
              className="relative z-10 overflow-y-auto overscroll-contain p-3"
              style={{
                maxHeight: isDesktopViewport
                  ? 'calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
                  : 'min(42dvh, 100%)',
              }}
            >
              {imageUrl ? (
                <div className="w-full mb-2.5 overflow-hidden rounded-lg bg-neutral-900 border border-[color-mix(in_srgb,var(--codex-card-accent)_28%,#262626)] shadow-[0_0_22px_-8px_color-mix(in_srgb,var(--codex-card-accent)_45%,transparent)] flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt={entry.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="block w-full h-auto object-contain"
                  />
                </div>
              ) : (
                canManifestImage && !imageAssetId && (
                  <div className="mb-2.5 flex items-center justify-center py-1">
                    <button
                      type="button"
                      onClick={handleManifest}
                      disabled={isGeneratingImage}
                      aria-busy={isGeneratingImage || undefined}
                      aria-label={isGeneratingImage ? `Manifesting portrait for ${entry.name}` : `Manifest portrait for ${entry.name}`}
                      className={SEAL_BUTTON_CLASS}
                    >
                      <span aria-hidden="true" className={SEAL_AURA_CLASS} />
                      <span aria-hidden="true" className={SEAL_DRAGON_CLASS}>
                        <LibraryDragonCycleIcon className={SEAL_DRAGON_VIOLET_CLASS} />
                        <LibraryDragonCycleIcon className={SEAL_DRAGON_CYAN_CLASS} />
                      </span>
                      <span className={SEAL_CORE_CLASS}>
                        {isGeneratingImage ? (
                          <>
                            <LibraryDragonCycleIcon className="h-4 w-4 text-cyan-300 animate-spin motion-reduce:animate-none drop-shadow-[0_0_6px_rgba(4,172,255,0.6)]" />
                            <span className="font-mono text-[8px] text-cyan-300 uppercase tracking-widest animate-pulse motion-reduce:animate-none font-medium">
                              Manifesting...
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-violet-300 text-xs transition-transform duration-300 group-hover/seal:scale-110">✦</span>
                            <span className="font-sc text-[10px] text-signal tracking-widest font-bold uppercase">
                              Manifest
                            </span>
                            <span className="font-mono text-[7px] text-neutral-400 tracking-wider">
                              Awaken Portrait
                            </span>
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                )
              )}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[color-mix(in_srgb,var(--codex-card-accent)_20%,#262626)] flex-wrap">
                {getIcon()}
                <span className="font-display font-medium text-sm text-signal">
                  {entry.name}
                </span>
              </div>

              <p className="text-xs text-neutral-400 font-sans leading-relaxed line-clamp-4">
                {entry.description}
              </p>

              {type === 'character' && (entry as Character).role && (
                <div className="mt-2 text-[10px] text-portal uppercase tracking-wider font-bold">
                  {(entry as Character).role}
                </div>
              )}
              {type === 'artifact' && (entry as Artifact).tier && (
                <div className="mt-2 text-[10px] text-current uppercase tracking-wider font-bold" style={colorCodeStyle}>
                  Tier: {(entry as Artifact).tier}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );

  return (
    <span data-slot="codex-hovercard-anchor" data-color-code={colorCode} className="relative inline-block" ref={containerRef}>
      <span
        ref={triggerRef}
        data-color-code={colorCode}
        className={getTextStyles()}
        style={colorCodeStyle}
        onClick={handleToggle}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleToggle(e);
        }}
        role="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle(e, true);
          }
        }}
      >
        {children}
      </span>
      {hovercardLayer}
    </span>
  );
};

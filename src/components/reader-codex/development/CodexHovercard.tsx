import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, Swords, User, Loader2 } from 'lucide-react';
import { Character, Faction, Artifact, Location } from '../shared/types';
import { useAppStore } from '../shared/codexCompatibility';
import { SPECTRAL_EDGE } from '../../library/LibraryPanel';
import { CodexCardAmbience } from './CodexCardAmbience';
import { resolveCodexEntityAccent, resolveCodexEntityBand } from './codexEntityAccent';
import type { CodexEntityBand } from './codexEntityAccent';

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

const SEAL_RING_OUTER_CLASS = [
  'pointer-events-none absolute inset-0 rounded-full border border-dashed',
  'border-[color-mix(in_srgb,var(--codex-card-accent)_32%,transparent)]',
  'animate-[spin_12s_linear_infinite] motion-reduce:animate-none',
  'transition-colors duration-500 group-hover/seal:border-[color-mix(in_srgb,var(--codex-card-accent)_55%,transparent)]',
].join(' ');

const SEAL_RING_INNER_CLASS = [
  'pointer-events-none absolute inset-[8px] rounded-full border border-dotted',
  'border-[color-mix(in_srgb,var(--codex-card-accent)_18%,transparent)]',
  'animate-[spin_20s_linear_infinite_reverse] motion-reduce:animate-none',
  'transition-colors duration-500 group-hover/seal:border-[color-mix(in_srgb,var(--codex-card-accent)_38%,transparent)]',
].join(' ');

const SEAL_CORE_GLOW_CLASS = [
  'pointer-events-none absolute inset-[14px] rounded-full animate-pulse',
  'bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--codex-card-accent)_22%,transparent)_0%,transparent_70%)]',
].join(' ');

const SEAL_BUTTON_CLASS = [
  'relative z-10 flex h-[5.5rem] w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-full',
  'border border-[color-mix(in_srgb,var(--codex-card-accent)_42%,transparent)]',
  'bg-[rgba(1,11,20,0.72)] backdrop-blur-sm cursor-pointer transition-all duration-500',
  'shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--codex-card-accent)_40%,transparent)]',
  'hover:border-[color-mix(in_srgb,var(--codex-card-accent)_85%,transparent)]',
  'hover:shadow-[0_0_26px_-4px_color-mix(in_srgb,var(--codex-card-accent)_60%,transparent)]',
  'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
  'focus-visible:ring-[color-mix(in_srgb,var(--codex-card-accent)_70%,transparent)]',
  'disabled:cursor-wait',
].join(' ');

/**
 * Tailwind class bundle the highlighted-term trigger wears per entity band.
 * Keyed by the shared `resolveCodexEntityBand` classification so the prose
 * highlight always agrees with the card ambience resolved from the same band.
 */
interface CodexBandTheme {
  text: string;
  bg: string;
  border: string;
  hoverBg: string;
  icon: string;
}

const PORTAL_BAND_THEME: CodexBandTheme = {
  text: 'text-portal',
  bg: 'bg-portal/10',
  border: 'border-portal/30',
  hoverBg: 'hover:bg-portal/20',
  icon: 'text-portal',
};

const GOLD_BAND_THEME: CodexBandTheme = {
  text: 'text-[#d4af37]',
  bg: 'bg-[#d4af37]/10',
  border: 'border-[#d4af37]/30',
  hoverBg: 'hover:bg-[#d4af37]/20',
  icon: 'text-[#d4af37]',
};

const CODEX_BAND_THEME: Record<CodexEntityBand, CodexBandTheme> = {
  protagonist: PORTAL_BAND_THEME,
  fallback: PORTAL_BAND_THEME,
  bond: { text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30', hoverBg: 'hover:bg-pink-400/20', icon: 'text-pink-400' },
  gold: GOLD_BAND_THEME,
  ally: { text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', hoverBg: 'hover:bg-green-400/20', icon: 'text-green-400' },
  hostile: { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', hoverBg: 'hover:bg-red-500/20', icon: 'text-red-500' },
  mystery: { text: 'text-neutral-400', bg: 'bg-neutral-400/10', border: 'border-neutral-400/30', hoverBg: 'hover:bg-neutral-400/20', icon: 'text-neutral-400' },
  nonHuman: { text: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/30', hoverBg: 'hover:bg-violet-400/20', icon: 'text-violet-400' },
  artifactGreat: { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', hoverBg: 'hover:bg-orange-400/20', icon: 'text-orange-400' },
  artifactGood: { text: 'text-[#04ACFF]', bg: 'bg-[#04ACFF]/10', border: 'border-[#04ACFF]/30', hoverBg: 'hover:bg-[#04ACFF]/20', icon: 'text-[#04ACFF]' },
  artifactModest: { text: 'text-[#2DD4BF]', bg: 'bg-[#2DD4BF]/10', border: 'border-[#2DD4BF]/30', hoverBg: 'hover:bg-[#2DD4BF]/20', icon: 'text-[#2DD4BF]' },
  artifactPlain: { text: 'text-white', bg: 'bg-white/10', border: 'border-white/30', hoverBg: 'hover:bg-white/20', icon: 'text-white' },
  location: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', hoverBg: 'hover:bg-purple-400/20', icon: 'text-purple-400' },
  faction: { text: 'text-[#b9d6c1]', bg: 'bg-[#0f5132]/20', border: 'border-[#0f5132]/30', hoverBg: 'hover:bg-[#0f5132]/40', icon: 'text-[#0f5132]' },
};

/**
 * Highlighted-term Codex card: the trigger is the entity name inline in the
 * Reader prose; clicking, tapping, or keyboard-activating it opens the
 * spectral-glass hovercard in a portal — docked at the safe viewport edge on
 * mobile, contextually placed and clamped near the term on desktop. Carries
 * the entity ambient accent, the mote field, and the circular Manifest seal
 * for eligible entries.
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

  const accent = resolveCodexEntityAccent(type, entry, activeStory?.mcName);
  const theme = CODEX_BAND_THEME[resolveCodexEntityBand(type, entry, activeStory?.mcName)];

  /** The entity-type icon shown in the card header, tinted by the band theme. */
  const getIcon = () => {
    switch (type) {
      case 'character': return <User size={14} className={theme.icon} />;
      case 'faction': return <Shield size={14} className={theme.icon} />;
      case 'artifact': return <Swords size={14} className={theme.icon} />;
      case 'location': return <MapPin size={14} className={theme.icon} />;
      default: return null;
    }
  };

  /**
   * The trigger text classes for the story's configured highlight style
   * (`full`, `underline`, or `tint`), all colored by the band theme.
   */
  const getTextStyles = () => {
    const highlightStyle = activeStory?.readerPreferences?.highlightStyle || 'full';
    if (highlightStyle === 'underline') {
      return `${theme.text} font-medium px-0.5 cursor-pointer transition-colors border-b border-dashed ${theme.border} hover:bg-neutral-800/10`;
    } else if (highlightStyle === 'tint') {
      return `${theme.text} font-medium px-0.5 cursor-pointer transition-all duration-300 hover:bg-neutral-800/10 rounded-sm`;
    }
    return `${theme.text} ${theme.bg} font-medium px-1 rounded-sm cursor-pointer ${theme.hoverBg} transition-colors border-b ${theme.border}`;
  };

  useEffect(() => {
    /** Closes the card when the press lands outside both trigger and card. */
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || cardRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    /** Closes the card on Escape and returns focus to the highlighted term. */
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
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
    if (nextOpen) setIsPortalMounted(true);
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
            style={{ '--codex-card-accent': accent } as CSSProperties}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`${entry.name} Codex details`}
            tabIndex={-1}
          >
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
                  <div className="mb-2.5 flex flex-col items-center gap-1.5">
                    <div className="group/seal relative flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center">
                      <div className={SEAL_RING_OUTER_CLASS} />
                      <div className={SEAL_RING_INNER_CLASS} />
                      <div className={SEAL_CORE_GLOW_CLASS} />
                      <button
                        type="button"
                        onClick={handleManifest}
                        disabled={isGeneratingImage}
                        aria-label={isGeneratingImage ? `Summoning portrait for ${entry.name}` : `Manifest portrait for ${entry.name}`}
                        className={SEAL_BUTTON_CLASS}
                      >
                        {isGeneratingImage ? (
                          <>
                            <Loader2 size={18} className="text-[var(--codex-card-accent)] animate-spin" />
                            <span className="font-mono text-[9px] text-[var(--codex-card-accent)] uppercase tracking-widest animate-pulse font-medium">
                              Summoning...
                            </span>
                          </>
                        ) : (
                          <span className="flex flex-col items-center gap-1.5 transition-transform duration-300 group-hover/seal:scale-105">
                            <span className="text-[var(--codex-card-accent)] text-sm group-hover/seal:animate-bounce">✦</span>
                            <span className="font-sc text-[10px] text-signal tracking-widest font-bold uppercase">
                              Manifest
                            </span>
                          </span>
                        )}
                      </button>
                    </div>
                    <span className="font-mono text-[9px] text-neutral-500 tracking-wider">
                      Awaken Aetherial Portrait
                    </span>
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
                <div className="mt-2 text-[10px] text-[#d4af37] uppercase tracking-wider font-bold">
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
    <span className="relative inline-block" ref={containerRef}>
      <span
        ref={triggerRef}
        className={getTextStyles()}
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

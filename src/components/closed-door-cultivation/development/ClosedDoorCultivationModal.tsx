import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const PORTAL_RGB = '4,172,255';
const COLLAPSE_AFTER_MS = 7000;
const CLAIM_CLOSE_MS = 2500;

/**
 * Progression lines keyed by days spent in the Library. The highest reached
 * threshold wins, so the message grows more prestigious the longer the path.
 */
const PROGRESSION_QUOTES: ReadonlyArray<readonly [minDays: number, quote: string]> = [
  [0, 'Your cultivation begins.'],
  [1, 'The first step has been taken.'],
  [3, 'Still finding your footing.'],
  [7, 'Just getting your feet wet.'],
  [10, 'The Library is becoming familiar.'],
  [14, 'Two weeks upon the path.'],
  [21, 'Your roots are beginning to take hold.'],
  [30, 'One month of steady cultivation.'],
  [40, 'The path no longer feels foreign.'],
  [50, 'Your foundation grows stronger.'],
  [60, 'Two months within the Library.'],
  [70, 'Consistency has become discipline.'],
  [80, 'Your presence has taken root.'],
  [90, 'A full season of cultivation.'],
  [105, 'The novice days are behind you.'],
  [120, 'Your foundation is firmly established.'],
  [135, 'The Library remembers your footsteps.'],
  [150, 'Few paths are walked this faithfully.'],
  [165, 'Your dedication speaks for itself.'],
  [180, 'Half a year upon the path.'],
];

/** Timeless lines occasionally mixed in between the progression quotes. */
const TIMELESS_QUOTES: readonly string[] = [
  'Even the longest paths begin in silence.',
  'The heavens favor those who return.',
  'A quiet mind gathers boundless Qi.',
  "Today's effort shapes tomorrow's realm.",
  'Some breakthroughs happen when no one is watching.',
];

function progressionQuote(days: number): string {
  let quote = PROGRESSION_QUOTES[0][1];
  for (const [minDays, q] of PROGRESSION_QUOTES) {
    if (days < minDays) break;
    quote = q;
  }
  return quote;
}

/** Heuristic for weaker hardware: trim effect density instead of dropping atmosphere. */
function isLowPowerDevice(): boolean {
  return typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4;
}

interface Absorb {
  /** cloud center + size (particle spawn area) and dantian point, in viewport coords */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  ex: number;
  ey: number;
}

interface Flight {
  /** cultivator center + target emblem point, in viewport coords */
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

/** Silhouette of a cross-legged cultivator: deep navy robes, thin cyan rim light, no face. */
function CultivatorSvg({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const robeGradId = `cdc-robe-${useId()}`;
  return (
    <svg viewBox="0 0 120 100" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={robeGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#101a30" />
          <stop offset="100%" stopColor="#04060d" />
        </linearGradient>
      </defs>
      {/* meditation platform rings */}
      <ellipse cx="60" cy="92" rx="46" ry="5.5" fill="none" stroke={`rgba(${PORTAL_RGB},0.28)`} strokeWidth="0.8" />
      <ellipse cx="60" cy="92" rx="54" ry="7.5" fill="none" stroke={`rgba(${PORTAL_RGB},0.12)`} strokeWidth="0.6" />
      <g stroke="rgba(140,233,255,0.55)" strokeWidth="0.7">
        {/* neck */}
        <path d="M56.5 25.5 L63.5 25.5 L63 31 L57 31 Z" fill="#04060d" stroke="none" />
        {/* crossed legs: low wide mound, knees poking above the lap */}
        <path
          d="M60 66.5 C53 63 44 61 36.5 61.5 C30.5 62 26 63.5 23.5 66 C20.5 69 18.5 72.5 18.5 76 C18.5 80.5 22 84.5 28.5 87 C36 89.8 48 91 60 91 C72 91 84 89.8 91.5 87 C98 84.5 101.5 80.5 101.5 76 C101.5 72.5 99.5 69 96.5 66 C94 63.5 89.5 62 83.5 61.5 C76 61 67 63 60 66.5 Z"
          fill={`url(#${robeGradId})`}
        />
        {/* torso: shoulders, tapered robe, forearms folding into the lap */}
        <path
          d="M54.5 30 C50.5 31 47 32.5 45 34.5 C43.5 36.5 42.8 39 42.5 42 C42 46 41.5 50 40.8 53.5 C40.3 56 39.5 58 38.5 59.5 C42.5 63 50 65.5 60 65.5 C70 65.5 77.5 63 81.5 59.5 C80.5 58 79.7 56 79.2 53.5 C78.5 50 78 46 77.5 42 C77.2 39 76.5 36.5 75 34.5 C73 32.5 69.5 31 65.5 30 Z"
          fill={`url(#${robeGradId})`}
        />
        {/* robe fold pooling between the legs */}
        <path d="M60 69 C60 75 59.5 83 60 89.5" fill="none" stroke="rgba(140,233,255,0.28)" strokeWidth="0.6" />
        {/* folded hands resting in the lap */}
        <ellipse cx="60" cy="65" rx="6" ry="2.8" fill="#0d1626" stroke="rgba(140,233,255,0.4)" strokeWidth="0.5" />
        {/* head + topknot */}
        <circle cx="60" cy="21" r="6.5" fill="#04060d" />
        <ellipse cx="60" cy="12.5" rx="2.2" ry="2.8" fill="#04060d" />
      </g>
    </svg>
  );
}

/** The meditating figure with its breathing aura. Flares once as the claimed qi pours into its dantian, then disperses upward toward the target emblem. */
function CultivatorFigure({ claiming, calm = false }: { claiming: boolean; calm?: boolean }) {
  return (
    <motion.div
      className="relative w-32 h-28 sm:w-36 sm:h-32 lg:w-48 lg:h-40"
      animate={
        claiming
          ? {
              opacity: [1, 1, 1, 0],
              y: [0, 0, 0, -14],
              filter: ['brightness(1) blur(0px)', 'brightness(1.8) blur(0px)', 'brightness(1.1) blur(0px)', 'brightness(1) blur(6px)'],
            }
          : { opacity: 1, y: 0, filter: 'brightness(1) blur(0px)' }
      }
      transition={claiming ? { duration: 2.0, delay: 0.4, times: [0, 0.25, 0.55, 1], ease: 'easeOut' } : { duration: 0.6 }}
    >
      {/* soft cyan aura breathing around the body; flashes once as the qi lands */}
      <motion.div
        className="absolute -inset-[18%] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 65%, rgba(${PORTAL_RGB},0.45) 0%, rgba(${PORTAL_RGB},0.12) 45%, transparent 70%)`,
          filter: 'blur(6px)',
        }}
        animate={
          claiming
            ? { opacity: [0.5, 1, 0], scale: [1, 1.35, 1.1] }
            : calm
              ? { opacity: 0.5, scale: 1 }
              : { opacity: [0.35, 0.65, 0.35], scale: [1, 1.12, 1] }
        }
        transition={
          claiming
            ? { duration: 1.0, delay: 0.5, times: [0, 0.35, 1] }
            : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }
        }
      />
      <CultivatorSvg
        className="relative w-full h-full"
        style={{ filter: `drop-shadow(0 0 6px rgba(${PORTAL_RGB},0.35))` }}
      />
      {/* qi motes drifting up from the cultivator */}
      {!claiming && !calm &&
        [0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[18%] w-1 h-1 rounded-full"
            style={{
              background: 'rgba(160,240,255,0.9)',
              boxShadow: `0 0 6px rgba(${PORTAL_RGB},0.9)`,
              x: (i - 1) * 10,
            }}
            animate={{ y: [-2, -20], opacity: [0, 0.9, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
          />
        ))}
    </motion.div>
  );
}

/**
 * The qi cloud breaking apart on claim: particles scatter for an instant,
 * then stream downward and converge into the cultivator's dantian, which
 * answers with one soft pulse of light. ~1s of motion, then the veil lifts.
 */
function CloudAbsorb({ absorb }: { absorb: Absorb }) {
  const { sx, sy, sw, sh, ex, ey } = absorb;
  const lowPower = useReducedMotion() || isLowPowerDevice();
  // Freeze the random particle paths per claim so unrelated re-renders don't retarget the burst.
  const particles = useMemo(() => {
    return Array.from({ length: lowPower ? 14 : 30 }).map((_, i) => {
      const startX = sx + (Math.random() - 0.5) * sw * 0.9;
      const startY = sy + (Math.random() - 0.5) * sh * 0.8;
      // brief outward scatter before the suction pulls everything down
      const scatterX = startX + (Math.random() - 0.5) * 44;
      const scatterY = startY - 6 - Math.random() * 14;
      // bend toward the dantian through a point partway down
      const bendX = startX + (ex - startX) * 0.55 + (Math.random() - 0.5) * 26;
      const bendY = startY + (ey - startY) * 0.55;
      return {
        startX, startY, scatterX, scatterY, bendX, bendY,
        duration: 0.5 + Math.random() * 0.2,
        delay: i * 0.008 + Math.random() * 0.1,
        size: 2 + Math.random() * 3,
      };
    });
  }, [absorb, lowPower]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: '#a5f3fc',
            boxShadow: `0 0 8px rgba(${PORTAL_RGB},1), 0 0 16px rgba(${PORTAL_RGB},0.6)`,
            filter: 'blur(0.5px)',
          }}
          initial={{ x: p.startX, y: p.startY, opacity: 0, scale: 0.4 }}
          animate={{
            x: [p.startX, p.scatterX, p.bendX, ex],
            y: [p.startY, p.scatterY, p.bendY, ey],
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1, 0.9, 0.3],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn', times: [0, 0.22, 0.72, 1] }}
        />
      ))}
      {/* dantian flare as the qi lands */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: ex,
          top: ey,
          width: 72,
          height: 72,
          x: '-50%',
          y: '-50%',
          background: `radial-gradient(circle, rgba(${PORTAL_RGB},0.9) 0%, rgba(${PORTAL_RGB},0.3) 45%, transparent 70%)`,
          filter: 'blur(5px)',
        }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 1, 0], scale: [0.4, 1.25, 1.7] }}
        transition={{ duration: 0.8, delay: 0.55, times: [0, 0.3, 1] }}
      />
      {/* one soft expanding ring — the cultivator's answering pulse */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          left: ex,
          top: ey,
          width: 56,
          height: 56,
          x: '-50%',
          y: '-50%',
          borderColor: `rgba(${PORTAL_RGB},0.7)`,
          boxShadow: `0 0 12px rgba(${PORTAL_RGB},0.5), inset 0 0 12px rgba(${PORTAL_RGB},0.35)`,
        }}
        initial={{ opacity: 0, scale: 0.35 }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.35, 1.6, 2.6] }}
        transition={{ duration: 0.85, delay: 0.6, times: [0, 0.25, 1], ease: 'easeOut' }}
      />
    </div>
  );
}

/**
 * Final claim phase: the charged cultivator disperses into qi that spirals
 * up into the target emblem. Starts after the dantian absorption (~1s in).
 */
function QiFlight({ flight }: { flight: Flight }) {
  const { sx, sy, ex, ey } = flight;
  const lowPower = useReducedMotion() || isLowPowerDevice();
  // Freeze the random particle paths per claim so unrelated re-renders don't retarget the burst.
  const particles = useMemo(() => {
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    return Array.from({ length: lowPower ? 12 : 26 }).map((_, i) => {
      const sign = i % 2 === 0 ? 1 : -1;
      const sway1 = (50 + Math.random() * 70) * sign;
      const sway2 = (25 + Math.random() * 40) * -sign;
      return {
        m1x: sx + dx * 0.35 + px * sway1,
        m1y: sy + dy * 0.35 + py * sway1 - 50,
        m2x: sx + dx * 0.72 + px * sway2,
        m2y: sy + dy * 0.72 + py * sway2 - 24,
        duration: 0.8 + Math.random() * 0.2,
        delay: 1.0 + i * 0.014 + Math.random() * 0.06,
        size: 2 + Math.random() * 3,
      };
    });
  }, [flight, lowPower]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden">
      {particles.map((p, i) => {
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: '#a5f3fc',
              boxShadow: `0 0 8px rgba(${PORTAL_RGB},1), 0 0 16px rgba(${PORTAL_RGB},0.6)`,
              filter: 'blur(0.5px)',
            }}
            initial={{ x: sx, y: sy, opacity: 0, scale: 0.4 }}
            animate={{
              x: [sx, p.m1x, p.m2x, ex],
              y: [sy, p.m1y, p.m2y, ey],
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1, 0.9, 0.2],
            }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn', times: [0, 0.4, 0.75, 1] }}
          />
        );
      })}
      {/* the emblem briefly glows as it absorbs the qi */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: ex,
          top: ey,
          width: 64,
          height: 64,
          x: '-50%',
          y: '-50%',
          background: `radial-gradient(circle, rgba(${PORTAL_RGB},0.8) 0%, rgba(${PORTAL_RGB},0.25) 45%, transparent 70%)`,
          filter: 'blur(4px)',
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.95, 0], scale: [0.5, 1.5, 1.9] }}
        transition={{ duration: 0.55, delay: 1.85, times: [0, 0.35, 1] }}
      />
    </div>
  );
}

export interface ClosedDoorCultivationModalProps {
  qiEarned: number | null;
  onClose: () => void;
  onClaim: (qi: number) => Promise<void>;
  targetElementId?: string; // e.g. 'celestial-library-emblem'
  /** Days the user has been in the Library; drives the progression line. */
  daysCultivating?: number;
}

export function ClosedDoorCultivationModal({ qiEarned, onClose, onClaim, targetElementId = 'celestial-library-emblem', daysCultivating = 1 }: ClosedDoorCultivationModalProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [absorb, setAbsorb] = useState<Absorb | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const figureRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const claimButtonRef = useRef<HTMLButtonElement | null>(null);
  const collapsedButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudGradId = `cdc-cloud-${useId()}`;
  const cloudClipId = `cdc-cloudclip-${useId()}`;
  const shimmerGradId = `cdc-shimmer-${useId()}`;
  const daysId = `cdc-days-${useId()}`;
  const quoteId = `cdc-quote-${useId()}`;
  const reduceMotion = useReducedMotion();
  const lowPower = reduceMotion || isLowPowerDevice();
  const days = Math.max(1, Math.floor(daysCultivating));

  // Rolled once per reward cycle: mostly the progression line for the user's
  // Library tenure, occasionally one of the timeless lines mixed in.
  const quote = useMemo(() => {
    if (qiEarned === null) return progressionQuote(days);
    if (Math.random() < 0.25) {
      return TIMELESS_QUOTES[Math.floor(Math.random() * TIMELESS_QUOTES.length)];
    }
    return progressionQuote(days);
  }, [qiEarned, days]);

  // Focus management: store previous active element and move focus to claim button or collapsed orb
  useEffect(() => {
    if (qiEarned !== null && !collapsed && !isClaiming) {
      if (!previousActiveElementRef.current && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        previousActiveElementRef.current = document.activeElement;
      }
      const timer = requestAnimationFrame(() => {
        claimButtonRef.current?.focus();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [qiEarned, collapsed, isClaiming]);

  useEffect(() => {
    if (qiEarned !== null && collapsed && !isClaiming) {
      const timer = requestAnimationFrame(() => {
        collapsedButtonRef.current?.focus();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [qiEarned, collapsed, isClaiming]);

  // Focus trap and Escape key listener while the modal dialog is open
  useEffect(() => {
    if (qiEarned === null || collapsed || isClaiming) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setCollapsed(true);
        return;
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialog.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialog.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [qiEarned, collapsed, isClaiming]);

  // If the reward sits unclaimed, fold the vignette away into a tiny waiting icon.
  useEffect(() => {
    if (qiEarned === null || isClaiming || collapsed) return;
    const timer = setTimeout(() => setCollapsed(true), COLLAPSE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [qiEarned, isClaiming, collapsed]);

  // Start each new reward cycle fresh and restore focus when the modal closes.
  useEffect(() => {
    if (qiEarned === null) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setCollapsed(false);
      setIsClaiming(false);
      setClaimStatus(null);
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    }
  }, [qiEarned]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, []);

  const handleClaim = async () => {
    if (isClaiming || !qiEarned) return;
    setIsClaiming(true);
    setClaimStatus(`Absorbing ${qiEarned} Qi…`);

    // Phase 1: particles pour from the cloud down into the cultivator's dantian (~62% down the figure).
    const bubble = bubbleRef.current?.getBoundingClientRect();
    const figure = figureRef.current?.getBoundingClientRect();
    setAbsorb({
      sx: bubble ? bubble.left + bubble.width / 2 : window.innerWidth / 2,
      sy: bubble ? bubble.top + bubble.height / 2 : window.innerHeight - 220,
      sw: bubble?.width ?? 128,
      sh: bubble?.height ?? 64,
      ex: figure ? figure.left + figure.width / 2 : window.innerWidth / 2,
      ey: figure ? figure.top + figure.height * 0.62 : window.innerHeight - 120,
    });

    // Phase 2: once charged, the cultivator disperses up into the target emblem.
    const emblem = document.getElementById(targetElementId)?.getBoundingClientRect();
    setFlight({
      sx: figure ? figure.left + figure.width / 2 : window.innerWidth / 2,
      sy: figure ? figure.top + figure.height * 0.55 : window.innerHeight - 140,
      ex: emblem ? emblem.left + emblem.width / 2 : window.innerWidth - 64,
      ey: emblem ? emblem.top + emblem.height / 2 : 64,
    });

    const claimStart = performance.now();
    try {
      await onClaim(qiEarned);
    } catch (e) {
      console.error("Failed to claim idle qi:", e);
      // The claim did not land (offline, timeout, server error): restore the
      // vignette so the user can retry instead of silently losing the reward.
      setIsClaiming(false);
      setAbsorb(null);
      setFlight(null);
      setClaimStatus("Could not claim reward. Tap to retry.");
      return;
    }
    setClaimStatus(`Claimed ${qiEarned} Qi.`);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    // Close CLAIM_CLOSE_MS after the claim STARTED so the claim sequence
    // always gets its full moment regardless of network latency.
    const remaining = Math.max(0, CLAIM_CLOSE_MS - (performance.now() - claimStart));
    closeTimeoutRef.current = setTimeout(() => {
      setIsClaiming(false);
      setAbsorb(null);
      setFlight(null);
      onClose();
    }, remaining);
  };

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {claimStatus}
      </div>
      {absorb && <CloudAbsorb absorb={absorb} />}
      {flight && <QiFlight flight={flight} />}
      <AnimatePresence>
        {/* Full-viewport dim + soften: the Library stays visible enough to place the user, */}
        {/* not readable enough to compete, and stays up until claimed or minimized. */}
        {qiEarned !== null && !collapsed && (
          <motion.div
            key="cdc-scrim"
            aria-hidden="true"
            className="fixed inset-0 z-[95] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 62%, rgba(2,5,12,0.55) 0%, rgba(2,5,12,0.72) 55%, rgba(2,5,12,0.82) 100%)',
              // Full-viewport backdrop blur is the costliest effect here; weak
              // devices and reduced-motion users keep the dim but skip the blur.
              ...(lowPower
                ? {}
                : { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }),
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        )}
        {qiEarned !== null &&
          (collapsed && !isClaiming ? (
            <motion.button
              ref={collapsedButtonRef}
              key="cdc-collapsed"
              type="button"
              onClick={() => setCollapsed(false)}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:right-6 lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-[100] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#05080f]/95 backdrop-blur-lg border border-portal/40 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_0_0_1px_rgba(4,172,255,0.12)] flex items-center justify-center overflow-visible touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-portal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05080f]"
              aria-label={`Open closed-door cultivation reward of ${qiEarned} Qi`}
            >
              {/* soft ink aura so the orb sits on shadow instead of competing artwork */}
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-full pointer-events-none -z-10"
                style={{
                  background: 'radial-gradient(circle, rgba(2,5,12,0.85) 0%, rgba(2,5,12,0.45) 55%, transparent 75%)',
                  filter: 'blur(6px)',
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: `0 0 14px rgba(${PORTAL_RGB},0.35)` }}
                animate={reduceMotion ? { opacity: 0.7 } : { opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <CultivatorSvg className="w-8 h-7 sm:w-9 sm:h-8" style={{ filter: `drop-shadow(0 0 4px rgba(${PORTAL_RGB},0.5))` }} />
              <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full bg-portal/25 border border-portal/50 text-[8px] sm:text-[9px] font-bold text-cyan-100">
                +{qiEarned}
              </span>
            </motion.button>
          ) : (
            <motion.div
              ref={dialogRef}
              key="cdc-vignette"
              role="dialog"
              aria-modal="true"
              aria-labelledby="idle-cultivation-title"
              aria-describedby={`${daysId} ${quoteId}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:inset-x-auto sm:right-6 sm:justify-end lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-[100] flex justify-center pointer-events-none"
            >
              {/* The cloud and the cultivator's body are one tap target — swipes everywhere else pass through to the page. */}
              <div className="relative pointer-events-none flex flex-col items-center px-6">
                {/* soft dark ink aura: gently obscures whatever is underneath, no hard box */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[min(92vw,440px)] h-[22rem] sm:w-[min(80vw,500px)] sm:h-[24rem] lg:w-[min(60vw,600px)] lg:h-[28rem]"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 55%, rgba(2,5,12,0.92) 0%, rgba(2,5,12,0.7) 42%, rgba(2,5,12,0.35) 62%, transparent 78%)',
                    filter: 'blur(10px)',
                  }}
                />

                {/* progression block: how long the user has walked the Library's path */}
                <motion.div
                  className="relative flex flex-col items-center mb-1 sm:mb-2 pointer-events-none"
                  animate={isClaiming ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-sc uppercase tracking-[0.4em] text-portal/70">
                    Days Cultivating
                  </span>
                  <span
                    id={daysId}
                    className="mt-1 font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-cyan-50 tracking-[0.15em] whitespace-nowrap"
                    style={{ textShadow: `0 0 12px rgba(${PORTAL_RGB},0.9), 0 0 32px rgba(${PORTAL_RGB},0.45)` }}
                  >
                    {days === 1 ? '1 DAY' : `${days} DAYS`}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2.5" aria-hidden="true">
                    <span
                      className="block w-8 sm:w-10 h-px"
                      style={{ background: `linear-gradient(to right, transparent, rgba(${PORTAL_RGB},0.6))` }}
                    />
                    <span
                      className="text-[8px] leading-none"
                      style={{ color: `rgba(${PORTAL_RGB},0.9)`, textShadow: `0 0 6px rgba(${PORTAL_RGB},0.8)` }}
                    >
                      ✦
                    </span>
                    <span
                      className="block w-8 sm:w-10 h-px"
                      style={{ background: `linear-gradient(to left, transparent, rgba(${PORTAL_RGB},0.6))` }}
                    />
                  </span>
                  <motion.span
                    id={quoteId}
                    className="mt-1.5 font-display italic text-sm sm:text-base lg:text-lg text-cyan-200/90"
                    style={{ textShadow: `0 0 10px rgba(${PORTAL_RGB},0.5)` }}
                    animate={reduceMotion ? { opacity: 0.9 } : { opacity: [0.72, 1, 0.72] }}
                    transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {quote}
                  </motion.span>
                </motion.div>

                {/* single hit area spanning the cloud down through the cultivator's body — tap either to claim */}
                <button
                  ref={claimButtonRef}
                  type="button"
                  onClick={handleClaim}
                  disabled={isClaiming}
                  aria-label={isClaiming ? `${qiEarned} Qi, absorbing…` : `Claim ${qiEarned} Qi & Awaken`}
                  aria-describedby={`${daysId} ${quoteId}`}
                  className="relative flex flex-col items-center rounded-[2rem] pointer-events-auto touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-portal/60"
                >
                {/* thought cloud of condensed qi */}
                <motion.div
                  ref={bubbleRef}
                  className="relative block rounded-2xl"
                  animate={
                    isClaiming
                      ? { scale: 1.2, opacity: 0, filter: 'blur(8px)' }
                      : reduceMotion
                        ? { y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }
                        : { y: [0, -6, 0], scale: 1, opacity: 1, filter: 'blur(0px)' }
                  }
                  transition={
                    isClaiming
                      ? { duration: 0.3, ease: 'easeOut' }
                      : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  {/* pulsing halo: signals the cloud is collectible */}
                  <motion.span
                    aria-hidden="true"
                    className="absolute -inset-3 rounded-full pointer-events-none -z-10"
                    style={{
                      background: `radial-gradient(ellipse at 50% 50%, rgba(${PORTAL_RGB},0.5) 0%, rgba(${PORTAL_RGB},0.18) 55%, transparent 75%)`,
                      filter: 'blur(8px)',
                    }}
                    animate={reduceMotion ? { opacity: 0.6 } : { opacity: [0.45, 0.95, 0.45], scale: [0.95, 1.12, 0.95] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <svg
                    viewBox="0 0 130 64"
                    className="w-32 h-16 sm:w-[9.5rem] sm:h-[4.5rem] lg:w-48 lg:h-24"
                    style={{ filter: `drop-shadow(0 0 12px rgba(${PORTAL_RGB},0.65))` }}
                    aria-hidden="true"
                  >
                    <defs>
                      <radialGradient id={cloudGradId} cx="50%" cy="45%" r="65%">
                        <stop offset="0%" stopColor={`rgba(${PORTAL_RGB},0.85)`} />
                        <stop offset="55%" stopColor={`rgba(${PORTAL_RGB},0.35)`} />
                        <stop offset="100%" stopColor={`rgba(${PORTAL_RGB},0.05)`} />
                      </radialGradient>
                      <linearGradient id={shimmerGradId} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(220,248,255,0)" />
                        <stop offset="50%" stopColor="rgba(220,248,255,0.75)" />
                        <stop offset="100%" stopColor="rgba(220,248,255,0)" />
                      </linearGradient>
                      <clipPath id={cloudClipId}>
                        <path d="M32 50 C16 50 10 39 19 31 C14 20 27 13 36 18 C41 8 57 6 65 14 C73 6 89 8 94 18 C103 13 116 20 111 31 C120 39 114 50 98 50 Z" />
                      </clipPath>
                    </defs>
                    <path
                      d="M32 50 C16 50 10 39 19 31 C14 20 27 13 36 18 C41 8 57 6 65 14 C73 6 89 8 94 18 C103 13 116 20 111 31 C120 39 114 50 98 50 Z"
                      fill={`url(#${cloudGradId})`}
                    />
                    {/* shimmer sweep inviting the tap */}
                    {!reduceMotion && (
                      <g clipPath={`url(#${cloudClipId})`}>
                        <rect x="-46" y="0" width="26" height="64" fill={`url(#${shimmerGradId})`} transform="skewX(-18)">
                          <animate attributeName="x" from="-46" to="150" dur="2.6s" repeatCount="indefinite" />
                        </rect>
                      </g>
                    )}
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center font-display font-bold text-base sm:text-lg lg:text-xl text-cyan-100 tracking-wider whitespace-nowrap"
                    style={{ textShadow: `0 0 10px rgba(${PORTAL_RGB},1), 0 0 22px rgba(${PORTAL_RGB},0.55)` }}
                  >
                    {`+${qiEarned} QI`}
                  </span>
                </motion.div>

                  <div ref={figureRef} className="relative">
                    <CultivatorFigure claiming={isClaiming} calm={!!reduceMotion} />
                  </div>
                </button>

                <span
                  id="idle-cultivation-title"
                  className="relative mt-1 text-[10px] sm:text-[11px] lg:text-xs font-sc uppercase tracking-[0.35em] text-portal/60"
                >
                  Closed-Door Cultivation
                </span>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </>
  );
}

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  MEDIA_KIND_LABEL,
  type MediaKind,
  type RevealedMediaAsset,
} from '../../shared/manifestation';
import type {
  ManifestationRevealState,
} from '../../shared/manifestationReveal';

/**
 * CelestialScrollVessel — the current visual vessel for the Manifestation
 * Reveal mechanic.
 *
 * A celestial scroll that floats (sealed), splits into roller pairs around
 * a white-gold portal (unsealing), and hangs fully unrolled with the
 * finished asset framed between gold rods (revealed). Vessel-only
 * concerns: the artwork for each state, its own reduced-motion handling,
 * and the placeholder vista shown when the revealed state has no supplied
 * asset.
 *
 * 2026-08-16 visual pass (alive / magical / dimensional, tuned for both
 * the full manifestation presentation and compact containment):
 *
 *   - sealed: the scroll breathes — a contained-energy halo of dotted
 *     gold/violet rings crawls around it, inner light pulses through the
 *     parchment seam, and the seal star periodically winks with a soft
 *     ping ring. Inviting, never loud.
 *   - unsealing: an exciting one-shot opening (charge tremble → light
 *     cracks racing across the parchment → the seal shattering into
 *     shards → radiant beams, a white-hot flash, and a shockwave ring as
 *     the roller pairs ease apart with overshoot) that hands off to a
 *     calm, sustainable loop — slow portal breathing, counter-swirling
 *     ribbons on long mismatched periods, drifting dust, occasional
 *     long-staggered embers, and motes steadily rising off the portal —
 *     built to run for an unpredictable generation time without a
 *     visible metronome.
 *   - revealed: a meaningful entry (the hanging scroll settles in, the
 *     content blooms up after the frame, and a light cascade washes down
 *     the surface once) that then settles — a barely-there hanging sway,
 *     a lazy pendant pendulum, a rarer shimmer sweep — so the manifested
 *     content becomes the focus. While a supplied asset is still loading
 *     (or if it fails to load), the placeholder vista stays up inside the
 *     frame, so the payoff never lands on a dark void.
 *
 * The vessel is media-mode-aware: it accepts a `mediaKind` so the
 * placeholder vista can echo the operation's family label (Cover Art,
 * Image, Audio, Visual / Motion) when no finished asset is supplied. The
 * mechanic itself stays vessel-agnostic — the caller adapts the
 * `ManifestationReveal` agnostic content into the vessel's media-shaped
 * `asset` prop at the call site.
 *
 * The vessel deliberately never advances the reveal state. It renders the
 * current state and reports the tap on the sealed state through the
 * mechanic's `onUnseal` callback (the vessel is wrapped, not self-tapping).
 */

export interface CelestialScrollVesselProps {
  /** The current reveal state. Owned by the caller. */
  state: ManifestationRevealState;
  /**
   * The asset to render in the revealed state. When supplied the vessel
   * frames the asset inside the open scroll; otherwise it shows the
   * placeholder vista labeled with the supplied `placeholderLabel` (or
   * the `mediaKind` label as a fallback).
   */
  asset?: RevealedMediaAsset | null;
  /**
   * Optional override label for the placeholder vista (used when no asset
   * is supplied). Defaults to the `mediaKind` label.
   */
  placeholderLabel?: string;
  /**
   * The asset family (used to label the placeholder vista in the revealed
   * state). Mirrors the media mode's `MediaKind` taxonomy.
   */
  mediaKind: MediaKind;
}

/** Shared gradient/filter/clip definitions for every scroll state. */
const ScrollDefs: React.FC = () => (
  <defs>
    <linearGradient id="msr-parchment" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#f6f0ff" />
      <stop offset="35%" stopColor="#e9defa" />
      <stop offset="70%" stopColor="#c9b3e6" />
      <stop offset="100%" stopColor="#9d82c8" />
    </linearGradient>
    <linearGradient id="msr-parchment-sheet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#efe6fd" />
      <stop offset="50%" stopColor="#dccaf2" />
      <stop offset="100%" stopColor="#b59adb" />
    </linearGradient>
    <linearGradient id="msr-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fff0c2" />
      <stop offset="35%" stopColor="#f5c65c" />
      <stop offset="70%" stopColor="#c98f2b" />
      <stop offset="100%" stopColor="#8a5a12" />
    </linearGradient>
    {/* Horizontal light band fading at both ends (sealed seam light). */}
    <linearGradient id="msr-seam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#fff3d6" stopOpacity="0" />
      <stop offset="50%" stopColor="#fff3d6" stopOpacity="0.9" />
      <stop offset="100%" stopColor="#fff3d6" stopOpacity="0" />
    </linearGradient>
    {/* Light ray, brightest at its source end (bottom of the shape's box). */}
    <linearGradient id="msr-beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffd977" stopOpacity="0" />
      <stop offset="55%" stopColor="#ffd977" stopOpacity="0.3" />
      <stop offset="100%" stopColor="#fff7e0" stopOpacity="0.9" />
    </linearGradient>
    {/* Soft vertical wash band (reveal cascade / sheet sheen). */}
    <linearGradient id="msr-wash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fff7e0" stopOpacity="0" />
      <stop offset="50%" stopColor="#fff7e0" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#fff7e0" stopOpacity="0" />
    </linearGradient>
    <radialGradient id="msr-burst" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fff7e0" stopOpacity="0.95" />
      <stop offset="45%" stopColor="#ffd977" stopOpacity="0.55" />
      <stop offset="100%" stopColor="#f5b942" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="msr-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
      <stop offset="30%" stopColor="#fff3d6" stopOpacity="0.95" />
      <stop offset="60%" stopColor="#ffd977" stopOpacity="0.5" />
      <stop offset="100%" stopColor="#f5b942" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="msr-vista-sky" cx="50%" cy="60%" r="80%">
      <stop offset="0%" stopColor="#f2d9ff" />
      <stop offset="30%" stopColor="#c39bec" />
      <stop offset="65%" stopColor="#5d34a1" />
      <stop offset="100%" stopColor="#1d0e38" />
    </radialGradient>
    <radialGradient id="msr-gem" cx="42%" cy="35%" r="65%">
      <stop offset="0%" stopColor="#e9d5ff" />
      <stop offset="55%" stopColor="#a855f7" />
      <stop offset="100%" stopColor="#581c87" />
    </radialGradient>
    <radialGradient id="msr-blossom" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stopColor="#ffd6ec" />
      <stop offset="60%" stopColor="#f490c6" />
      <stop offset="100%" stopColor="#d4549a" />
    </radialGradient>
    <filter id="msr-soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
    <clipPath id="msr-frame-clip">
      <rect x="114" y="82" width="172" height="134" rx="5" />
    </clipPath>
    <clipPath id="msr-sheet-clip">
      <rect x="138" y="96" width="124" height="108" rx="10" />
    </clipPath>
  </defs>
);

/** Radiant 4-point star (compass sparkle) path centered at (cx, cy). */
const starFourPath = (cx: number, cy: number, r: number): string => {
  const s = r * 0.22;
  return (
    `M${cx} ${cy - r} Q${cx + s} ${cy - s} ${cx + r} ${cy} ` +
    `Q${cx + s} ${cy + s} ${cx} ${cy + r} Q${cx - s} ${cy + s} ${cx - r} ${cy} ` +
    `Q${cx - s} ${cy - s} ${cx} ${cy - r} Z`
  );
};

/** Pointed spear finial extending outward from (x, y); dir -1 points left. */
const SpearFinial: React.FC<{ x: number; y: number; dir: 1 | -1 }> = ({ x, y, dir }) => (
  <g transform={`translate(${x} ${y}) scale(${dir} 1)`}>
    <rect x="0" y="-3" width="7" height="6" rx="2.5" fill="url(#msr-gold)" />
    <circle cx="9" cy="0" r="4.2" fill="url(#msr-gold)" />
    <path d="M11 -5 L24 -4.5 L33 0 L24 4.5 L11 5 Z" fill="url(#msr-gold)" />
    <circle cx="16.5" cy="0" r="1.5" fill="#fff0c2" opacity="0.8" />
  </g>
);

/** Ornate filigree starburst radiating around the seal medallion. */
const SealStarburst: React.FC<{ cx: number; cy: number }> = ({ cx, cy }) => (
  <g>
    {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
      <path
        key={deg}
        d="M0 -37 L4 -20 L0 -15 L-4 -20 Z"
        fill="url(#msr-gold)"
        transform={`translate(${cx} ${cy}) rotate(${deg})`}
      />
    ))}
    {Array.from({ length: 8 }, (_, i) => i * 45 + 22.5).map((deg) => (
      <path
        key={deg}
        d="M0 -27 L2.5 -17 L0 -14 L-2.5 -17 Z"
        fill="#f5b942"
        opacity="0.85"
        transform={`translate(${cx} ${cy}) rotate(${deg})`}
      />
    ))}
  </g>
);

/** ── sealed ──────────────────────────────────────────────────────────── */

/** [cx, cy, r, duration, delay, color] — slow gold/white motes. */
const SEALED_MOTES: Array<[number, number, number, number, number, string]> = [
  [140, 118, 1.8, 5.4, 0, '#ffe9b0'],
  [258, 112, 1.5, 6.2, 1.2, '#ffffff'],
  [178, 210, 1.6, 5.8, 0.6, '#ffd977'],
  [238, 196, 1.4, 6.6, 2.0, '#ffe9b0'],
];

/** [cx, cy, r, duration, delay] — faint ember-red sparks. */
const SEALED_EMBERS: Array<[number, number, number, number, number]> = [
  [122, 188, 1.6, 4.6, 0.4],
  [282, 178, 1.4, 5.2, 1.6],
  [214, 96, 1.3, 5.8, 2.6],
];

const SealedScroll: React.FC<{ calm: boolean }> = ({ calm }) => (
  <g>
    {/* Ground shadow + warm glow pooled beneath the scroll */}
    <ellipse cx="200" cy="206" rx="118" ry="12" fill="#000000" opacity="0.45" filter="url(#msr-soft)" />
    <ellipse cx="200" cy="204" rx="104" ry="9" fill="url(#msr-burst)" opacity="0.5" />
    <motion.ellipse
      cx="200" cy="150" rx="152" ry="76" fill="url(#msr-burst)"
      animate={calm ? { opacity: 0.3 } : { opacity: [0.22, 0.4, 0.22] }}
      transition={calm ? { duration: 0 } : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Contained-energy halo — dotted gold/violet rings crawling slowly
        around the scroll, plus one soft bright arc wandering the same
        path. Anticipation without noise: something is held in there. */}
    <g transform="rotate(-14 200 150)">
      <motion.ellipse
        cx="200" cy="150" rx="150" ry="51" fill="none"
        stroke="#ffd977" strokeWidth="1.1" strokeDasharray="5 6.5" opacity="0.32"
        animate={calm ? {} : { strokeDashoffset: [0, -11.5] }}
        transition={calm ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: 'linear' }}
      />
      <motion.ellipse
        cx="200" cy="150" rx="150" ry="51" fill="none"
        stroke="#c084fc" strokeWidth="1" strokeDasharray="4 7.5" opacity="0.22"
        animate={calm ? {} : { strokeDashoffset: [0, 11.5] }}
        transition={calm ? { duration: 0 } : { duration: 13, repeat: Infinity, ease: 'linear' }}
      />
      {!calm && (
        <motion.ellipse
          cx="200" cy="150" rx="150" ry="51" fill="none"
          stroke="#fff0c2" strokeWidth="2.4" strokeDasharray="16 84" strokeLinecap="round"
          opacity="0.5" filter="url(#msr-soft)"
          animate={{ strokeDashoffset: [0, -100] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </g>

    {/* Slow gold/white motes + faint ember sparks drifting around the scroll */}
    {!calm &&
      SEALED_MOTES.map(([cx, cy, r, dur, delay, color], i) => (
        <motion.circle
          key={`mote-${i}`}
          cx={cx} cy={cy} r={r} fill={color}
          animate={{ y: [0, -13, 0], opacity: [0.1, 0.8, 0.1] }}
          transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    {!calm &&
      SEALED_EMBERS.map(([cx, cy, r, dur, delay], i) => (
        <motion.circle
          key={`ember-${i}`}
          cx={cx} cy={cy} r={r} fill={i % 2 === 0 ? '#f87171' : '#fb923c'}
          animate={{ y: [0, -18, 0], x: [0, i % 2 === 0 ? 5 : -5, 0], opacity: [0, 0.75, 0] }}
          transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

    {/* Floating rolled scroll */}
    <motion.g
      animate={calm ? {} : { y: [0, -4, 0] }}
      transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Parchment cylinder + soft sheens */}
      <rect x="112" y="116" width="176" height="68" rx="34" fill="url(#msr-parchment)" />
      <rect x="124" y="123" width="152" height="14" rx="7" fill="#ffffff" opacity="0.32" />
      <rect x="124" y="163" width="152" height="13" rx="6.5" fill="#4c1d95" opacity="0.18" />
      <ellipse cx="200" cy="150" rx="30" ry="34" fill="#ffffff" opacity="0.12" />

      {/* Inner light breathing through the parchment seam */}
      <motion.rect
        x="124" y="146" width="152" height="8" rx="4" fill="url(#msr-seam)"
        filter="url(#msr-soft)"
        animate={calm ? { opacity: 0.3 } : { opacity: [0.12, 0.45, 0.12] }}
        transition={calm ? { duration: 0 } : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ornate gold end-collars + spear finials */}
      {[102, 284].map((x) => (
        <g key={x}>
          <rect x={x} y="110" width="14" height="80" rx="7" fill="url(#msr-gold)" />
          <rect x={x + 3.5} y="115" width="3" height="70" rx="1.5" fill="#ffffff" opacity="0.35" />
        </g>
      ))}
      <SpearFinial x={100} y={150} dir={-1} />
      <SpearFinial x={300} y={150} dir={1} />

      {/* Corner twinkles riding with the scroll */}
      {calm ? (
        <path d={starFourPath(136, 102, 3.2)} fill="#fff0c2" opacity="0.45" />
      ) : (
        <motion.path
          d={starFourPath(136, 102, 3.2)} fill="#fff0c2"
          animate={{ opacity: [0.12, 0.9, 0.12] }}
          transition={{ duration: 4.8, delay: 0.7, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {calm ? (
        <path d={starFourPath(268, 200, 2.6)} fill="#e9d5ff" opacity="0.4" />
      ) : (
        <motion.path
          d={starFourPath(268, 200, 2.6)} fill="#e9d5ff"
          animate={{ opacity: [0.1, 0.75, 0.1] }}
          transition={{ duration: 6.1, delay: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* The intact ornate seal — filigree starburst + medallion + radiant core */}
      <motion.g
        animate={calm ? {} : { scale: [1, 1.06, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <SealStarburst cx={200} cy={150} />
        <circle cx="200" cy="150" r="21" fill="url(#msr-gold)" stroke="#7a4d0f" strokeWidth="1.2" />
        <circle cx="200" cy="150" r="16.5" fill="none" stroke="#fff0c2" strokeWidth="0.8" opacity="0.6" />
        <motion.circle
          cx="200" cy="150" r="14" fill="url(#msr-core)"
          animate={calm ? { opacity: 0.9 } : { opacity: [0.65, 1, 0.65] }}
          transition={calm ? { duration: 0 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <path d={starFourPath(200, 150, 11)} fill="#fff7e0" />
        <path d={starFourPath(200, 150, 5)} fill="#ffffff" />

        {/* The wink — a periodic star flare + soft ping ring inviting the tap */}
        {!calm && (
          <motion.path
            d={starFourPath(200, 150, 11)} fill="#ffffff"
            animate={{ opacity: [0, 0, 0.9, 0, 0], scale: [0.6, 0.6, 1.5, 0.6, 0.6] }}
            transition={{ duration: 5.6, times: [0, 0.78, 0.86, 0.95, 1], repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )}
        {!calm && (
          <motion.circle
            cx="200" cy="150" r="17" fill="none" stroke="#fff0c2" strokeWidth="1.2"
            animate={{ opacity: [0, 0, 0.45, 0, 0], scale: [0.55, 0.55, 1.7, 1.85, 1.85] }}
            transition={{ duration: 5.6, times: [0, 0.78, 0.87, 0.97, 1], repeat: Infinity, ease: 'easeOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )}
      </motion.g>
    </motion.g>
  </g>
);

/** ── unsealing ───────────────────────────────────────────────────────── */

/** [dx, dy, delay, color, duration] — embers drifting out of the core on
 *  long, staggered loops so the sustained state never metronomes. */
const UNSPARKS: Array<[number, number, number, string, number]> = [
  [76, -56, 0, '#ffd977', 4.2],
  [-80, -40, 1.1, '#ffe9b0', 5.1],
  [88, 26, 0.5, '#ffd977', 3.6],
  [-86, 48, 2.0, '#e9d5ff', 5.8],
  [34, -80, 0.8, '#ffe9b0', 4.6],
  [-28, 82, 1.6, '#ffd977', 5.4],
  [98, -10, 0.3, '#ffe9b0', 3.9],
  [-98, -18, 2.4, '#ffd977', 6.2],
  [58, 70, 1.3, '#fb923c', 4.9],
  [-54, -74, 2.9, '#f87171', 6.7],
];

/** [dx, dy, rotate, delay] — seal shards flung outward by the shatter. */
const SEAL_SHARDS: Array<[number, number, number, number]> = [
  [64, -60, 170, 0.26],
  [-72, -46, -210, 0.3],
  [80, 26, 260, 0.24],
  [-66, 56, -150, 0.34],
  [22, -78, 200, 0.28],
  [-20, 80, -240, 0.32],
];

/** Jagged light cracks racing across the parchment from the seal. */
const SEAL_CRACKS: string[] = [
  'M200 150 L184 134 L172 138 L160 122',
  'M200 150 L218 138 L226 142 L240 128',
  'M200 150 L194 170 L202 176 L196 192',
];

/** [offsetX, riseHeight, delay, duration] — motes rising steadily off the portal. */
const PORTAL_MOTES: Array<[number, number, number, number]> = [
  [-14, 52, 0, 4.8],
  [10, 66, 1.5, 5.6],
  [-4, 78, 2.6, 6.3],
  [18, 58, 3.4, 5.2],
  [-24, 62, 4.1, 6.8],
];

/**
 * A short parchment roller with a gold collar, spear finial on its outer
 * end, and a torn glowing inner edge where the scroll split. The torn
 * edge breathes on its own slow cycle (`glowDuration` / `glowDelay` keep
 * the four rollers out of sync).
 */
const SplitRoller: React.FC<{
  cx: number;
  cy: number;
  tilt: number;
  flip?: boolean;
  calm: boolean;
  glowDuration: number;
  glowDelay: number;
}> = ({ cx, cy, tilt, flip, calm, glowDuration, glowDelay }) => (
  <g transform={`rotate(${tilt} ${cx} ${cy})`}>
    <g transform={flip ? `translate(${2 * cx} 0) scale(-1 1)` : undefined}>
      <rect x={cx - 46} y={cy - 16} width="92" height="32" rx="16" fill="url(#msr-parchment)" />
      <rect x={cx - 40} y={cy - 12} width="80" height="7" rx="3.5" fill="#ffffff" opacity="0.3" />
      <rect x={cx - 52} y={cy - 20} width="12" height="40" rx="6" fill="url(#msr-gold)" />
      <motion.rect
        x={cx + 36} y={cy - 15} width="8" height="30" rx="4" fill="#ffd977"
        filter="url(#msr-soft)"
        animate={calm ? { opacity: 0.55 } : { opacity: [0.35, 0.75, 0.35] }}
        transition={calm ? { duration: 0 } : { duration: glowDuration, delay: glowDelay, repeat: Infinity, ease: 'easeInOut' }}
      />
      <rect x={cx + 41} y={cy - 16} width="2.5" height="32" fill="#fff0c2" opacity="0.8" />
      <SpearFinial x={cx - 54} y={cy} dir={-1} />
    </g>
  </g>
);

const UnsealingScroll: React.FC<{ calm: boolean }> = ({ calm }) => (
  <g>
    <ellipse cx="200" cy="212" rx="118" ry="12" fill="#000000" opacity="0.4" filter="url(#msr-soft)" />
    <motion.ellipse
      cx="200" cy="150" rx="158" ry="96" fill="url(#msr-burst)"
      animate={calm ? { opacity: 0.35 } : { opacity: [0.28, 0.42, 0.28] }}
      transition={calm ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* The split scroll — a brief charge tremble on entry, then still.
        The tremble wraps only the scroll parts; the portal effects below
        never shake. */}
    <motion.g
      animate={calm ? {} : { x: [0, -2.2, 1.8, -1.2, 0.7, 0], y: [0, 1, -0.8, 0.5, -0.3, 0] }}
      transition={{ duration: 0.55, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: 'easeOut' }}
    >
      {/* Parchment sheet stretched between the split roller pairs — unfolds
          with a soft overshoot, then breathes almost imperceptibly. */}
      <motion.g
        initial={calm ? false : { scaleY: 0.35, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: calm ? 0 : 1.5, delay: calm ? 0 : 0.35, ease: [0.34, 1.28, 0.64, 1] }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <motion.g
          animate={calm ? {} : { scaleY: [1, 1.015, 1] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <rect x="138" y="96" width="124" height="108" rx="10" fill="url(#msr-parchment-sheet)" opacity="0.9" />
          <motion.rect
            x="138" y="96" width="124" height="108" rx="10" fill="none"
            stroke="#ffd977" strokeWidth="2" filter="url(#msr-soft)"
            animate={calm ? { opacity: 0.65 } : { opacity: [0.5, 0.8, 0.5] }}
            transition={calm ? { duration: 0 } : { duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <rect x="141" y="99" width="118" height="102" rx="8" fill="none" stroke="#fff0c2" strokeWidth="1" opacity="0.5" />
          {/* A soft sheen band traveling slowly down the sheet */}
          {!calm && (
            <g clipPath="url(#msr-sheet-clip)">
              <motion.rect
                x="138" y="76" width="124" height="20" fill="url(#msr-wash)"
                animate={{ y: [0, 64, 128], opacity: [0, 0.5, 0] }}
                transition={{ duration: 8.5, delay: 2, repeat: Infinity, times: [0, 0.5, 1], ease: 'easeInOut' }}
              />
            </g>
          )}
        </motion.g>
      </motion.g>

      {/* Split roller pairs — angled apart at top and bottom, easing apart
          with a soft overshoot on entry */}
      {[
        { cx: 150, cy: 102, tilt: 12, from: 18, glowDuration: 4.2, glowDelay: 0 },
        { cx: 250, cy: 102, tilt: -12, from: 18, flip: true, glowDuration: 5.1, glowDelay: 0.8 },
        { cx: 150, cy: 198, tilt: -12, from: -18, glowDuration: 4.7, glowDelay: 1.6 },
        { cx: 250, cy: 198, tilt: 12, from: -18, flip: true, glowDuration: 5.6, glowDelay: 2.3 },
      ].map(({ cx, cy, tilt, from, flip, glowDuration, glowDelay }, i) => (
        <motion.g
          key={i}
          initial={calm ? false : { y: from, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: calm ? 0 : 1.35, delay: calm ? 0 : 0.3, ease: [0.34, 1.26, 0.64, 1] }}
        >
          <SplitRoller cx={cx} cy={cy} tilt={tilt} flip={flip} calm={calm} glowDuration={glowDuration} glowDelay={glowDelay} />
        </motion.g>
      ))}
    </motion.g>

    {/* Light cracks racing across the parchment — one-shot opening beat */}
    {!calm &&
      SEAL_CRACKS.map((d, i) => (
        <motion.path
          key={i}
          d={d} fill="none" stroke="#fff3d6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0] }}
          transition={{ duration: 0.75, delay: 0.06 + i * 0.07, times: [0, 0.3, 1], ease: 'easeOut' }}
        />
      ))}

    {/* Radiant beams flaring behind the core — one-shot opening payoff */}
    {!calm && (
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.55, 1.02, 1.12], rotate: [-5, 0, 3] }}
        transition={{ duration: 1.15, delay: 0.3, times: [0, 0.28, 1], ease: 'easeOut' }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        {[0, 90, 180, 270].map((deg) => (
          <path key={deg} d="M200 150 L194 40 L206 40 Z" fill="url(#msr-beam)" transform={`rotate(${deg} 200 150)`} />
        ))}
        {[45, 135, 225, 315].map((deg) => (
          <path key={deg} d="M200 150 L195.5 66 L204.5 66 Z" fill="url(#msr-beam)" opacity="0.7" transform={`rotate(${deg} 200 150)`} />
        ))}
      </motion.g>
    )}

    {/* Golden energy ribbons sweeping around the core — slow galaxy swirl */}
    <motion.g
      animate={calm ? {} : { rotate: 360 }}
      transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      <path d="M138 150 A66 44 0 0 1 200 106" fill="none" stroke="url(#msr-gold)" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" />
      <path d="M262 150 A66 44 0 0 1 200 194" fill="none" stroke="url(#msr-gold)" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" />
      <path d="M200 96 A78 54 0 0 1 278 150" fill="none" stroke="#ffe9b0" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
      <path d="M200 204 A78 54 0 0 1 122 150" fill="none" stroke="#ffe9b0" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
    </motion.g>

    {/* Faint violet qi wisps counter-swirling */}
    <motion.g
      animate={calm ? {} : { rotate: -360 }}
      transition={{ repeat: Infinity, duration: 31, ease: 'linear' }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      <path d="M128 138 A92 64 0 0 1 272 168" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
      <path d="M272 132 A92 64 0 0 1 128 162" fill="none" stroke="#a855f7" strokeWidth="1.4" strokeLinecap="round" opacity="0.3" />
    </motion.g>

    {/* Distant dust orbiting far outside the ribbons — the third,
        slowest period that keeps the loop from ever feeling repeated */}
    <motion.g
      animate={calm ? {} : { rotate: -360 }}
      transition={{ repeat: Infinity, duration: 53, ease: 'linear' }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {[
        [296, 150, 1.4, '#ffe9b0'],
        [255, 229, 1.1, '#e9d5ff'],
        [145, 229, 1.5, '#ffe9b0'],
        [106, 167, 1.2, '#e9d5ff'],
        [145, 71, 1.3, '#ffe9b0'],
        [248, 67, 1.1, '#e9d5ff'],
      ].map(([cx, cy, r, color], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={color as string} opacity="0.3" />
      ))}
    </motion.g>

    {/* Portal core — slow, deep breathing once the opening settles */}
    <motion.circle
      cx="200" cy="150" r="46" fill="url(#msr-core)"
      animate={calm ? { opacity: 0.9 } : { opacity: [0.82, 0.95, 0.82], scale: [0.97, 1.04, 0.97] }}
      transition={calm ? { duration: 0 } : { duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    />
    {/* Broken violet rim around the core, dashes crawling slowly */}
    <motion.circle
      cx="200" cy="150" r="54" fill="none" stroke="#c084fc" strokeWidth="1.3" strokeDasharray="6 16"
      animate={calm ? { opacity: 0.3 } : { opacity: [0.2, 0.4, 0.2], strokeDashoffset: [0, -22] }}
      transition={
        calm
          ? { duration: 0 }
          : {
              opacity: { duration: 7.4, repeat: Infinity, ease: 'easeInOut' },
              strokeDashoffset: { duration: 15, repeat: Infinity, ease: 'linear' },
            }
      }
    />
    <motion.g
      animate={calm ? {} : { rotate: 360 }}
      transition={{ repeat: Infinity, duration: 48, ease: 'linear' }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="200" y1="128" x2="200" y2={deg % 90 === 0 ? 104 : 112}
          stroke="#fff3d6" strokeWidth={deg % 90 === 0 ? 2.4 : 1.6}
          strokeLinecap="round" opacity="0.85"
          transform={`rotate(${deg} 200 150)`}
        />
      ))}
    </motion.g>
    <path d={starFourPath(200, 150, 15)} fill="#ffffff" opacity="0.95" />

    {/* Motes rising steadily off the portal — the "generation in flight" breath */}
    {!calm &&
      PORTAL_MOTES.map(([dx, rise, delay, dur], i) => (
        <motion.circle
          key={i}
          cx={200 + dx} cy="150" r={1.3 + (i % 3) * 0.3} fill={i % 2 === 0 ? '#ffe9b0' : '#e9d5ff'}
          animate={{ y: [0, -rise * 0.5, -rise], x: [0, dx * 0.15, dx * 0.3], opacity: [0, 0.6, 0] }}
          transition={{ duration: dur, delay, repeat: Infinity, times: [0, 0.3, 1], ease: 'easeInOut' }}
        />
      ))}

    {/* Embers drifting out of the core — long staggered loops, no metronome */}
    {!calm &&
      UNSPARKS.map(([dx, dy, delay, color, dur], i) => (
        <motion.g
          key={i}
          animate={{ x: [0, dx * 0.5, dx], y: [0, dy * 0.5, dy], opacity: [0, 0.8, 0], scale: [1, 0.8, 0.5] }}
          transition={{ duration: dur, delay, repeat: Infinity, times: [0, 0.35, 1], ease: 'easeOut' }}
        >
          <circle cx="200" cy="150" r={color === '#ffd977' ? 2.4 : 1.7} fill={color} />
        </motion.g>
      ))}

    {/* The seal shattering into shards — one-shot opening beat */}
    {!calm &&
      SEAL_SHARDS.map(([dx, dy, rot, delay], i) => (
        <motion.g
          key={i}
          initial={{ opacity: 1 }}
          animate={{ x: [0, dx * 0.6, dx], y: [0, dy * 0.6, dy], rotate: [0, rot * 0.6, rot], opacity: [1, 1, 0] }}
          transition={{ duration: 0.95, delay, times: [0, 0.55, 1], ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          {i % 2 === 0 ? (
            <path d={starFourPath(200, 150, 4)} fill="#ffd977" />
          ) : (
            <path d="M200 145.5 L203.8 153 L196.2 153 Z" fill="url(#msr-gold)" />
          )}
        </motion.g>
      ))}

    {/* Seal-shatter flash, white-hot core, and shockwave ring — one-shot entry */}
    {!calm && (
      <>
        <motion.circle
          cx="200" cy="150" r="90" fill="url(#msr-core)"
          initial={{ opacity: 0.95, scale: 0.4 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
        <motion.circle
          cx="200" cy="150" r="30" fill="#ffffff"
          initial={{ opacity: 0.9, scale: 0.3 }}
          animate={{ opacity: 0, scale: 1.7 }}
          transition={{ duration: 0.7, delay: 0.18, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
        <motion.circle
          cx="200" cy="150" r="58" fill="none" stroke="#ffe9b0" strokeWidth="2.2"
          initial={{ opacity: 0.65, scale: 0.3 }}
          animate={{ opacity: 0, scale: 2.1 }}
          transition={{ duration: 1.15, delay: 0.3, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      </>
    )}
  </g>
);

/** ── revealed ────────────────────────────────────────────────────────── */

/** Placeholder celestial vista inside the open scroll until an asset exists. */
const VistaPlaceholder: React.FC<{ label: string; calm: boolean }> = ({ label, calm }) => (
  <g clipPath="url(#msr-frame-clip)">
    <rect x="112" y="80" width="176" height="138" fill="url(#msr-vista-sky)" />

    {/* Stars */}
    {[[130, 96], [158, 90], [236, 94], [268, 104], [196, 88], [150, 108]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 1.3 : 0.9} fill="#ffffff" opacity="0.7" />
    ))}

    {/* Glowing orb low on the horizon + its light path reflecting downward */}
    <circle cx="200" cy="166" r="22" fill="url(#msr-burst)" />
    <circle cx="200" cy="166" r="10" fill="#ffe9b0" opacity="0.95" />
    <path d="M196 170 L204 170 L211 218 L189 218 Z" fill="#ffe9b0" opacity="0.22" />

    {/* Layered violet mountain ridges */}
    <path
      d="M112 178 L136 148 L158 172 L184 142 L212 170 L240 146 L266 174 L288 156 L288 218 L112 218 Z"
      fill="#6d3fb0" opacity="0.5"
    />
    <path
      d="M112 192 L142 162 L168 188 L200 158 L228 186 L256 164 L288 190 L288 218 L112 218 Z"
      fill="#3b2066" opacity="0.75"
    />
    <path
      d="M112 208 L150 184 L186 206 L224 182 L258 206 L288 192 L288 218 L112 218 Z"
      fill="#1c0f33" opacity="0.9"
    />

    {/* Dark pagoda silhouettes on the left */}
    <g fill="#150a28">
      <rect x="126" y="180" width="16" height="14" />
      <path d="M122 180 L134 172 L146 180 Z" />
      <rect x="129" y="166" width="10" height="8" />
      <path d="M126 166 L134 159 L142 166 Z" />
      <rect x="152" y="188" width="12" height="12" />
      <path d="M149 188 L158 181 L167 188 Z" />
    </g>

    {/* Pink cherry-blossom cluster on the right */}
    <path
      d="M262 218 C263 200 260 186 266 168 M266 184 C272 176 276 172 280 164"
      fill="none" stroke="#24102e" strokeWidth="3" strokeLinecap="round"
    />
    <circle cx="260" cy="156" r="13" fill="url(#msr-blossom)" />
    <circle cx="275" cy="148" r="11" fill="url(#msr-blossom)" />
    <circle cx="282" cy="164" r="9" fill="url(#msr-blossom)" />
    <circle cx="267" cy="138" r="8" fill="url(#msr-blossom)" opacity="0.9" />
    {[[252, 176], [284, 182], [270, 192]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="1.2" fill="#f490c6" opacity="0.8" />
    ))}

    {/* Drifting gold sparkles */}
    {[[144, 132], [232, 122], [206, 196]].map(([cx, cy], i) =>
      calm ? (
        <circle key={i} cx={cx} cy={cy} r="1.4" fill="#ffd977" opacity="0.6" />
      ) : (
        <motion.path
          key={i}
          d={starFourPath(cx, cy, 3)}
          fill="#ffd977"
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 2.6 + i * 0.7, delay: i * 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ),
    )}

    <text
      x="200" y="198" textAnchor="middle" fontSize="10" letterSpacing="2"
      fill="#e9d5ff" opacity="0.7" fontFamily="serif" fontStyle="italic"
    >
      {label}
    </text>
  </g>
);

/** A gold hanging rod with end caps, spear finials, and a sheen. */
const HangingRod: React.FC<{ y: number }> = ({ y }) => (
  <g>
    <rect x="86" y={y} width="228" height="22" rx="11" fill="url(#msr-gold)" />
    <rect x="94" y={y + 4} width="212" height="5" rx="2.5" fill="#ffffff" opacity="0.3" />
    <rect x="94" y={y - 2} width="5" height="26" rx="2.5" fill="url(#msr-gold)" />
    <rect x="301" y={y - 2} width="5" height="26" rx="2.5" fill="url(#msr-gold)" />
    <SpearFinial x={84} y={y + 11} dir={-1} />
    <SpearFinial x={316} y={y + 11} dir={1} />
  </g>
);

const RevealedScroll: React.FC<{
  label: string;
  asset?: RevealedMediaAsset | null;
  /**
   * True once the supplied asset's pixels have reported `load`. Until then
   * (or if the fetch fails) the placeholder vista stays mounted beneath the
   * frame, so a slow or broken asset never leaves a dark void at the payoff
   * moment. Once ready, the vista unmounts and the frame renders exactly as
   * before — no hidden artwork or animations linger behind the asset.
   */
  assetReady: boolean;
  onAssetReady: () => void;
  calm: boolean;
}> = ({ label, asset, assetReady, onAssetReady, calm }) => (
  <g>
    {/* Brief golden reveal flare + ring echo on entry — the meaningful beat */}
    {!calm && (
      <>
        <motion.circle
          cx="200" cy="150" r="110" fill="url(#msr-core)"
          initial={{ opacity: 0.85, scale: 0.5 }}
          animate={{ opacity: 0, scale: 1.25 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
        <motion.circle
          cx="200" cy="150" r="88" fill="none" stroke="#ffe9b0" strokeWidth="1.6"
          initial={{ opacity: 0.5, scale: 0.5 }}
          animate={{ opacity: 0, scale: 1.35 }}
          transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      </>
    )}

    {/* The hanging scroll — settles in, then a barely-there sway so the
        content stays the focus */}
    <motion.g
      initial={calm ? false : { opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: calm ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      <motion.g
        animate={calm ? {} : { rotate: [-0.55, 0.55, -0.55] }}
        transition={{ duration: 9.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}
      >
        {/* Suspension glow behind the open scroll */}
        <motion.ellipse
          cx="200" cy="152" rx="168" ry="124" fill="url(#msr-burst)"
          animate={calm ? { opacity: 0.26 } : { opacity: [0.2, 0.3, 0.2] }}
          transition={calm ? { duration: 0 } : { duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* The manifested content — blooms up a beat after the frame lands */}
        <motion.g
          initial={calm ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: calm ? 0 : 0.7, delay: calm ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Parchment viewport framed in thin gold trim */}
          <rect x="112" y="80" width="176" height="138" rx="7" fill="#1d0e38" stroke="url(#msr-gold)" strokeWidth="2.5" />
          {asset ? (
            <>
              {/* Loading/failure fallback: the vista holds the frame until
                  the asset's pixels arrive (and stays if they never do). */}
              {!assetReady && <VistaPlaceholder label={label} calm={calm} />}
              <image
                href={asset.src}
                x="114" y="82" width="172" height="134"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#msr-frame-clip)"
                opacity="0.96"
                onLoad={onAssetReady}
              />
            </>
          ) : (
            <VistaPlaceholder label={label} calm={calm} />
          )}
          <rect x="117" y="85" width="166" height="128" rx="4" fill="none" stroke="#ffe9b0" strokeWidth="0.8" opacity="0.35" />

          {/* Corner braces tying the viewport to the rods */}
          {[108, 284].map((x) => (
            <g key={x}>
              <rect x={x} y="76" width="8" height="12" rx="2" fill="url(#msr-gold)" />
              <rect x={x} y="212" width="8" height="12" rx="2" fill="url(#msr-gold)" />
            </g>
          ))}

          {/* A light cascade washing down the surface, once */}
          {!calm && (
            <g clipPath="url(#msr-frame-clip)">
              <motion.rect
                x="112" y="54" width="176" height="26" fill="url(#msr-wash)"
                animate={{ y: [0, 95, 190], opacity: [0, 0.55, 0] }}
                transition={{ duration: 1.0, delay: 0.22, times: [0, 0.3, 1], ease: 'easeInOut' }}
              />
            </g>
          )}

          {/* Occasional soft golden shimmer sweeping the revealed surface */}
          {!calm && (
            <g clipPath="url(#msr-frame-clip)">
              <g transform="skewX(-14)">
                <motion.rect
                  x="40" y="70" width="42" height="160" fill="#ffffff" opacity="0.09"
                  animate={{ x: [0, 320] }}
                  transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 7, ease: 'easeInOut' }}
                />
              </g>
            </g>
          )}
        </motion.g>

        {/* Top rod with a small gold star ornament at its center */}
        <HangingRod y={58} />
        <circle cx="200" cy="69" r="9" fill="url(#msr-burst)" opacity="0.8" />
        <motion.path
          d={starFourPath(200, 69, 7)} fill="#fff0c2"
          animate={calm ? {} : { scale: [1, 1, 1.35, 1, 1], opacity: [0.9, 0.9, 1, 0.9, 0.9] }}
          transition={{ duration: 6.8, times: [0, 0.8, 0.86, 0.93, 1], repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />

        {/* Bottom rod with a gold medallion holding a violet gem */}
        <HangingRod y={222} />
        <circle cx="200" cy="233" r="11" fill="url(#msr-gold)" stroke="#7a4d0f" strokeWidth="1" />
        <motion.path
          d="M200 227.5 L205 233 L200 238.5 L195 233 Z" fill="url(#msr-gem)"
          animate={calm ? { opacity: 0.9 } : { opacity: [0.75, 1, 0.75] }}
          transition={calm ? { duration: 0 } : { duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Hanging gold chain pendant ending in a violet crystal drop —
            swings on its own lazy pendulum */}
        <motion.g
          animate={calm ? {} : { rotate: [-3, 3, -3] }}
          transition={{ duration: 6.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}
        >
          {[0, 1, 2].map((i) => (
            <circle key={i} cx="200" cy={248 + i * 6} r="2" fill="none" stroke="#f5c65c" strokeWidth="1.4" />
          ))}
          <path d="M200 264 L206.5 272 L200 285 L193.5 272 Z" fill="url(#msr-gem)" stroke="#f5c65c" strokeWidth="1" />
        </motion.g>
      </motion.g>
    </motion.g>
  </g>
);

export default function CelestialScrollVessel({
  state,
  asset,
  placeholderLabel,
  mediaKind,
}: CelestialScrollVesselProps) {
  const reduceMotion = useReducedMotion();
  const calm = !!reduceMotion;
  const label = placeholderLabel ?? MEDIA_KIND_LABEL[mediaKind];

  // The most recent asset src that finished loading. Living here on the
  // vessel (which stays mounted across state changes, unlike the per-state
  // scenes) means a once-loaded asset never re-shows the loading vista on
  // later reveals — the browser cache makes the swap effectively instant.
  const [readyAssetSrc, setReadyAssetSrc] = useState<string | null>(null);
  const assetReady = !!asset?.src && readyAssetSrc === asset.src;

  return (
    <svg
      viewBox="0 0 400 300"
      className="h-full w-full block"
      data-vessel="celestial-scroll"
      data-reveal-state={state}
      aria-hidden="true"
    >
      <ScrollDefs />
      {state === 'sealed' && <SealedScroll calm={calm} />}
      {state === 'unsealing' && <UnsealingScroll calm={calm} />}
      {state === 'revealed' && (
        <RevealedScroll
          label={label}
          asset={asset}
          calm={calm}
          assetReady={assetReady}
          onAssetReady={() => asset?.src && setReadyAssetSrc(asset.src)}
        />
      )}
    </svg>
  );
}

import React from 'react';
import { motion, AnimatePresence, useReducedMotion, type Transition } from 'motion/react';
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
 * ONE scroll, ONE continuous transformation. The vessel is a single
 * persistent SVG scene graph whose recognizable elements are mounted once
 * and morph between state-keyed configurations, so sealed → unsealing →
 * revealed reads as one fluid motion instead of three swapped drawings:
 *
 *   - the parchment cylinder unrolls into the open sheet, then grows into
 *     the revealed frame's mat — the same rect the whole way;
 *   - the two gold rods lie coaxial inside the roll while sealed — the
 *     bars hidden, only the tall end-collars and spear finials showing —
 *     then part, tilt, and extend into the revealed hanging rods: bars
 *     emerging as they travel, collars shrinking to end-caps, finials
 *     riding the rod ends outward;
 *   - the seal medallion dissolves in the shatter flash while its radiant
 *     core expands into the unsealing portal; on reveal the same core
 *     blooms over the frame and dissolves as the content coalesces behind
 *     a progressive wipe with a light band riding its front.
 *
 * The unsealing state is SUSTAINABLE: a ~1s opening flourish (shatter
 * flash, medallion dissolve, core expansion, sheet unroll, rods parting)
 * settles into an indefinite holding loop — breathing portal core, slow
 * counter-rotating ribbons / rays / qi wisps on non-synced periods,
 * staggered drifting sparks, motes, and a gentle whole-scroll bob — so the
 * caller can hold the state for as long as media generation takes without
 * the composition going dead or visibly repeating.
 *
 * Motion/SVG authoring notes (learned the hard way, keep these):
 *   - Never mix transform keyframes and opacity keyframes in one `animate`
 *     on an SVG element — motion leaves `opacity` permanently undefined
 *     (written as the invalid attribute "undefined" every frame). Split
 *     them: transforms on an outer <motion.g>, opacity keyframes on the
 *     inner shape.
 *   - State-morph elements carry `initial={false}` so the mount render
 *     already carries the current state's values; without it motion's
 *     first SVG render writes `undefined` attributes.
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

/** Shared gradient/filter/clip definitions for the persistent scene. */
const ScrollDefs: React.FC = () => (
  <defs>
    <linearGradient id="msr-parchment" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#f6f0ff" />
      <stop offset="35%" stopColor="#e9defa" />
      <stop offset="70%" stopColor="#c9b3e6" />
      <stop offset="100%" stopColor="#9d82c8" />
    </linearGradient>
    <linearGradient id="msr-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fff0c2" />
      <stop offset="35%" stopColor="#f5c65c" />
      <stop offset="70%" stopColor="#c98f2b" />
      <stop offset="100%" stopColor="#8a5a12" />
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
    {/* Soft white-gold vertical band that rides the reveal wipe front. */}
    <linearGradient id="msr-band" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#fff7e0" stopOpacity="0" />
      <stop offset="50%" stopColor="#fff7e0" stopOpacity="0.9" />
      <stop offset="100%" stopColor="#fff7e0" stopOpacity="0" />
    </linearGradient>
    <filter id="msr-soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
    <clipPath id="msr-frame-clip">
      <rect x="114" y="82" width="172" height="134" rx="5" />
    </clipPath>
  </defs>
);

/** Radiant 4-point star (compass sparkle) path centered at (cx, cy). */
const starFourPath = (cx: number, cy: number, r: number): string => {
  const s = r * 0.22;
  return (
    `M${cx} ${cy - r} Q${cx + s} ${cy - s} ${cx + r} ${cy} ` +
    `Q${cx + s} ${cy + s} ${cx} ${cy + r} Q${cx - s} ${cy + s} ${cx - s} ${cy} ` +
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

/** Placeholder celestial vista inside the open scroll until an asset exists. */
const VistaPlaceholder: React.FC<{ label: string; calm: boolean }> = ({ label, calm }) => (
  <g>
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
          animate={SPARKLE_OPACITY_ANIMATE}
          transition={SPARKLE_TRANSITIONS[i]}
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

/** ── state-keyed morph targets ───────────────────────────────────────── */

/** The parchment: rolled cylinder → unrolled sheet → revealed frame mat. */
const SHEET_GEOM = {
  sealed: { x: 112, y: 116, width: 176, height: 68, rx: 34 },
  unsealing: { x: 138, y: 96, width: 124, height: 108, rx: 10 },
  revealed: { x: 108, y: 76, width: 184, height: 146, rx: 9 },
} as const;

/** Gold trim hugging the sheet's edge (invisible while sealed). */
const TRIM_GEOM = {
  sealed: { x: 112, y: 116, width: 176, height: 68, rx: 34 },
  unsealing: { x: 138, y: 96, width: 124, height: 108, rx: 10 },
  revealed: { x: 112, y: 80, width: 176, height: 138, rx: 7 },
} as const;

/** Inner hairline inset from the trim. */
const INNER_TRIM_GEOM = {
  sealed: { x: 115, y: 119, width: 170, height: 62, rx: 30 },
  unsealing: { x: 141, y: 99, width: 118, height: 102, rx: 8 },
  revealed: { x: 117, y: 85, width: 166, height: 128, rx: 4 },
} as const;

/**
 * Rod center Y per state (top / bottom). While sealed the two rods lie
 * coaxial at the roll's axis — the bars hidden inside the parchment, only
 * the end-collars and finials showing — then part to the sheet's edges.
 */
const ROD_Y: Record<string, Record<ManifestationRevealState, number>> = {
  top: { sealed: 150, unsealing: 102, revealed: 69 },
  bottom: { sealed: 150, unsealing: 198, revealed: 233 },
};

/** Rod bar length (scaleX of the full 228-wide rod). */
const ROD_SCALE_X = { sealed: 0.55, unsealing: 0.66, revealed: 1 } as const;

/**
 * Finial/collar distance from the rod center per state. Sealed sits at the
 * roll's ends (the finials ARE the rolled scroll's end ornaments); the
 * later states track the extending bar ends.
 */
const FINIAL_X = { sealed: 100, unsealing: 77, revealed: 116 } as const;

/**
 * End-collar geometry per state — left assembly, rod-local coords. The
 * roll's tall gold end-collar morphs into the hanging rod's small end-cap.
 */
const COLLAR_GEOM = {
  sealed: { x: 2, y: -40, width: 14, height: 80, rx: 7 },
  unsealing: { x: 8, y: -22, width: 9, height: 44, rx: 5 },
  revealed: { x: 12, y: -13, width: 5, height: 26, rx: 2.5 },
} as const;

/** Right-assembly mirror of COLLAR_GEOM (x flipped around the rod end). */
const COLLAR_GEOM_R = {
  sealed: { x: -16, y: -40, width: 14, height: 80, rx: 7 },
  unsealing: { x: -17, y: -22, width: 9, height: 44, rx: 5 },
  revealed: { x: -17, y: -13, width: 5, height: 26, rx: 2.5 },
} as const;

/** Seal core radius: seal heart → open portal → bloom covering the frame. */
const CORE_R = { sealed: 14, unsealing: 46, revealed: 120 } as const;

/** Central 4-point star scale per state. */
const STAR_SCALE = { sealed: 0.73, unsealing: 1, revealed: 0.35 } as const;

/** Ambient glow pool behind the scroll. */
const GLOW_GEOM = {
  sealed: { cy: 150, rx: 152, ry: 76 },
  unsealing: { cy: 150, rx: 158, ry: 96 },
  revealed: { cy: 152, rx: 168, ry: 124 },
} as const;

const FILL_BOX_CENTER = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

/** [cx, cy, r, duration, delay, color] — slow gold/white motes. */
const MOTES: Array<[number, number, number, number, number, string]> = [
  [140, 118, 1.8, 5.4, 0, '#ffe9b0'],
  [258, 112, 1.5, 6.2, 1.2, '#ffffff'],
  [178, 210, 1.6, 5.8, 0.6, '#ffd977'],
  [238, 196, 1.4, 6.6, 2.0, '#ffe9b0'],
];

/** [cx, cy, r, duration, delay] — faint ember-red sparks (sealed only). */
const EMBERS: Array<[number, number, number, number, number]> = [
  [122, 188, 1.6, 4.6, 0.4],
  [282, 178, 1.4, 5.2, 1.6],
  [214, 96, 1.3, 5.8, 2.6],
];

/**
 * [dx, dy, duration, delay, color] — sparks drifting slowly out of the
 * portal. Long, non-synced periods so the holding loop never visibly
 * repeats while the caller waits on generated media.
 */
const DRIFTERS: Array<[number, number, number, number, string]> = [
  [76, -56, 3.4, 0, '#ffd977'],
  [-80, -40, 4.2, 0.8, '#ffe9b0'],
  [88, 26, 3.0, 1.6, '#ffd977'],
  [-86, 48, 4.6, 0.4, '#e9d5ff'],
  [34, -80, 3.8, 2.2, '#ffe9b0'],
  [-28, 82, 4.4, 1.1, '#ffd977'],
  [98, -10, 3.2, 2.8, '#fb923c'],
  [-54, -74, 4.0, 1.9, '#f87171'],
];

/**
 * Reference-stable loop animates/transitions. Hoisted so a state change
 * never restarts an ambient loop: motion re-resolves animation targets
 * when the `animate` object identity changes, which both breaks the
 * loop's phase continuity (a visible seam at the state handoff) and emits
 * a one-frame `undefined` attribute write while keyframes re-resolve.
 */
const BOB_ANIMATE = { y: [0, -3, 0] };
const BOB_TRANSITION = { duration: 5.2, repeat: Infinity, ease: 'easeInOut' } as const;
const BREATHE_SCALE_ANIMATE = { scale: [0.97, 1.045, 0.97] };
const BREATHE_OPACITY_ANIMATE = { opacity: [0.82, 1, 0.82] };
const BREATHE_TRANSITION = { duration: 3, repeat: Infinity, ease: 'easeInOut' } as const;
const GLOW_OPACITY_ANIMATE = { opacity: [0.22, 0.36, 0.22] };
const GLOW_OPACITY_TRANSITION = { duration: 5, repeat: Infinity, ease: 'easeInOut' } as const;
const ROTATE_CW_ANIMATE = { rotate: 360 };
const ROTATE_CCW_ANIMATE = { rotate: -360 };
const RAYS_ROTATE_TRANSITION = { repeat: Infinity, duration: 48, ease: 'linear' } as const;
const RIBBONS_ROTATE_TRANSITION = { repeat: Infinity, duration: 18, ease: 'linear' } as const;
const WISPS_ROTATE_TRANSITION = { repeat: Infinity, duration: 26, ease: 'linear' } as const;
const SHIMMER_ANIMATE = { x: [0, 320] };
const SHIMMER_TRANSITION = { duration: 2.2, repeat: Infinity, repeatDelay: 4.5, ease: 'easeInOut' } as const;
const SPARKLE_OPACITY_ANIMATE = { opacity: [0.2, 0.9, 0.2] };
const SPARKLE_TRANSITIONS = [0, 1, 2].map((i) => ({
  duration: 2.6 + i * 0.7,
  delay: i * 0.8,
  repeat: Infinity,
  ease: 'easeInOut' as const,
}));
const DRIFTER_WRAP_ANIMATES = DRIFTERS.map(([dx, dy]) => ({
  x: [0, dx],
  y: [0, dy],
  scale: [0.7, 1, 0.5],
}));
const DRIFTER_OPACITY_ANIMATE = { opacity: [0, 0.85, 0] };
const DRIFTER_TRANSITIONS = DRIFTERS.map(([, , dur, delay]) => ({
  duration: dur,
  delay,
  repeat: Infinity,
  ease: 'easeOut' as const,
}));
const MOTE_WRAP_ANIMATE = { y: [0, -13, 0] };
const MOTE_OPACITY_ANIMATE = { opacity: [0.1, 0.8, 0.1] };
const MOTE_TRANSITIONS = MOTES.map(([, , , dur, delay]) => ({
  duration: dur,
  delay,
  repeat: Infinity,
  ease: 'easeInOut' as const,
}));
const EMBER_WRAP_ANIMATES = EMBERS.map((_, i) => ({
  y: [0, -18, 0],
  x: [0, i % 2 === 0 ? 5 : -5, 0],
}));
const EMBER_OPACITY_ANIMATE = { opacity: [0, 0.75, 0] };
const EMBER_TRANSITIONS = EMBERS.map(([, , , dur, delay]) => ({
  duration: dur,
  delay,
  repeat: Infinity,
  ease: 'easeInOut' as const,
}));

export default function CelestialScrollVessel({
  state,
  asset,
  placeholderLabel,
  mediaKind,
}: CelestialScrollVesselProps) {
  const reduceMotion = useReducedMotion();
  const calm = !!reduceMotion;
  const label = placeholderLabel ?? MEDIA_KIND_LABEL[mediaKind];
  const revealed = state === 'revealed';

  /** Geometry morphs ride a soft spring; rods a bouncier one (overshoot). */
  const morph: Transition = calm ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 17 };
  const rodSpring: Transition = calm ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 13 };
  const fade = (delay = 0): Transition =>
    calm ? { duration: 0 } : { duration: 0.45, delay, ease: 'easeInOut' };

  /** Portal core: explodes open into unsealing, blooms out on reveal. */
  const coreTransition: Transition = calm
    ? { duration: 0 }
    : {
        r: state === 'unsealing'
          ? { duration: 0.85, ease: 'easeOut' }
          : { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
        opacity: revealed
          ? { duration: 0.75, delay: 0.4, ease: 'easeIn' }
          : { duration: 0.3 },
      };

  /** Content wipe: sweeps open on reveal, snaps shut when leaving it. */
  const wipeTransition: Transition = calm
    ? { duration: 0 }
    : revealed
      ? { duration: 0.85, delay: 0.35, ease: [0.22, 1, 0.36, 1] }
      : { duration: 0.2 };

  /** Rod bars: concealed inside the roll while sealed; they fade in once
      the rods have started parting, so they read as emerging from the
      unrolling parchment, and slip back out of sight on re-seal. */
  const barFade: Transition = calm
    ? { duration: 0 }
    : state === 'unsealing'
      ? { duration: 0.3, delay: 0.2, ease: 'easeOut' }
      : { duration: 0.2 };

  return (
    <svg
      viewBox="0 0 400 300"
      className="h-full w-full block"
      data-vessel="celestial-scroll"
      data-reveal-state={state}
      aria-hidden="true"
    >
      <ScrollDefs />

      {/* Progressive reveal wipe — opens left→right inside the frame clip. */}
      <clipPath id="msr-wipe-clip">
        <motion.rect
          x={114}
          y={82}
          height={134}
          initial={false}
          animate={{ width: revealed ? 172 : 0 }}
          transition={wipeTransition}
        />
      </clipPath>

      {/* Ground shadow — fades as the scroll lifts into its hanging form. */}
      <motion.ellipse
        cx={200}
        rx={118}
        ry={12}
        fill="#000000"
        filter="url(#msr-soft)"
        initial={false}
        animate={{
          cy: state === 'sealed' ? 206 : 214,
          opacity: revealed ? 0 : state === 'unsealing' ? 0.4 : 0.45,
        }}
        transition={fade()}
      />

      {/* Ambient glow pool — persists and breathes through every state.
          Geometry morphs on the ellipse; the opacity loop rides a wrapper
          so state changes never restart the breathing. */}
      <motion.g
        animate={calm ? { opacity: 0.28 } : GLOW_OPACITY_ANIMATE}
        transition={calm ? { duration: 0 } : GLOW_OPACITY_TRANSITION}
      >
        <motion.ellipse
          cx={200}
          fill="url(#msr-burst)"
          initial={false}
          animate={{
            cy: GLOW_GEOM[state].cy,
            rx: GLOW_GEOM[state].rx,
            ry: GLOW_GEOM[state].ry,
          }}
          transition={morph}
        />
      </motion.g>

      {/* The scroll body — one gentle bob carried through every state. */}
      <motion.g
        animate={calm ? {} : BOB_ANIMATE}
        transition={calm ? { duration: 0 } : BOB_TRANSITION}
      >
        {/* Parchment: roll → sheet → frame mat (one morphing rect). */}
        <motion.rect
          fill="url(#msr-parchment)"
          initial={false}
          animate={{ ...SHEET_GEOM[state] }}
          transition={morph}
        />

        {/* Rolled-cylinder sheens — dissolve as the parchment unrolls. */}
        <motion.g
          initial={false}
          animate={{ opacity: state === 'sealed' ? 1 : 0 }}
          transition={calm ? { duration: 0 } : { duration: 0.25 }}
        >
          <rect x="124" y="123" width="152" height="14" rx="7" fill="#ffffff" opacity="0.32" />
          <rect x="124" y="163" width="152" height="13" rx="6.5" fill="#4c1d95" opacity="0.18" />
          <ellipse cx="200" cy="150" rx="30" ry="34" fill="#ffffff" opacity="0.12" />
        </motion.g>

        {/* Dark viewport backing inside the parchment mat (revealed). */}
        <motion.rect
          x={112}
          y={80}
          width={176}
          height={138}
          rx={7}
          fill="#1d0e38"
          initial={false}
          animate={{ opacity: revealed ? 0.97 : 0 }}
          transition={fade(revealed ? 0.2 : 0)}
        />

        {/* Revealed content, coalescing behind the wipe; shimmer and the
            light band riding the wipe front live in the same frame clip. */}
        <g clipPath="url(#msr-frame-clip)">
          <g clipPath="url(#msr-wipe-clip)">
            {asset ? (
              <image
                href={asset.src}
                x="114" y="82" width="172" height="134"
                preserveAspectRatio="xMidYMid slice"
                opacity="0.96"
              />
            ) : (
              <VistaPlaceholder label={label} calm={calm} />
            )}
          </g>

          {/* Occasional soft golden shimmer sweeping the revealed surface. */}
          {!calm && (
            <motion.g
              initial={false}
              animate={{ opacity: revealed ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <g transform="skewX(-14)">
                <motion.rect
                  x="40" y="70" width="42" height="160" fill="#ffffff" opacity="0.1"
                  animate={SHIMMER_ANIMATE}
                  transition={SHIMMER_TRANSITION}
                />
              </g>
            </motion.g>
          )}

          {/* Light band riding the wipe front on reveal — transforms on the
              wrapper, opacity keyframes on the rect (see header notes). */}
          <g transform="skewX(-14)">
            <motion.g
              initial={false}
              animate={calm || !revealed ? { x: 118 } : { x: [118, 330] }}
              transition={calm ? { duration: 0 } : { duration: 0.8, delay: 0.35, ease: 'easeInOut' }}
            >
              <motion.rect
                y={60}
                width={34}
                height={190}
                fill="url(#msr-band)"
                initial={false}
                animate={calm || !revealed ? { opacity: 0 } : { opacity: [0, 0.85, 0] }}
                transition={calm ? { duration: 0 } : { duration: 0.8, delay: 0.35, ease: 'easeInOut' }}
              />
            </motion.g>
          </g>
        </g>

        {/* Gold trim morphing with the sheet: soft glow while unsealing,
            crisp frame once revealed. */}
        <motion.rect
          fill="none"
          stroke="#ffd977"
          strokeWidth={2}
          filter="url(#msr-soft)"
          initial={false}
          animate={{ ...TRIM_GEOM[state], opacity: state === 'unsealing' ? 0.7 : 0 }}
          transition={{ ...morph, opacity: fade(state === 'unsealing' ? 0.35 : 0) }}
        />
        <motion.rect
          fill="none"
          stroke="url(#msr-gold)"
          strokeWidth={2.5}
          initial={false}
          animate={{ ...TRIM_GEOM[state], opacity: state === 'sealed' ? 0 : state === 'unsealing' ? 0.55 : 1 }}
          transition={{ ...morph, opacity: fade(state === 'sealed' ? 0 : 0.3) }}
        />
        <motion.rect
          fill="none"
          stroke="#fff0c2"
          strokeWidth={0.9}
          initial={false}
          animate={{
            ...INNER_TRIM_GEOM[state],
            opacity: state === 'sealed' ? 0 : state === 'unsealing' ? 0.5 : 0.35,
          }}
          transition={{ ...morph, opacity: fade(state === 'sealed' ? 0 : 0.35) }}
        />

        {/* Corner braces tying the viewport to the rods (revealed). */}
        <motion.g
          initial={false}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={fade(revealed ? 0.45 : 0)}
        >
          {[108, 284].map((x) => (
            <g key={x}>
              <rect x={x} y="76" width="8" height="12" rx="2" fill="url(#msr-gold)" />
              <rect x={x} y="212" width="8" height="12" rx="2" fill="url(#msr-gold)" />
            </g>
          ))}
        </motion.g>

        {/* Portal core — the seal's radiant heart, expanded. One breathing
            loop persists across states so the handoff never cuts (scale on
            the wrapper, opacity on the inner group — see header notes). */}
        <motion.g
          animate={calm ? {} : BREATHE_SCALE_ANIMATE}
          transition={calm ? { duration: 0 } : BREATHE_TRANSITION}
          style={FILL_BOX_CENTER}
        >
          <motion.g
            animate={calm ? { opacity: 0.9 } : BREATHE_OPACITY_ANIMATE}
            transition={calm ? { duration: 0 } : BREATHE_TRANSITION}
          >
            <motion.circle
              cx={200}
              cy={150}
              fill="url(#msr-core)"
              initial={false}
              animate={{ r: CORE_R[state], opacity: revealed ? 0 : 1 }}
              transition={coreTransition}
            />
            <motion.g
              initial={false}
              animate={{ scale: STAR_SCALE[state], opacity: revealed ? 0 : 1 }}
              transition={fade(revealed ? 0.3 : 0)}
              style={FILL_BOX_CENTER}
            >
              <path d={starFourPath(200, 150, 15)} fill="#fff7e0" />
              <path d={starFourPath(200, 150, 6.5)} fill="#ffffff" />
            </motion.g>
          </motion.g>
        </motion.g>

        {/* Radiating rays around the portal — slow 48s rotation. */}
        <motion.g
          initial={false}
          animate={{ opacity: state === 'unsealing' ? 1 : 0 }}
          transition={fade(state === 'unsealing' ? 0.25 : 0)}
        >
          <motion.g
            animate={calm ? {} : ROTATE_CW_ANIMATE}
            transition={calm ? { duration: 0 } : RAYS_ROTATE_TRANSITION}
            style={FILL_BOX_CENTER}
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
        </motion.g>

        {/* Golden energy ribbons sweeping around the core — 18s swirl. */}
        <motion.g
          initial={false}
          animate={{ opacity: state === 'unsealing' ? 0.9 : 0 }}
          transition={fade(state === 'unsealing' ? 0.3 : 0)}
        >
          <motion.g
            animate={calm ? {} : ROTATE_CW_ANIMATE}
            transition={calm ? { duration: 0 } : RIBBONS_ROTATE_TRANSITION}
            style={FILL_BOX_CENTER}
          >
            <path d="M138 150 A66 44 0 0 1 200 106" fill="none" stroke="url(#msr-gold)" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" />
            <path d="M262 150 A66 44 0 0 1 200 194" fill="none" stroke="url(#msr-gold)" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" />
            <path d="M200 96 A78 54 0 0 1 278 150" fill="none" stroke="#ffe9b0" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
            <path d="M200 204 A78 54 0 0 1 122 150" fill="none" stroke="#ffe9b0" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
          </motion.g>
        </motion.g>

        {/* Faint violet qi wisps counter-swirling — 26s loop. */}
        <motion.g
          initial={false}
          animate={{ opacity: state === 'unsealing' ? 1 : 0 }}
          transition={fade(state === 'unsealing' ? 0.35 : 0)}
        >
          <motion.g
            animate={calm ? {} : ROTATE_CCW_ANIMATE}
            transition={calm ? { duration: 0 } : WISPS_ROTATE_TRANSITION}
            style={FILL_BOX_CENTER}
          >
            <path d="M128 138 A92 64 0 0 1 272 168" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
            <path d="M272 132 A92 64 0 0 1 128 162" fill="none" stroke="#a855f7" strokeWidth="1.4" strokeLinecap="round" opacity="0.3" />
          </motion.g>
        </motion.g>

        {/* Sparks drifting slowly out of the portal — staggered 3.0–4.6s
            periods keep the holding state alive without a visible repeat.
            Transforms ride the wrapper, opacity the circle (header notes). */}
        {!calm && (
          <motion.g
            initial={false}
            animate={{ opacity: state === 'unsealing' ? 1 : 0 }}
            transition={{ duration: 0.6, delay: state === 'unsealing' ? 0.55 : 0 }}
          >
            {DRIFTERS.map(([, , , , color], i) => (
              <motion.g
                key={i}
                animate={DRIFTER_WRAP_ANIMATES[i]}
                transition={DRIFTER_TRANSITIONS[i]}
                style={FILL_BOX_CENTER}
              >
                <motion.circle
                  cx={200}
                  cy={150}
                  r={color === '#ffd977' ? 2.2 : 1.6}
                  fill={color}
                  animate={DRIFTER_OPACITY_ANIMATE}
                  transition={DRIFTER_TRANSITIONS[i]}
                />
              </motion.g>
            ))}
          </motion.g>
        )}

        {/* The two rods — while sealed they lie coaxial inside the roll:
            the bars hidden, only the tall end-collars and outward spear
            finials showing. On unseal the rods part to the sheet's edges,
            the bars emerging as they travel, the collars shrinking to
            end-caps, the finials riding the rod ends outward. Springs
            give the settle a slight overshoot. */}
        {(['top', 'bottom'] as const).map((pos) => (
          <motion.g
            key={pos}
            initial={false}
            animate={{
              x: 200,
              y: ROD_Y[pos][state],
              rotate: state === 'unsealing' ? (pos === 'top' ? -5 : 5) : 0,
            }}
            transition={rodSpring}
            style={FILL_BOX_CENTER}
          >
            {/* Rod bar + sheen — concealed inside the rolled parchment
                while sealed, emerging as the rods part. */}
            <motion.rect
              x={-114}
              y={-11}
              width={228}
              height={22}
              rx={11}
              fill="url(#msr-gold)"
              initial={false}
              animate={{ scaleX: ROD_SCALE_X[state], opacity: state === 'sealed' ? 0 : 1 }}
              transition={{ ...rodSpring, opacity: barFade }}
              style={FILL_BOX_CENTER}
            />
            <motion.rect
              x={-106}
              y={-7}
              width={212}
              height={5}
              rx={2.5}
              fill="#ffffff"
              initial={false}
              animate={{ scaleX: ROD_SCALE_X[state], opacity: state === 'sealed' ? 0 : 0.3 }}
              transition={{ ...rodSpring, opacity: barFade }}
              style={FILL_BOX_CENTER}
            />
            {/* End assemblies — the roll's tall end-collars morph into the
                hanging rods' small end-caps; spears ride the rod ends. */}
            <motion.g initial={false} animate={{ x: -FINIAL_X[state] }} transition={rodSpring}>
              <motion.rect
                fill="url(#msr-gold)"
                initial={false}
                animate={{ ...COLLAR_GEOM[state] }}
                transition={rodSpring}
              />
              <motion.rect
                x={5.5}
                y={-35}
                width={3}
                height={70}
                rx={1.5}
                fill="#ffffff"
                initial={false}
                animate={{ opacity: state === 'sealed' ? 0.35 : 0 }}
                transition={{ ...rodSpring, opacity: fade(0.1) }}
              />
              <SpearFinial x={0} y={0} dir={-1} />
            </motion.g>
            <motion.g initial={false} animate={{ x: FINIAL_X[state] }} transition={rodSpring}>
              <motion.rect
                fill="url(#msr-gold)"
                initial={false}
                animate={{ ...COLLAR_GEOM_R[state] }}
                transition={rodSpring}
              />
              <motion.rect
                x={-12.5}
                y={-35}
                width={3}
                height={70}
                rx={1.5}
                fill="#ffffff"
                initial={false}
                animate={{ opacity: state === 'sealed' ? 0.35 : 0 }}
                transition={{ ...rodSpring, opacity: fade(0.1) }}
              />
              <SpearFinial x={0} y={0} dir={1} />
            </motion.g>
          </motion.g>
        ))}

        {/* Revealed ornaments — fade in once the rods have settled. */}
        <motion.g
          initial={false}
          animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.5 }}
          transition={fade(revealed ? 0.5 : 0)}
          style={FILL_BOX_CENTER}
        >
          <circle cx="200" cy="69" r="9" fill="url(#msr-burst)" opacity="0.8" />
          <path d={starFourPath(200, 69, 7)} fill="#fff0c2" />
        </motion.g>
        <motion.g
          initial={false}
          animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.5 }}
          transition={fade(revealed ? 0.55 : 0)}
          style={FILL_BOX_CENTER}
        >
          <circle cx="200" cy="233" r="11" fill="url(#msr-gold)" stroke="#7a4d0f" strokeWidth="1" />
          <path d="M200 227.5 L205 233 L200 238.5 L195 233 Z" fill="url(#msr-gem)" />
        </motion.g>
        <motion.g
          initial={false}
          animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.5 }}
          transition={fade(revealed ? 0.65 : 0)}
          style={FILL_BOX_CENTER}
        >
          {[0, 1, 2].map((i) => (
            <circle key={i} cx="200" cy={248 + i * 6} r="2" fill="none" stroke="#f5c65c" strokeWidth="1.4" />
          ))}
          <path d="M200 264 L206.5 272 L200 285 L193.5 272 Z" fill="url(#msr-gem)" stroke="#f5c65c" strokeWidth="1" />
        </motion.g>

        {/* The intact ornate seal — filigree starburst + medallion. It
            binds the rods while sealed and dissolves outward on unseal. */}
        <motion.g
          initial={false}
          animate={{
            opacity: state === 'sealed' ? 1 : 0,
            scale: state === 'sealed' ? 1 : 1.35,
          }}
          transition={calm ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
          style={FILL_BOX_CENTER}
        >
          <SealStarburst cx={200} cy={150} />
          <circle cx="200" cy="150" r="21" fill="url(#msr-gold)" stroke="#7a4d0f" strokeWidth="1.2" />
          <circle cx="200" cy="150" r="16.5" fill="none" stroke="#fff0c2" strokeWidth="0.8" opacity="0.6" />
        </motion.g>

        {/* Seal-shatter flash — one-shot on entering unsealing. */}
        <AnimatePresence>
          {!calm && state === 'unsealing' && (
            <motion.circle
              key="seal-flash"
              cx={200}
              cy={150}
              r={90}
              fill="url(#msr-core)"
              initial={{ opacity: 0.95, scale: 0.4 }}
              animate={{ opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={FILL_BOX_CENTER}
            />
          )}
        </AnimatePresence>
      </motion.g>

      {/* Slow gold/white motes drifting around the scroll — persistent,
          dimmed once the revealed artwork takes focus. Transforms ride the
          wrapper, opacity the circle (see header notes). */}
      {!calm && (
        <motion.g initial={false} animate={{ opacity: revealed ? 0.5 : 1 }} transition={fade()}>
          {MOTES.map(([cx, cy, r, , , color], i) => (
            <motion.g
              key={`mote-${i}`}
              animate={MOTE_WRAP_ANIMATE}
              transition={MOTE_TRANSITIONS[i]}
            >
              <motion.circle
                cx={cx} cy={cy} r={r} fill={color}
                animate={MOTE_OPACITY_ANIMATE}
                transition={MOTE_TRANSITIONS[i]}
              />
            </motion.g>
          ))}
        </motion.g>
      )}

      {/* Faint ember sparks — sealed-only decoration, dissolved on unseal. */}
      {!calm && (
        <motion.g
          initial={false}
          animate={{ opacity: state === 'sealed' ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        >
          {EMBERS.map(([cx, cy, r], i) => (
            <motion.g
              key={`ember-${i}`}
              animate={EMBER_WRAP_ANIMATES[i]}
              transition={EMBER_TRANSITIONS[i]}
            >
              <motion.circle
                cx={cx} cy={cy} r={r} fill={i % 2 === 0 ? '#f87171' : '#fb923c'}
                animate={EMBER_OPACITY_ANIMATE}
                transition={EMBER_TRANSITIONS[i]}
              />
            </motion.g>
          ))}
        </motion.g>
      )}
    </svg>
  );
}

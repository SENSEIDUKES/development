"use client";

import React from "react";
import { motion } from "motion/react";
import { useScrubberReducedMotion as useReducedMotion } from "./useScrubberReducedMotion";

/**
 * Trail preset registry — the cosmetic slot for the Journey Scrubber's
 * milestone markers (the dots along the path).
 *
 * A trail preset is a renderer for a single milestone marker. The scrubber
 * owns marker positions along the shared curve and the lit/unlit state
 * (lit once the traveler passes); a preset only decides what a marker
 * looks like — dots, stars, scrolls. Markers render in local space
 * centered on (0, 0); the scrubber positions each with a transform.
 *
 * Presets are picked by stable id via the scrubber's `trailStyle` prop —
 * not free-form config. Future presets add one entry here:
 *
 *   1. Create a component that honors `TrailMarkerProps` and renders one
 *      marker in both lit and unlit states, ~5px across.
 *   2. Register it in `TRAILS` under a stable id.
 *
 * Reduced-motion rule: twinkle and pulse loops must fall back to static,
 * calm presentation via `useReducedMotion`.
 */

export interface TrailMarkerProps {
  /** Whether the traveler has passed this milestone. */
  lit: boolean;
  /** Primary accent. */
  accent: string;
  /** Softer accent for lit glows. */
  accentSoft: string;
  /** Scrubber-defined glow filter id. */
  glowId: string;
  /** Marker index along the path — for staggered animation phases. */
  index: number;
}

export type TrailMarkerComponent = React.FC<TrailMarkerProps>;

/** Shared dim tone for unlit markers, matching the resting path. */
const UNLIT_STROKE = "#8b8b9e";

/** qi-glow (default) — the classic milestone dots, exactly the original rendering. */
const QiGlowMarker: TrailMarkerComponent = ({ lit, accentSoft, glowId }) => (
  <circle
    r={lit ? 2 : 1.4}
    fill={lit ? accentSoft : "none"}
    stroke={lit ? "none" : UNLIT_STROKE}
    strokeWidth="0.8"
    opacity={lit ? 0.95 : 0.45}
    filter={lit ? `url(#${glowId})` : undefined}
  />
);

/**
 * starlight-trail — every milestone becomes a tiny celestial star. Lit
 * stars glow and twinkle on their own calm phase; unlit stars rest as
 * faint outlines.
 */
const STAR_D = "M 0 -3.7 L 1 -1 L 3.7 0 L 1 1 L 0 3.7 L -1 1 L -3.7 0 L -1 -1 Z";

const StarlightMarker: TrailMarkerComponent = ({ lit, accentSoft, glowId, index }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.path
      initial={false}
      d={STAR_D}
      fill={lit ? accentSoft : "none"}
      stroke={lit ? "none" : UNLIT_STROKE}
      strokeWidth="0.7"
      filter={lit ? `url(#${glowId})` : undefined}
      animate={
        lit ? (reduceMotion ? { opacity: 0.85 } : { opacity: [0.55, 1, 0.55] }) : { opacity: 0.5 }
      }
      transition={{
        duration: 2.4 + (index % 4) * 0.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.35,
      }}
    />
  );
};

/**
 * scroll-trail — every milestone becomes a tiny rolled scroll: a parchment
 * body with rolled top and bottom edges and a single written line. Lit
 * scrolls glow softly; unlit scrolls rest as faint outlines.
 */
const ScrollMarker: TrailMarkerComponent = ({ lit, accentSoft, glowId, index }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.g
      initial={false}
      fill="none"
      stroke={lit ? accentSoft : UNLIT_STROKE}
      strokeWidth="0.8"
      strokeLinecap="round"
      filter={lit ? `url(#${glowId})` : undefined}
      animate={
        lit ? (reduceMotion ? { opacity: 0.85 } : { opacity: [0.65, 1, 0.65] }) : { opacity: 0.5 }
      }
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.45 }}
    >
      {/* Parchment body */}
      <path d="M -2 -2.9 L 2 -2.9 L 2 2.9 L -2 2.9 Z" />
      {/* Rolled edges — capsules clearly wider than the body */}
      <line x1="-3" y1="-3.2" x2="3" y2="-3.2" strokeWidth="1.3" />
      <line x1="-3" y1="3.2" x2="3" y2="3.2" strokeWidth="1.3" />
      {/* Written line */}
      <line x1="-1" y1="0" x2="1" y2="0" strokeWidth="0.8" />
    </motion.g>
  );
};

export const DEFAULT_TRAIL_ID = "qi-glow";

const TRAILS: Record<string, TrailMarkerComponent> = {
  [DEFAULT_TRAIL_ID]: QiGlowMarker,
  "starlight-trail": StarlightMarker,
  "scroll-trail": ScrollMarker,
};

/** Resolve a trail preset id to its marker component, falling back to qi-glow. */
export function resolveTrail(id?: string): TrailMarkerComponent {
  return (id && Object.hasOwn(TRAILS, id) && TRAILS[id]) || TRAILS[DEFAULT_TRAIL_ID];
}

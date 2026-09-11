"use client";

import React from "react";
import { motion } from "motion/react";
import { useScrubberReducedMotion as useReducedMotion } from "./useScrubberReducedMotion";

/**
 * Destination registry — the third cosmetic slot of the Journey Scrubber:
 * the endpoint the traveler walks toward.
 *
 * Three reusable families, picked by stable id via the scrubber's
 * `destinationId` prop:
 *
 *   - `door` — Door / Gate family: portals, thresholds, rifts. For portal
 *              users, travelers, and special beings. Also the safe fallback.
 *   - `sect` — Sect / Temple family: temple arches, sect entrances, heavenly
 *              pavilions. For cultivators, scholars, warriors, humanoids.
 *   - `cave` — Cave family: fairy caves, beast dens, crystal caverns. For
 *              beasts, spirit animals, monsters, creature travelers.
 *
 * Destinations are families, not per-character locks: selection stays
 * independent from traveler selection so any traveler can arrive at any
 * family, and future relic packages can re-theme a family without touching
 * scrubber logic. Each traveler simply nominates a sensible default
 * (`DEFAULT_DESTINATION_BY_TRAVELER` below).
 *
 * Local space contract (identical to the original inline gate): the
 * scrubber places the destination at the path end; ground level is (0,0),
 * the marker rises upward (negative y), ~30px tall, centered on x=0.
 * Geometry and spacing never change between families.
 *
 * Every family renders the shared DestinationGround beneath its marker
 * (2026-07-30): a violet bed echoing the path's glow bed plus a lit
 * terminus mote at the exact path end point, so the destination reads as
 * the trail's final milestone instead of a separate pasted-on icon.
 *
 * Every destination must: stay readable at tiny scale, use accent /
 * accentSoft / destinationAccent only, render calm normal and arrived
 * states, react on arrival, and go static under reduced motion.
 */

export interface DestinationRenderProps {
  /** Whether the traveler has arrived — glow and react. */
  arrived: boolean;
  /** Primary accent (journey color). */
  accent: string;
  /** Softer accent for glows and arrival highlights. */
  accentSoft: string;
  /** Destination accent — crimson by default. */
  destinationAccent: string;
  /** Scrubber-defined glow filter id. */
  glowId: string;
  /** Scrubber-defined soft-blur filter id. */
  softId: string;
}

export type DestinationComponent = React.FC<DestinationRenderProps>;

/** Shared arrival ring — breathes outward from a point once complete. */
const ArrivalRing: React.FC<{
  cy: number;
  destinationAccent: string;
  arrived: boolean;
}> = ({ cy, destinationAccent, arrived }) => {
  const reduceMotion = useReducedMotion();
  if (!arrived || reduceMotion) return null;
  return (
    <motion.circle
      initial={false}
      cx="0"
      cy={cy}
      r="9"
      fill="none"
      stroke={destinationAccent}
      strokeWidth="1"
      animate={{ scale: [0.4, 1.7], opacity: [0.8, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    />
  );
};

/**
 * Shared destination ground — anchors every family to the scrubber it ends.
 * A soft bed in the journey accent (same language as the path's glow bed
 * beneath the trail) seats the marker on the ground plane, and a lit
 * terminus mote at the exact path end point (0,0) reads as the trail's
 * final milestone, so the destination belongs to the scrubber family
 * instead of floating beside it.
 */
const DestinationGround: React.FC<{
  accent: string;
  accentSoft: string;
  arrived: boolean;
  glowId: string;
  softId: string;
}> = ({ accent, accentSoft, arrived, glowId, softId }) => (
  <>
    <ellipse
      cx="0"
      cy="1.5"
      rx="16"
      ry="3.4"
      fill={accent}
      opacity={arrived ? 0.32 : 0.16}
      filter={`url(#${softId})`}
    />
    <circle
      cx="0"
      cy="0"
      r={arrived ? 2.2 : 1.8}
      fill={accentSoft}
      opacity={arrived ? 1 : 0.6}
      filter={`url(#${glowId})`}
    />
  </>
);

/**
 * door — the Door / Gate family: twin pillars, an arch, and a sealed orb.
 * A direct threshold for portal users and travelers. This preserves the
 * original scrubber gate rendering exactly.
 */
const DoorDestination: DestinationComponent = ({
  arrived,
  accent,
  accentSoft,
  destinationAccent,
  glowId,
  softId,
}) => {
  const reduceMotion = useReducedMotion();
  return (
    <>
      <DestinationGround
        accent={accent}
        accentSoft={accentSoft}
        arrived={arrived}
        glowId={glowId}
        softId={softId}
      />
      <g
        stroke={destinationAccent}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity={arrived ? 1 : 0.7}
        filter={arrived ? `url(#${glowId})` : undefined}
      >
        <line x1="-8" y1="0" x2="-8" y2="-22" />
        <line x1="8" y1="0" x2="8" y2="-22" />
        <path d="M -8 -22 Q 0 -31 8 -22" />
      </g>
      <motion.circle
        initial={false}
        cx="0"
        cy="-13"
        r="3"
        fill={arrived ? accentSoft : destinationAccent}
        animate={
          reduceMotion
            ? { opacity: arrived ? 1 : 0.55 }
            : arrived
              ? { opacity: [0.7, 1, 0.7], scale: [1, 1.25, 1] }
              : { opacity: [0.4, 0.7, 0.4] }
        }
        transition={{ duration: arrived ? 1.4 : 3.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <ArrivalRing cy={-13} destinationAccent={destinationAccent} arrived={arrived} />
    </>
  );
};

/**
 * sect — the Sect / Temple family: a temple arch with an upturned roof and
 * a hanging lantern. For cultivators, scholars, warriors, sect members.
 */
const SectDestination: DestinationComponent = ({
  arrived,
  accent,
  accentSoft,
  destinationAccent,
  glowId,
  softId,
}) => {
  const reduceMotion = useReducedMotion();
  return (
    <>
      <DestinationGround
        accent={accent}
        accentSoft={accentSoft}
        arrived={arrived}
        glowId={glowId}
        softId={softId}
      />
      <g
        stroke={destinationAccent}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity={arrived ? 1 : 0.7}
        filter={arrived ? `url(#${glowId})` : undefined}
      >
        {/* Pillars on small steps */}
        <line x1="-9" y1="-2" x2="-9" y2="-18" />
        <line x1="9" y1="-2" x2="9" y2="-18" />
        <line x1="-11" y1="-2" x2="-7" y2="-2" />
        <line x1="7" y1="-2" x2="11" y2="-2" />
        {/* Upturned temple roof — curved eaves with lifted tips */}
        <path d="M -14 -19 Q -7 -22 0 -25 Q 7 -22 14 -19" />
        <path d="M -14 -19 L -16 -21.5" />
        <path d="M 14 -19 L 16 -21.5" />
        <path d="M -5 -24.2 Q 0 -26.5 5 -24.2" />
      </g>
      {/* Hanging lantern beneath the roof — glows warm on arrival */}
      <motion.circle
        initial={false}
        cx="0"
        cy="-14"
        r="2.6"
        fill={arrived ? accentSoft : destinationAccent}
        animate={
          reduceMotion
            ? { opacity: arrived ? 1 : 0.55 }
            : arrived
              ? { opacity: [0.7, 1, 0.7], scale: [1, 1.25, 1] }
              : { opacity: [0.4, 0.7, 0.4] }
        }
        transition={{ duration: arrived ? 1.4 : 3.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <line
        x1="0"
        y1="-19"
        x2="0"
        y2="-16.6"
        stroke={destinationAccent}
        strokeWidth="0.9"
        opacity={arrived ? 0.9 : 0.6}
      />
      <ArrivalRing cy={-14} destinationAccent={destinationAccent} arrived={arrived} />
    </>
  );
};

/**
 * cave — the Cave family: a jagged cave mouth with glowing crystals at its
 * base. For beasts, spirit animals, monsters, creature travelers.
 */
const CaveDestination: DestinationComponent = ({
  arrived,
  accent,
  accentSoft,
  destinationAccent,
  glowId,
  softId,
}) => {
  const reduceMotion = useReducedMotion();
  return (
    <>
      <DestinationGround
        accent={accent}
        accentSoft={accentSoft}
        arrived={arrived}
        glowId={glowId}
        softId={softId}
      />
      {/* Rocky mouth — an irregular arch with a dark inner opening */}
      <g
        stroke={destinationAccent}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity={arrived ? 1 : 0.7}
        filter={arrived ? `url(#${glowId})` : undefined}
      >
        <path d="M -11 0 L -12 -8 L -9 -16 L -5 -22 L 0 -25 L 5 -21 L 9 -15 L 12 -7 L 11 0" />
        <path d="M -6 0 L -6.5 -6 L -4 -12 L 0 -15 L 4 -11 L 6.5 -5 L 6 0" opacity="0.6" />
      </g>
      {/* Inner glow — the den's heart, brightens on arrival */}
      <motion.circle
        initial={false}
        cx="0"
        cy="-6"
        r="2.8"
        fill={arrived ? accentSoft : destinationAccent}
        animate={
          reduceMotion
            ? { opacity: arrived ? 1 : 0.55 }
            : arrived
              ? { opacity: [0.7, 1, 0.7], scale: [1, 1.25, 1] }
              : { opacity: [0.4, 0.7, 0.4] }
        }
        transition={{ duration: arrived ? 1.4 : 3.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      {/* Base crystals */}
      <g
        fill={accentSoft}
        opacity={arrived ? 0.95 : 0.55}
        filter={arrived ? `url(#${glowId})` : undefined}
      >
        <path d="M -14 0 L -12.8 -5 L -11.6 0 Z" />
        <path d="M 12 0 L 13.4 -6.5 L 14.8 0 Z" />
      </g>
      <ArrivalRing cy={-8} destinationAccent={destinationAccent} arrived={arrived} />
    </>
  );
};

export const DEFAULT_DESTINATION_ID = "door";

const DESTINATIONS: Record<string, DestinationComponent> = {
  [DEFAULT_DESTINATION_ID]: DoorDestination,
  sect: SectDestination,
  cave: CaveDestination,
};

/**
 * Each traveler's recommended destination family — a suggestion, not a
 * lock. Selection stays independent: callers may pass any `destinationId`
 * with any `travelerId`, and future relic packages can re-theme a family
 * without touching this map.
 */
export const DEFAULT_DESTINATION_BY_TRAVELER: Record<string, string> = {
  cultivator: "sect",
  "sword-rider": "door",
  "spirit-beast": "cave",
};

/** A traveler's recommended destination family, falling back to `door`. */
export function defaultDestinationFor(travelerId?: string): string {
  return (
    (travelerId &&
      Object.hasOwn(DEFAULT_DESTINATION_BY_TRAVELER, travelerId) &&
      DEFAULT_DESTINATION_BY_TRAVELER[travelerId]) ||
    DEFAULT_DESTINATION_ID
  );
}

/** Resolve a destination family id to its component, falling back to `door`. */
export function resolveDestination(id?: string): DestinationComponent {
  return (
    (id && Object.hasOwn(DESTINATIONS, id) && DESTINATIONS[id]) ||
    DESTINATIONS[DEFAULT_DESTINATION_ID]
  );
}

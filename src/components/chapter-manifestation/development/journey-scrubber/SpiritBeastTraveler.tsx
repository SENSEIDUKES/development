"use client";

import React from "react";
import { motion } from "motion/react";
import { useScrubberReducedMotion as useReducedMotion } from "./useScrubberReducedMotion";
import type { TravelerRenderProps } from "./travelers";

/**
 * Spirit Beast Traveler — a small celestial fox trotting the qi path beside
 * its cultivator. The bushy tail and pointed ears keep it readable at ~30px.
 * Represents the mystical companion that walks the journey with you.
 *
 * Same local space contract as every traveler: paws anchored at (0, 0),
 * silhouette ~30px tall (tail tip to paws), facing right. The trot loop is
 * decoupled from path position, same as the cultivator's run cycle.
 *
 * States:
 * - trotting (`moving`, not `arrived`) — light bounding bob, alternating
 *   paws, gently waving tail
 * - idle (`!moving`, not `arrived`) — sitting still, breathing glow
 * - arrival (`arrived`) — a small happy hop with a tail wag
 */
export default function SpiritBeastTraveler({
  accent,
  accentSoft,
  moving,
  arrived,
  filterId,
}: TravelerRenderProps) {
  const reduceMotion = useReducedMotion();
  const trotting = moving && !arrived && !reduceMotion;
  const celebrating = arrived && !reduceMotion;

  return (
    <motion.g
      initial={false}
      animate={celebrating ? { y: [0, -6, 0] } : trotting ? { y: [0, -2.6, 0] } : { y: 0 }}
      transition={
        celebrating
          ? { duration: 0.6, times: [0, 0.4, 1], ease: "easeOut" }
          : trotting
            ? { duration: 0.72, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
      }
    >
      {/* Ground glow */}
      <motion.ellipse
        initial={false}
        cx="0"
        cy="1.5"
        rx="11"
        ry="2.2"
        fill={accent}
        filter={`url(#${filterId})`}
        animate={reduceMotion ? { opacity: 0.22 } : { opacity: [0.15, 0.27, 0.15] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bushy tail — waves while trotting, wags on arrival */}
      <motion.path
        initial={false}
        d="M -7 -8 C -13 -10 -16 -16 -14 -22 C -11 -19 -8 -16 -6.5 -13 Z"
        fill={accentSoft}
        opacity="0.9"
        animate={
          celebrating
            ? { rotate: [-10, 10, -10] }
            : trotting
              ? { rotate: [-6, 6, -6] }
              : { rotate: 0 }
        }
        transition={
          celebrating
            ? { duration: 0.6, repeat: 2, ease: "easeInOut" }
            : { duration: 0.72, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ transformBox: "fill-box", transformOrigin: "right bottom" }}
      />

      {/* Hind + front paws — a soft alternating trot */}
      <motion.line
        initial={false}
        x1="-4"
        y1="-7"
        x2="-5"
        y2="-0.5"
        stroke={accent}
        strokeWidth="2.2"
        strokeLinecap="round"
        animate={trotting ? { rotate: [14, -14, 14] } : { rotate: 0 }}
        transition={{ duration: 0.72, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}
      />
      <motion.line
        initial={false}
        x1="4"
        y1="-7"
        x2="5"
        y2="-0.5"
        stroke={accentSoft}
        strokeWidth="2.2"
        strokeLinecap="round"
        animate={trotting ? { rotate: [-14, 14, -14] } : { rotate: 0 }}
        transition={{ duration: 0.72, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}
      />

      {/* Body + head — one silhouette mass with the glow */}
      <g filter={`url(#${filterId})`}>
        <ellipse cx="0" cy="-9.5" rx="7.5" ry="4.6" fill={accent} />
        {/* Head with pointed ears */}
        <path
          d="M 4 -12 C 4 -16 6 -18 8.5 -18 L 9.5 -21.5 L 11 -18 C 13 -17.5 14 -15.5 14 -13.5 C 14 -11 12 -9.5 9.5 -9.5 C 6.5 -9.5 4 -10.5 4 -12 Z"
          fill={accent}
        />
        {/* Snout highlight + eye glint */}
        <circle cx="13.2" cy="-12.6" r="1.2" fill={accentSoft} opacity="0.9" />
        <circle cx="9.6" cy="-14.6" r="0.9" fill={accentSoft} />
      </g>
    </motion.g>
  );
}

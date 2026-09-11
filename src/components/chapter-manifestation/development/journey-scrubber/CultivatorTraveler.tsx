"use client";

import React from "react";
import { motion } from "motion/react";
import { useScrubberReducedMotion as useReducedMotion } from "./useScrubberReducedMotion";
import type { TravelerRenderProps } from "./travelers";

/**
 * Cultivator Traveler — the default Journey Scrubber traveler: a tiny hooded
 * cultivator running the qi path toward the destination gate.
 *
 * Local space contract every traveler follows: feet anchored at (0, 0),
 * figure ~34px tall, facing right. The scrubber owns path position; the
 * traveler owns only its looping body animation, so the run cycle stays
 * decoupled from progress — it loops calmly whether the figure moves or
 * stands still.
 *
 * States:
 * - running (`moving`, not `arrived`) — easy leg/arm cycle + cloak bob
 * - idle (`!moving`, not `arrived`) — still, breathing ground glow
 * - arrival (`arrived`) — a single small hop of celebration at the gate
 */
export default function CultivatorTraveler({
  accent,
  accentSoft,
  moving,
  arrived,
  filterId,
}: TravelerRenderProps) {
  const reduceMotion = useReducedMotion();
  const running = moving && !arrived && !reduceMotion;
  const celebrating = arrived && !reduceMotion;

  return (
    <motion.g
      initial={false}
      animate={celebrating ? { y: [0, -7, 0] } : { y: 0 }}
      transition={
        celebrating ? { duration: 0.7, times: [0, 0.4, 1], ease: "easeOut" } : { duration: 0.2 }
      }
    >
      {/* Ground glow — keeps the small figure readable on the dark veil */}
      <motion.ellipse
        initial={false}
        cx="0"
        cy="1.5"
        rx="10"
        ry="2.4"
        fill={accent}
        filter={`url(#${filterId})`}
        animate={reduceMotion ? { opacity: 0.22 } : { opacity: [0.16, 0.28, 0.16] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Trailing scarf — flutters only while running */}
      <motion.path
        initial={false}
        d="M -4 -24 C -10 -26 -14 -22 -19 -24"
        stroke={accentSoft}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
        animate={running ? { rotate: [-6, 6, -6] } : { rotate: 0 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "right center" }}
      />

      {/* Legs — a slow, controlled stride (no frantic sprinting) */}
      <motion.line
        initial={false}
        x1="-1"
        y1="-12"
        x2="3"
        y2="-1"
        stroke={accent}
        strokeWidth="2.6"
        strokeLinecap="round"
        animate={running ? { rotate: [16, -16, 16] } : { rotate: 0 }}
        transition={{ duration: 0.56, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}
      />
      <motion.line
        initial={false}
        x1="1"
        y1="-12"
        x2="4"
        y2="-1"
        stroke={accentSoft}
        strokeWidth="2.6"
        strokeLinecap="round"
        animate={running ? { rotate: [-16, 16, -16] } : { rotate: 0 }}
        transition={{ duration: 0.56, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}
      />

      {/* Cloak + hood — one silhouette mass with a soft glow */}
      <motion.g
        initial={false}
        filter={`url(#${filterId})`}
        animate={running ? { y: [0, -1.6, 0] } : { y: 0 }}
        transition={{ duration: 0.56, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M -1 -30 C -7 -29 -10 -22 -9 -14 C -8.4 -9 -6 -6 -4 -5 L 5 -6 C 8 -12 7 -22 3 -27 C 2 -29 0.5 -30 -1 -30 Z"
          fill={accent}
        />
        <circle cx="-1" cy="-32.5" r="4.4" fill={accent} />
        <circle cx="0.4" cy="-32.5" r="1.5" fill={accentSoft} />
        {/* Forward arm, counter-swinging */}
        <motion.line
          initial={false}
          x1="2"
          y1="-20"
          x2="8"
          y2="-15"
          stroke={accentSoft}
          strokeWidth="2"
          strokeLinecap="round"
          animate={running ? { rotate: [-14, 14, -14] } : { rotate: 0 }}
          transition={{ duration: 0.56, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "0% 50%" }}
        />
      </motion.g>
    </motion.g>
  );
}

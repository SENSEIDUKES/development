"use client";

import React from "react";
import { motion } from "motion/react";
import { useScrubberReducedMotion as useReducedMotion } from "./useScrubberReducedMotion";
import type { TravelerRenderProps } from "./travelers";

/**
 * Sword Rider Traveler — a tiny cultivator standing on a flying sword,
 * gliding the qi path with a short scarf of qi fluttering behind.
 * Represents raw cultivation power: it does not run, it rides.
 *
 * Same local space contract as every traveler: sword level anchored at
 * (0, 0), figure ~34px tall, facing right. There is deliberately no leg
 * cycle — the glide is a gentle bob and sway only, decoupled from path
 * position exactly like the cultivator's run loop.
 *
 * States:
 * - gliding (`moving`, not `arrived`) — slow vertical bob + slight sway,
 *   scarf fluttering
 * - idle (`!moving`, not `arrived`) — hover stillness, breathing glow
 * - arrival (`arrived`) — a small rise-and-settle flourish with a scarf flick
 */
export default function SwordRiderTraveler({
  accent,
  accentSoft,
  moving,
  arrived,
  filterId,
}: TravelerRenderProps) {
  const reduceMotion = useReducedMotion();
  const gliding = moving && !arrived && !reduceMotion;
  const flourishing = arrived && !reduceMotion;

  return (
    <motion.g
      initial={false}
      animate={
        flourishing
          ? { y: [0, -6, 0], rotate: [0, -4, 0] }
          : gliding
            ? { y: [0, -2.4, 0] }
            : { y: 0 }
      }
      transition={
        flourishing
          ? { duration: 0.9, times: [0, 0.45, 1], ease: "easeOut" }
          : gliding
            ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
      }
    >
      {/* Ground glow — hover shimmer beneath the blade */}
      <motion.ellipse
        initial={false}
        cx="0"
        cy="1.5"
        rx="11"
        ry="2.2"
        fill={accent}
        filter={`url(#${filterId})`}
        animate={reduceMotion ? { opacity: 0.22 } : { opacity: [0.14, 0.26, 0.14] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Flying sword — slim blade with a soft trail edge */}
      <g filter={`url(#${filterId})`}>
        <path d="M -13 -2.5 L 10 -4.2 L 14.5 -3 L 10 -1.8 L -13 -1 Z" fill={accent} />
        <line
          x1="-16"
          y1="-1.8"
          x2="-12"
          y2="-1.9"
          stroke={accentSoft}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>

      {/* Qi scarf — flutters behind while gliding, flicks on arrival */}
      <motion.path
        initial={false}
        d="M -3 -22 C -9 -24 -13 -20 -18 -23"
        stroke={accentSoft}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
        animate={
          flourishing ? { rotate: [0, -14, 0] } : gliding ? { rotate: [-7, 7, -7] } : { rotate: 0 }
        }
        transition={
          flourishing
            ? { duration: 0.9, times: [0, 0.45, 1], ease: "easeOut" }
            : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ transformBox: "fill-box", transformOrigin: "right center" }}
      />

      {/* Standing figure — one robe silhouette, upright and calm */}
      <g filter={`url(#${filterId})`}>
        <path
          d="M -1 -28 C -6 -27 -8 -20 -7 -12 L -6.5 -5 L 4.5 -5 L 5 -12 C 5.6 -20 4 -26 -1 -28 Z"
          fill={accent}
        />
        <circle cx="-0.5" cy="-30.5" r="4.2" fill={accent} />
        <circle cx="0.9" cy="-30.5" r="1.4" fill={accentSoft} />
        {/* Resting arm extended slightly forward for balance */}
        <line
          x1="3"
          y1="-19"
          x2="8.5"
          y2="-16"
          stroke={accentSoft}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>
    </motion.g>
  );
}

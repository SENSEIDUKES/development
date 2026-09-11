/* eslint-disable react-hooks/static-components -- Resolvers select stable module-level artwork components; they never create components. */
"use client";

import React from "react";
import { motion } from "motion/react";
import { useScrubberReducedMotion as useReducedMotion } from "./useScrubberReducedMotion";
import { resolveTraveler } from "./travelers";
import { resolveTrail } from "./trails";
import { defaultDestinationFor, resolveDestination } from "./destinations";

export interface LibraryScrubberStatus {
  /** Stable identity of the operation, e.g. 'Chapter 1'. */
  title: string;
  /** Current state of the work, e.g. 'Manifesting 9/20' or 'Weaving'. Omitted when empty. */
  state?: string;
  /** Live detail, e.g. '~15s' or '12 passages woven'. Rendered as a smaller second line. */
  detail?: string;
}

export interface LibraryScrubberProps {
  /**
   * Normalized journey progress, 0–1. Any caller maps its own units
   * (passages, bytes, steps) onto this range, so the scrubber works for any
   * passage count or flow. Null renders an indeterminate drift.
   */
  progress: number | null;
  /** Layered status text rendered above the path. Omit for a path-only scrubber. */
  status?: LibraryScrubberStatus;
  /** Traveler skin id — see travelers.ts registry. Defaults to the cultivator. */
  travelerId?: string;
  /**
   * Aura trail preset id — see trails.tsx registry (`qi-glow`,
   * `starlight-trail`, `scroll-trail`). Defaults to `qi-glow`. Presets
   * change only the milestone markers along the path; geometry and every
   * other layer stay shared.
   */
  trailStyle?: string;
  /**
   * Destination family id — see destinations.tsx registry (`door`, `sect`,
   * `cave`). When omitted, the selected traveler's recommended family is
   * used. Selection is independent from the traveler: any traveler may
   * arrive at any family. Unknown ids fall back to `door`.
   */
  destinationId?: string;
  /** Primary accent (trail, traveler). Violet for Versa, azure for Scout. */
  accent?: string;
  /** Softer accent for glows and highlights. */
  accentSoft?: string;
  /** Destination accent — crimson by default, echoing the manifestation palette. */
  destinationAccent?: string;
  className?: string;
  /** Accessible name when status is omitted. */
  "aria-label"?: string;
}

/**
 * Journey Scrubber — the manifestation progress presentation as a small
 * celestial journey: a curved qi path, an illuminated traveled portion,
 * milestone markers that light as the journey advances, a traveler walking
 * the arc, and a destination gate that glows on arrival.
 *
 * Progress is a normalized 0–1 prop; the run loop is decoupled from path
 * position (the cycle loops continuously, position is eased from progress).
 * Every layer is separable: path/milestones/marker/status live here, the
 * traveler comes from the registry in travelers.ts, the milestone marker
 * rendering comes from the preset registry in trails.tsx, the destination
 * marker comes from the family registry in destinations.tsx, and the status
 * layers are plain props — future skins, presets, or text layouts touch
 * only their own layer.
 */

// Curved qi path — one subtle quadratic arc, start left, gate right.
const P0 = { x: 18, y: 88 };
const P1 = { x: 200, y: 16 };
const P2 = { x: 382, y: 80 };
const PATH_D = `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`;

/** Point on the quadratic bezier at t ∈ [0,1] — exact, cheap, no DOM reads. */
function pointAt(t: number) {
  const u = 1 - t;
  return {
    x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
    y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y,
  };
}

/** Faint milestone motes along the path; each lights as the traveler passes. */
const MILESTONES = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

/** The traveler stops just before the gate so the figure stands beside it. */
const TRAVELER_MAX_T = 0.95;

export function LibraryScrubber({
  progress,
  status,
  travelerId,
  trailStyle,
  destinationId,
  accent = "#a855f7",
  accentSoft = "#d8b4fe",
  destinationAccent = "#ef4444",
  className,
  "aria-label": ariaLabel,
}: LibraryScrubberProps) {
  const reduceMotion = useReducedMotion();
  const clamped =
    progress === null || !Number.isFinite(progress) ? null : Math.min(1, Math.max(0, progress));
  const arrived = clamped !== null && clamped >= 1;

  const Traveler = resolveTraveler(travelerId);
  const TrailMarker = resolveTrail(trailStyle);
  // Destination is independent from traveler selection; when the caller
  // doesn't pick one, the traveler's recommended family applies.
  const Destination = resolveDestination(destinationId ?? defaultDestinationFor(travelerId));

  // Determinate: eased to the progress point. Indeterminate: a calm drift
  // over the first stretch of the path so the veil still breathes.
  const travelerT = clamped === null ? null : Math.min(clamped, TRAVELER_MAX_T);
  const travelerPoint =
    travelerT === null ? (reduceMotion ? pointAt(0.05) : null) : pointAt(travelerT);
  const drift = React.useMemo(() => [pointAt(0.05), pointAt(0.32), pointAt(0.05)], []);

  const uid = React.useId().replace(/:/g, "");
  const glowId = `js-glow-${uid}`;
  const softId = `js-soft-${uid}`;
  const trailGradId = `js-trail-${uid}`;

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* Layered status — identity / current state / live detail.
          Optional: a path-only scrubber renders no text block. */}
      {status && (
        <>
          <p
            style={{
              fontFamily: "sans-serif",
              fontSize: "clamp(12px, 2vw, 14px)",
              letterSpacing: ".025em",
              textAlign: "center",
              margin: 0,
            }}
          >
            <span style={{ color: "#f5f5f5", fontWeight: 500 }}>{status.title}</span>
            {status.state ? <span style={{ color: "#d4d4d4" }}> · {status.state}</span> : null}
          </p>
          {status.detail ? (
            <p
              style={{
                fontFamily: "sans-serif",
                fontSize: 11,
                color: "#737373",
                letterSpacing: ".025em",
                textAlign: "center",
                margin: 0,
              }}
            >
              {status.detail}
            </p>
          ) : null}
        </>
      )}

      <svg
        viewBox="0 0 400 116"
        style={{
          marginTop: 4,
          width: "100%",
          maxWidth: 300,
          display: "block",
          overflow: "visible",
        }}
        role="progressbar"
        aria-label={
          ariaLabel ??
          (status
            ? `${status.title}${status.state ? `, ${status.state}` : ""}`
            : "Manifestation journey progress")
        }
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped === null ? undefined : Math.round(clamped * 100)}
      >
        <defs>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={softId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <linearGradient
            id={trailGradId}
            gradientUnits="userSpaceOnUse"
            x1={P0.x}
            y1={P0.y}
            x2={P2.x}
            y2={P2.y}
          >
            <stop offset="0%" stopColor={accentSoft} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
        </defs>

        {/* Resting path — faint, with a soft violet bed beneath */}
        <path
          d={PATH_D}
          fill="none"
          stroke={accent}
          strokeWidth="3.5"
          opacity="0.1"
          filter={`url(#${softId})`}
        />
        <path d={PATH_D} fill="none" stroke="#8b8b9e" strokeWidth="1" opacity="0.28" />

        {/* Lit path — the completed portion behind the traveler. Shared
            across presets (the qi-glow rendering); presets only restyle
            the milestone markers. */}
        {clamped !== null && (
          <>
            <path
              d={PATH_D}
              fill="none"
              pathLength={1}
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${clamped} 1`}
              opacity="0.3"
              filter={`url(#${softId})`}
            />
            <path
              d={PATH_D}
              fill="none"
              pathLength={1}
              stroke={`url(#${trailGradId})`}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={`${clamped} 1`}
              filter={`url(#${glowId})`}
            />
          </>
        )}

        {/* Indeterminate drift — a calm pulse over the first stretch of the
            path so the veil still breathes when progress is unknown */}
        {clamped === null && (
          <motion.path
            initial={false}
            d={PATH_D}
            fill="none"
            pathLength={1}
            stroke={accent}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="0.28 1"
            opacity="0.5"
            animate={reduceMotion ? { opacity: 0.5 } : { opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Milestone markers — rendered by the selected preset (trails.tsx),
            each lights as the traveler passes. Marker shape is the preset's
            whole job; position and lit state stay shared. */}
        {MILESTONES.map((t, i) => {
          const p = pointAt(t);
          const lit = clamped !== null && clamped >= t;
          return (
            <g key={t} transform={`translate(${p.x} ${p.y})`}>
              <TrailMarker
                lit={lit}
                accent={accent}
                accentSoft={accentSoft}
                glowId={glowId}
                index={i}
              />
            </g>
          );
        })}

        {/* Destination — the family marker at the path end (destinations.tsx).
            Local space: ground at (0,0), rising upward; geometry identical
            across families. Reacts on arrival; static under reduced motion. */}
        <g transform={`translate(${P2.x} ${P2.y})`}>
          <Destination
            arrived={arrived}
            accent={accent}
            accentSoft={accentSoft}
            destinationAccent={destinationAccent}
            glowId={glowId}
            softId={softId}
          />
        </g>

        {/* Traveler — position driven by progress; body loop runs independently */}
        <motion.g
          initial={false}
          animate={
            travelerPoint
              ? { x: travelerPoint.x, y: travelerPoint.y }
              : { x: drift.map((p) => p.x), y: drift.map((p) => p.y) }
          }
          transition={
            travelerPoint
              ? { duration: reduceMotion ? 0 : 0.8, ease: "easeOut" }
              : { duration: 4.4, times: [0, 0.5, 1], repeat: Infinity, ease: "easeInOut" }
          }
        >
          <Traveler
            accent={accent}
            accentSoft={accentSoft}
            moving={!arrived}
            arrived={arrived}
            filterId={glowId}
          />
        </motion.g>
      </svg>
    </div>
  );
}

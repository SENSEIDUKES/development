import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { LoadingTaskCard } from '../shared/taskCard';
import NarrativeManifestationZone from './NarrativeManifestationZone';
import MediaManifestationZone from './MediaManifestationZone';
import { LibraryScrubber } from './journey-scrubber/LibraryScrubber';

/**
 * Celestial field — a quiet scatter of fixed star points behind the agent
 * emblem so the top section still reads as cosmic. The spinning crimson
 * sigil rings were removed (2026-07-30): three dark-red circles rotating
 * around Versa competed with the violet aura and reached down over the
 * journey scrubber beneath her.
 */
const CelestialSigil: React.FC = () => {
  const stars = React.useMemo<Array<[number, number, number, number]>>(() => [
    // [cx, cy, r, opacity]
    [38, 52, 1.1, 0.5], [196, 64, 0.9, 0.4], [52, 178, 1.2, 0.45], [188, 186, 0.8, 0.35],
    [86, 30, 0.7, 0.4], [152, 34, 1.0, 0.45], [28, 118, 0.8, 0.35], [210, 122, 1.1, 0.4],
    [104, 208, 0.9, 0.4], [140, 204, 0.7, 0.3], [64, 96, 0.6, 0.3], [176, 100, 0.6, 0.3],
  ], []);

  return (
    <svg viewBox="0 0 240 240" className="absolute w-[240px] h-[240px] pointer-events-none" aria-hidden="true">
      {/* Fixed star field */}
      {stars.map(([cx, cy, r, opacity], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#E8E4F0" opacity={opacity} />
      ))}
    </svg>
  );
};

export interface LoadingVeilCardProps {
  task: LoadingTaskCard;
  /**
   * Optional cinematic backdrop (e.g. the celestial particle field) rendered
   * behind the veil content. When present, the veil's dark wash lightens so
   * the backdrop stays visible.
   */
  backdrop?: React.ReactNode;
  /**
   * Optional spacing override for the agent emblem container (margins only).
   */
  emblemClassName?: string;
  /**
   * Workshop-only scrubber cosmetics pass-through (traveler / trail /
   * destination ids). Production callers omit these and get the defaults;
   * the Workshop simulator uses them to preview cosmetic combinations.
   */
  travelerId?: string;
  trailStyle?: string;
  destinationId?: string;
  /**
   * Workshop-only media unseal pass-through (same pattern as the scrubber
   * cosmetics above): called when the user taps the sealed scroll in the
   * media manifestation zone. Production callers omit it and the sealed
   * scroll renders non-interactive.
   */
  onMediaUnseal?: () => void;
}

/**
 * DEV copy of LoadingVeil — the Aura Veil shell: one shared manifestation
 * shell hosting two manifestation modes. The shell is identical across both:
 * 1. Versa hero — emblem + refined violet aura at the top, sized to fill
 *    her zone naturally with less dead space around her
 * 2. Journey scrubber — a path-only curved qi path: a cultivator traveler
 *    runs toward a destination gate as normalized progress advances, with
 *    an illuminated trail behind it (replaces the old thin progress bar).
 *    No status text above the arc — chapter identity and progress live with
 *    the quote at the bottom.
 * 3. Active manifestation zone — the ONLY zone that changes by mode
 *    (task.manifestation, resolved from the operation via the taxonomy in
 *    shared/manifestation.ts): NarrativeManifestationZone renders the
 *    chamber with a system-selected omen scene; MediaManifestationZone
 *    renders the same chamber with the agnostic celestial scroll reveal.
 *    Both inherit the chamber's isolated three-layer stacking contract.
 * 4. Chapter line + Versa's evolving line — a persistent "Chapter N | X%"
 *    line above the rotating quote at the bottom of the chamber; the quote
 *    is the only text that changes, and the language set changes per mode.
 *
 * Explicitly excluded: Reader Chamber, Codex, and Narration manifestations
 * never route through these modes — they own dedicated manifestation logic.
 *
 * There is deliberately no manual minimize control: while a chapter is
 * generating the veil stays immersive, and background minimization happens
 * through navigation (the caller flips `minimized`), not a button here.
 *
 * Stacking at the veil level is equally explicit: the root is `isolate`,
 * the cinematic backdrop is pinned to z-0, and all content zones sit at
 * z-10, so shared particles can never drift above the chamber's scene.
 *
 * Aura work (kept from the previous pass): saturated violet nebula with a
 * bright core, twin counter-rotating cloak wisps, grounded pool, six motes.
 * Workshop-only: do not wire this into production flows.
 */
export default function LoadingVeilCard({ task, backdrop, emblemClassName, travelerId, trailStyle, destinationId, onMediaUnseal }: LoadingVeilCardProps) {
  const isVersa = task.agentId === 'versa';

  // Normalize the task card's 0–100 progress onto the scrubber's 0–1 range;
  // null (indeterminate) passes through unchanged.
  const normalizedProgress =
    task.progress === null ? null : Math.min(1, Math.max(0, task.progress / 100));

  return (
    <motion.div
      key="fullscreen-veil"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ duration: 0.25 }}
      className={`fixed inset-0 h-[100dvh] ${backdrop ? 'bg-void/70' : 'bg-void/95'} backdrop-blur-md z-[9999] isolate flex flex-col overflow-hidden text-center select-none`}
    >
      {/* Cinematic backdrop — pinned to z-0 so shared particles always stay
          behind every content zone, including the chamber's scene layer. */}
      {backdrop && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {backdrop}
        </div>
      )}

      {/* ── Zone 1 · Versa hero ─────────────────────────────────────────────
          Emblem + aura, sized up to fill her zone naturally. The zone grew
          into the space the scrubber status text used to occupy, so Versa
          sits lower and more centered instead of cramped at the top. */}
      <div className="relative z-10 flex-none h-[32dvh] min-h-[196px] flex items-end justify-center pointer-events-none">
        <div className={`relative w-32 h-32 sm:w-36 sm:h-36 ${emblemClassName ?? ''} flex items-center justify-center shrink-0`}>
          <CelestialSigil />

          {/* Ground pool — a grounded shadow that doesn't rise with her */}
          {isVersa && (
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 bottom-[8%] -translate-x-1/2 rounded-[50%]"
              style={{
                width: '72%',
                height: '15%',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.5) 0%, rgba(76,29,149,0.3) 55%, transparent 80%)',
                filter: 'blur(5px)',
              }}
              animate={{ opacity: [0.65, 1, 0.65], scaleX: [0.92, 1, 0.92] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {isVersa ? (
            <>
              {/* Nebula heart — saturated violet mass, breathing slowly.
                  Radius pulled in ~20% and glow softened ~15% so the aura
                  stays wrapped around Versa instead of bleeding onto the
                  scrubber beneath her. */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-[-34%] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 50% 52%, rgba(233,213,255,0.42) 0%, rgba(192,132,252,0.38) 22%, rgba(147,51,234,0.32) 45%, rgba(88,28,135,0.24) 66%, transparent 82%)',
                  filter: 'blur(26px)',
                  mixBlendMode: 'screen',
                }}
                animate={{ opacity: [0.75, 1, 0.75], scale: [0.96, 1.04, 0.96] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Bright core where her power gathers */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-[-6%] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 50% 58%, rgba(243,232,255,0.55) 0%, rgba(216,180,254,0.34) 40%, transparent 70%)',
                  filter: 'blur(12px)',
                  mixBlendMode: 'screen',
                }}
                animate={{ opacity: [0.6, 0.95, 0.6] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-[-20%] rounded-full blur-2xl bg-portal/20"
            />
          )}

          {/* Cloak energy — twin counter-rotating violet wisps */}
          {isVersa && (
            <>
              <motion.div
                aria-hidden="true"
                className="absolute inset-[-8%] rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(168,85,247,0) 0%, rgba(168,85,247,0.47) 18%, rgba(168,85,247,0) 40%, rgba(139,92,246,0.38) 65%, rgba(168,85,247,0) 88%, rgba(168,85,247,0) 100%)',
                  filter: 'blur(8px)',
                  mixBlendMode: 'screen',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-[-17%] rounded-full"
                style={{
                  background:
                    'conic-gradient(from 180deg, rgba(216,180,254,0) 0%, rgba(216,180,254,0.3) 22%, rgba(216,180,254,0) 46%, rgba(147,51,234,0.26) 70%, rgba(216,180,254,0) 92%, rgba(216,180,254,0) 100%)',
                  filter: 'blur(14px)',
                  mixBlendMode: 'screen',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
              />
            </>
          )}

          {/* Qi motes rising past her */}
          {isVersa &&
            [0, 1, 2, 3, 4, 5].map(i => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="absolute rounded-full"
                style={{
                  left: `${22 + i * 12}%`,
                  bottom: '14%',
                  width: 3,
                  height: 3,
                  background: 'rgba(233,213,255,0.95)',
                  boxShadow: '0 0 7px rgba(192,132,252,0.95), 0 0 14px rgba(168,85,247,0.6)',
                }}
                animate={{ y: [0, -(48 + i * 8)], opacity: [0, 0.95, 0], x: [0, (i % 2 === 0 ? 1 : -1) * 6] }}
                transition={{ duration: 3 + i * 0.35, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }}
              />
            ))}

          <motion.div
            className="relative z-10 w-full h-full flex items-center justify-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src={task.icon.src}
              alt={task.icon.alt}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              style={isVersa ? { filter: 'drop-shadow(0 0 18px rgba(192,132,252,0.8)) drop-shadow(0 0 46px rgba(147,51,234,0.55))' } : { filter: 'drop-shadow(0 0 15px rgba(4, 172, 255, 0.4))' }}
            />
          </motion.div>
        </div>
      </div>

      {/* ── Zone 2 · Journey scrubber ───────────────────────────────────────
          Path-only presentation — no status text above the arc. The chapter
          identity and progress now live with the quote at the bottom (Zone 4),
          so the traveler walks the curved qi path toward the gate on its own.
          Progress arrives as the task card's 0–100 value, normalized here
          to the scrubber's 0–1 contract; null keeps the indeterminate drift. */}
      <div className="relative z-10 flex-none px-6 pt-3">
        <LibraryScrubber
          progress={normalizedProgress}
          travelerId={travelerId}
          trailStyle={trailStyle}
          destinationId={destinationId}
          accent={isVersa ? '#a855f7' : '#04ACFF'}
          accentSoft={isVersa ? '#d8b4fe' : '#7dd3fc'}
        />
      </div>

      {/* ── Zone 3 · Active manifestation zone ──────────────────────────────
          The only zone that swaps by manifestation mode (task.manifestation):
          - narrative → NarrativeManifestationZone: the chamber hosting a
            system-selected omen scene from the narrative registry
          - media → MediaManifestationZone: the same chamber hosting the
            agnostic celestial scroll reveal (sealed → unsealing → revealed)
          Both zones inherit the ManifestationChamber's three-layer stacking
          contract. No zone-selection UI — the mode resolves from the
          operation, never the user. Reader Chamber / Codex / Narration
          manifestations are excluded by contract (shared/manifestation.ts)
          and never render here.
          The zone is a size query container ([container-type:size]) so the
          chamber sizes to this real box via cqmin — it always fits instead of
          overflowing and being hard-clipped by overflow-hidden (kept as the
          safety net). */}
      {isVersa && (
        <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden [container-type:size]">
          {task.manifestation.mode === 'media' ? (
            <MediaManifestationZone isVersa={isVersa} spec={task.manifestation} onUnseal={onMediaUnseal} />
          ) : (
            <NarrativeManifestationZone
              isVersa={isVersa}
              sceneId={task.manifestation.sceneId}
              seed={task.trackerTitle}
            />
          )}
        </div>
      )}

      {/* ── Zone 4 · Chapter pill + Versa's evolving line ───────────────────
          Consolidated status hierarchy at the bottom of the chamber: a
          persistent chapter pill ("Chapter 1 ｜ 42%") in a softly glowing
          accent-tinted capsule above the rotating quote — the only text
          that changes. Indeterminate operations (no progress) render the
          quote alone. */}
      <div className="relative z-10 flex-none px-6 pt-3 pb-7 flex flex-col items-center justify-center min-h-[44px]">
        {task.progress !== null && (
          <div
            className={`mb-2 inline-flex items-center gap-2.5 rounded-full border px-4 py-1 backdrop-blur-sm ${
              isVersa
                ? 'border-purple-300/25 bg-gradient-to-b from-purple-400/15 to-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.22),inset_0_1px_0_rgba(233,213,255,0.14)]'
                : 'border-sky-300/25 bg-gradient-to-b from-sky-400/15 to-sky-500/5 shadow-[0_0_20px_rgba(4,172,255,0.22),inset_0_1px_0_rgba(224,242,254,0.14)]'
            }`}
          >
            <span className={`font-sans text-xs sm:text-sm tracking-wide font-medium ${isVersa ? 'text-purple-100/90' : 'text-sky-100/90'}`}>
              {task.trackerTitle}
            </span>
            <span aria-hidden="true" className={`h-3 w-px ${isVersa ? 'bg-purple-300/35' : 'bg-sky-300/35'}`} />
            <span className={`font-sans text-xs sm:text-sm tracking-wide font-semibold ${isVersa ? 'text-purple-50' : 'text-sky-50'}`}>
              {Math.round(task.progress)}%
            </span>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <Sparkles size={10} className={`${isVersa ? 'text-human/60' : 'text-portal/60'} shrink-0`} />
          <AnimatePresence mode="wait">
            <motion.span
              key={task.status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="font-serif italic text-sm text-neutral-300 leading-snug"
            >
              &ldquo;{task.status}&rdquo;
            </motion.span>
          </AnimatePresence>
          <Sparkles size={10} className={`${isVersa ? 'text-human/60' : 'text-portal/60'} shrink-0`} />
        </div>
      </div>
    </motion.div>
  );
}

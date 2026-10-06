import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LoadingTaskCard } from '../../../library/manifestations/taskCard';
import NarrativeManifestationZone from './NarrativeManifestationZone';
import MediaManifestationZone from './MediaManifestationZone';
import { ProgressIndicator } from './ProgressIndicator';
import { ProgressLabel } from './ProgressLabel';
import { StatusMessage } from './StatusMessage';
import { FamiliarSprite } from '../../familiar/development/FamiliarSprite';
import { GENERATION_FAMILIAR_WAVE_INTERVAL_MS, loadingPalette, loadingPaletteStyle, type LoadingFamiliarPresentation } from '../../../library/manifestations/familiar';
import './generationOverlay.css';

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

export interface GenerationOverlayViewProps {
  task: LoadingTaskCard;
  /** The host's equipped Familiar; omitted for legacy agent presentations. */
  familiar?: LoadingFamiliarPresentation | null;
  /** Time-based travel supplied by GenerationOverlayController; separate from any measured task percentage. */
  journeyProgress?: number;
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
 * Generation Overlay view — the full-screen shell: one shared manifestation
 * shell hosting two manifestation modes. The shell is identical across both:
 * 1. Equipped Familiar — supplied character animation + elemental aura;
 *    legacy agent callers may still supply an emblem
 * 2. Progress Indicator — a path-only curved qi path: a cultivator traveler
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
 * 4. Progress Label + Status Message — a persistent "Chapter N | X%"
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
 * Aura work: an elemental nebula with a
 * bright core, twin counter-rotating cloak wisps, grounded pool, six motes.
 * First real caller: the Library's HARNESS Reader, while it writes a chapter.
 */
export default function GenerationOverlayView({ task, familiar, journeyProgress, backdrop, emblemClassName, travelerId, trailStyle, destinationId, onMediaUnseal }: GenerationOverlayViewProps) {
  const immersive = task.agentId === 'versa' || Boolean(familiar);
  const palette = loadingPalette(familiar, task.agentId);
  const reduceMotion = useReducedMotion();

  // GenerationOverlayController supplies the elapsed-time journey separately, so unknown work
  // never gains a made-up percentage. Direct card consumers can still supply measured progress.
  const normalizedProgress =
    journeyProgress ?? (task.progress === null ? null : Math.min(1, Math.max(0, task.progress / 100)));
  const timeBasedJourney = task.progress === null && journeyProgress !== undefined;

  return (
    <motion.div
      key="fullscreen-veil"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ duration: 0.25 }}
      className={`generation-overlay fixed inset-0 h-[100dvh] ${backdrop ? 'bg-void/70' : 'bg-void/95'} backdrop-blur-md z-[9999] isolate flex flex-col overflow-hidden text-center select-none`}
      style={loadingPaletteStyle(palette)}
      data-testid="generation-overlay"
      data-familiar-id={familiar?.familiar.id}
      data-journey-progress={normalizedProgress ?? undefined}
    >
      {/* Cinematic backdrop — pinned to z-0 so shared particles always stay
          behind every content zone, including the chamber's scene layer. */}
      {backdrop && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {backdrop}
        </div>
      )}

      {/* ── Zone 1 · Equipped character ─────────────────────────────────────────────
          Emblem + aura, sized up to fill her zone naturally. The zone grew
          into the space the scrubber status text used to occupy; the character
          sits lower and more centered instead of cramped at the top. */}
      <div className="relative z-10 flex-none h-[32dvh] min-h-[196px] flex items-end justify-center pointer-events-none">
        <div className={`relative w-32 h-32 sm:w-36 sm:h-36 ${emblemClassName ?? ''} flex items-center justify-center shrink-0`}>
          <div className={`absolute inset-0 ${familiar ? 'generation-overlay-familiar-aura' : ''}`} aria-hidden="true">
          <CelestialSigil />

          {/* Ground pool — a grounded shadow that doesn't rise with her */}
          {immersive && (
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 bottom-[8%] -translate-x-1/2 rounded-[50%]"
              style={{
                width: '72%',
                height: '15%',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(var(--veil-accent-rgb),0.5) 0%, rgba(var(--veil-accent-rgb),0.3) 55%, transparent 80%)',
                filter: 'blur(5px)',
              }}
              animate={{ opacity: [0.65, 1, 0.65], scaleX: [0.92, 1, 0.92] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {immersive ? (
            <>
              {/* Nebula heart — saturated elemental glow, breathing slowly.
                  Radius pulled in ~20% and glow softened ~15% so the aura
                  stays wrapped around the character instead of bleeding onto the
                  scrubber beneath her. */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-[-34%] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 50% 52%, rgba(var(--veil-soft-rgb),0.42) 0%, rgba(var(--veil-soft-rgb),0.38) 22%, rgba(var(--veil-accent-rgb),0.32) 45%, rgba(var(--veil-accent-rgb),0.24) 66%, transparent 82%)',
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
                    'radial-gradient(circle at 50% 58%, rgba(var(--veil-soft-rgb),0.55) 0%, rgba(var(--veil-soft-rgb),0.34) 40%, transparent 70%)',
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

          {/* Aura energy — twin counter-rotating elemental wisps */}
          {immersive && (
            <>
              <motion.div
                aria-hidden="true"
                className="absolute inset-[-8%] rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(var(--veil-accent-rgb),0) 0%, rgba(var(--veil-accent-rgb),0.47) 18%, rgba(var(--veil-accent-rgb),0) 40%, rgba(var(--veil-accent-rgb),0.38) 65%, rgba(var(--veil-accent-rgb),0) 88%, rgba(var(--veil-accent-rgb),0) 100%)',
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
                    'conic-gradient(from 180deg, rgba(var(--veil-soft-rgb),0) 0%, rgba(var(--veil-soft-rgb),0.3) 22%, rgba(var(--veil-soft-rgb),0) 46%, rgba(var(--veil-accent-rgb),0.26) 70%, rgba(var(--veil-soft-rgb),0) 92%, rgba(var(--veil-soft-rgb),0) 100%)',
                  filter: 'blur(14px)',
                  mixBlendMode: 'screen',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
              />
            </>
          )}

          {/* Qi motes rising past her */}
          {immersive &&
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
                  background: 'rgba(var(--veil-soft-rgb),0.95)',
                  boxShadow: '0 0 7px rgba(var(--veil-soft-rgb),0.95), 0 0 14px rgba(var(--veil-accent-rgb),0.6)',
                }}
                animate={{ y: [0, -(48 + i * 8)], opacity: [0, 0.95, 0], x: [0, (i % 2 === 0 ? 1 : -1) * 6] }}
                transition={{ duration: 3 + i * 0.35, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }}
              />
            ))}

          </div>
          <motion.div
            className="relative z-10 w-full h-full flex items-center justify-center"
            animate={reduceMotion || familiar ? { y: 0 } : { y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {familiar ? <div className="generation-overlay-familiar w-[92%]">
              <FamiliarSprite familiar={familiar.familiar} activity={normalizedProgress === 1 ? 'ready' : undefined}
                animation={normalizedProgress === 1 ? undefined : 'waving'} paused={normalizedProgress === 1}
                repeatEveryMs={normalizedProgress === 1 ? undefined : GENERATION_FAMILIAR_WAVE_INTERVAL_MS} />
            </div> : <img
              src={task.icon.src}
              alt={task.icon.alt}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              style={immersive ? { filter: 'drop-shadow(0 0 18px rgba(var(--veil-soft-rgb),0.8)) drop-shadow(0 0 46px rgba(var(--veil-accent-rgb),0.55))' } : { filter: 'drop-shadow(0 0 15px rgba(4, 172, 255, 0.4))' }}
            />}
          </motion.div>
          {familiar && <div className="familiar-shadow generation-overlay-familiar-underline" aria-hidden="true"><span /></div>}
        </div>
      </div>

      {/* ── Zone 2 · Progress Indicator ───────────────────────────────────────
          Path-only presentation — no status text above the arc. The chapter
          identity and progress now live with the quote at the bottom (Zone 4),
          so the traveler walks the curved qi path toward the gate on its own.
          Progress arrives as the task card's 0–100 value, normalized here
          to the scrubber's 0–1 contract; GenerationOverlayController advances unknown work with time. */}
      <div className="relative z-10 flex-none px-6 pt-3">
        <ProgressIndicator
          progress={normalizedProgress}
          role={timeBasedJourney ? 'img' : 'progressbar'}
          aria-label={timeBasedJourney ? (normalizedProgress === 1 ? 'Generation complete' : 'Generation in progress') : undefined}
          travelerId={travelerId}
          trailStyle={trailStyle}
          destinationId={destinationId}
          accent={palette.accent}
          accentSoft={palette.accentSoft}
          destinationAccent={familiar ? palette.accent : undefined}
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
      {immersive && (
        <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden [container-type:size]">
          {task.manifestation.mode === 'media' ? (
            <MediaManifestationZone isVersa={immersive} spec={task.manifestation} onUnseal={onMediaUnseal} />
          ) : (
            <NarrativeManifestationZone
              isVersa={immersive}
              sceneId={task.manifestation.sceneId}
              seed={task.trackerTitle}
            />
          )}
        </div>
      )}

      {/* ── Zone 4 · Progress Label + Status Message ───────────────────
          Consolidated status hierarchy at the bottom of the chamber: a
          persistent chapter pill ("Chapter 1 ｜ 42%") in a softly glowing
          accent-tinted capsule above the rotating quote — the only text
          that changes. The percentage shows only when progress is known
          ("Chapter 1" alone otherwise); a card with no title renders the
          quote alone. */}
      <div className="relative z-10 flex-none px-6 pt-3 pb-7 flex flex-col items-center justify-center min-h-[44px]">
        <ProgressLabel label={task.trackerTitle} progress={task.progress} />
        <StatusMessage message={task.status} />
      </div>
    </motion.div>
  );
}

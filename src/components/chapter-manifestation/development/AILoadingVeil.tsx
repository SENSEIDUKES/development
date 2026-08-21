import React from 'react';
import LoadingSystem from './LoadingSystem';
import { buildAILoadingTaskCard } from '../shared/taskCard';
import {
  manifestationModeForOperation,
  NARRATIVE_STATUS_LINES,
  MEDIA_STATUS_LINES,
  type MediaRevealState,
  type RevealedMediaAsset,
} from '../shared/manifestation';
import { ParticleEffect } from '../../library/ParticleEffect';
import type { AILoadingVeilProps } from '../reference/AILoadingVeil';

/**
 * Development-only extension of the shared veil props: optional journey
 * scrubber cosmetics and media reveal overrides (Workshop simulator
 * controls). Production callers omit them and get the registry/taxonomy
 * defaults.
 */
interface DevelopmentAILoadingVeilProps extends AILoadingVeilProps {
  travelerId?: string;
  trailStyle?: string;
  destinationId?: string;
  /** Workshop-only: force the media scroll's reveal progression. */
  mediaReveal?: MediaRevealState;
  /** Workshop-only: the finished asset the media scroll reveals. */
  mediaAsset?: RevealedMediaAsset | null;
  /**
   * Workshop-only: tap handler for the sealed media scroll (tap-to-unseal).
   * Reveal progression stays caller-owned — the veil only reports the tap.
   */
  onMediaUnseal?: () => void;
}

/**
 * DEV copy of AILoadingVeil — the experimental veil under active iteration.
 * Diverges from the reference (AILoadingVeil) so visual changes can be
 * compared side by side in the Workshop preview:
 * - the atmospheric phase phrase is dropped for a more compact card
 * - the phase marker pill beneath the card is dropped
 * - 2026-07-30: the card is a single 100dvh mobile composition — Versa hero,
 *   compact chapter status, and a swipeable animation area filling the
 *   remaining viewport. The emblem spacing override is no longer needed;
 *   the hero zone manages its own footprint.
 * - 2026-07-30: Aura Veil modes. The operation's manifestation mode
 *   (narrative / media, resolved via shared/manifestation.ts) now selects
 *   the status language — narrative ops rotate the narrative lines during a
 *   chapter, media ops rotate the media lines — and the media tracker
 *   detail follows the scroll's reveal progression. Reader Chamber, Codex,
 *   and Narration never flow through here.
 * - 2026-07-30: status consolidation. The scrubber no longer carries a
 *   status block; the chapter identity and progress live at the bottom as
 *   "Chapter N | X%" above the rotating quote. The live "Manifesting N/20"
 *   readout is gone — the journey scrubber's traveler position and the
 *   bottom percentage carry progress now.
 * - 2026-07-30: backdrop tuning — the particle shower runs ~18% slower
 *   (speedScale 0.82) and a 35% share of particles drift laterally instead
 *   of converging, so the sides of the veil stay populated.
 * Workshop-only: do not wire this into production flows.
 */
export default function AILoadingVeil({
  isGenerating,
  generationPhase,
  generationProgressMessage,
  estimatedSecondsRemaining,
  activeAgentId,
  streamingBlocksCount,
  isVeilMinimized,
  setIsVeilMinimized,
  generatingChapterNum,
  travelerId,
  trailStyle,
  destinationId,
  mediaReveal,
  mediaAsset,
  onMediaUnseal
}: DevelopmentAILoadingVeilProps) {
  const [quoteIndex, setQuoteIndex] = React.useState(0);

  const isChapterPhase = generationPhase === 'chapter';
  const isMediaOperation = manifestationModeForOperation(generationPhase) === 'media';

  const shouldShowFullScreen = isGenerating && !isVeilMinimized;

  const passagesWoven = streamingBlocksCount;
  const progressWidth = isChapterPhase
    ? Math.min(6 + passagesWoven * 4.5, 96)
    : null;

  // Operation-specific language: narrative ops rotate the narrative lines,
  // media ops rotate the media set; other phases keep their progress message.
  const statusLines = isMediaOperation ? MEDIA_STATUS_LINES : NARRATIVE_STATUS_LINES;
  const rotatesQuotes = isChapterPhase || isMediaOperation;

  // The scroll's reveal progression, resolved once for the card spec
  // (a supplied asset implies 'revealed').
  const resolvedMediaReveal: MediaRevealState =
    mediaReveal ?? (mediaAsset ? 'revealed' : 'unsealing');

  React.useEffect(() => {
    if (!shouldShowFullScreen || !rotatesQuotes) {
      setQuoteIndex(0);
      return;
    }
    const id = setInterval(() => {
      setQuoteIndex(i => (i + 1) % statusLines.length);
    }, 3500);
    return () => clearInterval(id);
  }, [shouldShowFullScreen, rotatesQuotes, statusLines, generatingChapterNum]);

  const statusQuote = rotatesQuotes
    ? statusLines[quoteIndex]
    : (generationProgressMessage || 'Manifesting spiritual matrices');

  const task = {
    ...buildAILoadingTaskCard({
      generationPhase,
      generationProgressMessage,
      estimatedSecondsRemaining,
      activeAgentId,
      streamingBlocksCount,
      generatingChapterNum,
      statusQuote,
      progress: progressWidth,
      mediaReveal: resolvedMediaReveal,
      mediaAsset,
    }),
    // Compact card: no atmospheric phrase and no phase marker pill.
    description: '',
    operationTitle: '',
  };

  return (
    <LoadingSystem
      active={isGenerating}
      task={task}
      mode="auto"
      minimized={isVeilMinimized}
      onMinimizedChange={setIsVeilMinimized}
      travelerId={travelerId}
      trailStyle={trailStyle}
      destinationId={destinationId}
      onMediaUnseal={onMediaUnseal}
      backdrop={
        <ParticleEffect
          accent={activeAgentId === 'scout' ? '#04ACFF' : '#c22e1f'}
          speedScale={0.47}
          dispersion={0.96}
        />
      }
    />
  );
}

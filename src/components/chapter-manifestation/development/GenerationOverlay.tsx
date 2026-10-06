import React from 'react';
import GenerationOverlayController from './GenerationOverlayController';
import { buildGenerationOverlayTaskCard, type LoadingAgentPresentation } from '../../../library/manifestations/taskCard';
import { manifestationModeForOperation, type MediaRevealState, type RevealedMediaAsset } from '@seihouse/sen/manifestations';
import { NARRATIVE_STATUS_LINES, MEDIA_STATUS_LINES } from '../../../library/manifestations/statusLines';
import { AmbientEffects } from './AmbientEffects';
import type { GenerationOverlaySignals } from '../../../library/manifestations/generationOverlay';
import { useLoadingFamiliar } from '../../../library/manifestations/familiar';

/**
 * Development-only extension of the shared veil props: optional journey
 * scrubber cosmetics and media reveal overrides (Workshop simulator
 * controls). Production callers omit them and get the registry/taxonomy
 * defaults.
 */
export interface GenerationOverlayProps extends GenerationOverlaySignals {
  agent: LoadingAgentPresentation;
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
  /**
   * The caller's known progress, 0–100, or null when it is unknown (a HARNESS
   * chapter arrives whole, so its writer passes null): the journey advances
   * with elapsed time, without a percentage. Omitted, the narrative screen estimates progress
   * from streamed passages, as the Workshop simulation does.
   */
  progress?: number | null;
}

/**
 * Generation Overlay — the host adapter for full-screen and compact generation
 * presentation. Historical reference code stays separate in the Workshop:
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
 * - 2026-10-01: two screens. Every narrative operation shows the same
 *   narrative manifestation and every media operation the same reveal; the
 *   pill names the chapter, with a percentage only when progress is known
 *   (`progress`), so a HARNESS chapter write never shows a made-up number.
 * First real caller: the Library's HARNESS Reader, while it writes a chapter.
 */
export default function GenerationOverlay({
  agent,
  isGenerating,
  completed,
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
  onMediaUnseal,
  progress
}: GenerationOverlayProps) {
  const [quoteIndex, setQuoteIndex] = React.useState(0);
  // Scout remains a short retrieval indicator; generation wears the equipped Familiar.
  const equippedFamiliar = useLoadingFamiliar();
  const familiar = agent.id === 'scout' ? null : equippedFamiliar;
  const presentedAgent = familiar ? {
    id: familiar.familiar.id, name: familiar.familiar.displayName,
    logoUrl: familiar.familiar.placeholderUrl ?? agent.logoUrl, colorClass: agent.colorClass,
  } : agent;

  // Two screens, whatever the operation: one narrative manifestation (any
  // story or chapter writing) and one media reveal (any media asset). A call
  // with no operation (a retrieval) keeps its own progress message.
  const isMediaOperation = manifestationModeForOperation(generationPhase) === 'media';
  const isNarrativeScreen = Boolean(generationPhase) && !isMediaOperation;

  const shouldShowFullScreen = isGenerating && !isVeilMinimized;

  const passagesWoven = streamingBlocksCount;
  const progressWidth = progress !== undefined
    ? (progress === null ? null : Math.min(Math.max(progress, 0), 100))
    : isNarrativeScreen && passagesWoven > 0
      ? Math.min(6 + passagesWoven * 4.5, 96)
      : null;

  const statusLines = isMediaOperation ? MEDIA_STATUS_LINES : NARRATIVE_STATUS_LINES;
  const rotatesQuotes = isNarrativeScreen || isMediaOperation;

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
    ...buildGenerationOverlayTaskCard({
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
    }, presentedAgent),
    // Compact card: no atmospheric phrase and no phase marker pill.
    description: '',
    operationTitle: '',
    // The bottom pill names the chapter on the narrative screen; nothing else has one.
    trackerTitle: isNarrativeScreen && generatingChapterNum ? `Chapter ${generatingChapterNum}` : '',
  };

  return (
    <GenerationOverlayController
      active={isGenerating}
      completed={completed}
      task={task}
      familiar={familiar}
      mode="auto"
      minimized={isVeilMinimized}
      onMinimizedChange={setIsVeilMinimized}
      travelerId={travelerId}
      trailStyle={trailStyle}
      destinationId={destinationId}
      onMediaUnseal={onMediaUnseal}
      backdrop={
        <AmbientEffects
          accent={familiar?.accent ?? (activeAgentId === 'scout' ? '#04ACFF' : '#c22e1f')}
          speedScale={0.47}
          dispersion={0.96}
        />
      }
    />
  );
}

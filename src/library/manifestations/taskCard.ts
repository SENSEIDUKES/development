import type { LoadingTaskCard, LoadingPhase } from '@seihouse/sen/manifestations';
export interface LoadingAgentPresentation { id: string; name: string; logoUrl: string; colorClass: string }
export type { LoadingTaskCard } from '@seihouse/sen/manifestations';
import { buildManifestationSpec, type ManifestationSpec, type MediaRevealState, type RevealedMediaAsset } from '@seihouse/sen/manifestations';

/**
 * LoadingTaskCard — the single interchangeable format every loading
 * presentation in the Workshop consumes. Any operation (AI generation,
 * retrieval, background jobs) normalizes its live information into this
 * shape, and either visual mode (primary veil or compact indicator) can
 * render it without knowing where it came from.
 */

/** Inputs the AILoadingVeil adapter resolves before building the card. */
export interface AILoadingTaskInput {
  generationPhase: string | null;
  generationProgressMessage: string | null;
  estimatedSecondsRemaining: number | null;
  activeAgentId: 'versa' | 'scout' | null;
  streamingBlocksCount: number;
  generatingChapterNum: number | null;
  /** Resolved live status line (rotating quote or progress message). */
  statusQuote: string;
  /** Resolved 0–100 progress, or null for indeterminate. */
  progress: number | null;
  /**
   * Optional Aura Veil overrides: an explicit narrative omen scene, or the
   * media reveal progression / finished asset. Omit for the taxonomy
   * defaults (system-selected omen scene; unsealing scroll).
   */
  omenSceneId?: string;
  mediaReveal?: MediaRevealState;
  mediaAsset?: RevealedMediaAsset | null;
}

/** Known AI generation phases, in narrative order. */
export const AI_PHASES: LoadingPhase[] = [
  { id: 'blueprint', label: 'Aetherial Mapping' },
  { id: 'initial-arc', label: 'Scripture Initiation' },
  { id: 'cover', label: 'Cover Reforging' },
  { id: 'image', label: 'Image Manifestation' },
  { id: 'audio', label: 'Audio Manifestation' },
  { id: 'visual', label: 'Motion Manifestation' },
  { id: 'chapter', label: 'Chapter Manifestation' },
];

/** Atmospheric phrases shown inside the primary veil card, per phase. */
export const AI_PHASE_PHRASES: Record<string, string> = {
  blueprint: 'Establishing foundational laws, power limitations, and planetary properties.',
  'initial-arc': 'Transcribing the grand volume ledger, compiling chapter milestones and character templates.',
  cover: 'Translating core premise variables into bespoke high-fidelity digital art.',
  image: 'Condensing celestial pigments into a standalone vision.',
  audio: 'Weaving ethereal resonance into a standalone soundscape.',
  visual: 'Binding light and motion into a living tableau.',
  chapter: 'Celestial threads are being woven into narrative form.',
};

/**
 * Normalize the AILoadingVeil generation signals into a LoadingTaskCard.
 * Preserves every piece of information the original veils received —
 * phase copy, chapter tracker, passages count, and time estimates.
 */
export function buildAILoadingTaskCard(input: AILoadingTaskInput, agent: LoadingAgentPresentation): LoadingTaskCard {
  const isChapter = input.generationPhase === 'chapter';
  const chapterNum = input.generatingChapterNum;
  const passages = input.streamingBlocksCount;
  const phaseId = input.generationPhase;

  return {
    operationName: agent.name,
    operationTitle: !phaseId
      ? 'Consciousness Sync'
      : isChapter
        ? `Chapter ${chapterNum || ''} Manifestation`
        : AI_PHASES.find(p => p.id === phaseId)?.label ?? 'Celestial Engine',
    icon: { kind: 'image', src: agent.logoUrl, alt: agent.name },
    status: input.statusQuote,
    description: phaseId
      ? (AI_PHASE_PHRASES[phaseId] ?? 'Interfacing with the SEIHouse deep narrative engine.')
      : 'Interfacing with the SEIHouse deep narrative engine.',
    progress: input.progress,
    phases: AI_PHASES,
    activePhaseId: phaseId,
    trackerTitle: isChapter ? `Chapter ${chapterNum || ''}` : 'Celestial Engine',
    trackerDetail: isChapter
      ? (passages > 0 ? `${passages} passages formed` : 'Initiating Cosmic Channel')
      : 'Spiritual matrix forming',
    trackerNote: isChapter ? 'The chapter is revealed once its continuity is verified.' : null,
    estimatedSecondsRemaining: input.estimatedSecondsRemaining,
    compactTitle: isChapter ? `Forging Chapter ${chapterNum || ''}` : 'Celestial Engine',
    compactBody: isChapter
      ? `Chapter ${chapterNum || ''} is generating.`
      : 'Engine is forging spiritual matrix.',
    compactStatus: input.generationProgressMessage || 'Manifesting spiritual matrices...',
    agentId: agent.id,
    colorClass: agent.colorClass,
    // Scout and other short retrieval tasks never block the screen.
    preferredMode: agent.id === 'scout' ? 'compact' : 'primary',
    // Aura Veil manifestation spec — mode and active zone resolved from the
    // operation id via the shared taxonomy.
    manifestation: buildManifestationSpec(phaseId, {
      sceneId: input.omenSceneId,
      reveal: input.mediaReveal,
      asset: input.mediaAsset,
    }),
  };
}

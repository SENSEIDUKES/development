import type { PacketSectionId } from '../../../narrative/generation';
import { CAPA_PROMPT_TOKEN_LIMIT } from './skills';

export interface PacketSectionBudget {
  /** Soft token allocation. Absent for sections that are never measured against one. */
  tokens?: number;
  /** Protected sections are never removed or compacted, whatever their size. */
  protected: boolean;
}

/**
 * The one place the compact generation packet is budgeted. Development
 * defaults: no approved production tuning exists yet, so every number here is
 * reported for later review. Canonical state is the only section that is
 * actively selected against its allocation; the others are measured so an
 * oversized Foundation or recap set is visible in HARNESS diagnostics.
 */
export const GENERATION_PACKET_BUDGET = {
  source: 'development-default',
  /** Token estimate used before the provider boundary measures the real request. */
  charactersPerToken: 4,
  sections: {
    capaPrompt: { tokens: CAPA_PROMPT_TOKEN_LIMIT, protected: true },
    currentStory: { tokens: 6_000, protected: false },
    storyDirection: { protected: true },
    arc: { protected: true },
    rhythm: { protected: true },
    fateSurvival: { protected: false },
    previouslyOn: { tokens: 2_000, protected: false },
    canonicalState: { tokens: 3_000, protected: false },
    missionReminder: { protected: true },
    immediateChapterRequest: { protected: true },
  } satisfies Record<PacketSectionId, PacketSectionBudget>,
  /** How many of the latest committed recaps enter the packet. */
  previouslyOnCount: 5,
  /** Committed chapters whose entities count as active for canonical-state priority. */
  activeChapterWindow: 3,
  /** Full entries fill this share of the canonical-state allocation; the rest holds compact entries. */
  canonicalFullEntryShare: 0.85,
  /** Longest fact value carried into the packet; longer values are cut with an ellipsis. */
  canonicalFactCharacters: 240,
  /** Soft ceiling for the whole serialized request, measured at the provider boundary. */
  requestTokens: 28_000,
} as const;

export const PACKET_SECTION_ORDER: readonly PacketSectionId[] = [
  'capaPrompt',
  'currentStory',
  'storyDirection',
  'arc',
  'rhythm',
  'fateSurvival',
  'previouslyOn',
  'canonicalState',
  'missionReminder',
  'immediateChapterRequest',
];

export const estimatePacketTokens = (value: unknown): number =>
  Math.max(1, Math.ceil((typeof value === 'string' ? value : JSON.stringify(value)).length / GENERATION_PACKET_BUDGET.charactersPerToken));

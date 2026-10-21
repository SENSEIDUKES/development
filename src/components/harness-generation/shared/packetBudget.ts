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
    previouslyOn: { tokens: 2_000, protected: false },
    canonicalState: { tokens: 3_000, protected: false },
    // The planner's Codex: everyone and everything the story knows. Never trimmed, so Fate never forgets a
    // sword, a wound or a debt; measured, so its growth over a long story stays visible.
    codex: { protected: true },
    // The writer's: the Chapter Plan, its cast as the record had them and its events.
    chapterPlan: { protected: true },
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

/** Every section of the packet, in order: what either of a chapter's two calls is sent. */
export const PACKET_SECTION_ORDER: readonly PacketSectionId[] = [
  'capaPrompt',
  'currentStory',
  'storyDirection',
  'arc',
  'rhythm',
  'previouslyOn',
  'canonicalState',
  'codex',
  'chapterPlan',
  // The chapter's request, then the Mission Reminder last, closing the call (SENSEI, 2026-10-16).
  'immediateChapterRequest',
  'missionReminder',
];

/**
 * The sections each of a chapter's two calls is sent, in order (SENSEI,
 * 2026-10-20: the chapter loop). The planner decides what happens, so it reads
 * the author's direction, the arc, Rhythm and the Codex, with its own skills;
 * the writer narrates the plan, so it reads the story so far and the Chapter
 * Plan, and the Mission Reminder closes its call.
 */
export const PLANNER_SECTION_ORDER: readonly PacketSectionId[] = [
  'capaPrompt', 'currentStory', 'storyDirection', 'arc', 'rhythm', 'previouslyOn', 'canonicalState', 'codex', 'immediateChapterRequest',
];
export const WRITER_SECTION_ORDER: readonly PacketSectionId[] = [
  'capaPrompt', 'currentStory', 'previouslyOn', 'canonicalState', 'chapterPlan', 'immediateChapterRequest', 'missionReminder',
];

export const estimatePacketTokens = (value: unknown): number =>
  Math.max(1, Math.ceil((typeof value === 'string' ? value : JSON.stringify(value)).length / GENERATION_PACKET_BUDGET.charactersPerToken));

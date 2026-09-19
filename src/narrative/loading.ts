import type { ManifestationSpec } from '../components/chapter-manifestation/shared/manifestation';
export interface LoadingPhase {
  id: string;
  label: string;
}

export type LoadingTaskIcon =
  | { kind: 'image'; src: string; alt: string };

export interface LoadingTaskCard {
  /** Display name of the operation or agent, e.g. 'VERSA'. */
  operationName: string;
  /** Stable phase marker shown for the whole operation, e.g. 'Chapter 4 Manifestation'. Empty string hides the phase marker. */
  operationTitle: string;
  /** Emblem or glyph representing the operation. */
  icon: LoadingTaskIcon;
  /** Short live status line — the only text allowed to rotate while running. */
  status: string;
  /** Longer atmospheric description of the current phase. Empty string hides the phrase block. */
  description: string;
  /** 0–100 deterministic progress, or null for an indeterminate sweep. */
  progress: number | null;
  /** Known phases of the operation and which one is active. */
  phases: LoadingPhase[];
  activePhaseId: string | null;

  /** Persistent tracker line that never fades, e.g. 'Chapter 4'. */
  trackerTitle: string;
  /** Live tracker detail, e.g. '12 passages formed'. */
  trackerDetail: string;
  /** Optional explanatory note under the tracker. */
  trackerNote: string | null;
  /** Seconds remaining estimate, when known. */
  estimatedSecondsRemaining: number | null;

  /** Compact-mode copy. */
  compactTitle: string;
  compactBody: string;
  compactStatus: string;

  /** Presentation routing and accent. */
  agentId: string;
  colorClass: string;
  /** Where the operation prefers to render; 'compact' for short/background tasks. */
  preferredMode: 'primary' | 'compact';

  /**
   * Aura Veil manifestation spec — which manifestation mode (narrative /
   * media) and active zone the primary veil renders, resolved from the
   * operation via the taxonomy in shared/manifestation.ts. Reader Chamber,
   * Codex, and Narration manifestations never appear here; they own their
   * dedicated manifestation logic elsewhere.
   */
  manifestation: ManifestationSpec;
}

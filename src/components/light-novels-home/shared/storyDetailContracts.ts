import type { ReactNode } from 'react';
import type { HomeWorld } from './homeContracts';

/** A host-computed activity signal. Omit it when unavailable or not visible to this viewer. */
export type WorldActivityStatus = 'active-now' | 'active-this-week' | 'quiet';

/** Presentation extraction of StoryDetailScreen, supplied entirely by its host. */
export interface StoryDetailDisplay extends HomeWorld {
  author: string;
  synopsis: string;
  currentArc: string;
  status: string;
  tags: readonly string[];
  /** Show the cultivation-rate chip only when the host has a real value. */
  cultivationRate?: string;
  /** Aggregate number of worlds branched from this seed. Zero is a known count. */
  branchCount?: number;
  /** Host-authorized activity status; omission means the Info page shows no activity signal. */
  activityStatus?: WorldActivityStatus;
}
export interface StoryDetailScreenProps {
  story: StoryDetailDisplay;
  onBack: () => void;
  onRead?: () => void;
  onOpenCodex?: () => void;
  onOpenTimeline?: () => void;
  children?: ReactNode;
}

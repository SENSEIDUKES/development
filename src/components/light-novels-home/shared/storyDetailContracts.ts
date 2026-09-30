import type { ReactNode } from 'react';
import type { HomeWorld } from './homeContracts';

export type { WorldActivityStatus } from './homeContracts';

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
}
export interface StoryDetailScreenProps {
  story: StoryDetailDisplay;
  onBack: () => void;
  onRead?: () => void;
  onOpenCodex?: () => void;
  onOpenTimeline?: () => void;
  /** The viewer's known reading position, when the host has one. */
  readingPosition?: { chapterNumber: number };
  children?: ReactNode;
}

import type { ReactNode } from 'react';
import type { HomeWorld } from './homeContracts';

/** Presentation extraction of StoryDetailScreen, supplied entirely by its host. */
export interface StoryDetailDisplay extends HomeWorld {
  author: string;
  synopsis: string;
  currentArc: string;
  status: string;
  tags: readonly string[];
}
export interface StoryDetailScreenProps {
  story: StoryDetailDisplay;
  onBack: () => void;
  onRead?: () => void;
  onOpenCodex?: () => void;
  onOpenTimeline?: () => void;
  children?: ReactNode;
}

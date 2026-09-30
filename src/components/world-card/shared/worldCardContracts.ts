import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import type { CreatorWorld, CreatorWorldStatus } from '../../creator-space/shared/creatorSpaceContracts';

/**
 * One world, three views. Each face reads the display data its host page
 * already supplies — no new world model is introduced here.
 */

/** Info page: the full world overview shown when a reader opens a world. */
export interface WorldCardInfoProps {
  story: StoryDetailDisplay;
  onRead?: () => void;
  onOpenCodex?: () => void;
  onOpenTimeline?: () => void;
}

/** Artwork-only face on the Info page; story details remain in the page layout. */
export interface WorldCardInfoCoverProps {
  world: StoryDetailDisplay;
  face: 'info';
}

/** Full card: the 2:3 discovery card on Home. */
export type WorldCardDisplayStatus =
  | { view: 'public'; value: 'ongoing' | 'completed' }
  | { view: 'library'; value: CreatorWorldStatus };

export interface WorldCardProps {
  world: HomeWorld;
  onOpen: () => void;
  /** Host-supplied progress for the surface showing this card. Unknown status stays hidden. */
  displayStatus?: WorldCardDisplayStatus;
}

/** Compact card: the creator's world tile on Create. */
export interface WorldCardCompactProps {
  world: CreatorWorld;
  /** Resolved art; the host picks a fallback for worlds with no cover yet. */
  cover?: string;
  /** True when `cover` is host fallback art rather than the world's own. */
  fallbackCover?: boolean;
  selected?: boolean;
  onSelect: () => void;
}

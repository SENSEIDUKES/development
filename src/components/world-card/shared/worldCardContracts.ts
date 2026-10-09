import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import type { CreatorWorld, CreatorWorldStatus } from '../../creator-space/shared/creatorSpaceContracts';

/**
 * One world, three views. Each face reads the display data its host page
 * already supplies — no new world model is introduced here.
 */

/** Info page: the full world overview shown when a reader opens a world. */
export interface WorldCardInfoProps {
  story: StoryDetailDisplay | CreatorWorld;
  onRead?: () => void;
  /**
   * Starts a story that has no chapters yet. The host owns what starting means
   * (for example writing Chapter 1); without it, an empty story stays static.
   */
  onStart?: () => void;
  onOpenCodex?: () => void;
  /** The viewer's known reading position; the Chapters card says Continue Reading only when supplied. */
  readingPosition?: { chapterNumber: number };
}

/** Artwork-only face on the Info page; story details remain in the page layout. */
export interface WorldCardInfoCoverProps {
  world: StoryDetailDisplay | CreatorWorld;
  face: 'info';
}

/** Full card: the discovery card on Home, the 2:3 cover with its caption beneath. */
export type WorldCardDisplayStatus =
  | { view: 'public'; value: 'ongoing' | 'completed' }
  | { view: 'library'; value: CreatorWorldStatus };

export interface WorldCardProps {
  world: HomeWorld;
  onOpen: () => void;
  /** Host-supplied progress for the surface showing this card. Unknown status stays hidden. */
  displayStatus?: WorldCardDisplayStatus;
  /**
   * Shows the SEN sash across the cover's corner. Off unless the host awards it; the sash is
   * reserved for a distinction the host defines (for example, a completed novel).
   */
  senSash?: boolean;
}

/** Feature card: a wide banner for a world the host wants to spotlight (Home's featured row). */
export interface WorldCardFeatureProps {
  world: HomeWorld;
  onOpen: () => void;
  /** Host-supplied progress, as on the Full card. Unknown status stays hidden. */
  displayStatus?: WorldCardDisplayStatus;
  /** The gold line above the title; defaults to "Featured". */
  label?: string;
  /**
   * Shows the SEN sash across the cover's corner. Off unless the host awards it; the sash is
   * reserved for a distinction the host defines (for example, a completed novel).
   */
  senSash?: boolean;
}

/** Compact card: the creator's world tile on Create, square art with its caption beneath. */
export interface WorldCardCompactProps {
  world: CreatorWorld;
  /** Resolved art; the host picks a fallback for worlds with no cover yet. */
  cover?: string;
  /** True when `cover` is host fallback art rather than the world's own. */
  fallbackCover?: boolean;
  selected?: boolean;
  /** Opens this world's Info page; the host owns navigation. */
  onOpen: () => void;
  /**
   * Shows the SEN sash across the cover's corner. Off unless the host awards it; the sash is
   * reserved for a distinction the host defines (for example, a completed novel).
   */
  senSash?: boolean;
}

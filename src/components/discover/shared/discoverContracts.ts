import type { ReactNode } from 'react';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';

/** One new chapter of a world, as the host reports it. */
export interface DiscoverRelease {
  id: string;
  worldId: string;
  chapterNumber: number;
  chapterTitle?: string;
  /** ISO time the chapter went out. The feed orders by this alone. */
  releasedAt: string;
}

/** A Heavenly Rankings board; the host decides which boards exist and whether they are open yet. */
export interface DiscoverRankingBoard {
  id: string;
  label: string;
  description: string;
  /** The board's worlds, first place first, as the host ranked them. Omitted while the board is not open. */
  worldIds?: readonly string[];
}

/** A themed Event, such as Mystery Week; dates are host display text. */
export interface DiscoverEvent {
  id: string;
  title: string;
  description: string;
  when?: string;
  imageUrl?: string;
}

/**
 * Discover: the Library's front door. Display data and every destination
 * belong to the host; the page never ranks, recommends or invents a world.
 */
export interface DiscoverProps {
  /** Every world the page may show, public and SEIHouse-backed. */
  worlds: readonly HomeWorld[];
  /** Worlds the host features at the top of the page, in its order. */
  featuredWorldIds?: readonly string[];
  /** New chapters. New Chapters shows them newest first, nothing else deciding the order. */
  releases: readonly DiscoverRelease[];
  /** Worlds the reader tracks, for My updates. Omitted means the Tracker is not available yet. */
  trackedWorldIds?: readonly string[];
  /** Fate Survival worlds, in the host's order, for their own feature. */
  fateSurvivalWorldIds?: readonly string[];
  /** Heavenly Rankings boards. A board without worlds shows as opening soon. */
  rankingBoards?: readonly DiscoverRankingBoard[];
  /** Themed Events. */
  events?: readonly DiscoverEvent[];
  onOpenWorld: (worldId: string) => void;
  /** A short host note under the title, such as a sample-catalog line. */
  notice?: ReactNode;
  /** The time relative release times are measured from. Defaults to now. */
  now?: Date;
}

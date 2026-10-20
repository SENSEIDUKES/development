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
  /** New chapters. Latest Releases shows them newest first, nothing else deciding the order. */
  releases: readonly DiscoverRelease[];
  /** Worlds the reader tracks, for My updates. Omitted means the Tracker is not available yet. */
  trackedWorldIds?: readonly string[];
  /** Fate Survival worlds, in the host's order, for their own spotlight. */
  fateSurvivalWorldIds?: readonly string[];
  /** Heavenly Rankings boards. Each shows as coming until the host opens it. */
  rankingBoards?: readonly DiscoverRankingBoard[];
  /** Themed Events. */
  events?: readonly DiscoverEvent[];
  onOpenWorld: (worldId: string) => void;
  /** A host note above the page, such as a sample-catalog banner. */
  notice?: ReactNode;
  /** The time relative release times are measured from. Defaults to now. */
  now?: Date;
}

import type { ReactNode } from 'react';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';

export type DiscoverSection = 'stories' | 'creators' | 'codex' | 'lore';
export type DiscoverMedium = 'novel' | 'manga' | 'game' | 'video';

/** Public directory projections supplied by the host, not another story record. */
export interface DiscoverCreator {
  id: string;
  name: string;
  description: string;
  worldIds: readonly string[];
}

export interface DiscoverCodexEntry {
  id: string;
  kind: 'characters' | 'items';
  name: string;
  description: string;
  worldId: string;
  imageUrl?: string;
}

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
  kind: 'stories' | 'creators' | 'characters' | 'items';
  label: string;
  description: string;
  /** The board's worlds, first place first, as the host ranked them. Omitted while the board is not open. */
  worldIds?: readonly string[];
  creatorIds?: readonly string[];
  entryIds?: readonly string[];
}

/**
 * Discover: the Library's front door. Display data and every destination
 * belong to the host; the page never ranks, recommends or invents a world.
 */
export interface DiscoverProps {
  section: DiscoverSection;
  medium: DiscoverMedium;
  onMediumChange: (medium: DiscoverMedium) => void;
  sectionHref: (section: DiscoverSection) => string;
  onSectionChange: (section: DiscoverSection) => void;
  creators?: readonly DiscoverCreator[];
  codexEntries?: readonly DiscoverCodexEntry[];
  followedCreatorIds?: readonly string[];
  trackedCodexIds?: readonly string[];
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
  onOpenWorld: (worldId: string) => void;
  /** A short host note under the title, such as a sample-catalog line. */
  notice?: ReactNode;
  /** The host composes the existing encyclopedia, including article navigation. */
  renderLore: (updatesOnly: boolean) => ReactNode;
  loreArticle?: boolean;
  /** The time relative release times are measured from. Defaults to now. */
  now?: Date;
}

import type { ReactNode } from 'react';
import type { HomeWorld } from './homeContracts';
import type { WorldExpansionPreview } from '../development/WorldExpressions';

/** One chapter in World Info's chapter selector. */
export interface WorldInfoChapter {
  number: number;
  /** The chapter's own title, in the world's original language; omit when it has none. */
  title?: string;
  /** The reader marked or finished this chapter. Chapters before the reader's place count as read too. */
  read?: boolean;
}

/**
 * One goal of an arc, where the story placed it. `resolved` is the story's own record of the
 * chapter that reached (or missed) it; the chapter selector reveals it only once the reader has
 * read that chapter, so the map never spoils what is ahead of them.
 */
export interface WorldInfoArcGoal {
  text: string;
  startChapter: number;
  endChapter: number;
  resolved?: { chapterNumber: number; outcome: 'reached' | 'missed' };
}

/** One arc of the book: its chapter range and its goals, in order. */
export interface WorldInfoArc {
  number: number;
  firstChapter: number;
  lastChapter: number;
  goals: readonly WorldInfoArcGoal[];
}

/**
 * Where this world branched from another: the chapters before `atChapter` are the shared
 * history it was branched from, and from `atChapter` on it is its own path.
 */
export interface WorldInfoBranch {
  /** The world it branched from, as its readers know it. */
  fromTitle: string;
  atChapter: number;
  /** True when the viewer made this branch. */
  yours?: boolean;
}

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
  /**
   * World Info's Information panel (and Settings' Read it in). Every value
   * comes from the host and is left out when unknown; the panel shows only
   * what it is given.
   */
  /** Languages readers can already read it in, besides the original (translations already made). */
  readingLanguages?: readonly string[];
  /** True when the creator marked the world for mature audiences (Rated 18+); false for all ages. */
  matureContent?: boolean;
  /** What the creator allows; a host leaves out what it does not know. */
  permissions?: WorldPermissions;
  /** Where the world's provenance records open; Information links to it only when supplied. */
  provenanceUrl?: string;
  /** When the world last changed (its newest chapter or edit), shown beside when it began. */
  updatedAt?: string;
  /** The creator's own notes to readers, shown at the bottom of Information. */
  authorNotes?: string;
}

/** The creator's permissions for a world, as the host records them. */
export interface WorldPermissions {
  /** Who can find and read the world. */
  visibility?: 'private' | 'shared' | 'public';
  /** Whether readers may branch the story. */
  branching?: boolean;
  /** Whether others may see the world's Blueprint, and copy it. */
  blueprint?: 'off' | 'view' | 'copy';
}
export interface StoryDetailScreenProps {
  story: StoryDetailDisplay;
  onBack: () => void;
  /** Visible name of the way back; the host names where Back leads. */
  backLabel?: string;
  onRead?: () => void;
  /** Starts a story that has no chapters yet; see `WorldCardInfoProps.onStart`. */
  onStart?: () => void;
  onOpenCodex?: () => void;
  /** See `WorldCardInfoProps.chapters`. */
  chapters?: readonly WorldInfoChapter[];
  /** See `WorldCardInfoProps.arcs`. */
  arcs?: readonly WorldInfoArc[];
  /** See `WorldCardInfoProps.branch`. */
  branch?: WorldInfoBranch;
  /** See `WorldCardInfoProps.onOpenChapter`. */
  onOpenChapter?: (chapterNumber: number) => void;
  /** See `WorldCardInfoProps.portal`. */
  portal?: { expansions: readonly WorldExpansionPreview[] };
  /** See `WorldCardInfoProps.settings`. */
  settings?: ReactNode;
  onOpenTimeline?: () => void;
  /** The viewer's known reading position, when the host has one. */
  readingPosition?: { chapterNumber: number };
  /** See `WorldCardInfoProps.coverAction`. */
  coverAction?: ReactNode;
  /** See `WorldCardInfoProps.readingLanguage`. */
  readingLanguage?: { current?: string; onChange: (language: string) => void };
  children?: ReactNode;
}

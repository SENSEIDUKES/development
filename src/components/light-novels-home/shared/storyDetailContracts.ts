import type { ReactNode } from 'react';
import type { HomeWorld } from './homeContracts';
import type { WorldExpansionPreview } from '../development/WorldExpressions';

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
   * World Info's Information panel. Every value comes from the host and is
   * left out when unknown; the panel shows only what it is given.
   */
  /** The language the world is written in (a SEN language code, e.g. `en`). */
  originalLanguage?: string;
  /** Languages readers can already read it in, besides the original (translations already made). */
  readingLanguages?: readonly string[];
  /** True when the creator marked the world for mature audiences (Rated 18+); false for all ages. */
  matureContent?: boolean;
  /** What the creator allows; a host leaves out what it does not know. */
  permissions?: WorldPermissions;
  /** Where the world's provenance records open; the format mark links to it only when supplied. */
  provenanceUrl?: string;
  /** When the world last changed (its newest chapter or edit), shown beside when it began. */
  updatedAt?: string;
  /** The creator's own notes to readers, shown at the bottom of Verification. */
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
  /** See `WorldCardInfoProps.onOpenBlueprint`. */
  onOpenBlueprint?: () => void;
  /** See `WorldCardInfoProps.portal`. */
  portal?: { expansions: readonly WorldExpansionPreview[] };
  onOpenTimeline?: () => void;
  /** The viewer's known reading position, when the host has one. */
  readingPosition?: { chapterNumber: number };
  /** See `WorldCardInfoProps.coverAction`. */
  coverAction?: ReactNode;
  /** See `WorldCardInfoProps.readingLanguage`. */
  readingLanguage?: { current?: string; onChange: (language: string) => void };
  children?: ReactNode;
}

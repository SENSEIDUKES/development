import type { ReactNode } from 'react';
import type { ElementalTitleEffect, ElementalTitleIntensity } from '@seihouse/ui';
/** Host-computed and viewer-authorized; omit hidden, stale, or unavailable activity. */
export type WorldActivityStatus = 'active-now' | 'active-this-week' | 'quiet';
/** Display data only; account acquisition and story opening remain host actions. */
export interface HomeWorld {
  id: string; title: string; genre: string; createdAt: string; reads: number;
  imageUrl: string; chapterCount: number; chapterWritingStyle?: string;
  mcName: string; powerStage: string; acquired?: boolean; recentlyRead?: boolean; draft?: boolean;
  /** Card identity fields; omit either one when the host has no verified value. */
  creatorName?: string; format?: string;
  /** Host-resolved creator lettering; the card never infers an element from the name or world. */
  creatorTitle?: { element: ElementalTitleEffect; intensity?: ElementalTitleIntensity; color?: string };
  /** Host-reported progress for a publicly visible world; omit when unknown. */
  publicationStatus?: 'ongoing' | 'completed';
  /** Official SEN verification, supplied by a trusted host projection; never inferred by the card. */
  senVerified?: boolean;
  /** This world's own optional motion cover clip; never use another world's clip as fallback. */
  videoUrl?: string;
  /** Optional, viewer-authorized information for the format icon's story panel. */
  synopsis?: string;
  tags?: readonly string[];
  activityStatus?: WorldActivityStatus;
  /** Creator's branching permission, supplied by the host. Omission means unknown. */
  branchingEnabled?: boolean;
}
export interface LightNovelsHomeProps {
  active?: boolean;
  worlds: readonly HomeWorld[];
  onCreateStory: () => void;
  onOpenWorld: (id: string) => void;
  /** What the list says while it has no worlds. Without it, Home keeps the catalog's wording. */
  emptyState?: { title: string; description: string };
  /**
   * Worlds the Featured hero cycles through after Featured Ascension, each as a Feature card.
   * Without them, Featured Ascension stands alone.
   */
  featuredWorlds?: readonly HomeWorld[];
  children?: ReactNode;
}

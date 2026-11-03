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
  /**
   * The story's original language (BCP 47, e.g. `ja`, `zh-CN`), which is also the language of
   * `title`. Omit when unknown: cards then show the title as written, with no language tag.
   */
  originalLanguage?: string;
  /** Real translations of the title (the creator's own, or made for reading), by language. Never machine-made for a card. */
  titleTranslations?: Readonly<Record<string, string>>;
  /** The language the creator's name is written in, so it gets the right lettering. Names are never translated. */
  creatorLanguage?: string;
  /** Host-resolved creator lettering; the card never infers an element from the name or world. */
  creatorTitle?: { element: ElementalTitleEffect; intensity?: ElementalTitleIntensity; color?: string };
  /** Host-reported progress for a publicly visible world; omit when unknown. */
  publicationStatus?: 'ongoing' | 'completed';
  /** Official SEN verification, supplied by a trusted host projection; never inferred by the card. */
  senVerified?: boolean;
  /** This world's own optional motion cover clip; never use another world's clip as fallback. */
  videoUrl?: string;
  /**
   * This world's own wide (16:9) hero still and silent loop for the Feature card. The card
   * falls back to the cover and its motion cover clip; never use another world's hero.
   */
  heroImageUrl?: string;
  heroVideoUrl?: string;
  /** Optional, viewer-authorized information for the format icon's story panel. */
  synopsis?: string;
  tags?: readonly string[];
  activityStatus?: WorldActivityStatus;
  /** Creator's branching permission, supplied by the host. Omission means unknown. */
  branchingEnabled?: boolean;
}
/** A themed Home event; dates and availability are supplied by the host. */
export interface HomeEvent {
  id: string;
  title: string;
  description: string;
  when?: string;
  imageUrl?: string;
}
export interface LightNovelsHomeProps {
  events?: readonly HomeEvent[];
  active?: boolean;
  worlds: readonly HomeWorld[];
  onCreateStory: () => void;
  onOpenWorld: (id: string) => void;
  /** The worlds in the order shown (after sorting and filtering), for spoken codes: N1 is the first. */
  onVisibleWorldsChange?: (ids: readonly string[]) => void;
  /** What the list says while it has no worlds. Without it, Home keeps the catalog's wording. */
  emptyState?: { title: string; description: string };
  /**
   * Worlds the Featured hero cycles through after Featured Ascension, each as a Feature card.
   * Without them, Featured Ascension stands alone.
   */
  featuredWorlds?: readonly HomeWorld[];
  children?: ReactNode;
}

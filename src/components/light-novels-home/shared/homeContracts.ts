import type { ReactNode } from 'react';
import type { ElementalTitleEffect, ElementalTitleIntensity } from '@seihouse/ui';
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
  /** This world's own optional motion cover clip; never use another world's clip as fallback. */
  videoUrl?: string;
}
export interface LightNovelsHomeProps {
  active?: boolean;
  worlds: readonly HomeWorld[];
  onCreateStory: () => void;
  onOpenWorld: (id: string) => void;
  children?: ReactNode;
}

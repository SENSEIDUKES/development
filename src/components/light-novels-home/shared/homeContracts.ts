import type { ReactNode } from 'react';
/** Display data only; account acquisition and story opening remain host actions. */
export interface HomeWorld {
  id: string; title: string; genre: string; createdAt: string; reads: number;
  imageUrl: string; chapterCount: number; chapterWritingStyle?: string;
  mcName: string; powerStage: string; acquired?: boolean; recentlyRead?: boolean; draft?: boolean;
}
export interface LightNovelsHomeProps {
  active?: boolean;
  worlds: readonly HomeWorld[];
  onCreateStory: () => void;
  onOpenWorld: (id: string) => void;
  children?: ReactNode;
}

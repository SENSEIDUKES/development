import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import type { WorldExpansionPreview } from '../../light-novels-home/development/WorldExpressions';
import type { CreatorWorld } from '../../creator-space/shared/creatorSpaceContracts';

/**
 * One world, four sizes. Each variant reads the display data its host page
 * already supplies — no new world model is introduced here.
 */

/** Info page: the full world overview shown when a reader opens a world. */
export interface WorldCardInfoProps {
  story: StoryDetailDisplay;
  onRead?: () => void;
  onOpenCodex?: () => void;
  onOpenTimeline?: () => void;
}

/** Full card: the 2:3 discovery card on Home. */
export interface WorldCardFullProps {
  world: HomeWorld;
  expansions?: readonly WorldExpansionPreview[];
  onOpen: () => void;
}

/** Compact card: the creator's world tile on Create. */
export interface WorldCardCompactProps {
  world: CreatorWorld;
  /** Resolved art; the host picks a fallback for worlds with no cover yet. */
  cover?: string;
  /** True when `cover` is host fallback art rather than the world's own. */
  fallbackCover?: boolean;
  selected?: boolean;
  onSelect: () => void;
}

/** Mini card: a single row, sized like an audio-player track. */
export interface WorldCardMiniProps {
  title: string;
  imageUrl?: string;
  /** One muted line under the title, e.g. "Ch. 24 · Xianxia". */
  meta: string;
  onOpen?: () => void;
  /** Label for the round trailing action; the action shows only with `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
}

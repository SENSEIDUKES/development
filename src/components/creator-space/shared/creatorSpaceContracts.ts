import type { EnergyAccountState } from '../../energy/shared/useEnergyAccount';

/**
 * Where a world stands, as the host reports it. Library only labels it:
 * `complete` means the story reached its ending and takes no new chapters.
 */
export type CreatorWorldStatus = 'draft' | 'shared' | 'public' | 'complete';

/** Display data for one of the creator's worlds; story truth stays with the host. */
export interface CreatorWorld {
  id: string;
  title: string;
  chapterCount: number;
  status: CreatorWorldStatus;
  /** ISO time of the last change; the most recent world is selected first. */
  updatedAt: string;
  /** Cover art. Without it the page shows the Library's own celestial art. */
  imageUrl?: string;
}

/** The host's read of the creator's worlds, including its request lifecycle. */
export type CreatorWorldsState =
  | { status: 'loading' }
  | { status: 'ready'; items: readonly CreatorWorld[] }
  | { status: 'error'; error: string };

/** A pack or plugin shown as a preview; the browser/marketplace is not open yet. */
export interface CreatorToolkitItem {
  id: string;
  title: string;
  description: string;
  kind: 'style' | 'soundscape';
  imageUrl?: string;
}

export interface CreatorSpaceProps {
  worlds: CreatorWorldsState;
  /** The Energy read from `useEnergyAccount`; the page never computes a balance. */
  energy: Pick<EnergyAccountState, 'status' | 'snapshot'>;
  toolkit: readonly CreatorToolkitItem[];
  /** Opens the existing Story Seed creation flow. */
  onCreate: () => void;
  /** Opens the Energy page. Omit it and the Energy tile is a plain reading. */
  onOpenEnergy?: () => void;
  /** Continue writing the world: its chapter workspace, ready for the next chapter. */
  onContinueWorld: (worldId: string) => void;
  /** The world's full Studio workspace. */
  onOpenStudio: (worldId: string) => void;
  /** Opens a pack/plugin browser. Omit it while none exists; the page says so honestly. */
  onBrowseToolkit?: () => void;
  /** Re-reads the worlds after an error. */
  onRetryWorlds?: () => void;
}

import type { ReactNode } from 'react';
import type { HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import type { ElementalTitleEffect, ElementalTitleIntensity } from '@seihouse/ui';
import type { MediaPack } from '../../../library/media/mediaPacks';
import type { SkillPackageIntake } from '../../../library/stories/settings/SkillPackageImport';
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
  /** Known story format for its Info cover; leave absent when the source has not supplied one. */
  format?: string;
  /** Host-supplied creator lettering for the World Card; absent when unknown. */
  creatorName?: string;
  creatorTitle?: { element: ElementalTitleEffect; intensity?: ElementalTitleIntensity; color?: string };
  /** The World Card caption's genre, as on Home's card; absent when unknown. */
  genre?: string;
  /** The creator's branching permission; the caption shows Branching only when true. */
  branchingEnabled?: boolean;
  /** Optional information for the format mark's story dialog. */
  synopsis?: string;
  tags?: readonly string[];
}

/** The host's read of the creator's worlds, including its request lifecycle. */
export type CreatorWorldsState =
  | { status: 'loading' }
  | { status: 'ready'; items: readonly CreatorWorld[] }
  | { status: 'error'; error: string };

export type CreatorToolkitKind = 'style' | 'soundscape' | 'cue' | 'atmosphere';
export type CreatorToolkitFilter = 'all' | CreatorToolkitKind;

/** A pack or plugin card shown in the Creator Toolkit section on Create. */
export interface CreatorToolkitItem {
  id: string;
  title: string;
  description: string;
  kind: CreatorToolkitKind;
  imageUrl?: string;
}

/** An individual score, cue recording, atmosphere bed, or style guide inside an `.spp` package. */
export interface CreatorPluginFile {
  id: string;
  title: string;
  /** Short badge or trigger word, e.g. sound word ("dark chant") or scene word ("gentle rain"). */
  badge?: string;
  /** Tags, tradition, or description for this file. */
  detail?: string;
}

/** A mood, category, or weather group inside a parent `.spp` package. */
export interface CreatorPluginGroup {
  id: string;
  label: string;
  files: readonly CreatorPluginFile[];
}

/** A parent `.spp` package (built-in or user-installed) shown first in Creator Plugins. */
export interface CreatorPluginPackage {
  id: string;
  kind: CreatorToolkitKind;
  title: string;
  description: string;
  version: string;
  builtIn?: boolean;
  unitSingular: string;
  unitPlural: string;
  groups: readonly CreatorPluginGroup[];
}

/** Host-supplied `.spp` package inventory for the Creator Plugins view. */
export interface CreatorPluginCatalog {
  packages: readonly CreatorPluginPackage[];
}

export interface CreatorPluginsProps {
  catalog: CreatorPluginCatalog;
  initialFilter?: CreatorToolkitFilter;
  onFilterChange?: (filter: CreatorToolkitFilter) => void;
  /** Optional controlled open `.spp` package ID (e.g. from URL query). */
  selectedPackId?: string | null;
  onSelectPack?: (packId: string | null) => void;
  onBack: () => void;
  /** Installs a Soundscape, Sound Cue or Atmosphere `.spp` package on this device. */
  onImportMediaPack?: (file: Blob) => Promise<MediaPack>;
  /** Inspects and installs a CAPA skill `.spp` package on this device. */
  skillIntake?: SkillPackageIntake;
  onInstallSkill?: (skill: HarnessSkillManifest) => void | Promise<void>;
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
  /** Opens the selected world's Info page. */
  onOpenWorld: (world: CreatorWorld) => void;
  /** The world's full Studio workspace. */
  onOpenStudio: (worldId: string) => void;
  /** Opens the plugin browser, optionally focused on one clicked plugin kind. */
  onBrowseToolkit?: (kind?: CreatorToolkitKind) => void;
  /** Re-reads the worlds after an error. */
  onRetryWorlds?: () => void;
  /** The host's Sparks button (SEN: `SparksButton`), beside the page title. */
  sparks?: ReactNode;
}

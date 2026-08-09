import { ReaderChapter } from '../../shared/types';

export interface ChapterNavigationState {
  selectedChapterNum: number;
  maxChapterNum: number;
  navigatePrev: () => void;
  navigateNext: () => void;
  onSwitchTab?: (tab: "reader" | "codex" | "memory" | "alter-fate") => void;
}

export interface PlaybackState {
  isPlayingText: boolean;
  isPausedText: boolean;
  handleTogglePlayback: () => void;
  readerMode: string;
  playerStyle?: "vinyl" | "minimal" | "ethereal";
}

export interface AudioSettings {
  speechRate: number;
  setSpeechRate: React.Dispatch<React.SetStateAction<number>>;
  availableVoices: any[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (uri: string) => void;
  selectedDialogueVoiceURI: string;
  setSelectedDialogueVoiceURI: (uri: string) => void;
  selectedSideVoiceURI: string;
  setSelectedSideVoiceURI: (uri: string) => void;
}

export interface ImmersionPreferences {
  immersion: any;
  setImmersion: (settings: any) => void;
}

/**
 * The Comments entry reuses the Chronicle Anchors (bookmarks) panel until the
 * full comments system replaces it — `open`/`onToggle` drive that same drawer
 * and `count` carries the anchor badge.
 */
export interface CommentsControl {
  open: boolean;
  count: number;
  onToggle: () => void;
}

/**
 * Alter Fate lives on its own reader tab now, switched via `onSwitchTab`
 * (see `ChapterNavigationState`) — this just controls the bottom-bar entry
 * button's enabled/disabled state and tooltip.
 */
export interface AlterFateControl {
  enabled: boolean;
  lockMessage?: string | null;
  onOpen: () => void;
}

export interface ReaderControlsProps {
  selectedChapter: ReaderChapter;
  navigation: ChapterNavigationState;
  playback: PlaybackState;
  comments: CommentsControl;
  alterFate?: AlterFateControl;
}

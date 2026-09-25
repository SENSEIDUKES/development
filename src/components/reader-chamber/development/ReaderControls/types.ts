import { ReaderChapter } from '../../../../narrative/story';

export interface ChapterNavigationState {
  selectedChapterNum: number;
  maxChapterNum: number;
  navigatePrev: () => void;
  navigateNext: () => void;
  onSwitchTab?: (tab: "reader" | "codex" | "memory") => void;
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
 * The Mind Palace entry — `open`/`onToggle` drive the drawer of passages the
 * reader kept, and `count` carries their badge. (Named `comments` for the
 * earlier placeholder use of this bottom-bar slot.)
 */
export interface CommentsControl {
  open: boolean;
  count: number;
  onToggle: () => void;
}

export interface ReaderControlsProps {
  selectedChapter: ReaderChapter;
  navigation: ChapterNavigationState;
  playback: PlaybackState;
  comments: CommentsControl;
}

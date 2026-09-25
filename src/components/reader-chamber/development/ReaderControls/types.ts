import { ReaderChapter } from '../../../../narrative/story';

/**
 * What Next does at the newest chapter, when the host offers something there:
 * for example writing the next chapter, or asking the reader to direct it first.
 */
export interface ReaderContinueAction {
  /** The action in a few words, such as "Write Chapter 4". */
  label: string;
  /** The action is running; Next waits for it. */
  busy?: boolean;
  /** Why the last attempt did not work. */
  error?: string;
  /** Runs the action. Resolves the chapter to open when one is ready. */
  onContinue: () => Promise<number | undefined> | void;
}

export interface ChapterNavigationState {
  selectedChapterNum: number;
  maxChapterNum: number;
  navigatePrev: () => void;
  navigateNext: () => void;
  /** Next's action at the newest chapter. Without one, Next stops there. */
  continueAfterLatest?: ReaderContinueAction;
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

import { createContext, useContext, type PropsWithChildren } from 'react';
export interface NarrativeAudioRequest {
  id: string;
  source: string;
  title?: string;
  artist?: string;
}

export type NarrativeAudioPlaybackEvent =
  | { type: 'track-change'; trackId: string | null }
  | { type: 'play'; trackId: string }
  | { type: 'pause'; trackId: string | null }
  | { type: 'queue-end' }
  | { type: 'error'; trackId: string | null; error: string };

export interface NarrativeAudioPlayback {
  autoplayBlocked: boolean;
  currentSource: string | null;
  currentTrackId: string | null;
  errorMessage: string;
  hasError: boolean;
  isBuffering: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  volume: number;
  load: (request: NarrativeAudioRequest) => void;
  pause: () => void;
  play: (request?: NarrativeAudioRequest) => void;
  /** Replace the shared queue and play one user-requested source immediately. */
  replace: (request: NarrativeAudioRequest) => void;
  /** Restart the current shared track from the beginning after a user gesture. */
  restart: (trackId: string) => boolean;
  setVolume: (volume: number) => void;
  stop: (trackId?: string) => void;
  subscribe: (handler: (event: NarrativeAudioPlaybackEvent) => void) => () => void;
  subscribeToTrackChange: (handler: (trackId: string | null) => void) => () => void;
  subscribeToQueueEnd: (handler: () => void) => () => void;
  toggleMute: () => void;
}

const NarrativeAudioPlaybackContext = createContext<NarrativeAudioPlayback | null>(null);


export function NarrativeAudioProvider({ value, children }: PropsWithChildren<{ value: NarrativeAudioPlayback }>) {
  return <NarrativeAudioPlaybackContext.Provider value={value}>{children}</NarrativeAudioPlaybackContext.Provider>;
}
export function useNarrativeAudio() {
  const value = useContext(NarrativeAudioPlaybackContext);
  if (!value) throw new Error('Audio surfaces require a host NarrativeAudioProvider.');
  return value;
}
/** For surfaces whose audio is an enhancement: `null` when the host supplies no provider. */
export function useOptionalNarrativeAudio() {
  return useContext(NarrativeAudioPlaybackContext);
}

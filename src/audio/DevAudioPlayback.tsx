import {
  AudioSessionProvider,
  type Track,
  useAudioSession,
} from '@seihouse/audio-player';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import '@seihouse/audio-player/styles.css';

export interface DevAudioRequest {
  id: string;
  source: string;
  title?: string;
  artist?: string;
}

export interface DevAudioPlayback {
  currentSource: string | null;
  currentTrackId: string | null;
  isMuted: boolean;
  isPlaying: boolean;
  volume: number;
  load: (request: DevAudioRequest) => void;
  pause: () => void;
  play: (request?: DevAudioRequest) => void;
  setVolume: (volume: number) => void;
  stop: (trackId?: string) => void;
  toggleMute: () => void;
}

const DevAudioPlaybackContext = createContext<DevAudioPlayback | null>(null);

const toTrack = (request: DevAudioRequest): Track => ({
  id: request.id,
  title: request.title ?? 'DEV audio',
  artist: request.artist ?? 'SEN Development',
  audioFile: request.source,
});

function DevAudioPlaybackBridge({ children }: PropsWithChildren) {
  const session = useAudioSession();

  const load = useCallback((request: DevAudioRequest) => {
    session.setQueue([toTrack(request)]);
  }, [session]);

  const play = useCallback((request?: DevAudioRequest) => {
    if (request) {
      session.playNow(toTrack(request));
      return;
    }
    void session.play();
  }, [session]);

  const stop = useCallback((trackId?: string) => {
    if (trackId && session.currentTrack?.id !== trackId) return;
    session.pause();
    session.seek(0);
  }, [session]);

  const value = useMemo<DevAudioPlayback>(() => ({
    currentSource: session.currentTrack?.audioFile ?? null,
    currentTrackId: session.currentTrack?.id ?? null,
    isMuted: session.isMuted,
    isPlaying: session.isPlaying,
    volume: session.volume,
    load,
    pause: session.pause,
    play,
    setVolume: session.setVolume,
    stop,
    toggleMute: session.toggleMute,
  }), [load, play, session, stop]);

  return (
    <DevAudioPlaybackContext.Provider value={value}>
      {children}
    </DevAudioPlaybackContext.Provider>
  );
}

/**
 * DEV's one playback boundary. The package owns the only app-wide media
 * element; callers keep their existing sources and controls through the hook.
 */
export function DevAudioPlaybackProvider({ children }: PropsWithChildren) {
  return (
    <AudioSessionProvider initialQueue={[]}>
      <DevAudioPlaybackBridge>{children}</DevAudioPlaybackBridge>
    </AudioSessionProvider>
  );
}

export function useDevAudioPlayback() {
  const context = useContext(DevAudioPlaybackContext);
  if (!context) {
    throw new Error('useDevAudioPlayback must be used within DevAudioPlaybackProvider');
  }
  return context;
}

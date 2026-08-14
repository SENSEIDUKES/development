import type { WorldCardEvent } from '../../reader-chamber/shared/types';
import type {
  WorldEntityCardAudioAdapter,
  WorldEntityCardAudioAsset,
  WorldEntityCardPlayback,
} from '../../reader-chamber/development/WorldEntityCard';
import type { AudioPreviewState } from './types';

/**
 * Minimal surface the adapter needs from the real DEV audio player
 * (`@seihouse/audio-player` via `useDevAudioPlayback`). Tests inject a
 * vi.fn() stand-in so the workshop exercises the production call sites
 * without depending on a live audio element.
 */
export interface DevAudioPlayerBridge {
  readonly currentTrackId: string | null;
  readonly isPlaying: boolean;
  play: (request: { id: string; source: string; title?: string }) => void;
  stop: (trackId?: string) => void;
  subscribeToTrackChange: (handler: (trackId: string | null) => void) => () => void;
  subscribeToQueueEnd: (handler: () => void) => () => void;
}

export interface CardWorkshopAudioAdapterOptions {
  state: AudioPreviewState;
  muted: boolean;
  /**
   * Map a card to the playable source URL the real player should use. The
   * workshop has no curated SFX catalog, so the same published Library
   * Help narration that backs the audio-player smoke workspace is reused
   * here. Returning `null` keeps the card on the local-only mock path.
   */
  resolveSource: (asset: WorldEntityCardAudioAsset) => string | null;
  /**
   * The real DEV audio player when the adapter is used inside the
   * workshop. Pass `null` (the default) to keep the deterministic local
   * timer-based mock used by the existing component test.
   */
  player?: DevAudioPlayerBridge | null;
}

export interface CardWorkshopAudioAdapter extends WorldEntityCardAudioAdapter {
  dispose: () => void;
}

export const CARD_WORKSHOP_FALLBACK_PLAYBACK_MS = 900;

/**
 * Card Workshop audio adapter.
 *
 * - With a `player`, playback and its ending lifecycle are delegated to DEV's
 *   shared `@seihouse/audio-player` session (the same one used by the
 *   audio-player smoke workspace and `useCodexVoiceCards`).
 * - Without a `player`, the adapter stays a fully local, deterministic
 *   mock so the workshop's component test keeps asserting the same
 *   loading / playing / muted / unavailable states without touching
 *   media playback.
 */
export function createCardWorkshopAudioAdapter({
  state,
  muted,
  resolveSource,
  player = null,
}: CardWorkshopAudioAdapterOptions): CardWorkshopAudioAdapter {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let activePlayerTrackId: string | null = null;
  let stopObservingTrackChange: (() => void) | null = null;
  let stopObservingPlayer: (() => void) | null = null;

  const stopObservingPlayerLifecycle = () => {
    stopObservingTrackChange?.();
    stopObservingTrackChange = null;
    stopObservingPlayer?.();
    stopObservingPlayer = null;
  };

  const clearTimer = (assetId: string) => {
    const existing = timers.get(assetId);
    if (!existing) return;
    clearTimeout(existing);
    timers.delete(assetId);
  };

  const resolve = (card: WorldCardEvent): WorldEntityCardAudioAsset | null => {
    if (state === 'unavailable' || !card.sound?.assetId) return null;
    return {
      id: `card-workshop-${card.sound.assetId}`,
      title: `${card.entityName} local preview`,
    };
  };

  const play = async (asset: WorldEntityCardAudioAsset): Promise<WorldEntityCardPlayback> => {
    if (state === 'loading') {
      return new Promise<WorldEntityCardPlayback>(() => undefined);
    }

    const source = player ? resolveSource(asset) : null;
    const usesSharedPlayer = Boolean(player && source);
    let onended: (() => void) | undefined;
    const playback: WorldEntityCardPlayback = {};
    Object.defineProperty(playback, 'onended', {
      configurable: true,
      get: () => onended,
      set: (callback: (() => void) | undefined) => {
        onended = callback;
        if (usesSharedPlayer || state !== 'available' || !callback) return;
        clearTimer(asset.id);
        const timer = setTimeout(() => {
          timers.delete(asset.id);
          callback();
        }, CARD_WORKSHOP_FALLBACK_PLAYBACK_MS);
        timers.set(asset.id, timer);
      },
    });

    if (player && source) {
      stopObservingPlayerLifecycle();
      activePlayerTrackId = asset.id;
      stopObservingTrackChange = player.subscribeToTrackChange((trackId) => {
        if (activePlayerTrackId !== asset.id || trackId === asset.id) return;
        activePlayerTrackId = null;
        stopObservingPlayerLifecycle();
      });
      stopObservingPlayer = player.subscribeToQueueEnd(() => {
        if (activePlayerTrackId !== asset.id) return;
        activePlayerTrackId = null;
        stopObservingPlayerLifecycle();
        playback.onended?.();
      });
      player.play({
        id: asset.id,
        source,
        title: asset.title ?? 'Card Workshop preview',
      });
    }

    return playback;
  };

  const stop = (assetId?: string) => {
    if (!assetId) return;
    clearTimer(assetId);
    if (player && activePlayerTrackId === assetId) {
      player.stop(assetId);
      activePlayerTrackId = null;
      stopObservingPlayerLifecycle();
    }
  };

  const dispose = () => {
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    if (player && activePlayerTrackId) {
      player.stop(activePlayerTrackId);
      activePlayerTrackId = null;
    }
    stopObservingPlayerLifecycle();
  };

  return {
    resolve,
    play,
    stop,
    effectiveVolume: () => (muted ? 0 : 0.64),
    isAudible: () => !muted,
    dispose,
  };
}

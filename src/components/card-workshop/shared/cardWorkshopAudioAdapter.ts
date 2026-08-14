import type { WorldCardEvent } from '../../reader-chamber/shared/types';
import type {
  WorldEntityCardAudioAdapter,
  WorldEntityCardAudioAsset,
  WorldEntityCardPlayback,
} from '../../reader-chamber/development/WorldEntityCard';
import type { AudioPreviewState } from './types';

const LOCAL_PLAYBACK_MS = 900;

export interface CardWorkshopAudioAdapter extends WorldEntityCardAudioAdapter {
  dispose: () => void;
}

/**
 * Deterministic Card Workshop audio. It resolves semantic fixture hints and
 * simulates lifecycle state without creating an Audio element or requesting media.
 */
export function createCardWorkshopAudioAdapter(
  state: AudioPreviewState,
  muted: boolean,
): CardWorkshopAudioAdapter {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

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

    let onended: (() => void) | undefined;
    const playback: WorldEntityCardPlayback = {};
    Object.defineProperty(playback, 'onended', {
      configurable: true,
      get: () => onended,
      set: (callback: (() => void) | undefined) => {
        onended = callback;
        if (state !== 'available' || !callback) return;
        const existingTimer = timers.get(asset.id);
        if (existingTimer) clearTimeout(existingTimer);
        const timer = setTimeout(() => {
          timers.delete(asset.id);
          callback();
        }, LOCAL_PLAYBACK_MS);
        timers.set(asset.id, timer);
      },
    });
    return playback;
  };

  const stop = (assetId?: string) => {
    if (!assetId) return;
    const timer = timers.get(assetId);
    if (!timer) return;
    clearTimeout(timer);
    timers.delete(assetId);
  };

  const dispose = () => {
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
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

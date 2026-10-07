import { useEffect, useState } from 'react';
import {
  AudioChannelId,
  AudioChannelSettings,
  AudioMixSettings,
  getAudioMixSettings,
  setAudioChannel,
  subscribeAudioMix,
} from '../../lib/audio/audioMixSettings';

/**
 * React binding for the central audio mix: every component using this hook
 * sees the same four channels and stays in sync when any of them changes the
 * mix (header widget, immersion menu, playback engines).
 */
export function useAudioMix() {
  const [mix, setMix] = useState<AudioMixSettings>(() => getAudioMixSettings());

  useEffect(() => subscribeAudioMix(setMix), []);

  const setChannel = (channel: AudioChannelId, patch: Partial<AudioChannelSettings>) => {
    setAudioChannel(channel, patch);
  };

  return { mix, setChannel };
}

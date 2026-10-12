import { useCallback, useMemo, useRef, useState } from 'react';
import type { SoundWordsPreset } from '@seihouse/sen/audio';
import { inspectSoundWordsSpp, LIBRARY_SOUND_WORDS_PRESET, loadSoundWordsPresets, saveSoundWordsPreset } from './soundWordPacks';

type PresetStorage = Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage = (): PresetStorage | undefined => {
  try { return globalThis.localStorage ?? undefined; } catch { return undefined; }
};

/**
 * A host's Sound Words presets for Story Settings: the Library's own first
 * (a new story starts from it), then those installed from `.spp` packages on
 * this device under the host's own key. A device that refuses storage keeps
 * an import for the visit.
 */
export function useSoundWordsPresets(key: string, storage: PresetStorage | undefined = browserStorage()): {
  presets: SoundWordsPreset[];
  importPack: (file: Blob) => Promise<SoundWordsPreset>;
} {
  const [installed, setInstalled] = useState<SoundWordsPreset[]>(() => storage ? loadSoundWordsPresets(storage, key) : []);
  const current = useRef(installed);
  current.current = installed;
  const importPack = useCallback(async (file: Blob) => {
    const preset = await inspectSoundWordsSpp(file);
    const visit = { setItem: () => undefined };
    let next: SoundWordsPreset[];
    try {
      next = saveSoundWordsPreset(storage ?? visit, key, current.current, preset);
    } catch (error) {
      // A refused write keeps the preset for this visit; a refused package stays refused.
      if (!(error instanceof DOMException)) throw error;
      next = saveSoundWordsPreset(visit, key, current.current, preset);
    }
    current.current = next;
    setInstalled(next);
    return preset;
  }, [key, storage]);
  const presets = useMemo(() => [LIBRARY_SOUND_WORDS_PRESET, ...installed], [installed]);
  return { presets, importPack };
}

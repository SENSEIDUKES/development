import { useMemo } from 'react';
import type { UserProfileServices } from '@seihouse/library/profile';
import { mediaPackKey } from '@seihouse/library/media';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { useMenuMusicPack } from '@seihouse/library/shell';
import type { useDeviceMediaPacks } from './useDeviceMediaPacks';
import { MENU_MUSIC_LABEL } from './menuMusicCatalog';

/** Both first-party hosts equip menu music through their existing media store. */
export function useMenuMusicSlot(storage: ReaderPreferenceStorage, media: ReturnType<typeof useDeviceMediaPacks>) {
  const [selectedKey, select] = useMenuMusicPack(storage);
  const packs = media.menuMusicPacks;
  const slot = useMemo<NonNullable<UserProfileServices['menuMusic']>>(() => ({
    packs, selectedKey, defaultLabel: MENU_MUSIC_LABEL, onChange: select,
    onImport: async (file: File) => {
      const { pack } = await media.importPack(file, 'menu-music');
      select(mediaPackKey(pack));
    },
  }), [packs, selectedKey, select, media.importPack]);
  return { slot, pieces: packs.find(pack => mediaPackKey(pack) === selectedKey)?.entries };
}

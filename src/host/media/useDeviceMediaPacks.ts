import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mediaPackKey, type MediaPack, type MediaPackEntitlement, type SoundscapePack } from '@seihouse/library/media';
import { deviceMediaPackEntitlement, inspectMediaPackSpp, inspectMenuMusicSpp, type DeviceMediaPackStore, type DeviceMediaUrls } from './deviceMediaPacks';

interface Installed { pack: MediaPack; installedAt: string; usage?: 'menu-music' }
const systemNow = () => new Date();

/**
 * A host's own media packs, installed from `.spp` packages and kept on this
 * device: the packs to register, the reader's unlocks for them (a pack you
 * installed is yours), and the installer. Their recordings play through
 * `urls`. A package version is installed once: the same version with other
 * recordings is refused.
 */
export function useDeviceMediaPacks(store: DeviceMediaPackStore, urls: DeviceMediaUrls, now: () => Date = systemNow): {
  packs: MediaPack[];
  /** Songs offered in menus, including menu-only imports kept outside the story registry. */
  menuMusicPacks: SoundscapePack[];
  entitlements: MediaPackEntitlement[];
  importPack: (file: Blob, usage?: 'menu-music') => Promise<{ pack: MediaPack; entitlement: MediaPackEntitlement }>;
} {
  const [installed, setInstalled] = useState<Installed[]>([]);
  const current = useRef(installed);
  current.current = installed;
  useEffect(() => {
    let active = true;
    void store.loadAll().then(saved => {
      if (!active) return;
      for (const entry of saved) urls.register(entry.files);
      // A pack installed while the device was still opening its packs stays.
      setInstalled(previous => [...saved.filter(entry => !previous.some(item => mediaPackKey(item.pack) === mediaPackKey(entry.pack))).map(({ pack, installedAt, usage }) => ({ pack, installedAt, usage })), ...previous]);
    }, () => undefined);
    return () => { active = false; };
  }, [store, urls]);

  const importPack = useCallback(async (file: Blob, usage?: 'menu-music') => {
    const packaged = await (usage === 'menu-music' ? inspectMenuMusicSpp(file) : inspectMediaPackSpp(file));
    const key = mediaPackKey(packaged.pack);
    const previous = current.current.find(entry => mediaPackKey(entry.pack) === key);
    if (previous) {
      if (previous.pack.source.digest !== packaged.pack.source.digest) {
        throw new Error('This package version is already installed with different recordings. Import a new package version.');
      }
      // A menu-only pack joins the story registry only when explicitly imported there.
      if (previous.usage === 'menu-music' && usage !== 'menu-music') {
        await store.save(packaged, previous.installedAt);
        const next = current.current.map(entry => mediaPackKey(entry.pack) === key ? { ...entry, usage: undefined } : entry);
        current.current = next;
        setInstalled(next);
      }
      return { pack: previous.pack, entitlement: deviceMediaPackEntitlement(previous.pack, previous.installedAt) };
    }
    const installedAt = now().toISOString();
    await store.save(packaged, installedAt, usage);
    urls.register(packaged.files);
    const next = [...current.current, { pack: packaged.pack, installedAt, usage }];
    current.current = next;
    setInstalled(next);
    return { pack: packaged.pack, entitlement: deviceMediaPackEntitlement(packaged.pack, installedAt) };
  }, [store, urls, now]);

  const storyPacks = useMemo(() => installed.filter(entry => entry.usage !== 'menu-music'), [installed]);
  const packs = useMemo(() => storyPacks.map(entry => entry.pack), [storyPacks]);
  const entitlements = useMemo(() => storyPacks.map(entry => deviceMediaPackEntitlement(entry.pack, entry.installedAt)), [storyPacks]);
  const menuMusicPacks = useMemo(() => installed.map(entry => entry.pack).filter((pack): pack is SoundscapePack => pack.type === 'soundscape'), [installed]);
  return { packs, menuMusicPacks, entitlements, importPack };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mediaPackKey, type MediaPack, type MediaPackEntitlement } from '@seihouse/library/media';
import { deviceMediaPackEntitlement, inspectMediaPackSpp, type DeviceMediaPackStore, type DeviceMediaUrls } from './deviceMediaPacks';

interface Installed { pack: MediaPack; installedAt: string }
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
  entitlements: MediaPackEntitlement[];
  importPack: (file: Blob) => Promise<{ pack: MediaPack; entitlement: MediaPackEntitlement }>;
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
      setInstalled(previous => [...saved.filter(entry => !previous.some(item => mediaPackKey(item.pack) === mediaPackKey(entry.pack))).map(({ pack, installedAt }) => ({ pack, installedAt })), ...previous]);
    }, () => undefined);
    return () => { active = false; };
  }, [store, urls]);

  const importPack = useCallback(async (file: Blob) => {
    const packaged = await inspectMediaPackSpp(file);
    const key = mediaPackKey(packaged.pack);
    const previous = current.current.find(entry => mediaPackKey(entry.pack) === key);
    if (previous) {
      if (previous.pack.source.digest !== packaged.pack.source.digest) {
        throw new Error('This package version is already installed with different recordings. Import a new package version.');
      }
      return { pack: previous.pack, entitlement: deviceMediaPackEntitlement(previous.pack, previous.installedAt) };
    }
    const installedAt = now().toISOString();
    await store.save(packaged, installedAt);
    urls.register(packaged.files);
    const next = [...current.current, { pack: packaged.pack, installedAt }];
    current.current = next;
    setInstalled(next);
    return { pack: packaged.pack, entitlement: deviceMediaPackEntitlement(packaged.pack, installedAt) };
  }, [store, urls, now]);

  const packs = useMemo(() => installed.map(entry => entry.pack), [installed]);
  const entitlements = useMemo(() => installed.map(entry => deviceMediaPackEntitlement(entry.pack, entry.installedAt)), [installed]);
  return { packs, entitlements, importPack };
}

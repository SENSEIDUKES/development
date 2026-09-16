import type { PackContent } from 'seihouse-productions-package';
import {
  createRegisteredMediaPackCatalog,
  mediaPackKey,
  validateMediaPack,
  type MediaPack,
} from '@seihouse/sen/audio';

export const SPP_MEDIA_PACK_STORAGE_KEY = 'seihouse.harness.media-packs.v1';
export const SPP_MEDIA_CATALOG_BYTE_LIMIT = 2 * 1024 * 1024;

/**
 * Read one explicitly selected JSON catalog from already-validated SPP intake.
 * No filename is required or auto-selected; source provenance comes from the
 * validated manifest record rather than package-authored JSON.
 */
export function readHarnessSppMediaPack(content: PackContent, path: string): MediaPack {
  const record = content.manifest.files.find(file => file.path === path);
  const bytes = content.assets.get(path);
  if (!record || !bytes) throw new Error('Select a catalog file from this validated package.');
  if (record.mediaType !== 'application/json') throw new Error('Only an explicitly selected JSON file can become a Media Pack catalog.');
  if (bytes.length > SPP_MEDIA_CATALOG_BYTE_LIMIT) throw new Error('Select a Media Pack catalog no larger than 2 MiB.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('The selected Media Pack catalog is not readable UTF-8 JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The selected Media Pack catalog must be a data object.');
  if ('source' in parsed) throw new Error('Media Pack source provenance is assigned from validated SPP intake, not package-authored JSON.');
  return validateMediaPack({
    ...parsed,
    source: { path, digest: record.sha256 },
  });
}

export function loadHarnessSppMediaPacks(storage: Pick<Storage, 'getItem'>): MediaPack[] {
  const value: unknown = JSON.parse(storage.getItem(SPP_MEDIA_PACK_STORAGE_KEY) ?? '[]');
  if (!Array.isArray(value) || value.length > 32) throw new Error('The saved Media Pack inventory is invalid.');
  return [...createRegisteredMediaPackCatalog(value).values()];
}

export function saveHarnessSppMediaPack(
  storage: Pick<Storage, 'setItem'>,
  registered: MediaPack[],
  pack: MediaPack,
): MediaPack[] {
  const validated = validateMediaPack(pack);
  const existing = registered.find(item => mediaPackKey(item) === mediaPackKey(validated));
  if (existing && JSON.stringify(existing) !== JSON.stringify(validated)) {
    throw new Error('This Media Pack version is already registered with different content. Register a new version.');
  }
  const next = existing ? registered : [...registered, validated];
  if (next.length > 32) throw new Error('The local Media Pack inventory is full.');
  createRegisteredMediaPackCatalog(next);
  storage.setItem(SPP_MEDIA_PACK_STORAGE_KEY, JSON.stringify(next));
  return next;
}

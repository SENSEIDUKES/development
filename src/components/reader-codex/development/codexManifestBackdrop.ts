/**
 * codexManifestBackdrop.ts — the Workshop Manifest backdrop pool: the five
 * production "IMMORTAL LAND" revelation landscapes, downloaded from
 * `lines.seihouse.org/LIBRARY/images/MANFEST/` into `public/manifest-backdrops/`
 * so Codex surfaces render the real backdrop art with no production media
 * dependency. Shared by the highlighted-term `CodexHovercard` and the Reader
 * Chamber `CodexCard` (which re-exports these under its established
 * `FALLBACK_BACKDROPS` / `getFallbackBackdrop` names for `ReaderViewport`).
 */
export const MANIFEST_BACKDROPS = [
  '/manifest-backdrops/immortal-land-1.jpg',
  '/manifest-backdrops/immortal-land-2.jpg',
  '/manifest-backdrops/immortal-land-3.jpg',
  '/manifest-backdrops/immortal-land-4.jpg',
  '/manifest-backdrops/immortal-land-5.jpg',
];

/**
 * Picks a stable Manifest backdrop for an entity ID via the same simple string
 * hash the production Reader uses, so a card without an assigned backdrop
 * always renders the same one.
 */
export function getManifestBackdrop(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MANIFEST_BACKDROPS.length;
  return MANIFEST_BACKDROPS[index];
}

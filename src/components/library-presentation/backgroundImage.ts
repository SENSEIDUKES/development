import type { LibraryAssets } from '../../library/assets';

/** Stable image choices; the host supplies asset locations, not the preference. */
export const BACKGROUND_IMAGES = [
  { id: 'home-background', name: 'Home background', mood: 'The lantern-lit city beneath stormy peaks.', source: 'home' },
  { id: 'moonlit-sanctum', name: 'Moonlit Sanctum', mood: 'Cold moonlight over a silent valley.', source: 'cave' },
  { id: 'dawn-ascension', name: 'Dawn Ascension', mood: 'Golden light breaking over the sect peaks.', source: 'cave' },
  { id: 'ruined-gate', name: 'Ruined Gate', mood: 'Dusk through a broken stone arch.', source: 'cave' },
  { id: 'wrathful-mist', name: 'Wrathful Mist', mood: 'Jade and ember currents over a scarred altar.', source: 'cave' },
  { id: 'blood-moon', name: 'Blood Moon', mood: 'A crimson moon and a coiled shadow.', source: 'cave' },
] as const;
export const DEFAULT_BACKGROUND_IMAGE_ID = BACKGROUND_IMAGES[0].id;
export function normalizeBackgroundImageId(value: unknown): string | undefined {
  return typeof value === 'string' && BACKGROUND_IMAGES.some(image => image.id === value) ? value : undefined;
}
export function getBackgroundImage(id?: string) {
  return BACKGROUND_IMAGES.find(image => image.id === id) ?? BACKGROUND_IMAGES[0];
}
export function backgroundImageUrl(id: string | undefined, assets: LibraryAssets): string | undefined {
  const image = getBackgroundImage(id);
  return image.source === 'home' ? assets.homeImages?.[0] : assets.caveImages?.[image.id];
}

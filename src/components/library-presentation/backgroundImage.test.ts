import { expect, it } from 'vitest';
import { BACKGROUND_IMAGES, backgroundImageUrl, getBackgroundImage, normalizeBackgroundImageId } from './backgroundImage';
it('uses host-owned assets for all choices and preserves the original Home image as default', () => {
  const assets = { homeImages: ['/home-art.jpg'], caveImages: { 'blood-moon': '/moon.jpg' } };
  expect(BACKGROUND_IMAGES).toHaveLength(6);
  expect(backgroundImageUrl(undefined, assets)).toBe('/home-art.jpg');
  expect(backgroundImageUrl('blood-moon', assets)).toBe('/moon.jpg');
  expect(backgroundImageUrl('blood-moon', {})).toBeUndefined();
  expect(getBackgroundImage('invalid').id).toBe('home-background');
  for (const value of [null, {}, 5, 'https://example.com/image', 'missing']) expect(normalizeBackgroundImageId(value)).toBeUndefined();
  expect(normalizeBackgroundImageId('blood-moon')).toBe('blood-moon');
});

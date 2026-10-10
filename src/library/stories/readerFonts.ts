import type { ReaderFonts } from '@seihouse/sen/reader-runtime';

/**
 * SEIHouse's fonts in the Reader, from SEIHouse/FONT-LAB: SEIHouse Sans, the
 * reading font built for hundreds of chapters on a phone, and the four
 * SEIHouse Display cuts for chapter titles, all four offered while the owner
 * tests them. The fonts the Reader used before stay as choices. The host loads
 * the faces (`@seihouse/seireader/sans.css` and `@seihouse/living-titles/fonts.css`);
 * each stack falls back to the theme's fonts for scripts these do not cover.
 */
export const LIBRARY_READER_FONTS: ReaderFonts = {
  text: [
    { id: 'seihouse-sans', label: 'SEIHouse Sans', family: '"SEIHouse Sans", var(--font-sans, system-ui), sans-serif' },
    { id: 'noto-serif', label: 'Noto Serif', family: 'var(--font-serif, Georgia), serif' },
  ],
  titles: [
    { id: 'seihouse-display-ink', label: 'Display Ink', family: '"SEIHouse Display Ink", var(--font-display, Georgia), serif' },
    { id: 'seihouse-display-soft', label: 'Display Soft', family: '"SEIHouse Display Soft", var(--font-display, Georgia), serif' },
    { id: 'seihouse-display-edge', label: 'Display Edge', family: '"SEIHouse Display Edge", var(--font-display, Georgia), serif' },
    { id: 'seihouse-display-wide', label: 'Display Wide', family: '"SEIHouse Display Wide", var(--font-display, Georgia), serif' },
    { id: 'alegreya', label: 'Alegreya', family: 'var(--font-display, Georgia), serif' },
  ],
};

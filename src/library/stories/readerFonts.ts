import type { ReaderFonts } from '@seihouse/sen/reader-runtime';

/**
 * SEIHouse's fonts in the Reader, from SEIHouse/FONT-LAB: SEIHouse Sans, the
 * reading font built for hundreds of chapters on a phone, and the four
 * SEIHouse Display cuts for chapter titles, all four offered while the owner
 * tests them. The fonts the Reader used before stay as choices. The host loads
 * the faces (`@seihouse/seireader/sans.css` and `@seihouse/living-titles/fonts.css`);
 * each stack falls back to the theme's fonts for scripts these do not cover.
 * Arabic, Persian, Urdu and Hebrew, which these do not cover, are set in Noto
 * on purpose (the host loads those faces too): Naskh and Serif Hebrew beside
 * a serif, Sans Arabic and Sans Hebrew beside a sans. Rubik keeps its own
 * Arabic and Hebrew. Urdu is set in Naskh for now, not the Nastaliq its
 * readers often expect.
 * Alternate faces are CSS-declared, not preloaded. Settings labels use the UI
 * font so opening the picker does not download every reading or title face.
 */
const SERIF_SCRIPTS = '"Noto Naskh Arabic", "Noto Serif Hebrew"';
const SANS_SCRIPTS = '"Noto Sans Arabic", "Noto Sans Hebrew"';

export const LIBRARY_READER_FONTS: ReaderFonts = {
  text: [
    { id: 'seihouse-sans', label: 'SEIHouse Sans', family: `"SEIHouse Sans", ${SANS_SCRIPTS}, var(--font-sans, system-ui), sans-serif` },
    { id: 'noto-serif', label: 'Noto Serif', family: `"Noto Serif", ${SERIF_SCRIPTS}, var(--font-serif, Georgia), serif` },
    { id: 'literata', label: 'Literata', family: `"Literata", ${SERIF_SCRIPTS}, Georgia, serif` },
    { id: 'rubik', label: 'Rubik', family: '"Rubik", system-ui, sans-serif' },
    { id: 'system-mono', label: 'System Mono', family: `ui-monospace, "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", ${SANS_SCRIPTS}, monospace` },
  ],
  titles: [
    { id: 'seihouse-display-ink', label: 'Ink', family: `"SEIHouse Display Ink", ${SERIF_SCRIPTS}, var(--font-display, Georgia), serif` },
    { id: 'seihouse-display-soft', label: 'Soft', family: `"SEIHouse Display Soft", ${SERIF_SCRIPTS}, var(--font-display, Georgia), serif` },
    { id: 'seihouse-display-edge', label: 'Edge', family: `"SEIHouse Display Edge", ${SERIF_SCRIPTS}, var(--font-display, Georgia), serif` },
    { id: 'seihouse-display-wide', label: 'Wide', family: `"SEIHouse Display Wide", ${SERIF_SCRIPTS}, var(--font-display, Georgia), serif` },
    { id: 'alegreya', label: 'Alegreya', family: `"Alegreya", ${SERIF_SCRIPTS}, var(--font-display, Georgia), serif` },
  ],
};

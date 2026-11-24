# Fonts and typography

Run `npm run fonts` after `npm ci` to see each local or packaged file, its
CSS family and variants, the Google Fonts families, and the stacks used by
the theme and Reader Settings.

| What you want to change | Where it lives |
| --- | --- |
| Font files checked into Development | [`public/fonts/`](../../public/fonts/), with the Library faces in `library/` and script subsets in `scripts/` |
| Font declarations and package imports | [`src/library/typography/`](../../src/library/typography/) |
| Shared UI font roles | [`tokens.css`](../../src/library/typography/tokens.css) sets Rubik for sans, Noto Serif for serif, Alegreya for display, and Alegreya SC for small caps |
| Reader Settings choices and defaults | [`readerFonts.ts`](../../src/library/typography/readerFonts.ts). The first choice in each list is the default. Keep the ID when updating an existing choice so saved settings still find it. |
| SEIHouse Sans and the four SEIHouse Display cuts | [Font Lab release packages](../../vendor/README.md#seihouse-fonts), imported by [`host-fonts.css`](../../src/library/typography/host-fonts.css). Update the packaged release and its provenance together. |

[Host font imports](../../src/library/typography/host-fonts.css) are shared by
NovelExpanded and the Workshop. They include Alegreya, Alegreya SC, Literata,
Noto Serif, Rubik, and the four Arabic and Hebrew Noto families from Google
Fonts. [Local faces](../../src/library/typography/local-fonts.css) are loaded
with Library styles. [Script faces](../../src/library/typography/script-fonts.css)
give the interface local Noto coverage for Arabic (including Persian and Urdu),
Hebrew, Ethiopic, Devanagari, and Thai. Those files are loaded when matching
characters appear. Font Lab also ships six SEIHouse Sans Night faces for
weights 300–500, which the Reader does not offer as a separate choice.
Elemental Title is a lettering renderer with no font binaries. System choices
such as System Mono use fonts supplied by the device.

## Add or replace a font

1. Put the web font and its license in `public/fonts/`. Register its family,
   weight, and style in the appropriate stylesheet under
   `src/library/typography/`. Use a `/fonts/…` URL in the declaration.
2. Assign it where needed. Change the relevant role in `tokens.css` for a
   shared UI font, or add a choice in `readerFonts.ts` for the Reader.
   Keep a generic fallback such as `serif` or `system-ui` in the stack.
3. Run `npm run check:fonts` and check the affected screen in NovelExpanded
   and its Workshop preview. Check real italics and non-Latin text when the
   change touches those faces.

## Remove a font

1. Search the family name and its file name in the repo. Switch any theme role
   or script fallback that uses it, and remove or replace its Reader choice.
   The Reader uses the first available choice when a saved ID is removed.
2. Remove the declaration or import and delete the local file only once all
   references are gone. Script subsets can serve several families.
3. Run `npm run check:fonts`. The app build and `npm run verify` run this check
   too. It catches misplaced declarations, missing and unregistered files,
   and theme or Reader primary web fonts with no registered face.

# Private UI artifacts

Both UI tarballs are built from UI PR [#90](https://github.com/SENSEIDUKES/UI/pull/90), source commit `099a460566eb236b4b1c067015431508129d13c8`:

- `@seihouse/ui@0.11.0`: universal SEIHouse primitives and experience tokens, including the application shell, shared overlay scrollbar and Pathways panel. The opt-in `double-tap` sidebar behavior toggles both widths and offers a keyboard-focus-only control; `automatic` and `click` remain available.
- `@seihouse/library-ui@0.10.0`: stateless Celestial Library presentation. Its `@seihouse/ui` peer is `^0.11.0`; its navigation skin supplies scroll-only gold thumbs and a stationary gold-and-cyan edge bevel. Domain behavior and persistence remain in `@seihouse/library` and its host.

The locked `@seihouse/audio-player@4.0.0` build declares an exact optional UI
0.10.1 peer. Development scopes an npm override to that package's UI peer, using
the root UI tarball, and the packed-consumer smoke checks apply the same override.
Hosts combining these SEN/Library releases with that audio build need the same
override until its peer declaration is updated. The Reader master-fader build below
retains this peer declaration while adding the audio controls.

```json
"overrides": { "@seihouse/audio-player": { "@seihouse/ui": "$@seihouse/ui" } }
```

`ui-artifacts.json` records source provenance and SHA-512 integrity. The root manifest pins these files, and `package-lock.json` records their integrity. Run `npm ci` followed by `npm run check:ui-artifacts` to verify the installed dependency inputs.

Use `npm ci` after refreshing these tarballs. `check:ui-artifacts` compares each tarball against the installed copy in both directions and also checks lockfile integrity and recorded source provenance.

No registry publication or repository visibility change is required.

## SPP intake adapter

`seihouse-productions-package-0.1.0.tgz` is built from the official standalone
`SENSEIDUKES/seihouse-productions-package` source at
`350e3c0aa55bd853767e685a45551b9f8b20fc24` using `npm exec -- tsup` and `npm pack`.
The package lock pins the tarball integrity. Its included `SPP_AGENT_SETUP.md`
governs intake: validate first, select manifest files explicitly, then pass decoded
content into the host's existing model context. SPP is a Development host dependency;
the portable SEN Harness only receives ordinary skill manifests and has no SPP dependency.

To reproduce an artifact, check out its recorded UI commit (the per-artifact commit when present, otherwise the shared source commit), install with its frozen pnpm lockfile, and build and pack that package from UI. Run each pack at its own recorded commit:

```sh
pnpm build:package
npm pack ./packages/seihouse-ui --pack-destination /path/to/development/vendor
npm pack ./packages/seihouse-library-ui --pack-destination /path/to/development/vendor
```

UI's `pnpm test:package` checks repeated-pack integrity and fresh ESM, TypeScript, and Tailwind CSS consumption. Development's `npm run test:package` installs SEN and Library into consumers outside the repository; the SEN consumer must have no Library UI installed.

## SEIHouse fonts

From SEIHouse/FONT-LAB at `93954df1686f0ea6c975bc953431ae839eeee493`, recorded with their
integrity in `font-artifacts.json`:

- `seihouse-seireader-0.39.0.tgz`: **SEIHouse Sans** 0.39 (formerly SEIReader), the reading
  font: five weights with real italics. Packed as FONT-LAB's own distribution workflow packs it
  (`npm pack --ignore-scripts` at its root) and audited there with
  `python3 verify_distribution.py <the web ZIP> --npm <the tarball>`.
- `seihouse-living-titles-0.1.0.tgz`: the Living Titles package, copied unchanged from
  `packages/living-titles/releases/` with its `release.json` (here
  `seihouse-living-titles-0.1.0.release.json`). Development uses only its `fonts.css`: the four
  **SEIHouse Display** cuts (Soft, Edge, Ink, Wide), Regular. Its runtime is not imported.

The host theme (`src/host/styles/theme.css`) registers both families for the Workshop and the
NovelExpanded app; the Library offers them in the Reader (`LIBRARY_READER_FONTS`). A face is
downloaded only when text on the page uses it. The licences travel inside the tarballs: SEIHouse
Sans under the SEIHouse Sans Ecosystem License, which lets SEIHouse products ship it, and SEIHouse
Display under its own notices for authorized SEIHouse products. To refresh, pack or copy the new
release from FONT-LAB the same way, update `font-artifacts.json`, and run `npm ci`.

## History

- **2026-10-10:** Added the SEIHouse fonts from FONT-LAB: SEIHouse Sans 0.39 and the Living Titles
  0.1.0 package for the four SEIHouse Display cuts.
- **2026-10-06:** Adopted UI 0.11.0 and Library UI 0.10.0 from one UI source commit for two-way drawer gestures, scroll-only thumbs and the Library bevel. Recorded the audio build's scoped peer override.

## Reader master-fader build — 2026-10-10

`seihouse-audio-player-4.0.0-master-volume.tgz` is an unpublished AUDIO-PLAYER build from source commit `9873263d695479ccfb4bf7e5ecf10360ead8b09a`, tracked by [AUDIO-PLAYER PR #184](https://github.com/SENSEIDUKES/AUDIO-PLAYER/pull/184). It includes Master volume, independent note mute, last-nonzero volume restoration, live soundtrack gain, the Settings fader and regressions. Built with `npm pack` after the full `npm test` passed. It retains version 4.0.0 and existing dependencies and peers; the optional UI peer override remains required. SHA-512: `65598a80ca3e7495b507ba2375aa53fa6e251a65b5e4edd02bb2545a25eb047be4f2a0085560fe02fdc629a77e0aa985e531535cc6969ec613f24d63b07a50f4`. The package lock records npm integrity. This tarball preserves the exact consumer build without a registry publication.

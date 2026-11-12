# Private UI artifacts

Both UI tarballs are built from UI main through PR [#94](https://github.com/SENSEIDUKES/UI/pull/94), source commit `8371b71aea79e52d591072bb65bd5590d3c21911`:

- `@seihouse/ui@0.12.0`: universal SEIHouse primitives and experience tokens, including the application shell, shared overlay scrollbar and Pathways panel. The opt-in `double-tap` sidebar behavior toggles both widths and offers a keyboard-focus-only control; `automatic` and `click` remain available.
- `@seihouse/library-ui@0.10.1`: stateless Celestial Library presentation. Its `@seihouse/ui` peer is `^0.11.0 || ^0.12.0`; its navigation skin supplies scroll-only gold thumbs and a stationary gold-and-cyan edge bevel. Domain behavior and persistence remain in `@seihouse/library` and its host.

The locked `@seihouse/audio-player@4.0.0` build declares an exact optional UI
0.10.1 peer. Development scopes an npm override to that package's UI peer, using
the root UI tarball, and the packed-consumer smoke checks apply the same override.
Hosts combining these SEN/Library releases with that audio build need the same
override until its peer declaration is updated. The Reader steady-pitch build below
retains this peer declaration while adding the audio controls.

```json
"overrides": { "@seihouse/audio-player": { "@seihouse/ui": "$@seihouse/ui" } }
```

`ui-artifacts.json` records source provenance and SHA-512 integrity. The root manifest pins these files, and `package-lock.json` records their integrity. Run `npm ci` followed by `npm run check:ui-artifacts` to verify the installed dependency inputs.

Use `npm ci` after refreshing these tarballs. `check:ui-artifacts` compares each tarball against the installed copy in both directions and also checks lockfile integrity and recorded source provenance.

No registry publication or repository visibility change is required.

## SEIHouse Front Desk

`seihouse-front-desk-0.2.0.tgz` is `@seihouse/front-desk` 0.2.0, built from the
private `SENSEIDUKES/seihouse-front-desk` repository with `npm run verify` and
`npm pack`. Its source commit and SHA-512 integrity are in
`front-desk-artifacts.json`, and `npm run check:ui-artifacts` checks them as it
checks the UI kit. Front Desk is the Familiar's controller, card and voice engines,
shared beneath SEN and the Library. To change it, work in its repository, bump its
version there, pack it into this folder, and update the record, the root
`package.json` and `package-lock.json`, then run `npm ci`.

## SPP intake adapter

`seihouse-productions-package-0.2.0.tgz` is built from the official standalone
`SENSEIDUKES/seihouse-productions-package` source at `37d82c412384afc663d490a3b9c3abe4f4af3de0`
(`350e3c0` plus one change, merged as SEIHouse/SEIHouse-Package#12), built with `npm run build`
and `npm pack`. 0.2.0 (2026-10-11) adds only `MAX_LIMITS`, a safety ceiling above the
unchanged defaults (1 GiB packs, 512 MiB files, 4096 entries), so a host can raise its
own limits to keep audio. The SPP repository's later document-intake changes on its
`main` (readable text added to Word files at packing) are not in it.
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

From SEIHouse/FONT-LAB, recorded with source commits and integrity in `font-artifacts.json`:

- `seihouse-seireader-0.42.0.tgz`: **SEIHouse Sans** 0.42 (formerly SEIReader), the reading
  font: five weights with real italics, plus the optional Night faces for Light, Regular and
  Medium (the three weights the Reader offers), each upright and italic. A Night face is slightly
  thinner for light text on a dark page and keeps its Day face's exact widths, so lines do not move.
  The Reader does not select the Night family yet; it still sets `"SEIHouse Sans"`.
  This release also carries 0.41's 54 added Latin letters and accents.
  Packed as FONT-LAB's own distribution workflow packs it
  (`npm pack --ignore-scripts` at its root at `5f57f9d8656daeec4e2f7cf8a9cf29e312301ef2`) and audited there with
  `python3 verify_distribution.py <the web ZIP> --npm <the tarball>`.
- `seihouse-living-titles-0.1.2.tgz`: the Living Titles package from FONT-LAB `fb45fc0071774f3925240d3596625c32955d2b6d`, copied unchanged from
  `packages/living-titles/releases/` with its `release.json` (here
  `seihouse-living-titles-0.1.2.release.json`). Development uses only its `fonts.css`: the four
  **SEIHouse Display** cuts (Soft, Edge, Ink, Wide), Regular. Its runtime is not imported.

The host theme (`src/host/styles/theme.css`) registers both families for the Workshop and the
NovelExpanded app; the Library offers them in the Reader (`LIBRARY_READER_FONTS`). A face is
downloaded only when text on the page uses it. The licences travel inside the tarballs: SEIHouse
Sans under the SEIHouse Sans Ecosystem License, which lets SEIHouse products ship it, and SEIHouse
Display under its own notices for authorized SEIHouse products. To refresh, pack or copy the new
release from FONT-LAB the same way, update `font-artifacts.json`, and run `npm ci`.

## History

- **2026-11-12:** Updated SEIHouse Sans to 0.42.0 from FONT-LAB #27 (`5f57f9d`). It adds Night faces for Light and Medium beside Regular, so all three Reader weights have one, and brings 0.41's added Latin letters and accents. Existing letters keep their shapes and widths. The Reader does not use the Night family yet. Living Titles stays at 0.1.2.
- **2026-11-11:** Updated SEIHouse Sans to 0.40.0 and Living Titles to 0.1.2 from FONT-LAB #24. The shared host theme delivers the refined curves to NovelExpanded and the Workshop; recorded the new package integrity and upstream release provenance together.

- **2026-11-08:** Added SEIHouse Front Desk 0.2.0 (`seihouse-front-desk-0.2.0.tgz`), the Familiar's system lifted out of this repository into `SENSEIDUKES/seihouse-front-desk` (step 2 of `docs/front-desk-plan.md`), with `front-desk-artifacts.json`.

- **2026-10-27:** Refreshed UI 0.12.0 and Library UI 0.10.1 from current UI main at `8371b71`, through UI [#94](https://github.com/SENSEIDUKES/UI/pull/94). Neither version moves from the #91 build below: only the bytes, the SHA-512 integrity in `ui-artifacts.json` and `package-lock.json`, and the recorded source provenance.

- **2026-10-25:** Refreshed UI 0.12.0 and Library UI 0.10.1 from current UI main, including the studio primitives and measured virtual lists from UI #91. Library Components now displays all 16 Library UI families from the canonical UI workbench catalog.

- **2026-10-11:** Updated the Display package to FONT-LAB's Living Titles 0.1.1 release, with its original archive and release hashes. This release updates the tooling/runtime; its four shipped Regular font files have the same hashes as 0.1.0. Kept SEIHouse Sans 0.39 and its original source provenance unchanged.
- **2026-10-10:** Added the SEIHouse fonts from FONT-LAB: SEIHouse Sans 0.39 and the Living Titles
  0.1.0 package for the four SEIHouse Display cuts.
- **2026-10-06:** Adopted UI 0.11.0 and Library UI 0.10.0 from one UI source commit for two-way drawer gestures, scroll-only thumbs and the Library bevel. Recorded the audio build's scoped peer override.

## Reader cue cancellation — 2026-11-02

`seihouse-audio-player-5.2.0.tgz` is built with `npm pack` from AUDIO-PLAYER
commit `6d6ada74e2df1e2d52ecad31c9fc160d11ceb94c` on
`feat/stop-reader-cues`. It adds `ReaderMixer.stopCues()`, which stops playing
and loading one-shots without changing the soundtrack or saved preferences.
The Reader calls it when narration pauses, seeks, is interrupted, or leaves.
The full AUDIO-PLAYER test command passed: repository, lint/format, types,
documentation, 862 unit tests, installed-package check, build and preview.
The steady-pitch fix from `dad9c7d` is retained on this branch's main base;
the mixer and its settings panel had no intervening source changes. The app
uses none of the player faces removed in 5.0.0. Both SEN and Library now
require the 5.2.0 peer. The existing scoped UI override remains necessary.
This replaces the old 4.0.0 artifact and does not publish to the registry.
SHA-512: `68d9ec39090f8e0ba4a1076595971f0c98d78982a018677df53d2443eebb4e4810479d7b40c416d0ad693afa614da051853844f8a7bafc3135fc0a12354db172`.
The lockfile records npm integrity.

## Reader steady-pitch build — 2026-10-11 (replaced above)

`seihouse-audio-player-4.0.0-steady-pitch.tgz` is an unpublished AUDIO-PLAYER build from source commit `dad9c7d`, on branch `claude/mobile-audio-playback-tuning-2mkjde` (built on PR [#184](https://github.com/SENSEIDUKES/AUDIO-PLAYER/pull/184)'s Master volume, independent note mute and Settings fader). It keeps phone audio in tune: the mixer sets Safari's audio session type before creating its AudioContext and holds it, instead of switching it whenever sound starts or stops, which could retune a live context on iPhone so every layer played sharp or flat. The note no longer draws a "!" when audio waits for a tap: it dims instead, and it turns red only when a soundtrack loop actually failed to play, where a tap retries it. Built with `npm pack` after lint, format, typecheck, docs, unit tests (except `readerLoudness.test.ts`, which also fails on AUDIO-PLAYER `main` with a last-digit rounding difference), the package smoke test, the build and the preview smoke test passed. It retains version 4.0.0 and existing dependencies and peers; the optional UI peer override remains required. SHA-512: `2d61450cd88559f16217fae8e8fb27a328a8d6a957693c0c4c98c3b021259300f2cfadf16e4e241714900ff56dd222929b0c3675d9d2ea1b024498d8a8477c71`. The package lock records npm integrity. This tarball preserves the exact consumer build without a registry publication.

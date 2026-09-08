# Header family validation

Validated 2026-09-08 against the local Vite preview at port 5186.

## Automated checks

- Five focused Vitest interaction tests passed: enabled initial focus, Escape return, exactly-once callbacks with host focus, outside-focus dismissal, minimal props, disabled primary eligibility and home interception.
- TypeScript and full `npm run build` passed, including API bundles.
- Capture guard passed: 14 locked captures, 11 dependencies and 18 fonts unchanged.
- UI artifact provenance and package import-boundary checks passed; no package exports changed.

## Integrated consumer validation

The expanded PR #184 integration passed the existing Story Seed suite (58 tests), Cultivator Cave suite (23 tests), and focused header plus Story Seed accessibility run (17 tests). Full build and TypeScript passed. Fresh packed SEN and Library consumers installed, type-checked and bundled successfully; SEN installed without Library UI. The capture guard still verifies all 14 captures, 11 dependencies and 18 fonts unchanged.

In-app Chromium checks used the real Development consumers and existing local Workshop adapters:

- Story Seed phone drawer opens the existing seven sections; Characters selection opens the actual editor. Desktop renders the same feature definition in the sidebar.
- Header Manifest reaches the existing editable World Blueprint Review with author-origin fields preserved, using the embedded preview's explicit local Blueprint fixture.
- Settings changes Fate Survival and its pressure controls. Save creates a local Story Bank record titled Ashes of the Ninth Meridian. Story Bank renders that record with its existing Edit Seed, Blueprint, Use Seed and export controls.
- The phone Settings sheet was checked with expanded content: Close and Save stay in view, the body scrolls, Shift+Tab from Close wraps to Save, Escape restores the Settings trigger after the close transition and restores body scrolling. Testing caught and fixed the canonical dialog's independent CSS translate offset on phones.
- Help opens the existing searchable guidance dialog. Testing caught a missing preview audio provider; the standalone Development entry now uses the same DevAudioPlaybackProvider as the normal app. Audio playback itself was not exercised.
- Cave's shared header opens its unchanged consolidated Settings panel. Stories opens the existing Manifested Stories and Story Seeds destination, with focus on the destination heading. Existing 23 tests cover settings, role gates, environment, portrait and destination behavior.

The earlier header-only validation covered Main Library Command Hub, Profile cloud, DAO modal focus/return, copy feedback and reduced motion. Those Main Library composition files are unchanged by the consumer integration. All nine integrated combinations were rendered at 390, 768 and 1440 pixels. Document scroll width stayed within viewport width for Main Library, Story Seed and Cultivator Cave.

## Limits

This verifies local presentation, keyboard interactions and existing fixture adapters. It does not verify production routing, authentication, sync services, provider generation, remote storage, real clipboard permissions or live audio. No full-page pixel parity, screen-reader certification or exhaustive contrast audit is claimed. Locked references remain the comparison baseline. No Light-Novels source, package version or published artifact is changed.

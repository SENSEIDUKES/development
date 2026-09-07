# Library UI ownership migration — 2026-09-06

| Package | Repository | Ownership |
| --- | --- | --- |
| `@seihouse/ui@0.4.0` | UI | Universal primitives and experience tokens |
| `@seihouse/library-ui@0.4.0` | UI | Celestial Library branded components, glyphs, particles, glass and spectral styles |
| `@seihouse/sen@0.4.0` | development | Portable narrative behavior and host presentation contracts |
| `@seihouse/library@0.2.0` | development | First-party features and Library presentation composition |

UI PR [#53](https://github.com/SENSEIDUKES/UI/pull/53) merged first. The vendored UI artifacts are built from its merge commit; see [provenance](../vendor/ui-artifacts.json). Universal UI does not depend on Library UI. SEN does not import, re-export, bundle, or depend on Library UI or Library. Library links to SEN and Library UI as peers.

## Consumer integration

All narrative feature subpaths remain: Color Codes, cards, Reader Chamber, Reader Codex, Manifestations, audio, Story Seed, Chapter Generation, Harness Generation, and the `codex-cards` compatibility alias. Their state, generation, storage, media, and event handlers retain their existing owners. The misleading SEN `ui` and `library` skin entries and their root/card Library component re-exports are removed. Universal card primitives remain available through `@seihouse/ui` and SEN's cards entry.

SEN's `presentation` entry exposes typed slots and `NarrativePresentationProvider`. Its defaults adapt universal SEIHouse primitives to existing narrative callbacks. Ambient decoration defaults to absent. Hosts can override individual slots; nested providers inherit the surrounding presentation. React 19 is the supported peer contract, matching canonical UI.

The first-party application supplies the complete branded presentation once:

```tsx
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { CreationModal } from '@seihouse/sen/story-seed';

<LibraryPresentationProvider>
  <CreationModal {...creationProps} />
</LibraryPresentationProvider>
```

Direct first-party consumers, including Relics and the component inventory, import `@seihouse/library-ui`. Published SEN consumers resolve their controls through the presentation provider. Manifestations uses the host ambient slot, which Library supplies with the same canonical ParticleEffect that Relics imports directly. There is one particle implementation.

`cn` comes from the supported universal package. Codex Hovercard owns its feature-specific spectral rim styling, avoiding imports of private LibraryPanel constants. No consumer imports private button skins.

## Styles and references

The application CSS imports `@seihouse/library-ui/styles.css` once. That stylesheet includes universal UI styles and registers its shipped JS for Tailwind v4. The existing Rubik, Noto Serif, Alegreya and Alegreya SC font loading remains in the host. The document retains `data-experience="sen"` and dark presentation. SEN feature CSS remains distinct from Library UI's shared stylesheet.

Repository-wide source and asset searches preceded deletion. The old local Library component implementations, tests, `cn`, copied SEI primitives, glass CSS, and spectral CSS are removed. The five unused particle glyph assets (`book-scroll`, `cultivator`, `shen-long-dragon`, `thunder-cloud`, `yin-yang`) are removed. `sacred-tree.svg` remains a Manifestations preview fixture.

The only file retained under `src/components/library` is an import-only `ParticleEffect.tsx` shim needed by the locked Relics reference. It forwards the canonical package; it contains no implementation. No locked reference file changed, and no published entry reaches that shim.

## Verification

- UI: typechecks, 484 unit tests, lint, production workbench and Storybook builds, reproducible tarballs, fresh ESM/types/Tailwind consumers, and desktop/mobile browser/accessibility coverage passed. Both remote CI jobs passed before merge; both actionable review threads were resolved. CodeRabbit's later run was rate-limited, not a substantive approval.
- Development: artifact-integrity checks, the real source import graph, built output and declarations, TypeScript, all 545 unit tests (one opt-in live-provider test skipped), SEN/Library builds, and fresh consumers outside the repository are exercised. The SEN consumer explicitly verifies Library UI is absent.
- Browser coverage targets Story Seed, Reader, Codex, Manifestations, Relics, Harness, and the Library component inventory at 1280px and 390px. Checks include document overflow, axe, field editing, drawer trapping/Escape/focus return, card keyboard behavior, particles, and motion settings.
- Small accessibility fixes found by this verification preserve the same flows: only mounted Workshop panels receive `aria-controls`; Reader's palette selector is named and its legend scroll region is focusable; Codex collage open/download actions are separate native controls; flagged text contrast is corrected.
- Host presentation tests verify universal defaults, controlled string callbacks, refs, nested providers, compact class overrides, canonical particle rendering, and descendant keyboard isolation. First-party skin assertions now supply the first-party provider. An existing audio test now waits for the already-established 100ms playback queue delay.

## Remaining consumers and limits

The local Light-Novels checkout still pins `@seihouse/sen` from `vendor/seihouse-sen-0.2.0-f7d119e.tgz`; it is not upgraded by this task. Its eventual upgrade must adopt the first-party presentation provider and the two UI artifacts. SEA-VAULT still pins UI 0.3.0 and is outside this migration. Other installations outside these checked repositories have not been audited.

SEN retains its existing shrink-only ledger of 11 development mock integration edges; this migration does not claim to replace those host store/audio/haptic adapters. Live generation providers, authentication, storage backends, and production audio were not exercised by this presentation migration. UI artifacts remain private tarballs, not registry releases.

## Deleted files

- `public/icons/book-scroll.svg`
- `public/icons/cultivator.svg`
- `public/icons/shen-long-dragon.svg`
- `public/icons/thunder-cloud.svg`
- `public/icons/yin-yang.svg`
- `src/components/library/LibraryBottomNavigation.tsx`
- `src/components/library/LibraryButton.tsx`
- `src/components/library/LibraryCard.test.tsx`
- `src/components/library/LibraryCard.tsx`
- `src/components/library/LibraryDragonCycleIcon.test.tsx`
- `src/components/library/LibraryDragonCycleIcon.tsx`
- `src/components/library/LibraryHeaderBadge.tsx`
- `src/components/library/LibraryNavigationDrawer.tsx`
- `src/components/library/LibraryPanel.tsx`
- `src/components/library/LibrarySoundGlyph.test.tsx`
- `src/components/library/LibrarySoundGlyph.tsx`
- `src/components/library/LibraryTextArea.tsx`
- `src/components/library/LibraryTextBox.tsx`
- `src/components/library/ManifestButton.tsx`
- `src/components/library/README.md`
- `src/components/library/SEIBottomNavigation.tsx`
- `src/components/library/SEIButton.tsx`
- `src/components/library/cn.ts`
- `src/components/library/glass-field.css`
- `src/components/library/index.ts`
- `src/components/library/library-spectrum.css`
- `src/package/sen/library.ts`
- `src/package/sen/ui.ts`

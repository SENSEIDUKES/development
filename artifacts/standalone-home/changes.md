# Standalone Light Novels Home — change report

Updated local main by fast-forward from `0682f09` to `24cb248` before implementation. Work is on `codex/standalone-homepage`. Prepared for publication as a draft PR at the user's request. No production application changes are included.

## Files added

| File | Purpose |
| --- | --- |
| `src/components/light-novels-home/development/LightNovelsHome.tsx` | Independent source-derived Home presentation, with host callbacks and inactive-media handling. |
| `src/components/light-novels-home/reference/LightNovelsHome.tsx` | Locked initial extraction for comparison. |
| `src/components/light-novels-home/shared/homeContracts.ts` | Display-only world data and callback inputs. |
| `src/components/light-novels-home/shared/home.css` | Source hero gradient and gold color, scoped to Home. |
| `src/components/light-novels-home/README.md` | Source commit, dates, boundary, history, and transfer instructions. |
| `src/workshop/previews/light-novels-home/LightNovelsHomeWorkspace.tsx` | Standalone Home entry with Reference/Development/Compare and direct responsive link. |
| `src/workshop/previews/library-shell/LibraryAppPreview.test.tsx` | Route selection, fixtures, filter retention, Profile round-trip, hero action, header search, and history regression coverage. |
| `artifacts/standalone-home/home-mobile.png` | Home screenshot at a 390 by 844 CSS viewport, captured at the browser host's display scale. |
| `artifacts/standalone-home/library-mobile.png` | Existing Library Shell screenshot at the same mobile viewport. |
| `artifacts/standalone-home/navigation-browser.json` | Sixteen browser checks covering four destinations at 320, 390, 768, and 1440 CSS pixels. |
| `artifacts/standalone-home/changes.md` | This exact inventory and validation report. |

## Files modified

| File | Change |
| --- | --- |
| `src/App.tsx` | Registered the single Home preview entry. |
| `src/workshop/manifest.ts` | Added the Home card and verified source metadata. |
| `src/workshop/WorkshopHome.test.tsx` | Included Home in the existing Workshop grouping checks. |
| `src/components/library-shell/README.md` | Documented the standalone Home and preserved Library/Discover content-slot boundaries. |
| `src/components/library-shell/development/main-library/GlobalHeader.tsx` | Distinguished Home and Library in shared Search. |
| `src/components/library-shell/shared/MainLibraryAdapter.tsx` | Added the optional host Library action for Search. |
| `src/components/library-shell/development/main-library/DaoInsightsPlacement.test.tsx` | Checked placement relative to the real hero and supplied jsdom media/particle mocks. |
| `src/workshop/previews/library-shell/DevelopmentHeaderPreview.tsx` | Reused existing Home/Library and Profile consumers while retaining their local state across navigation. |
| `src/workshop/previews/library-shell/LibraryShellWorkspace.tsx` | Made the Library fixture the default for the Library Shell entry. |
| `src/workshop/previews/library-shell/MainLibraryPreview.tsx` | Connected the extracted Home, retained existing other content, and corrected focus/history handling. |
| `src/workshop/previews/library-shell/captureMain.tsx` | Loaded the existing workspace styles needed when switching to Profile in the same document. |
| `src/workshop/previews/library-shell/libraryPreviewNavigation.ts` | Added in-document host transport, preserved reference mode, and resolved fixture URLs for history. |

## Validation

- `npm run build`: passed, including TypeScript and the existing API bundles.
- Focused Vitest run: 127 tests across 7 files passed (Home navigation, Workshop grouping, Library header/navigation/Dao, and real Profile tests).
- `npm run check:package-boundaries`: passed.
- `node scripts/checkLibraryShellCapture.mjs`: passed; 14 locked captures, 11 dependencies, and 18 fonts verified.
- `git diff --check`: passed.
- Production browser: all four destinations at 320, 390, 768, and 1440 pixels had the correct active item, one visible header, one visible global navigation bar, and no horizontal overflow.
- Home sort choice survived Library and Profile round-trips. Actual browser Back/Forward restored the original Library fixture and subsequent Home route.
- Standalone Home iframe and Original Reference loaded successfully; the Library Shell entry opened its Library fixture by default.
- No warning/error console messages in the tested production browser session.

## Scope limits

Development previously contained a homepage placeholder, not the homepage body. Home presentation was extracted from Light-Novels `LibraryScreen` at source commit `4a3dd02b6640b2ec50d8d1d136e37fb808249ed2`. Its published catalog is intentionally empty, and remains empty in the preview. Existing Library and Discover bodies remain their Development content slots. Profile remains the real existing Cave preview. Full production Library/Discover bodies and backend/account integration are not part of this work. Public hero media retains its original network dependency.

# Header family validation

Validated 2026-09-08 against the local Vite preview at port 5186.

## Automated checks

- Five focused Vitest interaction tests passed: enabled initial focus, Escape return, exactly-once callbacks with host focus, outside-focus dismissal, minimal props, disabled primary eligibility and home interception.
- TypeScript and full `npm run build` passed, including API bundles.
- Capture guard passed: 14 locked captures, 11 dependencies and 18 fonts unchanged.
- UI artifact provenance and package import-boundary checks passed; no package exports changed.

## Browser evidence

The in-app Chromium browser rendered Main Library, Story Seed and Cultivator Cave at 390px, 768px and 1440px. Document width did not exceed the viewport in all nine combinations. Each configuration had its expected visible actions; workspace secondary actions moved into overflow on phones and were visible at tablet/desktop widths.

At 320px, all 19 additional states rendered without document overflow: Main Library guest, syncing, offline, profile, active story, long name, missing profile, local DAO and DAO error; Story Seed empty, saved, generating, error, long title and minimal; Cultivator Cave cultivating, error, long title and minimal. Long-title inspection prompted a narrow-screen adjustment that places Cave's back control above the badge instead of compressing its plaque beside it.

Interaction checks:

- Phone overflow opens with Settings focused, exposes Settings/Story Bank/Help/export and returns focus to More actions on Escape.
- Settings selection invokes local host content; Quiet mode toggles its pressed state. Save Draft transitions to Saved and reports local completion.
- Cultivator Cave begins/cancels its local operation and Back to Profile reports the local destination.
- Main Library Command Hub opens with Library focused, preserves global/active-tome entries and disabled companion realms, and returns focus on Escape.
- Profile cloud invokes the local profile destination.
- DAO opens a named modal with the close button focused. Shift+Tab wraps to Seek Dao Insights. Category selection and local seek operate; local copy shows COPIED WISDOM. Escape returns to the DAO trigger and restores body scrolling.
- Visible phone workspace action targets measured approximately 44px high (floating-point geometry rounding below 44px); overflow trigger was also 44px wide.
- Emulated reduced motion reports `animation-name: none` for every canonical badge spectrum element. The override was reset afterward.
- Compare renders the locked shell and candidate in separate documents. The tablet frame uses content-box sizing so its border does not subtract two pixels from the 768px action breakpoint.
- No browser warnings or errors were reported in the configuration/state pass.

## Limits

This validates local presentation, keyboard behavior and fixture adapters, not production routing, authentication, sync services, real clipboard permissions, persistence, cultivation or Story Seed generation. DAO error/local states were rendered; the original source fallback semantics remain in the Development fork. No full-page pixel parity, screen-reader certification or exhaustive contrast audit is claimed. The locked references remain the comparison baseline. Sidebar, drawer, bottom navigation and active workspace integration are outside this change.

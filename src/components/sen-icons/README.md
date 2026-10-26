# SEN icons

Library owns the first-party artwork selection. The existing `@seihouse/library-ui` renderer and named adapters still own markup, identifiers, size and currentColor. SEN's portable defaults remain host-independent.

- [URLS.md](./URLS.md) lists all 33 public SVG URLs from the supplied Basic and Special R2 folders.
- `r2-icons.json` records exact object keys, URLs, ETags and existing Library identifiers.
- `r2-icons.css` selects those URLs for the existing renderer and matching generic download, search, settings, Help, account, exit, Home and provenance controls. The host theme and Library package stylesheet include it, including portalled menus. The inline bundled mask needs an explicit CSS override; vendor artifacts are not edited.
- The 12 bundled icons have individual named exports such as `LibraryAtmosphereIcon`, `LibrarySoundscapeIcon`, and `LibraryAudioIcon` from `@seihouse/library/presentation`. Their single artwork source remains shared with the Highlight Engine. They join `LIBRARY_ICON_CATALOG` in Basic or Special according to their meaning and support `size`, `className`, `currentColor`, and SVG accessibility props.
- `?preview=icons` is the single Workshop catalog, including alternate artwork.

Use the named adapter matching the icon's exact meaning. Keep an existing icon when no exact SEN equivalent exists. In particular, Story uses `SENStoryIcon`, while Origin uses a seated cultivator with a thought bubble.

QI yin-yang uses `SENQi.svg`; the seated figure uses `SENQiHead.svg`. Create is the navigation book, Storage the Story Bank, Reward the relic card, Companion the ally handshake and Faction the opposing fists. Header Help uses the refined bundled `assets/SENHelpv2.svg`; generic Help controls retain `SENHelp.svg`. Header Search uses the refined bundled `assets/SENSearchv2.svg`; generic Search controls retain `SENSearch.svg`. Basic Energy remains in use; `SENEnergySun.svg` waits for a later change.

Original Reference panes carry `data-workshop-reference` and are excluded from artwork overrides. Historical files and SVG geometry are not edited. All URLs are public; the integration needs no credentials, uploads or storage changes.

## History

- **2026-10-26:** Audited NovelExpanded icon placement: aligned Origin help/Blueprint headings and Story Bank Survival/Genre badges; exposed all pressure, Survival, and Genre icons for Library reuse and added Origin to the catalog.

- **2026-10-26:** Added a calligraphic Information icon with an open ring and serif foot. Library Info controls share the artwork; card information buttons use darker glass for contrast on covers.

- **2026-10-26:** Added the reusable Dao Insight eye-and-diamond icon to the Library catalog. DAO Insights reuses Origin, Genre, Survival, Manifest, Copy, and confirmation artwork.

- **2026-10-26:** Replaced the unselected Genre picker’s compass with a custom three-book fan. Selected genres retain their individual symbols.

- **2026-10-26:** Added a custom skull-and-crossbones icon beside the Fate Survival heading, matching the filled pressure flames.

- **2026-10-26:** Gave Immortal a distinct asymmetric two-tip flame rather than a smaller version of Heaven’s blaze.

- **2026-10-26:** Added progressive flame artwork for Mortal, Immortal, and Heaven in the Fate Pressure selector, with names below each icon.

- **2026-10-26:** Added Settings V2, an open eight-tooth gear with matching 2.15px strokes. Existing Settings controls use it, and the catalog retains the original alongside V2.

- **2026-10-26:** Restored Origin’s original seated-leg silhouette while retaining the cloud-shaped thought bubble.

- **2026-10-26:** Refined Origin with rounded crossed legs and a cloud-shaped thought bubble.

- **2026-10-26:** Added custom Origin artwork: a seated cultivator with a thought bubble, applied to the Story Seed navigation through its semantic icon hook.

- **2026-10-26:** Replaced the active Manifest artwork with a custom sprout: two asymmetric filled leaves and a curved stem. The catalog and existing Manifest controls share the local SVG.

- **2026-10-26:** Removed the decorative stars from Help/Search V2 and centered the plain symbols in their existing 24px bounds.

- **2026-10-26:** Balanced Help/Search V2 with larger main symbols, a wider question mark, shared 2.15px strokes, and matching separated four-point stars. Header and catalog share the bundled artwork.

- **2026-10-26:** Refined Search V2 locally with a separated star, balanced 24px bounds, and the same 1.8px stroke as Help V2. The catalog loads the bundled SVG; the shared header now uses the same refined SVG.

- **2026-10-26:** Placed Help V2 in the shared header and updated its catalog assignment.

- **2026-10-26:** Gave the Media icon's star a clear gap from both ends of its frame, shared by the Library catalog and Highlight Engine.

- **2026-10-26:** Added all 12 custom Highlight Engine action icons to the existing catalog and public Library presentation API, reusing their source artwork.

- **2026-10-09:** Collected and verified 19 Basic and 14 Special public SVGs; selected them in the Library skin, updated matching utility/provenance controls, and expanded the existing Icons catalog with direct URLs and alternate artwork.

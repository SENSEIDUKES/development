# SEN icons

Library owns the first-party artwork selection. The existing `@seihouse/library-ui` renderer and named adapters still own markup, identifiers, size and currentColor. SEN's portable defaults remain host-independent.

- [URLS.md](./URLS.md) lists all 33 public SVG URLs from the supplied Basic and Special R2 folders.
- `r2-icons.json` records exact object keys, URLs, ETags and existing Library identifiers.
- `r2-icons.css` selects those URLs for the existing renderer and matching generic download, search, settings, Help, account, exit, Home and provenance controls. The host theme and Library package stylesheet include it, including portalled menus. The inline bundled mask needs an explicit CSS override; vendor artifacts are not edited.
- `?preview=icons` is the single Workshop catalog, including alternate artwork.

Use the named adapter matching the icon's exact meaning. Keep an existing icon when no exact SEN equivalent exists. In particular, Story uses `SENStoryIcon`, while Origin intentionally keeps its quill icon.

QI yin-yang uses `SENQi.svg`; the seated figure uses `SENQiHead.svg`. Create is the navigation book, Storage the Story Bank, Reward the relic card, Companion the ally handshake and Faction the opposing fists. Help and Search use the original `SENHelp.svg` and `SENSearch.svg` artwork. Basic Energy remains in use; `SENEnergySun.svg` waits for a later change.

Original Reference panes carry `data-workshop-reference` and are excluded from artwork overrides. Historical files and SVG geometry are not edited. All URLs are public; the integration needs no credentials, uploads or storage changes.

## History

- **2026-10-09:** Collected and verified 19 Basic and 14 Special public SVGs; selected them in the Library skin, updated matching utility/provenance controls, and expanded the existing Icons catalog with direct URLs and alternate artwork.

# `@seihouse/sen`

SEN is the portable expanded-narrative engine. A publisher supplies content,
branding, accounts, storage, media, and—if desired—a generation method. AI is
optional. SEN has no dependency on Celestial Library, Library UI, Library
accounts, Energy, QI, first-party catalogs, Workshop state, or concrete APIs.

## Public entries

| Import | Owner responsibility |
| --- | --- |
| `@seihouse/sen` | Neutral presentation contracts/defaults and version |
| `./contracts` | Story, chapter, block, identity, voice, usage and language contracts |
| `./presentation` | Product-neutral presentation provider and slots |
| `./reader-runtime` | Required host ports for Reader/Codex state and services |
| `./reader-chamber` | Portable Reader behavior and UI |
| `./reader-codex` | Portable Codex behavior and UI |
| `./color-codes` | Single narrative Color Code authority |
| `./cards` | Narrative and System card families |
| `./manifestations` | Neutral manifestation capability and reveal UI |
| `./audio` | Media intent, resolution, provenance and playback contracts |
| `./story-seed` | Foundation schema, validation, import/export, repository port and neutral editor |
| `./generation` | Provider-neutral chapter/block/media acceptance contracts |
| `./harness-generation` | Canonical state, continuity, CAPA, generation ports, recovery and export |
| `./translation` | Translation/accessibility contracts and controller |
| `./arc-goals` | Arc planning contracts and operations |
| `./styles.css` | SEN feature styles |

There is no `chapter-generation` or `codex-cards` compatibility entry. Legacy
Chapter Generation remains Workshop diagnostics; HARNESS is the one canonical
generated-story owner.

## Required host composition

Reader and Codex require `ReaderRuntimeProvider`; Story Seed persistence is a
`StorySeedRepository`; generation is a `HarnessGenerationModelAdapter`; media
is supplied through portable media ports. Missing providers fail clearly. No
package surface installs browser storage, a mock store, a same-origin endpoint,
a provider, a catalog, authentication, or payment policy by default.

The packed-consumer smoke installs SEN without Library UI or the SEIHouse audio
player, supplies an independent presentation component, custom account and
repository types, and bundles every export with no AI adapter.

## Enforcement and build

`npm run check:ownership` classifies every production source file, checks every
public closure, rejects cross-owner source imports, undeclared dependencies,
host/Workshop defaults, package cycles and invalid dependency direction. It
does not begin from exports alone, so an unexported production capability fails.

```bash
npm run check:ownership
npm run build:package:sen
npm run test:package
```

Locked references, Workshop previews and fixtures, `src/host`, `src/server`,
concrete asset locations, and cross-product provenance are deliberately absent.

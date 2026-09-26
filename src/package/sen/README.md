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
| `./reader-chamber` | Portable Reader behavior and UI, including the anchored Mind Palace |
| `./reader-codex` | Portable Codex behavior and UI |
| `./color-codes` | Single narrative Color Code authority |
| `./cards` | Narrative and System card families |
| `./manifestations` | Neutral manifestation capability and reveal UI |
| `./motion-picture` | Item-neutral still-to-motion picture for any pictured entity |
| `./audio` | Media intent, resolution, provenance and playback contracts |
| `./story-seed` | Foundation schema, validation, import/export, repository port and neutral editor |
| `./generation` | Provider-neutral chapter/block/media acceptance contracts |
| `./harness-generation` | Canonical state, continuity, CAPA, generation ports, recovery and export; the Fate page and its panels |
| `./translation` | Translation/accessibility contracts and controller |
| `./arc-goals` | Arc planning contracts and operations |
| `./styles.css` | SEN feature styles |

There is no `chapter-generation` or `codex-cards` compatibility entry. Legacy
Chapter Generation was retired; HARNESS is the one canonical generated-story
owner.

**0.7.0 (breaking):** Translation and Accessibility are managed CAPA slots, like
Fate. The HARNESS resolves Translation from the story's Story Language (its
Original Language) and Accessibility from its Reading Mode
(`HarnessStory.chapterWritingStyle`, production's values, from
`./contracts`), with SEN bundling one Accessibility skill per non-Standard mode
(`SEN_READING_MODE_SKILLS`). Neither slot can be equipped by hand. The
always-sent `HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS` constant became
`buildHarnessOfficialOutputRequirements`, sent only when a chapter needs it;
`isTranslationSkillCompatible` and `translationCompatibilityError` gave way to
`resolveStoryLanguagePackage` and the shared `resolveTranslationPackage`.
`CapaSlotDefinition` gains `installable`. Saved HARNESS workspaces upgrade in
place (schema 21).

**0.6.0 (breaking):** removed `AlterFatePanel`, `ReaderFateAlerts`,
`FateSurvivalExplanation` and the `alterFateLock` helpers from `./reader-chamber`
(the Reader's `handleAlterFate` prop became `onOpenFate`, and its unused
`currentPowerStage` prop is gone); removed `HarnessSteering`,
`controller.steerStory` and the Fate Survival mystery/visibility fields from
`./harness-generation` in favor of `chooseChapterDirection`, the one-chapter
`HarnessChapterDirection`, and the Fate page (`FatePage`, `FatePathChooser`,
`FateArcGoalCard`, `FateDestinedEnding`, `FateConclusion`). Saved HARNESS
workspaces upgrade in place (schema 20).

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

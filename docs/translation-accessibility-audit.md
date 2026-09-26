# Translation and Accessibility Activation Audit

**Date:** 2026-09-26
**Scope:** Investigation and recommendation only. No code, prompt, schema, skill, or data was changed.
**Repository state:** `SENSEIDUKES/development` at `2e28fd3` (merge of #277). The reference pattern is the managed Fate slot from #270.
**Production evidence:** `SENSEIDUKES/Light-Novels` at `647165a`, read only.

> **Implemented (2026-09-26, same PR):** the recommended design below was built with the five
> decisions as written, under one product rule: users configure the story in Story Settings, and
> the HARNESS decides the skills. One addition: the novel page's CAPA slot panel and package
> intake now render only when a development host sets `showHarnessInternals`, so a production
> Library shows Story Settings only. Line citations below describe the audited commit; see
> `src/components/harness-generation/README.md` for current behavior.

HARNESS, CAPA, CAPA Schema, CAPA Skill, CAPA Prompt, Story Information Packet, Immediate
Chapter Request, and Generation Model Call are used exactly as defined in
[ARCHITECTURE_VOCABULARY.md](../src/components/harness-generation/ARCHITECTURE_VOCABULARY.md).
Statements about current behavior cite the file and line that produce it. Proposed design is
marked **Recommendation**.

## Summary

- Both slots can follow the Fate pattern: story state decides, HARNESS resolves the CAPA
  Skill during loadout freezing, and the result is frozen with the attempt. No capability
  framework is needed.
- Translation already has an authoritative state: the story's permanent **Original
  Language**, chosen in the Story Seed. In the Generation Model Call, "translation language"
  can only mean that language. The reader's display language is a separate system, Reader
  translation, which already switches itself on and off and should stay separate.
- Accessibility has an authoritative state in production: **Standard, Clear Reading, Easy
  Read, Literal Reading**. DEV keeps the account default on the Profile, but nothing reads it.
- Recommended shape:
  - Two new managed kinds in `CAPA_SCHEMA`, resolved inside the existing loadout freeze.
  - One HARNESS schema upgrade step and one retry rule.
  - Two Story Seed Settings controls: **Story language**, which is the existing Original
    Language moved, and **Reading mode**, a new seed field.

## 1. How Translation works today

### Writing: the CAPA Translation slot

- **Original Language.** Each story has a permanent Original Language, set once at
  creation (`src/narrative/generation.ts:120-125`). It comes from the Story Seed record
  (`src/components/story-seed/shared/storySeedRepository.ts:22-26`). It reaches
  `createStory` as story identity, never inside the Foundation
  (`src/workshop/previews/harness-generation/storySeedHandoff.ts:61-84`,
  `src/library/generation/HarnessGenerationWorkspace.tsx:1157-1167`).
- **Equipped by hand.** The author equips the Translation slot per story
  (`src/components/harness-generation/shared/controller.ts:395-435`).
- **Language match.** A skill is compatible only when its declared target language equals
  the Original Language (`src/narrative/translationSkill.ts:123-132`). This is checked when
  it is equipped (`controller.ts:302, 421`) and again at every loadout freeze
  (`src/components/harness-generation/shared/skills.ts:131`).
- **Glossary.** When a skill is equipped, `assembleCapaPrompt` adds its instructions plus
  only the glossary entries that the frozen Story Information Packet and Immediate Chapter
  Request mention (`skills.ts:188-206`). That selection is frozen on the CAPA Prompt.
- **Nothing ships.** No Translation package ships, and the official defaults equip none
  (`src/components/harness-generation/SPP_IMPORT.md:53-58`). The slot stays empty unless an
  author installs and equips a package.
- **Gap.** With the slot empty, nothing tells the writer which language to write in. The
  only signal is the `originalLanguage` field inside the Current Story Information JSON
  (`src/components/harness-generation/shared/context.ts:55`,
  `src/server/harness-generation/prompt.ts:226`). The Author skill, the official CAPA
  packages, and the fixed response contract never name the writing language.

### Reading: Reader translation

- **Already state-driven.** Per story, the reader picks Original, Account Default, or a
  specific language (`src/components/reader-chamber/shared/readerLanguage.ts`).
  - Translation is required only when the resolved language differs from the Original
    Language (`readerLanguage.ts:84`).
  - Nothing is requested when the two match
    (`src/components/reader-chamber/shared/translation/useChapterTranslation.ts:78`).
- **Automatic package choice.** The Reader resolves a Translation-slot skill that declares
  the `reader` application and that exact language
  (`src/components/reader-chamber/shared/translation/skill.ts:71-119`). Two or more different
  packages is an explicit ambiguity (`skill.ts:101`). There is no fallback.
- **Separate from canon.** It is its own model call, registered in the Model Router as
  "Reader Translation" (`src/server/model-router/catalog.ts:250`). It produces a cached,
  reversible overlay and never touches the Generation Model Call or canon; see
  [READER_TRANSLATION.md](../src/components/reader-chamber/READER_TRANSLATION.md).

## 2. How Accessibility works today

- **Equipped by hand, no declared mode.** The author equips the slot with any installed
  skill. Accessibility skills declare no reading mode, so nothing links a skill to a mode.
  The only one installed is the Workshop sample "Dyslexic Readability Preview"
  (`src/workshop/previews/harness-generation/skillCatalog.ts:19-28`).
- **The Profile setting is unused.** The Profile stores `defaultChapterWritingStyle`
  (`src/components/user-profile/development/types.ts:55`). It shows "Default Chapter Writing
  Style — Used when a new story is created"
  (`src/components/user-profile/development/UserProfileSettingsPanel.tsx:504`). No Story Seed
  or HARNESS code reads it.
- **The value set is defined three times:**
  - SEN's type (`src/narrative/chapter.ts:419`);
  - the Profile's type (`types.ts:24-28`);
  - the Profile's options and normalizer
    (`src/components/user-profile/development/chapterWritingStyle.ts:13-25`).

  The last two are Library-owned (`scripts/ownershipInventory.mjs:56`), so HARNESS, which is
  SEN, cannot import them.
- **Production already treats the mode as story state** (Light-Novels `647165a`):
  - Standard adds nothing. Each other mode adds one instruction sentence
    (`src/lib/chapterWritingStyle.ts:12-20`).
  - A new story copies the Profile default (`src/hooks/useStoryGeneration.ts:196-198`).
  - Each story keeps its own value, which "Applies only to future chapter prose generation"
    (`src/types.ts:1198-1199`). Story Settings edits it, with the copy "Changes apply to
    future chapter generations" (`src/components/StoryDetailScreen.tsx:406, 440`).
  - Every chapter request sends the story's value, and the server appends the instruction
    (`src/hooks/chapterPipeline/streamChapterBlocks.ts:41`,
    `src/server/routes/storyRouter.ts:335, 635`).

**Always-sent text (both slots).** `HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS` (`skills.ts:153-161`)
is appended to every CAPA Prompt (`skills.ts:207`). It explains how equipped Accessibility and
Translation instructions apply. At 1,283 characters, about 321 estimated tokens, it is sent on
every call, even though no DEV story loads either slot.

## 3. Compared with the Fate slot (#270)

| | Fate | Translation | Accessibility |
| --- | --- | --- | --- |
| Activation | HARNESS, from the chapter's frozen Fate mode (`skills.ts:114-119`, `controller.ts:778`) | The author, by hand | The author, by hand |
| Equipping by hand | Refused in `createStory` and `setSkillSlot` (`controller.ts:297, 405`) | Allowed | Allowed |
| Skill source | Bundled in SEN, always present (`authorSkill.ts:20`) | Host-installed packages | Host-installed packages with no declared mode |
| When not in use | No skill and no text | No skill, but the Official Requirements text is still sent | Same as Translation |
| Retry | The Fate mode is fixed, so a frozen resend is never stale | Stale after a slot change (see below) | Same as Translation |
| Novel page | Read-only "Loaded / Not used" card (`HarnessGenerationWorkspace.tsx:280-305`) | Dropdown plus per-slot SPP upload (`:306-384`) | Same as Translation |

**Why a Translation or Accessibility retry goes stale.** A failed attempt does not block
`setSkillSlot` (`controller.ts:71-75, 410`), so the author can change the slot after a
failure. The retry then resends the frozen CAPA Prompt whenever the chapter and direction are
unchanged (`controller.ts:1384-1394`), so the slot change is ignored.

**What carries over from Fate:**
- the slot never accepts a hand-equipped reference;
- loadout freezing decides it from state;
- the result is frozen on the attempt;
- an unused slot contributes nothing.

**What does not carry over:** Fate's skill is bundled in SEN, and the Fate mode never changes
after the story starts. Translation packages are host-installed, and the reading mode may
change between chapters.

## 4. Story Seed settings

**Where things are today:**
- The Settings body, shared by the desktop popover and the mobile sheet, holds only "Intended
  for mature audiences" (`src/components/story-seed/development/StorySeedSettings.tsx:62-69`,
  mounted at `StorySeedWorkspaceChrome.tsx:156`).
- Original Language is a dropdown on the Blueprint Review, next to Manifest
  (`BlueprintReview.tsx:294-317`).
- Style (the Chinese, Japanese, or Korean tradition), Fate Survival, and Pressure are edited in
  Origin (`workspaces/OriginWorkspace.tsx`).
- The Story Seed UI is Library-owned; the seed schema is SEN
  (`scripts/ownershipInventory.mjs:42-43`).

**Recommendation.** Add two controls to Settings, and none to the CAPA panel:

- **Story language:** the existing Original Language control, moved here and bound to the same
  saved record value. The Blueprint Review keeps a read-only line, so the language is still
  confirmed before Manifest.
- **Reading mode:** Standard, Clear Reading, Easy Read, or Literal Reading.

## 5. Source of truth for each preference

| Preference | Authority at generation | Where it is chosen | Default for a new seed |
| --- | --- | --- | --- |
| Writing language (Translation) | `HarnessStory.originalLanguage`, fixed | The Story Seed record, copied once at creation | Profile Default Reading Language (existing rule, `CreationModal.tsx:233-241`) |
| Reading mode (Accessibility) | A new story value, editable for future chapters | A Story Seed setting, copied once at creation | Profile `defaultChapterWritingStyle` |
| Reader display language | Not a generation input | The Reader, per story (`src/narrative/story.ts:305`) | The Profile (unchanged) |

- **Activation rule.** "Target language differs from source" becomes **Original Language is
  not English**. HARNESS treats Story Information and machine-facing fields as canonical English
  (`skills.ts:158`) and records no other source language.
- **No seed display language.** Do not add a seed-level display language. It would compete
  with the Profile default and with the Reader's per-story choice, and it would never affect
  the Generation Model Call.

## 6. Smallest clean change

**Recommendation.**

### Translation: `managedBy: 'story-language'`

- **Loadout freezing:**
  - English loads nothing.
  - Any other language loads the one installed Translation skill that declares `generation`
    and that language, newest version.
  - Two or more different packages are refused with a message, the Reader's existing rule
    (`translation/skill.ts:101`).
- **One resolver.** Share that resolver between the Reader and HARNESS, parameterized by
  application, rather than writing a second one.
- **No matching package:**
  - write the chapter without it;
  - show "No Japanese writing package installed" on the Translation card;
  - state the Original Language in one HARNESS-owned line, sent only for non-English stories.

  Blocking instead would stop every non-English story today.
- **Installing stays; equipping ends.** Packages remain installable through the inventory
  importer, but no one equips them by hand.

### Accessibility: `managedBy: 'reading-mode'`

- **SEN owns the value set:** the type, options, and normalizer, with production's stored
  strings. The Library Profile imports it.
- **New story field.** `HarnessStory` gains the story's reading mode, under production's field
  name `chapterWritingStyle`. An absent value means Standard.
- **Loadout freezing.** Standard loads nothing, and each other mode loads its skill.
- **Bundled skills.** SEN bundles three CAPA Skills built from production's sentences
  (Light-Novels `src/lib/chapterWritingStyle.ts:14-19`), so a mode's skill is never missing, as
  with Fate.
- **Slot closed.** The Accessibility slot is neither equipped by hand nor installable.
  Official Accessibility packages supplied later can declare their mode and replace the
  bundled skill in a follow-up.

### Both

- **Conditional Official Requirements.** The Accessibility and Translation paragraphs are sent
  only when one of them is loaded, and the language line only for non-English stories.
- **No signature change.** `freezeHarnessSkillLoadout` already receives the whole story
  (`skills.ts:100-106`).

## 7. How defaults are stored and carried forward

- **Story Seed.** Original Language stays on the seed record. The reading mode goes in
  `seed.story.optional`, which Settings already writes (`storySeedSchema.ts:84-97, 296-310`).
  It then travels in seed exports and in the story-start payload with no new plumbing. Older
  seeds read as Standard, so no Story Seed version change is needed.
- **Blueprint call.** The Blueprint prompt serializes the whole seed
  (`src/server/story-seed-blueprint/prompt.ts:48, 102`). Strip the reading mode there, because
  it is not world content.
- **New seeds:**
  - They take the Profile defaults through host props, as `accountDefaultLanguage` is
    designed to (`CreationModal.tsx:59-63, 168`).
  - No host passes that prop today (`src/workshop/previews/story-seed/StorySeedWorkspace.tsx:432-436`),
    so every new DEV seed starts in English.
  - Saved seeds keep their own values.
- **Story creation.** Both paths pass the language and reading mode beside the Foundation,
  never inside it, as Original Language already does:
  - Story Seed Manifest, through `startWorkshopHarnessStory`;
  - Library "Start from Story Seed", through `HarnessStorySeedOption`.
- **After creation.**
  - The story's owner changes the reading mode on the novel page, outside the CAPA panel,
    for future chapters. The CAPA card only reports what loaded.
  - Original Language never changes.
  - Neither value lives in the Reader session.

## 8. Implications

- **Schema.**
  - Bump `HARNESS_GENERATION_SCHEMA_VERSION` from 20 to 21 (`generation.ts:12`).
  - Add one step to `HARNESS_WORKSPACE_MIGRATIONS` (`repository.ts:138`) that removes saved
    `skillLoadout.translation` and `skillLoadout.accessibility`.
  - Frozen attempts stay as recorded.
  - A story with a hand-equipped Accessibility skill becomes Standard, because no mode maps
    to that skill.
- **Retry.** Extend the frozen-resend condition (`controller.ts:1388`): the managed skills the
  story resolves now must match the ones frozen on the attempt. A reading-mode change or a
  newly installed language package then rebuilds the request instead of resending a stale
  CAPA Prompt.
- **Manual paths to close:**
  - saved references, removed by the migration;
  - host `initialSkillLoadout`, refused in `createStory`;
  - the public `setSkillSlot`, refused;
  - per-slot upload-and-equip (`HarnessGenerationWorkspace.tsx:374-383`).
- **Importer.** Today `managedBy` also hides a slot from the SPP importer
  (`SppSkillImport.tsx:129`). Translation must stay installable, so "managed" and
  "installable" become separate facts.
- **Novel page.** Translation and Accessibility become read-only cards, like Fate. The
  equipped count covers Author, Pacing, Continuity, and Style.
- **Inspection.** `describeMissionReminder` freezes a loadout (`controller.ts:387-393`). With
  bundled reading-mode skills and a language rule that does not block, it cannot fail on a
  missing package.
- **Package.** Bump `@seihouse/sen` from 0.6.0 to 0.7.0 (`src/package/sen/package.json:3`) for
  the new exports and contract fields.
- **Tests to rewrite:**
  - the seven hand-equip calls in `translationSkill.test.ts` and
    `translationGeneration.test.ts`;
  - the manual Translation reference in `storySeedHandoff.test.ts`.
- **Tests to add:**
  - each activation rule;
  - inactive calls carry no Accessibility or Translation text;
  - a reading-mode change affects only the next chapter;
  - the retry rebuild;
  - the migration;
  - the Settings controls;
  - account defaults apply to new seeds only.
- **Docs.** Update `ARCHITECTURE_VOCABULARY.md` (the CAPA Schema and CAPA Prompt rows),
  `SPP_IMPORT.md`, `READER_TRANSLATION.md`, and the harness-generation, story-seed, and
  user-profile READMEs.

## 9. Can this be implemented cleanly now?

Yes. The change has three parts:

- `managedBy` grows from one kind to three, all decided in the existing loadout freeze;
- one migration step;
- one retry rule.

It needs no capability registry, no new assembler, and no new context system. Translation and
Accessibility share the migration and the retry rule, so one change set is simpler than two.

## 10. Files and systems to modify

- **HARNESS (SEN):**
  - `src/components/harness-generation/shared/`: `skills.ts`, `controller.ts`,
    `repository.ts`, `foundation.ts`, `authorSkill.ts`, and a new file for the bundled
    reading-mode skills;
  - `src/narrative/generation.ts`, `src/narrative/chapter.ts`,
    `src/narrative/translationSkill.ts`;
  - `src/package/sen/harness-generation.ts`, `src/package/sen/contracts.ts`,
    `src/package/sen/package.json`.
- **Reader (SEN):** `src/components/reader-chamber/shared/translation/skill.ts`, for the shared
  resolver.
- **Story Seed:**
  - Library UI: `src/components/story-seed/development/StorySeedSettings.tsx`,
    `StorySeedWorkspaceChrome.tsx`, `CreationModal.tsx`, `BlueprintReview.tsx`;
  - SEN: `src/components/story-seed/shared/storySeedSchema.ts`;
  - Blueprint call: `src/server/story-seed-blueprint/prompt.ts`.
- **Hosts:**
  - `src/library/generation/HarnessGenerationWorkspace.tsx`;
  - `src/workshop/previews/harness-generation/storySeedHandoff.ts`, `SppSkillImport.tsx`,
    `skillCatalog.ts`;
  - `src/workshop/previews/story-seed/StorySeedWorkspace.tsx`;
  - `src/components/user-profile/development/` (types, `chapterWritingStyle.ts`, settings copy).
- **Tests and docs:** as listed in section 8.

## Risks and ambiguities

1. **Two meanings of "translation language."** If the writing language followed a reader's
   choice, a story's canon would change language partway through, and shared readers would
   receive the owner's language. Keep writing on the Original Language and display on the
   Reader.
2. **Reader or story owner.** The reading mode changes the canon every reader sees, so it
   belongs to the story's owner. A per-reader Easy Read for someone else's novel would need a
   derived Reader layer like Reader translation. That is not proposed here.
3. **Defaults that turn capabilities on unexpectedly.** Once hosts pass the Profile defaults,
   the Profile's Default Reading Language becomes each new seed's Original Language. The
   Workshop sample profile (`src/workshop/previews/user-profile/previewData.ts:276-278`) is
   set to Japanese and Clear Reading, so it would start both capabilities on every new seed.
   Settings must show both values plainly.
4. **Naming.** Story Seed already uses "Style" for the Chinese, Japanese, or Korean
   tradition. A Japanese Style must never turn on Japanese Translation; that is the existing
   rule (`SPP_IMPORT.md:55`). Label the new control "Reading mode" everywhere, and keep the
   stored values.
5. **Modes that do not map to a skill:**
   - Standard is off by design.
   - The "Standard Accessibility" package idea (`SPP_IMPORT.md:53-54`) has no role.
   - The Dyslexic Readability sample should be retired, since Clear Reading is production's
     dyslexia-friendly mode.
   - Reader display accessibility (fonts, spacing, color palettes) stays Reader-only and
     never loads a CAPA Skill.
6. **Stale retries already exist.** Today, changing a slot after a failed chapter and then
   pressing Retry resends the old skills (section 3).
7. **Knock-on effect.** Reader translation of an Easy Read chapter may not keep the Easy Read
   register unless the translation request is told the mode. This can come later.

## Decisions before implementation

All five are recommended as written:

1. The writing language is the Original Language, labelled "Story language" in Story Seed
   Settings. The reader's display language stays with the Reader.
2. The reading mode is the story owner's setting, changeable for future chapters, matching
   production.
3. For now, SEN bundles production's three mode sentences as its Accessibility CAPA Skills.
4. A non-English story without a writing package still generates, with a visible notice. The
   alternative blocks those stories.
5. The UI label is "Reading mode" everywhere, and the stored values do not change.

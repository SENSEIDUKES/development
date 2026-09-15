# SPP import in the Development Harness

> Skill/slot terms here (CAPA Skill, CAPA Schema) are defined once in
> [ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md); this file
> does not redefine them.

The Development host follows the official adapter's `SPP_AGENT_SETUP.md`:

1. **Import SPP skill** accepts a file and calls `intakePack` from the pinned official package.
2. Only a non-null validated `content` exposes manifest files and original asset bytes.
3. The author selects a Markdown/plain-text file, previews its UTF-8 text, and chooses a skill slot.
4. **Install selected instructions** saves an ordinary `HarnessSkillManifest` in the browser's host inventory.
5. Equipping it uses the existing `setSkillSlot` story operation and IndexedDB story persistence.
6. Generation freezes that exact manifest into the attempt's CAPA Prompt, assembled in CAPA
   Schema order. The existing HTTP client, server handler, `buildHarnessGenerationPrompt`, and
   Gemini provider receive its instructions there, never inside the Story Information Packet.

Package ID, version, selected path and SHA-256 remain in `skill.source`, including the
saved attempt and model request. The host's skill ID identifies the package/path/slot
combination; it never replaces the original package ID. Importing does not equip a skill.
Package text follows the chosen slot's position in the CAPA Schema, subject to the existing
author/canon hierarchy. Every generation slot, Author included, is assembled once into the
same CAPA Prompt; the slot only determines its order.
Intake itself never promotes text to instructions. Package names and categories never
trigger behavior.

The host retains selected skill text, not the whole archive. Reload restores the installed
inventory and per-story equipped references; reupload to inspect the full package again.
Reinstalling identical content is idempotent. Changed content under an installed version
is rejected; create a new version while retaining the SPP package ID.

## Limits and errors

- 8 MiB archive, 16 MiB expanded content, 4 MiB per entry, 128 entries; the adapter's
  remaining integrity, path, manifest and compression guards remain active.
- Only explicit `text/plain` and `text/markdown` selection supports generation instructions.
  Binary files remain visible in the manifest and cannot be installed as text.
- Strict UTF-8, nonempty text, no NUL bytes, 16,000 characters per skill; no truncation.
- At most 64 imported skills in this browser. Storage errors are shown before installation succeeds.
- The assembled CAPA Prompt may use at most 6,000 estimated tokens. That ceiling is
  enforced during CAPA assembly and never spends the Story Information Packet's budget.

SPP parsing is host-only under `src/workshop/previews/harness-generation/` and is not
shipped in portable SEN. A consuming host may implement its own importer and provide
the same `installedSkills` and `renderSkillImport` props. Inventory changes preserve
the controller and all in-flight attempt snapshots.

## Verification on 2026-09-13

The supplied `SEN-AUTHOR.spp` fixture validates as SPP 1.0, package ID
`ccd29d8d-69fe-402b-80d1-f24432503fbf`, version `1.0.0`. Its actual file is
`assets/1-Author Skill.md` (SHA-256
`63a22acb7b9dc4572c1655bd06b673d11f29d80db7c2bf099b0ceaac0b873149`).
The illustrative `assets/author-instructions.md` path is separately tested in a generic
package; neither filename is special in the implementation.

`sppSkills.test.ts` traces the real fixture through saved inventory, story loadout,
HTTP serialization, server prompt, provider boundary and committed chapter using a
provider fixture. It also covers damaged input, resource limits, text rejection,
duplicate/version handling, storage failure and context budgeting.

`sppGeneration.live.test.ts` is an explicit opt-in test using `HARNESS_SPP_ENV` for an
existing environment file and optional `HARNESS_SPP_OUTPUT` for local evidence. It ran
two real `google/gemini-3.1-flash-lite` chapters with the same Foundation and temperature
0 after merging the new Author slot: bundled-author baseline and imported-author equipped.
Both committed. The equipped request replaced the bundled author's text with the selected
file in the existing author instruction section and retained package provenance. Reported
input tokens were 2,957 baseline and 3,371 equipped. The imported-author chapter uses an
immediate storm opening, leaves the invitation unresolved and avoids a forced breakthrough.
Since the bundled and imported skills share similar author direction, output comparison
alone does not isolate stylistic causality. The captured provider request proves the
imported instructions were used; the prose supplies qualitative compliance evidence.

The live baseline initially exposed Gemini `INVALID_ARGUMENT` from repeating all nested
detail variants in every response-schema bucket. Keeping character/speech details with
characters and mechanics with other evidence categories made both real calls succeed.
The JSON story contract, evidence validation and commit guards remain in place.

The browser test also uploaded the supplied package, previewed and installed its text,
and generated real Gemini prose through the UI. After the Author-slot merge, it installed
the file for Author, explicitly replaced the bundled author, emptied Style and committed
Chapter 2 with only the imported Author equipped. Reload restored the chapter, next
chapter number and equipped skill. Import was disabled during generation. A 390 px
viewport check found no document overflow. Optional memory-interpretation warnings
remain separately visible in the existing diagnostics; these do not invalidate committed prose.

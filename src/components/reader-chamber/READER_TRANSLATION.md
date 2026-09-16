# Reader translation

Reader translation is a **derived reading layer**. It never changes a story.

## Canonical generation vs. Reader translation

|                        | Canonical generation                            | Reader translation                             |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------- |
| What it produces       | The chapter itself                               | A display overlay over that chapter             |
| Language               | `HarnessStory.originalLanguage`, permanent       | Whatever a reader currently asks for            |
| Which skill            | The story's equipped Translation slot            | A skill declaring the target language **and** the `reader` application |
| Where it is stored     | Chapter blocks, memory, media — story canon      | A cache keyed by chapter, language, source hash, skill ID, version and content digest |
| If it fails            | No chapter is committed                          | The original chapter stays on screen            |
| Reversible             | No                                               | Yes — switching back is a render change         |

The equipped generation skill is never reused for a reader's different target
language, and there is no generic or English fallback: an uninstalled language
package means the reader is told so and keeps reading the original.

## Choosing a reading language

Per story, a reader picks one of three:

- **Original** — the story's own language. Shown immediately; no request is made.
- **Account Default** — Default Reading Language → Interface Language → English.
- **Specific Language** — one supported language, for this story only.

A story with no saved Reader choice starts on Account Default. If that resolves
to the story's Original Language, the original is shown immediately. If no
compatible Reader Translation skill is available, the original remains readable
and the Reader explains why the requested translation was not applied.

Changing the account default moves only the stories left on Account Default.
The choice lives in `ReaderPreferences.readingLanguage`, a reader preference, not
canon. When any mode resolves to the story's own language, the canonical chapter
is shown with no translation request at all.

## What is sent, and what is not

Only reader-facing material travels: prose and dialogue, and the reader-visible
titles, labels, values, notices, outcomes and descriptions of System Panels.

Block IDs are sent as identifiers so a response can address them; they are never
translated. Nothing else machine-facing is represented in the contract at all —
no block types, JSON keys, enum values, entity triggers, speaker identity keys,
music, atmosphere or creature classifications, asset identifiers, URLs, audio
routing, World Cue intents, or internal tags. A response that returns one is
rejected rather than filtered.

The response must cover every canonical block exactly once. It cannot create,
remove, reorder, or reclassify blocks, and positional lists must keep their
length. Validation runs before anything is saved; the result is re-sorted into
canonical order, so a reordered reply cannot reorder the chapter.

## Rendering

Canonical and translated chapters render through the same Reader block
components: a translation is the canonical blocks with their reader-facing values
swapped in at render time. `lang` and text direction come from the language being
displayed — never from whether the content happens to be translated, and never
from an English assumption.

Block-scoped media and manifestation metadata stay attached to their canonical
blocks. Source-language phrase-anchored World Cues and `[SFX]` auto-cues are not
applied to translated text, because their phrase positions no longer exist after
translation; the original chapter keeps every one of them.

## The flow

`ReaderTranslationController` owns the lifecycle: resolve the skill, freeze the
request (source chapter, target language, complete skill identity, and the exact
selected glossary entries with resource path/digest provenance), reuse or
regenerate the cache, deduplicate concurrent asks, validate, and save. React calls no model: the controller hands the frozen request to a
provider port, whose Development adapter posts to `/api/reader-translation`,
which holds the provider key.

A cached translation is reused only while its `sourceContentHash`, skill ID,
`skillVersion`, and skill content digest still match. Multiple installed versions
of one skill resolve to the newest. Different compatible skill identities are an
explicit ambiguity and are never selected by inventory order.

Development persistence has no migration path. `READER_TRANSLATION_SCHEMA_VERSION`
guards the cache under `seihouse.reader.translations.v2`; anything the current
schema cannot read is discarded.

## Language packages

No real Translation skill ships in this repository, and none is created by this
work. Coverage uses small test-only manifests and glossary fixtures that are never
installable product skills. An authored package installs through the existing SPP
importer with no further HARNESS or Reader change.

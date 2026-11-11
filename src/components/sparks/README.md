# Sparks

SEN owns Sparks: a short beginning for a story, the panel and trigger, genre selection, protagonist preference, usage display and host contracts. Import `SparksButton` and `SparkHost` from `@seihouse/sen/story-seed`. Include `@seihouse/sen/styles.css` alongside the host's utility stylesheet, as with SEN's other narrative surfaces.

The host supplies generation, availability/usage, Save and Use. SEN performs no network request and owns no account, quota, API key or persistence. The existing Development server and NovelExpanded host adapters implement those responsibilities. The panel opens on SENSEI's flower example, labelled Example, with Use and Save disabled. Its title is an explicit placeholder and genre is unset pending SENSEI's choice. Without a model, Random shows this showcase; Custom keeps the reader's own words exactly. A failed request shows its error and keeps the current spark.

Readers may choose zero to two catalog Story Tags and a protagonist gender and age (Any, Young, Middle, Old). Any preference needs a connected model. The tag chooser uses Origin's extracted chip and search pieces, catalog and recommendations. Chosen tags travel with the generated spark and lead its planted Story Tags, followed by de-duplicated inferred tags within Story Seed's existing limit. No new model call is introduced. What the Models Read shows Story Spark's live system instruction and alternative requests, with dated fingerprints.

`CreationButton`, text inputs and icons use SEN's presentation adapters. Default surfaces use neutral `--spark-*` tokens. Library provides its own materials and artwork through its presentation provider and stylesheet. A host can mark an ancestor with `data-narrative-overlay-root` to keep the dialog inside its appearance scope; otherwise it portals to the document body.

The canonical genre picker and genre list are shared by Sparks and Story Seed. The existing Workshop route remains `?preview=dao-insights`; its responses are explicit local fixtures. NovelExpanded uses the same component with real host actions.

## History

- **2026-11-10:** Added optional catalog Story Tags (cap two, confirmed by SENSEI) and protagonist age. Replaced the hand-written demo bank and per-genre fallback picker with one non-plantable flower showcase. Preserved the flower prompt line and system instruction. Added Story Spark to What the Models Read and its dated history. Example usability, final title and genre remain pending owner decisions; this work stays in a draft PR.

- **2026-10-30:** Explicitly request a short present-tense Eastern fantasy serial premise instead of opening-scene prose. Sparks uses the server default chapter model (`HARNESS_GENERATION_DEFAULT_MODEL` through the shared Model Router); it does not receive the reader's selected writing model. Blueprint provider failures are now distinguished from incomplete answers, with the selected model recorded in server diagnostics. The Swallowed Star's inferred tags are covered through the Blueprint handoff.

- **2026-10-30:** Moved the Spark panel, trigger, host contract, built-in beginnings and shared genre picker from Library to SEN. Removed the Library exports and updated app/preview consumers. Kept the app's visual preset through host presentation, with neutral defaults and packed-consumer checks for SEN alone.
- **2026-10-30:** Simplified prompts and presentation, removed Survival and Copy controls, added server-backed usage and Any/Male/Female protagonist selection. Existing visitor allowance and owner bypass remain unchanged.

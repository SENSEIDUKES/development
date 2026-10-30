# Sparks

SEN owns Sparks: a short beginning for a story, the panel and trigger, genre selection, protagonist preference, usage display and host contracts. Import `SparksButton` and `SparkHost` from `@seihouse/sen/story-seed`. Include `@seihouse/sen/styles.css` alongside the host's utility stylesheet, as with SEN's other narrative surfaces.

The host supplies generation, availability/usage, Save and Use. SEN performs no network request and owns no account, quota, API key or persistence. The existing Development server and NovelExpanded host adapters implement those responsibilities. Built-in examples remain available when no model is connected; a selected protagonist gender requires a model instead of silently substituting an unrelated example.

`CreationButton`, text inputs and icons use SEN's presentation adapters. Default surfaces use neutral `--spark-*` tokens. Library provides its own materials and artwork through its presentation provider and stylesheet. A host can mark an ancestor with `data-narrative-overlay-root` to keep the dialog inside its appearance scope; otherwise it portals to the document body.

The canonical genre picker and genre list are shared by Sparks and Story Seed. The existing Workshop route remains `?preview=dao-insights`; its responses are explicit local fixtures. NovelExpanded uses the same component with real host actions.

## History

- **2026-10-30:** Moved the Spark panel, trigger, host contract, built-in beginnings and shared genre picker from Library to SEN. Removed the Library exports and updated app/preview consumers. Kept the app's visual preset through host presentation, with neutral defaults and packed-consumer checks for SEN alone.
- **2026-10-30:** Simplified prompts and presentation, removed Survival and Copy controls, added server-backed usage and Any/Male/Female protagonist selection. Existing visitor allowance and owner bypass remain unchanged.

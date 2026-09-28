# Text Highlight Engine

SEN-owned plain-text selection and local editing, plus the manuscript page that
SEN features point at. No Reader, chapter, generation, translation, Library,
storage, or server dependency.

- Created: **2026-09-26**; last Workshop update: **2026-09-28**
- Lifecycle: active standalone prototype; the Workshop tab is the manuscript lab
- Source: this Development repository; no production replica or source comparison
- Workshop: `?preview=text-highlight-engine`
- Package: `@seihouse/sen/text-highlight-engine`

## Anatomy

Each part has one file and one job, so it can be audited on its own for
accessibility, viewport fit, power use, and look and feel. The Workshop's
**Parts** board copies a ready-to-send brief for any of them
(`src/workshop/previews/text-highlight-engine/parts.ts`, kept in step with this list).

| Part | File | Owns |
| --- | --- | --- |
| Text Highlight Engine | `development/TextHighlightEngine.tsx` | Puts the parts together over the host's paragraphs; owns the edit and undo records it reports |
| Selection Tracker | `development/useSelectionTracker.ts`, `shared/selection.ts`, `development/measure.ts` | Reads the browser selection; keeps the canonical selection (paragraph + exact positions); measures it; clears it on Escape or an outside tap; moves the first Tab of each selection into the Action Bar |
| Selection Highlight | `development/SelectionHighlight.tsx` | The tinted marks over the selected words |
| Action Bar | `development/ActionBar.tsx`, `shared/actions.ts` | The one floating bar: Edit, the host's nested actions, Back, an action's panel, and Save / Delete Passage while editing; its position, touch sizing and labels. On touch screens (`pointer: coarse`) its buttons stack vertically, and while the phone's own selection menu can show it keeps a 72 px band above and below the selection clear |
| Overlay Layer | `development/OverlayLayer.tsx`, `shared/overlay.ts` | Draws a host's `overlay` with the prose without covering a word: tints behind the text (`OverlayMark`) and quiet numbers (`OverlayPin`) in the start margin or the line spacing; hidden from assistive technology, never takes taps, never changes text, no work while absent |
| Inline Editor | `development/InlineEditor.tsx` | The plain-text draft replacing only the selected words, including line breaks and IME typing |
| Undo Notice | `development/UndoNotice.tsx` | "Passage deleted · Undo" after an explicit deletion |
| Cue Picker | `development/ManualCuePicker.tsx`, `shared/manualCue.ts` | Choosing, previewing and placing a Sound Cue from the host catalog |
| Manuscript | `shared/manuscript.ts` | Permanent paragraph and sentence IDs, saved sentences, anchors, the one edit rule, draft / sealed |

The Workshop adds the Manuscript Inspector and the lab page itself; neither is
part of the SEN package.

## Host contract

```tsx
import { TextHighlightEngine, type TextHighlightBlock } from '@seihouse/sen/text-highlight-engine';
import '@seihouse/sen/styles.css';

const [blocks, setBlocks] = useState<TextHighlightBlock[]>([
  { id: 'paragraph-1', text: 'The harbor was quiet that morning.' },
]);
return <TextHighlightEngine blocks={blocks} onBlocksChange={setBlocks} />;
```

Hosts supply unique, nonempty stable block IDs and synchronously accept local
updates through `onBlocksChange(blocks, edit)`. Blocks are immutable values.
`PassageEdit` reports `operation`, the original `selection`, and `before`/`after`
blocks. `onSelectionChange(selection | null)` remains available to hosts. The
optional `actions` tree accepts nested generic `PassageAction` branches and
leaf callbacks that receive the immutable `PassageSelection` and a close
callback. Only the host decides which actions to expose. `renderBlockText` lets
a host render decorations around prose while keeping the block text canonical.

The optional `overlay` draws a host's map-mode view with the prose, never on
top of a letter. `marks` are translucent tints behind exact words; a mark with
`attention` keeps its tint and gains a dashed underline in
`--sen-overlay-attention` (amber by default) for a range that needs a decision.
The host chooses each tint's color. `pins` are
quiet numbers in the white space: `margin` sits in the start margin level with
a line's baseline (paragraph numbers, e.g. ¶2); `raised` sits in the line
spacing just above a character, like a verse number (sentence numbers). They
use the system face at the prose's own color and reduced strength, with no
box. Raised numbers rely on the engine's open line spacing (1.85, about 12 px
between lines); margin numbers need about 30 px of start margin from the host
(the Workshop keeps 32 px).
The layer is decorative (`aria-hidden`), never takes taps, does no work while
`overlay` is absent, and fades in unless the reader prefers reduced motion.

`PassageSelection` contains `blockId`, `selectedText`, `startOffset`, `endOffset`.
Offsets use UTF-16 code units into the unmodified block text: start inclusive,
end exclusive. Whitespace is not trimmed from valid selections or replacements.
The browser adapter normalizes selection immediately. No live Range is canonical
state; temporary ranges supply geometry. The edit session also retains the
original block text to reject stale replacements.

Public lower-level exports: `normalizePassageSelection`, `isValidPassage`,
`replacePassage`, `passageRange`, and `useSelectionTracker` (also exported under its
former name, `usePassageSelection`). Custom host renderers
using the hook must attach its `rootRef`, mark prose blocks with
`data-sen-text-block="stable-id"`, attach `controlsRef` to their controls and `editorRef` to their inline draft, and use
the returned `beginEdit`/`beginAction`/`clear` lifecycle. Prose text nodes,
excluding buttons, `aria-hidden` content, and `data-sen-selection-ignore`
decorations, must concatenate to the supplied block text exactly. The
ready-made component handles this itself.

The optional SEN `createManualCueMoment(block, selection, cue, catalog)` adapter
validates the selected range against current prose, finds the exact
non-overlapping phrase occurrence used by the existing inline renderer, and
requires an approved host-supplied catalog cue and provenance. It returns a
manual `ResolvedAudioMoment` or a typed rejection. Manual moments may anchor
ordinary author-selected text; generated cue validation still requires its
audible-action phrase. The Workshop supplies its base catalog and routes
Preview and placed glyphs through the shared `NarrativeAudioPlayback` provider.
The reusable Cue picker offers category filtering and case-insensitive search
over descriptions, variations, categories, and tags. Its visible catalog-order
numbers remain unchanged when filtered; they are display aids, not moment IDs.

## Manuscript

`shared/manuscript.ts` is the plain page under the prose: text, reading order and
permanent addresses. It never interprets what is attached to it.

```ts
Manuscript           { status: 'draft' | 'sealed'; locale; paragraphs }   // array order = reading order
ManuscriptParagraph  { id; text; sentences }                              // a TextHighlightBlock
ManuscriptSentence   { id; start; end }                                   // saved, trimmed offsets in the paragraph
ManuscriptAnchor     = { level: 'paragraph'; blockId; text }
                     | { level: 'sentence'; blockId; sentenceId; text }
                     | { level: 'span'; ...PassageSelection; detached? }
ManuscriptAttachment { id; kind; anchor; payload }                        // payload belongs to its system
ManuscriptState      { manuscript; attachments; deletion? }
```

- **Identity is not order.** `createManuscript` gives every paragraph and
  sentence a permanent ID. "Paragraph 2 · Sentence 8" is computed from position
  (`locateSelection`); inserting a paragraph (`insertParagraph`) changes numbers,
  never IDs.
- **Sentences are saved, not recomputed.** `splitSentences` runs the runtime
  sentence segmenter once, with three guards for the primary English page: a
  bracketed System line is its own sentence, a lowercase continuation
  (`“Run!” she shouted.`) stays with its sentence, and common abbreviations
  (Mr., Dr., Lv.) do not end one. A capitalised speaker tag after a spoken
  line (`“Run!” Elder Shen shouted.`) still splits; boundary correction and
  other languages are later work.
- **Every anchor keeps its words.** `resolveAnchor` returns the exact current
  range (`placed`), `changed` when its words are no longer the attached ones
  (with the paragraph's or sentence's `current` range when it still exists), or
  `missing` when its paragraph or sentence is gone. Attachments never drift onto
  other words. `anchorAtLevel` turns a selection into a words, one-sentence, or
  paragraph anchor.
- **One edit rule.** `applyPassageEdit(state, passageEdit)` takes the engine's
  `PassageEdit` and is the only place edits move attachments. Spans before the
  edit stay, spans after it shift, spans overlapping it become `detached`
  (flagged, never moved). Paragraph and sentence anchors follow their IDs and
  read as `changed` until `keepAttachment` confirms the new words. Only touched
  sentences are split again; the first piece keeps the old ID, so fixing a word
  keeps the sentence's identity. Undo of the latest deletion restores that
  paragraph's saved sentences and attachments exactly.
- **Draft, then sealed.** `sealManuscript` is refused while any attachment is
  flagged. A sealed page refuses edits and attachment changes; pass
  `editable={false}` to the engine to remove Edit, Delete, and Undo.
- **Prototype size.** `MANUSCRIPT_PROTOTYPE_WORD_LIMIT` (500 whitespace words)
  caps a page; a `replace` edit that would exceed it is refused.

The Workshop lab starts from three pre-made paragraphs (action, world-building,
a breakthrough with a System line). Sound Cues are the only working attachment:
the Cue panel's **Attach to: Words / Sentence / Paragraph** choice stores a
`sound-cue` attachment whose payload is only the chosen catalog cue, and the
Reader's existing inline format (`ResolvedAudioMoment`) is derived from the
anchor at render time. Below the prose, a Workshop-only inspector shows the
selection's address, every attachment with its status (Keep / Remove), and the
saved page structure, where clicking a sentence selects it. Draft/Sealed status,
the word count, Reset sample and Seal chapter sit above the prose.

Deliberately later: Soundscape, narration, Manifestation, Mind Palace and
Regenerate attachments; selection across paragraphs; manual sentence-boundary
correction; non-English segmentation and presentation; Harness writing into the
manuscript at chapter save; Reader Chamber migration; translation; persistence.

## Behavior and limitations

- Select within one paragraph; Edit makes only the selected text editable in place.
  The draft is an isolated plain-text span; surrounding prose stays read-only.
  Save changes only that range. HTML is literal text, and newlines remain inside
  the same paragraph. An empty block keeps its ID and visible line space.
- The default highlight is soft violet `rgba(140, 110, 225, .35)` (#8c6ee1). Override
  `--sen-passage-highlight` through the component's `style` prop to affect both
  the live selection overlay and inline draft highlight. The Workshop preview
  has a color picker for trying alternatives; it preserves the current selection
  while the swatch is used and is not part of the SEN UI.
- Empty input disables Save and reveals Delete Passage. Deletion requires that
  explicit action. Undo restores the exact previous block; there is no timer.
  Only one deletion is retained. Another deletion replaces it; a committed edit
  or external text change to that same block invalidates it. Other blocks can
  change without losing Undo. This is local memory, not persisted deletion.
- After a selection, the first Tab moves focus into its floating controls
  (Shift+Tab is untouched), whatever the host renders after the prose.
- Escape or outside pointer activation discards an unsaved draft. Save never
  runs on blur. Successful edits clear selection and restore focus to the block.
- Collapsed, whitespace-only, outside-root, multi-range and cross-block
  selections offer no Edit action. Browser selection ending in another
  paragraph is cross-block even if it visually resembles a whole-paragraph selection.
- Text editing remains plain text only. Inline glyph buttons and joiners are
  excluded from selection offsets, so their presence does not shift the
  `PassageSelection`. Rich-text editing, formatting, and cross-paragraph editing
  are not supported.
- The floating action controls own their touch-size rules. Inline cue glyphs
  keep the Reader Chamber's compact prose sizing and punctuation placement.
- Manual cue placement uses the current resolved-audio occurrence format.
  Overlapping instances of the same selected phrase cannot be represented
  exactly and are rejected instead of attaching a cue to another occurrence.
  Hosts can pass occupied selections to reject a new cue that would overlap an
  existing placement; the Workshop does so.
  In the Workshop, the manuscript's edit rule keeps, shifts, or flags each
  placement; an Edit that changes a cue's words flags it instead of removing it.
  Cue choices and edits last only for that preview session.
- Native touch selection remains browser-owned. `-webkit-touch-callout: none`
  requests callout suppression but cannot guarantee removal of every OS selection
  menu. iOS may retain its native tint/handles alongside the gold overlay. Automated mobile tests cover
  touch activation after a scripted range; they do not prove OS long-press menus,
  physical selection handles, or virtual-keyboard behavior on real devices.
- No undo stack for replacements, persistence, sealing, networking, or AI.
  Future hosts own those policies and must not treat local
  callbacks as finalizing chapter content. Reload resets the Workshop prose.

## Verification and transfer

Run `npm exec -- vitest run src/components/text-highlight-engine`,
`npm run test:workshop`, `npm run typecheck`, `npm run check:ownership`,
`npm run test:package`, and `npm run build`.

With Vite running, `node scripts/verifyTextHighlightEngine.mjs` runs isolated
Chromium desktop/phone/tablet and WebKit phone/tablet checks; install those Playwright
browser binaries first if needed. It writes screenshots and a results JSON to
`output/playwright/text-highlight-engine/`. A desktop drag uses real mouse
events; mobile tests use scripted ranges and actual tap events.
On Windows, WebKit cases explicitly report `blocked` if its measured viewport
differs from the requested width; this local DPI mismatch also misdirects native
taps. A blocked case is not a pass. Run those cases on a compatible runner for
WebKit evidence; the Chromium cases remain independently verified.
The Linux CI job runs all five browser cases and uploads their screenshots and
results as `text-highlight-engine-browser-evidence`.

Consumers import the package entry and SEN stylesheet. For a source transfer,
carry `development/` and `shared/` (excluding tests), the public barrel and its
export/ownership registration. React, React DOM and `@seihouse/ui` are existing
package peers. Keep Workshop hosting, dummy prose, reference documentation and
browser evidence out of the consuming surface. No integration was performed.

## Workshop history

- **2026-09-28:** Overlay colors now mean the kind of added effect, not how much
  text it covers: every Sound Cue is blue, and each future kind gets its own
  color (Soundscapes, for example, red). The tint's extent still shows words, a
  sentence or a paragraph. A cue whose words changed stays blue and gains an
  amber dashed underline instead of turning amber.
- **2026-09-28:** Overlay numbers redesigned after phone testing: they no longer
  sit on the words or stack. Paragraph numbers moved to the margin (¶1), and
  sentence numbers became small raised numbers in the space between lines
  (1…15, counted through the page), both in the system face at secondary
  strength. Cue labels gave way to tints with a color key, the legend explains
  the model's P2 S6 form, the inspector shows the model address of any
  selection, and overlays fade in unless Reduce Motion is on.
- **2026-09-26:** Created normalized selection contracts, validated local range
  replacement, minimal Edit/Save, soft gold selection, explicit Delete Passage
  and guarded Undo, with an independent four-paragraph preview.
- **2026-09-26:** Replaced the separate replacement box with an isolated inline
  draft and a small Save control. Added the gold overlay throughout selection;
  native touch menu suppression remains browser-dependent.
- **2026-09-27:** Added a generic nested action boundary and an optional manual
  Sound Cue adapter. The same Workshop preview now offers Edit | Media → Audio
  → Cue, a host-catalog picker, shared playback, and in-memory inline glyph
  placements. Selections continue to use stable prose offsets when glyphs are
  present. Added a preview-only highlight color picker.
- **2026-09-28:** Added the Overlay Layer and the lab's Overlays switch: the Cues
  overlay tints every placed cue by level (amber when its words changed) and
  labels it with its address, and any overlay shows P1… / S1… numbering the way
  the model addresses the page. On touch screens the Action Bar now stacks
  vertically and keeps clear of the phone's own selection menu.
- **2026-09-28:** Split the engine into named parts (Selection Tracker, Selection
  Highlight, Action Bar, Inline Editor, Undo Notice) with an Anatomy section and
  a Workshop Parts board that copies a brief per part. An open draft now closes
  when the host fixes its text, the first-Tab jump happens once per selection,
  and `insertParagraph` honours the 500-word cap.
- **2026-09-28:** Default highlight changed from soft gold to violet #8c6ee1.
- **2026-09-28:** Added the manuscript page: permanent paragraph and sentence
  IDs separate from order, saved sentence boundaries, paragraph/sentence/span
  anchors that keep their words, and one edit rule that keeps, shifts or flags
  attachments, with exact Undo of a deletion and a Draft/Sealed state. The
  engine gained `editable`, and the first Tab after a selection now enters its
  controls even when a host renders content after the prose. The Workshop tab
  became the manuscript lab: three
  pre-made paragraphs, Sound Cues attachable to words, a sentence or a
  paragraph, an address/attachment/structure inspector, and Seal chapter.
- **2026-09-27:** Scoped floating-control styles so placed cues use Reader
  Chamber's inline glyph spacing. Added numbered Cue results, parent-category
  filtering, and search to the reusable picker.

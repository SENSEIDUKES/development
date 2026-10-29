# Highlight Engine

SEN's engine for highlighting part of a story and attaching something to it:
select, edit, place an effect, see every effect in an overlay. Today it works
on prose (plain-text selection and local editing, plus the manuscript page that
SEN features point at); later the same engine highlights images, the panels of
sequential art (NOVEL_EXPANDED.md, Stage E5). No Reader, chapter, generation,
translation, Library, storage, or server dependency.

Its name is the Highlight Engine, never "Text Highlight Engine" (renamed
2026-10-12). Names that describe the prose surface alone keep "text":
`TextHighlightBlock`, `TextHighlightOverlay`, the `sen-text-highlight-*` classes
and `--sen-text-line-height`. An image surface will get its own beside them.

- Created: **2026-09-26**; last Workshop update: **2026-10-25**
- Lifecycle: active standalone prototype; the Workshop tab is the manuscript lab
- Source: this Development repository; no production replica or source comparison
- Workshop: `?preview=highlight-engine`
- Package: `@seihouse/sen/highlight-engine`

## Anatomy

Each part has one file and one job, so it can be audited on its own for
accessibility, viewport fit, power use, and look and feel. The Workshop's
**Parts** board copies a ready-to-send brief for any of them
(`src/workshop/previews/highlight-engine/parts.ts`, kept in step with this list).

| Part | File | Owns |
| --- | --- | --- |
| Highlight Engine | `development/HighlightEngine.tsx` | Puts the parts together over the host's paragraphs; owns the edit and undo records it reports |
| Selection Tracker | `development/useSelectionTracker.ts`, `development/useSelectionInput.ts`, `shared/selection.ts`, `development/measure.ts` | Owns selection gestures while editable, capturing paragraph + exact positions without a native selection; measures them; clears on Escape or an outside tap; moves the first Tab into the Action Bar; opens Remove on right-click, the ContextMenu key or Shift+F10. Fixed prose continues to read native selections |
| Selection Highlight | `development/SelectionHighlight.tsx`, `development/SelectionHandles.tsx` | The tinted marks and the engine's two 44px range handles, adjustable by touch, mouse or keyboard |
| Action Bar | `development/ActionBar.tsx`, `shared/actions.ts` | The one floating bar, with two faces. **Add**: Edit, Copy, the host's nested actions, Back, an action's panel, and Save / Delete Passage while editing. **Remove**: Undo, the host's removals and Delete Passage, as a vertical list like a desktop context menu, removals in red. An action a host marks unavailable stays visible, dimmed, with its reason. It owns position, touch sizing and labels, stays clear of our range handles, and hides while a selection is dragged. Touch buttons stack vertically; Add ends with Remove |
| Overlay Layer | `development/OverlayLayer.tsx`, `shared/overlay.ts` | Draws a host's `overlay` with the prose without covering a word: tints behind the text (`OverlayMark`) and quiet numbers (`OverlayPin`) in the start margin or the line spacing; hidden from assistive technology, never takes taps, never changes text, no work while absent |
| Inline Editor | `development/InlineEditor.tsx` | The plain-text draft replacing only the selected words, including line breaks and IME typing |
| Undo Notice | `development/UndoNotice.tsx` | "Passage deleted · Undo" after an explicit deletion |
| Cue Picker | `development/ManualCuePicker.tsx`, `shared/manualCue.ts` | Choosing, previewing and placing a Sound Cue from the host catalog |
| Soundtrack Change Picker | `development/SoundtrackChangePicker.tsx`, `src/audio/soundtrackChanges.ts` | Choosing a piece of music or an atmosphere (with the host's preview) for the chapter's one change of each, on the word where it begins; its option list also serves the host's opening choice |
| Manuscript | `shared/manuscript.ts` | Permanent paragraph and sentence IDs, saved sentences, anchors, the one edit rule, draft / sealed |
| Placement Rules | `src/audio/soundCueRules.ts`, `src/narrative/words.ts` | What a finished attachment may be, per kind of effect (see Placement rules), and word edges in any language |

The Workshop adds the Manuscript Inspector and the lab page itself; neither is
part of the SEN package.

## Host contract

```tsx
import { HighlightEngine, type TextHighlightBlock } from '@seihouse/sen/highlight-engine';
import '@seihouse/sen/styles.css';

const [blocks, setBlocks] = useState<TextHighlightBlock[]>([
  { id: 'paragraph-1', text: 'The harbor was quiet that morning.' },
]);
return <HighlightEngine blocks={blocks} onBlocksChange={setBlocks} />;
```

A host sets the line spacing with the `--sen-text-line-height` custom property (1.85 by
default) and the font, size and weight on any parent.

Hosts supply unique, nonempty stable block IDs and synchronously accept local
updates through `onBlocksChange(blocks, edit)`. Blocks are immutable values.
`PassageEdit` reports `operation`, the original `selection`, and `before`/`after`
blocks. `onSelectionChange(selection | null)` remains available to hosts. The
optional `actions` tree accepts nested generic `PassageAction` branches and
leaf callbacks that receive the immutable `PassageSelection` and a close
callback. Only the host decides which actions to expose. An action's optional
`unavailable(selection)` returns a reason ("Sound Cues fit 1–8 words"): the
action stays in the bar, dimmed, with the reason under its label and as its
description. `removeActions` fill the bar's Remove mode beside the built-in
Undo and Delete Passage. Remove mode exists only while `editable`: right-click
on the selection, or on a word (which it selects first), the ContextMenu key
and Shift+F10 open it and suppress the browser's menu; a right-click away from
the prose keeps the browser's menu. On touch screens a hold selects a word with
the engine; the Add bar's Remove row opens Remove mode. `locale` names the prose's
language for word edges. `renderBlockText` lets
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
`replacePassage`, `passageRange`, `passageOffsetAt` (a DOM position's block and
plain-text offset), and `useSelectionTracker(blocks, onSelectionChange, { removable, locale })`
(also exported under its former name, `usePassageSelection`), which adds
`mode`, `setMode` and `focusControls` for Remove mode. Custom host renderers
using the hook must attach its `rootRef`, mark prose blocks with
`data-sen-text-block="stable-id"`, attach `controlsRef` to their controls and `editorRef` to their inline draft, and use
the returned `beginEdit`/`beginAction`/`clear` lifecycle. Prose text nodes,
excluding buttons, `aria-hidden` content, and `data-sen-selection-ignore`
decorations, must concatenate to the supplied block text exactly. The
ready-made component handles this itself.

The optional SEN `createManualSoundCue(block, selection, cue, catalog)` adapter
validates the selected range against current prose and requires an approved
host-supplied catalog recording with provenance and a sound word. It refuses a
range that is not exactly 1–8 whole words (`partial-word`, `too-many-words`) or
that overlaps another cue; a host first turns any selection into the words a
cue would hold with `snapSoundCueSelection` ("Somewher" → "Somewhere"), which
says instead why a selection cannot hold one. It returns the same
`SoundCueAttachment` the HARNESS stores for a generated cue, with
`origin: 'manual'`, or a typed rejection. The Workshop supplies its base catalog and routes
Preview and placed glyphs through the shared `NarrativeAudioPlayback` provider.
The reusable Cue picker offers category filtering and case-insensitive search
over descriptions, sound words, variations, categories, and tags, and lists only recordings that name a sound word. Its visible catalog-order
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
each sits on 1–8 whole words as the SEN `SoundCueAttachment` itself, exactly
what a generated chapter stores (Remove mode's **Remove cue here** takes cues
off the selected words), and the Reader renders every cue still placed on its
words. Below the prose, a Workshop-only inspector shows the
selection's address, every attachment with its status (Keep / Remove), and the
saved page structure, where clicking a sentence selects it. Draft/Sealed status,
the word count, Reset sample and Seal chapter sit above the prose.

Deliberately later: Soundscape, narration, Manifestation, Mind Palace and
Regenerate attachments; selection across paragraphs; manual sentence-boundary
correction; non-English segmentation and presentation; Harness writing into the
manuscript at chapter save; Reader Chamber migration; translation; persistence.

## Placement rules

Each kind of effect has its own rules for what may exist on the page — the
finished attachment — kept in one place so they can be tuned later.

| Effect | Sits on | Size | Per chapter |
| --- | --- | --- | --- |
| Sound Cue | Words: where a sound happens ("drew his sword", "a horn blared across the terrace") | 1–8 whole words, never mid-word | 10 |
| Soundscape change | The chapter's opening (locked at its start), then the one word where the music changes, e.g. the moment before a major battle | One word: where it begins | 2 (the opening and one more) |
| Atmosphere change | The chapter's opening (locked at its start), then the one word where the place's sound changes | One word: where it begins | 2 (the opening and one more) |

The music (soundscape), the atmosphere and Sound Cues are three separate kinds
of sound, each placed and counted on its own. `SOUNDTRACK_CHANGE_RULES`
(`src/audio/soundtrackChanges.ts`) holds the two-per-chapter limit (SENSEI:
sequencing sound takes taste and restraint, and two is hard to get wrong).
The opening is the host's to show (the Reader's Create mode lists the
writer's choice and every piece or atmosphere); the change partway through is
an attachment on its word, so an edit that replaces the word flags it like any
other.

`SOUND_CUE_RULES` and `soundCueWordIssue` (`src/audio/soundCueRules.ts`) hold
the Sound Cue rules. Word edges come from `src/narrative/words.ts`, which
follows each language's own word rules.

Who enforces them:

- **A person placing a cue** creates the finished attachment directly, so the
  rules apply as they select: a selection widens to its whole words, a longer
  one leaves Cue dimmed with its reason, and a full chapter refuses another
  cue (a placed cue can still change its sound). An edit that glues letters
  onto a placed cue's word ("sword" → "swords") flags it like any edit that
  changes its words.
- **The model** supplies semantic direction — what happens, and where — never
  assets or attachment addresses. The HARNESS resolves that direction into a
  finished attachment and enforces these rules there.
- **The writer** puts a sound tag on the words where a sound happens
  (`[[sound: blade drawn | drew his sword | high]]`). The HARNESS keeps the
  words, widens a tag that starts or ends inside a word to its whole words,
  and sets aside one that runs past eight words or past the chapter's ten.

## Behavior and limitations

- The popup measures its current contents before painting, centers below the visible
  selection on touch devices (above on desktop), and uses the other side when space requires it. Submenus keep
  their side while they fit. Selection handles retain their touch clearance; editing
  controls sit closer to the draft. Large menus scroll within available space. If
  the selection fills the screen, a compact bottom tray keeps actions reachable
  (some selected text may then sit behind it). Layout follows scrolling, resizing,
  and the visual viewport; the opening fade respects reduced motion.

- Select within one paragraph; Edit makes only the selected text editable in place.
  The draft is an isolated plain-text span; surrounding prose stays read-only.
  Save changes only that range. HTML is literal text, and newlines remain inside
  the same paragraph. An empty block keeps its ID and visible line space.
- The default highlight is saturated violet `rgba(144, 85, 255, .6)` (#9055ff). Override
  `--sen-passage-highlight` through the component's `style` prop to affect both
  the live selection overlay and inline draft highlight. The Workshop preview
  has a color picker for trying alternatives; it preserves the current selection
  while the swatch is used and is not part of the SEN UI.
  Attachment overlays use saturated blue (Sound Cues), red (Soundscapes), and
  amber (Atmospheres). Blue and red use 60% opacity; amber uses 45% so light
  prose stays readable. The shared palette also colors the overlay legend in
  the Reader's Create mode and the Workshop.
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
  placement; an Edit that changes a cue's words flags it into the inspector
  (it comes off the page) instead of moving it.
  Cue choices and edits last only for that preview session.
- Editable prose uses `user-select: none` and engine-owned input. Mouse drag selects
  exact characters, double-click selects a word, and triple-click selects a paragraph.
  A 450ms touch/pen hold opens a compact Select text gate without highlighting.
  Tapping Select text selects the held word and opens the normal actions and handles.
  Outside taps, scrolling, Escape, source changes, or sealing dismiss the gate.
  Movement before the hold cancels it so ordinary swipes scroll. Drag our handles to adjust either end; edges stop at the
  other edge and stay within one paragraph. A drag near the viewport edge scrolls.
  Host-supplied native ranges (including the lab's sentence picker) are captured
  and immediately cleared. The saved `PassageSelection` contract is unchanged.
- Each editable paragraph is keyboard-focusable: Enter selects its first word,
  Shift+arrows extends by whole characters, Ctrl/Command+Shift+arrows by word edges,
  Shift+Home/End to the paragraph edges, and Ctrl/Command+A selects the paragraph.
  Older hosts without `Intl.Segmenter` retain selection with a Unicode code-point
  fallback that keeps combining marks and common emoji sequences together.
  Arrow keys and Home/End also adjust a focused range handle. Copy works through
  the bar and Ctrl/Command+C. Selection changes are announced to assistive technology.
  Fixed prose, inline audio controls, and the inline editor retain native behavior.
- Automated gesture checks cover real Chromium touch streams and Chromium/WebKit
  mouse/keyboard input. Physical iPhone Safari still needs a hold → handle drag →
  Copy → Edit check, including scrolling, pinch zoom, and the virtual keyboard;
  desktop WebKit emulation cannot prove the absence of OS selection UI.
- No undo stack for replacements, persistence, sealing, networking, or AI.
  Future hosts own those policies and must not treat local
  callbacks as finalizing chapter content. Reload resets the Workshop prose.

## Verification and transfer

Run `npm exec -- vitest run src/components/highlight-engine`,
`npm run test:workshop`, `npm run typecheck`, `npm run check:ownership`,
`npm run test:package`, and `npm run build`.

With Vite running, `node scripts/verifyHighlightEngine.mjs` runs isolated
Chromium desktop/phone/tablet and WebKit phone/tablet checks; install those Playwright
browser binaries first if needed. It writes screenshots and a results JSON to
`output/playwright/highlight-engine/`. A desktop drag uses real mouse
events; mobile tests use scripted ranges and actual tap events.
On Windows, WebKit cases explicitly report `blocked` if its measured viewport
differs from the requested width; this local DPI mismatch also misdirects native
taps. A blocked case is not a pass. Run those cases on a compatible runner for
WebKit evidence; the Chromium cases remain independently verified.
The Linux CI job runs all five browser cases and uploads their screenshots and
results as `highlight-engine-browser-evidence`.
`node scripts/verifyHighlightSelection.mjs` adds owned-selection gesture regressions
to that evidence: ordinary swipe, hold, handle drag across lines, mouse drag,
double-click, keyboard selection, Copy, native-range absence, and editing. CI runs both.

Consumers import the package entry and SEN stylesheet. For a source transfer,
carry `development/` and `shared/` (excluding tests), the public barrel and its
export/ownership registration. React, React DOM and `@seihouse/ui` are existing
package peers. Keep Workshop hosting, dummy prose and
browser evidence out of the consuming surface. No integration was performed.

## Workshop history

- **2026-10-28:** With the owner's approval, removed the placeholder `reference/README.md` and the Original Reference note pane (this primitive never had a production copy). The workspace now shows Development alone.

- **2026-10-25:** Extended both endpoint stems through the measured height of their selected line, keeping the dots, outside touch targets, and drag anchors unchanged.

- **2026-10-25:** Touch popups now prefer below the highlight for easier reach, retaining above as the space-constrained fallback and keeping submenu anchoring stable.

- **2026-10-25:** Reworked popup positioning for the single owned selection menu: measured size, centered above-first placement, stable submenu anchoring, viewport-aware scrolling limits, a compact fallback for screen-filling selections, and a reduced-motion-aware opening fade.

- **2026-10-25:** Changed popup surfaces to rich black with quieter charcoal borders and dividers, shared by the Select text gate and action menus.

- **2026-10-25:** Completed popup menu icons for Back, Audio, Cue, Soundscape, Atmosphere, Save, Undo, and Delete Passage, including removal entries. Continued the same custom icon family; widened desktop controls for the added icons and allowed long removal labels to wrap on phones.

- **2026-10-25:** Added custom Edit, Copy, Media, and Remove glyphs after inspecting the existing 33-icon catalog and Library adapters (no exact matches). The local SVGs follow its monochrome silhouettes and cutout details without importing Library artwork into SEN. Host actions can supply decorative icons; labels and behavior stay intact.

- **2026-10-25:** Pointed the start cap upward above the first line and the end cap downward below the last line; updated drag anchors, viewport checks, and menu clearance for both directions.

- **2026-10-25:** Added the touch/pen Select text gate before selection and the regular action menu; mouse dragging and keyboard selection stay direct.

- **2026-10-25:** Refined selection end caps to 10px dots with short 8px stems and no outer ring, retaining the 44px touch targets and keyboard adjustment.

- **2026-10-24:** Fixed highlights disappearing on release after a click outside
  the prose. Starting an engine selection now retires any previous browser caret,
  including one outside the engine. Added repeated mouse, touch and keyboard
  regressions plus real desktop browser coverage of the outside-click sequence.
- **2026-10-21:** Create mode now owns selection gestures and its range handles,
  eliminating the simultaneous native selection in editable prose. Added Copy,
  keyboard selection and screen-reader guidance; preserved native scrolling and
  inline editing. The app and Workshop share the same engine and input adapter.
- **2026-10-21:** Strengthened selection and attachment highlight saturation and
  opacity to avoid muddy colors on dark pages, with lower amber opacity to
  preserve text contrast. Updated the existing Workshop color picker to match.

- **2026-10-13 (one overlay per sound):** From SENSEI: each sound gets its own overlay, never one Audio overlay bundling them. The Overlays switch is now **Off / Audio**, and Audio opens its own row of **Sound Cues / Soundscapes / Atmospheres** (`MANUSCRIPT_OVERLAY_GROUPS`; later kinds of tagging join as categories of their own), each tinting only its kind: Sound Cues blue, soundscapes red, atmospheres yellow. Soundscapes and Atmospheres also mark the chapter's first word, where its opening begins (`openingSoundMark(manuscript, kind)`). Media → Audio → Soundscape or Atmosphere on a word in the chapter's first sentence now chooses the chapter's opening, locked at the start, with the writer's choice first in the list (`SoundtrackChoices.opening`, `isChapterOpening`); anywhere after, it places the one change as before.
- **2026-10-12 (soundscapes and atmospheres):** From SENSEI: the music (soundscape), the atmosphere and Sound Cues are three separate sounds. Media → Audio now offers **Cue**, **Soundscape** and **Atmosphere**: the last two place the chapter's one change of music or of atmosphere on the first word of the selection, from a list of the exact pieces or atmospheres (with the host's preview); placing one where one already is moves it. Remove mode removes them. The Overlays switch's second mode is now **Audio** (it was Cues) and tints all three kinds, each in its own color (Sound Cues blue, soundscape changes violet, atmosphere changes green). `soundCueActions` is now `audioActions`, which takes the host's `soundtrack` choices. A submenu in one row is now as wide as its labels: at 120px the three Audio actions overlapped, and a click could land on the wrong one. The lab offers the Library's own pieces and atmospheres.
- **2026-10-12 (renamed):** From SENSEI: the Text Highlight Engine is now the **Highlight Engine**, because the same engine will highlight images for sequential art, not only text. Its folder (`src/components/highlight-engine/`), component (`HighlightEngine`, `HighlightEngineProps`), package entry (`@seihouse/sen/highlight-engine`), Workshop route (`?preview=highlight-engine`) and browser check (`scripts/verifyHighlightEngine.mjs`) are renamed. The prose surface keeps its text names (see above). Earlier entries keep the old name.
- **2026-10-12 (cue previews through the Reader's mixer):** SENSEI reported a placed cue that would not play although its preview had. The preview played through the host's single-channel player and the placed cue through the reader mixer, two different routes; the app has no single-channel player at all, so its Create mode picker could not open. With a reader mixer the Cue Picker now previews through it, exactly as the placed cue will play, and says "Audio preview is unavailable" when the mixer will not or cannot play it; without one it keeps the single-channel player. A cue that failed now shows why when hovered.
- **2026-10-12:** The lab's authoring tools are now SEN's, shared with the HARNESS Reader's Create mode:
  `ManuscriptAuthoring.tsx` (the Overlays switch and its key, and `soundCueActions`: Media → Audio →
  Cue and Remove cue here) and `shared/overlayModes.ts` (`structurePins`, `attachmentMarks`, one color
  per kind), moved from the Workshop folder without changing what they do. A host may set the page's
  `wordLimit` (`createManuscript`, `applyPassageEdit`); the lab keeps the prototype's 500 words, and the
  Reader sets none, since a chapter is longer.
- **2026-10-10:** A paragraph's line height follows `--sen-text-line-height` (a multiple of the
  text size; 1.85 without it, as before), so a host's line spacing reaches the paragraphs. The
  HARNESS Reader sets it from Reader Settings → Text.
- **2026-10-04:** Sound Cues fit 1–8 whole words (the owner's decision), for a
  cue placed by hand and one the writer tags alike, so a writer's natural
  phrase ("a horn blared across the terrace") keeps its sound.
- **2026-09-29:** The Cue Picker shows each recording's sound word, cue
  category (its Studio parent tag) and child tags ("blade drawn · weapons ·
  high"), and search also finds sound words. Browsing, numbering and filters
  are unchanged.
- **2026-09-28:** The Action Bar gained its Remove mode: right-click, the
  ContextMenu key or Shift+F10 (and the touch bar's Remove row) open Undo, the
  host's removals and Delete Passage, and an unavailable action now stays
  visible with its reason. Sound Cues follow the finished-attachment rules: 1–5
  whole words (selections snap outward, "Somewher" → "Somewhere"), at most 10 per
  chapter, words only — the Sentence and Paragraph choices are gone. Soundscape
  rules (passage-level, at most 2) are written down for when they are built.
  Today's generation path drops mid-word or over-long resolved cues and keeps
  ten, as short-term safety ahead of the semantic-intent contract.
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

# Text Highlight Engine

SEN-owned plain-text selection and local editing. No Reader, chapter, generation,
translation, Library, storage, or server dependency.

- Created: **2026-09-26**; last Workshop update: **2026-09-27**
- Lifecycle: active standalone V1 prototype
- Source: this Development repository; no production replica or source comparison
- Workshop: `?preview=text-highlight-engine`
- Package: `@seihouse/sen/text-highlight-engine`

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

`PassageSelection` contains `blockId`, `selectedText`, `startOffset`, `endOffset`.
Offsets use UTF-16 code units into the unmodified block text: start inclusive,
end exclusive. Whitespace is not trimmed from valid selections or replacements.
The browser adapter normalizes selection immediately. No live Range is canonical
state; temporary ranges supply geometry. The edit session also retains the
original block text to reject stale replacements.

Public lower-level exports: `normalizePassageSelection`, `isValidPassage`,
`replacePassage`, `passageRange`, and `usePassageSelection`. Custom host renderers
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

## Behavior and limitations

- Select within one paragraph; Edit makes only the selected text editable in place.
  The draft is an isolated plain-text span; surrounding prose stays read-only.
  Save changes only that range. HTML is literal text, and newlines remain inside
  the same paragraph. An empty block keeps its ID and visible line space.
- Soft yellowish gold is `rgba(242, 207, 102, .35)`. Override
  `--sen-passage-highlight` through the component's `style` prop to affect both
  the live selection overlay and inline draft highlight. The Workshop preview
  has a color picker for trying alternatives; it preserves the current selection
  while the swatch is used and is not part of the SEN UI.
- Empty input disables Save and reveals Delete Passage. Deletion requires that
  explicit action. Undo restores the exact previous block; there is no timer.
  Only one deletion is retained. Another deletion replaces it; a committed edit
  or external text change to that same block invalidates it. Other blocks can
  change without losing Undo. This is local memory, not persisted deletion.
- Escape or outside pointer activation discards an unsaved draft. Save never
  runs on blur. Successful edits clear selection and restore focus to the block.
- Collapsed, whitespace-only, outside-root, multi-range and cross-block
  selections offer no Edit action. Browser selection ending in another
  paragraph is cross-block even if it visually resembles a whole-paragraph selection.
- Text editing remains plain text only. Inline glyph buttons and joiners are
  excluded from selection offsets, so their presence does not shift the
  `PassageSelection`. Rich-text editing, formatting, and cross-paragraph editing
  are not supported.
- Manual cue placement uses the current resolved-audio occurrence format.
  Overlapping instances of the same selected phrase cannot be represented
  exactly and are rejected instead of attaching a cue to another occurrence.
  Hosts can pass occupied selections to reject a new cue that would overlap an
  existing placement; the Workshop does so.
  In the Workshop, a preceding Edit rebases a placement; an Edit that changes
  its anchored text removes it. Cue choices and edits last only for that
  preview session.
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

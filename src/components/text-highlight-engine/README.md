# Text Highlight Engine

SEN-owned plain-text selection and local editing. No Reader, chapter, generation,
translation, Library, storage, or server dependency.

- Created / last Workshop update: **2026-09-26**
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
blocks. `onSelectionChange(selection | null)` is the minimal future capability
boundary; there is no action registry or hidden future UI.

`PassageSelection` contains `blockId`, `selectedText`, `startOffset`, `endOffset`.
Offsets use UTF-16 code units into the unmodified block text: start inclusive,
end exclusive. Whitespace is not trimmed from valid selections or replacements.
The browser adapter normalizes selection immediately. No live Range is canonical
state; temporary ranges supply geometry. The edit session also retains the
original block text to reject stale replacements.

Public lower-level exports: `normalizePassageSelection`, `isValidPassage`,
`replacePassage`, `passageRange`, and `usePassageSelection`. Custom host renderers
using the hook must attach its `rootRef`, mark plain-text blocks with
`data-sen-text-block="stable-id"`, attach `controlsRef` to their controls, and use
the returned `beginEdit`/`clear` lifecycle. Rendered `textContent` must match the
supplied block text exactly. The ready-made component handles this itself.

## Behavior and limitations

- Select within one paragraph; Edit opens a prefilled replacement textarea.
  Save changes only that range. HTML is literal text, and newlines remain inside
  the same paragraph. An empty block keeps its ID and visible line space.
- Soft yellowish gold is `rgba(242, 207, 102, .35)`. Override
  `--sen-passage-highlight` through the component's `style` prop to affect both
  native selection and the retained editing highlight.
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
- Plain text only. Inline text nodes are supported by the adapter, but rich-text
  rendering, formatting, embedded media, and cross-paragraph editing are not.
- Native touch selection remains browser-owned. Automated mobile tests cover
  touch activation after a scripted range; they do not prove OS long-press menus,
  physical selection handles, or virtual-keyboard behavior on real devices.
- No undo stack for replacements, persistence, sealing, reference/media checks,
  networking, or AI. Future hosts own those policies and must not treat local
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

Consumers import the package entry and SEN stylesheet. For a source transfer,
carry `development/` and `shared/` (excluding tests), the public barrel and its
export/ownership registration. React, React DOM and `@seihouse/ui` are existing
package peers. Keep Workshop hosting, dummy prose, reference documentation and
browser evidence out of the consuming surface. No integration was performed.

## Workshop history

- **2026-09-26:** Created normalized selection contracts, validated local range
  replacement, minimal Edit/Save, soft gold selection, explicit Delete Passage
  and guarded Undo, with an independent four-paragraph preview.

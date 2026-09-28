/**
 * The named parts of the Text Highlight Engine and its Workshop lab, for the
 * Parts board: each can be sent to an agent as one self-contained brief.
 * Keep in step with the README's Anatomy section.
 */
export interface EnginePart {
  name: string;
  owns: string;
  files: readonly string[];
}

const DEV = 'src/components/text-highlight-engine/development';
const SHARED = 'src/components/text-highlight-engine/shared';
const LAB = 'src/workshop/previews/text-highlight-engine';

export const ENGINE_PARTS: readonly EnginePart[] = [
  { name: 'Text Highlight Engine', owns: 'puts the parts together over the host’s paragraphs and owns the edit and undo records it reports', files: [`${DEV}/TextHighlightEngine.tsx`] },
  { name: 'Selection Tracker', owns: 'reads the browser selection, keeps the one canonical selection with its paragraph and exact positions, measures it on screen, clears it (Escape, outside tap), moves the first Tab into the Action Bar, and opens Remove mode (right-click, selecting the word under the pointer if nothing is selected; the ContextMenu key; Shift+F10)', files: [`${DEV}/useSelectionTracker.ts`, `${SHARED}/selection.ts`, `${DEV}/measure.ts`] },
  { name: 'Selection Highlight', owns: 'the tinted marks drawn over the selected words', files: [`${DEV}/SelectionHighlight.tsx`, `${DEV}/text-highlight-engine.css`] },
  { name: 'Action Bar', owns: 'the one floating bar for a selection, with two faces. Add: Edit, the nested Media actions, Back, an action’s panel, and Save / Delete Passage while editing. Remove: Undo, the host’s removals (Remove cue here) and Delete Passage, as a vertical list with removals in red. An unavailable action stays visible, dimmed, with its reason. Its position, touch sizing and labels; on touch screens it stacks vertically, ends with a Remove row, and keeps clear of the phone’s own selection menu', files: [`${DEV}/ActionBar.tsx`, `${SHARED}/actions.ts`, `${DEV}/text-highlight-engine.css`] },
  { name: 'Inline Editor', owns: 'the plain-text draft that replaces only the selected words inside their paragraph, including line breaks and typing in other scripts', files: [`${DEV}/InlineEditor.tsx`] },
  { name: 'Overlay Layer', owns: 'drawing a host’s overlay with the prose without covering a word — tints behind the text (like every placed cue, with a dashed underline where one needs a decision), paragraph numbers in the margin and small raised sentence numbers in the line spacing — without taking taps or changing the text, and doing no work while off', files: [`${DEV}/OverlayLayer.tsx`, `${SHARED}/overlay.ts`, `${DEV}/measure.ts`] },
  { name: 'Undo Notice', owns: 'the “Passage deleted · Undo” message after an explicit deletion', files: [`${DEV}/UndoNotice.tsx`] },
  { name: 'Cue Picker', owns: 'choosing, previewing and placing a Sound Cue from the host catalog, with category filter and search, on 1–5 whole words only (a selection snaps to its words), at most 10 per chapter', files: [`${DEV}/ManualCuePicker.tsx`, `${DEV}/manual-cue-picker.css`, `${SHARED}/manualCue.ts`] },
  { name: 'Placement Rules', owns: 'what a finished attachment may be, per kind of effect: a Sound Cue sits on 1–5 whole words, at most 10 per chapter (Soundscapes, not built yet: passage-level only, at most 2), plus word edges for any language. Manual placement meets these as a person selects; the HARNESS enforces them when it resolves model direction', files: ['src/audio/soundCueRules.ts', 'src/narrative/words.ts'] },
  { name: 'Manuscript', owns: 'the plain page under the prose: permanent paragraph and sentence IDs, saved sentences, paragraph / sentence / span anchors, the one edit rule for attachments, and draft / sealed', files: [`${SHARED}/manuscript.ts`] },
  { name: 'Manuscript Inspector', owns: 'the lab panel under the page: the selection’s address (with the model’s P/S form of it), every attachment with its status, and the saved page structure', files: [`${LAB}/ManuscriptInspector.tsx`] },
  { name: 'Manuscript Lab', owns: 'the Workshop page itself: the sample paragraphs, the Cue attach levels, the Overlays switch and its key (one color per kind of effect: Sound Cues blue), Reset sample and Seal chapter', files: [`${LAB}/TextHighlightEngineWorkspace.tsx`, `${LAB}/previewData.ts`, `${LAB}/overlays.ts`] },
];

export const partBrief = (part: EnginePart) =>
  `Text Highlight Engine › ${part.name} — owns ${part.owns}. Files: ${part.files.join(', ')}. Audit for: accessibility, viewport, power use, look & feel.`;

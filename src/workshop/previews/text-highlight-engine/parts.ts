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
  { name: 'Selection Tracker', owns: 'reads the browser selection, keeps the one canonical selection with its paragraph and exact positions, measures it on screen, clears it (Escape, outside tap), and moves the first Tab into the Action Bar', files: [`${DEV}/useSelectionTracker.ts`, `${SHARED}/selection.ts`, `${DEV}/measure.ts`] },
  { name: 'Selection Highlight', owns: 'the tinted marks drawn over the selected words', files: [`${DEV}/SelectionHighlight.tsx`, `${DEV}/text-highlight-engine.css`] },
  { name: 'Action Bar', owns: 'the one floating bar for a selection: Edit, the nested Media actions, Back, an action’s panel, and Save / Delete Passage while editing; its position, touch sizing and labels. On touch screens it stacks vertically and keeps clear of the phone’s own selection menu', files: [`${DEV}/ActionBar.tsx`, `${SHARED}/actions.ts`, `${DEV}/text-highlight-engine.css`] },
  { name: 'Inline Editor', owns: 'the plain-text draft that replaces only the selected words inside their paragraph, including line breaks and typing in other scripts', files: [`${DEV}/InlineEditor.tsx`] },
  { name: 'Overlay Layer', owns: 'drawing a host’s overlay with the prose without covering a word — tints behind the text (like every placed cue, with a dashed underline where one needs a decision), paragraph numbers in the margin and small raised sentence numbers in the line spacing — without taking taps or changing the text, and doing no work while off', files: [`${DEV}/OverlayLayer.tsx`, `${SHARED}/overlay.ts`, `${DEV}/measure.ts`] },
  { name: 'Undo Notice', owns: 'the “Passage deleted · Undo” message after an explicit deletion', files: [`${DEV}/UndoNotice.tsx`] },
  { name: 'Cue Picker', owns: 'choosing, previewing and placing a Sound Cue from the host catalog, with category filter and search', files: [`${DEV}/ManualCuePicker.tsx`, `${DEV}/manual-cue-picker.css`, `${SHARED}/manualCue.ts`] },
  { name: 'Manuscript', owns: 'the plain page under the prose: permanent paragraph and sentence IDs, saved sentences, paragraph / sentence / span anchors, the one edit rule for attachments, and draft / sealed', files: [`${SHARED}/manuscript.ts`] },
  { name: 'Manuscript Inspector', owns: 'the lab panel under the page: the selection’s address (with the model’s P/S form of it), every attachment with its status, and the saved page structure', files: [`${LAB}/ManuscriptInspector.tsx`] },
  { name: 'Manuscript Lab', owns: 'the Workshop page itself: the sample paragraphs, the Cue attach levels, the Overlays switch and its key (one color per kind of effect: Sound Cues blue), Reset sample and Seal chapter', files: [`${LAB}/TextHighlightEngineWorkspace.tsx`, `${LAB}/previewData.ts`, `${LAB}/overlays.ts`] },
];

export const partBrief = (part: EnginePart) =>
  `Text Highlight Engine › ${part.name} — owns ${part.owns}. Files: ${part.files.join(', ')}. Audit for: accessibility, viewport, power use, look & feel.`;

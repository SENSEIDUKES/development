/**
 * The named parts of the Highlight Engine and its Workshop lab, for the
 * Parts board: each can be sent to an agent as one self-contained brief.
 * Keep in step with the README's Anatomy section.
 */
export interface EnginePart {
  name: string;
  owns: string;
  files: readonly string[];
}

const DEV = 'src/components/highlight-engine/development';
const SHARED = 'src/components/highlight-engine/shared';
const LAB = 'src/workshop/previews/highlight-engine';

export const ENGINE_PARTS: readonly EnginePart[] = [
  { name: 'Highlight Engine', owns: 'puts the parts together over the host’s paragraphs and owns the edit and undo records it reports', files: [`${DEV}/HighlightEngine.tsx`] },
  { name: 'Selection Tracker', owns: 'owns mouse, touch and keyboard selection while editable, keeps canonical paragraph offsets without a native range, measures them, clears on Escape or outside tap, moves Tab into actions, and opens Remove on right-click, ContextMenu or Shift+F10; fixed prose still reads browser selections', files: [`${DEV}/useSelectionTracker.ts`, `${DEV}/useSelectionInput.ts`, `${SHARED}/selection.ts`, `${DEV}/measure.ts`] },
  { name: 'Selection Highlight', owns: 'the tinted marks and two 44px range handles, adjustable by touch, mouse or keyboard', files: [`${DEV}/SelectionHighlight.tsx`, `${DEV}/SelectionHandles.tsx`, `${DEV}/highlight-engine.css`] },
  { name: 'Action Bar', owns: 'the one floating bar. Add: Edit, Copy, nested Media actions, Back, an action panel, Save / Delete Passage while editing. Remove: Undo, host removals and Delete Passage, in red. Unavailable actions explain why. Touch buttons stack vertically and end with Remove. The bar stays clear of our handles and hides during dragging', files: [`${DEV}/ActionBar.tsx`, `${SHARED}/actions.ts`, `${DEV}/highlight-engine.css`] },
  { name: 'Inline Editor', owns: 'the plain-text draft that replaces only the selected words inside their paragraph, including line breaks and typing in other scripts', files: [`${DEV}/InlineEditor.tsx`] },
  { name: 'Overlay Layer', owns: 'drawing a host’s overlay with the prose without covering a word — tints behind the text (like every placed cue, with a dashed underline where one needs a decision), paragraph numbers in the margin and small raised sentence numbers in the line spacing — without taking taps or changing the text, and doing no work while off', files: [`${DEV}/OverlayLayer.tsx`, `${SHARED}/overlay.ts`, `${DEV}/measure.ts`] },
  { name: 'Undo Notice', owns: 'the “Passage deleted · Undo” message after an explicit deletion', files: [`${DEV}/UndoNotice.tsx`] },
  { name: 'Cue Picker', owns: 'choosing, previewing and placing a Sound Cue from the host catalog, with category filter and search, on 1–8 whole words only (a selection snaps to its words), at most 10 per chapter', files: [`${DEV}/ManualCuePicker.tsx`, `${DEV}/manual-cue-picker.css`, `${SHARED}/manualCue.ts`] },
  { name: 'Soundtrack Change Picker', owns: 'choosing a piece of music or an atmosphere, with the host’s preview, for the chapter’s one change of each on the word where it begins; its option list also serves the opening choice', files: [`${DEV}/SoundtrackChangePicker.tsx`, 'src/audio/soundtrackChanges.ts'] },
  { name: 'Placement Rules', owns: 'what a finished attachment may be, per kind of effect: a Sound Cue sits on 1–8 whole words, at most 10 per chapter (a soundscape change or an atmosphere change sits on the one word where it begins, at most 2 of each including the chapter’s opening), plus word edges for any language. Manual placement meets these as a person selects; the HARNESS enforces them when it resolves model direction', files: ['src/audio/soundCueRules.ts', 'src/narrative/words.ts'] },
  { name: 'Manuscript', owns: 'the plain page under the prose: permanent paragraph and sentence IDs, saved sentences, paragraph / sentence / span anchors, the one edit rule for attachments, and draft / sealed', files: [`${SHARED}/manuscript.ts`] },
  { name: 'Manuscript Inspector', owns: 'the lab panel under the page: the selection’s address (with the model’s P/S form of it), every attachment with its status, and the saved page structure', files: [`${LAB}/ManuscriptInspector.tsx`] },
  { name: 'Authoring', owns: 'what the lab and the Reader’s Create mode share: the Overlays switch and its key (one color per kind of effect: Sound Cues blue), the page’s P/S numbering pins, and the Sound Cue actions (Media → Audio → Cue, Remove cue here)', files: [`${DEV}/ManuscriptAuthoring.tsx`, `${SHARED}/overlayModes.ts`] },
  { name: 'Manuscript Lab', owns: 'the Workshop page itself: the sample paragraphs, Reset sample and Seal chapter', files: [`${LAB}/HighlightEngineWorkspace.tsx`, `${LAB}/previewData.ts`] },
];

export const partBrief = (part: EnginePart) =>
  `Highlight Engine › ${part.name} — owns ${part.owns}. Files: ${part.files.join(', ')}. Audit for: accessibility, viewport, power use, look & feel.`;

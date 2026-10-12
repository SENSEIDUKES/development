import '../../components/highlight-engine/development/highlight-engine.css';
export { HighlightEngine, type HighlightEngineProps } from '../../components/highlight-engine/development/HighlightEngine';
export {
  useSelectionTracker, usePassageSelection, type ActionBarMode, type PassageRectangle, type SelectionTrackerOptions,
} from '../../components/highlight-engine/development/useSelectionTracker';
export {
  normalizePassageSelection, replacePassage, isValidPassage, passageRange, passageOffsetAt,
  type PassageSelection, type PassageEdit, type TextHighlightBlock,
} from '../../components/highlight-engine/shared/selection';
export type { PassageAction } from '../../components/highlight-engine/shared/actions';
export {
  createManualSoundCue, snapSoundCueSelection, type ManualCueResult, type SoundCueSelection,
} from '../../components/highlight-engine/shared/manualCue';
export { ManualCuePicker, type ManualCuePickerProps } from '../../components/highlight-engine/development/ManualCuePicker';
export {
  MANUSCRIPT_PROTOTYPE_WORD_LIMIT, createManuscript, createManuscriptId, insertParagraph, splitSentences, countManuscriptWords,
  resolveAnchor, locateSelection, anchorAtLevel, sameAnchorTarget,
  applyPassageEdit, placeAttachment, removeAttachment, keepAttachment, flaggedAttachments, sealManuscript,
  type Manuscript, type ManuscriptParagraph, type ManuscriptSentence, type ManuscriptIdFactory, type ManuscriptOptions,
  type ManuscriptAnchor, type ManuscriptAnchorLevel, type ManuscriptAnchorResolution, type ManuscriptAddress,
  type ManuscriptAttachment, type ManuscriptState, type ManuscriptEditResult,
} from '../../components/highlight-engine/shared/manuscript';
export type { OverlayMark, OverlayPin, TextHighlightOverlay } from '../../components/highlight-engine/shared/overlay';
export {
  ATTACHMENT_COLORS, OVERLAY_KINDS, attachmentMarks, structurePins, type ManuscriptOverlayMode,
} from '../../components/highlight-engine/shared/overlayModes';
export {
  ManuscriptOverlaySwitch, placedSoundCue, placedSoundCues, audioActions,
} from '../../components/highlight-engine/development/ManuscriptAuthoring';
export {
  SoundtrackChangePanel, SoundtrackOptionList, SOUNDTRACK_KIND_WORDS, soundtrackChangeAnchor, soundtrackChangeOf, soundtrackOptionLabel, soundtrackOptions,
  type SoundtrackChoices, type SoundtrackOption,
} from '../../components/highlight-engine/development/SoundtrackChangePicker';

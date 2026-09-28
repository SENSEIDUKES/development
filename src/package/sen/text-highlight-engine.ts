import '../../components/text-highlight-engine/development/text-highlight-engine.css';
export { TextHighlightEngine, type TextHighlightEngineProps } from '../../components/text-highlight-engine/development/TextHighlightEngine';
export { useSelectionTracker, usePassageSelection, type PassageRectangle } from '../../components/text-highlight-engine/development/useSelectionTracker';
export { normalizePassageSelection, replacePassage, isValidPassage, passageRange, type PassageSelection, type PassageEdit, type TextHighlightBlock } from '../../components/text-highlight-engine/shared/selection';
export type { PassageAction } from '../../components/text-highlight-engine/shared/actions';
export { createManualCueMoment, type ManualCueResult } from '../../components/text-highlight-engine/shared/manualCue';
export { ManualCuePicker, type ManualCuePickerProps } from '../../components/text-highlight-engine/development/ManualCuePicker';
export {
  MANUSCRIPT_PROTOTYPE_WORD_LIMIT, createManuscript, createManuscriptId, insertParagraph, splitSentences, countManuscriptWords,
  resolveAnchor, locateSelection, anchorAtLevel, sameAnchorTarget,
  applyPassageEdit, placeAttachment, removeAttachment, keepAttachment, flaggedAttachments, sealManuscript,
  type Manuscript, type ManuscriptParagraph, type ManuscriptSentence, type ManuscriptIdFactory, type ManuscriptOptions,
  type ManuscriptAnchor, type ManuscriptAnchorLevel, type ManuscriptAnchorResolution, type ManuscriptAddress,
  type ManuscriptAttachment, type ManuscriptState, type ManuscriptEditResult,
} from '../../components/text-highlight-engine/shared/manuscript';
export type { OverlayMark, OverlayPin, TextHighlightOverlay } from '../../components/text-highlight-engine/shared/overlay';

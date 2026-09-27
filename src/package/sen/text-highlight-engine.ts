import '../../components/text-highlight-engine/development/text-highlight-engine.css';
export { TextHighlightEngine, type TextHighlightEngineProps } from '../../components/text-highlight-engine/development/TextHighlightEngine';
export { usePassageSelection, type PassageRectangle } from '../../components/text-highlight-engine/development/usePassageSelection';
export { normalizePassageSelection, replacePassage, isValidPassage, passageRange, type PassageSelection, type PassageEdit, type TextHighlightBlock } from '../../components/text-highlight-engine/shared/selection';
export type { PassageAction } from '../../components/text-highlight-engine/shared/actions';
export { createManualCueMoment, type ManualCueResult } from '../../components/text-highlight-engine/shared/manualCue';
export { ManualCuePicker, type ManualCuePickerProps } from '../../components/text-highlight-engine/development/ManualCuePicker';

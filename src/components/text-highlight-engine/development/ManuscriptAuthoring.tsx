import type { SoundCueAttachment } from '../../../audio/inlineAudio';
import { SOUND_CUE_KIND } from '../../../audio/inlineAudio';
import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import type { MediaCatalog } from '../../../audio/media';
import { snapSoundCueSelection } from '../shared/manualCue';
import {
  anchorAtLevel, placeAttachment, removeAttachment, resolveAnchor, sameAnchorTarget,
  type ManuscriptAttachment, type ManuscriptState,
} from '../shared/manuscript';
import type { PassageAction } from '../shared/actions';
import type { PassageSelection } from '../shared/selection';
import type { TextHighlightOverlay } from '../shared/overlay';
import { ATTACHMENT_COLORS, OVERLAY_KINDS, type ManuscriptOverlayMode } from '../shared/overlayModes';
import { ManualCuePicker } from './ManualCuePicker';

/** Any page's state: Sound Cues sit among attachments of other kinds (speakers, holdings), which they leave alone. */
type AuthoringState = ManuscriptState<unknown>;
type Attachment = ManuscriptAttachment<unknown>;

const soundCues = (state: AuthoringState) => state.attachments.filter(attachment => attachment.kind === SOUND_CUE_KIND);

/** A Sound Cue the page can show: still on its words. An edited or detached one is flagged instead. */
export function placedSoundCue(state: AuthoringState, attachment: Attachment): SoundCueAttachment | undefined {
  if (attachment.kind !== SOUND_CUE_KIND || attachment.anchor.level !== 'span') return undefined;
  return resolveAnchor(state.manuscript, attachment.anchor).status === 'placed' ? attachment as SoundCueAttachment : undefined;
}

/** Every Sound Cue still on its words. */
export const placedSoundCues = (state: AuthoringState): SoundCueAttachment[] =>
  state.attachments.flatMap(attachment => { const cue = placedSoundCue(state, attachment); return cue ? [cue] : []; });

/**
 * The Sound Cue a selection would hold (its whole words, and the cue already
 * on them) or why it cannot hold one. A person meets the finished-cue rules as
 * they select: 1–8 whole words, at most ten in the chapter.
 */
function soundCueTarget(state: AuthoringState, selection: PassageSelection): { selection: PassageSelection; existing?: Attachment } | { reason: string } {
  const paragraph = state.manuscript.paragraphs.find(candidate => candidate.id === selection.blockId);
  const snapped = paragraph && snapSoundCueSelection(paragraph, selection, state.manuscript.locale);
  if (!snapped || !snapped.ok) return { reason: snapped?.reason === 'too-many-words' ? `Sound Cues fit 1–${SOUND_CUE_RULES.maxWords} words` : 'Select a word' };
  const anchor = anchorAtLevel(state.manuscript, snapped.selection, 'span');
  const cues = soundCues(state);
  const existing = anchor && cues.find(attachment => sameAnchorTarget(attachment.anchor, anchor));
  // A cue already on these words can still take another sound, even with the chapter full.
  if (!existing && cues.length >= SOUND_CUE_RULES.maxPerChapter) return { reason: `${cues.length} of ${SOUND_CUE_RULES.maxPerChapter} Sound Cues placed` };
  return { selection: snapped.selection, existing };
}

/** The placed Sound Cues whose words a selection touches. */
const cuesUnder = (state: AuthoringState, selection: PassageSelection) => soundCues(state).filter(attachment => {
  const resolution = resolveAnchor(state.manuscript, attachment.anchor);
  return resolution.status === 'placed' && resolution.selection.blockId === selection.blockId
    && resolution.selection.startOffset < selection.endOffset && resolution.selection.endOffset > selection.startOffset;
});

function CueAttachPanel({ state, selection, catalog, onPlace, onRemove, onClose }: {
  state: AuthoringState;
  selection: PassageSelection;
  catalog: MediaCatalog;
  onPlace: (attachment: Attachment) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const target = soundCueTarget(state, selection);
  const paragraph = state.manuscript.paragraphs.find(candidate => candidate.id === selection.blockId);
  const anchor = 'selection' in target ? anchorAtLevel(state.manuscript, target.selection, 'span') : undefined;
  if (!('selection' in target) || !paragraph || !anchor) {
    return <p role="status" className="px-2 py-3 text-sm text-slate-300">{'reason' in target ? `${target.reason}.` : 'Select the words again.'}</p>;
  }
  const occupied = soundCues(state).filter(attachment => attachment !== target.existing).flatMap(attachment => {
    const resolution = resolveAnchor(state.manuscript, attachment.anchor);
    return resolution.status === 'placed' ? [resolution.selection] : [];
  });
  return <div className="sen-manuscript-cue-panel">
    <ManualCuePicker block={paragraph} selection={target.selection} catalog={catalog}
      existing={target.existing ? placedSoundCue(state, target.existing) : undefined} occupiedSelections={occupied}
      onPlace={cue => onPlace({ ...cue, id: target.existing?.id ?? cue.id, anchor })}
      onRemove={() => target.existing && onRemove(target.existing.id)} onClose={onClose} />
  </div>;
}

/**
 * The page's Sound Cue actions for the engine: Media → Audio → Cue places or
 * replaces one on the selected words (from the host's catalog), and "Remove cue
 * here" takes them off. Shared by the Workshop lab and the Reader's Create mode.
 */
export function soundCueActions<State extends AuthoringState>({ state, update, catalog, onNotice }: {
  state: State;
  update: (change: (current: State) => State) => void;
  catalog: MediaCatalog;
  onNotice: (notice: string) => void;
}): { actions: PassageAction[]; removeActions: PassageAction[] } {
  const actions: PassageAction[] = [{ id: 'media', label: 'Media', children: [{ id: 'audio', label: 'Audio', children: [{
    id: 'cue', label: 'Cue',
    unavailable: selected => { const target = soundCueTarget(state, selected); return 'reason' in target ? target.reason : undefined; },
    onActivate: (selected, close) => <CueAttachPanel state={state} selection={selected} catalog={catalog}
      onPlace={attachment => {
        // The chapter's cap holds even if the page changed while the picker was open.
        if (!state.attachments.some(placed => placed.id === attachment.id) && soundCues(state).length >= SOUND_CUE_RULES.maxPerChapter) {
          onNotice(`A chapter holds at most ${SOUND_CUE_RULES.maxPerChapter} Sound Cues.`);
          return;
        }
        update(current => placeAttachment(current, attachment) as State);
      }}
      onRemove={id => update(current => removeAttachment(current, id) as State)} onClose={close} />,
  }] }] }];
  const removeActions: PassageAction[] = [{
    id: 'remove-cue', label: 'Remove cue here',
    unavailable: selected => cuesUnder(state, selected).length ? undefined : 'No Sound Cue here',
    onActivate: selected => {
      const ids = cuesUnder(state, selected).map(attachment => attachment.id);
      update(current => ids.reduce((next, id) => removeAttachment(next, id) as State, current));
      return null;
    },
  }];
  return { actions, removeActions };
}

/**
 * The Overlays switch (Off / Cues) and, while one is on, its legend: the
 * page's numbering as the model addresses it, and each kind's color.
 */
export function ManuscriptOverlaySwitch({ mode, onChange, overlay }: {
  mode: ManuscriptOverlayMode;
  onChange: (mode: ManuscriptOverlayMode) => void;
  /** The overlay on the page, so the legend shows "Words changed" only when a mark needs it. */
  overlay?: TextHighlightOverlay;
}) {
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400" role="group" aria-label="Overlays" data-testid="overlay-switch">
      <span className="mr-1 uppercase tracking-[0.14em] text-slate-500">Overlays</span>
      {([['off', 'Off'], ['cues', 'Cues']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value}
        className={`min-h-9 rounded-lg border px-3 ${mode === value ? 'border-teal-300/60 bg-teal-400/10 text-teal-100' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}`}
        onClick={() => onChange(value)}>{label}</button>)}
    </div>
    {mode !== 'off' && <div className="space-y-2 text-xs leading-relaxed text-slate-400" data-testid="overlay-legend">
      <p>
        <span className="font-semibold text-slate-200">¶2</span> in the margin with a small raised <span className="font-semibold text-slate-200">6</span> is
        paragraph 2, sentence 6. The model writes it <span className="font-semibold text-slate-200">P2 S6</span>.
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Overlay colors">
        {OVERLAY_KINDS[mode].map(kind => <li key={kind} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px] ring-1 ring-inset ring-white/10" style={{ background: ATTACHMENT_COLORS[kind].tone }} />{ATTACHMENT_COLORS[kind].label}
        </li>)}
        {/* Only effects that stay on the page after an edit (passage-level ones) show the underline. */}
        {overlay?.marks?.some(mark => mark.attention) && <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-4 border-b-2 border-dashed border-amber-400" />Words changed
        </li>}
      </ul>
    </div>}
  </div>;
}

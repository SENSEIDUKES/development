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
import { ATTACHMENT_COLORS, MANUSCRIPT_OVERLAY_GROUPS, OVERLAY_KINDS, overlayGroupOf, type ManuscriptOverlayMode } from '../shared/overlayModes';
import { ManualCuePicker } from './ManualCuePicker';
import { SOUNDTRACK_KIND_WORDS, SoundtrackChangePanel, type SoundtrackChoices } from './SoundtrackChangePicker';
import { ATMOSPHERE_CHANGE_KIND, SOUNDSCAPE_CHANGE_KIND, type SoundtrackChangeKind } from '../../../audio/soundtrackChanges';

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

/** The soundtrack changes of one kind whose word a selection touches. */
const changesUnder = (state: AuthoringState, selection: PassageSelection, kind: SoundtrackChangeKind) => state.attachments.filter(attachment => {
  if (attachment.kind !== kind) return false;
  const resolution = resolveAnchor(state.manuscript, attachment.anchor);
  return resolution.status === 'placed' && resolution.selection.blockId === selection.blockId
    && resolution.selection.startOffset < selection.endOffset && resolution.selection.endOffset > selection.startOffset;
});

/**
 * The page's audio actions for the engine. The three kinds of sound are
 * separate: Media → Audio → Cue places or replaces a Sound Cue on the
 * selected words (from the host's catalog); with the host's `soundtrack`
 * choices, Soundscape and Atmosphere place the chapter's one change of music
 * or of atmosphere on the word the selection begins with (the chapter's
 * opening, the other of each kind's two, is the host's to show). Remove mode
 * takes any of them off. Shared by the Workshop lab and the Reader's Create mode.
 */
export function audioActions<State extends AuthoringState>({ state, update, catalog, onNotice, soundtrack }: {
  state: State;
  update: (change: (current: State) => State) => void;
  catalog: MediaCatalog;
  onNotice: (notice: string) => void;
  /** The chapter's pieces and atmospheres; without them only Sound Cues are offered. */
  soundtrack?: SoundtrackChoices;
}): { actions: PassageAction[]; removeActions: PassageAction[] } {
  const soundtrackAction = (kind: SoundtrackChangeKind): PassageAction => ({
    id: kind === SOUNDSCAPE_CHANGE_KIND ? 'soundscape' : 'atmosphere', label: SOUNDTRACK_KIND_WORDS[kind].name,
    unavailable: selected => {
      const paragraph = state.manuscript.paragraphs.find(candidate => candidate.id === selected.blockId);
      return paragraph && paragraph.text.slice(selected.startOffset, selected.endOffset).trim() ? undefined : 'Select a word';
    },
    onActivate: (selected, close) => <SoundtrackChangePanel kind={kind} state={state} selection={selected} choices={soundtrack!}
      onPlace={(attachment, replaces) => update(current => placeAttachment(replaces ? removeAttachment(current, replaces) : current, attachment) as State)}
      onClose={close} />,
  });
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
  }, ...(soundtrack ? [soundtrackAction(SOUNDSCAPE_CHANGE_KIND), soundtrackAction(ATMOSPHERE_CHANGE_KIND)] : [])] }] }];
  const removeActions: PassageAction[] = [{
    id: 'remove-cue', label: 'Remove cue here',
    unavailable: selected => cuesUnder(state, selected).length ? undefined : 'No Sound Cue here',
    onActivate: selected => {
      const ids = cuesUnder(state, selected).map(attachment => attachment.id);
      update(current => ids.reduce((next, id) => removeAttachment(next, id) as State, current));
      return null;
    },
  }, ...(soundtrack ? ([SOUNDSCAPE_CHANGE_KIND, ATMOSPHERE_CHANGE_KIND] as const).map((kind): PassageAction => ({
    id: `remove-${kind}`, label: `Remove ${SOUNDTRACK_KIND_WORDS[kind].noun} change here`,
    unavailable: selected => changesUnder(state, selected, kind).length ? undefined : `No ${SOUNDTRACK_KIND_WORDS[kind].noun} change here`,
    onActivate: selected => {
      const ids = changesUnder(state, selected, kind).map(attachment => attachment.id);
      update(current => ids.reduce((next, id) => removeAttachment(next, id) as State, current));
      return null;
    },
  })) : [])];
  return { actions, removeActions };
}

/**
 * The Overlays switch: Off or a category (Audio), then one overlay inside
 * the category (Sound Cues, Soundscapes or Atmospheres: one kind each). While
 * one is on, its legend: the page's numbering as the model addresses it, and
 * its kind's color.
 */
export function ManuscriptOverlaySwitch({ mode, onChange, overlay }: {
  mode: ManuscriptOverlayMode;
  onChange: (mode: ManuscriptOverlayMode) => void;
  /** The overlay on the page, so the legend shows "Words changed" only when a mark needs it. */
  overlay?: TextHighlightOverlay;
}) {
  const group = overlayGroupOf(mode);
  const tone = (on: boolean) => `min-h-9 rounded-lg border px-3 ${on ? 'border-teal-300/60 bg-teal-400/10 text-teal-100' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}`;
  return <div className="space-y-3">
    <div className="space-y-2" data-testid="overlay-switch">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400" role="group" aria-label="Overlays">
        <span className="mr-1 uppercase tracking-[0.14em] text-slate-500">Overlays</span>
        <button type="button" aria-pressed={mode === 'off'} className={tone(mode === 'off')} onClick={() => onChange('off')}>Off</button>
        {/* A category opens on its first overlay; choosing it again keeps the one already on. */}
        {MANUSCRIPT_OVERLAY_GROUPS.map(entry => <button key={entry.id} type="button" aria-pressed={group?.id === entry.id} aria-expanded={group?.id === entry.id}
          className={tone(group?.id === entry.id)} onClick={() => { if (group?.id !== entry.id) onChange(entry.overlays[0].mode); }}>{entry.label}</button>)}
      </div>
      {group && <div className="flex flex-wrap items-center gap-2 border-l border-white/10 pl-3 text-xs" role="group" aria-label={`${group.label} overlays`} data-testid="overlay-subswitch">
        {group.overlays.map(entry => <button key={entry.mode} type="button" aria-pressed={mode === entry.mode} className={tone(mode === entry.mode)}
          onClick={() => onChange(entry.mode)}>{entry.label}</button>)}
      </div>}
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

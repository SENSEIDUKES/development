import { useEffect, useId, useRef, useState } from 'react';
import type { SceneAudioTrack } from '../../../audio/soundscapes';
import type { SceneAtmosphere } from '../../../audio/media';
import {
  ATMOSPHERE_CHANGE_KIND, SOUNDSCAPE_CHANGE_KIND, soundtrackChangeWord,
  type SoundtrackChangeAttachment, type SoundtrackChangeKind,
} from '../../../audio/soundtrackChanges';
import { anchorAtLevel, resolveAnchor, type ManuscriptAttachment, type ManuscriptState } from '../shared/manuscript';
import type { PassageSelection } from '../shared/selection';

/** A soundscape piece or an atmosphere a reader may choose. */
export type SoundtrackOption = { kind: typeof SOUNDSCAPE_CHANGE_KIND; id: string; label: string }
  | { kind: typeof ATMOSPHERE_CHANGE_KIND; id: string; label: string };

/**
 * What a host offers for the chapter's soundtrack: the exact pieces of its
 * soundscapes and its atmospheres, and how to hear one before placing it.
 */
export interface SoundtrackChoices {
  pieces: readonly SceneAudioTrack[];
  atmospheres: readonly SceneAtmosphere[];
  /** Plays a choice while the reader listens to it; returns how to stop. Without it there is no preview. */
  preview?: (option: SoundtrackOption) => (() => void) | undefined;
}

export const SOUNDTRACK_KIND_WORDS: Record<SoundtrackChangeKind, { name: string; noun: string }> = {
  [SOUNDSCAPE_CHANGE_KIND]: { name: 'Soundscape', noun: 'music' },
  [ATMOSPHERE_CHANGE_KIND]: { name: 'Atmosphere', noun: 'atmosphere' },
};

/** Every option of one kind, by name. */
export function soundtrackOptions(kind: SoundtrackChangeKind, choices: SoundtrackChoices): SoundtrackOption[] {
  return kind === SOUNDSCAPE_CHANGE_KIND
    ? choices.pieces.map(piece => ({ kind, id: piece.id, label: piece.label ?? piece.id }))
    : choices.atmospheres.map(atmosphere => ({ kind, id: atmosphere.id, label: atmosphere.label ?? atmosphere.word }));
}

/** The name of a chosen piece or atmosphere, or its id when the host no longer offers it. */
export const soundtrackOptionLabel = (kind: SoundtrackChangeKind, id: string, choices: SoundtrackChoices) =>
  soundtrackOptions(kind, choices).find(option => option.id === id)?.label ?? id;

/** The change of one kind already in the chapter, if any. */
export const soundtrackChangeOf = (state: ManuscriptState<unknown>, kind: SoundtrackChangeKind) =>
  state.attachments.find(attachment => attachment.kind === kind) as SoundtrackChangeAttachment | undefined;

/** The word a selection's change would begin on, as the anchor it would hold. */
export function soundtrackChangeAnchor(state: ManuscriptState<unknown>, selection: PassageSelection) {
  const paragraph = state.manuscript.paragraphs.find(candidate => candidate.id === selection.blockId);
  const word = paragraph && soundtrackChangeWord(paragraph.text, selection.startOffset, selection.endOffset, state.manuscript.locale);
  if (!paragraph || !word) return undefined;
  return anchorAtLevel(state.manuscript, {
    blockId: paragraph.id, startOffset: word.start, endOffset: word.end, selectedText: paragraph.text.slice(word.start, word.end),
  }, 'span');
}

/**
 * A list of pieces or atmospheres with a preview for each and one choice
 * kept. Shared by the change placed on a word and the chapter's opening.
 */
export function SoundtrackOptionList({ kind, choices, chosen, onChoose, extra }: {
  kind: SoundtrackChangeKind;
  choices: SoundtrackChoices;
  chosen?: string;
  onChoose: (id: string) => void;
  /** A first entry before the options (the writer's own choice, for the opening). */
  extra?: { id: string; label: string };
}) {
  const name = useId();
  const [playing, setPlaying] = useState<string>();
  const stop = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => stop.current?.(), []);
  const options = soundtrackOptions(kind, choices);
  const toggle = (option: SoundtrackOption) => {
    stop.current?.();
    stop.current = undefined;
    if (playing === option.id) { setPlaying(undefined); return; }
    stop.current = choices.preview?.(option);
    setPlaying(stop.current ? option.id : undefined);
  };
  if (!options.length && !extra) return <p role="status" className="px-1 py-2 text-xs text-slate-400">This story has no {SOUNDTRACK_KIND_WORDS[kind].noun} to choose from.</p>;
  return <ul className="max-h-60 space-y-1 overflow-y-auto" role="radiogroup" aria-label={SOUNDTRACK_KIND_WORDS[kind].name} data-testid={`${kind}-options`}>
    {[...(extra ? [{ ...extra, preview: false }] : []), ...options.map(option => ({ ...option, preview: true }))].map(option => <li key={option.id}
      className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${chosen === option.id ? 'border-teal-300/60 bg-teal-400/10' : 'border-white/10'}`}>
      <label className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-100">
        <input type="radio" name={name} value={option.id} checked={chosen === option.id} onChange={() => onChoose(option.id)} />
        <span className="truncate">{option.label}</span>
      </label>
      {option.preview && choices.preview && <button type="button" aria-pressed={playing === option.id}
        aria-label={`${playing === option.id ? 'Stop' : 'Preview'} ${option.label}`}
        onClick={() => toggle(option as SoundtrackOption)}
        className="min-h-9 shrink-0 rounded-lg border border-white/15 px-2 text-xs text-slate-200 hover:bg-white/10">{playing === option.id ? 'Stop' : 'Preview'}</button>}
    </li>)}
  </ul>;
}

/**
 * Places the chapter's one change of music, or of atmosphere, on the word a
 * selection begins with. A chapter holds one of each after its opening, so
 * placing it where one already is moves it here.
 */
export function SoundtrackChangePanel({ kind, state, selection, choices, onPlace, onClose }: {
  kind: SoundtrackChangeKind;
  state: ManuscriptState<unknown>;
  selection: PassageSelection;
  choices: SoundtrackChoices;
  onPlace: (attachment: ManuscriptAttachment<unknown>, replaces?: string) => void;
  onClose: () => void;
}) {
  const anchor = soundtrackChangeAnchor(state, selection);
  const existing = soundtrackChangeOf(state, kind);
  const [chosen, setChosen] = useState<string | undefined>(existing && (existing.kind === SOUNDSCAPE_CHANGE_KIND ? existing.payload.pieceId : existing.payload.atmosphereId));
  const words = SOUNDTRACK_KIND_WORDS[kind];
  if (!anchor || anchor.level !== 'span') return <p role="status" className="px-2 py-3 text-sm text-slate-300">Select a word.</p>;
  const from = existing && resolveAnchor(state.manuscript, existing.anchor).status === 'placed' ? existing.anchor : undefined;
  const moving = from && from.level === 'span' && !(from.blockId === anchor.blockId && from.startOffset === anchor.startOffset);
  const place = () => {
    if (!chosen) return;
    const payload = kind === SOUNDSCAPE_CHANGE_KIND ? { pieceId: chosen } : { atmosphereId: chosen };
    onPlace({ id: `${kind}:${anchor.blockId}:${anchor.startOffset}`, kind, anchor, payload }, existing?.id);
    onClose();
  };
  return <div className="space-y-3 p-2 font-sans" data-testid={`${kind}-panel`}>
    <p className="text-sm text-slate-200">The {words.noun} changes here, from “{anchor.selectedText}”.</p>
    {moving && from.level === 'span' && <p className="text-xs text-amber-100">A chapter changes its {words.noun} once after its opening: this moves it from “{from.selectedText}”.</p>}
    <SoundtrackOptionList kind={kind} choices={choices} chosen={chosen} onChoose={setChosen} />
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="min-h-9 rounded-lg border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/10">Cancel</button>
      <button type="button" onClick={place} disabled={!chosen}
        className="min-h-9 rounded-lg border border-teal-300/60 bg-teal-400/15 px-3 text-sm text-teal-50 hover:bg-teal-400/25 disabled:opacity-40">Place {words.name.toLowerCase()} change</button>
    </div>
  </div>;
}

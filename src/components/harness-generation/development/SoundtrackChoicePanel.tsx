import { useCallback, useSyncExternalStore } from 'react';
import type { ReaderAtmosphereOption, ReaderMixer } from '@seihouse/audio-player';
import type { SceneAudioTrack } from '@seihouse/sen/audio';
import { storySoundtrack, type SoundtrackChoice } from '@seihouse/sen/reader-runtime';

const AUTOMATIC = 'automatic';

/** Options grouped as their catalog groups them, in catalog order. */
function grouped<T extends { group?: string }>(items: readonly T[]): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = item.group ?? 'Other';
    groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  return [...groups];
}

const selectClass = 'min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-neutral-900 px-3 text-sm text-neutral-100';
const labelClass = 'font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/70';

/**
 * Who chooses the Reader's music and atmosphere. Automatic (the default)
 * plays each chapter's own scene, as its writer chose it; a piece or an
 * atmosphere the reader picks stays, whatever the chapters choose, until
 * they pick Automatic again. What is playing now is named, so a reader who
 * likes it can keep it.
 */
export function SoundtrackChoicePanel({ mixer, choice, onChoice, pieces }: {
  mixer: ReaderMixer;
  choice: SoundtrackChoice;
  onChoice: (choice: SoundtrackChoice) => void;
  /** The pieces the chapter on screen was written with. */
  pieces: readonly SceneAudioTrack[];
}) {
  const subscribe = useCallback((listener: () => void) => mixer.subscribe(() => listener()), [mixer]);
  const state = useSyncExternalStore(subscribe, () => mixer.getState());
  const atmospheres: readonly ReaderAtmosphereOption[] = state.atmosphereOptions;
  const playing = storySoundtrack(mixer).piece();
  const bed = atmospheres.find(option => option.id === state.preferences.atmosphereId);
  const pieceValue = choice.soundscape === AUTOMATIC ? AUTOMATIC : choice.soundscape.pieceId;
  const atmosphereValue = choice.atmosphere === AUTOMATIC ? AUTOMATIC : choice.atmosphere.atmosphereId;
  return <fieldset data-testid="reader-soundtrack-choice" className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
    <legend className="px-1 text-sm font-semibold text-neutral-100">Scene</legend>
    <p className="text-xs leading-relaxed text-neutral-400">
      Automatic plays each chapter's own music and atmosphere, chosen as it was written. Choose your own to keep it, whatever the chapters choose.
    </p>
    {pieces.length > 0 && <div className="mt-3">
      <label htmlFor="reader-soundtrack-piece" className={labelClass}>Soundscape</label>
      <select id="reader-soundtrack-piece" value={pieces.some(piece => piece.id === pieceValue) ? pieceValue : AUTOMATIC} className={`mt-1 ${selectClass}`}
        onChange={event => onChoice({ ...choice, soundscape: event.target.value === AUTOMATIC ? AUTOMATIC : { pieceId: event.target.value } })}>
        <option value={AUTOMATIC}>Automatic: each chapter's own</option>
        {grouped(pieces).map(([group, items]) => <optgroup key={group} label={group}>
          {items.map(piece => <option key={piece.id} value={piece.id}>{piece.label ?? piece.id}</option>)}
        </optgroup>)}
      </select>
    </div>}
    {atmospheres.length > 0 && <div className="mt-3">
      <label htmlFor="reader-soundtrack-atmosphere" className={labelClass}>Atmosphere</label>
      <select id="reader-soundtrack-atmosphere" value={atmospheres.some(option => option.id === atmosphereValue) ? atmosphereValue : AUTOMATIC} className={`mt-1 ${selectClass}`}
        onChange={event => onChoice({ ...choice, atmosphere: event.target.value === AUTOMATIC ? AUTOMATIC : { atmosphereId: event.target.value } })}>
        <option value={AUTOMATIC}>Automatic: each chapter's own</option>
        {grouped(atmospheres).map(([group, items]) => <optgroup key={group} label={group}>
          {items.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </optgroup>)}
      </select>
    </div>}
    {(playing || bed) && <p role="status" data-testid="reader-soundtrack-now" className="mt-3 text-xs text-neutral-400">
      {`Now: ${[playing?.label, bed?.label].filter(Boolean).join(' · ')}`}
    </p>}
  </fieldset>;
}

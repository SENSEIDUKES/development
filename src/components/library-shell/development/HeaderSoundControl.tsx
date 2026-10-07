import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ReaderMixerNote, useOptionalReaderMixer, useReaderMixerState, type ReaderMixer, type ReaderMixerNoteLabels } from '@seihouse/audio-player';
import './header-sound-control.css';

/** The note's words in the Library shell, where it is the app's sound and not only a story's. */
export const HEADER_SOUND_LABELS: Partial<ReaderMixerNoteLabels> = {
  mute: 'Mute sound',
  unmute: 'Unmute sound',
  needsTap: 'Tap to start sound',
  resume: 'Resume sound',
  soundOn: 'Sound on',
  muted: 'Sound muted',
  blocked: 'Sound needs a tap',
  sleepStopped: 'Sound stopped by the sleep timer',
};

/** How long the volume stays open after a mouse leaves it, so it can be reached from the note. */
const LEAVE_GRACE_MS = 250;
/** How long a finger holds the note to open the volume. */
const HOLD_MS = 500;

/**
 * The music note of the Library shell: the reader can always silence the app
 * at once. On laptops it sits in the header; while a bottom bar is on screen
 * (phones and tablets) the header floats it just above the bar's right end,
 * the Reader's ghost note outside the Reader (`WorkspaceHeader`'s `sound`).
 * A tap or click mutes and unmutes all of its sound (the reader mixer's
 * master switch, the same as the Reader's note). Hovering it with a mouse,
 * holding it with a finger, or ArrowUp/ArrowDown from the keyboard opens a
 * Music volume slider, the Soundscapes level, right there; it closes when
 * the mouse leaves, on a tap outside, or on Escape. Both are the reader's
 * saved mix, shared with Reader Settings › Audio.
 *
 * It shows nothing without a reader mixer (a host that has no sound).
 */
export function HeaderSoundControl({ mixer: mixerProp }: { mixer?: ReaderMixer } = {}) {
  const provided = useOptionalReaderMixer();
  const mixer = mixerProp ?? provided;
  const state = useReaderMixerState(mixer);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderId = useId();

  const cancelLeave = () => {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  };
  useEffect(() => cancelLeave, []);

  // A tap outside closes it.
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]);

  if (!mixer || !state) return null;
  const level = state.preferences.layers.soundscapes.level;
  const percent = Math.round(level * 100);
  const fixedVolume = state.volumeControl === 'on-off';

  const enter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    cancelLeave();
    setOpen(true);
  };
  const leave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    cancelLeave();
    leaveTimer.current = setTimeout(() => {
      leaveTimer.current = null;
      setOpen(false);
    }, LEAVE_GRACE_MS);
  };
  const keys = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    } else if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !open) {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => slider.current?.focus());
    }
  };

  return <div ref={root} className="header-sound-control" data-open={open}
    onPointerEnter={enter} onPointerLeave={leave} onKeyDown={keys}
    onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <ReaderMixerNote mixer={mixer} labels={HEADER_SOUND_LABELS} longPressMs={HOLD_MS}
      onOpenSettings={() => setOpen(true)} className="header-sound-control-note" />
    {open && <div className="header-sound-control-popover" role="group" aria-label="Music volume">
      <label htmlFor={sliderId} className="header-sound-control-label">
        <span>Music volume</span>
        <span aria-hidden="true">{percent}%</span>
      </label>
      <input ref={slider} id={sliderId} type="range" min={0} max={100} step={1} value={percent}
        disabled={fixedVolume} aria-valuetext={`${percent}%`}
        onChange={event => mixer.setLayerLevel('soundscapes', Number(event.currentTarget.value) / 100)} />
      {fixedVolume && <p className="header-sound-control-hint">This device sets the volume with its own buttons.</p>}
    </div>}
  </div>;
}

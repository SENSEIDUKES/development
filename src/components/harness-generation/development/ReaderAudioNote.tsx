import { useEffect, useId, useRef, useState } from 'react';
import { ReaderMixerNote, useReaderMixerState, type ReaderMixer } from '@seihouse/audio-player';
import './reader-audio-note.css';

/** Tap mutes; hold opens volume. Only Settings owns the Master enable switch. */
export function ReaderAudioNote({ mixer }: { mixer: ReaderMixer }) {
  const state = useReaderMixerState(mixer);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const sliderId = useId();
  useEffect(() => {
    if (!open) return;
    slider.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]);
  if (!state?.preferences.masterEnabled) return null;
  const percent = Math.round((state.preferences.masterLevel ?? 1) * 100);
  return <div ref={root} className="reader-audio-control"
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation();
        setOpen(false);
        root.current?.querySelector('button')?.focus();
      } else if (!open && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        setOpen(true);
      }
    }}>
    <ReaderMixerNote mixer={mixer} muteMode="soundtrack-mute" className="reader-story-audio-note" onOpenSettings={() => setOpen(true)} />
    {open && <div className="reader-audio-volume" role="group" aria-label="Quick master volume">
      <label htmlFor={sliderId}>Master <span>{percent}%</span></label>
      <input ref={slider} id={sliderId} type="range" min="0" max="100" step="1"
        aria-label="Quick master volume" aria-valuetext={`${percent}%`} value={percent}
        onChange={event => mixer.setMasterLevel(Number(event.target.value) / 100)} />
    </div>}
  </div>;
}

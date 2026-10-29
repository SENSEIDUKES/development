import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ReaderMixerNote, useReaderMixerState, type ReaderMixer, type ReaderMixerNoteLabels } from '@seihouse/audio-player';
import './reader-colors.css';
import './reader-audio-note.css';

/**
 * Tap mutes; hold opens volume. Only Settings owns the Master enable switch.
 * The one sound note: the Reader's, and the Library shell's (`HeaderSoundControl`),
 * which gives it its own words.
 */
export function ReaderAudioNote({ mixer, labels }: { mixer: ReaderMixer; labels?: Partial<ReaderMixerNoteLabels> }) {
  const state = useReaderMixerState(mixer);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!state?.preferences.masterEnabled) {
      setOpen(false);
      return;
    }
    if (!open) return;
    slider.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open, state?.preferences.masterEnabled]);
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
    <ReaderMixerNote mixer={mixer} muteMode="soundtrack-mute" labels={labels} className="reader-story-audio-note" onOpenSettings={() => setOpen(true)} />
    {open && <div className="reader-audio-volume reader-glass reader-glass-menu" role="group" aria-label="Quick master volume">
      <input ref={slider} type="range" min="0" max="100" step="1"
        aria-label="Quick master volume" aria-orientation="vertical" aria-valuetext={`${percent}%`} value={percent}
        style={{ '--reader-audio-level': `${percent}%` } as CSSProperties}
        onChange={event => mixer.setMasterLevel(Number(event.target.value) / 100)} />
    </div>}
  </div>;
}

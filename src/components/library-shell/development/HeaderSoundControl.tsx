import { useOptionalReaderMixer, type ReaderMixer, type ReaderMixerNoteLabels } from '@seihouse/audio-player';
import { ReaderAudioNote } from '@seihouse/sen/harness-generation';
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
  retry: 'Retry sound',
  failed: 'Sound could not play',
  sleepStopped: 'Sound stopped by the sleep timer',
};

/**
 * The music note of the Library shell: the Reader's own note (SEN's
 * `ReaderAudioNote`), so the two never drift apart. On laptops it sits in the
 * header; while a bottom bar is on screen (phones and tablets) the header
 * floats it just above the bar's right end (`WorkspaceHeader`'s `sound`).
 * As in the Reader, a tap mutes and unmutes all of its sound, and holding it,
 * or ArrowUp/ArrowDown, opens the quick Master volume, the reader's saved mix
 * shared with Reader Settings › Audio. Only its words are the app's.
 *
 * It shows nothing without a reader mixer (a host that has no sound), or while
 * Master is off in Settings, as in the Reader.
 */
export function HeaderSoundControl({ mixer: mixerProp }: { mixer?: ReaderMixer } = {}) {
  const provided = useOptionalReaderMixer();
  const mixer = mixerProp ?? provided;
  if (!mixer) return null;
  return <div className="header-sound-control">
    <ReaderAudioNote mixer={mixer} labels={HEADER_SOUND_LABELS} />
  </div>;
}

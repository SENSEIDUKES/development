/**
 * `@seihouse/sen/inline-audio` — Sound Cues on the page.
 *
 * The glyph a Sound Cue leaves on the words it marks, and its inline
 * playback. Any SEN reader renders cues through it; it needs a host
 * `NarrativeAudioProvider` (from `@seihouse/sen/audio`).
 */
export {
  InlineAudio,
  InlineAudioControl,
  InlineAudioText,
} from '../../audio/InlineAudio';
export type {
  InlineAudioControlProps,
  InlineAudioProps,
  InlineAudioStatus,
  InlineAudioTextProps,
} from '../../audio/InlineAudio';

/**
 * `@seihouse/sen/inline-audio` — Sound Cues on the page.
 *
 * The glyph a Sound Cue leaves on the words it marks, and its inline
 * playback. Any SEN reader renders cues through it. With the host's reader
 * mixer (`ReaderMixerProvider` from `@seihouse/audio-player`) a cue plays over
 * the soundtrack at its Energy; a host with only a `NarrativeAudioProvider`
 * (from `@seihouse/sen/audio`) keeps that single-channel route.
 */
export {
  InlineAudio,
  InlineAudioControl,
  InlineAudioText,
  MixerCueControl,
  SOUND_CUE_ENERGY_VOLUME,
} from '../../audio/InlineAudio';
export type {
  InlineAudioControlProps,
  InlineAudioProps,
  MixerCueControlProps,
  InlineAudioStatus,
  InlineAudioTextProps,
} from '../../audio/InlineAudio';

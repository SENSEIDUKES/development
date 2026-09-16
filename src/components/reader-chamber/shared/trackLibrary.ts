/**
 * Reader compatibility surface for the canonical SEN soundscape catalog.
 * Runtime ownership lives in `src/audio/soundscapes.ts` so Media Loadout and
 * Reader playback resolve against one contract and one deterministic matcher.
 */
export {
  TRACK_LIBRARY,
  resolveSoundscapeTrack,
  validateSceneAudioCatalog,
  validateSceneAudioTrack,
  type SceneAudioTrack,
  type SoundscapeIntent,
} from '../../../audio/soundscapes';

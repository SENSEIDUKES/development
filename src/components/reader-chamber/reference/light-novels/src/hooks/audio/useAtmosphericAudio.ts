import { useEffect, useRef } from 'react';
import { createSceneMixEngine, type SceneMixEngine } from '@seihouse/audio-player';
import { SceneScoreEngine, TRACK_LIBRARY } from '../../lib/audio/musicResolver';
import { normalizeAutoCue } from '../../lib/audio/autoCuePolicy';
import {
  MUSIC_LEVEL_CAP,
  effectiveChannelVolume,
  getAudioMixSettings,
} from '../../lib/audio/audioMixSettings';
import {
  ATMOSPHERE_BED_CATALOG,
  resolveAtmosphereBed,
  resolveNarrativeCueSound,
  type AtmosphereCategory,
  type CuratedAtmosphereBed,
  type AtmosphereMetadata,
} from '../../lib/audio/ambienceSoundCatalog';
import { playCardSound } from '../../lib/audio/cardSoundPlayer';
import { useAudioMix } from './useAudioMix';
import { useAppStore } from '../../store/useAppStore';
import { vibrate } from '../../lib/vibration';

/** Crossfade length for switching atmosphere beds. */
const ATMOSPHERE_FADE_MS = 1500;

/** Haptic pattern for each one-shot cue, matching the old trigger functions. */
const CUE_VIBRATIONS: Record<string, Parameters<typeof vibrate>[0]> = {
  system_alert: 'softTap',
  breakthrough: 'surge',
  artifact_activation: 'chime',
  beast_reveal: 'heavyTap',
  fate_shift: 'shift',
  major_impact: 'combatHit',
};

/**
 * The reader's audio conductor. Nothing here is synthesized or generated —
 * every sound is a curated asset, and playback is centralized:
 *
 *  - Scene-score music → SAP `SceneMixEngine` over the curated TRACK_LIBRARY.
 *  - Atmosphere beds (rain, wind, …) → a second SAP `SceneMixEngine`
 *    (looping decks, equal-power crossfades) over the curated ambience
 *    catalog. Beds without a curated URL yet simply stay silent.
 *  - One-shot story cues → the shared curated one-shot player, same as
 *    World Card sounds.
 *
 * User levels come from the central audio mix (Master / Music / Atmosphere /
 * Audio Cues). This hook only decides *what* plays; the engines own *how*.
 */
export function useAtmosphericAudio() {
  const currentScreen = useAppStore(state => state.currentScreen);
  const { mix } = useAudioMix();

  // Atmosphere is a selected catalog asset rather than a fixed variation
  // name. Chapter metadata selects the initial asset; only active narration
  // can replace it as the scene changes.
  const atmosphereRef = useRef<CuratedAtmosphereBed | null>(
    (() => {
      if (typeof localStorage === 'undefined') return null;
      try {
        const saved = localStorage.getItem('seihouse-audio-atmosphere');
        if (!saved || saved === 'none') return null;
        return ATMOSPHERE_BED_CATALOG.find(bed => bed.id === saved) || null;
      } catch {
        return null;
      }
    })(),
  );

  const bgmTrackIdRef = useRef<string>(
    (() => {
      if (typeof localStorage === 'undefined') return 'auto';
      try {
        const saved = localStorage.getItem('seihouse-bgm-track') || 'auto';
        // A stale id (e.g. a track later removed from the library) falls back
        // to auto so the narrative cues aren't gated off by a dead pin.
        return saved === 'auto' || TRACK_LIBRARY.some(t => t.id === saved) ? saved : 'auto';
      } catch {
        return 'auto';
      }
    })(),
  );

  // BGM: the SAP scene-mix engine owns the decks and the equal-power
  // crossfades; this hook only tells it what to play.
  const sceneMixRef = useRef<SceneMixEngine | null>(null);
  const scoreEngineRef = useRef(new SceneScoreEngine());
  const bgmIntensityRef = useRef<number>(1.0);
  const lastChapterCueIdRef = useRef<string | null>(null);
  // Current chapter's environment/theme tags, kept so switching the score
  // back to 'auto' can restore the chapter-appropriate bed.
  const chapterTagsRef = useRef<string[]>([]);

  // Atmosphere beds: a second scene-mix engine, so the layer gets the same
  // deck management/crossfades as the score without touching its levels.
  const atmoMixRef = useRef<SceneMixEngine | null>(null);
  // The bed the atmosphere engine is currently playing (null = stopped).
  const activeBedRef = useRef<string | null>(null);
  const narrationActiveRef = useRef(false);
  const manualAtmosphereRef = useRef(false);

  const currentScreenRef = useRef(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  const musicLevel = () =>
    effectiveChannelVolume('music') * MUSIC_LEVEL_CAP * bgmIntensityRef.current;

  const musicAllowed = () =>
    currentScreenRef.current === 'reader' && effectiveChannelVolume('music') > 0;

  const cuesAllowed = () =>
    currentScreenRef.current === 'reader' && effectiveChannelVolume('cues') > 0;

  const syncBgmVolumes = () => {
    const engine = sceneMixRef.current;
    if (!engine) return;
    const muted = !musicAllowed();
    engine.setMuted(muted);
    engine.setLevel(muted ? 0 : musicLevel());
  };

  /**
   * Reconcile the atmosphere layer with the selected bed and the current
   * mix. Level changes retarget the running deck live; bed changes crossfade
   * to the curated asset (or fade out when the bed has no curated URL yet,
   * the bed is 'none', or the channel/master is off).
   */
  const syncAtmosphere = () => {
    const engine = atmoMixRef.current;
    if (!engine) return;

    const atmosphere = atmosphereRef.current;
    const level = effectiveChannelVolume('atmosphere');
    const audible = currentScreenRef.current === 'reader' && atmosphere !== null && level > 0;

    engine.setMuted(!audible);
    engine.setLevel(audible ? level : 0);

    if (!atmosphere) {
      if (activeBedRef.current !== null) {
        engine.stop(ATMOSPHERE_FADE_MS);
        activeBedRef.current = null;
      }
      return;
    }

    if (activeBedRef.current !== atmosphere.id) {
      engine.crossfadeTo({
        id: atmosphere.id,
        title: atmosphere.id,
        artist: 'SEIHouse',
        audioFile: atmosphere.url,
      });
      activeBedRef.current = atmosphere.id;
    }
  };

  const setAtmosphere = (next: CuratedAtmosphereBed | null, source: 'chapter' | 'narration' | 'manual') => {
    if (atmosphereRef.current?.id === next?.id) return;
    atmosphereRef.current = next;
    try {
      localStorage.setItem('seihouse-audio-atmosphere', next?.id || 'none');
    } catch {}
    window.dispatchEvent(new CustomEvent('seihouse-audio-state', {
      detail: {
        atmosphere: next?.variation || 'none',
        atmosphereId: next?.id || null,
        atmosphereSource: source,
        bgmTrackId: bgmTrackIdRef.current,
      },
    }));
    syncAtmosphere();
  };

  const selectAtmosphere = (
    metadata: AtmosphereMetadata | null | undefined,
    source: 'chapter' | 'narration',
  ) => {
    // The chapter chooses its initial atmosphere. During manual reading,
    // scene metadata still feeds visual/music consumers but cannot change it.
    if (source === 'narration' && (!narrationActiveRef.current || manualAtmosphereRef.current)) return;

    const next = resolveAtmosphereBed(metadata, {
      // A chapter can establish a bed from one concrete setting tag. A live
      // switch needs corroborating metadata, preventing weak cues from
      // replacing the bed with a guess.
      minimumScore: source === 'chapter' ? 1 : 2,
    });

    if (source === 'narration' && !next) return;
    setAtmosphere(next, source);
  };

  const playCue = (fxType: string) => {
    if (!cuesAllowed()) return;
    const pattern = CUE_VIBRATIONS[fxType];
    if (pattern) vibrate(pattern);
    // Curated asset or nothing: a cue without an approved sound stays a
    // haptic-only beat, it never synthesizes a replacement.
    const asset = resolveNarrativeCueSound(fxType);
    if (!asset) return;
    playCardSound(asset, { volume: effectiveChannelVolume('cues') }).catch((err) => {
      console.warn('Narrative cue sound unavailable:', err);
    });
  };

  // Engine lifecycle: one scene-mix engine each for score and atmosphere.
  useEffect(() => {
    if (!sceneMixRef.current) {
      const engine = createSceneMixEngine({ loop: true });
      // Apply the saved level/mute state before anything can play, so the
      // first crossfade never bursts in at the engine's default level.
      const muted = !musicAllowed();
      engine.setMuted(muted);
      engine.setLevel(muted ? 0 : musicLevel());
      sceneMixRef.current = engine;

      // Restore a persisted pin after reload: the cue paths are gated off
      // while a track is pinned, so without this the scene stays silent
      // until the user touches the score picker again.
      if (bgmTrackIdRef.current !== 'auto') {
        const savedTrack = TRACK_LIBRARY.find(t => t.id === bgmTrackIdRef.current);
        if (savedTrack && savedTrack.url) {
          engine.crossfadeTo({
            id: savedTrack.id,
            title: savedTrack.id,
            artist: 'SEIHouse',
            audioFile: savedTrack.url,
          });
        }
      }
    }
    if (!atmoMixRef.current) {
      const engine = createSceneMixEngine({ loop: true, fadeMs: ATMOSPHERE_FADE_MS });
      engine.setMuted(true);
      engine.setLevel(0);
      atmoMixRef.current = engine;
    }
    return () => {
      sceneMixRef.current?.dispose();
      sceneMixRef.current = null;
      atmoMixRef.current?.dispose();
      atmoMixRef.current = null;
      activeBedRef.current = null;
    };
     
  }, []);

  // Re-level every layer whenever the user mix or the screen changes.
  // Master off collapses all effective levels to 0 without touching the
  // stored per-channel settings, so unmuting restores the exact same mix.
  useEffect(() => {
    syncBgmVolumes();
    syncAtmosphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mix, currentScreen]);

  // Control events from the Audio menu (track pin) and any legacy callers.
  useEffect(() => {
    const handleControl = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.atmosphere === 'none') {
        manualAtmosphereRef.current = true;
        setAtmosphere(null, 'manual');
      } else if (detail.atmosphere) {
        const selected = resolveAtmosphereBed(undefined, {
          preferredCategory: detail.atmosphere as AtmosphereCategory,
        });
        if (selected) {
          manualAtmosphereRef.current = true;
          setAtmosphere(selected, 'manual');
        }
      }
      if (typeof detail.bgmTrackId === 'string') {
        const requestedId = detail.bgmTrackId;
        bgmTrackIdRef.current = requestedId;
        try {
          localStorage.setItem('seihouse-bgm-track', requestedId);
        } catch {}
        window.dispatchEvent(new CustomEvent('seihouse-audio-state', {
          detail: {
            atmosphere: atmosphereRef.current?.variation || 'none',
            atmosphereId: atmosphereRef.current?.id || null,
            bgmTrackId: requestedId,
          },
        }));
        // This runs synchronously inside the user's click, which doubles
        // as the gesture browsers require before audio may start.
        if (sceneMixRef.current) {
          if (requestedId === 'auto') {
            // Hand control back to the narrative: restart the calm bed
            // (matched to the current chapter's tags) so the next cue can
            // take over from a known state.
            const bedTrack = scoreEngineRef.current.resolveChapterDefault(chapterTagsRef.current);
            if (bedTrack && bedTrack.url) {
              sceneMixRef.current.crossfadeTo({
                id: bedTrack.id,
                title: bedTrack.id,
                artist: 'SEIHouse',
                audioFile: bedTrack.url,
              });
            }
          } else {
            const track = TRACK_LIBRARY.find(t => t.id === requestedId);
            if (track && track.url) {
              sceneMixRef.current.crossfadeTo({
                id: track.id,
                title: track.id,
                artist: 'SEIHouse',
                audioFile: track.url,
              });
            }
          }
        }
      }
    };
    window.addEventListener('seihouse-audio-control', handleControl);
    return () => window.removeEventListener('seihouse-audio-control', handleControl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Narrative cue routing: metadata drives the continuous layers (score +
  // atmosphere bed), narrative.fx.play drives budgeted one-shots.
  useEffect(() => {
    const handleCue = (e: Event) => {
      try {
        // With master audio off, or outside the reader, neither play nor
        // change any audio state.
        if (!getAudioMixSettings().master.enabled) return;
        if (currentScreenRef.current !== 'reader') return;

        const cue = (e as CustomEvent).detail;

        if (cue.type === 'narrative.metadata.signature') {
          // Metadata signatures feed the CONTINUOUS systems only — scene-score
          // music, intensity ducking and the atmosphere bed. They are never a
          // one-shot effect anymore: automatic one-shots go exclusively
          // through narrative.fx.play, where the cinematic governor budgets
          // them and the auto-cue policy keeps them high-confidence.
          const meta = cue.metadata || cue.value;

          if (meta) {
            // A manually pinned track always wins over narrative cues.
            if (meta.music && musicAllowed() && bgmTrackIdRef.current === 'auto') {
              const newTrack = scoreEngineRef.current.evaluateSceneContext(
                meta.music,
                meta.environment || [],
                { danger: meta.danger, tension: meta.tension, intensity: meta.intensity },
              );
              if (newTrack && newTrack.url && sceneMixRef.current) {
                // The engine no-ops on the already-active track, parks the
                // incoming deck past leading silence, and runs an
                // equal-power crossfade between the scores.
                sceneMixRef.current.crossfadeTo({
                  id: newTrack.id,
                  title: newTrack.id,
                  artist: 'SEIHouse',
                  audioFile: newTrack.url,
                });
              }
            }

            if (typeof meta.intensity === 'number') {
              bgmIntensityRef.current = Math.max(0.1, Math.min(1.0, meta.intensity));
              syncBgmVolumes();
            }

            selectAtmosphere(meta, 'narration');
          }
        } else if (cue.type === 'narrative.chapter.enter') {
          // The header re-fires this cue whenever the observer re-attaches
          // (e.g. while blocks stream in during generation). Only treat it
          // as a chapter change the first time we see this cue id, so an
          // escalated score isn't reset mid-chapter.
          if (cue.id && cue.id === lastChapterCueIdRef.current) return;
          lastChapterCueIdRef.current = cue.id || null;

          scoreEngineRef.current.resetScene();
          const meta = cue.value;
          manualAtmosphereRef.current = false;

          // Raise the escalation baseline for the whole chapter so a
          // high-stakes chapter can score war/fighting music even on
          // blocks that don't restate the danger value.
          scoreEngineRef.current.setChapterContext({
            danger: meta?.danger,
            tension: meta?.tension,
            intensity: meta?.intensity,
          });

          // Start a calm bed immediately — adventure/ambient carry the
          // chapter until a block earns an escalation. This runs even for
          // chapters without a cue payload so there is always a bed.
          chapterTagsRef.current = [meta?.environment, meta?.theme].flat().filter(Boolean);

          if (musicAllowed() && bgmTrackIdRef.current === 'auto') {
            const bedTrack = scoreEngineRef.current.resolveChapterDefault(chapterTagsRef.current);
            if (bedTrack && bedTrack.url && sceneMixRef.current) {
              sceneMixRef.current.crossfadeTo({
                id: bedTrack.id,
                title: bedTrack.id,
                artist: 'SEIHouse',
                audioFile: bedTrack.url,
              });
            }
          }

          if (meta) {
            if (typeof meta.intensity === 'number') {
              bgmIntensityRef.current = Math.max(0.2, Math.min(1.0, meta.intensity));
              syncBgmVolumes();
            }

            selectAtmosphere(meta, 'chapter');
          } else {
            setAtmosphere(null, 'chapter');
          }
        } else if (cue.type === 'narrative.fx.play') {
          // Final gate: even a cue that slipped past the dispatch sites is
          // re-validated here. Footsteps / territory Foley / broad
          // environment tags normalize to null and play nothing — suppress,
          // never guess. Only a curated cue sound can play.
          const fxType = normalizeAutoCue(typeof cue.value === 'string' ? cue.value : '');
          if (!fxType) return;
          playCue(fxType);
        }
      } catch (err) {
        console.warn('Audio system error during cue handling (safely caught):', err);
      }
    };

    window.addEventListener('narrative-cue', handleCue);
    return () => window.removeEventListener('narrative-cue', handleCue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Narration state is deliberately a separate signal from scrolling. Manual
  // intersection cues must not crossfade the chapter bed just because the
  // reader reaches a metadata block.
  useEffect(() => {
    const handleNarration = (e: Event) => {
      const status = (e as CustomEvent).detail?.status;
      if (status === 'start' || status === 'resume') narrationActiveRef.current = true;
      if (status === 'pause' || status === 'end') narrationActiveRef.current = false;
    };
    window.addEventListener('seihouse-narration', handleNarration);
    return () => window.removeEventListener('seihouse-narration', handleNarration);
  }, []);

  // Headless: renders nothing, so it can never block menu options.
}

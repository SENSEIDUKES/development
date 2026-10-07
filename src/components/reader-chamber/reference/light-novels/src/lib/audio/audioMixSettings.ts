/**
 * Central user-facing audio settings for the reader.
 *
 * Four channels, each with an independent on/off switch and volume:
 *  - master:     gates and scales everything below
 *  - music:      scene-score BGM (SAP SceneMixEngine)
 *  - atmosphere: looping ambient beds — rain, wind, waves… (SAP sprite engine)
 *  - cues:       one-shot story sound effects + World Card sounds
 *
 * Turning master (or any channel) off never touches the other stored values,
 * so toggling back on restores the exact same mix. Playback engines read
 * their level through `effectiveChannelVolume`, which composes channel ×
 * master and collapses to 0 while either switch is off.
 */

export type AudioChannelId = 'master' | 'music' | 'atmosphere' | 'cues';

export interface AudioChannelSettings {
  enabled: boolean;
  /** 0..1 user level for this channel. */
  volume: number;
}

export type AudioMixSettings = Record<AudioChannelId, AudioChannelSettings>;

const STORAGE_KEY = 'seihouse-audio-mix';
/** Fired on window whenever any channel changes; detail is the full mix. */
export const AUDIO_MIX_EVENT = 'seihouse-audio-mix-changed';

/**
 * Scene-score music always sits under the narration: the music channel's
 * 0..1 user level maps onto 0..MUSIC_LEVEL_CAP of actual element gain.
 */
export const MUSIC_LEVEL_CAP = 0.4;

const LEGACY_MUTED_KEY = 'seihouse-audio-muted';
const LEGACY_VOLUME_KEY = 'seihouse-audio-volume';
const LEGACY_BGM_VOLUME_KEY = 'seihouse-bgm-volume';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const DEFAULT_MIX: AudioMixSettings = {
  master: { enabled: true, volume: 1 },
  music: { enabled: true, volume: 0.625 }, // 0.625 × cap = old 0.25 default gain
  atmosphere: { enabled: true, volume: 0.5 },
  cues: { enabled: true, volume: 0.5 },
};

const cloneMix = (mix: AudioMixSettings): AudioMixSettings => ({
  master: { ...mix.master },
  music: { ...mix.music },
  atmosphere: { ...mix.atmosphere },
  cues: { ...mix.cues },
});

const sanitizeChannel = (
  raw: unknown,
  fallback: AudioChannelSettings,
): AudioChannelSettings => {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const candidate = raw as Partial<AudioChannelSettings>;
  return {
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : fallback.enabled,
    volume: typeof candidate.volume === 'number' && Number.isFinite(candidate.volume)
      ? clamp01(candidate.volume)
      : fallback.volume,
  };
};

/**
 * First run after the split-controls update: seed the mix from the old
 * scattered keys so nobody's levels jump. The old single mute switch becomes
 * the master switch; the old shared atmosphere/cue volume seeds both of
 * those channels; the old BGM gain (0..cap) rescales onto the 0..1 slider.
 */
const migrateLegacySettings = (): AudioMixSettings => {
  const mix = cloneMix(DEFAULT_MIX);
  try {
    if (localStorage.getItem(LEGACY_MUTED_KEY) === 'true') {
      mix.master.enabled = false;
    }
    const legacyVolume = parseFloat(localStorage.getItem(LEGACY_VOLUME_KEY) ?? '');
    if (Number.isFinite(legacyVolume)) {
      mix.atmosphere.volume = clamp01(legacyVolume);
      mix.cues.volume = clamp01(legacyVolume);
    }
    const legacyBgm = parseFloat(localStorage.getItem(LEGACY_BGM_VOLUME_KEY) ?? '');
    if (Number.isFinite(legacyBgm)) {
      mix.music.volume = clamp01(legacyBgm / MUSIC_LEVEL_CAP);
    }
  } catch {
    // Unreadable legacy keys just mean defaults.
  }
  return mix;
};

let cachedMix: AudioMixSettings | null = null;

const loadMix = (): AudioMixSettings => {
  if (typeof localStorage === 'undefined') return cloneMix(DEFAULT_MIX);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<AudioChannelId, unknown>>;
      return {
        master: sanitizeChannel(parsed.master, DEFAULT_MIX.master),
        music: sanitizeChannel(parsed.music, DEFAULT_MIX.music),
        atmosphere: sanitizeChannel(parsed.atmosphere, DEFAULT_MIX.atmosphere),
        cues: sanitizeChannel(parsed.cues, DEFAULT_MIX.cues),
      };
    }
    const migrated = migrateLegacySettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return cloneMix(DEFAULT_MIX);
  }
};

export function getAudioMixSettings(): AudioMixSettings {
  if (!cachedMix) cachedMix = loadMix();
  return cloneMix(cachedMix);
}

export function setAudioChannel(
  channel: AudioChannelId,
  patch: Partial<AudioChannelSettings>,
): AudioMixSettings {
  const mix = getAudioMixSettings();
  const next: AudioChannelSettings = {
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : mix[channel].enabled,
    volume: typeof patch.volume === 'number' && Number.isFinite(patch.volume)
      ? clamp01(patch.volume)
      : mix[channel].volume,
  };
  mix[channel] = next;
  cachedMix = cloneMix(mix);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedMix));
  } catch {
    // Storage full/unavailable — keep the in-memory mix working.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUDIO_MIX_EVENT, { detail: cloneMix(mix) }));
  }
  return mix;
}

/**
 * The level a playback engine should actually apply for a channel:
 * channel volume × master volume, or 0 while master or the channel is off.
 * For 'master' itself this is just its own switch × volume.
 */
export function effectiveChannelVolume(
  channel: AudioChannelId,
  mix: AudioMixSettings = getAudioMixSettings(),
): number {
  if (!mix.master.enabled) return 0;
  if (channel === 'master') return mix.master.volume;
  if (!mix[channel].enabled) return 0;
  return clamp01(mix[channel].volume * mix.master.volume);
}

export function isChannelAudible(
  channel: AudioChannelId,
  mix: AudioMixSettings = getAudioMixSettings(),
): boolean {
  return effectiveChannelVolume(channel, mix) > 0;
}

export function subscribeAudioMix(
  listener: (mix: AudioMixSettings) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as AudioMixSettings | undefined;
    listener(detail ?? getAudioMixSettings());
  };
  window.addEventListener(AUDIO_MIX_EVENT, handler);
  return () => window.removeEventListener(AUDIO_MIX_EVENT, handler);
}

/** Test hook: drop the module cache so the next read hits localStorage. */
export function resetAudioMixCacheForTests() {
  cachedMix = null;
}

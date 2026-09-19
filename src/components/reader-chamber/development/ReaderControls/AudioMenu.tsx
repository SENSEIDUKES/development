import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Volume2, VolumeX } from 'lucide-react';
import { useAudioMix } from '../../../../narrative/readerRuntime';
import { AudioChannelId } from '../../../../narrative/readerRuntime';
import type { SceneAudioTrack } from '../../../../audio/soundscapes';
import { useReaderRuntime } from '../../../../narrative/readerRuntime';
import { useNarrativeAudio } from '../../../../audio/playback';
import type { ResolvedSoundscape } from '../../../../audio/media';

const groupTracks = (tracks: SceneAudioTrack[]) => tracks.reduce<Record<string, SceneAudioTrack[]>>((groups, track) => {
  const folder = track.group || 'OTHER';
  (groups[folder] = groups[folder] || []).push(track);
  return groups;
}, {});

const formatTrackName = (id: string) =>
  id.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

interface ChannelRowProps {
  label: string;
  description: string;
  enabled: boolean;
  volume: number;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
  onVolume: (volume: number) => void;
  children?: React.ReactNode;
}

function ChannelRow({
  label,
  description,
  enabled,
  volume,
  disabled = false,
  onToggle,
  onVolume,
  children,
}: ChannelRowProps) {
  const interactive = !disabled;
  return (
    <div className={`space-y-1.5 transition-opacity duration-200 ${disabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-neutral-300">{label}</span>
          <span className="text-[8px] text-neutral-500">{description}</span>
        </div>
        <button
          onClick={() => interactive && onToggle(!enabled)}
          disabled={disabled}
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${label}`}
          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
            enabled ? 'bg-portal/60' : 'bg-neutral-850'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
              enabled ? 'translate-x-4 bg-signal' : 'translate-x-0 bg-neutral-500'
            }`}
          />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          disabled={disabled || !enabled}
          aria-label={`${label} volume`}
          onChange={event => onVolume(Number(event.target.value))}
          className="h-1 w-full cursor-pointer accent-portal disabled:opacity-40"
        />
        <span className="w-8 text-right font-mono text-[9px] text-neutral-500">
          {Math.round(volume * 100)}%
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * The one place all sound is controlled: Master Audio over three simple
 * categories (Music, Atmosphere, Audio Cues), each with its own on/off
 * switch and volume. Turning Master Audio off silences everything but never
 * changes the individual settings underneath.
 */
export function AudioMenu({
  idSuffix = 'desktop',
  soundscapes = [],
}: {
  idSuffix?: string;
  soundscapes?: ResolvedSoundscape[];
}) {
  const runtime = useReaderRuntime();
  const { mix, setChannel } = useAudioMix();
  const playback = useNarrativeAudio();
  const volumeBeforeSoundscape = useRef<number | null>(null);
  const tracks = useMemo(() => {
    const byId = new Map(runtime.tracks.map(track => [track.id, track]));
    soundscapes.forEach(soundscape => byId.set(soundscape.resource.track.id, soundscape.resource.track));
    return [...byId.values()];
  }, [soundscapes, runtime.tracks]);
  const scoreGroups = useMemo(() => groupTracks(tracks), [tracks]);

  // The pinned music track lives with the playback engine (it is a "what to
  // play" choice, not a level); sync over the existing control/state events.
  const [bgmTrackId, setBgmTrackId] = useState(() =>
    runtime.preferences?.read('music-track') || 'auto',
  );


  const handleTrackChange = (id: string) => {
    setBgmTrackId(id);
    runtime.preferences?.write('music-track', id);
    runtime.selectMusicTrack?.(id);
  };

  const selectedTrack = bgmTrackId === 'auto'
    ? soundscapes[0]?.resource.track
    : tracks.find(track => track.id === bgmTrackId);
  useEffect(() => {
    if (bgmTrackId !== 'auto' && !selectedTrack) handleTrackChange('auto');
  }, [bgmTrackId, selectedTrack]);

  const soundscapeVolume = mix.master.enabled && mix.music.enabled
    ? mix.master.volume * mix.music.volume
    : 0;
  useEffect(() => {
    if (playback.currentTrackId?.startsWith('reader-soundscape:')) {
      playback.setVolume(soundscapeVolume);
    } else if (volumeBeforeSoundscape.current !== null) {
      playback.setVolume(volumeBeforeSoundscape.current);
      volumeBeforeSoundscape.current = null;
    }
  }, [playback.currentTrackId, playback.setVolume, soundscapeVolume]);

  const playSelectedSoundscape = () => {
    if (!selectedTrack) return;
    volumeBeforeSoundscape.current ??= playback.volume;
    playback.setVolume(soundscapeVolume);
    playback.replace({
      id: `reader-soundscape:${selectedTrack.id}`,
      source: selectedTrack.url,
      title: formatTrackName(selectedTrack.id),
      artist: 'SEN Soundscape',
    });
  };

  const toggle = (channel: AudioChannelId) => (enabled: boolean) => {
    runtime.haptic?.('softTap');
    setChannel(channel, { enabled });
  };
  const level = (channel: AudioChannelId) => (volume: number) => setChannel(channel, { volume });

  return (
    <div className="space-y-3.5">
      {/* Master on top: mutes or unmutes everything below at once. */}
      <div className="space-y-1.5 rounded-lg border border-neutral-900 bg-neutral-950/85 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {mix.master.enabled ? (
              <Volume2 size={12} className="text-portal" />
            ) : (
              <VolumeX size={12} className="text-neutral-500" />
            )}
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[#FAFAFA] font-sans">Master Audio</span>
              <span className="text-[9px] text-neutral-500 font-sans">
                All sound on or off. Your settings below are kept.
              </span>
            </div>
          </div>
          <button
            onClick={() => toggle('master')(!mix.master.enabled)}
            role="switch"
            aria-checked={mix.master.enabled}
            aria-label="Toggle Master Audio"
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              mix.master.enabled ? 'bg-portal/80 shadow-[0_0_8px_rgba(4,172,255,0.4)]' : 'bg-neutral-850'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-void shadow transition duration-200 ease-in-out ${
                mix.master.enabled ? 'translate-x-4 bg-signal' : 'translate-x-0 bg-neutral-500'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={mix.master.volume}
            disabled={!mix.master.enabled}
            aria-label="Master Audio volume"
            onChange={event => level('master')(Number(event.target.value))}
            className="h-1 w-full cursor-pointer accent-portal disabled:opacity-40"
          />
          <span className="w-8 text-right font-mono text-[9px] text-neutral-500">
            {Math.round(mix.master.volume * 100)}%
          </span>
        </div>
      </div>

      <div className="space-y-3 pl-1">
        <ChannelRow
          label="Music"
          description="Background music for each scene."
          enabled={mix.music.enabled}
          volume={mix.music.volume}
          disabled={!mix.master.enabled}
          onToggle={toggle('music')}
          onVolume={level('music')}
        >
          <label
            className="block text-[8px] text-neutral-500"
            htmlFor={`audio-menu-track-${idSuffix}`}
          >
            Track
            <select
              id={`audio-menu-track-${idSuffix}`}
              value={bgmTrackId}
              disabled={!mix.master.enabled || !mix.music.enabled}
              onChange={event => handleTrackChange(event.target.value)}
              className="mt-1 w-full rounded border border-neutral-850 bg-void p-1 text-[10px] text-neutral-300 focus:border-portal focus:outline-none disabled:opacity-40"
            >
              <option value="auto">Automatic (follows the story)</option>
              {Object.entries(scoreGroups).map(([group, tracks]) => (
                <optgroup key={group} label={group.charAt(0) + group.slice(1).toLowerCase()}>
                  {tracks.map(track => (
                    <option key={track.id} value={track.id}>{formatTrackName(track.id)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={playSelectedSoundscape}
              disabled={!selectedTrack || !mix.master.enabled || !mix.music.enabled}
              className="inline-flex min-h-8 items-center gap-1.5 rounded border border-portal/30 bg-portal/10 px-2 text-[9px] font-medium text-portal disabled:opacity-40"
            >
              <Play size={11} aria-hidden="true" />
              Play soundscape
            </button>
            <button
              type="button"
              onClick={() => playback.stop()}
              disabled={!playback.currentTrackId?.startsWith('reader-soundscape:')}
              className="inline-flex min-h-8 items-center gap-1.5 rounded border border-neutral-800 px-2 text-[9px] text-neutral-400 disabled:opacity-40"
            >
              <Square size={10} aria-hidden="true" />
              Stop
            </button>
          </div>
          {bgmTrackId === 'auto' && !selectedTrack && (
            <p className="mt-2 text-[9px] leading-relaxed text-neutral-500">This chapter has no resolved soundscape. Reading remains available without audio.</p>
          )}
          {playback.hasError && playback.currentTrackId?.startsWith('reader-soundscape:') && (
            <p role="status" className="mt-2 text-[9px] leading-relaxed text-human">Soundscape unavailable. The chapter remains readable.</p>
          )}
        </ChannelRow>

        <ChannelRow
          label="Atmosphere"
          description="Ambient sound like rain and wind."
          enabled={mix.atmosphere.enabled}
          volume={mix.atmosphere.volume}
          disabled={!mix.master.enabled}
          onToggle={toggle('atmosphere')}
          onVolume={level('atmosphere')}
        />

        <ChannelRow
          label="Audio Cues"
          description="Short sound effects for story moments."
          enabled={mix.cues.enabled}
          volume={mix.cues.volume}
          disabled={!mix.master.enabled}
          onToggle={toggle('cues')}
          onVolume={level('cues')}
        />
      </div>
    </div>
  );
}

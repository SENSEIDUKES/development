import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudioMix } from '../../hooks/audio/useAudioMix';
import { AudioChannelId } from '../../lib/audio/audioMixSettings';
import { TRACK_LIBRARY } from '../../lib/audio/musicResolver';
import { vibrate } from '../../lib/vibration';

const SCORE_GROUPS = TRACK_LIBRARY.reduce<Record<string, typeof TRACK_LIBRARY>>((groups, track) => {
  const folder = track.url.split('/AUDIO/')[1]?.split('/')[0] || 'OTHER';
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
export function AudioMenu({ idSuffix = 'desktop' }: { idSuffix?: string }) {
  const { mix, setChannel } = useAudioMix();

  // The pinned music track lives with the playback engine (it is a "what to
  // play" choice, not a level); sync over the existing control/state events.
  const [bgmTrackId, setBgmTrackId] = useState(() =>
    (typeof localStorage !== 'undefined' && localStorage.getItem('seihouse-bgm-track')) || 'auto',
  );

  useEffect(() => {
    const handleState = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail && typeof detail.bgmTrackId === 'string') setBgmTrackId(detail.bgmTrackId);
    };
    window.addEventListener('seihouse-audio-state', handleState);
    return () => window.removeEventListener('seihouse-audio-state', handleState);
  }, []);

  const handleTrackChange = (id: string) => {
    setBgmTrackId(id);
    window.dispatchEvent(new CustomEvent('seihouse-audio-control', { detail: { bgmTrackId: id } }));
  };

  const toggle = (channel: AudioChannelId) => (enabled: boolean) => {
    vibrate('softTap');
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
              {Object.entries(SCORE_GROUPS).map(([group, tracks]) => (
                <optgroup key={group} label={group.charAt(0) + group.slice(1).toLowerCase()}>
                  {tracks.map(track => (
                    <option key={track.id} value={track.id}>{formatTrackName(track.id)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
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

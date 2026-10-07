import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { vibrate } from '../lib/vibration';
import { useAudioMix } from '../hooks/audio/useAudioMix';

/**
 * Compact header shortcut for the Master Audio channel. The full per-channel
 * controls (Music / Atmosphere / Audio Cues) live in the reader's Immersion
 * Control Matrix; this widget only flips and scales the master.
 */
export const AudioWidget = React.memo(function AudioWidget() {
  const { mix, setChannel } = useAudioMix();

  const handleMuteToggle = () => {
    vibrate('softTap');
    setChannel('master', { enabled: !mix.master.enabled });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChannel('master', { volume: parseFloat(e.target.value) });
  };

  const muted = !mix.master.enabled;

  return (
    <div className="flex items-center space-x-2 bg-void/80 border border-neutral-850 px-2 py-1.5 rounded transition-all group hover:border-portal min-w-[30px] sm:min-w-[40px]">
      <button
         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleMuteToggle}
        className="text-neutral-400 hover:text-portal transition-colors"
        title={muted ? "Unmute Audio" : "Mute Audio"}
        aria-label={muted ? "Unmute Audio" : "Mute Audio"}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={mix.master.volume}
        onChange={handleVolumeChange}
        className="w-16 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-portal/50 hidden sm:group-hover:block transition-all"
        title="Volume"
        aria-label="Audio Volume"
      />
    </div>
  );
});

import { Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { useDevAudioPlayback } from '../../../audio/DevAudioPlayback';

const SMOKE_TRACK = {
  id: 'development-audio-smoke',
  title: 'Library Help audio smoke sample',
  artist: 'SEN Development',
  // Existing published Library Help narration keeps this diagnostic independent
  // of a new fixture or a separate browser playback implementation.
  source: 'https://lines.seihouse.org/LIBRARY/Lines/SYSTEM/SYSTEM/HELP%20LINES/STORY%20SEED%20ENG.mp3',
};

export function AudioPlayerSmokeWorkspace() {
  const audio = useDevAudioPlayback();
  const isLoaded = audio.currentTrackId === SMOKE_TRACK.id;

  return (
    <main className="min-h-screen bg-[#04060d] px-5 py-10 text-slate-200 sm:px-8">
      <section className="mx-auto max-w-xl rounded-2xl border border-cyan-300/20 bg-slate-950/70 p-5 shadow-2xl sm:p-7">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-200/70">Development-only diagnostic</p>
        <h1 className="mt-2 text-xl font-semibold text-white">SEIHouse Player Smoke Test</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Uses the shared DEV session and an existing Library Help narration asset. It does not add a second player.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => audio.load(SMOKE_TRACK)} className="workshop-touch-target rounded-full border border-cyan-300/35 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10">
            Load sample
          </button>
          <button type="button" onClick={() => audio.play(SMOKE_TRACK)} className="workshop-touch-target inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-200">
            <Play size={16} fill="currentColor" /> Play / Resume
          </button>
          <button type="button" onClick={audio.pause} className="workshop-touch-target inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
            <Pause size={16} fill="currentColor" /> Pause
          </button>
          <button type="button" onClick={() => audio.stop(SMOKE_TRACK.id)} className="workshop-touch-target inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
            <Square size={15} fill="currentColor" /> Stop
          </button>
        </div>

        <label className="mt-6 flex items-center gap-3 text-sm text-slate-300">
          <Volume2 size={17} className="text-cyan-200" />
          <span>Volume</span>
          <input
            aria-label="Smoke-test volume"
            className="min-w-0 flex-1 accent-cyan-300"
            max="1"
            min="0"
            onChange={(event) => audio.setVolume(Number(event.target.value))}
            step="0.05"
            type="range"
            value={audio.volume}
          />
          <span className="w-9 text-right font-mono text-xs text-slate-400">{Math.round(audio.volume * 100)}%</span>
        </label>

        <button type="button" onClick={audio.toggleMute} className="workshop-touch-target mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
          {audio.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {audio.isMuted ? 'Unmute' : 'Mute'}
        </button>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-5 text-sm">
          <dt className="text-slate-500">Sample</dt>
          <dd className="text-right text-slate-200">{isLoaded ? 'Loaded' : 'Not loaded'}</dd>
          <dt className="text-slate-500">Playback</dt>
          <dd className="text-right text-slate-200">{isLoaded && audio.isPlaying ? 'Playing' : 'Paused / stopped'}</dd>
          <dt className="text-slate-500">Engine</dt>
          <dd className="text-right text-cyan-100">@seihouse/audio-player</dd>
        </dl>
      </section>
    </main>
  );
}

export default AudioPlayerSmokeWorkspace;

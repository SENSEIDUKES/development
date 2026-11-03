import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './familiar.css';

/**
 * A short silent screen recording the Familiar talks over: a help topic's
 * clip on its card, a guide on the Familiar page. It loops without sound,
 * waits for a tap where the reader asked for less motion, and can always be
 * paused from the keyboard. It shows the whole recording, wide or tall: the
 * frame follows the video's own shape once it loads (`data-shape`).
 */
export function FamiliarClip({ src, label, className = '' }: { src: string; label: string; className?: string }) {
  const clip = useRef<HTMLVideoElement>(null);
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const [playing, setPlaying] = useState(false);
  const [shape, setShape] = useState<'wide' | 'tall' | null>(null);
  return (
    <div className={`familiar-clip-frame ${className}`.trim()} data-shape={shape ?? undefined} data-familiar-clip>
      <video ref={clip} key={src} className="familiar-clip" src={src} autoPlay={!reducedMotion} muted loop playsInline preload="metadata"
        aria-label={label} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onLoadedMetadata={event => {
          const { videoWidth, videoHeight } = event.currentTarget;
          if (videoWidth && videoHeight) setShape(videoHeight > videoWidth ? 'tall' : 'wide');
        }} />
      <button type="button" className="familiar-clip-toggle" aria-label={playing ? 'Pause the clip' : 'Play the clip'}
        onClick={() => { const video = clip.current; if (!video) return; if (video.paused) void video.play(); else video.pause(); }}>
        {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
      </button>
    </div>
  );
}

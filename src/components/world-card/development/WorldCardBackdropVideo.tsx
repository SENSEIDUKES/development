import { useEffect, useRef, useState } from 'react';

/** True when the reader asked for less motion; the clip then stays still. */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * A world's own motion picture looping silently behind a surface (the Feature card's band,
 * World Info's backdrop). It shows only once it truly plays, so a phone that will not start
 * it (Low Power Mode) keeps the still backdrop, never a frozen frame with a play button.
 * Nothing renders without a clip or when the reader prefers reduced motion.
 */
export function WorldCardBackdropVideo({ src, className }: { src?: string; className: string }) {
  const videoUrl = src?.trim() && !prefersReducedMotion() ? src.trim() : undefined;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Muted and inline, set on the element itself, so browsers allow it to start on its own.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    // Autoplay can start before React listens for it, so the play() result also counts as playing.
    if (!video.paused && video.readyState > 2) setPlaying(true);
    void video.play()?.then(() => { if (!video.paused) setPlaying(true); })
      .catch(() => { /* Autoplay refused: the still backdrop stays. */ });
  }, [videoUrl]);
  if (!videoUrl) return null;
  return <video ref={videoRef} className={`world-card-backdrop-video ${className}`} src={videoUrl}
    muted loop playsInline autoPlay preload="metadata" aria-hidden="true" tabIndex={-1}
    data-playing={playing ? 'true' : undefined} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} />;
}

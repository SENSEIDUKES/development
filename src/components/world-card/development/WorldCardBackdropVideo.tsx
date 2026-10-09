import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

/** True when the reader asked for less motion; the clip then waits for the reader to start it. */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** What a surface can do with its backdrop clip: start it by the reader's own tap, or stop it. */
export interface WorldCardBackdropVideoHandle {
  play(): void;
  pause(): void;
}

/**
 * A world's own motion picture looping silently behind a surface (the Feature card's band,
 * World Info's backdrop). It shows only once it truly plays, so a phone that will not start
 * it (Low Power Mode) keeps the still backdrop, never a frozen frame with a play button.
 * It starts on its own unless the reader prefers reduced motion; a surface can still start
 * it from the reader's tap through the handle (a tap is allowed even when autoplay is not).
 * Nothing renders without a clip.
 */
export const WorldCardBackdropVideo = forwardRef<WorldCardBackdropVideoHandle, {
  src?: string;
  className: string;
  /** Told whenever the clip starts or stops truly playing. */
  onPlayingChange?: (playing: boolean) => void;
}>(function WorldCardBackdropVideo({ src, className, onPlayingChange }, ref) {
  const videoUrl = src?.trim() || undefined;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlayingState] = useState(false);
  const onChangeRef = useRef(onPlayingChange);
  onChangeRef.current = onPlayingChange;
  const setPlaying = (next: boolean) => { setPlayingState(next); onChangeRef.current?.(next); };

  const start = () => {
    const video = videoRef.current;
    if (!video) return;
    // Muted and inline, set on the element itself, so browsers allow it to start.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    // Autoplay can start before React listens for it, so the play() result also counts as playing.
    if (!video.paused && video.readyState > 2) setPlaying(true);
    void video.play()?.then(() => { if (!video.paused) setPlaying(true); })
      .catch(() => { /* Refused (Low Power Mode): the still backdrop stays. */ });
  };
  useImperativeHandle(ref, () => ({ play: start, pause: () => videoRef.current?.pause() }));
  useEffect(() => {
    if (!prefersReducedMotion()) start();
  }, [videoUrl]);

  if (!videoUrl) return null;
  const autoPlay = !prefersReducedMotion();
  return <video ref={videoRef} className={`world-card-backdrop-video ${className}`} src={videoUrl}
    muted loop playsInline autoPlay={autoPlay} preload="metadata" aria-hidden="true" tabIndex={-1}
    data-playing={playing ? 'true' : undefined} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} />;
});

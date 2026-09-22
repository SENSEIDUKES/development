import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Film, Square } from 'lucide-react';
import './motion-picture.css';
import { useDominantColor } from './useDominantColor';

export interface MotionPictureProps {
  /** The still artwork this item always falls back to. */
  stillUrl: string;
  /** This item's own motion clip. Without one no control is offered and the still stands alone. */
  videoUrl?: string;
  /** Describes the artwork itself; the control composes its own accessible name from it. */
  alt: string;
  /** Controlled playback for hosts that persist the choice. Omit to let the component own it. */
  playing?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  /** Hold the final frame instead of returning to the still when the clip ends. */
  hold?: boolean;
  /** Suppress the sampled aura on surfaces that supply their own framing. */
  glow?: boolean;
  /** Overlaid above the artwork, for a host's own badge or caption. */
  children?: ReactNode;
  className?: string;
}

/**
 * MotionPicture — a still that turns into its own motion clip on demand.
 *
 * The still is the item's resting state. When a clip is supplied, one overlay
 * control on the artwork itself plays it in place, lit by an aura sampled from
 * that artwork, and the still returns when the clip ends. Any item with a
 * picture and a clip can use it: a novel cover, a Familiar, a relic.
 *
 * The host owns whether the choice is remembered — pass `playing` to persist
 * it, or leave it off and the component keeps the state itself.
 */
export function MotionPicture({
  stillUrl,
  videoUrl,
  alt,
  playing,
  onPlayingChange,
  hold = false,
  glow = true,
  children,
  className,
}: MotionPictureProps) {
  const clip = useRef<HTMLVideoElement>(null);
  const [ownPlaying, setOwnPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  // The clip stays mounted once played so stopping crossfades back instead of cutting.
  const [loaded, setLoaded] = useState(false);
  const auraColor = useDominantColor(glow ? stillUrl : undefined);
  const requested = playing ?? ownPlaying;
  // A clip that cannot load stops offering itself rather than blanking the artwork.
  const offered = Boolean(videoUrl) && !failed;
  const active = offered && requested;

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [videoUrl]);

  useEffect(() => {
    if (active) setLoaded(true);
  }, [active]);

  useEffect(() => {
    const element = clip.current;
    if (!element) return;
    if (!active) {
      element.pause();
      return;
    }
    // Every replay starts from the top, but seeking a clip that has loaded
    // nothing yet cancels its own source selection, so a fresh one is left alone.
    if (element.readyState > 0) element.currentTime = 0;
    void element.play().catch(() => undefined);
  }, [active, loaded]);

  const setPlaying = (next: boolean) => {
    setOwnPlaying(next);
    onPlayingChange?.(next);
  };

  return <div className={`motion-picture${className ? ` ${className}` : ''}`} data-playing={active || undefined}
    style={glow ? { ['--motion-picture-glow' as string]: auraColor } : undefined}>
    {glow && offered && <div className="motion-picture-aura" aria-hidden="true">
      <span className="motion-picture-aura-fog" />
      <span className="motion-picture-aura-pulse" />
      <span className="motion-picture-aura-halo" />
    </div>}
    <div className="motion-picture-frame">
      <img src={stillUrl} alt={alt} className="motion-picture-still" loading="lazy" decoding="async" />
      {offered && loaded && <video ref={clip} key={videoUrl} src={videoUrl} className="motion-picture-clip"
        aria-hidden="true" muted playsInline
        onEnded={() => { if (!hold) setPlaying(false); }}
        onError={() => { setFailed(true); setPlaying(false); }} />}
      {children}
      {offered && <button type="button" className="motion-picture-control" aria-pressed={active}
        aria-label={`${active ? 'Stop' : 'Play'} motion for ${alt}`}
        onClick={() => setPlaying(!active)}>
        {active ? <Square size={14} aria-hidden="true" /> : <Film size={14} aria-hidden="true" />}
      </button>}
    </div>
  </div>;
}

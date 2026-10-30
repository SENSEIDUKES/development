import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { familiarActivityAnimation, type FamiliarActivity, type FamiliarDefinition } from '../shared/familiar';
import { useFamiliarVisibility } from './useFamiliarVisibility';
import './familiar.css';

export interface FamiliarSpriteProps {
  familiar: FamiliarDefinition;
  /** Host activity selects its matching supplied clip unless an explicit animation overrides it. */
  activity?: FamiliarActivity;
  animation?: string;
  /** Companion cadence is separate from raw atlas inspection and explicit one-shots. */
  playback?: 'loop' | 'companion';
  /** A supplied single-cell look pose, used only while the companion is idle. */
  lookAnimation?: string;
  paused?: boolean;
  /** Change this request value to play the selected clip once, then return to neutral. */
  playOnce?: number;
  statusId?: string;
}

/** Select an atlas clip without reloading unchanged artwork. */
export function FamiliarSprite({ familiar, activity, animation, playback = 'loop', lookAnimation, paused = false, playOnce, statusId }: FamiliarSpriteProps) {
  const selectedAnimation = animation ?? familiarActivityAnimation(familiar, activity) ?? 'idle';
  const clip = familiar.animations[selectedAnimation] ?? familiar.animations.idle;
  return <SpritePlayback key={familiar.spriteUrl} familiar={familiar} clip={clip} playback={playback} lookAnimation={lookAnimation} paused={paused} playOnce={playOnce} statusId={statusId} />;
}

/** Play supplied frame timings while respecting pause, visibility, and reduced motion. */
function SpritePlayback({ familiar, clip, playback, lookAnimation, paused, playOnce, statusId }: {
  familiar: FamiliarDefinition;
  clip: FamiliarDefinition['animations'][string];
  playback: 'loop' | 'companion';
  lookAnimation?: string;
  paused: boolean;
  playOnce?: number;
  statusId?: string;
}) {
  const oneShot = playOnce !== undefined;
  const restingClip = oneShot ? (familiar.animations.neutral ?? familiar.animations.idle ?? clip) : clip;
  const lastRequest = useRef(playOnce);
  const requestPlayback = useRef<(() => void) | null>(null);
  const refreshLook = useRef<(() => void) | null>(null);
  const look = useRef<FamiliarDefinition['animations'][string] | undefined>(undefined);
  const consumedReaction = useRef<typeof clip | null>(null);
  const frame = useRef(0);
  const sprite = useRef<HTMLSpanElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const visible = useFamiliarVisibility(sprite);

  // Updating a mouse target must not restart a reaction or its frame timer.
  useEffect(() => {
    const candidate = lookAnimation?.startsWith('look-') ? familiar.animations[lookAnimation] : undefined;
    look.current = candidate?.columns.length === 1 ? candidate : undefined;
    refreshLook.current?.();
  }, [lookAnimation, familiar.animations]);

  useEffect(() => {
    frame.current = 0;
    consumedReaction.current = null;
    if (sprite.current) sprite.current.dataset.familiarFrame = '0';
  }, [clip, playback]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(query.matches);
    query.addEventListener('change', updateMotion);
    return () => {
      query.removeEventListener('change', updateMotion);
    };
  }, []);

  useEffect(() => {
    if (playback === 'companion' && !oneShot) {
      const idle = familiar.animations.idle;
      const neutral = familiar.animations.neutral ?? idle;
      const paint = (current: typeof clip, index: number, pose: string) => {
        if (image.current) image.current.style.transform = `translate(${-current.columns[index] * 100 / familiar.columns}%, ${-current.row * 100 / familiar.rows}%)`;
        if (sprite.current) {
          sprite.current.dataset.familiarFrame = String(index);
          sprite.current.dataset.familiarPose = pose;
          sprite.current.setAttribute('aria-label', `${familiar.displayName}, ${current.label}`);
        }
      };
      refreshLook.current = null;
      if (clip === idle) consumedReaction.current = null;
      if (!loaded || failed) return;
      if (paused || reducedMotion || !visible) {
        // Suppressed reactions are not queued up for a later return to the page.
        consumedReaction.current = clip;
        if (!paused) paint(neutral, 0, 'resting');
        return;
      }
      let timer: number | undefined;
      let reacting = clip !== idle && clip.columns.length > 1 && consumedReaction.current !== clip;
      let index = 0;
      let cycles = 0;
      const rest = () => {
        if (reacting) return;
        window.clearTimeout(timer);
        index = 0;
        if (look.current) paint(look.current, 0, 'looking');
        else {
          paint(idle, index, 'idle');
          if (idle.columns.length > 1) timer = window.setTimeout(advance, idle.durations[index] * 6);
        }
      };
      const advance = () => {
        const current = reacting ? clip : idle;
        index += 1;
        if (index === current.columns.length) {
          index = 0;
          if (reacting && ++cycles === 3) {
            consumedReaction.current = clip;
            reacting = false;
            rest();
            return;
          }
        }
        paint(current, index, reacting ? 'reacting' : 'idle');
        timer = window.setTimeout(advance, current.durations[index] * (reacting ? 1 : 6));
      };
      refreshLook.current = rest;
      if (reacting) {
        paint(clip, 0, 'reacting');
        timer = window.setTimeout(advance, clip.durations[0]);
      } else rest();
      return () => {
        window.clearTimeout(timer);
        refreshLook.current = null;
      };
    }
    consumedReaction.current = null;
    if (sprite.current) sprite.current.setAttribute('aria-label', `${familiar.displayName}, ${clip.label}`);
    if (oneShot) {
      const paint = (currentClip: typeof clip, index: number, pose: 'resting' | 'playing') => {
        if (image.current) image.current.style.transform = `translate(${-currentClip.columns[index] * 100 / familiar.columns}%, ${-currentClip.row * 100 / familiar.rows}%)`;
        if (sprite.current) {
          sprite.current.dataset.familiarFrame = String(index);
          sprite.current.dataset.familiarPose = pose;
        }
      };
      const rest = () => paint(restingClip, 0, 'resting');
      rest();
      requestPlayback.current = null;
      if (!loaded || failed || paused || reducedMotion || !visible || clip.columns.length < 2) return;
      let timer: number | undefined;
      let playing = false;
      requestPlayback.current = () => {
        if (playing) return;
        playing = true;
        const advance = (index: number) => {
          paint(clip, index, 'playing');
          timer = window.setTimeout(() => {
            if (index + 1 < clip.columns.length) advance(index + 1);
            else {
              rest();
              playing = false;
            }
          }, clip.durations[index]);
        };
        advance(0);
      };
      return () => {
        window.clearTimeout(timer);
        requestPlayback.current = null;
      };
    }
    // A mode change may keep the same clip; replace the companion's held look
    // even when React's initial transform prop has not changed.
    if (image.current) image.current.style.transform = `translate(${-clip.columns[frame.current] * 100 / familiar.columns}%, ${-clip.row * 100 / familiar.rows}%)`;
    if (sprite.current) {
      sprite.current.dataset.familiarFrame = String(frame.current);
      delete sprite.current.dataset.familiarPose;
    }
    if (!loaded || failed || paused || reducedMotion || !visible || clip.columns.length < 2) return;
    // Frame playback changes only the image transform, not React state or layout.
    let timer: number;
    const advance = () => {
      frame.current = (frame.current + 1) % clip.columns.length;
      if (image.current) image.current.style.transform = `translate(${-clip.columns[frame.current] * 100 / familiar.columns}%, ${-clip.row * 100 / familiar.rows}%)`;
      if (sprite.current) sprite.current.dataset.familiarFrame = String(frame.current);
      timer = window.setTimeout(advance, clip.durations[frame.current]);
    };
    timer = window.setTimeout(advance, clip.durations[frame.current]);
    return () => window.clearTimeout(timer);
  }, [clip, familiar.columns, familiar.rows, familiar.animations, familiar.displayName, loaded, failed, paused, reducedMotion, visible, oneShot, restingClip, playback]);

  useEffect(() => {
    if (playOnce !== lastRequest.current) {
      lastRequest.current = playOnce;
      if (playOnce !== undefined) requestPlayback.current?.();
    }
  }, [playOnce]);

  const style = {
    aspectRatio: `${familiar.cellWidth} / ${familiar.cellHeight}`,
  } satisfies CSSProperties;
  const revealAtlas = () => {
    const current = image.current;
    if (!current || typeof current.decode !== 'function') {
      setLoaded(true);
      return;
    }
    void current.decode().catch(() => undefined).then(() => {
      if (image.current === current) setLoaded(true);
    });
  };

  return <span className="familiar-artwork">
    <span ref={sprite} className="familiar-sprite" style={style} role="img" aria-label={`${familiar.displayName}, ${clip.label}`} data-familiar-frame="0" data-familiar-pose={oneShot ? 'resting' : undefined}>
    {familiar.placeholderUrl && !loaded && !failed && <img
      className="familiar-sprite-placeholder" src={familiar.placeholderUrl} alt="" draggable={false} decoding="async"
    />}
    {!failed && <img
      ref={image} className="familiar-sprite-atlas" src={familiar.spriteUrl} alt="" draggable={false} decoding="async" fetchPriority="high"
      onLoad={revealAtlas} onError={() => setFailed(true)}
      style={{ width: `${familiar.columns * 100}%`, height: `${familiar.rows * 100}%`, left: 0, top: 0, transform: `translate(${-restingClip.columns[0] * 100 / familiar.columns}%, ${-restingClip.row * 100 / familiar.rows}%)`, visibility: loaded ? 'visible' : 'hidden' }}
    />}
    </span>
    <span id={statusId} className="familiar-image-status" role="status" aria-live="polite" data-failed={failed || undefined}>
      {failed ? 'Familiar artwork could not load.' : !loaded ? 'Loading Familiar…' : ''}
    </span>
  </span>;
}

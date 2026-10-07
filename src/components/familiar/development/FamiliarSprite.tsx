import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { familiarActivityAnimation, type FamiliarActivity, type FamiliarDefinition } from '../shared/familiar';
import { useFamiliarVisibility } from './useFamiliarVisibility';
import './familiar.css';

export interface FamiliarSpriteProps {
  familiar: FamiliarDefinition;
  /** Host activity selects its matching supplied clip unless an explicit animation overrides it. */
  activity?: FamiliarActivity;
  animation?: string;
  paused?: boolean;
  /** Change this request value to play the selected clip once, then return to neutral. */
  playOnce?: number;
  statusId?: string;
}

/** Select an atlas clip without reloading unchanged artwork. */
export function FamiliarSprite({ familiar, activity, animation, paused = false, playOnce, statusId }: FamiliarSpriteProps) {
  const selectedAnimation = animation ?? familiarActivityAnimation(familiar, activity) ?? 'idle';
  const clip = familiar.animations[selectedAnimation] ?? familiar.animations.idle;
  return <SpritePlayback key={familiar.spriteUrl} familiar={familiar} clip={clip} paused={paused} playOnce={playOnce} statusId={statusId} />;
}

/** Play supplied frame timings while respecting pause, visibility, and reduced motion. */
function SpritePlayback({ familiar, clip, paused, playOnce, statusId }: {
  familiar: FamiliarDefinition;
  clip: FamiliarDefinition['animations'][string];
  paused: boolean;
  playOnce?: number;
  statusId?: string;
}) {
  const oneShot = playOnce !== undefined;
  const restingClip = oneShot ? (familiar.animations.neutral ?? familiar.animations.idle ?? clip) : clip;
  const lastRequest = useRef(playOnce);
  const requestPlayback = useRef<(() => void) | null>(null);
  const frame = useRef(0);
  const sprite = useRef<HTMLSpanElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const visible = useFamiliarVisibility(sprite);

  useEffect(() => {
    frame.current = 0;
    if (sprite.current) sprite.current.dataset.familiarFrame = '0';
  }, [clip]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(query.matches);
    query.addEventListener('change', updateMotion);
    return () => {
      query.removeEventListener('change', updateMotion);
    };
  }, []);

  useEffect(() => {
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
  }, [clip, familiar.columns, familiar.rows, loaded, failed, paused, reducedMotion, visible, oneShot, restingClip]);

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

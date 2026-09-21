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
  statusId?: string;
}

/** Select an atlas clip without reloading unchanged artwork. */
export function FamiliarSprite({ familiar, activity, animation, paused = false, statusId }: FamiliarSpriteProps) {
  const selectedAnimation = animation ?? familiarActivityAnimation(familiar, activity) ?? 'idle';
  const clip = familiar.animations[selectedAnimation] ?? familiar.animations.idle;
  return <SpritePlayback key={familiar.spriteUrl} familiar={familiar} clip={clip} paused={paused} statusId={statusId} />;
}

/** Play supplied frame timings while respecting pause, visibility, and reduced motion. */
function SpritePlayback({ familiar, clip, paused, statusId }: {
  familiar: FamiliarDefinition;
  clip: FamiliarDefinition['animations'][string];
  paused: boolean;
  statusId?: string;
}) {
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
  }, [clip, familiar.columns, familiar.rows, loaded, failed, paused, reducedMotion, visible]);

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
    <span ref={sprite} className="familiar-sprite" style={style} role="img" aria-label={`${familiar.displayName}, ${clip.label}`} data-familiar-frame="0">
    {familiar.placeholderUrl && !loaded && !failed && <img
      className="familiar-sprite-placeholder" src={familiar.placeholderUrl} alt="" draggable={false} decoding="async"
    />}
    {!failed && <img
      ref={image} className="familiar-sprite-atlas" src={familiar.spriteUrl} alt="" draggable={false} decoding="async" fetchPriority="high"
      onLoad={revealAtlas} onError={() => setFailed(true)}
      style={{ width: `${familiar.columns * 100}%`, height: `${familiar.rows * 100}%`, left: 0, top: 0, transform: `translate(${-clip.columns[0] * 100 / familiar.columns}%, ${-clip.row * 100 / familiar.rows}%)`, visibility: loaded ? 'visible' : 'hidden' }}
    />}
    </span>
    <span id={statusId} className="familiar-image-status" role="status" aria-live="polite" data-failed={failed || undefined}>
      {failed ? 'Familiar artwork could not load.' : !loaded ? 'Loading Familiar…' : ''}
    </span>
  </span>;
}

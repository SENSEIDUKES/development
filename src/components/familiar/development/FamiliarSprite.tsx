import { useEffect, useState, type CSSProperties } from 'react';
import type { FamiliarDefinition } from '../shared/familiar';
import './familiar.css';

export interface FamiliarSpriteProps {
  familiar: FamiliarDefinition;
  animation?: string;
  paused?: boolean;
}

export function FamiliarSprite({ familiar, animation = 'idle', paused = false }: FamiliarSpriteProps) {
  const clip = familiar.animations[animation] ?? familiar.animations.idle;
  return <SpritePlayback key={`${familiar.spriteUrl}:${animation}`} familiar={familiar} clip={clip} paused={paused} />;
}

function SpritePlayback({ familiar, clip, paused }: {
  familiar: FamiliarDefinition;
  clip: FamiliarDefinition['animations'][string];
  paused: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(query.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    query.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      query.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!loaded || failed || paused || reducedMotion || !visible || clip.columns.length < 2) return;
    const timer = window.setTimeout(() => setFrame(current => (current + 1) % clip.columns.length), clip.durations[frame]);
    return () => window.clearTimeout(timer);
  }, [clip, frame, loaded, failed, paused, reducedMotion, visible]);

  const style = {
    aspectRatio: `${familiar.cellWidth} / ${familiar.cellHeight}`,
  } satisfies CSSProperties;

  return <span className="familiar-sprite" style={style} role="img" aria-label={`${familiar.displayName}, ${clip.label}`} data-familiar-frame={frame}>
    {!failed && <img
      src={familiar.spriteUrl} alt="" draggable={false}
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
      style={{ width: `${familiar.columns * 100}%`, height: `${familiar.rows * 100}%`, left: `${-clip.columns[frame] * 100}%`, top: `${-clip.row * 100}%`, visibility: loaded ? 'visible' : 'hidden' }}
    />}
    {!loaded && !failed && <span className="familiar-image-status">Loading Familiar…</span>}
    {failed && <span className="familiar-image-status">Familiar artwork could not load.</span>}
  </span>;
}

import { useRef, useState } from 'react';
import type { FamiliarOption } from '../shared/familiar';
import { useFamiliarVisibility } from './useFamiliarVisibility';
import './familiar.css';

/**
 * A Familiar's animated hero, played only while `active` and on screen, with
 * its still under reduced motion or when the animation cannot load. Shared by
 * the Familiar page and the Celestial Store cards.
 */
export function FamiliarHero({ option, active, className = 'familiar-option-hero' }: { option: FamiliarOption; active: boolean; className?: string }) {
  const element = useRef<HTMLPictureElement>(null);
  const visible = useFamiliarVisibility(element);
  const [failed, setFailed] = useState(false);
  const playing = active && visible && !failed;
  return <picture ref={element}>
    <source media="(prefers-reduced-motion: reduce)" srcSet={option.stillUrl} />
    <img src={playing ? option.heroUrl : option.stillUrl} alt={`${option.name} Familiar`}
      className={className} loading="lazy" decoding="async" data-fallback={failed || undefined}
      onError={() => setFailed(true)} />
  </picture>;
}

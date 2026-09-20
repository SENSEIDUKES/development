import type { FamiliarOption } from '../shared/familiar';
import { LibraryButton } from '@seihouse/library-ui';
import './familiar.css';
import { useId, useRef, useState } from 'react';
import { FAMILIAR_DEFAULT_SIZE, FAMILIAR_MOBILE_DEFAULT_SIZE, familiarDisplaySize } from '../shared/familiar';
import { useFamiliarMobile } from './useFamiliarMobile';
import { useFamiliarVisibility } from './useFamiliarVisibility';

/** Keep the supplied animated hero, but release it while offscreen or backgrounded. */
function FamiliarHero({ option }: { option: FamiliarOption }) {
  const element = useRef<HTMLPictureElement>(null);
  const active = useFamiliarVisibility(element);
  const [failed, setFailed] = useState(false);
  return <picture ref={element}>
    <source media="(prefers-reduced-motion: reduce)" srcSet={option.stillUrl} />
    <img src={active && !failed ? option.heroUrl : option.stillUrl} alt={`${option.name} Familiar`}
      className="familiar-option-hero" loading="lazy" decoding="async" data-fallback={failed || undefined}
      onError={() => setFailed(true)} />
  </picture>;
}

export interface FamiliarSelectionProps {
  options: readonly FamiliarOption[];
  selectedId?: string;
  pending?: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
  size?: number;
  onSizeChange?: (size: number) => void;
}

/** Present host-owned unlock options and optional live sizing without storing preferences. */
export function FamiliarSelection({ options, selectedId, pending = false, disabled = false, onSelect, size, onSizeChange }: FamiliarSelectionProps) {
  const sizeId = useId();
  const mobile = useFamiliarMobile();
  const currentSize = familiarDisplaySize(size, mobile);
  const percent = Math.round((currentSize - (mobile ? 0.5 : 0)) * 100);
  const defaultSize = mobile ? FAMILIAR_MOBILE_DEFAULT_SIZE : FAMILIAR_DEFAULT_SIZE;
  return <section aria-label="Familiar selection" className="familiar-selection">
    <h3>Your Familiar</h3>
    <p>Choose the companion that watches over your journey. More Familiars will be available to unlock in the future.</p>
    {onSizeChange && <div className="familiar-size-control">
      <div><label htmlFor={sizeId}>Familiar size</label><p>Adjust the size of your Familiar.</p></div>
      <div className="familiar-size-slider">
        <input id={sizeId} type="range" min={mobile ? 10 : 60} max={mobile ? 100 : 200} step="10" value={percent}
          disabled={disabled || !selectedId} aria-valuetext={`${percent}%`}
          onChange={event => onSizeChange(Number(event.target.value) / 100 + (mobile ? 0.5 : 0))} />
        <output htmlFor={sizeId}>{percent}%</output>
        <button type="button" disabled={disabled || !selectedId || currentSize === defaultSize}
          onClick={() => onSizeChange(defaultSize)}>Reset</button>
      </div>
    </div>}
    {!options.length && <p>No Familiars are available yet.</p>}
    <div className="familiar-selection-options">
      {options.map(option => <article className="familiar-option" key={option.id}>
        <FamiliarHero key={option.heroUrl} option={option} />
        <div className="familiar-option-details">
          <h4>{option.name}</h4><p>{option.description}</p>
          <LibraryButton variant="secondary" fullWidth className="mt-4 !min-h-11" aria-pressed={selectedId === option.id}
            disabled={disabled || pending || !option.available || selectedId === option.id}
            onClick={() => onSelect(option.id)}>
            {!option.available ? 'Locked' : pending ? 'Saving selection…' : selectedId === option.id ? 'Selected' : `Select ${option.name}`}
          </LibraryButton>
        </div>
      </article>)}
    </div>
    <p role="status">{pending ? 'Saving your Familiar…' : options.find(option => option.id === selectedId) ? `Current Familiar: ${options.find(option => option.id === selectedId)!.name}` : 'No Familiar selected.'}</p>
  </section>;
}

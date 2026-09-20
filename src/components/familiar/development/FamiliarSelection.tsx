import type { FamiliarOption } from '../shared/familiar';
import { LibraryButton } from '@seihouse/library-ui';
import './familiar.css';
import { useId } from 'react';
import { FAMILIAR_DEFAULT_SIZE, FAMILIAR_MIN_SIZE, FAMILIAR_MAX_SIZE, normalizeFamiliarSize } from '../shared/familiar';

export interface FamiliarSelectionProps {
  options: readonly FamiliarOption[];
  selectedId?: string;
  pending?: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
  size?: number;
  onSizeChange?: (size: number) => void;
}

export function FamiliarSelection({ options, selectedId, pending = false, disabled = false, onSelect, size, onSizeChange }: FamiliarSelectionProps) {
  const sizeId = useId();
  const currentSize = normalizeFamiliarSize(size);
  return <section aria-label="Familiar selection" className="familiar-selection">
    <h3>Your Familiar</h3>
    <p>Choose the companion that watches over your journey. More Familiars will be available to unlock in the future.</p>
    {onSizeChange && <div className="familiar-size-control">
      <div><label htmlFor={sizeId}>Familiar size</label><p>Adjust the size of your Familiar.</p></div>
      <div className="familiar-size-slider">
        <input id={sizeId} type="range" min={FAMILIAR_MIN_SIZE} max={FAMILIAR_MAX_SIZE} step="0.1" value={currentSize}
          disabled={disabled || !selectedId} aria-valuetext={`${Math.round(currentSize * 100)}%`}
          onChange={event => onSizeChange(Number(event.target.value))} />
        <output htmlFor={sizeId}>{Math.round(currentSize * 100)}%</output>
        <button type="button" disabled={disabled || !selectedId || currentSize === FAMILIAR_DEFAULT_SIZE}
          onClick={() => onSizeChange(FAMILIAR_DEFAULT_SIZE)}>Reset</button>
      </div>
    </div>}
    {!options.length && <p>No Familiars are available yet.</p>}
    <div className="familiar-selection-options">
      {options.map(option => <article className="familiar-option" key={option.id}>
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet={option.stillUrl} />
          <img src={option.heroUrl} alt={`${option.name} Familiar`} className="familiar-option-hero" loading="lazy" onError={event => {
            const image = event.currentTarget;
            if (!image.dataset.fallback) { image.dataset.fallback = 'true'; image.src = option.stillUrl; }
          }} />
        </picture>
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

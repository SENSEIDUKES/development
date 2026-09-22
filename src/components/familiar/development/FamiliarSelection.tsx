import type { FamiliarOption } from '../shared/familiar';
import { LibraryButton } from '@seihouse/library-ui';
import './familiar.css';
import { useId, useRef, useState } from 'react';
import { FAMILIAR_DEFAULT_SIZE, FAMILIAR_MOBILE_DEFAULT_SIZE, familiarDisplaySize } from '../shared/familiar';
import { useFamiliarMobile } from './useFamiliarMobile';
import { useFamiliarVisibility } from './useFamiliarVisibility';

/** Only play the supplied animated hero while its card is hovered/pressed, on top of the offscreen/backgrounded release. */
function FamiliarHero({ option, active }: { option: FamiliarOption; active: boolean }) {
  const element = useRef<HTMLPictureElement>(null);
  const visible = useFamiliarVisibility(element);
  const [failed, setFailed] = useState(false);
  const playing = active && visible && !failed;
  return <picture ref={element}>
    <source media="(prefers-reduced-motion: reduce)" srcSet={option.stillUrl} />
    <img src={playing ? option.heroUrl : option.stillUrl} alt={`${option.name} Familiar`}
      className="familiar-option-hero" loading="lazy" decoding="async" data-fallback={failed || undefined}
      onError={() => setFailed(true)} />
  </picture>;
}

/** Mouse hover plays the hero like a preview; touch presses and keyboard focus stand in for hover where there's no pointer to hover with. */
function FamiliarOptionCard({ option, selected, pending, disabled, onSelect }: {
  option: FamiliarOption;
  selected: boolean;
  pending: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const [active, setActive] = useState(false);
  return <article className="familiar-option"
    onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(true); }}
    onPointerLeave={event => { if (event.pointerType === 'mouse') setActive(false); }}
    onPointerDown={event => { if (event.pointerType !== 'mouse') setActive(true); }}
    onPointerUp={event => { if (event.pointerType !== 'mouse') setActive(false); }}
    onPointerCancel={() => setActive(false)}
    onFocus={() => setActive(true)} onBlur={() => setActive(false)}>
    <FamiliarHero key={option.heroUrl} option={option} active={active} />
    <div className="familiar-option-details">
      <div className="familiar-option-heading">
        <h4>{option.name}</h4>
        <span className="familiar-option-rarity" data-rarity={option.rarity}>{option.rarity}</span>
        {selected && <span className="familiar-option-equipped">Equipped</span>}
        {option.isDefault && <span className="familiar-option-default">Default</span>}
      </div>
      <p>{option.description}</p>
      <LibraryButton variant="secondary" fullWidth className="mt-4 !min-h-11" aria-pressed={selected}
        disabled={disabled || pending || !option.available || selected}
        onClick={() => onSelect(option.id)}>
        {!option.available ? 'Locked' : pending ? 'Saving selection…' : selected ? 'Selected' : `Select ${option.name}`}
      </LibraryButton>
    </div>
  </article>;
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
      {options.map(option => <FamiliarOptionCard key={option.id} option={option} selected={selectedId === option.id}
        pending={pending} disabled={disabled} onSelect={onSelect} />)}
    </div>
    <p role="status">{pending ? 'Saving your Familiar…' : options.find(option => option.id === selectedId) ? `Current Familiar: ${options.find(option => option.id === selectedId)!.name}` : 'No Familiar selected.'}</p>
  </section>;
}

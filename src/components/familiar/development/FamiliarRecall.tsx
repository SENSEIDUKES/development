import type { FamiliarDefinition } from '../shared/familiar';
import { FamiliarSprite } from './FamiliarSprite';
import { FamiliarEnergyAction } from './Familiar';
import { SEIPopover, SEIPopoverTrigger, SEIPopoverContent, SEIPopoverTitle } from '@seihouse/ui';
import { Maximize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** Place in the host header while its companion is minimized. */
export function FamiliarRecall({ familiar, onRecall }: { familiar: FamiliarDefinition; onRecall: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const engaged = open || hovered || focused;
  useEffect(() => { container.current?.querySelector('button')?.focus({ preventScroll: true }); }, []);
  return <div ref={container} className="familiar-recall-container">
    <SEIPopover open={open} onOpenChange={setOpen}>
      <SEIPopoverTrigger className="familiar-recall" aria-label={`Show ${familiar.displayName} actions`} title="Familiar actions"
        onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        <span aria-hidden="true"><FamiliarSprite familiar={familiar} animation={engaged && familiar.animations.waving ? 'waving' : 'neutral'} paused={!engaged} /></span>
      </SEIPopoverTrigger>
      <SEIPopoverContent className="familiar-actions familiar-header-actions" side="bottom" collisionPadding={12}>
        <SEIPopoverTitle className="familiar-sr-only">Familiar actions</SEIPopoverTitle>
        <FamiliarEnergyAction />
        <button type="button" className="familiar-action" aria-label="Expand Familiar" title="Expand Familiar" onClick={onRecall}><Maximize2 aria-hidden="true" size={19} /></button>
      </SEIPopoverContent>
    </SEIPopover>
  </div>;
}

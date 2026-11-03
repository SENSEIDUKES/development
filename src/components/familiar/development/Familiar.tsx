import { ChevronDown } from 'lucide-react';
import { FamiliarSprite, type FamiliarSpriteProps } from './FamiliarSprite';
import { familiarActivityAnimation } from '../shared/familiar';
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { FamiliarGuidesAction, FamiliarHelperAction } from './FamiliarHelper';

export interface FamiliarProps extends FamiliarSpriteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  onMinimize?: () => void;
  dragging?: boolean;
  /** Host-owned actions can extend the panel without changing sprite playback. */
  children?: ReactNode;
}

/** Reveal compact pet actions: its Guides, its card (Explain and Action) and Minimize. Energy is not the Familiar's (SENSEI, 2026-11-03). */
export function Familiar({ open: controlledOpen, onOpenChange, triggerProps, onMinimize, dragging = false, children, ...props }: FamiliarProps) {
  const generatedStatusId = useId();
  const statusId = props.statusId ?? generatedStatusId;
  const actionsId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [localOpen, setLocalOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = controlledOpen ?? localOpen;
  const expanded = !dragging && (pinned || hovered || focused || open);
  const activityAnimation = familiarActivityAnimation(props.familiar, props.activity);
  const animation = props.animation ?? (expanded && props.familiar.animations.waving ? 'waving' : activityAnimation);
  const setOpen = (next: boolean) => { setLocalOpen(next); onOpenChange?.(next); };
  useEffect(() => {
    if (dragging) { setPinned(false); setHovered(false); setFocused(false); }
  }, [dragging]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!open && !root.current?.contains(event.target as Node)) { setPinned(false); setFocused(false); setHovered(false); }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return <div ref={root} className="familiar-interaction" data-expanded={expanded || undefined}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={event => { if (event.key === 'Escape' && !open) { setPinned(false); setHovered(false); setFocused(false); } }}>
    <button type="button" className="familiar-trigger" aria-label={`${props.familiar.displayName}: show actions`} {...triggerProps}
      aria-expanded={expanded} aria-controls={actionsId}
      onClick={event => { triggerProps?.onClick?.(event); if (!event.defaultPrevented) setPinned(value => !value); }}
      aria-describedby={[triggerProps?.['aria-describedby'], statusId].filter(Boolean).join(' ')}>
      <FamiliarSprite {...props} animation={animation} playback={props.animation ? 'loop' : props.playback} statusId={statusId} />
    </button>
    <div className="familiar-dock">
      <button type="button" className="familiar-shadow" hidden={expanded} aria-label="Show Familiar actions" aria-expanded={expanded} aria-controls={actionsId} onClick={() => setPinned(true)}><span /></button>
      <div id={actionsId} className="familiar-actions" role="group" aria-label="Familiar actions" hidden={!expanded}>
        <FamiliarGuidesAction onOpen={() => setOpen(false)} />
        <FamiliarHelperAction />
        {onMinimize && <button type="button" className="familiar-action" aria-label="Minimize Familiar" title="Minimize Familiar" onClick={onMinimize}><ChevronDown aria-hidden="true" size={21} /></button>}
      </div>
    </div>
  </div>;
}

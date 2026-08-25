import React from 'react';
import { ChevronUp } from 'lucide-react';

/**
 * Temporary System emblem: the existing Codex orb — radial glow, glass sphere,
 * dashed and dotted orbit rings, luminous ✦ core — scaled down to a System
 * Prompt's header row until a dedicated System sigil is approved.
 *
 * With no `onToggle` it is purely decorative and `aria-hidden`, which is how
 * the compact Narrative card carries it. The Structured Mechanical card passes
 * `onToggle` to make it the one accessible Expanded Info action that opens the
 * holographic stat panel; the core changes to an upward chevron while the panel
 * is open, and `buttonRef` lets the panel restore focus here on close. Its ring
 * spin rests under `prefers-reduced-motion`.
 */
export function SystemOrbEmblem({
  isExpanded,
  detailsId,
  onToggle,
  buttonRef,
}: {
  isExpanded?: boolean;
  detailsId?: string;
  onToggle?: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const orb = (
    <span className="relative block h-9 w-9 shrink-0 md:h-10 md:w-10">
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,currentColor_30%,transparent)_0%,transparent_70%)] animate-pulse motion-reduce:animate-none" />
      <span className="absolute inset-[3px] rounded-full border border-[color-mix(in_srgb,currentColor_40%,transparent)] bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,currentColor_38%,transparent)_0%,rgba(1,11,20,0.95)_72%)] shadow-[0_0_12px_color-mix(in_srgb,currentColor_45%,transparent),inset_0_0_6px_color-mix(in_srgb,currentColor_28%,transparent)]" />
      <span className="absolute inset-0 rounded-full border border-dashed border-[color-mix(in_srgb,currentColor_45%,transparent)] animate-[spin_12s_linear_infinite] motion-reduce:animate-none" />
      <span className="absolute -inset-1 rounded-full border border-dotted border-[color-mix(in_srgb,currentColor_25%,transparent)] animate-[spin_20s_linear_infinite_reverse] motion-reduce:animate-none" />
      <span className="absolute inset-0 flex items-center justify-center">
        {isExpanded ? (
          <ChevronUp
            data-system-orb-icon="open"
            className="h-3.5 w-3.5 text-current drop-shadow-[0_0_6px_currentColor]"
            strokeWidth={2.4}
          />
        ) : (
          <span data-system-orb-icon="closed" className="text-[10px] text-current drop-shadow-[0_0_6px_currentColor] md:text-xs">✦</span>
        )}
      </span>
    </span>
  );

  if (!onToggle || !detailsId) {
    return <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center">{orb}</span>;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={Boolean(isExpanded)}
      aria-controls={isExpanded ? detailsId : undefined}
      aria-label={isExpanded ? 'Collapse System Prompt details' : 'Expand System Prompt details'}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="group flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-current outline-none transition-[filter,transform] duration-200 hover:brightness-125 active:scale-95 focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020a16] motion-reduce:transition-none"
    >
      {orb}
    </button>
  );
}

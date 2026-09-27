import type { CSSProperties } from 'react';
// ElementalTitle now lives in the universal UI Text family (UI commit 7c144a5).
import {
  ElementalTitle,
  type ElementalTitleEffect,
  type ElementalTitleSize,
} from '@seihouse/ui';
import type { FamiliarCosmeticEffect, FamiliarElement } from '../../../library/familiars/contracts';
import { SIGNATURE_PIECES } from './signaturePieces';

/** The current UI package has authored treatments for these elements only. */
const AUTHORED_TITLE_EFFECTS: readonly ElementalTitleEffect[] = ['fire', 'lightning', 'frost', 'celestial', 'void'];

const authoredTitleEffect = (element: FamiliarElement): ElementalTitleEffect =>
  AUTHORED_TITLE_EFFECTS.includes(element as ElementalTitleEffect) ? element as ElementalTitleEffect : 'none';

export interface FamiliarNameEffectProps {
  /** The resolved name effect; null keeps the host's own lettering (rank colours). */
  effect: FamiliarCosmeticEffect | null;
  children: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
  size?: ElementalTitleSize;
  id?: string;
  tabIndex?: number;
  className?: string;
  /** Applied only when no effect letters the name. */
  plainClassName?: string;
  plainStyle?: CSSProperties;
  [data: `data-${string}`]: string | boolean | undefined;
}

/**
 * The cultivator's name with its active effect. An element letters it
 * through `ElementalTitle` — a mastered element outlined, a bond effect
 * soft. A signature renders its own hand-built piece.
 */
export function FamiliarNameEffect({ effect, children, as = 'span', size, className = '', plainClassName = '', plainStyle, ...rest }: FamiliarNameEffectProps) {
  const Piece = effect?.kind === 'signature' ? SIGNATURE_PIECES[effect.id] : undefined;
  const marks = { ...rest, 'data-name-effect': effect?.id, 'data-name-effect-kind': effect?.kind };
  if (Piece) return <Piece as={as} className={className} {...marks}>{children}</Piece>;
  const title = effect?.kind === 'elemental-title' ? effect : null;
  const renderedElement = title ? authoredTitleEffect(title.element) : 'none';
  return (
    <ElementalTitle
      as={as}
      size={size}
      element={renderedElement}
      intensity={title?.intensity ?? 'active'}
      shadow={title ? (title.mastered ? 'outlined' : 'soft') : 'none'}
      className={`${className} ${title ? '' : plainClassName}`.trim()}
      style={title ? undefined : plainStyle}
      {...marks}
    >
      {children}
    </ElementalTitle>
  );
}

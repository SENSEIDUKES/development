import type { CSSProperties } from 'react';
import {
  LibraryElementalTitle,
  type LibraryElementalTitleEffect,
  type LibraryElementalTitleSize,
} from '@seihouse/library-ui';
import type { FamiliarCosmeticEffect, FamiliarElement } from '../../../library/familiars/contracts';
import { SIGNATURE_PIECES } from './signaturePieces';

/** The current UI package has authored treatments for these elements only. */
const AUTHORED_TITLE_EFFECTS: readonly LibraryElementalTitleEffect[] = ['fire', 'lightning', 'frost', 'celestial', 'void'];

const authoredTitleEffect = (element: FamiliarElement): LibraryElementalTitleEffect =>
  AUTHORED_TITLE_EFFECTS.includes(element as LibraryElementalTitleEffect) ? element as LibraryElementalTitleEffect : 'none';

export interface FamiliarNameEffectProps {
  /** The resolved name effect; null keeps the host's own lettering (rank colours). */
  effect: FamiliarCosmeticEffect | null;
  children: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
  size?: LibraryElementalTitleSize;
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
 * through `LibraryElementalTitle` — a mastered element outlined, a bond effect
 * soft. A signature renders its own hand-built piece.
 */
export function FamiliarNameEffect({ effect, children, as = 'span', size, className = '', plainClassName = '', plainStyle, ...rest }: FamiliarNameEffectProps) {
  const Piece = effect?.kind === 'signature' ? SIGNATURE_PIECES[effect.id] : undefined;
  const marks = { ...rest, 'data-name-effect': effect?.id, 'data-name-effect-kind': effect?.kind };
  if (Piece) return <Piece as={as} className={className} {...marks}>{children}</Piece>;
  const title = effect?.kind === 'elemental-title' ? effect : null;
  const renderedElement = title ? authoredTitleEffect(title.element) : 'none';
  return (
    <LibraryElementalTitle
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
    </LibraryElementalTitle>
  );
}

import type { CSSProperties } from 'react';
import { LibraryElementalTitle, type LibraryElementalTitleSize } from '@seihouse/library-ui';
import type { FamiliarCosmeticEffect } from '../../../library/familiars/contracts';
import { SIGNATURE_PIECES } from './signaturePieces';

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
  return (
    <LibraryElementalTitle
      as={as}
      size={size}
      element={title?.element ?? 'none'}
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

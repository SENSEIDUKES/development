import type { ComponentType } from 'react';

export interface SignaturePieceProps {
  /** The cultivator's name. Plain text; a piece animates it, it never replaces it. */
  children: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
  className?: string;
  id?: string;
}

/**
 * Signature pieces: custom animation SEIHouse writes for one Familiar, keyed
 * by the signature id registered in `src/server/familiars/signatures.ts`.
 *
 * Unlike an element, a signature is not assembled from settings. Each entry
 * here is its own hand-built component. None are written yet; until one is,
 * a signature renders the name plainly.
 */
export const SIGNATURE_PIECES: Readonly<Record<string, ComponentType<SignaturePieceProps>>> = {};

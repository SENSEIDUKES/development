import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { FamiliarDefinition } from '../../components/familiar/shared/familiar';
import { familiarElement, familiarElementColors } from '../familiars/appearance';

/** The host's equipped character. Selection and ownership remain in the host profile. */
export interface LoadingFamiliarPresentation {
  familiar: FamiliarDefinition;
  accent: string;
  accentSoft: string;
}

export function loadingFamiliarPresentation(familiar: FamiliarDefinition): LoadingFamiliarPresentation {
  const colors = familiarElementColors(familiarElement(familiar.id));
  return { familiar, accent: colors.accent, accentSoft: colors.soft };
}

const FamiliarContext = createContext<LoadingFamiliarPresentation | null>(null);

/** Presentation-only projection of the host's current equipment; no equipment store or writes. */
export function LoadingFamiliarProvider({ value, children }: { value: LoadingFamiliarPresentation | null; children: ReactNode }) {
  return <FamiliarContext.Provider value={value}>{children}</FamiliarContext.Provider>;
}

export const useLoadingFamiliar = () => useContext(FamiliarContext);

export const loadingPalette = (familiar: LoadingFamiliarPresentation | null | undefined, agentId: string) => familiar ?? (
  agentId === 'versa'
    ? { accent: '#a855f7', accentSoft: '#d8b4fe' }
    : { accent: '#04ACFF', accentSoft: '#7dd3fc' }
);

const rgb = (hex: string) => /^#[\da-f]{6}$/i.test(hex)
  ? [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16)).join(', ')
  : '213, 182, 104';

export function loadingPaletteStyle(palette: { accent: string; accentSoft: string }): CSSProperties {
  return {
    '--veil-accent': palette.accent,
    '--veil-soft': palette.accentSoft,
    '--veil-accent-rgb': rgb(palette.accent),
    '--veil-soft-rgb': rgb(palette.accentSoft),
  } as CSSProperties;
}

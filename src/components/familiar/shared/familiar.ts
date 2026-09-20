/** Host-supplied atlas data; artwork locations and account identity stay in the host. */
export interface FamiliarAnimation {
  label: string;
  row: number;
  columns: readonly number[];
  durations: readonly number[];
}

export interface FamiliarDefinition {
  id: string;
  displayName: string;
  description: string;
  spriteUrl: string;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  animations: Readonly<Record<string, FamiliarAnimation>>;
}

/** Host-provided selection catalogue. Availability is supplied by the host, not awarded by UI. */
export interface FamiliarOption {
  id: string;
  name: string;
  description: string;
  heroUrl: string;
  stillUrl: string;
  available: boolean;
}

export const FAMILIAR_DEFAULT_SIZE = 1;
export const FAMILIAR_MIN_SIZE = 0.6;
export const FAMILIAR_MAX_SIZE = 2;
/** Clamp a host profile preference to the supported range, defaulting invalid values. */
export function normalizeFamiliarSize(size = FAMILIAR_DEFAULT_SIZE): number {
  return Number.isFinite(size) ? Math.min(FAMILIAR_MAX_SIZE, Math.max(FAMILIAR_MIN_SIZE, size)) : FAMILIAR_DEFAULT_SIZE;
}

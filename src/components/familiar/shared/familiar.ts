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

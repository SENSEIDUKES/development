/** Host-supplied atlas data; artwork locations and account identity stay in the host. */
export interface FamiliarAnimation {
  label: string;
  row: number;
  columns: readonly number[];
  durations: readonly number[];
}

/** Stable catalogue rank supplied by the Library host; it never implies ownership or pricing. */
export type FamiliarRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface FamiliarDefinition {
  id: string;
  displayName: string;
  description: string;
  /** Content metadata from the host catalogue, separate from availability and acquisition. */
  rarity: FamiliarRarity;
  /** The host may use its single default Familiar when no persisted choice has been made. */
  isDefault?: boolean;
  spriteUrl: string;
  /** Optional lightweight still shown while the full atlas decodes. */
  placeholderUrl?: string;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  animations: Readonly<Record<string, FamiliarAnimation>>;
}

/** The activity states a Codex-style host can report for its active companion. */
export type FamiliarActivity = 'running' | 'needs-input' | 'ready' | 'blocked';

const activityAnimation: Readonly<Record<FamiliarActivity, string>> = {
  running: 'running',
  'needs-input': 'waiting',
  ready: 'review',
  blocked: 'failed',
};

/** Use a supplied semantic clip when a host reports the matching Codex activity. */
export function familiarActivityAnimation(familiar: FamiliarDefinition, activity: FamiliarActivity | undefined): string | undefined {
  if (!activity) return undefined;
  const animation = activityAnimation[activity];
  return familiar.animations[animation] ? animation : undefined;
}

/** Host-provided selection catalogue. Availability is supplied by the host, not awarded by UI. */
export interface FamiliarOption {
  id: string;
  name: string;
  description: string;
  /** Catalogue projection for presentation; it is not inferred by this component. */
  rarity: FamiliarRarity;
  isDefault?: boolean;
  heroUrl: string;
  stillUrl: string;
  available: boolean;
}

export const FAMILIAR_DEFAULT_SIZE = 1;
export const FAMILIAR_MIN_SIZE = 0.6;
export const FAMILIAR_MAX_SIZE = 2;
export const FAMILIAR_MOBILE_DEFAULT_SIZE = 1;
export const FAMILIAR_MOBILE_MAX_SIZE = 1.5;
/** Resolve presentation only; never rewrite a larger saved desktop preference on resize. */
export function familiarDisplaySize(size: number | undefined, mobile: boolean): number {
  const fallback = mobile ? FAMILIAR_MOBILE_DEFAULT_SIZE : FAMILIAR_DEFAULT_SIZE;
  const normalized = normalizeFamiliarSize(size === undefined || !Number.isFinite(size) ? fallback : size);
  return mobile ? Math.min(FAMILIAR_MOBILE_MAX_SIZE, normalized) : normalized;
}
/** Clamp a host profile preference to the supported range, defaulting invalid values. */
export function normalizeFamiliarSize(size = FAMILIAR_DEFAULT_SIZE): number {
  return Number.isFinite(size) ? Math.min(FAMILIAR_MAX_SIZE, Math.max(FAMILIAR_MIN_SIZE, size)) : FAMILIAR_DEFAULT_SIZE;
}

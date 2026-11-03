/** Host-supplied atlas data; artwork locations and account identity stay in the host. */
export interface FamiliarAnimation {
  label: string;
  row: number;
  columns: readonly number[];
  durations: readonly number[];
}

/**
 * How rare the Familiar is: stable catalogue content supplied by the Library
 * host. It never implies ownership or pricing, and it is not the cultivator's
 * Bond Rank with the Familiar, which shares the same four words.
 */
export type FamiliarRarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_NAMES: Readonly<Record<FamiliarRarity, string>> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

/** "Epic familiar" — always name the scale, so it never reads as a Bond Rank. */
export const familiarRarityLabel = (rarity: FamiliarRarity) => `${RARITY_NAMES[rarity]} familiar`;

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
  /** High-definition artwork for the Familiar page's stage; without it the stage shows the animated hero. */
  portraitUrl?: string;
  /** The Familiar's own motion clip, played on its page; absent until one is made. */
  videoUrl?: string;
  available: boolean;
}

/**
 * What a cultivator has made their own about one Familiar. Both are optional:
 * without them the Familiar keeps its catalogue name and description.
 */
export interface FamiliarPersonalization {
  name?: string;
  backstory?: string;
}

/** Per-Familiar personalization, keyed by Familiar id. */
export type FamiliarPersonalizations = Readonly<Record<string, FamiliarPersonalization>>;

export const FAMILIAR_NAME_MAX_LENGTH = 40;
export const FAMILIAR_BACKSTORY_MAX_LENGTH = 600;

const personalText = (value: unknown, max: number) => {
  if (typeof value !== 'string') return undefined;
  let capped = value.trim().slice(0, max);
  // Never keep half of an emoji (a lone high surrogate) when the cap cuts through one.
  const last = capped.charCodeAt(capped.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) capped = capped.slice(0, -1);
  const trimmed = capped.trim();
  return trimmed || undefined;
};

/** One Familiar's personalization, trimmed and capped; empty fields are dropped. */
export function normalizeFamiliarPersonalization(value: unknown): FamiliarPersonalization | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const name = personalText(record.name, FAMILIAR_NAME_MAX_LENGTH);
  const backstory = personalText(record.backstory, FAMILIAR_BACKSTORY_MAX_LENGTH);
  if (!name && !backstory) return undefined;
  return { ...(name ? { name } : {}), ...(backstory ? { backstory } : {}) };
}

/** A saved personalization map, read defensively; undefined when nothing is personalized. */
export function normalizeFamiliarPersonalizations(value: unknown): FamiliarPersonalizations | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([id, entry]) => [id, normalizeFamiliarPersonalization(entry)] as const)
    .filter((entry): entry is readonly [string, FamiliarPersonalization] => Boolean(entry[1]));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/**
 * Apply a change to one Familiar's personalization. A field set to an empty
 * string or null returns to the catalogue's own; undefined leaves it alone.
 */
export function updateFamiliarPersonalizations(
  current: FamiliarPersonalizations | undefined,
  familiarId: string,
  changes: { name?: string | null; backstory?: string | null },
): FamiliarPersonalizations | undefined {
  const previous = current?.[familiarId] ?? {};
  const merged: Record<string, unknown> = { ...previous };
  for (const key of ['name', 'backstory'] as const) {
    if (changes[key] === undefined) continue;
    merged[key] = changes[key] ?? undefined;
  }
  const next = normalizeFamiliarPersonalization(merged);
  const rest = Object.fromEntries(Object.entries(current ?? {}).filter(([id]) => id !== familiarId));
  const result = next ? { ...rest, [familiarId]: next } : rest;
  return Object.keys(result).length ? result : undefined;
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

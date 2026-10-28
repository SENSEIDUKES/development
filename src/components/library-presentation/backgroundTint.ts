import { normalizeAccentColor } from '../user-profile/development/accentColor';

/** Library-owned appearance preference; surfaces choose whether to adopt it. */
export interface BackgroundTint { color: string; strength: number }
export const DEFAULT_BACKGROUND_TINT: Readonly<BackgroundTint> = { color: '#5267d6', strength: 60 };

/** Reject malformed stored/imported preferences instead of rendering arbitrary CSS. */
export function normalizeBackgroundTint(value: unknown): BackgroundTint | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { color, strength } = value as Partial<BackgroundTint>;
  const hex = normalizeAccentColor(color);
  if (!hex || typeof strength !== 'number' || !Number.isFinite(strength) || strength < 0 || strength > 100) return undefined;
  return { color: hex, strength };
}

/** Keep the chosen hue while bounding brightness for the existing light text.
 * Strength changes color, never blur or transparency. Even white at full strength
 * reaches only #323232 (12.8:1 contrast against white); black stays black.
 */
export function backgroundTintColor(tint: BackgroundTint): string {
  const rgb = [1, 3, 5].map(i => parseInt(tint.color.slice(i, i + 2), 16));
  const max = Math.max(...rgb);
  const scale = max === 0 ? 0 : (50 * tint.strength / 100) / max;
  return '#' + rgb.map(channel => Math.round(channel * scale).toString(16).padStart(2, '0')).join('');
}
export function backgroundTintFill(tint: BackgroundTint): string {
  const hex = backgroundTintColor(tint);
  return `rgba(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')}, 0.95)`;
}

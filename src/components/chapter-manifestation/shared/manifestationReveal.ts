/**
 * Manifestation Reveal — the agnostic "something is revealed" mechanic.
 *
 * A caller-owned progression (sealed → unsealing → revealed) and a
 * tap-to-unseal affordance, decoupled from any specific visual vessel. The
 * first (and currently only) vessel is the celestial scroll, but the
 * mechanic itself is vessel-agnostic: it owns the state routing, the tap
 * target, accessibility, reduced-motion handling, and responsive
 * containment. Future vessels can be dropped in without changing the
 * mechanic.
 *
 * Manifestation Reveal lives inside any manifestation zone (e.g. the Aura
 * Veil's media mode) — it is not a standalone SEN product surface. The Aura
 * Veil's media mode is one caller; the scroll artwork is one vessel.
 *
 * Public contract (preserved from the prior single-component implementation):
 *   - the three-state progression stays caller-owned; the reveal never
 *     advances itself;
 *   - `sealed` becomes a tappable button when `onUnseal` is supplied;
 *   - `revealed` accepts optional supplied content (a finished asset) and
 *     falls back to a vessel-rendered placeholder when none is provided;
 *   - reduced-motion users get instant transitions; the tap still works;
 *   - the reveal fills whatever size its host zone gives it.
 */

/**
 * The three-state reveal progression. Owned by the caller — the reveal
 * component never advances this on its own.
 */
export type ManifestationRevealState = 'sealed' | 'unsealing' | 'revealed';

/**
 * The three reveal states in display order, used by Workshop controls and
 * any caller that needs to iterate through them (e.g. a "next state" button).
 */
export const MANIFESTATION_REVEAL_STATES: readonly ManifestationRevealState[] = [
  'sealed',
  'unsealing',
  'revealed',
] as const;

/**
 * Optional content the reveal presents in its `revealed` state. Vessels
 * decide how to render either case (a finished asset or a placeholder).
 *
 * - `src`: optional finished asset. The vessel decides the asset type
 *   (image, audio waveform, motion poster, etc.).
 * - `alt`: alt text for the finished asset; used as the reveal's aria-label
 *   in the `revealed` state when the asset is supplied.
 * - `placeholderLabel`: short label a vessel can show in its placeholder
 *   rendering when no asset is supplied (the celestial scroll vessel
 *   currently uses this for its painterly vista).
 */
export interface RevealedContent {
  src?: string | null;
  alt?: string;
  placeholderLabel?: string;
}

/**
 * Compose the aria-label the mechanic reports for its current state.
 * Centralized so every vessel + every caller agrees on the announcement.
 */
export function manifestationRevealAriaLabel(
  state: ManifestationRevealState,
  content: RevealedContent | null | undefined,
  sealedTapLabel = 'Unseal the manifestation',
): string {
  if (state === 'revealed') {
    if (content?.alt) return content.alt;
    if (content?.placeholderLabel) return `${content.placeholderLabel} revealed`;
    return 'Manifestation revealed';
  }
  if (state === 'unsealing') return 'Manifestation unsealing, portal opening';
  return sealedTapLabel;
}

/**
 * True when the supplied state + handler combination makes the reveal
 * tappable. The mechanic uses this to decide whether the sealed scene is
 * rendered as a button or as a non-interactive image.
 */
export function isManifestationRevealInteractive(
  state: ManifestationRevealState,
  onUnseal: (() => void) | undefined,
): boolean {
  return state === 'sealed' && typeof onUnseal === 'function';
}

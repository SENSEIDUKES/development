/**
 * `@seihouse/sen/codex-cards` — the Codex card family.
 *
 * The card-level Codex pieces that surface a single entity: the inline
 * Codex card and its hovercard trigger, the character and location cards and
 * their profile views, the ambience layer behind them, and the accent and
 * backdrop resolvers that give each entity its spectral identity.
 */
import '../components/reader-codex/shared/reader-codex.css';

export {
  CodexCard,
  FALLBACK_BACKDROPS,
  getFallbackBackdrop,
  type CodexCardProps,
  type CodexCardTerm,
} from '../components/reader-chamber/development/CodexCard';
export { CodexHovercard } from '../components/reader-codex/development/CodexHovercard';
export {
  CodexCardAmbience,
  type CodexCardAmbienceProps,
} from '../components/reader-codex/development/CodexCardAmbience';
export {
  CODEX_ENTITY_ACCENT_FALLBACK,
  resolveCodexEntityAccent,
  resolveCodexEntityBand,
  type CodexEntityAccentInput,
  type CodexEntityBand,
} from '../components/reader-codex/development/codexEntityAccent';
export {
  MANIFEST_BACKDROPS,
  getManifestBackdrop,
} from '../components/reader-codex/development/codexManifestBackdrop';
export { CharacterCard } from '../components/reader-codex/shared/codex/character-cards/CharacterCard';
export { CharacterEditCard } from '../components/reader-codex/shared/codex/character-cards/CharacterEditCard';
export { CharacterProfile } from '../components/reader-codex/shared/codex/character-profiles/CharacterProfile';
export { LocationCard } from '../components/reader-codex/shared/codex/location-cards/LocationCard';
export { LocationProfile } from '../components/reader-codex/shared/codex/location-profiles/LocationProfile';

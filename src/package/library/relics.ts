/**
 * `@seihouse/library/relics` — the Relic surfaces.
 *
 * Relics are part of the Library economy — the reward tiers, the claim
 * ceremony, and the artifact language belong to SEIHouse's own application,
 * not to the portable SEN engine. The relic card, its inspection modal, the
 * claim reveal, and the relic model shared between them live here.
 *
 * These surfaces build on SEN (the shared card and particle systems); the
 * dependency only ever runs Library → SEN.
 */
export { RelicCard, renderArtifactIcon } from '../../components/relics/shared/RelicCard';
export { RelicModal } from '../../components/relics/shared/RelicModal';
export { RelicReveal, type RelicRevealProps } from '../../components/relics/development/RelicReveal';
export * from '../../components/relics/shared/types';

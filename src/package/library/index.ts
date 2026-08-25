/**
 * `@Seihouse/Library` — SEIHouse's first-party host application surfaces.
 *
 * Library is the branded implementation of SEN, not a second copy of the
 * engine. This package carries only what is genuinely Library product:
 * cultivation and Qi progression, the relic economy, and the Library-specific
 * presentation layered over portable SEN systems.
 *
 * - `@Seihouse/Library/cultivation` — Closed-Door Cultivation and its idle-Qi reward
 * - `@Seihouse/Library/relics`      — the relic card, inspection modal, and claim reveal
 *
 * Library may depend on `@seihouse/sen`. SEN never depends on Library.
 */
export * from './cultivation';
export * from './relics';

/** The Library package surface version, bumped with the published package. */
export const LIBRARY_PACKAGE_VERSION = '0.1.0';

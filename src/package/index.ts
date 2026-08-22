/**
 * `@seihouse/sen` — the SEN component package surface.
 *
 * The root entry publishes the shared Celestial Library design system, the
 * layer every other SEN surface is built on. The larger surfaces are
 * published as their own subpaths so a consumer only pays for what it uses:
 *
 * - `@seihouse/sen/library`         — the Celestial Library primitives
 * - `@seihouse/sen/reader-chamber`  — the Reader Chamber
 * - `@seihouse/sen/reader-codex`    — the Reader Codex
 * - `@seihouse/sen/codex-cards`     — the Codex card family
 * - `@seihouse/sen/manifestations`  — the Manifestation surfaces
 * - `@seihouse/sen/relics`          — the Relic surfaces
 * - `@seihouse/sen/audio`           — the client-safe audio surface
 * - `@seihouse/sen/closed-door-cultivation` — the idle-Qi reward surface
 * - `@seihouse/sen/story-seed`       — Story Seed creation and contracts
 * - `@seihouse/sen/chapter-generation` — DEV generation and handoff surfaces
 *
 * Workshop mocks, preview shells, and server code are not part of any entry.
 */
export * from './library';

/** The package surface version, bumped with the published package. */
export const SEN_PACKAGE_VERSION = '0.2.0';

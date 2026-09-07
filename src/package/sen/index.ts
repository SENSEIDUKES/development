/**
 * `@seihouse/sen` — SEIHouse Expanded Novels.
 *
 * SEN is an embeddable expanded-narrative engine. An author or company
 * installs it inside their own application and supplies their own writing,
 * branding, storage, authentication, and generation method; SEN supplies the
 * reusable narrative systems: expanded reading behavior, structured chapter
 * contracts, scoring, Color Codes, Codex behavior, cards, and the surfaces
 * built on them. AI chapter generation is one optional content source, never
 * a requirement.
 *
 * The root exposes host presentation contracts and universal defaults.
 * Feature systems retain their independent public subpaths:
 *
 * - `@seihouse/sen/presentation`      — host presentation provider and contracts
 * - `@seihouse/sen/color-codes`        — the single Color Code authority
 * - `@seihouse/sen/cards`              — the shared card system
 * - `@seihouse/sen/reader-chamber`     — the Reader Chamber
 * - `@seihouse/sen/reader-codex`       — the Reader Codex
 * - `@seihouse/sen/manifestations`     — the Manifestation surfaces
 * - `@seihouse/sen/audio`              — the client-safe audio surface
 * - `@seihouse/sen/story-seed`         — Story Seed creation and contracts
 * - `@seihouse/sen/chapter-generation` — generation and handoff surfaces
 * - `@seihouse/sen/harness-generation` — independent checkpoint-first novel core
 *
 * SEIHouse's own first-party surfaces — cultivation and Qi progression, the
 * relic economy, and the rest of the Library application — ship separately as
 * `@seihouse/library`. Library may depend on SEN; SEN never depends on
 * Library. Workshop mocks, preview shells, and server code are not part of
 * any entry.
 */
export * from './presentation';

/** The package surface version, bumped with the published package. */
export const SEN_PACKAGE_VERSION = '0.4.0';

/**
 * `@seihouse/library` — SEIHouse's first-party host application surfaces.
 *
 * Library is the branded implementation of SEN, not a second copy of the
 * engine. This package carries Profile, Energy, cultivation/QI, DAO Pillar,
 * Relics, shell, discovery, branded story creation, first-party orchestration
 * and Library presentation over portable SEN systems. Use deliberate feature
 * subpaths; the root stays a compact common surface.
 *
 * Library may depend on `@seihouse/sen`. SEN never depends on Library.
 */
export * from './cultivation';
export * from './relics';
export * from './presentation';

/** The Library package surface version, bumped with the published package. */
export const LIBRARY_PACKAGE_VERSION = '0.5.0';

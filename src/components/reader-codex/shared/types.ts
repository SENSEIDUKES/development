/**
 * Reader Codex type boundary.
 *
 * The Chamber owns the shared Story/Reader contracts in DEV. Re-exporting
 * them keeps the migrated Codex source-compatible without introducing a
 * second, drifting story model.
 */
export * from '../../reader-chamber/shared/types';

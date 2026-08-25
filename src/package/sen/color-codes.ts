/**
 * `@seihouse/sen/color-codes` — the single Color Code authority.
 *
 * One registry defines every semantic color SEN paints with: entity bands,
 * item tiers, location classes, fate outcomes, system prompt meanings, and
 * the accessibility palettes they repaint under. Cards, inline Codex links,
 * relation maps, badges, and Reader system surfaces all resolve through the
 * functions published here, so no surface can drift into a private palette.
 *
 * Values stay as CSS variable references: switching the active palette
 * repaints every consumer together. A host supplies the variable values, or
 * accepts SEN's defaults from `@seihouse/sen/styles.css`.
 *
 * Chapter generation resolves the codes it emits through this same entry —
 * there is no second mapping to keep in sync.
 */
import '../../components/reader-chamber/shared/reader-chamber.css';

export * from '../../components/reader-chamber/shared/colorCodes';

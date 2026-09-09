/**
 * The display name rule.
 *
 * A cultivator's display name is the one identity string both Cave Home views
 * render, centered, at the top of the composition. It is capped at twelve
 * *visible* characters so the name stays legible and centered on a narrow
 * phone without truncation or wrapping tricks.
 *
 * "Visible" means grapheme clusters, not UTF-16 code units: an emoji, a
 * combining accent, and a CJK glyph each cost one. `String.length` would let a
 * twelve-glyph emoji name through as thirty-something units, and would cut a
 * surrogate pair in half when clamping.
 *
 * The username (Dao Name) is a separate, private identifier. It has no such
 * limit, and nothing here may be applied to it.
 */

export const DISPLAY_NAME_MAX_VISIBLE = 12;

const graphemes =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

/** The name split into what a reader counts as one character each. */
export function visibleCharacters(value: string): string[] {
  if (!value) return [];
  // `Array.from` splits code points, which is already surrogate-safe; the
  // segmenter additionally keeps combining marks and emoji sequences whole.
  return graphemes
    ? Array.from(graphemes.segment(value), segment => segment.segment)
    : Array.from(value);
}

/** How many characters a reader counts in this name. */
export function countVisibleCharacters(value: string): number {
  return visibleCharacters(value).length;
}

/** Whether this name may be saved as it stands. */
export function isDisplayNameWithinLimit(value: string): boolean {
  return countVisibleCharacters(value) <= DISPLAY_NAME_MAX_VISIBLE;
}

/**
 * Cut a name down to the limit without splitting a character. Applied as the
 * name is typed, so an over-long paste is trimmed rather than rejected.
 */
export function clampDisplayName(value: string): string {
  const characters = visibleCharacters(value);
  if (characters.length <= DISPLAY_NAME_MAX_VISIBLE) return value;
  return characters.slice(0, DISPLAY_NAME_MAX_VISIBLE).join('');
}

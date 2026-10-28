/** An absent preference preserves the Library's original mix of accent colors. */
export function normalizeAccentColor(value: unknown): string | undefined {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : undefined;
}

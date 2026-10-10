import type { ReaderPreferenceStorage } from './readerRuntime';

/**
 * How the Reader sets a chapter's text: the reader's font, title font, size,
 * line spacing and weight. A device preference, like the voices and the
 * soundtrack choice, never part of the story. The fonts themselves are the
 * host's: SEN names only neutral ones, and a host loads its own faces and
 * offers them through `ReaderFonts`.
 */

/** One font a reader can choose: shown by `label`, applied as a CSS `font-family`. */
export interface ReaderFontChoice {
  /** Stable id, kept on the device. */
  id: string;
  label: string;
  /** A complete CSS font-family stack, with fallbacks for scripts the font does not cover. */
  family: string;
}

/** The fonts the Reader offers. The first of each list is the default. */
export interface ReaderFonts {
  /** For chapter text. */
  text: readonly ReaderFontChoice[];
  /** For chapter titles. With one choice, Reader Settings shows no title picker. */
  titles: readonly ReaderFontChoice[];
}

/** SEN's own fonts: the host theme's serif, sans and display families. */
export const DEFAULT_READER_FONTS: ReaderFonts = Object.freeze({
  text: Object.freeze([
    { id: 'serif', label: 'Serif', family: 'var(--font-serif, Georgia), serif' },
    { id: 'sans', label: 'Sans', family: 'var(--font-sans, system-ui), sans-serif' },
  ]),
  titles: Object.freeze([
    { id: 'display', label: 'Display', family: 'var(--font-display, Georgia), serif' },
  ]),
});

/** Text sizes, smallest first, in pixels at the browser's default 16px. `medium` is the Reader's size before these settings existed. */
export const READER_TEXT_SIZES = Object.freeze([
  { id: 'small', label: 'Small', px: 15 },
  { id: 'medium', label: 'Default', px: 17.2 },
  { id: 'large', label: 'Large', px: 18.5 },
  { id: 'larger', label: 'Larger', px: 20 },
  { id: 'largest', label: 'Largest', px: 22 },
] as const);
export type ReaderTextSize = typeof READER_TEXT_SIZES[number]['id'];

/** Space between lines, as a multiple of the text size. `normal` is the Reader's spacing before these settings. */
export const READER_LINE_SPACINGS = Object.freeze([
  { id: 'compact', label: 'Compact', lineHeight: 1.5 },
  { id: 'normal', label: 'Normal', lineHeight: 1.85 },
  { id: 'relaxed', label: 'Relaxed', lineHeight: 2.15 },
] as const);
export type ReaderLineSpacing = typeof READER_LINE_SPACINGS[number]['id'];

/** Text weights. A font without a weight shows its nearest one. */
export const READER_TEXT_WEIGHTS = Object.freeze([
  { id: 300, label: 'Light' },
  { id: 400, label: 'Regular' },
  { id: 500, label: 'Medium' },
] as const);
export type ReaderTextWeight = typeof READER_TEXT_WEIGHTS[number]['id'];

export interface ReaderTextSettings {
  /** The chosen text font's id; absent means the host's first. */
  font?: string;
  /** The chosen title font's id; absent means the host's first. */
  titleFont?: string;
  size: ReaderTextSize;
  lineSpacing: ReaderLineSpacing;
  weight: ReaderTextWeight;
}

export const DEFAULT_READER_TEXT_SETTINGS: ReaderTextSettings = Object.freeze({ size: 'medium', lineSpacing: 'normal', weight: 400 });

/** The device preference's key in the host's `ReaderPreferenceStorage`. */
export const READER_TEXT_SETTINGS_KEY = 'text-settings';

const fontId = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

/** The reader's saved text settings; anything missing or unreadable is the default. */
export function readReaderTextSettings(storage?: ReaderPreferenceStorage): ReaderTextSettings {
  let saved: unknown;
  try {
    const raw = storage?.read(READER_TEXT_SETTINGS_KEY);
    saved = raw ? JSON.parse(raw) : undefined;
  } catch {
    return DEFAULT_READER_TEXT_SETTINGS;
  }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return DEFAULT_READER_TEXT_SETTINGS;
  const data = saved as Record<string, unknown>;
  const font = fontId(data.font);
  const titleFont = fontId(data.titleFont);
  return {
    ...(font ? { font } : {}),
    ...(titleFont ? { titleFont } : {}),
    size: READER_TEXT_SIZES.find(step => step.id === data.size)?.id ?? DEFAULT_READER_TEXT_SETTINGS.size,
    lineSpacing: READER_LINE_SPACINGS.find(step => step.id === data.lineSpacing)?.id ?? DEFAULT_READER_TEXT_SETTINGS.lineSpacing,
    weight: READER_TEXT_WEIGHTS.find(step => step.id === data.weight)?.id ?? DEFAULT_READER_TEXT_SETTINGS.weight,
  };
}

/** Saves the reader's text settings on the device. A storage that refuses them changes nothing. */
export function writeReaderTextSettings(storage: ReaderPreferenceStorage | undefined, settings: ReaderTextSettings): void {
  try {
    storage?.write(READER_TEXT_SETTINGS_KEY, JSON.stringify({ v: 1, ...settings }));
  } catch {
    // The settings last for this visit.
  }
}

/** Text settings as the page applies them. */
export interface ResolvedReaderText {
  /** The text font in use (the host's first when the saved one is no longer offered). */
  font: ReaderFontChoice;
  titleFont: ReaderFontChoice;
  /** CSS font-size in rem, so the browser's own text size still scales it (`1.075rem` is 17.2px at 16px). */
  fontSize: string;
  lineHeight: number;
  fontWeight: ReaderTextWeight;
}

/** Resolves the settings against the fonts on offer; a font no longer offered falls back to the first. */
export function resolveReaderText(settings: ReaderTextSettings, fonts: ReaderFonts = DEFAULT_READER_FONTS): ResolvedReaderText {
  const text = fonts.text.length ? fonts.text : DEFAULT_READER_FONTS.text;
  const titles = fonts.titles.length ? fonts.titles : DEFAULT_READER_FONTS.titles;
  const size = READER_TEXT_SIZES.find(step => step.id === settings.size) ?? READER_TEXT_SIZES[1];
  const spacing = READER_LINE_SPACINGS.find(step => step.id === settings.lineSpacing) ?? READER_LINE_SPACINGS[1];
  return {
    font: text.find(choice => choice.id === settings.font) ?? text[0],
    titleFont: titles.find(choice => choice.id === settings.titleFont) ?? titles[0],
    fontSize: `${size.px / 16}rem`,
    lineHeight: spacing.lineHeight,
    fontWeight: READER_TEXT_WEIGHTS.find(step => step.id === settings.weight)?.id ?? 400,
  };
}

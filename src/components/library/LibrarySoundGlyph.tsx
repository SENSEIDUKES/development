import React, { memo, type SVGAttributes } from 'react';

/**
 * Celestial Library sound mark: an open folio sending two quiet resonance
 * rings into the margin. The hand-drawn SVG inherits `currentColor`, so the
 * owning control can keep it neutral at rest and illuminate it during audio.
 */
export interface LibrarySoundGlyphProps extends SVGAttributes<SVGSVGElement> {
  /** Pixel width/height of the square glyph. Defaults to 16. */
  size?: number;
  /** Optional accessible title for standalone use. */
  title?: string;
  /** Optional id for the title element, wired to aria-labelledby. */
  titleId?: string;
  /** Decorative by default because interactive owners provide the label. */
  decorative?: boolean;
}

export const LibrarySoundGlyph = memo(function LibrarySoundGlyph({
  size = 16,
  title,
  titleId,
  decorative,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-hidden': ariaHiddenProp,
  ...restProps
}: LibrarySoundGlyphProps) {
  const safeSize = typeof size === 'number' && Number.isFinite(size) && size >= 0 ? size : 16;
  const isExplicitlyAccessible = decorative === false
    || Boolean(title)
    || Boolean(ariaLabel)
    || Boolean(ariaLabelledBy);
  const isDecorative = decorative ?? !isExplicitlyAccessible;

  return (
    <svg
      width={safeSize}
      height={safeSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={role ?? (isDecorative ? undefined : 'img')}
      aria-hidden={ariaHiddenProp ?? (isDecorative ? 'true' : undefined)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (title && titleId ? titleId : undefined)}
      data-library-glyph="sound"
      {...restProps}
    >
      {title && <title id={titleId}>{title}</title>}
      <path d="M4.6 7.2c2.5-.35 4.55.34 6.15 2.08v8.02c-1.6-1.74-3.65-2.43-6.15-2.08V7.2Z" />
      <path d="M10.75 9.28c1.12-1.2 2.42-1.9 3.9-2.1v8.02c-1.48.2-2.78.9-3.9 2.1" />
      <path d="M16.55 9.55c1.2 1.35 1.2 3.55 0 4.9" />
      <path d="M19.15 7.25c2.35 2.65 2.35 6.85 0 9.5" />
    </svg>
  );
});

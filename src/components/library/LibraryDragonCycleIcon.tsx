import React, { memo, type SVGAttributes } from 'react';

/**
 * LibraryDragonCycleIcon — the Celestial Library's cycle glyph: a dragon
 * chasing its own tail (ouroboros). It is part of the ecosystem's shared
 * icon language and means "Re-do, Re-try, or shuffle" wherever it appears —
 * cycling a suggestion, reshuffling a draw, retrying a roll.
 *
 * Custom silhouette (not a Lucide glyph): a spiked serpentine body curling
 * clockwise, the tail wisp rising into the head's open jaws. `fill:
 * currentColor` so it inherits the surrounding accent (portal blue, gold,
 * signal) exactly like the Lucide icons it sits beside.
 *
 * First used by the Story Seed Origin page to cycle system premise examples
 * (2026-08-04). Reuse it anywhere the Library needs the cycle meaning —
 * never redraw a one-off shuffle icon per page.
 */
export interface LibraryDragonCycleIconProps extends SVGAttributes<SVGSVGElement> {
  /** Pixel width/height of the square glyph. Defaults to 24. Clamped to non-negative numbers. */
  size?: number;
  className?: string;
  /** Optional accessible title for standalone or informative use. When provided, sets role="img" and renders a <title> element. */
  title?: string;
  /** Optional id for the <title> element, wired to aria-labelledby. */
  titleId?: string;
  /** Whether the icon is purely decorative. Defaults to true unless an accessible title or aria-label is provided. */
  decorative?: boolean;
}

export const LibraryDragonCycleIcon = memo(function LibraryDragonCycleIcon({
  size = 24,
  className,
  title,
  titleId,
  decorative,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-hidden': ariaHiddenProp,
  ...restProps
}: LibraryDragonCycleIconProps) {
  const safeSize = typeof size === 'number' && Number.isFinite(size) && size >= 0 ? size : 24;
  const isExplicitlyAccessible = decorative === false || Boolean(title) || Boolean(ariaLabel);
  const isDecorative = decorative ?? !isExplicitlyAccessible;

  const resolvedRole = role ?? (isDecorative ? undefined : 'img');
  const resolvedAriaHidden = ariaHiddenProp ?? (isDecorative ? 'true' : undefined);
  const resolvedAriaLabelledBy = ariaLabelledBy ?? (title && titleId ? titleId : undefined);

  return (
    <svg
      width={safeSize}
      height={safeSize}
      viewBox="0 0 24 24"
      fill="currentColor"
      role={resolvedRole}
      aria-hidden={resolvedAriaHidden}
      aria-label={ariaLabel}
      aria-labelledby={resolvedAriaLabelledBy}
      className={className}
      {...restProps}
    >
      {title && <title id={titleId}>{title}</title>}
      {/* Serpentine body: crescent from the neck clockwise around to the tail,
          which narrows gradually into a clean curved point rising toward the
          head's open jaws. */}
      <path d="M13.65 2.64 A 9.5 9.5 0 1 1 5.28 5.28 C 6.13 4.43 7.77 3.24 8.20 2.89 Q 8.55 2.60 8.80 2.98 C 9.30 3.73 12.04 5.88 10.86 6.11 A 6 6 0 1 0 13.04 6.09 Z" />
      {/* Back ridges along the outer curve. */}
      <path d="M19.44 6.08 L20.85 5.80 L20.10 7.04 Z M21.50 12.25 L22.76 12.94 L21.40 13.41 Z M18.54 18.90 L18.94 20.27 L17.64 19.64 Z M11.75 21.50 L11.06 22.76 L10.51 21.38 Z" />
      {/* Head: horn swept back, open jaws chasing the tail wisp; the evenodd
          subpath punches the eye. */}
      <path
        fillRule="evenodd"
        d="M8.6 1.8 L10.2 0.9 L11.6 0.8 L13.0 1.4 L16.6 0.4 L14.2 2.8 L16.0 4.4 L13.8 4.5 L13.2 5.6 L11.2 5.1 L9.6 4.5 L10.7 3.1 Z M11.05 1.75 a 0.5 0.5 0 1 0 0.001 0 Z"
      />
    </svg>
  );
});


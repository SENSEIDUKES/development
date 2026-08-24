import React, { memo, type SVGAttributes } from 'react';

/**
 * LibraryDragonCycleIcon — the Celestial Library's cycle glyph: a dragon
 * chasing its own tail (ouroboros). It is part of the ecosystem's shared
 * icon language and means "Re-do, Re-try, or shuffle" wherever it appears —
 * cycling a suggestion, reshuffling a draw, retrying a roll.
 *
 * Custom silhouette (not a Lucide glyph): a serpentine body curling clockwise
 * from a horned head, thickest over the shoulder and tapering along a curved
 * centreline to a fine tail point that hooks back inside the coil toward the
 * jaws. `fill: currentColor` so it inherits the surrounding accent (portal
 * blue, gold, signal) exactly like the Lucide icons it sits beside.
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
      {/* Serpentine body: a single ring sweeping clockwise from the neck at the
          top all the way round, thickest over the shoulder and tapering along a
          curved centreline to a fine point where the tail hooks back inside the
          coil toward the jaws. */}
      <path d="M 10.23 1.95 C 10.67 1.94 12.01 1.76 12.89 1.84 C 13.76 1.93 14.66 2.13 15.48 2.44 C 16.3 2.74 17.11 3.18 17.82 3.69 C 18.53 4.2 19.19 4.83 19.74 5.51 C 20.29 6.18 20.75 6.96 21.1 7.76 C 21.45 8.55 21.69 9.42 21.81 10.27 C 21.93 11.12 21.94 12.02 21.83 12.86 C 21.73 13.71 21.5 14.56 21.18 15.34 C 20.86 16.12 20.42 16.88 19.91 17.54 C 19.4 18.2 18.79 18.81 18.13 19.31 C 17.48 19.81 16.74 20.23 15.98 20.54 C 15.23 20.86 14.42 21.09 13.62 21.21 C 12.82 21.32 11.99 21.33 11.19 21.24 C 10.4 21.14 9.59 20.93 8.86 20.64 C 8.12 20.34 7.4 19.93 6.78 19.46 C 6.15 18.99 5.57 18.41 5.09 17.8 C 4.61 17.18 4.19 16.49 3.9 15.78 C 3.62 15.06 3.42 14.28 3.36 13.52 C 3.3 12.77 3.37 11.98 3.54 11.26 C 3.7 10.54 3.99 9.83 4.35 9.21 C 4.7 8.6 5.17 8.03 5.67 7.57 C 6.18 7.12 7.09 6.67 7.37 6.48 C 7.13 6.7 6.36 7.27 5.95 7.76 C 5.53 8.25 5.15 8.81 4.88 9.41 C 4.61 10.0 4.41 10.67 4.32 11.33 C 4.22 11.98 4.22 12.69 4.33 13.35 C 4.44 14.01 4.66 14.69 4.96 15.28 C 5.26 15.88 5.67 16.45 6.12 16.94 C 6.57 17.43 7.09 17.87 7.64 18.22 C 8.2 18.57 8.81 18.86 9.43 19.06 C 10.05 19.25 10.71 19.37 11.35 19.4 C 11.99 19.43 12.66 19.37 13.28 19.24 C 13.9 19.1 14.52 18.88 15.07 18.59 C 15.63 18.3 16.15 17.91 16.6 17.48 C 17.05 17.06 17.45 16.56 17.77 16.04 C 18.09 15.52 18.34 14.95 18.51 14.37 C 18.69 13.8 18.78 13.19 18.8 12.6 C 18.82 12.01 18.76 11.4 18.63 10.83 C 18.51 10.26 18.3 9.7 18.04 9.19 C 17.77 8.67 17.43 8.19 17.05 7.76 C 16.67 7.33 16.23 6.95 15.76 6.63 C 15.29 6.32 14.76 6.06 14.23 5.87 C 13.7 5.69 13.13 5.56 12.57 5.52 C 12.01 5.47 11.15 5.59 10.87 5.6 Z" />
      {/* Back spines: four swept-back ridges along the outer edge, shrinking
          with the body so the taper stays legible at 24px. */}
      <path d="M 20.13 6.03 L 18.24 3.04 L 18.31 4.07 Z M 20.71 16.32 L 22.38 13.38 L 21.64 13.91 Z M 12.15 21.3 L 15.35 21.34 L 14.6 21.01 Z M 4.35 16.69 L 5.97 19.26 L 5.79 18.59 Z" />
      {/* Head, drawn in its own frame at the neck and set on the ring: swept
          horn, brow ridge breaking into a straight snout, parted jaw, and a
          neck that meets the body at its full width. The evenodd subpath cuts
          the narrow eye. */}
      <path
        fillRule="evenodd"
        transform="translate(10.55 3.78) rotate(170) scale(1 -1)"
        d="M -1.85 -1.8 L -3.55 -3.05 L -1.55 -2.0 C -0.55 -2.32 0.55 -2.26 1.35 -1.85 L 2.0 -1.3 L 4.85 -0.42 L 3.75 0.05 L 4.15 0.42 L 2.3 0.8 C 1.6 1.35 0.6 1.72 -0.6 1.82 L -1.85 1.8 Z M 0.55 -0.9 Q 1.15 -1.18 1.62 -0.98 Q 1.05 -0.6 0.55 -0.9 Z"
      />
    </svg>
  );
});


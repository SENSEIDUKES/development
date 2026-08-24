import React, { memo, type SVGAttributes } from 'react';

/**
 * LibraryDragonCycleIcon — the Celestial Library's cycle glyph: a dragon
 * chasing its own tail (ouroboros). It is part of the ecosystem's shared
 * icon language and means "Re-do, Re-try, or shuffle" wherever it appears —
 * cycling a suggestion, reshuffling a draw, retrying a roll.
 *
 * Custom silhouette (not a Lucide glyph): a spined serpentine body curling
 * clockwise, the tail tapering into a curved point that rises into the head's
 * open jaws. `fill: currentColor` so it inherits the surrounding accent
 * (portal blue, gold, signal) exactly like the Lucide icons it sits beside.
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
          whose outer and inner edges converge through two cubic sweeps into a
          single curved point rising toward the head's open jaws. */}
      <path d="M13.6 2.75 A 9.5 9.5 0 1 1 6.55 4.22 C 7.53 3.53 7.35 2.55 7.9 2.2 C 8.6 2.9 8.7 4.8 8.4 6.4 A 6.5 6.5 0 1 0 13 6 Z" />
      {/* Back spines: small, evenly spaced slivers along the outer curve. */}
      <path d="M19.46 6.1 L20.44 6.09 L20.1 7 Z M21.5 11.45 L22.3 12 L21.5 12.55 Z M19.07 18.37 L19.21 19.21 L18.37 19.07 Z M10.84 21.45 L10.23 22.05 L9.86 21.27 Z" />
      {/* Head: horn swept back, a sharpened brow over a narrow slit eye, parted
          snout and jaw chasing the tail point, and a smooth neck flow into the
          body; the evenodd subpath punches the eye. */}
      <path
        fillRule="evenodd"
        d="M8.3 1.9 C 9.1 1.2 9.9 0.9 10.7 0.85 L 12.5 1.15 L 16.4 0.35 L 14 2.6 L 15.8 4.2 L 13.7 4.4 C 13.3 5.2 12.9 5.6 12.3 5.75 L 11 5.15 C 10.3 4.9 9.6 4.6 9.2 4.3 L 10.5 3.05 L 8.9 2.55 Z M10.35 1.65 C 10.75 1.42 11.4 1.45 11.65 1.72 C 11.3 1.9 10.7 1.88 10.35 1.65 Z"
      />
    </svg>
  );
});


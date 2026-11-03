import type { SVGProps } from 'react';

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/**
 * The Energy sun (SENEnergySun, LIBRARY CORE/IMAGES/ICONS/Master Icons/Special),
 * trialled as Energy's mark so it stops sharing the lightning bolt with Create
 * (SENSEI, 2026-11-03). Drawn in `currentColor` and sized in `em`, like the
 * Library icons it stands beside. Not yet in the UI package's icon set.
 */
export function EnergySunIcon({ size = '1em', ...props }: SVGProps<SVGSVGElement> & { size?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" focusable="false" data-energy-sun="" {...props}>
      <circle cx="12" cy="12" r="5.35" stroke="currentColor" strokeWidth="1.55" />
      {RAYS.map(angle => (
        <path key={angle} d="M12 1.55 13.85 5.35Q12 4.9 10.15 5.35Z" transform={`rotate(${angle} 12 12)`} fill="currentColor" />
      ))}
    </svg>
  );
}

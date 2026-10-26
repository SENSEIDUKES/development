import type { SVGProps } from 'react';

export type FatePressureLevel = 'mortal' | 'immortal' | 'heaven';
export interface FatePressureIconProps extends SVGProps<SVGSVGElement> {
  level: FatePressureLevel;
  size?: number | string;
}

const flames: Record<FatePressureLevel, string> = {
  mortal: 'M12 8c.7 3.2 4.5 5.3 4.5 8.6a4.5 4.5 0 0 1-9 0C7.5 13.3 10.6 11.8 12 8Zm0 7c-.5 1.3-1.7 2.2-1.7 3.3a1.7 1.7 0 0 0 3.4 0c0-1.1-1.2-2-1.7-3.3Z',
  immortal: 'M14 3c0 5-5 6-5 10-2.2-1-3-3-3-5-2.2 2.5-3 5.2-3 8a9 9 0 0 0 18 0c0-5.3-5-7-7-13Zm-1 11c-.5 2.1-3.5 3.6-3.5 5.6a3 3 0 0 0 6 0c0-1.8-1.8-3.2-2.5-5.6Z',
  heaven: 'M12 1c1 4 5.8 6.2 5.5 10.1 2-1.5 2.3-3.6 2-5.1 3 3.5 3.5 6.4 3.5 10a11 11 0 0 1-22 0c0-3.6 1.5-6.6 4-9-.4 2.7.1 4.3 1.7 5.3C6 7.2 10 5.1 12 1Zm0 10c-.7 3.2-4 5-4 7.2a4 4 0 0 0 8 0c0-2.2-3.3-4-4-7.2Z',
};

/** Increasing flame silhouettes keep the pressure levels distinct without relying on color. */
export function FatePressureIcon({ level, size = 24, ...props }: FatePressureIconProps) {
  const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
  return <svg width={size} height={size} viewBox="0 0 24 28" fill="currentColor"
    aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined} {...props}>
    <path transform={`translate(0 ${level === 'mortal' ? 6 : level === 'immortal' ? 2 : 0})`} d={flames[level]} fillRule="evenodd" clipRule="evenodd" />
  </svg>;
}

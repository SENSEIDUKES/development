import type { SVGProps } from 'react';

export interface FateSurvivalIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

/** Skull and crossed bones for Survival's risk of death. */
export function FateSurvivalIcon({ size = 24, ...props }: FateSurvivalIconProps) {
  const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
  return <svg width={size} height={size} viewBox="0 0 24 26" fill="currentColor"
    aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined} {...props}>
    <path fillRule="evenodd" clipRule="evenodd"
      d="M12 1C7.8 1 5 3.7 5 7.5V10c0 1.6 1 2.6 3 3v3h2v-2h1.3v2h1.4v-2H14v2h2v-3c2-.4 3-1.4 3-3V7.5C19 3.7 16.2 1 12 1ZM9 6a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 9 6Zm6 0a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 15 6Zm-3 4-1.2 2h2.4L12 10Z" />
    <path d="m4 18 16 6M20 18 4 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 17.3 4.8 19M19.2 23 21 24.7M21 17.3 19.2 19M4.8 23 3 24.7"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

import type { SVGProps } from 'react';

export interface LibraryDaoInsightIconProps extends SVGProps<SVGSVGElement> { size?: number | string }

/** An open eye with a diamond pupil: seeing the idea within a story. */
export function LibraryDaoInsightIcon({ size = 24, ...props }: LibraryDaoInsightIconProps) {
  const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined} {...props}>
    <path d="M2 13s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 13 2 13Z"
      stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
    <path d="m12 9 3 4-3 4-3-4Z" fill="currentColor" />
    <path d="M12 2v2M5.5 4l1 1.5M18.5 4l-1 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

import type { SVGProps } from 'react';

export interface GenreIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

/** Three fanned book covers represent choosing a kind of story. */
export function GenreIcon({ size = 24, ...props }: GenreIconProps) {
  const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
    aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined} {...props}>
    <path d="m5 8-2.5 1.3a1 1 0 0 0-.4 1.3l5.3 10.8a1 1 0 0 0 1.3.5l1.3-.6M9 4.5l-2.8.7a1 1 0 0 0-.7 1.2l3.7 14.1"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path fillRule="evenodd" clipRule="evenodd" d="M13 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Zm.5 3v11H15V5h-1.5Zm0 13v1.5H20V18h-6.5Z" />
  </svg>;
}

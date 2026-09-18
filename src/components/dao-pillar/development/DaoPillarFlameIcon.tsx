import React, { useId } from 'react';

/**
 * The blue cultivation flame every reward tile carries. Drawn inline so the
 * calendar ships no image per tile; the milestone ring and glow are CSS.
 */
export function DaoPillarFlameIcon({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId();
  const outer = `${id}-outer`;
  const core = `${id}-core`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id={outer} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#bfe9ff" />
          <stop offset="0.45" stopColor="#38b6ff" />
          <stop offset="1" stopColor="#0b4fd6" />
        </linearGradient>
        <linearGradient id={core} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#7dd3ff" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5c1.2 4.2 5.6 6.2 7.3 10.1 1.4 3.2 1 7.2-1.4 10-2.2 2.7-5.4 4-8.7 3.4-4.2-.8-7.2-4.5-7.1-8.8.1-3.3 1.9-5.4 3.6-7.6.5 1.9 1.3 3 2.6 3.8-.4-3.9 1.4-8 3.7-10.9z"
        fill={`url(#${outer})`}
      />
      <path
        d="M16.2 13.4c1 2.2 3.1 3.3 3.6 5.7.4 2.2-.8 4.5-2.9 5.3-2.4.9-5.1-.5-5.8-3-.5-1.8.2-3.3 1.2-4.6.3 1 .8 1.6 1.5 2 .1-2 .9-3.9 2.4-5.4z"
        fill={`url(#${core})`}
      />
    </svg>
  );
}

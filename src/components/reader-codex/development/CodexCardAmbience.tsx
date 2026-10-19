import React from 'react';

/**
 * CodexCardAmbience — the quiet interior life of a Development Codex Card: a
 * soft entity-colored aura pooled at the top of the glass and a sparse field
 * of drifting spectral motes. Purely decorative (`aria-hidden`, no pointer
 * events, no layout cost beyond absolutely-positioned decoration); the host
 * card owns the accent via the `--codex-card-accent` custom property or the
 * `accent` prop.
 *
 * The fixed constellation is painted into one background and drifts as a
 * single element. No per-mote nodes, shadows, blend modes or animations.
 * Motion comes from the shared `animate-codex-mote` keyframes and collapses
 * under `motion-reduce`. The static aura uses a soft gradient without a blur.
 */

interface CodexMote {
  left: string;
  top: string;
  size: number;
}

const CODEX_MOTES: readonly CodexMote[] = [
  { left: '14%', top: '66%', size: 2 },
  { left: '27%', top: '40%', size: 2.5 },
  { left: '43%', top: '60%', size: 2 },
  { left: '58%', top: '32%', size: 2 },
  { left: '71%', top: '54%', size: 2.5 },
  { left: '84%', top: '44%', size: 2 },
  { left: '50%', top: '78%', size: 2 },
];

const MOTE_BACKGROUND = CODEX_MOTES.map(mote => (
  `radial-gradient(circle at ${mote.left} ${mote.top}, var(--codex-mote-accent) ${mote.size / 2}px, color-mix(in srgb, var(--codex-mote-accent) 30%, transparent) ${mote.size}px, transparent ${mote.size * 3}px)`
)).join(', ');

export interface CodexCardAmbienceProps {
  /** Entity accent hex; already resolved by `resolveCodexEntityAccent`. */
  accent: string;
}

/**
 * Renders the decorative aura-and-mote layer inside a Codex Card. Memoized;
 * the `accent` prop is the only input.
 */
export const CodexCardAmbience: React.FC<CodexCardAmbienceProps> = React.memo(({ accent }) => (
  <div
    data-slot="codex-card-ambience"
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    style={{
      background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${accent} 15%, transparent), transparent 65%)`,
      ['--codex-mote-accent' as string]: accent,
    }}
  >
    <span
      data-slot="codex-mote-field"
      className="absolute inset-0 animate-codex-mote motion-reduce:animate-none opacity-30"
      style={{ backgroundImage: MOTE_BACKGROUND }}
    />
  </div>
));

export default CodexCardAmbience;

import React from 'react';

/**
 * CodexCardAmbience — the quiet interior life of a Development Codex Card: a
 * soft entity-colored aura pooled at the top of the glass and a sparse field
 * of drifting spectral motes. Purely decorative (`aria-hidden`, no pointer
 * events, no layout cost beyond one absolutely-positioned layer); the host
 * card owns the accent via the `--codex-card-accent` custom property or the
 * `accent` prop.
 *
 * The mote field is a fixed constellation — deterministic positions, sizes,
 * durations, delays, and lateral drift — so screenshots and compare panes
 * never flicker between renders. Motion comes from the shared
 * `animate-codex-mote` keyframes and collapses under `motion-reduce`.
 */

interface CodexMote {
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

const CODEX_MOTES: readonly CodexMote[] = [
  { left: '14%', top: '66%', size: 2, duration: 9.5, delay: 0, drift: -3 },
  { left: '27%', top: '40%', size: 2.5, duration: 11, delay: 1.4, drift: 2 },
  { left: '43%', top: '60%', size: 2, duration: 10, delay: 2.6, drift: -2 },
  { left: '58%', top: '32%', size: 2, duration: 12, delay: 0.9, drift: 3 },
  { left: '71%', top: '54%', size: 2.5, duration: 9, delay: 3.4, drift: -3 },
  { left: '84%', top: '44%', size: 2, duration: 11.5, delay: 2, drift: 2 },
  { left: '50%', top: '78%', size: 2, duration: 10.5, delay: 4.2, drift: -2 },
];

export interface CodexCardAmbienceProps {
  /** Entity accent hex; already resolved by `resolveCodexEntityAccent`. */
  accent: string;
}

export const CodexCardAmbience: React.FC<CodexCardAmbienceProps> = React.memo(({ accent }) => (
  <div
    data-slot="codex-card-ambience"
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
  >
    <div
      className="absolute left-1/2 top-0 h-[55%] w-[130%] -translate-x-1/2 rounded-full blur-2xl"
      style={{
        background: `radial-gradient(ellipse at center, color-mix(in srgb, ${accent} 15%, transparent), transparent 65%)`,
      }}
    />
    {CODEX_MOTES.map((mote, index) => (
      <span
        key={index}
        className="absolute rounded-full animate-codex-mote motion-reduce:animate-none"
        style={{
          left: mote.left,
          top: mote.top,
          width: mote.size,
          height: mote.size,
          background: accent,
          boxShadow: `0 0 ${mote.size * 3}px color-mix(in srgb, ${accent} 80%, transparent)`,
          mixBlendMode: 'screen',
          animationDuration: `${mote.duration}s`,
          animationDelay: `${mote.delay}s`,
          ['--codex-mote-drift' as string]: `${mote.drift}px`,
        }}
      />
    ))}
  </div>
));

export default CodexCardAmbience;

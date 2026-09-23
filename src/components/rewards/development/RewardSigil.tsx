import React from 'react';
import { Sparkles } from 'lucide-react';

const TICKS = Array.from({ length: 36 }, (_, index) => {
  const angle = (index * 10 * Math.PI) / 180;
  const long = index % 9 === 0;
  const inner = long ? 84 : 88;
  return (
    <line
      key={index}
      x1={120 + Math.cos(angle) * inner}
      y1={120 + Math.sin(angle) * inner}
      x2={120 + Math.cos(angle) * 92}
      y2={120 + Math.sin(angle) * 92}
      strokeWidth={long ? 0.8 : 0.4}
      opacity={long ? 0.7 : 0.45}
    />
  );
});

const STAR = 'M120 74 L127.5 112.5 L166 120 L127.5 127.5 L120 166 L112.5 127.5 L74 120 L112.5 112.5 Z';
const INNER_STAR = 'M120 90 L126.6 113.4 L150 120 L126.6 126.6 L120 150 L113.4 126.6 L90 120 L113.4 113.4 Z';

/**
 * The ornate reward sigil from the Relic Reveal: a slow-spinning outer
 * assembly, a counter-rotating tick ring, and a static eight-point star with
 * an icon at its heart. `sealed` dims it to the neutral waiting tone; the
 * revealed variant adds the axis crowns and twinkling motes.
 */
export function RewardSigil({ hex, variant, brighter = false, children }: {
  hex: string;
  variant: 'sealed' | 'revealed';
  brighter?: boolean;
  /** The icon at the heart of the star. */
  children: React.ReactNode;
}) {
  const sealed = variant === 'sealed';
  return (
    <>
      <div aria-hidden className="absolute inset-4 rounded-full reward-breathe"
        style={{ background: `radial-gradient(circle, ${hex}${sealed ? '14' : '21'} 0%, transparent 68%)` }} />
      {!sealed && (
        <div aria-hidden className="absolute -left-4 -right-4 top-1/2 h-px -translate-y-1/2"
          style={{ background: `linear-gradient(to right, transparent, ${hex}59 22%, ${hex}59 78%, transparent)` }} />
      )}
      <svg viewBox="0 0 240 240" className="relative h-full w-full" fill="none" stroke="currentColor" aria-hidden
        style={{
          color: sealed ? `${hex}8c` : hex,
          filter: sealed ? `drop-shadow(0 0 8px ${hex}40)`
            : brighter ? `drop-shadow(0 0 14px ${hex}b3) brightness(1.18)` : `drop-shadow(0 0 9px ${hex}80)`,
        }}>
        <g className="reward-sigil-spin" opacity={sealed ? 0.5 : 0.6}>
          <circle cx="120" cy="120" r="112" strokeWidth="0.5" strokeDasharray="1 7" />
          <circle cx="120" cy="120" r="103" strokeWidth="0.7" />
          <path d="M120 34 L206 120 L120 206 L34 120 Z" strokeWidth="0.8" opacity="0.85" />
          {[[120, 34], [206, 120], [120, 206], [34, 120]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="currentColor" stroke="none" />
          ))}
        </g>
        <g className="reward-sigil-spin-rev" opacity={sealed ? 0.45 : 0.55}>
          <circle cx="120" cy="120" r="92" strokeWidth="0.4" />
          {TICKS}
        </g>
        <g opacity={sealed ? 0.8 : 0.9}>
          {!sealed && (
            <>
              <line x1="120" y1="10" x2="120" y2="58" strokeWidth="0.5" opacity="0.55" />
              <line x1="120" y1="182" x2="120" y2="230" strokeWidth="0.5" opacity="0.55" />
              <line x1="10" y1="120" x2="58" y2="120" strokeWidth="0.5" opacity="0.55" />
              <line x1="182" y1="120" x2="230" y2="120" strokeWidth="0.5" opacity="0.55" />
              {[[120, 20], [120, 220], [20, 120], [220, 120]].map(([cx, cy]) => (
                <React.Fragment key={`crown-${cx}-${cy}`}>
                  <circle cx={cx} cy={cy} r="3.2" strokeWidth="0.7" />
                  <circle cx={cx} cy={cy} r="1" fill="currentColor" stroke="none" />
                </React.Fragment>
              ))}
              {[[120, 66], [120, 174], [66, 120], [174, 120]].map(([cx, cy]) => (
                <circle key={`bead-${cx}-${cy}`} cx={cx} cy={cy} r="2.6" strokeWidth="0.7" />
              ))}
            </>
          )}
          <circle cx="120" cy="120" r="58" strokeWidth="0.8" />
          <circle cx="120" cy="120" r="51" strokeWidth="0.45" strokeDasharray="3 2.5" opacity="0.7" />
          <path d={STAR} strokeWidth="1" strokeLinejoin="round" />
          <path d={INNER_STAR} strokeWidth="0.5" opacity="0.65" transform="rotate(45 120 120)" />
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ color: sealed ? `${hex}cc` : hex, filter: `drop-shadow(0 0 8px ${sealed ? `${hex}59` : hex})` }}>
        {children}
      </div>
      {!sealed && (
        <>
          <Sparkles size={9} className="absolute reward-twinkle" style={{ top: '2%', left: '47%', color: hex }} strokeWidth={1.5} />
          <Sparkles size={7} className="absolute reward-twinkle" style={{ top: '26%', right: '-2%', color: hex, animationDelay: '0.9s' }} strokeWidth={1.5} />
          <Sparkles size={8} className="absolute reward-twinkle" style={{ bottom: '8%', left: '-3%', color: hex, animationDelay: '1.6s' }} strokeWidth={1.5} />
          <Sparkles size={6} className="absolute reward-twinkle" style={{ bottom: '0%', right: '24%', color: hex, animationDelay: '0.4s' }} strokeWidth={1.5} />
        </>
      )}
    </>
  );
}

/** The ornament row used above and below reward titles. */
export function RewardOrnament({ hex, width = 'w-12' }: { hex: string; width?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5" aria-hidden>
      <div className={`h-px ${width}`} style={{ background: `linear-gradient(to right, transparent, ${hex}59)` }} />
      <div className="h-1.5 w-1.5 rotate-45" style={{ border: `1px solid ${hex}a6`, boxShadow: `0 0 7px ${hex}73` }} />
      <div className={`h-px ${width}`} style={{ background: `linear-gradient(to left, transparent, ${hex}59)` }} />
    </div>
  );
}

/** The spark-flanked label row: "Legendary Relic", "Sealed Relic", "Mystery Scroll". */
export function RewardLabel({ hex, children }: { hex: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full items-center justify-center gap-2.5">
      <div aria-hidden className="h-px w-7" style={{ background: `linear-gradient(to right, transparent, ${hex}66)` }} />
      <Sparkles aria-hidden size={11} strokeWidth={1.5} style={{ color: hex, filter: `drop-shadow(0 0 5px ${hex})` }} />
      <span className="whitespace-nowrap font-serif text-[10px] uppercase tracking-[0.35em]" style={{ color: `${hex}d9`, textShadow: `0 0 14px ${hex}66` }}>
        {children}
      </span>
      <Sparkles aria-hidden size={11} strokeWidth={1.5} style={{ color: hex, filter: `drop-shadow(0 0 5px ${hex})` }} />
      <div aria-hidden className="h-px w-7" style={{ background: `linear-gradient(to left, transparent, ${hex}66)` }} />
    </div>
  );
}

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { orderRewardGrants, REWARD_CURRENCY_LABELS, type RewardGrant, type RewardRarity } from '../../../library/rewards/contracts';
import { RewardLabel, RewardOrnament, RewardSigil } from './RewardSigil';
import { rewardEffects, rewardTheme, rewardVibrate } from './rewardTheme';

/** Deterministic drift-mote layout (no per-render randomness). */
const DRIFT_MOTES = Array.from({ length: 6 }, (_, index) => ({
  left: `${10 + ((index * 67) % 78)}%`,
  top: `${28 + ((index * 41) % 58)}%`,
  size: 2.5 + (index % 3),
  duration: 7 + (index % 4) * 2.5,
  delay: (index * 1.7) % 8,
}));

/** Sparks shed from the card rim while it spins from sealed to revealed. */
const SPIN_SPARKS = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2 + (index % 3) * 0.22;
  const distance = 56 + ((index * 37) % 46);
  return {
    left: `${50 + Math.cos(angle) * 42}%`,
    top: `${50 + Math.sin(angle) * 42}%`,
    sx: `${Math.cos(angle) * distance}px`,
    sy: `${Math.sin(angle) * distance - 26}px`,
    sr: `${(index % 2 === 0 ? 1 : -1) * (80 + ((index * 53) % 120))}deg`,
    size: 1.5 + (index % 3),
    delay: (index % 5) * 0.05,
    long: index % 4 === 0,
  };
});

const formatWhole = (value: number) => value.toLocaleString('en-US');

export interface RewardRevealCardProps {
  /** What kind of reward this is: "Mystery Scroll", "Relic". Shown after the rarity. */
  kindLabel: string;
  name: string;
  description: string;
  rarity: RewardRarity | null;
  /** What the reward delivered, as the server reported it. */
  grants: readonly RewardGrant[];
  icon: LucideIcon;
  /** Acknowledges an already-delivered server record. It never awards anything. */
  acknowledgeLabel: string;
  onAcknowledge: () => void;
  /** Change to replay the entrance, flare and sparks. */
  replayKey?: number;
  /** One quiet line under the rewards, e.g. where the rewards went. */
  footnote?: React.ReactNode;
}

/**
 * The revealed face of a reward: the Relic Reveal's premium card, generalized.
 * The rarity sets the accent and the ambient ladder; the stats box lists what
 * the server delivered, one cell per balance.
 */
export function RewardRevealCard({
  kindLabel, name, description, rarity, grants, icon: Icon, acknowledgeLabel, onAcknowledge, replayKey = 0, footnote,
}: RewardRevealCardProps) {
  const reduceMotion = useReducedMotion();
  const { hex, titleColor } = rewardTheme(rarity);
  const fx = rewardEffects(rarity);
  const cells = orderRewardGrants(grants);

  return (
    <motion.div
      key={`reward-revealed-${replayKey}`}
      initial={reduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, rotateY: -55 }}
      animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1, rotateY: 0 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 22, stiffness: 150 }}
      className="relative z-10 w-full max-w-[300px] sm:max-w-[340px]"
      data-celestial-foreground
      data-reward-card
      data-reward-rarity={rarity ?? 'unknown'}
      style={{ transformPerspective: 1200 }}
      onClick={event => event.stopPropagation()}
    >
      {fx.warmGlow && (
        <div aria-hidden className="pointer-events-none absolute -inset-16 reward-halo-pulse"
          style={{ background: `radial-gradient(ellipse at 50% 44%, ${hex}1f 0%, ${hex}0a 38%, transparent 66%)`, filter: 'blur(6px)' }} />
      )}
      <div aria-hidden className={`pointer-events-none absolute -inset-10 ${fx.pulse ? 'reward-halo-pulse' : ''}`}
        style={{ background: `radial-gradient(ellipse at 50% 36%, ${hex}${fx.halo ? '2e' : '10'} 0%, transparent 62%)` }} />
      {fx.revealFlare && !reduceMotion && (
        <div aria-hidden className="pointer-events-none absolute -inset-10 reward-reveal-flare"
          style={{ background: `radial-gradient(circle at 50% 42%, ${hex}59 0%, transparent 60%)` }} />
      )}
      {!reduceMotion && (
        <div aria-hidden className="pointer-events-none absolute -inset-8">
          {SPIN_SPARKS.map((spark, index) => (
            <span key={index} className="absolute reward-spin-spark" style={{
              left: spark.left, top: spark.top, width: spark.long ? spark.size * 2.4 : spark.size, height: spark.size,
              borderRadius: '9999px', background: hex, boxShadow: `0 0 7px ${hex}`, animationDelay: `${spark.delay}s`,
              '--sx': spark.sx, '--sy': spark.sy, '--sr': spark.sr,
            } as React.CSSProperties} />
          ))}
        </div>
      )}
      {fx.particles > 0 && !reduceMotion && (
        <div aria-hidden className="pointer-events-none absolute -inset-6">
          {DRIFT_MOTES.slice(0, fx.particles).map((mote, index) => (
            <span key={index} className="absolute rounded-full reward-drift" style={{
              left: mote.left, top: mote.top, width: mote.size, height: mote.size, background: hex,
              boxShadow: `0 0 6px ${hex}`, animationDuration: `${mote.duration}s`, animationDelay: `${mote.delay}s`,
            }} />
          ))}
        </div>
      )}

      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#060607]/95 px-5 pb-4 pt-5 text-center sm:px-6 sm:pb-5 sm:pt-6"
        style={{ border: `1px solid ${hex}45`, boxShadow: `0 0 50px ${hex}26, inset 0 0 70px rgba(0,0,0,0.65)` }}>
        {fx.edgeShimmer && !reduceMotion && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem]">
            <div className="reward-shimmer-band absolute bottom-0 top-0 w-1/3"
              style={{ background: `linear-gradient(to right, transparent, ${hex}12 42%, ${hex}24 50%, ${hex}12 58%, transparent)` }} />
          </div>
        )}
        <div aria-hidden className="pointer-events-none absolute inset-[5px] rounded-[1.2rem]" style={{ border: `1px solid ${hex}1c` }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.05] to-transparent" />

        <div className="relative z-10 flex flex-col items-center">
          <RewardLabel hex={hex}>{rarity ? `${rarity} ${kindLabel}` : kindLabel}</RewardLabel>

          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.55, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.25, type: 'spring', damping: 18, stiffness: 120 }}
            className="relative my-3 flex h-36 w-36 items-center justify-center sm:my-4 sm:h-48 sm:w-48"
          >
            <RewardSigil hex={hex} variant="revealed" brighter={fx.brighterSeal}>
              <Icon size={15} strokeWidth={1} />
            </RewardSigil>
          </motion.div>

          <h3 className={`font-serif text-[17px] font-normal leading-snug tracking-wide sm:text-[20px] ${titleColor}`}
            style={{ textShadow: `0 0 24px ${hex}45` }} data-reward-name>
            {name}
          </h3>
          <div className="my-3"><RewardOrnament hex={hex} /></div>
          <p className="line-clamp-3 max-w-[260px] px-2 font-serif text-xs italic leading-relaxed text-neutral-400 sm:text-[13px]">
            {description}
          </p>

          {cells.length > 0 && (
            <div className={`mt-3 grid w-full overflow-hidden rounded-xl bg-black/50 sm:mt-4 ${cells.length === 1 ? 'grid-cols-2' : cells.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
              style={{ border: `1px solid ${hex}30`, boxShadow: `inset 0 0 26px rgba(0,0,0,0.65), 0 0 18px ${hex}14` }}
              data-reward-delivered>
              {cells.map((grant, index) => (
                <div key={grant.type} className="flex min-w-0 items-center justify-center px-1 py-2 sm:py-2.5"
                  style={{ borderLeft: index === 0 ? undefined : `1px solid ${hex}24` }} data-reward-grant={grant.type}>
                  <span className="whitespace-nowrap font-serif text-[10px] uppercase tracking-[0.12em] text-neutral-200 sm:text-[11px]">
                    +{formatWhole(grant.amount)}
                    <span className="mx-1.5" style={{ color: `${hex}80` }}>|</span>
                    <span style={{ color: `${hex}d9`, textShadow: `0 0 10px ${hex}55` }}>{REWARD_CURRENCY_LABELS[grant.type]}</span>
                  </span>
                </div>
              ))}
              {cells.length === 1 && (
                <div className="flex min-w-0 items-center justify-center px-1 py-2 sm:py-2.5" style={{ borderLeft: `1px solid ${hex}24` }}>
                  <span className="whitespace-nowrap font-serif text-[10px] uppercase tracking-[0.12em] sm:text-[11px]"
                    style={{ color: `${hex}d9`, textShadow: `0 0 10px ${hex}55` }}>{kindLabel}</span>
                </div>
              )}
            </div>
          )}
          {footnote ? <p className="mt-2 text-[11px] text-neutral-500">{footnote}</p> : null}

          <button
            type="button"
            autoFocus
            onClick={() => { onAcknowledge(); rewardVibrate('softTap'); }}
            className="reward-acknowledge group relative mt-3 w-full overflow-hidden rounded-full py-2.5 sm:mt-4"
            style={{
              border: `1px solid ${hex}59`,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(0,0,0,0.45))',
              boxShadow: `0 0 20px ${hex}1f`,
              '--reward-hex-glow': `${hex}66`,
            } as React.CSSProperties}
            data-reward-acknowledge
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10 flex items-center justify-center gap-4">
              <Sparkles aria-hidden size={12} style={{ color: hex }} className="transition-transform duration-500 group-hover:scale-125" />
              <span className="font-serif text-xs uppercase tracking-[0.28em] text-neutral-200 transition-colors group-hover:text-white">
                {acknowledgeLabel}
              </span>
              <Sparkles aria-hidden size={12} style={{ color: hex }} className="transition-transform duration-500 group-hover:scale-125" />
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

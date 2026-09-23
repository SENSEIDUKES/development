import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ScrollText } from 'lucide-react';
import { CelestialScrollVessel } from '@seihouse/library-ui';
import { ManifestationReveal } from '@seihouse/sen/manifestations';
import { REWARD_CURRENCY_LABELS, orderRewardGrants, type RewardGrant } from '../../../library/rewards/contracts';
import { ACHIEVEMENT_CATEGORY_LABELS, type MysteryScrollView, type OpenMysteryScrollResponse } from '../../../library/rewards/achievements';
import { RewardGrants } from './RewardGrants';
import { RewardRevealCard } from './RewardRevealCard';
import { RewardRevealOverlay } from './RewardRevealOverlay';
import { NEUTRAL_REWARD_THEME, rewardTheme, rewardVibrate } from './rewardTheme';

type ScrollPhase = 'sealed' | 'unsealing' | 'revealed';

export interface MysteryScrollRevealProps {
  scroll: MysteryScrollView;
  /** The achievement's own description, when the host has it. */
  description?: string;
  /** Opens the scroll on the server and resolves with its answer. The reveal never names a reward. */
  onOpen: (scrollId: string) => Promise<OpenMysteryScrollResponse>;
  onClose: () => void;
  /**
   * How long the scroll holds its unsealing loop at minimum, so the unroll
   * reads as one motion even when the server answers instantly. Skipped under
   * reduced motion.
   */
  minimumUnsealMs?: number;
}

const wait = (ms: number) => ms > 0 ? new Promise<void>(resolve => { setTimeout(resolve, ms); }) : Promise.resolve();

/** "Added to your DAO XP and QI." — where each balance went. */
export function deliveredFootnote(grants: readonly RewardGrant[]) {
  const labels = orderRewardGrants(grants).map(grant => REWARD_CURRENCY_LABELS[grant.type]);
  if (!labels.length) return undefined;
  return `Added to your ${labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0]}.`;
}

/**
 * Opening a Mystery Scroll. The celestial scroll vessel (SEN's
 * `ManifestationReveal` mechanic) holds sealed → unsealing while the server
 * opens the scroll, then the reward card from the Relic Reveal lands with the
 * scroll's rarity and whatever the server delivered.
 *
 * Concealed scrolls show nothing about their contents until opened; curated
 * milestone scrolls show their reward upfront. A failed open leaves the scroll
 * sealed, says so, and credits nothing.
 */
export function MysteryScrollReveal({ scroll, description, onOpen, onClose, minimumUnsealMs = 1400 }: MysteryScrollRevealProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<ScrollPhase>(scroll.status === 'opened' ? 'revealed' : 'sealed');
  const [opened, setOpened] = useState<MysteryScrollView | null>(scroll.status === 'opened' ? scroll : null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  // Set on every mount, not only at creation: React's development double
  // mount runs this cleanup once before the reveal is really shown.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const unseal = useCallback(async () => {
    if (phase !== 'sealed') return;
    setError(null);
    setPhase('unsealing');
    rewardVibrate('heavyTap');
    try {
      const [response] = await Promise.all([onOpen(scroll.id), wait(reduceMotion ? 0 : minimumUnsealMs)]);
      if (!mounted.current) return;
      setOpened(response.scroll);
      setPhase('revealed');
    } catch (reason) {
      if (!mounted.current) return;
      setError(reason instanceof Error ? reason.message : 'The scroll could not be opened. Nothing was credited; please try again.');
      setPhase('sealed');
    }
  }, [phase, onOpen, scroll.id, reduceMotion, minimumUnsealMs]);

  const curated = scroll.presentation === 'curated';
  const revealed = phase === 'revealed' && opened;
  const grants = opened ? (opened.delivered ?? opened.rewards ?? []) : [];
  const accent = revealed ? rewardTheme(opened.rarity).hex : NEUTRAL_REWARD_THEME.hex;
  const dismissable = phase !== 'unsealing';

  return (
    <RewardRevealOverlay label={`Mystery Scroll: ${scroll.achievementName}`} accent={accent}
      onBackdropClick={revealed ? onClose : undefined} onEscape={dismissable ? onClose : undefined}>
      {revealed ? (
        <RewardRevealCard
          kindLabel="Mystery Scroll"
          name={opened.achievementName}
          description={description ?? `A ${ACHIEVEMENT_CATEGORY_LABELS[opened.category].toLowerCase()} achievement, recognized by the Library.`}
          rarity={opened.rarity}
          grants={grants}
          icon={ScrollText}
          acknowledgeLabel="Continue"
          onAcknowledge={onClose}
          footnote={opened.delivered?.length ? deliveredFootnote(opened.delivered) : 'The Library is delivering this reward.'}
        />
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center" data-celestial-foreground
          data-mystery-scroll-phase={phase} onClick={event => event.stopPropagation()}>
          <p className="font-serif text-[10px] uppercase tracking-[0.35em] text-amber-200/70">
            {curated && scroll.rarity ? `${scroll.rarity} milestone scroll` : 'Mystery Scroll'}
          </p>
          <h2 className="font-serif text-xl text-neutral-100">{scroll.achievementName}</h2>
          {curated && scroll.rewards ? (
            <div className="flex flex-col items-center gap-1.5" data-mystery-scroll-curated>
              <p className="text-xs text-neutral-400">This milestone scroll holds</p>
              <RewardGrants grants={scroll.rewards} />
            </div>
          ) : (
            <p className="text-xs text-neutral-400" data-mystery-scroll-concealed>Its contents stay hidden until you open it.</p>
          )}
          <div className="aspect-[4/5] w-[min(74vw,19rem)]">
            <ManifestationReveal
              state={phase}
              content={{ placeholderLabel: 'Mystery Scroll' }}
              onUnseal={phase === 'sealed' ? () => { void unseal(); } : undefined}
              sealedTapLabel={`Open the Mystery Scroll for ${scroll.achievementName}`}
              vessel={<CelestialScrollVessel state={phase} placeholderLabel="Mystery Scroll" />}
            />
          </div>
          <p role={error ? 'alert' : 'status'} aria-live="polite" className={`min-h-5 text-sm ${error ? 'text-red-300' : 'text-neutral-400'}`}
            data-mystery-scroll-status>
            {phase === 'unsealing' ? 'Unsealing…' : error ? `${error} The scroll is still sealed.` : 'Tap the scroll to open it.'}
          </p>
          {phase === 'sealed' && (
            <button type="button" onClick={onClose}
              className="min-h-11 rounded-full px-4 text-xs uppercase tracking-[0.22em] text-neutral-400 hover:text-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7dd3ff]">
              Keep it sealed for now
            </button>
          )}
        </div>
      )}
    </RewardRevealOverlay>
  );
}

import React, { useEffect, useState } from 'react';
import { Award, Compass, Gem, Globe, Key, RefreshCw, Save, Shield, Sliders, Zap, type LucideIcon } from 'lucide-react';
import type { FateSurvivalRelicView } from '../../../library/relics/contracts';
import { RewardRevealCard } from '../../rewards/development/RewardRevealCard';
import { RewardRevealOverlay } from '../../rewards/development/RewardRevealOverlay';
import { RewardSealedCard } from '../../rewards/development/RewardSealedCard';
import { NEUTRAL_REWARD_THEME, rewardTheme } from '../../rewards/development/rewardTheme';

/**
 * The Fate Survival Relic reveal.
 *
 * Reference (kept untouched): `src/components/relics/reference/RelicReveal.tsx`,
 * the production reveal for the retired inventory Relics. This development
 * version keeps its sealed face, rarity ladder, sparks and motes — now shared
 * with Mystery Scrolls through `src/components/rewards/development` — and
 * celebrates a Relic the server already delivered: its DAO XP and Energy.
 * Continuing only closes the reveal; it never awards anything.
 */

const RELIC_ICONS: ReadonlyArray<{ keywords: readonly string[]; Icon: LucideIcon }> = [
  { keywords: ['medallion', 'badge'], Icon: Award },
  { keywords: ['seal', 'signet', 'aegis', 'ward'], Icon: Shield },
  { keywords: ['gourd', 'nectar', 'cauldron', 'potion', 'ember'], Icon: Zap },
  { keywords: ['spindle', 'thread', 'matrix'], Icon: RefreshCw },
  { keywords: ['pen', 'brush', 'scribe', 'quill'], Icon: Save },
  { keywords: ['crown', 'circlet', 'tiara'], Icon: Sliders },
  { keywords: ['compass'], Icon: Compass },
  { keywords: ['mirror', 'orb', 'star'], Icon: Globe },
  { keywords: ['key'], Icon: Key },
];

export function relicIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  return RELIC_ICONS.find(entry => entry.keywords.some(keyword => lower.includes(keyword)))?.Icon ?? Gem;
}

const OUTCOME_LINES: Record<FateSurvivalRelicView['outcome'], string> = {
  'FATE AVERTED': 'Earned by averting fate in a Fate Survival challenge.',
  'FATE SCARRED': 'Earned by surviving a Fate Survival challenge, scarred.',
  'DOOM MANIFESTED': 'Earned in a Fate Survival challenge.',
};

export interface RelicRevealProps {
  relic: FateSurvivalRelicView;
  onClose: () => void;
  /** Open on the revealed card, e.g. when re-viewing a Relic already seen. */
  initiallyRevealed?: boolean;
  /** Workshop tool: change to replay the revealed entrance without closing. */
  replayKey?: number;
}

export function RelicReveal({ relic, onClose, initiallyRevealed = false, replayKey = 0 }: RelicRevealProps) {
  const [revealed, setRevealed] = useState(initiallyRevealed);
  useEffect(() => { if (replayKey > 0) setRevealed(true); }, [replayKey]);
  const grants = relic.delivered.length ? relic.delivered : relic.rewards;
  return (
    <RewardRevealOverlay label={`Relic: ${relic.name}`}
      accent={revealed ? rewardTheme(relic.rarity).hex : NEUTRAL_REWARD_THEME.hex}
      onBackdropClick={revealed ? onClose : undefined} onEscape={onClose}>
      {revealed ? (
        <RewardRevealCard
          kindLabel="Relic"
          name={relic.name}
          description={relic.description}
          rarity={relic.rarity}
          grants={grants}
          icon={relicIcon(relic.name)}
          acknowledgeLabel="Continue"
          onAcknowledge={onClose}
          replayKey={replayKey}
          footnote={OUTCOME_LINES[relic.outcome]}
        />
      ) : (
        <RewardSealedCard label="Sealed Relic" line="A relic stirs within the seal." onReveal={() => setRevealed(true)} />
      )}
    </RewardRevealOverlay>
  );
}

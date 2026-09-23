import React from 'react';
import { orderRewardGrants, REWARD_CURRENCY_LABELS, type RewardGrant } from '../../../library/rewards/contracts';

const formatWhole = (value: number) => value.toLocaleString('en-US');

/**
 * A reward bundle as compact chips: "+25 DAO XP", "+100 QI", "+50 Energy".
 * Presentation only; the amounts are whatever the server returned.
 */
export function RewardGrants({ grants, className = '', tone = 'default' }: {
  grants: readonly RewardGrant[];
  className?: string;
  tone?: 'default' | 'muted';
}) {
  if (!grants.length) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Rewards" data-reward-grants>
      {orderRewardGrants(grants).map(grant => (
        <li key={grant.type} data-reward-grant={grant.type}
          className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${tone === 'muted'
            ? 'border-white/10 text-neutral-400'
            : grant.type === 'dao-xp' ? 'border-sky-300/35 text-sky-200'
              : grant.type === 'qi' ? 'border-amber-300/35 text-amber-100'
                : 'border-violet-300/35 text-violet-200'}`}>
          +{formatWhole(grant.amount)} {REWARD_CURRENCY_LABELS[grant.type]}
        </li>
      ))}
    </ul>
  );
}

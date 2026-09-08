import React from 'react';
import { Flame, Sparkles, Zap } from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { SEIProgressBar } from '@seihouse/ui';
import type { UserProfile as UserProfileType } from '../shared/types';

interface UserProfileDaoPillarPanelProps {
  profile: UserProfileType | null;
  currentStreak: number;
  isCracked: boolean;
  daysTo3: number;
  daysTo10: number;
  handleRepairPillar: () => Promise<void> | void;
  handleCheckIn: () => Promise<void> | void;
}

/**
 * Dao Pillar destination: the daily refinement streak. The streak, cracked
 * state, repair cost, milestone countdowns, and check-in rules all come from
 * the controller unchanged; this surface only presents them.
 */
export function UserProfileDaoPillarPanel({
  profile,
  currentStreak,
  isCracked,
  daysTo3,
  daysTo10,
  handleRepairPillar,
  handleCheckIn,
}: UserProfileDaoPillarPanelProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = profile?.lastReadDate === todayStr;
  const towardTen = currentStreak === 0 ? 0 : currentStreak % 10 === 0 ? 10 : currentStreak % 10;

  return (
    <div className="space-y-4">
      <LibraryPanel
        as="section"
        aria-labelledby="cave-dao-pillar-streak"
        padding="md"
        className={`relative overflow-hidden ${isCracked ? '!border-[#ff3333]/40' : '!border-orange-400/25'}`}
        data-cracked={isCracked ? 'true' : undefined}
      >
        {isCracked ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PGxpbmUgeDE9IjAiIHkxPSIwIiB4Mj0iODAiIHkyPSI4MCIgc3Ryb2tlPSIjZmY0NDQ0MjAiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')]"
          />
        ) : null}

        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className={`flex h-16 w-11 items-center justify-center rounded-md border font-serif text-2xl ${
                isCracked
                  ? 'border-[#ff3333]/40 bg-[#ff3333]/10 text-[#ff3333]'
                  : 'border-[#04ACFF]/40 bg-[#04ACFF]/10 text-[#7dd3ff] shadow-[0_0_24px_rgba(4,172,255,0.25)]'
              }`}
            >
              道
            </div>
            <div>
              <p
                className={`font-sc text-[10px] font-bold uppercase tracking-widest ${
                  isCracked ? 'text-[#ff3333]' : 'text-neutral-400'
                }`}
              >
                {isCracked ? 'Dao Pillar Cracked' : 'Daily Dao Pillar'}
              </p>
              <p
                id="cave-dao-pillar-streak"
                className={`font-sans text-3xl font-black tracking-wide ${
                  isCracked ? 'text-[#ff3333]/60 line-through' : 'text-orange-400'
                }`}
              >
                {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
              </p>
              {profile?.lastReadDate ? (
                <p className="mt-1 font-mono text-[10px] text-neutral-500">
                  Last refined <span className="text-neutral-300">{profile.lastReadDate}</span>
                </p>
              ) : (
                <p className="mt-1 font-mono text-[10px] italic text-neutral-500">
                  Refine once to establish your pillar.
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            {isCracked ? (
              <LibraryButton variant="danger" icon={Zap} onClick={() => void handleRepairPillar()}>
                Repair Pillar (50 Qi)
              </LibraryButton>
            ) : hasCheckedInToday ? (
              <div
                role="status"
                className="flex items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 font-sc text-[11px] uppercase tracking-wider text-green-400"
              >
                <Sparkles size={12} aria-hidden="true" />
                Refinement complete today (+5 Qi)
              </div>
            ) : (
              <LibraryButton variant="primary" icon={Flame} onClick={() => void handleCheckIn()}>
                Refine Daily Dao
              </LibraryButton>
            )}
          </div>
        </div>
      </LibraryPanel>

      {!isCracked ? (
        <LibraryPanel as="section" aria-label="Streak milestones" padding="md" className="space-y-4">
          <SEIProgressBar
            size="sm"
            tone="warning"
            value={(towardTen / 10) * 100}
            label="Toward the ten-day pillar"
            valueText={`${towardTen} of 10 days`}
          />
          <div className="flex flex-wrap gap-2">
            <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 font-sc text-[10px] uppercase tracking-wider text-orange-300">
              {daysTo3} {daysTo3 === 1 ? 'day' : 'days'} to +20 Qi
            </span>
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-sc text-[10px] uppercase tracking-wider text-amber-300">
              {daysTo10} {daysTo10 === 1 ? 'day' : 'days'} to +100 Qi
            </span>
          </div>
          <p className="font-serif text-xs leading-relaxed text-neutral-400">
            Each daily refinement adds 5 Heavenly Qi. Every third day adds 20 more, every tenth day 100
            more. Miss a day after a seven-day pillar and it cracks; repairing it costs 50 Qi.
          </p>
        </LibraryPanel>
      ) : (
        <LibraryPanel as="section" aria-label="Cracked pillar guidance" variant="callout" padding="md">
          <p className="font-serif text-xs leading-relaxed text-neutral-300">
            A cracked pillar cannot be refined. Repair it for 50 Heavenly Qi to resume the streak from
            where it broke.
          </p>
        </LibraryPanel>
      )}
    </div>
  );
}

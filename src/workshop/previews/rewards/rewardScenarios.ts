/**
 * Workshop-only account seeding for the in-process development economy.
 *
 * A scenario describes what an account already did — DAO XP carried over,
 * chapters read, Fate Survival outcomes, Familiars bought and bonded — and
 * `seedWorkshopAccount` replays it through the same services the HTTP routes
 * use. Nothing here decides a reward: every scroll, Relic, credit and unlock
 * comes out of the server code exactly as it would for real activity. Seeding
 * is idempotent, so running it twice changes nothing.
 */
import type { ActiveElementalEffectSelection } from '@seihouse/library/familiar';
import type { FateSurvivalOutcome } from '@seihouse/library/relics';
import type { LibraryActivityKind } from '@seihouse/library/rewards';
import { defaultFamiliar } from '../../../host/familiar/catalogue';
import { buildRewardSchedule, cycleIdFor } from '../../../server/dao-pillar/themes';
import type { DevelopmentEconomy } from '../../../server/economy/developmentRuntime';
import type { LibraryPrincipal } from '../../../server/identity/types';

export interface WorkshopActivity {
  kind: LibraryActivityKind;
  subjectId: string;
  storyId?: string;
}

export interface WorkshopAccountSeed {
  /** DAO XP carried over from the profile record, credited once as the opening balance. */
  openingDaoXp?: number;
  /** Development QI grant, so the account has something to spend. */
  qiGrant?: number;
  /** Dao Pillar days already collected this cycle. */
  daoPillarDays?: readonly number[];
  activities?: readonly WorkshopActivity[];
  /** Achievement keys whose scrolls were already opened. */
  openedScrolls?: readonly string[];
  fateSurvival?: readonly { challengeId: string; outcome: FateSurvivalOutcome; storyId?: string }[];
  /** Familiars bought before (granted through the development operation). */
  ownedFamiliars?: readonly string[];
  /** QI offered to a Familiar's bond, and the form chosen for it. */
  training?: readonly { familiarId: string; qi: number; formId?: string | null }[];
  /** The Active Elemental Effect; unset keeps the default (follow the Active Familiar). */
  activeEffect?: ActiveElementalEffectSelection;
}

export const QUILL = defaultFamiliar.definition.id;

const chapters = (storyId: string, count: number): WorkshopActivity[] =>
  Array.from({ length: count }, (_, index) => ({ kind: 'chapter.read' as const, subjectId: `${storyId}:${index + 1}`, storyId }));

/** A long-time cultivator: a Leader with scrolls to open, a Relic, and Quill at Rare bond. */
export const DEVELOPED_CULTIVATOR_SEED: WorkshopAccountSeed = {
  qiGrant: 2_150,
  daoPillarDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  activities: [
    ...chapters('story-ashes', 10),
    { kind: 'codex.entry-opened', subjectId: 'codex:ninefold-ash', storyId: 'story-ashes' },
    { kind: 'codex.entry-opened', subjectId: 'codex:ninth-heaven', storyId: 'story-ashes' },
    { kind: 'story.created', subjectId: 'story-ashes', storyId: 'story-ashes' },
  ],
  openedScrolls: ['reading.first-chapter'],
  fateSurvival: [{ challengeId: 'ashes-trial-1', outcome: 'FATE AVERTED', storyId: 'story-ashes' }],
  ownedFamiliars: ['phoenix'],
  training: [{ familiarId: QUILL, qi: 1_000 }],
};

const principalFor = (uid: string): LibraryPrincipal => ({ uid, role: 'user', identity: 'development', developmentAccess: true });

/** Replays a scenario through the economy's services. Safe to run more than once. */
export async function seedWorkshopAccount(economy: DevelopmentEconomy, uid: string, seed: WorkshopAccountSeed): Promise<void> {
  const principal = principalFor(uid);
  if (seed.openingDaoXp && seed.openingDaoXp > 0) {
    await economy.daoXp.credit({
      uid, amount: seed.openingDaoXp, source: 'opening-balance', idempotencyKey: `opening-balance:${uid}`,
      description: 'Opening DAO XP carried over from the profile record',
    });
  }
  if (seed.qiGrant) {
    await economy.qi.deposit({
      uid, amount: seed.qiGrant, source: 'development-grant', idempotencyKey: 'development-grant:workshop-seed',
      description: 'Development test grant', metadata: { source: 'development-grant' },
    });
  }
  if (seed.daoPillarDays?.length) {
    const theme = economy.dao.activeTheme;
    const schedule = buildRewardSchedule(theme);
    for (const day of seed.daoPillarDays) {
      const entry = schedule[day - 1];
      if (!entry) continue;
      await economy.daoPillarRepository.claimDay({
        uid, themeId: theme.id, cycleId: cycleIdFor(theme), dayNumber: day,
        scheduledDate: entry.scheduledDate, rewards: entry.rewards, description: `${theme.name} · Day ${day}`,
      });
    }
  }
  for (const activity of seed.activities ?? []) await economy.achievements.recordActivity(uid, activity);
  if (seed.openedScrolls?.length) {
    const snapshot = await economy.achievements.getSnapshot(principal);
    for (const key of seed.openedScrolls) {
      const scroll = snapshot.scrolls.find(entry => entry.achievementKey === key);
      if (scroll) await economy.achievements.openScroll(principal, scroll.id);
    }
  }
  for (const outcome of seed.fateSurvival ?? []) await economy.relics.recordFateSurvivalOutcome(uid, outcome);
  for (const familiarId of seed.ownedFamiliars ?? []) await economy.familiars.grantFamiliarDevelopment(principal, familiarId);
  for (const plan of seed.training ?? []) {
    if (plan.qi > 0) await economy.familiars.offerQi(principal, { familiarId: plan.familiarId, amount: plan.qi, idempotencyKey: `workshop-seed:${plan.familiarId}` });
    if (plan.formId !== undefined) await economy.familiars.selectForm(principal, { familiarId: plan.familiarId, formId: plan.formId });
  }
  if (seed.activeEffect) await economy.familiars.selectElementalEffect(principal, seed.activeEffect);
}

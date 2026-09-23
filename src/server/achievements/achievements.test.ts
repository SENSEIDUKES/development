import { describe, expect, it } from 'vitest';
import { getDaoRankData } from '@seihouse/library/cultivation';
import { InMemoryDaoXpLedger } from '../dao-xp/inMemoryDaoXpLedger';
import { InMemoryEnergyRepository } from '../energy/inMemoryEnergyRepository';
import { createPrincipalResolver, developmentIdentityToken } from '../identity/authentication';
import { InMemoryQiLedger } from '../qi/inMemoryQiLedger';
import { RewardDeliverer, RewardPolicyError, assertRewardGrants } from '../rewards/deliverer';
import { AchievementCatalogError, LIBRARY_ACHIEVEMENTS, validateAchievementCatalog, type AchievementDefinition } from './catalog';
import { DEFAULT_ACHIEVEMENTS_CONFIG, type AchievementsConfig } from './config';
import { createDefaultEvaluatorRegistry } from './evaluators';
import { handleAchievementsHttp } from './http';
import { InMemoryAchievementRepository } from './inMemoryAchievementRepository';
import { AchievementService } from './service';

const uid = 'reader-1';

function setup(config: Partial<AchievementsConfig> = {}) {
  const daoXp = new InMemoryDaoXpLedger();
  const qi = new InMemoryQiLedger();
  const energy = new InMemoryEnergyRepository();
  const repository = new InMemoryAchievementRepository();
  let tick = 0;
  const service = new AchievementService({
    repository, daoXp, deliverer: new RewardDeliverer({ daoXp, qi, energy }),
    config: { ...DEFAULT_ACHIEVEMENTS_CONFIG, ...config },
    now: () => new Date(Date.UTC(2026, 8, 23, 12, 0, tick++)),
  });
  const read = async (story: string, chapter: number) => service.recordActivity(uid, { kind: 'chapter.read', subjectId: `${story}:${chapter}`, storyId: story });
  const view = async (key: string) => (await service.getSnapshot({ uid })).achievements.find(achievement => achievement.key === key)!;
  return { service, daoXp, qi, energy, repository, read, view };
}

describe('Achievements and Mystery Scrolls', () => {
  it('earns an achievement once from natural reading and seals a concealed scroll', async () => {
    const { service, read, daoXp, qi } = setup();
    const first = await read('story-1', 1);
    expect(first.recorded).toBe(true);
    expect(first.earned.map(scroll => scroll.achievementKey)).toEqual(['reading.first-chapter']);
    const [scroll] = first.earned;
    expect(scroll).toMatchObject({ status: 'sealed', presentation: 'concealed', rarity: null, rewards: null, delivered: null });

    const reread = await read('story-1', 1);
    expect(reread).toMatchObject({ recorded: false, earned: [] });
    await read('story-1', 2);
    expect((await service.getSnapshot({ uid })).scrolls).toHaveLength(1);
    // Sealed under on-open delivery: nothing has reached the ledgers yet.
    expect(await daoXp.getAccount(uid)).toBeNull();
    expect(await qi.getAccount(uid)).toBeNull();
  });

  it('opens a scroll exactly once and delivers its DAO XP and QI', async () => {
    const { service, read, daoXp, qi } = setup();
    const { earned: [scroll] } = await read('story-1', 1);
    const opened = await service.openScroll({ uid }, scroll.id);
    expect(opened.outcome).toBe('opened');
    expect(opened.scroll).toMatchObject({ status: 'opened', rarity: 'Common', rewards: [{ type: 'dao-xp', amount: 25 }, { type: 'qi', amount: 100 }] });
    expect(opened.scroll.delivered?.map(({ type, amount }) => ({ type, amount }))).toEqual([{ type: 'dao-xp', amount: 25 }, { type: 'qi', amount: 100 }]);
    const again = await service.openScroll({ uid }, scroll.id);
    expect(again.outcome).toBe('already-opened');
    expect((await daoXp.getAccount(uid))?.balance).toBe(25);
    expect((await qi.getAccount(uid))?.balance).toBe(100);
    expect((await daoXp.listTransactions(uid, 10)).map(line => line.source)).toEqual(['achievement']);
    expect((await qi.listTransactions(uid, 10)).map(line => line.source)).toEqual(['mystery-scroll']);
  });

  it('shows a curated milestone’s reward upfront, before and after it is earned', async () => {
    const { service, view } = setup();
    expect(await view('creation.first-story')).toMatchObject({
      status: 'locked', presentation: 'curated', rarity: 'Legendary',
      curatedRewards: [{ type: 'dao-xp', amount: 300 }, { type: 'qi', amount: 1_000 }],
    });
    const created = await service.recordActivity(uid, { kind: 'story.created', subjectId: 'story-7', storyId: 'story-7' });
    const scroll = created.earned.find(entry => entry.achievementKey === 'creation.first-story')!;
    expect(scroll).toMatchObject({ status: 'sealed', rarity: 'Legendary', rewards: [{ type: 'dao-xp', amount: 300 }, { type: 'qi', amount: 1_000 }] });
    expect((await view('reading.first-chapter')).curatedRewards).toBeNull();
  });

  it('credits creation DAO XP directly, once per activity, and honours an optional daily cap', async () => {
    const uncapped = setup();
    const story = await uncapped.service.recordActivity(uid, { kind: 'story.created', subjectId: 'story-7', storyId: 'story-7' });
    expect(story.creationDaoXp).toBe(50);
    await uncapped.service.recordActivity(uid, { kind: 'story.created', subjectId: 'story-7', storyId: 'story-7' });
    expect((await uncapped.daoXp.getAccount(uid))?.balance).toBe(50);
    expect((await uncapped.daoXp.listTransactions(uid, 10)).map(line => line.source)).toEqual(['creation']);

    const capped = setup({ creationDailyCap: 25 });
    const chapters = [];
    for (const chapter of [1, 2, 3]) chapters.push((await capped.service.recordActivity(uid, { kind: 'chapter.created', subjectId: `story-7:${chapter}`, storyId: 'story-7' })).creationDaoXp);
    expect(chapters).toEqual([10, 10, 5]);
    expect((await capped.daoXp.getAccount(uid))?.balance).toBe(25);
  });

  it('finishes an interrupted activity when it is repeated, crediting and minting exactly once', async () => {
    const { service, daoXp } = setup();
    const credit = daoXp.credit.bind(daoXp);
    let failures = 1;
    daoXp.credit = async command => {
      if (failures > 0) { failures -= 1; throw new Error('The DAO XP ledger is unavailable.'); }
      return credit(command);
    };
    const created = { kind: 'story.created' as const, subjectId: 'story-9', storyId: 'story-9' };
    await expect(service.recordActivity(uid, created)).rejects.toThrow('unavailable');

    const retry = await service.recordActivity(uid, created);
    expect(retry.recorded).toBe(false);
    expect(retry.creationDaoXp).toBe(50);
    expect(retry.earned.map(scroll => scroll.achievementKey)).toEqual(['creation.first-story']);

    const again = await service.recordActivity(uid, created);
    expect(again).toMatchObject({ recorded: false, creationDaoXp: 0, earned: [] });
    expect((await daoXp.getAccount(uid))?.balance).toBe(50);
    expect((await service.getSnapshot({ uid })).scrolls).toHaveLength(1);
  });

  it('keys the creation credit by the activity record, so any valid subject can credit', async () => {
    const { service, daoXp } = setup();
    const subjectId = `story-${'x'.repeat(190)}`;
    expect(subjectId.length).toBeLessThanOrEqual(200);
    const created = await service.recordActivity(uid, { kind: 'story.created', subjectId });
    expect(created.creationDaoXp).toBe(50);
    const [line] = await daoXp.listTransactions(uid, 5);
    expect(line.idempotencyKey).toMatch(/^creation:.+:dao-xp$/);
    expect(line.idempotencyKey).not.toContain(subjectId);
    expect(line.idempotencyKey.length).toBeLessThan(100);
    await expect(service.recordActivity(uid, { kind: 'chapter.read', subjectId: 'story-1:1', idempotencyKey: 'k'.repeat(221) }))
      .rejects.toThrow('idempotencyKey must be 1–220 characters.');
  });

  it('applies one account’s simultaneous creation activities one at a time, within the daily cap', async () => {
    const { service, daoXp } = setup({ creationDailyCap: 10 });
    const results = await Promise.all([1, 2, 3].map(chapter =>
      service.recordActivity(uid, { kind: 'chapter.created', subjectId: `story-3:${chapter}`, storyId: 'story-3' })));
    expect(results.map(result => result.creationDaoXp)).toEqual([10, 0, 0]);
    expect((await daoXp.getAccount(uid))?.balance).toBe(10);
  });

  it('keeps hidden goals redacted until earned and never evaluates planned media goals', async () => {
    const { service, view } = setup();
    expect(await view('exploration.hidden-archivist')).toMatchObject({ hidden: true, name: 'Hidden achievement', progress: null, rarity: null });
    for (const world of ['world-a', 'world-b']) await service.recordActivity(uid, { kind: 'world.visited', subjectId: world, storyId: world });
    expect(await view('exploration.hidden-archivist')).toMatchObject({ hidden: true, status: 'in-progress', progress: null });
    const third = await service.recordActivity(uid, { kind: 'world.visited', subjectId: 'world-c', storyId: 'world-c' });
    expect(third.earned[0]).toMatchObject({ achievementKey: 'exploration.hidden-archivist', rarity: null });
    expect(await view('exploration.hidden-archivist')).toMatchObject({ hidden: false, name: 'The Hidden Archivist', status: 'earned' });

    await service.recordActivity(uid, { kind: 'media.experienced', subjectId: 'soundscape-1' });
    expect(await view('media.first-resonance')).toMatchObject({ status: 'planned', progress: null, scrollId: null });
  });

  it('counts distinct stories when a goal asks for different worlds', async () => {
    const { read, view } = setup();
    await read('story-1', 1);
    await read('story-1', 2);
    await read('story-2', 1);
    expect((await view('reading.three-worlds')).progress).toEqual({ current: 2, target: 3, unit: 'stories' });
    await read('story-3', 4);
    expect((await view('reading.three-worlds')).status).toBe('earned');
  });

  it('delivers at earn time when configured, and opening then only reveals', async () => {
    const { service, read, daoXp, qi } = setup({ delivery: 'on-earn' });
    const { earned: [scroll], snapshot } = await read('story-1', 1);
    expect(snapshot.delivery).toBe('on-earn');
    expect(scroll.delivered).toBeNull();
    expect((await daoXp.getAccount(uid))?.balance).toBe(25);
    const opened = await service.openScroll({ uid }, scroll.id);
    expect(opened.scroll.delivered).toHaveLength(2);
    expect((await daoXp.getAccount(uid))?.balance).toBe(25);
    expect((await qi.getAccount(uid))?.balance).toBe(100);
  });

  it('moves rank only through DAO XP, which only achievements, creation and relics credit', async () => {
    const { service, read, daoXp } = setup();
    await read('story-1', 1);
    for (const scroll of (await service.getSnapshot({ uid })).scrolls) await service.openScroll({ uid }, scroll.id);
    await service.recordActivity(uid, { kind: 'story.created', subjectId: 'story-9', storyId: 'story-9' });
    const created = (await service.getSnapshot({ uid })).scrolls.find(scroll => scroll.achievementKey === 'creation.first-story')!;
    await service.openScroll({ uid }, created.id);
    const balance = (await daoXp.getAccount(uid))!.balance;
    expect(balance).toBe(25 + 50 + 300);
    expect(getDaoRankData(balance).rank).toBe('Scribe');
  });

  it('refuses rewards a source may not grant, before anything moves', () => {
    expect(() => assertRewardGrants('mystery-scroll', [{ type: 'energy', amount: 5 }])).toThrow(RewardPolicyError);
    expect(() => assertRewardGrants('fate-survival-relic', [{ type: 'qi', amount: 5 }])).toThrow(RewardPolicyError);
    expect(() => assertRewardGrants('creation', [{ type: 'qi', amount: 5 }])).toThrow(RewardPolicyError);
    expect(() => assertRewardGrants('mystery-scroll', [{ type: 'dao-xp', amount: 5 }, { type: 'dao-xp', amount: 5 }])).toThrow(RewardPolicyError);
    const energyScroll: AchievementDefinition = { ...LIBRARY_ACHIEVEMENTS[0], key: 'bad.energy', rewards: [{ type: 'energy', amount: 10 }] };
    expect(() => validateAchievementCatalog([energyScroll], createDefaultEvaluatorRegistry())).toThrow(AchievementCatalogError);
  });
});

describe('Achievements HTTP boundary', () => {
  const resolvePrincipal = createPrincipalResolver({ mode: 'development' });
  const headers = { authorization: `Bearer ${developmentIdentityToken(uid)}` };

  it('simulates activity for development principals and opens scrolls by id', async () => {
    const { service } = setup();
    const recorded = await handleAchievementsHttp({ method: 'POST', headers, body: { operation: 'development.record-activity', kind: 'codex.entry-opened', subjectId: 'entity-1' } }, { service, resolvePrincipal });
    expect(recorded.status).toBe(200);
    const snapshot = await handleAchievementsHttp({ method: 'GET', headers }, { service, resolvePrincipal });
    expect(snapshot.body).toMatchObject({ uid, scrolls: [] });
    const missing = await handleAchievementsHttp({ method: 'POST', headers, body: { operation: 'open-scroll', scrollId: 'nope' } }, { service, resolvePrincipal });
    expect(missing.status).toBe(404);
  });

  it('refuses simulated activity to production principals', async () => {
    const { service } = setup();
    const production = createPrincipalResolver({ mode: 'production', verifyIdToken: async () => ({ uid }) });
    const refused = await handleAchievementsHttp({ method: 'POST', headers: { authorization: 'Bearer real-token' }, body: { operation: 'development.record-activity', kind: 'chapter.read', subjectId: 'story-1:1' } }, { service, resolvePrincipal: production });
    expect(refused.status).toBe(403);
    expect((await service.getSnapshot({ uid })).scrolls).toHaveLength(0);
  });
});

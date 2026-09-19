import { describe, expect, it } from 'vitest';
import { RelicsAccountService } from './accountService';
import { InMemoryRelicRepository } from './inMemoryRelicRepository';

describe('Relics account boundary', () => {
  it('uses v3 earning truth, redacts hidden rules and never exposes another account', async () => {
    const repository = new InMemoryRelicRepository();
    const principal = { uid: 'a', role: 'user', identity: 'development', developmentAccess: true } as const;
    const service = new RelicsAccountService(repository, principal);
    const template = await repository.createTemplate({ key: 'archive', status: 'active', name: 'Archive seal', description: 'Read the archive.', rarity: 'Rare', condition: { evaluatorKey: 'trusted.chapters', evaluatorVersion: 1, hidden: true, parameters: { secret: 'condition' } }, rewards: { qi: 75, cosmetics: [] } });
    const assignment = await repository.assignToStory({ ownerId: 'a', storyId: 'story', templateId: template.id });
    const before = await service.getSnapshot('story');
    expect(before.earned).toEqual([]);
    expect(before.assignments[0].condition).toEqual({ hidden: true });
    expect(JSON.stringify(before)).not.toContain('secret');
    await repository.applyEvaluation({ ownerId: 'a', storyId: 'story', assignmentId: assignment.id, progress: { current: 1, target: 1, metadata: {} }, evaluatedAt: '2026-09-18T00:00:00Z', completionEvidence: [{ schemaVersion: 3, evaluatorKey: 'trusted.chapters', evaluatorVersion: 1, sourceType: 'server', sourceId: 'event', observedAt: '2026-09-18T00:00:00Z', facts: { sensitiveEvidence: true } }] });
    const snapshot = await service.getSnapshot('story');
    expect(snapshot.earned).toMatchObject([{ name: 'Archive seal', rewardValueQi: 75, sourceStoryId: 'story' }]);
    expect(JSON.stringify(snapshot)).not.toContain('sensitiveEvidence');
    expect(await new RelicsAccountService(repository, { ...principal, uid: 'b' }).getSnapshot('story')).toEqual({ earned: [], assignments: [] });
    expect('evaluate' in service).toBe(false);
    expect('claim' in service).toBe(false);
  });
});

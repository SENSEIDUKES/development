import { MAX_RELIC_QI_REWARD, type RelicsClient } from '@seihouse/library/relics';
import { InMemoryRelicRepository } from '../../../server/relics/inMemoryRelicRepository';
import { RelicsAccountService } from '../../../server/relics/accountService';
import { mockRelics } from './mockData';

/** Explicit Workshop simulation of trusted earning, using the real v3 repository. */
export function createLocalRelicsClient(): RelicsClient {
  const repository = new InMemoryRelicRepository();
  const uid = 'workshop-relic-account';
  const service = new RelicsAccountService(repository, { uid, role: 'user', identity: 'development', developmentAccess: true });
  const ready = (async () => {
    for (const item of mockRelics) {
      const template = await repository.createTemplate({
        key: item.id, status: 'active', name: item.name, description: item.description, rarity: item.rarity,
        condition: { evaluatorKey: 'workshop.fixture', evaluatorVersion: 1, hidden: false, parameters: {} },
        rewards: { qi: Math.min(item.rewardValueQi ?? 0, MAX_RELIC_QI_REWARD), cosmetics: [] },
      });
      const assignment = await repository.assignToStory({ ownerId: uid, storyId: 'workshop-relic-story', templateId: template.id });
      await repository.applyEvaluation({
        ownerId: uid, storyId: assignment.storyId, assignmentId: assignment.id,
        progress: { current: 1, target: 1, metadata: {} }, evaluatedAt: item.unlockedAt,
        completionEvidence: [{ schemaVersion: 3, evaluatorKey: 'workshop.fixture', evaluatorVersion: 1, sourceType: 'fixture', sourceId: item.id, observedAt: item.unlockedAt, facts: {} }],
      });
    }
  })();
  return { async getSnapshot(storyId) { await ready; return service.getSnapshot(storyId); } };
}

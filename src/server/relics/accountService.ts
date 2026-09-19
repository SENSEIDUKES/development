import { discloseRelicCondition, projectEarnedRelic, cloneJson, type RelicsClient, type RelicsSnapshot } from '@seihouse/library/relics';
import type { LibraryPrincipal } from '../identity/types';
import type { RelicRepository } from './repository';

/** Server-only account projection over the existing v3 repository. */
export class RelicsAccountService implements RelicsClient {
  constructor(private readonly repository: RelicRepository, private readonly principal: LibraryPrincipal) {}
  async getSnapshot(storyId?: string): Promise<RelicsSnapshot> {
    if (!this.principal.uid.trim()) throw new Error('Verified identity is required.');
    const earned = await this.repository.listEarnedRelics(this.principal.uid, storyId);
    const assignments = storyId ? await this.repository.listStoryAssignments(this.principal.uid, storyId) : [];
    return {
      earned: earned.map(record => projectEarnedRelic(record)),
      assignments: assignments.map(record => ({
        id: record.id, storyId: record.storyId, status: record.status,
        name: record.achievement.name, description: record.achievement.description,
        condition: discloseRelicCondition(record.achievement.condition, earned.some(item => item.assignmentId === record.id)),
        rewards: cloneJson(record.achievement.rewards),
        progress: { current: record.progress.current, target: record.progress.target, unit: record.progress.unit },
      })),
    };
  }
}

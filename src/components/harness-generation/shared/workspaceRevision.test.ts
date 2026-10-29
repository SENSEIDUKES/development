import { describe, expect, it } from 'vitest';
import {
  createEmptyHarnessWorkspaceState,
  HARNESS_WORKSPACE_CONFLICT_MESSAGE,
  HarnessWorkspaceConflictError,
  nextHarnessWorkspaceRevision,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';

/**
 * Every save is a compare-and-set on the workspace's revision: it lands only
 * while the stored workspace is still the one it was read from, so a tab that
 * read an older one cannot overwrite what another tab saved since.
 */
describe('the workspace revision', () => {
  it('saves a workspace read at the stored revision as the next one', () => {
    const stored = { ...createEmptyHarnessWorkspaceState(), revision: 4 };
    const next = { ...stored, stories: [{ id: 'story-1' }] } as never;
    expect(nextHarnessWorkspaceRevision(stored, next)).toMatchObject({ revision: 5, stories: [{ id: 'story-1' }] });
    // The first save of a browser that holds nothing yet is read at 0.
    expect(nextHarnessWorkspaceRevision(undefined, createEmptyHarnessWorkspaceState()).revision).toBe(1);
  });

  it('refuses a workspace read at any other revision, or over storage it cannot read', () => {
    const stored = { ...createEmptyHarnessWorkspaceState(), revision: 4 };
    for (const revision of [3, 5, 0]) {
      expect(() => nextHarnessWorkspaceRevision(stored, { ...stored, revision })).toThrow(HarnessWorkspaceConflictError);
    }
    expect(() => nextHarnessWorkspaceRevision({ stories: 'broken' }, createEmptyHarnessWorkspaceState())).toThrow(HARNESS_WORKSPACE_CONFLICT_MESSAGE);
  });

  it('refuses the save of the tab that read the workspace before the other tab saved it, and keeps what that tab saved', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const first = await repository.load();
    const second = await repository.load();

    await repository.save({ ...first, stories: [{ id: 'first-tab' }] as never });
    await expect(repository.save({ ...second, stories: [{ id: 'second-tab' }] as never })).rejects.toThrow(HarnessWorkspaceConflictError);
    expect(repository.snapshot()).toMatchObject({ revision: 1, stories: [{ id: 'first-tab' }] });

    // Read again, the second tab saves on top of it.
    const reread = await repository.load();
    await repository.save({ ...reread, stories: [...reread.stories, { id: 'second-tab' }] as never });
    expect(repository.snapshot()).toMatchObject({ revision: 2, stories: [{ id: 'first-tab' }, { id: 'second-tab' }] });
  });
});

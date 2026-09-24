import { describe, expect, it } from 'vitest';
import { createEmptyHarnessWorkspaceState, HARNESS_GENERATION_SCHEMA_VERSION } from '@seihouse/sen/harness-generation';
import { planHarnessWorkspaceLoad, PRESERVED_WORKSPACE_PREFIX } from './indexedDbRepository';

const now = () => '2026-09-24T12:00:00.000Z';

describe('planHarnessWorkspaceLoad', () => {
  it('starts empty with nothing to preserve when no workspace was saved', () => {
    expect(planHarnessWorkspaceLoad(undefined, now)).toEqual({ state: createEmptyHarnessWorkspaceState() });
  });

  it('reads a current workspace without preserving or resetting it', () => {
    const stored = { ...createEmptyHarnessWorkspaceState(), stories: [{ id: 'story-1' }] };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.preserve).toBeUndefined();
    expect(plan.state.stories).toEqual([{ id: 'story-1' }]);
  });

  it('keeps an untouched copy of an older-schema workspace before resetting', () => {
    const stored = { schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION - 1, stories: [{ id: 'a' }, { id: 'b' }], chapters: [{ id: 'c1' }] };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.state).toEqual(createEmptyHarnessWorkspaceState());
    expect(plan.preserve).toEqual({
      key: `${PRESERVED_WORKSPACE_PREFIX}v${HARNESS_GENERATION_SCHEMA_VERSION - 1}:2026-09-24T12:00:00.000Z`,
      record: { preservedAt: now(), reason: 'schema-version', schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION - 1, workspace: stored },
    });
    expect(plan.preserve!.record.workspace).toBe(stored);
  });

  it('preserves a current-version workspace whose shape cannot be read', () => {
    const stored = { schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION, stories: 'broken' };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.preserve?.record.reason).toBe('unreadable');
    expect(plan.preserve?.record.workspace).toBe(stored);
  });
});

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

  it('keeps an untouched copy of a test-era workspace (nothing before schema 27, arcs of 30 chapters, upgrades) before starting fresh', () => {
    for (const schemaVersion of [26, 21]) {
      const stored = { ...createEmptyHarnessWorkspaceState(), schemaVersion, stories: [{ id: 'a' }, { id: 'b' }], chapters: [{ id: 'c1' }] };
      const plan = planHarnessWorkspaceLoad(stored, now);
      expect(plan.state).toEqual(createEmptyHarnessWorkspaceState());
      expect(plan.preserve).toEqual({
        key: `${PRESERVED_WORKSPACE_PREFIX}v${schemaVersion}:2026-09-24T12:00:00.000Z`,
        record: { preservedAt: now(), reason: 'schema-version', schemaVersion, workspace: stored },
      });
      expect(plan.preserve!.record.workspace).toBe(stored);
    }
  });

  it('upgrades a schema 27, 28 or 29 workspace with every story and chapter kept, keeping a copy of the original', () => {
    // 28 adds only optional fields: the rewrite request and its replaced-by record, and the Holdings fixer record.
    // 29 adds only optional fields too: a chapter's scene, the atmospheres in frozen media, a frozen soundtrack vocabulary.
    // 30 adds only an optional story field: Author's notes.
    expect(HARNESS_GENERATION_SCHEMA_VERSION).toBe(30);
    for (const schemaVersion of [27, 28, 29]) {
      const stored = { ...createEmptyHarnessWorkspaceState(), schemaVersion, stories: [{ id: 'a' }], chapters: [{ id: 'c1' }] };
      const plan = planHarnessWorkspaceLoad(stored, now);
      expect(plan.state).toEqual({ ...stored, schemaVersion: 30 });
      expect(plan.preserve).toEqual({
        key: `${PRESERVED_WORKSPACE_PREFIX}v${schemaVersion}:2026-09-24T12:00:00.000Z`,
        record: { preservedAt: now(), reason: 'migrated', schemaVersion, workspace: stored },
      });
    }
  });

  it('preserves a current-version workspace whose shape cannot be read', () => {
    const stored = { schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION, stories: 'broken' };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.preserve?.record.reason).toBe('unreadable');
    expect(plan.preserve?.record.workspace).toBe(stored);
  });
});

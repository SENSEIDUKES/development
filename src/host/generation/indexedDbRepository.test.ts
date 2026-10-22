import { describe, expect, it } from 'vitest';
import { createEmptyHarnessWorkspaceState, HARNESS_GENERATION_SCHEMA_VERSION } from '@seihouse/sen/harness-generation';
import { harnessGenerationIndexedDbVersion, planHarnessWorkspaceLoad, PRESERVED_WORKSPACE_PREFIX } from './indexedDbRepository';

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

  it('upgrades a schema 27, 28, 29, 30 or 31 workspace with every story and chapter kept, keeping a copy of the original', () => {
    // 28 adds only optional fields: the rewrite request and its replaced-by record, and the Holdings fixer record.
    // 29 adds only optional fields too: a chapter's scene, the atmospheres in frozen media, a frozen soundtrack vocabulary.
    // 30 adds only an optional story field: Author's notes.
    // 31 adds only an optional story field: the story's own sound words. Saved cues and frozen attempts are untouched.
    // 32 adds only optional chapter fields: its appearances and the looks written down from them.
    expect(HARNESS_GENERATION_SCHEMA_VERSION).toBe(32);
    for (const schemaVersion of [27, 28, 29, 30, 31]) {
      const stored = { ...createEmptyHarnessWorkspaceState(), schemaVersion, stories: [{ id: 'a' }], attempts: [{ id: 'a1', capaPrompt: { soundVocabulary: [{ word: 'blade drawn', example: 'drew his sword' }] } }], chapters: [{ id: 'c1', soundCues: [{ id: 'sc1' }] }] };
      const plan = planHarnessWorkspaceLoad(stored, now);
      expect(plan.state).toEqual({ ...stored, schemaVersion: 32 });
      expect(plan.preserve).toEqual({
        key: `${PRESERVED_WORKSPACE_PREFIX}v${schemaVersion}:2026-09-24T12:00:00.000Z`,
        record: { preservedAt: now(), reason: 'migrated', schemaVersion, workspace: stored },
      });
    }
  });

  it('keeps an untouched copy of a workspace the rolled-back chapter loop saved (schema 33) before starting fresh', () => {
    const stored = { ...createEmptyHarnessWorkspaceState(), schemaVersion: 33, stories: [{ id: 'a' }], chapters: [{ id: 'c1' }] };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.state).toEqual(createEmptyHarnessWorkspaceState());
    expect(plan.preserve).toEqual({
      key: `${PRESERVED_WORKSPACE_PREFIX}v33:2026-09-24T12:00:00.000Z`,
      record: { preservedAt: now(), reason: 'schema-version', schemaVersion: 33, workspace: stored },
    });
  });

  it('opens the database at 33 or above: the rolled-back chapter loop raised it to 33, and a browser never opens a database at a lower version', () => {
    expect(harnessGenerationIndexedDbVersion()).toBeGreaterThanOrEqual(33);
    expect(harnessGenerationIndexedDbVersion()).toBeGreaterThanOrEqual(HARNESS_GENERATION_SCHEMA_VERSION);
  });

  it('preserves a current-version workspace whose shape cannot be read', () => {
    const stored = { schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION, stories: 'broken' };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.preserve?.record.reason).toBe('unreadable');
    expect(plan.preserve?.record.workspace).toBe(stored);
  });
});

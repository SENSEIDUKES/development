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

  it('upgrades a schema 22 workspace in place, keeping every story, after keeping an untouched copy of it', () => {
    const stored = { ...createEmptyHarnessWorkspaceState(), schemaVersion: 22, stories: [{ id: 'story-1', activeFoundationRevisionId: 'f', head: { nextChapterNumber: 2 } }] };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.state.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);
    expect(plan.state.stories).toEqual(stored.stories);
    expect(plan.preserve).toEqual({
      key: `${PRESERVED_WORKSPACE_PREFIX}v22:2026-09-24T12:00:00.000Z`,
      record: { preservedAt: now(), reason: 'migrated', schemaVersion: 22, workspace: stored },
    });
  });

  it('upgrades schema 23 to plan each arc as it begins: every stored Foundation copy drops its roadmap, saved arcs stay, and an unbegun story keeps its Arc 1 review', () => {
    const arc = (arcNumber: number) => ({ arcNumber, goals: [{ id: `arc-${arcNumber}-a`, text: `Arc ${arcNumber} goal.`, chapters: 100 }] });
    const roadmapInput = { premise: 'A river story.', plannedArcCount: 2, arcRoadmap: [arc(1), arc(2)] };
    const stored = {
      ...createEmptyHarnessWorkspaceState(), schemaVersion: 23,
      foundations: [{ id: 'f-new', input: structuredClone(roadmapInput) }, { id: 'f-old', input: structuredClone(roadmapInput) }],
      stories: [
        { id: 'new', activeFoundationRevisionId: 'f-new', createdAt: 'created', head: { nextChapterNumber: 1 },
          arcPlans: [{ plan: arc(1), effectiveChapter: 1, reason: 'initial' }, { plan: arc(2), effectiveChapter: 101, reason: 'initial' }] },
        { id: 'begun', activeFoundationRevisionId: 'f-old', createdAt: 'created', head: { nextChapterNumber: 7 },
          arcPlans: [{ plan: arc(1), effectiveChapter: 1, reason: 'initial' }, { plan: arc(2), effectiveChapter: 101, reason: 'initial' }] },
      ],
      attempts: [{ id: 'a', foundationSnapshot: { id: 'f-old', input: structuredClone(roadmapInput) } }],
      memoryRecoveries: [{ id: 'm', request: { foundation: { id: 'f-old', input: structuredClone(roadmapInput) } } }],
      arcPlanOperations: [{ id: 'op', request: { operation: 'plan-arc', instruction: 'unused' } }],
    };
    const { state } = planHarnessWorkspaceLoad(stored, now);
    expect(state.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);
    for (const input of [...state.foundations.map(entry => entry.input), state.attempts[0].foundationSnapshot.input, state.memoryRecoveries![0].request.foundation.input]) {
      expect(input).toEqual({ premise: 'A river story.', plannedArcCount: 2 });
    }
    expect(state.arcPlanOperations[0].request).toEqual({ operation: 'plan-arc' });
    expect(state.stories.map(story => story.arcPlans?.length)).toEqual([2, 2]);
    expect(state.stories[0].arcGoalReviews).toEqual([{ arcNumber: 1, reviewedAt: 'created', edited: false, source: 'migration' }]);
    expect(state.stories[1].arcGoalReviews).toBeUndefined();
  });

  it('upgrades schema 24 to carry speaker records: every chapter carries over unchanged, with none', () => {
    const chapter = { id: 'c1', storyId: 'story-1', chapterNumber: 1, paragraphs: ['“Hold the gate,” Mara said.'], soundCues: [] };
    const stored = { ...createEmptyHarnessWorkspaceState(), schemaVersion: 24, stories: [{ id: 'story-1' }], chapters: [chapter] };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.state.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);
    expect(plan.state.chapters).toEqual([chapter]);
    expect(plan.preserve?.record).toMatchObject({ reason: 'migrated', schemaVersion: 24 });
  });

  it('keeps an untouched copy of an older-schema workspace (nothing before schema 22 upgrades) before starting fresh', () => {
    const stored = { schemaVersion: 21, stories: [{ id: 'a' }, { id: 'b' }], chapters: [{ id: 'c1' }] };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.state).toEqual(createEmptyHarnessWorkspaceState());
    expect(plan.preserve).toEqual({
      key: `${PRESERVED_WORKSPACE_PREFIX}v21:2026-09-24T12:00:00.000Z`,
      record: { preservedAt: now(), reason: 'schema-version', schemaVersion: 21, workspace: stored },
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

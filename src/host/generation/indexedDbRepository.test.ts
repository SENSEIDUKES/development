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

  it('upgrades a schema 27 to 32 workspace with every story and chapter kept, keeping a copy of the original', () => {
    // 28 adds only optional fields: the rewrite request and its replaced-by record, and the Holdings fixer record.
    // 29 adds only optional fields too: a chapter's scene, the atmospheres in frozen media, a frozen soundtrack vocabulary.
    // 30 adds only an optional story field: Author's notes.
    // 31 adds only an optional story field: the story's own sound words. Saved cues and frozen attempts are untouched.
    // 32 adds only optional chapter fields: its appearances and the looks written down from them.
    // 34 adds only an optional Foundation field: the world at Chapter 0. (33 was the rolled-back chapter loop's.)
    // 35 adds only an optional packet section: that world, carried to the writer. Frozen attempts keep their own packet.
    // 36 gives every world card the chapter it entered in; a workspace holding no world is untouched.
    // 37 gives the world record its own home, opened from each story's active Foundation.
    // 38 drops the semantic-event memory system nothing had written to since the tags took over.
    // 39 takes tagging off the writer: the five tag slots leave the CAPA Schema
    // and the Author skill reaches 1.1.0. A story equipping neither is untouched.
    expect(HARNESS_GENERATION_SCHEMA_VERSION).toBe(39);
    for (const schemaVersion of [27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38]) {
      const stored = { ...createEmptyHarnessWorkspaceState(), schemaVersion, stories: [{ id: 'a' }], attempts: [{ id: 'a1', capaPrompt: { soundVocabulary: [{ word: 'blade drawn', example: 'drew his sword' }] } }], chapters: [{ id: 'c1', soundCues: [{ id: 'sc1' }] }] };
      const plan = planHarnessWorkspaceLoad(stored, now);
      expect(plan.state).toEqual({ ...stored, schemaVersion: 39, worldCards: [] });
      expect(plan.preserve).toEqual({
        key: `${PRESERVED_WORKSPACE_PREFIX}v${schemaVersion}:2026-09-24T12:00:00.000Z`,
        record: { preservedAt: now(), reason: 'migrated', schemaVersion, workspace: stored },
      });
    }
  });

  it('brings every world card a saved workspace holds up to the world record (schema 36)', () => {
    // Nothing could add a card after Chapter 0 before this version, so every
    // saved card is the opening world, wherever the workspace keeps it: a
    // Foundation revision's input and each attempt's frozen packet alike. Its
    // key is computed again too, because a key left naming Chapter 0 would not
    // match the one this build computes for the same card, and the Codex and
    // Holdings would read one card as two.
    const world = { cards: [{ key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', slots: { eyeColor: 'Pale grey' } }] };
    const stored = {
      ...createEmptyHarnessWorkspaceState(),
      schemaVersion: 35,
      foundations: [{ id: 'f1', input: { premise: 'A quarry laborer rises.', worldAtChapterZero: world } }],
      attempts: [{ id: 'a1', storyInformation: { worldAtChapterZero: world } }],
    };
    const plan = planHarnessWorkspaceLoad(stored, now);
    const upgraded = { cards: [{ ...world.cards[0], key: 'world:character:ye-chen', enteredInChapter: 0 }] };
    expect(plan.state).toEqual({
      ...stored,
      schemaVersion: 39,
      foundations: [{ id: 'f1', input: { premise: 'A quarry laborer rises.', worldAtChapterZero: upgraded } }],
      attempts: [{ id: 'a1', storyInformation: { worldAtChapterZero: upgraded } }],
      // No story names that Foundation as its active one, so the living record opens empty.
      worldCards: [],
    });
  });

  it('drops the event stores and carries the retired stage back to the prose (schema 38)', () => {
    // The only upgrade in the chain that rewrites what a story saved, rather
    // than adding to it: a regression here would quietly break a saved recovery
    // checkpoint, so it is checked field by field.
    const stored = {
      ...createEmptyHarnessWorkspaceState(),
      schemaVersion: 37,
      events: [{ id: 'e1' }],
      capabilityReceipts: [{ id: 'cr1' }],
      projections: [{ id: 'pr1' }],
      memoryRecoveries: [{ id: 'mr1' }],
      chapters: [{ id: 'c1', eventIds: ['e1'] }],
      attempts: [
        { id: 'a1', stage: 'events_preserved', eventsPreservedAt: 'x', preservedEvents: [], rejectedEvents: [], postCommitProcessing: 'complete' },
        { id: 'a2', stage: 'accepted_not_durable', recoveryStage: 'events_preserved' },
        { id: 'a3', stage: 'accepted_not_durable', recoveryStage: 'raw_received' },
      ],
    } as unknown as Parameters<typeof planHarnessWorkspaceLoad>[0];
    const state = planHarnessWorkspaceLoad(stored, now).state as unknown as Record<string, unknown>;
    for (const store of ['events', 'capabilityReceipts', 'projections', 'memoryRecoveries']) expect(state).not.toHaveProperty(store);
    expect(state.chapters).toEqual([{ id: 'c1' }]);
    const attempts = state.attempts as Array<Record<string, unknown>>;
    expect(attempts[0]).toEqual({ id: 'a1', stage: 'prose_accepted' });
    expect(attempts[1]).toEqual({ id: 'a2', stage: 'accepted_not_durable', recoveryStage: 'prose_accepted' });
    // Another checkpoint's recovery stage is left exactly as it was.
    expect(attempts[2]).toEqual({ id: 'a3', stage: 'accepted_not_durable', recoveryStage: 'raw_received' });
  });

  it('gives a chapter waiting at the prose checkpoint the id it will commit under (schema 38)', () => {
    // The id used to be settled at the stage this version removes, so an attempt
    // saved at the prose checkpoint carries none. Without one it would be read
    // by the tagger and then refused at the commit, with no way to finish.
    const stored = {
      ...createEmptyHarnessWorkspaceState(),
      schemaVersion: 37,
      attempts: [
        { id: 'a1', stage: 'prose_accepted', acceptedDraft: { prose: 'The gate held.' } },
        { id: 'a2', stage: 'events_preserved', acceptedDraft: { prose: 'It did not.' }, pendingChapterId: 'hch_kept' },
        { id: 'a3', stage: 'request_started' },
      ],
    } as unknown as Parameters<typeof planHarnessWorkspaceLoad>[0];
    const attempts = planHarnessWorkspaceLoad(stored, now).state.attempts as unknown as Array<Record<string, unknown>>;
    expect(attempts[0].pendingChapterId).toEqual(expect.stringMatching(/^hch_/));
    // One already settled keeps it, and the retired stage carries on from the prose.
    expect(attempts[1]).toMatchObject({ stage: 'prose_accepted', pendingChapterId: 'hch_kept' });
    // An attempt with no accepted prose has no chapter to name yet.
    expect(attempts[2].pendingChapterId).toBeUndefined();
  });

  it('opens each saved story\'s world record from its active Foundation (schema 37)', () => {
    // The world lived only on the Foundation until this version, so every saved
    // card is one its author wrote and the record opens with exactly those.
    const card = { key: 'world:character:ye-chen', kind: 'character', name: 'Ye Chen', enteredInChapter: 0, slots: {} };
    const stored = {
      ...createEmptyHarnessWorkspaceState(),
      schemaVersion: 36,
      stories: [
        { id: 's1', activeFoundationRevisionId: 'f2' },
        // A story whose author wrote no world adds nothing.
        { id: 's2', activeFoundationRevisionId: 'f3' },
      ],
      foundations: [
        // An older revision is not the active one, so its cards are not the record's.
        { id: 'f1', storyId: 's1', input: { worldAtChapterZero: { cards: [{ ...card, name: 'Someone Replaced' }] } } },
        { id: 'f2', storyId: 's1', input: { worldAtChapterZero: { cards: [card] } } },
        { id: 'f3', storyId: 's2', input: { premise: 'No world.' } },
      ],
    };
    const plan = planHarnessWorkspaceLoad(stored, now);
    expect(plan.state?.worldCards).toEqual([{ ...card, storyId: 's1' }]);
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

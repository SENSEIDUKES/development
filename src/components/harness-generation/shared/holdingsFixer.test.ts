import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  applyHoldingsFixes,
  deriveHoldings,
  planHoldingsFix,
  type HarnessChapter,
  type HarnessGenerationModelAdapter,
  type HarnessHoldingsFixerPolicy,
  type HarnessWorkspaceState,
} from '@seihouse/sen/harness-generation';
import type { SoundCueAttachment } from '@seihouse/sen/audio';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { REST_OF_CHAPTER, writtenChapterReply } from '../../../test-utils/writtenChapter';
import { declaredCharacters } from './holdings';

/**
 * The Holdings fixer's two halves, without a model: the cases a committed
 * chapter's holdings problems become, and how the fixer's answers are applied.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 30 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-06T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const reply = (paragraphs: string[], extra: Record<string, unknown> = {}) => JSON.stringify({
  title: 'The Armory', paragraphs,
  arcCompletion: { goalId: 'arc-1-armory', completed: false, evidence: '' },
  recap: 'Ye Chen trains.', chapterFunction: 'progression',
  nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The armory\'s past.', nextConflict: 'A rival arrives.',
  ...extra,
});

let ids = 0;
const runtime = { now: () => '2026-10-06T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

/** A story whose chapters are written from these replies, with no fixer: the problems stay for the test. */
const written = async (...replies: string[]) => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  for (const value of replies) generate.mockResolvedValueOnce({ rawProviderResponse: writtenChapterReply(value), providerReceipt: receipt });
  const controller = new HarnessGenerationController({
    repository: new InMemoryHarnessGenerationRepository(), runtime,
    modelAdapter: {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
      generate,
      arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
    },
  });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'Ye Chen survives the armory trial.', destinedEnding: 'Ye Chen masters the armory.', initialArcPlan: GOAL,
    cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }, { name: 'Elder Qin', role: 'Mentor' }],
  });
  for (let index = 0; index < replies.length; index += 1) await controller.generateNextChapter(story.id, 'fixture');
  const state = controller.snapshot();
  return { state, storyId: story.id, latest: [...state.chapters].sort((left, right) => right.chapterNumber - left.chapterNumber)[0] };
};

const inputFor = (state: HarnessWorkspaceState, chapter: HarnessChapter, policy: HarnessHoldingsFixerPolicy = 'records-and-sentences') => ({
  chapter, chapters: state.chapters, entries: state.codexEntries, mainCharacterName: 'Ye Chen', locale: 'en', policy,
});
const apply = (state: HarnessWorkspaceState, chapter: HarnessChapter, answers: unknown[], policy?: HarnessHoldingsFixerPolicy, extra: { error?: string } = {}) => {
  const input = inputFor(state, chapter, policy);
  const plan = planHoldingsFix(input);
  return {
    plan,
    result: applyHoldingsFixes({
      ...input, plan, reply: JSON.stringify({ fixes: answers }), ...extra,
      declared: declaredCharacters(state.attempts.at(-1)!.storyInformation.currentStory),
      createdAt: runtime.now(), createId: () => runtime.createId('hcx'),
    }),
  };
};
const flagsOf = (state: HarnessWorkspaceState, chapter: HarnessChapter, entries = state.codexEntries) => deriveHoldings({
  entries, chapters: [...state.chapters.filter(entry => entry.id !== chapter.id), chapter], mainCharacterName: 'Ye Chen',
}).flags.filter(flag => flag.chapterId === chapter.id);

const SWORD = '[[gained: MC | Rusted Iron Sword]] Ye Chen lifted the old blade from the rack.';

describe('Holdings fixer: the cases', () => {
  it('turns a problem on a sentence into one small case: the sentence, its tags and what the record showed', async () => {
    const { state, latest } = await written(reply([SWORD]), reply(['Ye Chen stepped into the yard. [[gained: MC | Rusted Iron Sword]] He picked up the rusted sword again. The yard was empty.']));
    const plan = planHoldingsFix(inputFor(state, latest));
    expect(plan.settled).toEqual([]);
    expect(plan.cases).toHaveLength(1);
    expect(plan.cases[0].case).toEqual({
      id: 'c1',
      problems: ['Ye Chen gains ‘Rusted Iron Sword’ again, but already holds it. It is not counted twice.'],
      passage: { before: 'Ye Chen stepped into the yard.', sentence: 'He picked up the rusted sword again.', after: 'The yard was empty.' },
      tags: '[[gained: MC | Rusted Iron Sword]]',
      record: [
        'Ye Chen before this chapter: has Rusted Iron Sword.',
        'Rusted Iron Sword: Chapter 1, gained: “Ye Chen lifted the old blade from the rack.”',
      ],
      answers: ['record', 'prose', 'fine', 'major'],
    });
    // Never the chapter itself.
    expect(JSON.stringify(plan.cases[0].case)).not.toContain(REST_OF_CHAPTER.slice(0, 40));
    // Records only: a sentence is never offered.
    expect(planHoldingsFix(inputFor(state, latest, 'records-only')).cases[0].case.answers).toEqual(['record', 'fine', 'major']);
    expect(planHoldingsFix(inputFor(state, latest, 'off'))).toEqual({ cases: [], settled: [] });
  });

  it('shows the fixer what the chapter itself recorded about the item before the sentence', async () => {
    const { state, latest } = await written(reply(['[[gained: MC | Rusted Iron Sword]] Ye Chen lifted the old blade from the rack. He tested its edge.',
      'Hours passed. [[gained: MC | Rusted Iron Sword]] He picked up the rusted sword again.']));
    const plan = planHoldingsFix(inputFor(state, latest));
    expect(plan.cases.map(planned => planned.case.record)).toEqual([[
      'Ye Chen before this chapter: nothing recorded.',
      'Rusted Iron Sword: earlier in this chapter, gained: “Ye Chen lifted the old blade from the rack.”',
    ]]);
  });

  it('settles a closing-list problem without asking when the chapter never names the item, and asks when it does', async () => {
    const { state, latest } = await written(reply([SWORD], { mainCharacterHoldings: ['Rusted Iron Sword'] }),
      reply(['Ye Chen found a silver bell in the dust and kept it.'], { mainCharacterHoldings: ['Rusted Iron Sword', 'Silver Bell', 'Jade Slip'] }));
    const plan = planHoldingsFix(inputFor(state, latest));
    expect(plan.settled).toEqual([{
      checks: ['closing-untagged'], problems: ['the writer\'s closing list for Ye Chen includes ‘Jade Slip’, which no tag recorded.'], outcome: 'fine',
      reason: 'The chapter never names it, so only the closing list is off; nothing in the chapter needs fixing.',
    }]);
    expect(plan.cases.map(planned => planned.case)).toEqual([{
      id: 'c1', problems: ['the writer\'s closing list for Ye Chen includes ‘Silver Bell’, which no tag recorded.'],
      record: ['Ye Chen after this chapter: has Rusted Iron Sword.'],
      mentions: [{ id: 'm1', sentence: 'Ye Chen found a silver bell in the dust and kept it.' }],
      answers: ['record', 'fine'],
    }]);

    // The fixer adds the tag on the sentence that shows it, and the record gains the bell.
    const { result } = apply(state, latest, [{ case: 'c1', outcome: 'record', sentence: 'm1', tags: '[[gained: MC | Silver Bell]]', reason: 'He keeps the bell.' }]);
    expect(result.fixes.at(-1)).toMatchObject({ outcome: 'fixed-tags', after: '[[gained: MC | Silver Bell]]', reason: 'He keeps the bell.' });
    expect(flagsOf(state, result.chapter, result.entries).map(flag => flag.kind)).toEqual(['closing-untagged']);
    expect(result.entries.find(entry => entry.name === 'Silver Bell')!.origin).toEqual({ source: 'tag', chapterId: latest.id, chapterNumber: 2 });
  });

  it('settles a closing-list problem without asking when the chapter\'s own last tag for the item is its last word, and asks only about a sentence after it', async () => {
    const PILL = '[[gained: MC | Spirit Pill]] He pocketed a spirit pill.';
    const TAKEN = '[[gained: MC | Rusted Iron Sword]] Ye Chen lifted the rusted iron sword from the rack.';
    const lastWord = 'The chapter\'s own tag is its last word on it, and nothing after that tag names it, so only the closing list is off; nothing needs fixing.';
    const leftOut = ['the writer\'s closing list for Ye Chen leaves out ‘Rusted Iron Sword’. It may have been lost without a tag.'];

    // Gained here and never named after: the list only left it out.
    const held = await written(reply([PILL, TAKEN, 'He walked home in the rain.'], { mainCharacterHoldings: ['Spirit Pill'] }));
    expect(planHoldingsFix(inputFor(held.state, held.latest))).toEqual({ cases: [], settled: [{ checks: ['closing-unlisted'], problems: leftOut, outcome: 'fine', reason: lastWord }] });

    // Lost here and still listed: the loss is the last word.
    const spent = await written(reply([PILL, '[[lost: MC | Spirit Pill]] Ye Chen swallowed the spirit pill.'], { mainCharacterHoldings: ['Spirit Pill'] }));
    expect(planHoldingsFix(inputFor(spent.state, spent.latest))).toEqual({ cases: [], settled: [{
      checks: ['closing-untagged'], problems: ['the writer\'s closing list for Ye Chen includes ‘Spirit Pill’, which no tag recorded.'], outcome: 'fine', reason: lastWord,
    }] });

    // Named again after it was gained: that sentence may show it lost without a tag, so it alone is asked about.
    const broken = await written(reply([PILL, TAKEN, 'The rusted iron sword snapped against the stone.'], { mainCharacterHoldings: ['Spirit Pill'] }));
    const plan = planHoldingsFix(inputFor(broken.state, broken.latest));
    expect(plan.settled).toEqual([]);
    expect(plan.cases.map(planned => planned.case)).toEqual([{
      id: 'c1', problems: leftOut,
      record: ['Ye Chen after this chapter: has Spirit Pill, Rusted Iron Sword.'],
      mentions: [{ id: 'm1', sentence: 'The rusted iron sword snapped against the stone.' }],
      answers: ['record', 'fine'],
    }]);
    const { result } = apply(broken.state, broken.latest, [{ case: 'c1', outcome: 'record', sentence: 'm1', tags: '[[lost: MC | Rusted Iron Sword]]', reason: 'It snapped.' }]);
    expect(result.fixes).toMatchObject([{ outcome: 'fixed-tags', blockId: 'c1-p3', after: '[[lost: MC | Rusted Iron Sword]]', reason: 'It snapped.' }]);
    expect(flagsOf(broken.state, result.chapter, result.entries)).toEqual([]);
  });
});

describe('Holdings fixer: the answers', () => {
  it('corrects the tags on a sentence when that settles the problem, and keeps a record of it', async () => {
    const { state, latest } = await written(reply([SWORD]), reply(['[[gained: MC | Rusted Iron Sword]] He picked up the rusted sword again.']));
    expect(flagsOf(state, latest).map(flag => flag.kind)).toEqual(['already-held']);
    const { result } = apply(state, latest, [{ case: 'c1', outcome: 'record', tags: '[[has: MC | Rusted Iron Sword]]', reason: 'He already had it.' }]);
    expect(result.fixes).toEqual([{
      checks: ['already-held'], problems: ['Ye Chen gains ‘Rusted Iron Sword’ again, but already holds it. It is not counted twice.'],
      outcome: 'fixed-tags', blockId: 'c2-p1', before: '[[gained: MC | Rusted Iron Sword]]', after: '[[has: MC | Rusted Iron Sword]]', reason: 'He already had it.',
    }]);
    expect(result.chapter.holdingChanges!.map(change => change.payload.verb)).toEqual(['has']);
    expect(result.chapter.holdingChanges![0].anchor.selectedText).toBe('He picked up the rusted sword again.');
    expect(flagsOf(state, result.chapter, result.entries)).toEqual([]);
    // The prose is untouched.
    expect(result.chapter.paragraphs).toEqual(latest.paragraphs);
  });

  it('corrects one sentence of prose in place: the record\'s tags and every span after it move with the text', async () => {
    const { state, latest } = await written(reply([SWORD, '[[gained: MC | Spirit Pill]] He pocketed a spirit pill.']),
      reply(['[[lost: MC | Spirit Pill | 2]] Ye Chen swallowed two pills at once. Thunder rolled over the peaks.']));
    expect(flagsOf(state, latest).map(flag => flag.kind)).toEqual(['count-mismatch']);
    // A Sound Cue on the next sentence of the same paragraph.
    const paragraph = latest.paragraphs[0];
    const start = paragraph.indexOf('Thunder rolled');
    const cue = { id: 'cue-1', kind: 'sound-cue', anchor: { level: 'span', blockId: 'c2-p1', startOffset: start, endOffset: start + 'Thunder rolled'.length, selectedText: 'Thunder rolled' }, payload: {} } as unknown as SoundCueAttachment;
    const chapter: HarnessChapter = { ...latest, soundCues: [cue] };

    const { result } = apply(state, chapter, [{ case: 'c1', outcome: 'prose', replacement: 'Ye Chen swallowed his last pill.', tags: '[[lost: MC | Spirit Pill]]', reason: 'He only had one.' }]);
    expect(result.fixes[0]).toMatchObject({ outcome: 'fixed-sentence', before: 'Ye Chen swallowed two pills at once.', after: 'Ye Chen swallowed his last pill.' });
    const text = result.chapter.paragraphs[0];
    expect(text.startsWith('Ye Chen swallowed his last pill. Thunder rolled over the peaks.')).toBe(true);
    expect(result.chapter.prose.startsWith(text)).toBe(true);
    expect(result.chapter.metrics.wordCount).toBe(latest.metrics.wordCount - 1);
    const moved = result.chapter.soundCues![0].anchor as { startOffset: number; endOffset: number; detached?: true };
    expect(moved.detached).toBeUndefined();
    expect(text.slice(moved.startOffset, moved.endOffset)).toBe('Thunder rolled');
    expect(result.chapter.holdingChanges!.map(change => [change.payload.verb, change.payload.count, change.anchor.selectedText]))
      .toEqual([['lost', undefined, 'Ye Chen swallowed his last pill.']]);
    expect(flagsOf(state, result.chapter, result.entries)).toEqual([]);
  });

  it('never rewrites a sentence a Sound Cue sits on, and never when sentences are off', async () => {
    const { state, latest } = await written(reply([SWORD, '[[gained: MC | Spirit Pill]] He pocketed a spirit pill.']),
      reply(['[[lost: MC | Spirit Pill | 2]] Ye Chen swallowed two pills at once.']));
    const cue = { id: 'cue-1', kind: 'sound-cue', anchor: { level: 'span', blockId: 'c2-p1', startOffset: 8, endOffset: 17, selectedText: 'swallowed' }, payload: {} } as unknown as SoundCueAttachment;
    const answer = { case: 'c1', outcome: 'prose', replacement: 'Ye Chen swallowed his last pill.', tags: '[[lost: MC | Spirit Pill]]', reason: 'One pill.' };
    const covered = apply(state, { ...latest, soundCues: [cue] }, [answer]);
    expect(covered.plan.cases[0].case.answers).toEqual(['record', 'fine', 'major']);
    expect(covered.result.fixes[0]).toMatchObject({ outcome: 'skipped', reason: 'The fixer answered prose, which this problem does not allow.' });
    expect(covered.result.chapter.paragraphs).toEqual(latest.paragraphs);

    const recordsOnly = apply(state, latest, [answer], 'records-only');
    expect(recordsOnly.result.fixes[0].outcome).toBe('skipped');
    expect(recordsOnly.result.chapter.paragraphs).toEqual(latest.paragraphs);
  });

  it('merges a name the chapter made into the entry already there, teaching it the new name', async () => {
    const { state, latest } = await written(reply([SWORD]), reply(['[[gained: MC | Rusted Sword]] Ye Chen found a second rusted sword.']));
    const plan = planHoldingsFix(inputFor(state, latest));
    expect(plan.cases.map(planned => planned.case)).toEqual([{
      id: 'c1', problems: ['‘Rusted Iron Sword’ and ‘Rusted Sword’ may be the same thing.'],
      record: ['‘Rusted Iron Sword’ first named in Chapter 1: “Ye Chen lifted the old blade from the rack.”', '‘Rusted Sword’ first named in Chapter 2: “Ye Chen found a second rusted sword.”'],
      answers: ['record', 'fine'],
    }]);
    const { result } = apply(state, latest, [{ case: 'c1', outcome: 'record', reason: 'The same blade.' }]);
    const kept = state.codexEntries.find(entry => entry.name === 'Rusted Iron Sword')!;
    expect(result.fixes[0]).toMatchObject({ outcome: 'merged', before: '‘Rusted Sword’ and ‘Rusted Iron Sword’', after: '‘Rusted Iron Sword’', merged: { keptEntryId: kept.id, alias: 'Rusted Sword' } });
    expect(result.entries.find(entry => entry.name === 'Rusted Sword')).toBeUndefined();
    expect(result.entries.find(entry => entry.id === kept.id)!.aliases).toEqual(['Rusted Sword']);
    expect(result.chapter.holdingChanges![0].payload.target).toEqual({ name: 'Rusted Sword', entryId: kept.id });

    // Different things: nothing changes.
    const apart = apply(state, latest, [{ case: 'c1', outcome: 'fine', reason: 'Two different swords.' }]).result;
    expect(apart.fixes[0]).toEqual({ checks: ['possible-duplicate'], problems: plan.cases[0].case.problems, outcome: 'fine', reason: 'Two different swords.' });
    expect(apart.entries).toEqual(state.codexEntries);
  });

  it('keeps the chapter as it was when an answer would not settle the problem, is missing, or is a major contradiction', async () => {
    const { state, latest } = await written(reply([SWORD]), reply(['[[gained: MC | Rusted Iron Sword]] He picked up the rusted sword again.']));
    const unsettled = apply(state, latest, [{ case: 'c1', outcome: 'record', tags: '[[gained: MC | Rusted Iron Sword]]', reason: 'Same.' }]).result;
    expect(unsettled.fixes[0]).toMatchObject({ outcome: 'skipped', reason: 'Nothing was changed: the fix would not have settled it.' });
    expect(unsettled.chapter).toEqual(latest);

    const unreadable = apply(state, latest, [{ case: 'c1', outcome: 'record', tags: 'He has the sword.', reason: 'Prose.' }]).result;
    expect(unreadable.fixes[0]).toMatchObject({ outcome: 'skipped', reason: 'Nothing was changed: the corrected tags held words that are not tags.' });

    const major = apply(state, latest, [{ case: 'c1', outcome: 'major', reason: 'The sword was destroyed in Chapter 1.' }]).result;
    expect(major.fixes[0]).toMatchObject({ outcome: 'major', reason: 'The sword was destroyed in Chapter 1.' });
    expect(major.chapter).toEqual(latest);

    const unreached = apply(state, latest, [], undefined, { error: 'The writer is busy.' }).result;
    expect(unreached.fixes[0]).toMatchObject({ outcome: 'skipped', reason: 'The fixer could not be reached: The writer is busy.' });
    expect(unreached.chapter).toEqual(latest);
  });
});

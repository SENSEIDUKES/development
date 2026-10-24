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
import type { WorldRecord } from '@seihouse/sen/contracts';
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

describe('Holdings fixer: the world the story opened with', () => {
  /**
   * Review finding (Codex, 2026-10-24): the writer's packet derives holdings
   * from the Chapter 0 world, so the fixer must too. Reading an empty starting
   * record, it would see a valid first-chapter loss of a starting sword as a
   * loss of something nobody held, and correct a tag that was right.
   */
  const world = {
    cards: [{
      key: 'world:character:ye-chen', kind: 'character' as const, name: 'Ye Chen', mainCharacter: true as const,
      enteredInChapter: 0, slots: { holds: 'Rusted Iron Sword' },
    }],
  };

  it('finds no problem in a first chapter that loses what the world gave the main character', async () => {
    const { state, latest } = await written(reply(['[[lost: MC | Rusted Iron Sword | ×1 | shattered]] The blade broke against the gate.']));
    // Without the world, the loss reads as a loss of something nobody held.
    expect(planHoldingsFix(inputFor(state, latest)).cases.flatMap(planned => planned.case.problems))
      .toEqual(['Ye Chen loses ‘Rusted Iron Sword’, which the record does not show them holding.']);
    // With it, the tag was right all along and there is nothing to fix.
    expect(planHoldingsFix({ ...inputFor(state, latest), worldAtChapterZero: world })).toEqual({ cases: [], settled: [] });
  });

  it('says what a near-named starting holder had, rather than nothing', async () => {
    // Review finding (CodeRabbit, 2026-10-24): a tag naming 'Mu' resolves to a
    // new Codex entry, because the resolver matches exactly, while the world
    // holds 'Elder Mu' under its card's key. The holdings are right, but the
    // fixer looked the holder up by the tag's entry ID alone and reported that
    // nothing was recorded.
    const nearNamed: WorldRecord = {
      cards: [
        { key: 'world:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, enteredInChapter: 0, slots: {} },
        { key: 'world:character:elder-mu', kind: 'character', name: 'Elder Mu', enteredInChapter: 0, slots: { holds: 'Jade Fan' } },
      ],
    };
    const { state, latest } = await written(reply(['Mu took up the [[gained: Mu | Jade Fan]]jade fan again.']));
    const plan = planHoldingsFix({ ...inputFor(state, latest), worldAtChapterZero: nearNamed });
    expect(plan.cases.flatMap(entry => entry.case.problems))
      .toEqual(['Elder Mu gains ‘Jade Fan’ again, but already holds it. It is not counted twice.']);
    const record = (plan.cases[0].case.record ?? []).join('\n');
    expect(record).toContain('Jade Fan');
    expect(record).not.toContain('nothing recorded');
  });

  it('asks about an untagged loss described by another of a starting thing\'s names', async () => {
    // Review finding (Codex, 2026-10-24): the closing-case branch searched the
    // chapter's sentences by the entry's names or the flag's one name, so a
    // chapter throwing away a starting thing under another of its names read as
    // never naming it. The missed loss was dismissed rather than repaired, and
    // the discarded thing stayed in every later Holdings packet.
    const aliased: WorldRecord = {
      cards: [
        { key: 'world:character:ye-chen', kind: 'character' as const, name: 'Ye Chen', mainCharacter: true as const, enteredInChapter: 0, slots: {} },
        { key: 'world:thing:vermilion-brush', kind: 'thing' as const, name: 'Vermilion Brush', aliases: ['Red Quill'],
          enteredInChapter: 0, slots: { holder: 'Ye Chen' } },
      ],
    };
    const { state, latest } = await written(reply(['Ye Chen threw the Red Quill into the furnace.'], { mainCharacterHoldings: [] }));
    const plan = planHoldingsFix({ ...inputFor(state, latest), worldAtChapterZero: aliased });
    expect(plan.settled).toEqual([]);
    expect(plan.cases).toHaveLength(1);
    expect(plan.cases[0].case.problems)
      .toEqual(['the writer\'s closing list for Ye Chen leaves out ‘Vermilion Brush’. It may have been lost without a tag.']);
    // The sentence that names it under its other name is what the fixer is
    // asked about, so the missed loss can actually be repaired.
    expect(plan.cases[0].case.mentions?.map(mention => mention.sentence))
      .toEqual(['Ye Chen threw the Red Quill into the furnace.']);
  });

  it('still finds the problem of gaining what the world already gave, and says what they held', async () => {
    const { state, latest } = await written(reply([SWORD]));
    const planned = planHoldingsFix({ ...inputFor(state, latest), worldAtChapterZero: world }).cases;
    expect(planned.flatMap(entry => entry.case.problems))
      .toEqual(['Ye Chen gains ‘Rusted Iron Sword’ again, but already holds it. It is not counted twice.']);
    // Review finding (Codex, 2026-10-24): the record beside the problem is
    // looked up by the holder's Codex entry ID, so a Chapter 0 holder held
    // under their card's key read as "nothing recorded" and the fixer would
    // have been asked to correct a tag with no idea what the character had.
    expect(planned[0].case.record).toContain('Ye Chen before this chapter: has Rusted Iron Sword.');
  });
});

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

  it('never rewrites a sentence that shows an appearance, and moves the appearances after a corrected sentence with the text', async () => {
    const { state, latest } = await written(reply([SWORD, '[[gained: MC | Spirit Pill]] He pocketed a spirit pill.']),
      reply(['[[lost: MC | Spirit Pill | 2]] Ye Chen swallowed two pills at once. [[appears: Elder Qin | character]] Elder Qin watched from the door.']));
    expect(latest.appearances!.map(found => found.anchor.selectedText)).toEqual(['Elder Qin watched from the door.']);
    const answer = { case: 'c1', outcome: 'prose', replacement: 'Ye Chen swallowed his last pill.', tags: '[[lost: MC | Spirit Pill]]', reason: 'One pill.' };
    // The look of a character is read from the sentence that shows them, so that sentence is never rewritten.
    const shown = latest.appearances![0];
    const onIt = { ...latest, appearances: [{ ...shown, anchor: { ...shown.anchor, startOffset: 0, endOffset: 40, selectedText: latest.paragraphs[0].slice(0, 40) } }] };
    expect(apply(state, onIt, [answer]).plan.cases[0].case.answers).toEqual(['record', 'fine', 'major']);
    // A sentence before it is corrected, and the appearance moves with its words.
    const { result } = apply(state, latest, [answer]);
    expect(result.fixes[0].outcome).toBe('fixed-sentence');
    const moved = result.chapter.appearances![0].anchor;
    expect(result.chapter.paragraphs[0].slice(moved.startOffset, moved.endOffset)).toBe('Elder Qin watched from the door.');
  });

  it('points a merged name\'s appearances at the entry it joins', async () => {
    const { state, latest } = await written(reply([SWORD]),
      reply(['[[appears: Rusted Sword | thing]] [[gained: MC | Rusted Sword]] Ye Chen found a second rusted sword.']));
    const plan = planHoldingsFix(inputFor(state, latest));
    // The name was first named by its appearance, on the same sentence.
    expect(plan.cases[0].case.record).toContain('‘Rusted Sword’ first named in Chapter 2: “Ye Chen found a second rusted sword.”');
    const { result } = apply(state, latest, [{ case: 'c1', outcome: 'record', reason: 'The same blade.' }]);
    const kept = state.codexEntries.find(entry => entry.name === 'Rusted Iron Sword')!;
    expect(result.fixes[0]).toMatchObject({ outcome: 'merged', merged: { keptEntryId: kept.id } });
    expect(result.chapter.appearances![0].payload.subject).toEqual({ name: 'Rusted Sword', entryId: kept.id });
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

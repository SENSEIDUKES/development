import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  deriveHoldings,
  exportHarnessStory,
  type HarnessGenerationModelAdapter,
  type HarnessHoldingsFixerPolicy,
  type HarnessWorkspaceState,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { buildHoldingsFixerPrompt } from '../../../server/harness-generation/holdingsFixer';

/**
 * The Holdings fixer in the chapter flow: after a chapter commits, one small
 * call with the chapter's own model settles its holdings problems quietly,
 * and the chapter keeps the record. Nothing it does can undo the chapter.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 30 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-06T12:00:00.000Z', usage: { source: 'reported' as const, inputTokens: 420, outputTokens: 60 } };
const reply = (paragraphs: string[], extra: Record<string, unknown> = {}) => JSON.stringify({
  title: 'The Armory', paragraphs,
  arcCompletion: { goalId: 'arc-1-armory', completed: false, evidence: '' },
  recap: 'Ye Chen trains.', chapterFunction: 'progression',
  nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The armory\'s past.', nextConflict: 'A rival arrives.',
  ...extra,
});
const SWORD = reply(['[[gained: MC | Rusted Iron Sword]] Ye Chen lifted the old blade from the rack.']);
const AGAIN = reply(['[[gained: MC | Rusted Iron Sword]] He picked up the rusted sword again.']);
const fixes = (...answers: unknown[]) => ({ rawProviderResponse: JSON.stringify({ fixes: answers }), providerReceipt: receipt });

let ids = 0;
const runtime = { now: () => '2026-10-06T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

const setup = async ({ policy, fixer = true }: { policy?: HarnessHoldingsFixerPolicy; fixer?: boolean } = {}) => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  const fixHoldings = vi.fn<NonNullable<HarnessGenerationModelAdapter['fixHoldings']>>();
  const controller = new HarnessGenerationController({
    repository: new InMemoryHarnessGenerationRepository(), runtime,
    ...(policy ? { holdingsFixer: policy } : {}),
    modelAdapter: {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
      generate,
      arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
      ...(fixer ? { fixHoldings } : {}),
    },
  });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'Ye Chen survives the armory trial.', destinedEnding: 'Ye Chen masters the armory.', initialArcPlan: GOAL,
    cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
  });
  const write = async (value: string) => {
    generate.mockResolvedValueOnce({ rawProviderResponse: writtenChapterReply(value), providerReceipt: receipt });
    await controller.generateNextChapter(story.id, 'fixture');
  };
  return { controller, storyId: story.id, generate, fixHoldings, write };
};

const chapterNumbered = (state: HarnessWorkspaceState, chapterNumber: number) => state.chapters.find(chapter => chapter.chapterNumber === chapterNumber)!;
const flags = (state: HarnessWorkspaceState) => deriveHoldings({ entries: state.codexEntries, chapters: state.chapters, mainCharacterName: 'Ye Chen' }).flags;

describe('The Holdings fixer after a chapter commits', () => {
  it('asks once, with the chapter\'s model and only the small cases, and the chapter keeps the record of what it did', async () => {
    const run = await setup();
    await run.write(SWORD);
    // A chapter with nothing wrong asks nothing and carries no record.
    expect(run.fixHoldings).not.toHaveBeenCalled();
    expect(chapterNumbered(run.controller.snapshot(), 1).fixer).toBeUndefined();

    run.fixHoldings.mockResolvedValueOnce(fixes({ case: 'c1', outcome: 'record', tags: '[[has: MC | Rusted Iron Sword]]', reason: 'He already had it.' }));
    await run.write(AGAIN);
    expect(run.fixHoldings).toHaveBeenCalledTimes(1);
    const request = run.fixHoldings.mock.calls[0][0];
    expect(request).toMatchObject({ operation: 'fix-holdings', chapterNumber: 2, model: 'fixture', language: 'en', mainCharacter: 'Ye Chen' });
    expect(request.cases.map(entry => entry.id)).toEqual(['c1']);
    // Small: the cases, never the chapter.
    const prompt = buildHoldingsFixerPrompt(request);
    expect(prompt.userPrompt).toContain('CASE c1 · answers: record, prose, fine, major');
    expect(prompt.userPrompt).toContain('Sentence: He picked up the rusted sword again.');
    expect(prompt.userPrompt.length).toBeLessThan(1_200);

    const state = run.controller.snapshot();
    const chapter = chapterNumbered(state, 2);
    expect(chapter.holdingChanges!.map(change => change.payload.verb)).toEqual(['has']);
    expect(chapter.fixer).toEqual({
      checkedAt: '2026-10-06T12:00:00.000Z', model: 'fixture', providerReceipt: receipt,
      rawProviderResponse: JSON.stringify({ fixes: [{ case: 'c1', outcome: 'record', tags: '[[has: MC | Rusted Iron Sword]]', reason: 'He already had it.' }] }),
      fixes: [{
        checks: ['already-held'], problems: ['Ye Chen gains ‘Rusted Iron Sword’ again, but already holds it. It is not counted twice.'],
        outcome: 'fixed-tags', blockId: 'c2-p1', before: '[[gained: MC | Rusted Iron Sword]]', after: '[[has: MC | Rusted Iron Sword]]', reason: 'He already had it.',
      }],
    });
    expect(flags(state)).toEqual([]);
    expect(state.stories[0].head.nextChapterNumber).toBe(3);
    // The export carries the record, so a test shows how the fixer did.
    expect(exportHarnessStory(state, run.storyId).chapters.find(entry => entry.chapterNumber === 2)!.fixer!.fixes[0].outcome).toBe('fixed-tags');
  });

  it('keeps the chapter as committed when the call fails, and says why in the record', async () => {
    const run = await setup();
    await run.write(SWORD);
    run.fixHoldings.mockRejectedValueOnce(new Error('The writer is busy.'));
    await run.write(AGAIN);
    const chapter = chapterNumbered(run.controller.snapshot(), 2);
    expect(chapter.holdingChanges!.map(change => change.payload.verb)).toEqual(['gained']);
    expect(chapter.fixer).toMatchObject({ error: 'The writer is busy.', fixes: [{ outcome: 'skipped', reason: 'The fixer could not be reached: The writer is busy.' }] });
    expect(run.controller.snapshot().stories[0].head.nextChapterNumber).toBe(3);
  });

  it('settles closing-list problems about items the chapter never names without asking', async () => {
    const run = await setup();
    await run.write(reply(['[[gained: MC | Rusted Iron Sword]] Ye Chen lifted the old blade from the rack.'], { mainCharacterHoldings: ['Rusted Iron Sword', 'Jade Slip'] }));
    expect(run.fixHoldings).not.toHaveBeenCalled();
    expect(chapterNumbered(run.controller.snapshot(), 1).fixer).toEqual({
      checkedAt: '2026-10-06T12:00:00.000Z',
      fixes: [{ checks: ['closing-untagged'], problems: ['the writer\'s closing list for Ye Chen includes ‘Jade Slip’, which no tag recorded.'], outcome: 'fine',
        reason: 'The chapter never names it, so only the closing list is off; nothing in the chapter needs fixing.' }],
    });
  });

  it('is asked only when a check flags something in the chapter itself that the rules cannot settle', async () => {
    const run = await setup();
    // Nothing flagged: nothing asked, nothing recorded.
    await run.write(SWORD);
    await run.write(reply(['Ye Chen trained alone in the yard.']));
    // A closing list wrong three ways, none of which a sentence of the chapter could fix: settled without asking.
    await run.write(reply(['[[gained: MC | Silver Bell]] Ye Chen found a silver bell in the dust.'], { mainCharacterHoldings: ['Jade Slip'] }));
    expect(run.fixHoldings).not.toHaveBeenCalled();
    const before = run.controller.snapshot();
    expect([1, 2].map(number => chapterNumbered(before, number).fixer)).toEqual([undefined, undefined]);
    expect(chapterNumbered(before, 3).fixer).not.toHaveProperty('model');
    expect(chapterNumbered(before, 3).fixer!.fixes.map(fix => [fix.checks[0], fix.outcome])).toEqual([
      ['closing-unlisted', 'fine'], ['closing-unlisted', 'fine'], ['closing-untagged', 'fine'],
    ]);

    // The chapter's own problem is asked about, once.
    run.fixHoldings.mockResolvedValueOnce(fixes({ case: 'c1', outcome: 'fine', reason: 'He picks it up again; nothing to change.' }));
    await run.write(AGAIN);
    expect(run.fixHoldings).toHaveBeenCalledTimes(1);
    // Answered "fine", it stays flagged, and a later chapter never asks about it again.
    await run.write(reply(['Ye Chen rested by the well.']));
    await run.write(reply(['Ye Chen walked to the gate at dawn.']));
    expect(run.fixHoldings).toHaveBeenCalledTimes(1);
    const after = run.controller.snapshot();
    expect(flags(after).filter(flag => flag.chapterNumber === 4).map(flag => flag.kind)).toEqual(['already-held']);
    expect([5, 6].map(number => chapterNumbered(after, number).fixer)).toEqual([undefined, undefined]);
  });

  it('does nothing when the host turns it off or offers no fixer, and the host can change its mind', async () => {
    const off = await setup({ policy: 'off' });
    await off.write(SWORD);
    await off.write(AGAIN);
    expect(off.fixHoldings).not.toHaveBeenCalled();
    expect(chapterNumbered(off.controller.snapshot(), 2).fixer).toBeUndefined();
    off.controller.setHoldingsFixer('records-only');
    off.fixHoldings.mockResolvedValueOnce(fixes({ case: 'c1', outcome: 'fine', reason: 'Fine.' }));
    await off.write(AGAIN);
    expect(off.fixHoldings).toHaveBeenCalledTimes(1);
    expect(off.fixHoldings.mock.calls[0][0].cases[0].answers).toEqual(['record', 'fine', 'major']);

    const none = await setup({ fixer: false });
    await none.write(SWORD);
    await none.write(AGAIN);
    expect(chapterNumbered(none.controller.snapshot(), 2).fixer).toBeUndefined();
  });

  it('a rewrite of the chapter takes back what its fixer did, the name it taught an older entry included', async () => {
    const run = await setup();
    await run.write(SWORD);
    run.fixHoldings.mockResolvedValueOnce(fixes({ case: 'c1', outcome: 'record', reason: 'The same blade.' }));
    await run.write(reply(['[[gained: MC | Rusted Sword]] Ye Chen found the rusted sword under the rack.']));
    const merged = run.controller.snapshot();
    const sword = merged.codexEntries.find(entry => entry.name === 'Rusted Iron Sword')!;
    expect(sword.aliases).toEqual(['Rusted Sword']);
    expect(merged.codexEntries.some(entry => entry.name === 'Rusted Sword')).toBe(false);

    run.generate.mockResolvedValueOnce({ rawProviderResponse: writtenChapterReply(reply(['Ye Chen trained alone in the yard.'])), providerReceipt: receipt });
    await run.controller.rewriteLatestChapter(run.storyId, 'fixture');
    const rewritten = run.controller.snapshot();
    expect(rewritten.codexEntries.find(entry => entry.id === sword.id)!.aliases).toBeUndefined();
    expect(chapterNumbered(rewritten, 2).fixer).toBeUndefined();
    expect(run.fixHoldings).toHaveBeenCalledTimes(1);
  });
});

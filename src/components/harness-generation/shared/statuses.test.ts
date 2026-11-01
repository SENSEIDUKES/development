import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  deriveStatuses,
  deriveStoryCodex,
  notesOfTaggedChapter,
  placeStatuses,
  readStatusTag,
  type HarnessGenerationModelAdapter,
  type HarnessTagRequest,
} from '@seihouse/sen/harness-generation';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { presentAppearances } from '../../../server/harness-generation/prompt';
import { readMarks } from '../../../narrative/marks';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { acceptChapterTags } from './responseAcceptance';

/**
 * Status, the second information tag (SENSEI, 2026-10-31), built the way
 * appearances are: the tagger tags the sentence where a character's condition
 * changes (`[[status: Elder Qin | dead]]`), the HARNESS saves it on that
 * sentence, and a character's status now is the latest tag in story order.
 * The tagger and the writer are both told it, and the Codex card shows it.
 */

const tag = (text: string) => readMarks(text).wordTags[0];

describe('reading status tags', () => {
  it('reads who and how they are now, keeping the prose exactly as it was', () => {
    const reading = readMarks('[[status: Elder Qin | dead]] Elder Qin did not rise again.');
    expect(reading.text).toBe('Elder Qin did not rise again.');
    expect(readStatusTag(reading.wordTags[0])).toEqual({ ok: true, status: { subject: { name: 'Elder Qin' }, status: 'dead' } });
    // Other spellings a tagger slips into read the same.
    expect(readStatusTag(tag('[[Condition: MC | badly wounded]] He fell.'))).toEqual({ ok: true, status: { subject: { name: 'MC' }, status: 'badly wounded' } });
  });

  it('sets aside a status that says nothing, or tells what happened instead of how they are', () => {
    expect(readMarks('[[status: Elder Qin]] He fell.').wordTagIssues).toEqual([{ kind: 'incomplete', word: 'status' }]);
    const story = readStatusTag(tag('[[status: Elder Qin | struck down by the sect leader in the hall after a long duel]] He fell.'));
    expect(story).toMatchObject({ ok: false });
  });

  it('places each status on the sentence its tag points at, apart from the other tags beside it', () => {
    const reading = readMarks('The hall went quiet. [[gained: MC | Iron Key]] [[status: Elder Qin | dead]] Elder Qin did not rise again.');
    const placed = placeStatuses({ paragraphs: [{ blockId: 'c1-p0', text: reading.text, wordTags: reading.wordTags }] });
    expect(placed.problems).toEqual([]);
    expect(placed.statuses).toHaveLength(1);
    expect(placed.statuses[0]).toMatchObject({
      kind: 'status',
      anchor: { blockId: 'c1-p0', selectedText: 'Elder Qin did not rise again.' },
      payload: { origin: 'harness', subject: { name: 'Elder Qin' }, status: 'dead' },
    });
  });

  it('is read with the chapter\'s other tags, and an unreadable one is flagged as a status, never as a holding', () => {
    const warnings: Parameters<typeof acceptChapterTags>[2] = [];
    const tags = acceptChapterTags(['[[status: Elder Qin | dead]] Elder Qin fell. [[status: Lin]] Lin wept.'], 1, warnings);
    expect(tags.paragraphs).toEqual(['Elder Qin fell. Lin wept.']);
    expect(tags.statuses.map(status => status.payload.status)).toEqual(['dead']);
    expect(warnings.map(warning => warning.code)).toEqual(['status_tags_incomplete']);
  });
});

describe('a character\'s status now', () => {
  const at = (chapterNumber: number, blockId: string, start: number, status: string, entryId = 'e-qin') => ({
    id: `c${chapterNumber}`, chapterNumber,
    statuses: [{
      id: `status:${blockId}:${start}`, kind: 'status' as const,
      anchor: { level: 'span' as const, blockId, startOffset: start, endOffset: start + 5, selectedText: 'He fell.' },
      payload: { origin: 'harness' as const, subject: { name: 'Elder Qin', entryId }, status },
    }],
  });

  it('is the latest status tag in story order, whatever order the chapters are given in', () => {
    const now = deriveStatuses([at(3, 'c3-p1', 0, 'dead'), at(1, 'c1-p4', 0, 'wounded')]);
    expect(now.get('e-qin')).toMatchObject({ status: 'dead', passage: { chapterNumber: 3 } });
    expect(deriveStatuses([at(1, 'c1-p4', 0, 'wounded')]).get('e-qin')?.status).toBe('wounded');
  });

  it('reaches the writer in its Appeared list, beside the look', () => {
    expect(presentAppearances({ entries: [{ name: 'Elder Qin', entity: 'character', status: 'dead', look: 'a stooped old man in grey' }] }))
      .toBe('- Elder Qin (character, dead): a stooped old man in grey');
  });
});

describe('status in the chapter flow', () => {
  const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-31T12:00:00.000Z', usage: { source: 'unavailable' as const } };
  const reply = (paragraphs: string[]) => writtenChapterReply(JSON.stringify({
    title: 'The Hall', paragraphs,
    arcCompletion: { goalId: 'arc-1', completed: false, evidence: '' }, recap: 'Ye Chen fights.', chapterFunction: 'progression',
    nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The hall.', nextConflict: 'A rival.',
  }));
  const ONE = 'Elder Qin took the blow meant for Ye Chen.';
  const TWO = 'Elder Qin did not rise again.';

  it('saves each status on its chapter, tells the tagger the status so far, and shows it on the Codex card', async () => {
    let ids = 0;
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
      rawProviderResponse: JSON.stringify({ notes: notesOfTaggedChapter(request.paragraphs.map(paragraph =>
        paragraph === ONE ? `[[appears: Elder Qin | character]] [[status: Elder Qin | wounded]] ${paragraph}`
          : paragraph === TWO ? `[[status: Elder Qin | dead]] ${paragraph}` : paragraph)) }),
      providerReceipt: receipt,
    }));
    const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      runtime: { now: () => '2026-10-31T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` },
      modelAdapter: {
        getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
        generate,
        arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
        tagChapter,
      },
    });
    await controller.hydrate();
    const story = await controller.createStory({
      premise: 'Ye Chen survives the sect.', destinedEnding: 'Ye Chen leads the sect.',
      initialArcPlan: { arcNumber: 1, goals: [{ id: 'arc-1', text: 'Survive.', chapters: 30 }] },
      cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
    });
    for (const paragraph of [ONE, TWO]) {
      generate.mockResolvedValueOnce({ rawProviderResponse: reply([paragraph]), providerReceipt: receipt });
      await controller.generateNextChapter(story.id, 'fixture');
    }

    const state = controller.snapshot();
    const [first, second] = state.chapters;
    const qin = state.codexEntries.find(entry => entry.name === 'Elder Qin')!;
    expect(first.statuses?.[0].payload).toMatchObject({ subject: { name: 'Elder Qin', entryId: qin.id }, status: 'wounded' });
    expect(second.statuses?.[0].payload).toMatchObject({ subject: { entryId: qin.id }, status: 'dead' });
    // The second chapter's tagger read the status so far, beside the name.
    const secondRequest = tagChapter.mock.calls[1][0];
    expect(secondRequest.subjects.find(subject => subject.name === 'Elder Qin')).toMatchObject({ status: 'wounded' });
    expect(buildHarnessTagPrompt(secondRequest).userPrompt).toContain('- Elder Qin — status: wounded');
    expect(buildHarnessTagPrompt(secondRequest).systemInstruction).toContain('[[status: Name | how they are now]]');
    // The Codex card shows how they are now, with the passage that showed it.
    const codex = deriveStoryCodex({ entries: state.codexEntries, chapters: state.chapters });
    expect(codex.characters.find(character => character.name === 'Elder Qin')?.status).toEqual({
      text: 'dead', passage: { chapterNumber: 2, blockId: 'c2-p1', text: TWO },
    });

    // Create mode keeps a status on its words, and an edit that drops it keeps the chapter's list, empty.
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs, statuses: second.statuses });
    expect(controller.snapshot().chapters[1].statuses).toEqual(second.statuses);
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs });
    expect(controller.snapshot().chapters[1].statuses).toEqual([]);
    await expect(controller.authorChapter(second.id, { paragraphs: ['Elder Qin rose again, unharmed.', ...second.paragraphs.slice(1)], statuses: second.statuses }))
      .rejects.toThrow(/must sit on its words/);

    // Rewriting the newest chapter: its tagger reads the status from the chapters before it, never the one it replaces.
    generate.mockResolvedValueOnce({ rawProviderResponse: reply([TWO]), providerReceipt: receipt });
    await controller.rewriteLatestChapter(story.id, 'fixture', 'Again.');
    const rewriteRequest = tagChapter.mock.calls.at(-1)![0];
    expect(rewriteRequest.subjects.find(subject => subject.name === 'Elder Qin')).toMatchObject({ status: 'wounded' });
  });
});

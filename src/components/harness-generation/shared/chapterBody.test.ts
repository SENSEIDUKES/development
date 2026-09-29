import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  createHarnessSenStory,
  exportHarnessStory,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationResponse,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import {
  HARNESS_CHAPTER_TARGET_MIN_WORDS,
  countHarnessWords,
  harnessChapterBody,
  normalizeHarnessParagraphs,
} from './chapterBody';
import { acceptHarnessModelResponse } from './responseAcceptance';
import type { HarnessRuntime } from './ids';

/**
 * The chapter body, end to end.
 *
 * `paragraphs` is the only model-authored chapter body; HARNESS derives the
 * prose and measures it, and the Reader shows one narration block per
 * paragraph. Short or unstructured output is always preserved and always
 * inspectable.
 */

const runtime = (): HarnessRuntime => {
  let id = 0;
  let time = 0;
  return {
    createId: prefix => `${prefix}_${++id}`,
    now: () => new Date(Date.UTC(2026, 8, 19, 12, 0, time++)).toISOString(),
  };
};

const response = (rawProviderResponse: string): HarnessGenerationResponse => ({
  rawProviderResponse,
  providerReceipt: {
    provider: 'gemini', model: 'google/gemini-3.1-flash-lite',
    generatedAt: '2026-09-19T12:00:00.000Z', durationMs: 42,
    usage: { source: 'reported', inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
});

const adapter = (...outputs: HarnessGenerationResponse[]) => {
  const generate = vi.fn(async () => {
    const output = outputs.shift();
    if (!output) throw new Error('No test provider response remains.');
    return output;
  });
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({
      provider: 'gemini', configured: true,
      models: [{ id: 'google/gemini-3.1-flash-lite', label: 'Gemini' }],
      defaultModel: 'google/gemini-3.1-flash-lite',
    }),
    generate,
    recoverMemory: async () => response(JSON.stringify({ events: [] })),
    arcOperation: async () => response(JSON.stringify({
      plan: { arcNumber: 1, goals: [{ id: 'arc-1-goal', text: 'Open the sect gate.', chapters: 100 }] },
      destinedEnding: 'Bring the story to its true conclusion.',
    })),
  };
  return { value, generate };
};

/** A body of the requested scale, so scale never masks a structural assertion. */
const fullLengthParagraphs = (lead: string[] = []): string[] => [
  ...lead,
  ...Array.from({ length: 40 }, (_, index) =>
    (`Paragraph ${index + 1}. ` + 'The courier counted the lanterns along the flooded causeway and found one short. '.repeat(4)).trim()),
];

const accept = (reply: Record<string, unknown>, chapterNumber = 1) => {
  const result = acceptHarnessModelResponse(JSON.stringify(reply), chapterNumber);
  if (!result.accepted) throw new Error(result.reason);
  return result;
};

describe('HARNESS chapter body', () => {
  it('treats paragraphs as the sole authoritative body and derives prose without changing paragraph text', () => {
    const paragraphs = ['She reached the gate at dusk.', '“Open it,” Mara said, and waited.', 'The bolt slid back.'];
    const accepted = accept({ paragraphs, prose: 'A competing body.', blocks: [{ type: 'paragraph', text: 'Another one.' }] });

    expect(accepted.draft.paragraphs).toEqual(paragraphs);
    expect(accepted.draft.prose).toBe(paragraphs.join('\n\n'));
    for (const paragraph of paragraphs) expect(accepted.draft.prose).toContain(paragraph);
    expect(JSON.stringify(accepted.draft)).not.toContain('A competing body');
    expect(JSON.stringify(accepted.draft)).not.toContain('Another one');
    expect(accepted.warnings.filter(warning => warning.code === 'competing_prose_ignored')).toHaveLength(2);
  });

  it('keeps every paragraph of a normal chapter in order, with no structural warning', () => {
    const paragraphs = fullLengthParagraphs();
    const accepted = accept({ paragraphs });

    expect(accepted.draft.paragraphs).toEqual(paragraphs);
    expect(accepted.draft.metrics.paragraphCount).toBe(paragraphs.length);
    expect(accepted.warnings.some(warning => warning.code === 'chapter_structure_quality')).toBe(false);
  });

  it('preserves a one-paragraph chapter and records an explicit structural-quality warning', () => {
    const single = ('The courier crossed the causeway alone. ' + 'She counted the lanterns as she went. '.repeat(30)).trim();
    const accepted = accept({ paragraphs: [single] });

    expect(accepted.draft.prose).toBe(single);
    expect(accepted.draft.paragraphs).toHaveLength(1);
    expect(accepted.draft.metrics.paragraphCount).toBe(1);
    const warning = accepted.warnings.find(item => item.code === 'chapter_structure_quality');
    expect(warning?.message).toContain('single paragraph');
  });

  it('counts words and paragraphs accurately, in English and in the story original language', () => {
    expect(countHarnessWords('One two three.')).toBe(3);
    expect(countHarnessWords('  spaced   out \n words ')).toBe(3);
    // CJK prose has no spaces; each character counts, so the scale target means
    // the same thing for a chapter written in the story's original language.
    expect(countHarnessWords('雨落在庭院里')).toBe(6);
    expect(countHarnessWords('Mara said 雨落')).toBe(4);

    const body = harnessChapterBody(['One two three.', 'Four five.']);
    expect(body.metrics).toEqual({ wordCount: 5, paragraphCount: 2, meetsScaleTarget: false });
  });

  it('preserves output below the scale target and marks it as failing, without rejecting it', () => {
    const accepted = accept({ paragraphs: ['Short opening.', 'Shorter still.'] });

    expect(accepted.draft.prose).toBe('Short opening.\n\nShorter still.');
    expect(accepted.draft.metrics.meetsScaleTarget).toBe(false);
    const warning = accepted.warnings.find(item => item.code === 'chapter_scale_below_target');
    expect(warning?.message).toContain(HARNESS_CHAPTER_TARGET_MIN_WORDS.toLocaleString());

    const full = accept({ paragraphs: fullLengthParagraphs() });
    expect(full.draft.metrics.wordCount).toBeGreaterThanOrEqual(HARNESS_CHAPTER_TARGET_MIN_WORDS);
    expect(full.draft.metrics.meetsScaleTarget).toBe(true);
    expect(full.warnings.some(item => item.code === 'chapter_scale_below_target')).toBe(false);
  });

  it('recovers a body from prose when the provider omits the paragraphs array', () => {
    const accepted = accept({ prose: 'First.\n\nSecond.' });
    expect(accepted.draft.paragraphs).toEqual(['First.', 'Second.']);
    expect(accepted.warnings.some(warning => warning.code === 'chapter_body_recovered')).toBe(true);
  });

  it('keeps plain-prose recovery available when the reply is not JSON at all', () => {
    const result = acceptHarnessModelResponse('The gate opened.\n\nShe stepped through.', 3);
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error(result.reason);
    expect(result.draft.responseMode).toBe('plain-prose-recovery');
    expect(result.draft.paragraphs).toEqual(['The gate opened.', 'She stepped through.']);
    expect(result.draft.metrics.paragraphCount).toBe(2);
  });

  it('splits a runaway single entry rather than collapsing the chapter into one paragraph', () => {
    expect(normalizeHarnessParagraphs(['One.\n\nTwo.\n\nThree.'])).toEqual(['One.', 'Two.', 'Three.']);
    expect(normalizeHarnessParagraphs([])).toBeUndefined();
    expect(normalizeHarnessParagraphs('not a list')).toBeUndefined();
  });
});

describe('HARNESS chapter body persistence', () => {
  const chapterReply = JSON.stringify({
    title: 'The Flooded Causeway',
    paragraphs: [
      'Mara reached the causeway at dusk, and the lanterns were already lit.',
      '“You are late,” Chen said from the gatehouse door.',
      'She counted the lanterns as she walked and found one short.',
    ],
    arcCompletion: { goalId: 'arc-1-goal', completed: false, evidence: '' },
  });

  const generateChapter = async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(chapterReply));
    const controller = new HarnessGenerationController({
      repository, modelAdapter: provider.value, runtime: runtime(),
    });
    await controller.hydrate();
    const story = await controller.createStory({
      premise: 'A courier returns to the drowned city that erased her name.',
      cast: [{ name: 'Mara', isMainCharacter: true }, { name: 'Chen', role: 'Gatekeeper' }],
    });
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');
    return { controller, repository, storyId: story.id };
  };

  it('persists derived prose, paragraphs and metrics through commit, reload, export and Reader adaptation', async () => {
    const { controller, repository, storyId } = await generateChapter();

    const committed = controller.snapshot().chapters[0];
    expect(committed.paragraphs).toHaveLength(3);
    expect(committed.prose).toBe(committed.paragraphs.join('\n\n'));
    expect(committed.metrics).toEqual({
      wordCount: countHarnessWords(committed.prose), paragraphCount: 3, meetsScaleTarget: false,
    });

    // Reload: a fresh controller over the same durable snapshot.
    const reloaded = new HarnessGenerationController({
      repository, modelAdapter: adapter().value, runtime: runtime(),
    });
    const reloadedState = await reloaded.hydrate();
    expect(reloadedState.chapters[0].paragraphs).toEqual(committed.paragraphs);
    expect(reloadedState.chapters[0].metrics).toEqual(committed.metrics);

    // Export carries the same accepted result.
    const exported = exportHarnessStory(reloadedState, storyId);
    expect(exported.chapters[0].paragraphs).toEqual(committed.paragraphs);
    expect(exported.chapters[0].metrics).toEqual(committed.metrics);
    expect(exported.attempts[0].acceptedDraft?.paragraphs).toEqual(committed.paragraphs);
    expect(exported.attempts[0].acceptedDraft?.metrics).toEqual(committed.metrics);

    // The Reader shows one narration block per paragraph, under the HARNESS's paragraph ids.
    const readerStory = createHarnessSenStory(reloadedState, storyId);
    const readerChapter = readerStory.arcs[0].chapters[0];
    expect(readerChapter.generatedContent).toBe(committed.prose);
    expect(readerChapter.blocks?.map(block => [block.id, block.type, block.text])).toEqual(
      committed.paragraphs.map((text, index) => [`c1-p${index + 1}`, 'narration', text]));
  });

  it('replays the same accepted result from the frozen raw response', async () => {
    const { controller, storyId } = await generateChapter();
    const before = controller.snapshot().chapters[0];

    const replayed = await controller.replayStory(storyId);
    const after = replayed.chapters[0];
    expect(after.paragraphs).toEqual(before.paragraphs);
    expect(after.prose).toBe(before.prose);
    expect(after.metrics).toEqual(before.metrics);
  });

  it('accepts a retried model request into the same body shape', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response('   '), response(chapterReply));
    const controller = new HarnessGenerationController({
      repository, modelAdapter: provider.value, runtime: runtime(),
    });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A courier returns to the drowned city.' });
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const failed = controller.snapshot().attempts.at(-1)!;
    expect(failed.stage).not.toBe('committed');

    const retried = await controller.retryModelRequest(failed.id);
    const chapter = retried.chapters.at(-1)!;
    expect(chapter.paragraphs).toHaveLength(3);
    expect(chapter.prose).toBe(chapter.paragraphs.join('\n\n'));
    expect(chapter.metrics.paragraphCount).toBe(3);
  });
});

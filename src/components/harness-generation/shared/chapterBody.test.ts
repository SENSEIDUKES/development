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
import { applyHarnessChapterSignals, readHarnessChapterSignals } from './chapterSignals';
import { acceptHarnessModelResponse } from './responseAcceptance';
import type { HarnessRuntime } from './ids';

/**
 * The repaired chapter body and effect placement, end to end.
 *
 * `paragraphs` is the only model-authored chapter body; HARNESS derives the
 * prose, builds one ordered SEN block per paragraph, splits those blocks at
 * exact anchored spans, and measures the result. Short or unstructured output
 * is always preserved and always inspectable.
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

/** The model-proposed cue intents a block carries before catalog resolution. */
const moments = (block: Record<string, unknown>) =>
  ((block.metadata as { audioMoments?: Array<Record<string, unknown>> } | undefined)?.audioMoments) ?? [];

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

  it('builds one ordered SEN block per paragraph for a normal chapter', () => {
    const paragraphs = fullLengthParagraphs();
    const accepted = accept({ paragraphs });

    expect(accepted.draft.blocks).toHaveLength(paragraphs.length);
    expect(accepted.draft.blocks?.map(block => block.text)).toEqual(paragraphs);
    expect(accepted.draft.blocks?.every(block => block.type === 'paragraph')).toBe(true);
    expect(accepted.warnings.some(warning => warning.code === 'chapter_structure_quality')).toBe(false);
  });

  it('preserves a one-paragraph chapter and records an explicit structural-quality warning', () => {
    const single = ('The courier crossed the causeway alone. ' + 'She counted the lanterns as she went. '.repeat(30)).trim();
    const accepted = accept({ paragraphs: [single] });

    expect(accepted.draft.prose).toBe(single);
    expect(accepted.draft.blocks).toHaveLength(1);
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

  it('splits a runaway single entry rather than collapsing the chapter into one block', () => {
    expect(normalizeHarnessParagraphs(['One.\n\nTwo.\n\nThree.'])).toEqual(['One.', 'Two.', 'Three.']);
    expect(normalizeHarnessParagraphs([])).toBeUndefined();
    expect(normalizeHarnessParagraphs('not a list')).toBeUndefined();
  });
});

describe('HARNESS precise dialogue', () => {
  const mixed = 'Mara stopped at the threshold. “You are late,” Chen said, without turning. “The gate closed an hour ago,” Lin added. Mara said nothing at all.';
  const cast = [{ name: 'Mara', role: 'Courier', isMainCharacter: true }, { name: 'Chen', role: 'Gatekeeper' }, { name: 'Lin' }];

  it('attributes three speakers in one paragraph to their exact spans and leaves narration as narration', () => {
    const result = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: [mixed, 'The lanterns guttered.'],
      dialogue: [
        { anchorText: '“You are late,”', speaker: 'Chen', delivery: 'spoken' },
        { anchorText: '“The gate closed an hour ago,”', speaker: 'Lin' },
      ],
    }), 5, { cast });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error(result.reason);

    const blocks = result.draft.blocks ?? [];
    expect(blocks.map(block => ({ type: block.type, text: block.text, speaker: block.metadata?.speakerName }))).toEqual([
      { type: 'paragraph', text: 'Mara stopped at the threshold.', speaker: undefined },
      { type: 'dialogue', text: '“You are late,”', speaker: 'Chen' },
      { type: 'paragraph', text: 'Chen said, without turning.', speaker: undefined },
      { type: 'dialogue', text: '“The gate closed an hour ago,”', speaker: 'Lin' },
      { type: 'paragraph', text: 'Lin added. Mara said nothing at all.', speaker: undefined },
      { type: 'paragraph', text: 'The lanterns guttered.', speaker: undefined },
    ]);
    // The cast supplies the role; the provider never does.
    expect(blocks[1].metadata).toMatchObject({ mode: 'dialogue', speakerRole: 'Gatekeeper', emotion: 'spoken' });
    expect(blocks[3].metadata?.speakerRole).toBeUndefined();
    // The chapter text is unchanged by the split.
    expect(blocks.map(block => block.text).join(' ')).toContain('Mara said nothing at all.');
    expect(result.draft.prose).toBe([mixed, 'The lanterns guttered.'].join('\n\n'));
  });

  it('never converts a whole mixed paragraph into one speaker', () => {
    const result = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: [mixed],
      dialogue: [{ anchorText: '“You are late,”', speaker: 'Chen' }],
    }), 5, { cast });
    if (!result.accepted) throw new Error(result.reason);
    const dialogueBlocks = (result.draft.blocks ?? []).filter(block => block.type === 'dialogue');
    expect(dialogueBlocks).toHaveLength(1);
    expect(dialogueBlocks[0].text).toBe('“You are late,”');
    expect(result.draft.blocks?.some(block => block.text === mixed)).toBe(false);
  });

  it('warns whenever a dialogue signal cannot be applied', () => {
    const result = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: [mixed],
      dialogue: [
        { anchorText: 'Never written in this chapter', speaker: 'Chen' },
        { anchorText: '“You are late,”', speaker: 'Chen' },
        { anchorText: '“You are late,”', speaker: 'Lin' },
      ],
    }), 5, { cast });
    if (!result.accepted) throw new Error(result.reason);
    const messages = result.warnings.map(warning => warning.message);
    expect(messages.some(message => message.includes('is not in this chapter'))).toBe(true);
    expect(messages.some(message => message.includes('already attributed to a speaker'))).toBe(true);
    expect((result.draft.blocks ?? []).filter(block => block.metadata?.speakerName === 'Lin')).toHaveLength(0);
  });
});

describe('HARNESS effect anchors', () => {
  it('matches straight and curly quotation marks and uneven whitespace without altering prose', () => {
    const paragraph = 'She raised her hand. “Not today,”\n  Mara said, and the bolt slid home.';
    const result = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: [paragraph],
      dialogue: [{ anchorText: '"Not today," Mara said', speaker: 'Mara' }],
    }), 2, { cast: [{ name: 'Mara' }] });
    if (!result.accepted) throw new Error(result.reason);

    const dialogueBlock = (result.draft.blocks ?? []).find(block => block.type === 'dialogue');
    // The stored span keeps the writer's own characters and line break.
    expect(dialogueBlock?.text).toBe('“Not today,”\n  Mara said');
    expect(result.draft.prose).toBe(paragraph);
    expect(result.warnings.some(warning => warning.message.includes('is not in this chapter'))).toBe(false);
  });

  it('places a repeated anchor by occurrenceIndex and rejects the same anchor without one', () => {
    const paragraphs = ['Lin waited while the gate creaked, and then the gate creaked again.', 'She stepped through.'];
    const cue = (occurrenceIndex?: number) => readHarnessChapterSignals({
      soundCues: [{
        anchorText: 'the gate creaked', category: 'artifacts', variation: 'creak',
        ...(occurrenceIndex === undefined ? {} : { occurrenceIndex }),
      }],
    }).signals;

    const ambiguous = applyHarnessChapterSignals(paragraphs, cue());
    expect(ambiguous.blocks.every(block => !block.metadata)).toBe(true);
    expect(ambiguous.warnings.some(warning => warning.message.includes('carries no occurrenceIndex'))).toBe(true);
    // A rejected signal never removes readable prose.
    expect(ambiguous.blocks.map(block => block.text)).toEqual(paragraphs);

    const first = applyHarnessChapterSignals(paragraphs, cue(0));
    expect(first.warnings).toEqual([]);
    expect(moments(first.blocks[0])[0]).toMatchObject({ triggerPhrase: 'the gate creaked', occurrenceIndex: 0 });

    const second = applyHarnessChapterSignals(paragraphs, cue(1));
    expect(second.warnings).toEqual([]);
    expect(moments(second.blocks[0])[0]).toMatchObject({ triggerPhrase: 'the gate creaked', occurrenceIndex: 1 });

    const outOfRange = applyHarnessChapterSignals(paragraphs, cue(7));
    expect(outOfRange.blocks.every(block => !block.metadata)).toBe(true);
    expect(outOfRange.warnings.some(warning => warning.message.includes('occurrenceIndex requires'))).toBe(true);
  });

  it('keeps a Sound Cue trigger at its own precise occurrence inside the block it lands in', () => {
    const paragraphs = [
      'Lin drew her blade, and Lin drew her blade once more for the crowd.',
      'Somewhere the bell rang, and then the bell rang again.',
    ];
    const { signals } = readHarnessChapterSignals({
      soundCues: [{ anchorText: 'the bell rang', category: 'locations', variation: 'ring', occurrenceIndex: 1 }],
    });
    const applied = applyHarnessChapterSignals(paragraphs, signals);

    // Occurrence 1 chapter-wide is occurrence 1 inside its own block, which is
    // the index the media resolver will use against that block's text.
    expect(applied.blocks[0].metadata).toBeUndefined();
    expect(moments(applied.blocks[1])[0]).toMatchObject({ triggerPhrase: 'the bell rang', occurrenceIndex: 1 });
  });

  it('rejects an anchor copied from an earlier chapter rather than placing it', () => {
    const result = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: ['Chapter two opens on the flooded causeway.'],
      manifestations: [{ anchorText: 'the drowned bell of Chapter One', name: 'Drowned Bell', type: 'artifact', mention: 'reference' }],
      dialogue: [{ anchorText: '“We sailed at dawn,” Mara said in the previous chapter', speaker: 'Mara' }],
    }), 2);
    if (!result.accepted) throw new Error(result.reason);
    expect(result.draft.blocks?.every(block => !block.metadata)).toBe(true);
    expect(result.warnings.filter(warning => warning.message.includes("is not in this chapter's paragraphs"))).toHaveLength(2);
    expect(result.draft.prose).toBe('Chapter two opens on the flooded causeway.');
  });

  it('lands manifestations and soundscapes on their own paragraphs', () => {
    const paragraphs = [
      'The causeway lanterns guttered in the wind above the water.',
      'Inside the hall, Iron-Hand Chen turned from the brazier.',
      'Rain hammered the roof of the drum tower.',
    ];
    const result = acceptHarnessModelResponse(JSON.stringify({
      paragraphs,
      manifestations: [
        { anchorText: 'Iron-Hand Chen', name: 'Iron-Hand Chen', type: 'character', mention: 'reveal' },
        { anchorText: 'the drum tower', name: 'Drum Tower', type: 'location', mention: 'reveal' },
      ],
      soundscapes: [
        { anchorText: 'The causeway lanterns guttered', mood: 'lonely', region: 'chinese', tags: ['wind'] },
        { anchorText: 'Rain hammered the roof', mood: 'tense', region: 'chinese', tags: ['rain'] },
      ],
    }), 2);
    if (!result.accepted) throw new Error(result.reason);
    const blocks = result.draft.blocks ?? [];

    expect(blocks[0].metadata?.music?.mood).toBe('lonely');
    expect(blocks[0].metadata?.entities).toBeUndefined();
    expect(blocks[1].metadata?.entities).toEqual([{ name: 'Iron-Hand Chen', type: 'character', mention: 'reveal' }]);
    expect(blocks[1].metadata?.music).toBeUndefined();
    expect(blocks[2].metadata?.entities).toEqual([{ name: 'Drum Tower', type: 'location', mention: 'reveal' }]);
    expect(blocks[2].metadata?.music?.mood).toBe('tense');
    // More than one soundscape now survives a single chapter.
    expect(blocks.filter(block => block.metadata?.music)).toHaveLength(2);
  });

  it('keeps System Panel splitting intact and never duplicates a panel', () => {
    const result = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: ['The bolt slid home. [Qi rose to twelve.] She breathed out.'],
      systemPanels: [
        { anchorText: '[Qi rose to twelve.]', presentation: 'mechanical', title: 'Breakthrough', meaning: 'breakthrough', entries: [{ label: 'Qi', value: '12' }] },
        { anchorText: 'She breathed out.', presentation: 'narrative', title: 'Second panel' },
      ],
    }), 2);
    if (!result.accepted) throw new Error(result.reason);
    const blocks = result.draft.blocks ?? [];

    expect(blocks.map(block => block.text)).toEqual(['The bolt slid home.', '[Qi rose to twelve.]', 'She breathed out.']);
    expect(blocks.filter(block => block.system)).toHaveLength(2);
    expect(blocks[1].system).toMatchObject({ kind: 'system_prompt', presentation: 'mechanical', promptType: 'breakthrough', title: 'Breakthrough' });
    // A second panel on the same block is refused, not stacked.
    const repeated = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: ['[Qi rose to twelve.]'],
      systemPanels: [
        { anchorText: '[Qi rose to twelve.]', presentation: 'narrative', title: 'First' },
        { anchorText: '[Qi rose to twelve.]', presentation: 'narrative', title: 'Second' },
      ],
    }), 2);
    if (!repeated.accepted) throw new Error(repeated.reason);
    expect((repeated.draft.blocks ?? []).filter(block => block.system)).toHaveLength(1);
  });

  it('never removes readable prose when every optional effect is malformed', () => {
    const paragraphs = ['She reached the gate at dusk.', 'The bolt slid back without a sound.'];
    const result = acceptHarnessModelResponse(JSON.stringify({
      paragraphs,
      dialogue: 'not a list',
      manifestations: [{ anchorText: 'the gate', name: 'Gate', type: 'not-a-type', mention: 'reveal' }],
      systemPanels: [{ anchorText: 'the gate', presentation: 'mechanical', title: 'No entries' }],
      soundscapes: [{ anchorText: 'nowhere in the prose', mood: 'tense' }],
      soundCues: [{ anchorText: 'the gate', category: 'unknown', variation: 'creak' }],
      creatureEvents: [{ anchorText: 'the gate', type: 'explode' }],
    }), 2);
    if (!result.accepted) throw new Error(result.reason);

    expect(result.draft.prose).toBe(paragraphs.join('\n\n'));
    expect(result.draft.blocks?.map(block => block.text)).toEqual(paragraphs);
    expect(result.draft.blocks?.every(block => !block.metadata && !block.system)).toBe(true);
    expect(result.warnings.every(warning => warning.code !== 'plain_prose_recovery')).toBe(true);
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
    dialogue: [{ anchorText: '“You are late,”', speaker: 'Chen', delivery: 'spoken' }],
    manifestations: [{ anchorText: 'Chen said from the gatehouse door', name: 'Chen', type: 'character', mention: 'reveal' }],
    soundscapes: [{ anchorText: 'the lanterns were already lit', mood: 'lonely', region: 'chinese', tags: ['wind'] }],
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

  it('persists derived prose, paragraphs, blocks, metrics and accepted effects through commit, reload, export and Reader adaptation', async () => {
    const { controller, repository, storyId } = await generateChapter();

    const committed = controller.snapshot().chapters[0];
    expect(committed.paragraphs).toHaveLength(3);
    expect(committed.prose).toBe(committed.paragraphs.join('\n\n'));
    expect(committed.metrics).toEqual({
      wordCount: countHarnessWords(committed.prose), paragraphCount: 3, meetsScaleTarget: false,
    });
    // Paragraph two split at the spoken span: speech, then its narration tail.
    expect(committed.blocks?.map(block => block.type)).toEqual(['paragraph', 'dialogue', 'paragraph', 'paragraph']);
    expect(committed.blocks?.[1]).toMatchObject({ text: '“You are late,”', metadata: { speakerName: 'Chen', speakerRole: 'Gatekeeper' } });
    expect(committed.blocks?.[2].metadata?.entities).toEqual([{ name: 'Chen', type: 'character', mention: 'reveal' }]);
    expect(committed.blocks?.[0].metadata?.music?.mood).toBe('lonely');

    // Reload: a fresh controller over the same durable snapshot.
    const reloaded = new HarnessGenerationController({
      repository, modelAdapter: adapter().value, runtime: runtime(),
    });
    const reloadedState = await reloaded.hydrate();
    expect(reloadedState.chapters[0].paragraphs).toEqual(committed.paragraphs);
    expect(reloadedState.chapters[0].metrics).toEqual(committed.metrics);
    expect(reloadedState.chapters[0].blocks).toEqual(committed.blocks);

    // Export carries the same accepted result.
    const exported = exportHarnessStory(reloadedState, storyId);
    expect(exported.chapters[0].paragraphs).toEqual(committed.paragraphs);
    expect(exported.chapters[0].metrics).toEqual(committed.metrics);
    expect(exported.attempts[0].acceptedDraft?.paragraphs).toEqual(committed.paragraphs);
    expect(exported.attempts[0].acceptedDraft?.metrics).toEqual(committed.metrics);

    // Reader adaptation copies the HARNESS blocks through unchanged.
    const readerStory = createHarnessSenStory(reloadedState, storyId);
    const readerChapter = readerStory.arcs[0].chapters[0];
    expect(readerChapter.generatedContent).toBe(committed.prose);
    expect(readerChapter.blocks?.map(block => block.text)).toEqual(committed.blocks?.map(block => block.text));
    expect(readerChapter.blocks?.map(block => block.type)).toEqual(['paragraph', 'dialogue', 'paragraph', 'paragraph']);
  });

  it('replays the same accepted result from the frozen raw response', async () => {
    const { controller, storyId } = await generateChapter();
    const before = controller.snapshot().chapters[0];

    const replayed = await controller.replayStory(storyId);
    const after = replayed.chapters[0];
    expect(after.paragraphs).toEqual(before.paragraphs);
    expect(after.prose).toBe(before.prose);
    expect(after.metrics).toEqual(before.metrics);
    expect(after.blocks).toEqual(before.blocks);
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

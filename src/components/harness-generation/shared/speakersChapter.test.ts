import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationResponse,
} from '@seihouse/sen/harness-generation';
import { buildReadAloudScript } from '@seihouse/sen/reader-runtime';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { harnessParagraphBlockId } from './chapterBody';
import { acceptHarnessModelResponse } from './responseAcceptance';
import { planEveryChapter } from '../../../test-utils/chapterPlan';

/**
 * Dialogue speakers, end to end, in the tiny SEN language: the writer tags who
 * speaks, the main character with their own tag; the HARNESS strips every tag,
 * finds each spoken line, saves one speaker record per line (a name tag is
 * also checked against the frozen Story Information), and Read Aloud gives
 * each line its voice.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Hold the river gate.', chapters: 30 }] };
const response = (rawProviderResponse: string): HarnessGenerationResponse => ({
  rawProviderResponse,
  providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' } },
});
const adapter = (raw: string) => {
  const generate = vi.fn(async () => response(writtenChapterReply(raw)));
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate,
    planChapter: planEveryChapter(),
    arcOperation: async () => response(JSON.stringify({ plan: GOAL, destinedEnding: 'Wei Lin keeps the river gate.' })),
  };
  return { value, generate };
};

const taggedChapter = () => JSON.stringify({
  title: 'The River Gate',
  paragraphs: [
    'Rain hammered the river gate.',
    '[[@MC]] “Hold the gate,” he said, and drew his sword.',
    '[[@Elder Mo]] “It will not hold.” The old man did not move.',
    '[[@Wei]] “Then I will.”',
    '“Who goes there?” a voice called from the dark.',
    '[[@Nobody At All]]',
  ],
  recap: '[[@Wei Lin]] Wei Lin held the gate.',
  nextProgression: 'Wei Lin trains.', nextWorldBuilding: 'The river law.', nextConflict: 'The flood returns.',
});

const createStory = async (controller: HarnessGenerationController) => {
  await controller.hydrate();
  return controller.createStory({
    premise: 'Wei Lin holds a river gate against a flood spirit.',
    destinedEnding: 'Wei Lin keeps the river gate.',
    initialArcPlan: GOAL,
    cast: [{ name: 'Wei Lin', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }, { name: 'Elder Mo', role: 'Mentor' }],
  });
};

describe('HARNESS dialogue speakers through speaker tags', () => {
  it('saves who speaks each spoken line, strips every tag, flags what it could not place, and survives reload', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = new HarnessGenerationController({ repository, modelAdapter: adapter(taggedChapter()).value });
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'fixture');

    const state = controller.snapshot();
    const chapter = state.chapters[0];
    // No tag reaches the prose, the recap, or anything a reader or the next chapter sees.
    expect(JSON.stringify(state.chapters)).not.toMatch(/\[\[@|\[\[/);
    expect(chapter.paragraphs[1]).toBe('“Hold the gate,” he said, and drew his sword.');
    expect(chapter.recap?.text).toBe('Wei Lin held the gate.');
    expect(chapter.speakers?.map(record => [record.id, record.anchor.selectedText, record.payload.speaker, record.payload.protagonist])).toEqual([
      // The main character's own tag, saved under the name the story gives them.
      ['speaker:c1-p2:0-16', '“Hold the gate,”', 'Wei Lin', true],
      ['speaker:c1-p3:0-19', '“It will not hold.”', 'Elder Mo', false],
      // A name tag still counts: one word of the main character's name, shared with no one else.
      ['speaker:c1-p4:0-14', '“Then I will.”', 'Wei', true],
    ]);
    expect(state.attempts[0].warnings.filter(warning => warning.code === 'speaker_tags_incomplete').map(warning => warning.message)).toEqual([
      '1 spoken line had no speaker tag; Read Aloud takes the speaker from the narration; 1 speaker tag named no spoken line.',
    ]);

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter('{}').value });
    await reloaded.hydrate();
    const saved = reloaded.snapshot().chapters[0];
    expect(saved.speakers).toEqual(chapter.speakers);

    // Read Aloud: the main character's lines in the Protagonist voice, everyone else's in the Side voice,
    // and a line nobody tagged whose narration names no one in production's voice, the main character's.
    const script = buildReadAloudScript({
      chapterNumber: 1, title: saved.title, language: 'en', speakers: saved.speakers,
      paragraphs: saved.paragraphs.map((text, index) => ({ id: harnessParagraphBlockId(1, index), text })),
    });
    const voices = script.lines.filter(line => line.role !== 'narrator').map(line => [line.text, line.role, line.speaker]);
    expect(voices).toEqual([
      ['“Hold the gate,”', 'protagonist', 'Wei Lin'],
      ['“It will not hold.”', 'side', 'Elder Mo'],
      ['“Then I will.”', 'protagonist', 'Wei'],
      ['“Who goes there?”', 'protagonist', undefined],
    ]);
  });

  it('places the same speakers on every re-acceptance, and none from plain-prose recovery', () => {
    const raw = taggedChapter();
    const options = { protagonistNames: { names: ['Wei Lin'], others: ['Elder Mo'] } };
    expect(acceptHarnessModelResponse(raw, 1, options)).toEqual(acceptHarnessModelResponse(raw, 1, options));
    const recovered = acceptHarnessModelResponse('Rain fell.\n\n[[@Wei Lin]] “Hold the gate,” he said.', 1, options);
    expect(recovered.accepted && recovered.draft).toMatchObject({ responseMode: 'plain-prose-recovery', paragraphs: ['Rain fell.', '“Hold the gate,” he said.'] });
    expect(recovered.accepted && recovered.draft.speakers).toBeUndefined();
  });

  it('reads each paragraph\'s speaker field (SENSEI, 2026-10-19), and keeps a tag the writer still wrote', () => {
    const raw = JSON.stringify({
      ...JSON.parse(taggedChapter()),
      paragraphs: [
        { speaker: '', text: 'Rain hammered the river gate.' },
        { speaker: 'MC', text: '“Hold the gate,” he said, and drew his sword.' },
        { speaker: 'Elder Mo', text: '“It will not hold,” the old man said.' },
        // A speaker on narration has no line to voice; "narrator" is no one.
        { speaker: 'Elder Mo', text: 'The old man turned away.' },
        { speaker: 'narrator', text: '“Who goes there?” a voice called.' },
        { speaker: 'Wei Lin', text: '[[@Elder Mo]] “Again,” said Elder Mo.' },
      ],
    });
    const accepted = acceptHarnessModelResponse(raw, 1, { protagonistNames: { names: ['Wei Lin'], others: ['Elder Mo'] }, speakersExpected: true });
    expect(accepted.accepted && accepted.draft.paragraphs).toEqual([
      'Rain hammered the river gate.', '“Hold the gate,” he said, and drew his sword.', '“It will not hold,” the old man said.',
      'The old man turned away.', '“Who goes there?” a voice called.', '“Again,” said Elder Mo.',
    ]);
    expect(accepted.accepted && accepted.draft.speakers?.map(record => [record.anchor.blockId, record.payload.speaker, record.payload.protagonist])).toEqual([
      ['c1-p2', 'Wei Lin', true],
      ['c1-p3', 'Elder Mo', false],
      ['c1-p6', 'Elder Mo', false],
    ]);
  });

  it('drops a paragraph that is only a broken tag, and saves a plain-prose chapter that opens with a tag', () => {
    // GPT-6 Luna wrote "[[\u0000]]" between paragraphs 28 times in the Diner test.
    const raw = JSON.stringify({ ...JSON.parse(taggedChapter()), paragraphs: ['[[soundscape: Ambient | dark | calm | low]] Rain fell.', '[[\u0000]]', '[[]]', 'The gate held.'] });
    const accepted = acceptHarnessModelResponse(raw, 1, {});
    expect(accepted.accepted && accepted.draft.paragraphs).toEqual(['Rain fell.', 'The gate held.']);
    // Claude Haiku answered a rewrite in plain prose opening with its music tag; it was lost as "a broken JSON array".
    const prose = acceptHarnessModelResponse('[[soundscape: Ambient | dark | calm | low]] Rain fell on the gate.\n\nThe gate held.', 1, {});
    expect(prose.accepted && prose.draft).toMatchObject({ responseMode: 'plain-prose-recovery', paragraphs: ['Rain fell on the gate.', 'The gate held.'] });
    expect(acceptHarnessModelResponse('[1, 2, 3]', 1, {}).accepted).toBe(false);
  });

  it('stays quiet about untagged speech in a chapter that was never asked for tags', () => {
    const raw = JSON.stringify({ ...JSON.parse(taggedChapter()), paragraphs: ['“Who goes there?” a voice called.'] });
    const accepted = acceptHarnessModelResponse(raw, 1, {});
    expect(accepted.accepted && accepted.warnings.map(warning => warning.code)).not.toContain('speaker_tags_incomplete');
    const expected = acceptHarnessModelResponse(raw, 1, { speakersExpected: true });
    expect(expected.accepted && expected.warnings.find(warning => warning.code === 'speaker_tags_incomplete')?.message)
      .toBe('1 spoken line had no speaker tag; Read Aloud takes the speaker from the narration.');
  });
});

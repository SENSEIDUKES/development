import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  deriveStoryCodex,
  notesOfTaggedChapter,
  placeSettings,
  readSettingTag,
  settingAt,
  settingLine,
  type HarnessGenerationModelAdapter,
  type HarnessTagRequest,
} from '@seihouse/sen/harness-generation';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { readMarks } from '../../../narrative/marks';
import type { SettingAttachment, SettingPayload } from '../../../narrative/settings';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { acceptChapterTags } from './responseAcceptance';

/**
 * Setting (SENSEI, 2026-11-10, in place of the planned Scene tag): when it is
 * and what it is like, tagged only where the prose says so. Its time of day,
 * conditions and season come from fixed lists a view can draw; the novel's
 * own words stay beside them. It belongs to its chapter: no Codex card, and
 * nothing of it crosses into the next chapter but where that chapter ended,
 * for the writer.
 */

const tag = (text: string) => readMarks(text).wordTags[0];
const setting = (blockId: string, start: number, payload: Omit<SettingPayload, 'origin'>): SettingAttachment => ({
  id: `setting:${blockId}:${start}-${start + 1}:0`, kind: 'setting',
  anchor: { level: 'span', blockId, startOffset: start, endOffset: start + 1, selectedText: 'x' },
  payload: { origin: 'harness', ...payload },
});

describe('reading setting tags', () => {
  it('matches each part to the fixed lists in any order, keeps the rest as the novel\'s own words, and leaves the prose as it was', () => {
    const reading = readMarks('[[setting: snow | Night | heavy snow under a blood moon]] Snow fell on the sect.');
    expect(reading.text).toBe('Snow fell on the sect.');
    expect(readSettingTag(reading.wordTags[0])).toEqual({ ok: true, setting: { time: 'night', conditions: 'snow', words: 'heavy snow under a blood moon' } });
    // Other words for a list value, and the tag's other spellings, read the same.
    expect(readSettingTag(tag('[[weather: Blizzard | fall | evening]] The wind rose.'))).toEqual({ ok: true, setting: { time: 'dusk', conditions: 'snow', season: 'autumn' } });
    expect(readSettingTag(tag('[[time: midday]] The sun was high.'))).toEqual({ ok: true, setting: { time: 'day' } });
  });

  it('reads one part alone, so a time jump is a setting of its own', () => {
    const reading = readMarks('[[setting: three years later]] Three years passed.');
    expect(reading.wordTagIssues).toEqual([]);
    expect(readSettingTag(reading.wordTags[0])).toEqual({ ok: true, setting: { words: 'three years later' } });
  });

  it('keeps a second word for a filled slot as the novel\'s own, and sets aside a tag that tells what happened', () => {
    expect(readSettingTag(tag('[[setting: snow | wind]] It was cold.'))).toEqual({ ok: true, setting: { conditions: 'snow', words: 'wind' } });
    expect(readSettingTag(tag('[[setting: night | the elders gathered in the hall and argued until the candles burned out]] They argued.'))).toMatchObject({ ok: false });
    expect(readMarks('[[setting: ]] Nothing.').wordTagIssues).toEqual([{ kind: 'incomplete', word: 'setting' }]);
  });

  it('places each on the sentence its tag points at, puts no word back into the prose, and flags one it cannot read as a setting', () => {
    const reading = readMarks('The bell rang. [[setting: dawn | fog]] Mist hid the gate at first light.');
    const placed = placeSettings({ paragraphs: [{ blockId: 'c1-p1', text: reading.text, wordTags: reading.wordTags }] });
    expect(placed.problems).toEqual([]);
    expect(placed.settings[0]).toMatchObject({
      kind: 'setting', anchor: { blockId: 'c1-p1', selectedText: 'Mist hid the gate at first light.' },
      payload: { origin: 'harness', time: 'dawn', conditions: 'fog' },
    });
    const warnings: Parameters<typeof acceptChapterTags>[2] = [];
    const tags = acceptChapterTags(['They walked on [[setting: night]] in silence. [[setting: night | the elders gathered in the hall and argued until the candles burned out]] Lin ran.'], 1, warnings);
    expect(tags.paragraphs).toEqual(['They walked on in silence. Lin ran.']);
    expect(tags.settings.map(record => record.payload)).toEqual([{ origin: 'harness', time: 'night' }]);
    expect(warnings.map(warning => warning.code)).toEqual(['setting_tags_incomplete']);
  });
});

describe('what it is like at a point of a chapter', () => {
  const chapter = { settings: [
    setting('c3-p2', 0, { time: 'dusk', conditions: 'snow', words: 'snow on the eaves' }),
    setting('c3-p0', 4, { season: 'winter' }),
    setting('c3-p5', 10, { time: 'night', words: 'a red moon' }),
  ] };

  it('adds the chapter\'s settings up in reading order: each part holds until named again, the own words only from the latest', () => {
    expect(settingAt(chapter, { blockId: 'c3-p0', offset: 0 })).toBeUndefined();
    expect(settingAt(chapter, { blockId: 'c3-p3', offset: 0 })).toEqual({ season: 'winter', time: 'dusk', conditions: 'snow', words: 'snow on the eaves' });
    expect(settingAt(chapter)).toEqual({ season: 'winter', time: 'night', conditions: 'snow', words: 'a red moon' });
    expect(settingLine(settingAt(chapter))).toBe('night · snow · winter · a red moon');
    expect(settingLine(settingAt({}))).toBe('');
  });
});

describe('settings in the chapter flow', () => {
  const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-11-10T12:00:00.000Z', usage: { source: 'unavailable' as const } };
  const reply = (paragraphs: string[], recap: string) => writtenChapterReply(JSON.stringify({
    title: 'The Snow', paragraphs,
    arcCompletion: { goalId: 'arc-1', completed: false, evidence: '' }, recap, chapterFunction: 'progression',
    nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The sect.', nextConflict: 'A rival.',
  }));
  const ONE = 'Snow fell all night over the outer court, and the moon was red.';
  const TWO = 'By morning the snow had stopped.';

  it('saves each setting on its chapter, never on a Codex card, and tells the next writer only where the chapter ended', async () => {
    let ids = 0;
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
      rawProviderResponse: JSON.stringify({ notes: notesOfTaggedChapter(request.paragraphs.map(paragraph =>
        paragraph === ONE ? `[[setting: night | snow | a red moon]] ${paragraph}` : paragraph)) }),
      providerReceipt: receipt,
    }));
    const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      runtime: { now: () => '2026-11-10T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` },
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
    generate.mockResolvedValueOnce({ rawProviderResponse: reply([ONE], 'Snow falls.'), providerReceipt: receipt });
    await controller.generateNextChapter(story.id, 'fixture');
    generate.mockResolvedValueOnce({ rawProviderResponse: reply([TWO], 'Morning comes.'), providerReceipt: receipt });
    await controller.generateNextChapter(story.id, 'fixture');

    const state = controller.snapshot();
    const [first, second] = state.chapters;
    expect(first.settings?.map(record => [record.anchor.selectedText, record.payload])).toEqual([[ONE, { origin: 'harness', time: 'night', conditions: 'snow', words: 'a red moon' }]]);
    // The second chapter's prose never said when it was: it has no setting, and nothing carried in.
    expect(second.settings).toEqual([]);
    expect(settingAt(second)).toBeUndefined();
    // The second chapter's writer read where the first one ended, beside its recap.
    expect(generate.mock.calls[1][0].storyInformation.previouslyOn).toEqual([{ chapterNumber: 1, title: 'The Snow', recap: 'Snow falls.', endedIn: 'night · snow · a red moon' }]);
    // The tagger is taught the tag, with the fixed lists, and nothing of a setting is listed beside a name.
    const prompt = buildHarnessTagPrompt(tagChapter.mock.calls[1][0]);
    expect(prompt.systemInstruction).toContain('[[setting: one or more of the words below');
    expect(prompt.systemInstruction).toContain('CONDITIONS: clear, cloudy, rain, storm, snow, fog, wind');
    expect(prompt.userPrompt).not.toContain('a red moon');
    // No Codex card carries a setting.
    expect(JSON.stringify(deriveStoryCodex({ entries: state.codexEntries, chapters: state.chapters }))).not.toContain('a red moon');

    // Create mode keeps a setting on its words, and an edit that drops it keeps the chapter's list, empty.
    const firstChapterSettings = first.settings;
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs, settings: [{ ...firstChapterSettings![0], id: 'setting:c2-p1:0-31:0', anchor: { level: 'span', blockId: 'c2-p1', startOffset: 0, endOffset: TWO.length, selectedText: TWO } }] });
    expect(controller.snapshot().chapters[1].settings?.map(record => record.payload.time)).toEqual(['night']);
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs });
    expect(controller.snapshot().chapters[1].settings).toEqual([]);
  });
});

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { installOfficialCapaSkillsInMemory } from '../../../host/generation/capa/officialCapaSkills';
import { RIGHT_TO_LEFT_STORY_TITLE, buildRightToLeftStory } from './rightToLeftSample';
import { loadSampleStory } from './sampleStory';

let story: HarnessWorkspaceState;

beforeAll(async () => {
  const skills = await installOfficialCapaSkillsInMemory(async definition =>
    new Uint8Array(await readFile(path.resolve(__dirname, '../../../host/generation/capa/official-capa', definition.archiveFile))));
  story = await buildRightToLeftStory(await loadSampleStory(), skills);
});

describe('the right-to-left story', () => {
  it('is an Arabic story with both chapters written through the HARNESS', () => {
    expect(story.stories.map(entry => [entry.title, entry.originalLanguage])).toEqual([[RIGHT_TO_LEFT_STORY_TITLE, 'ar']]);
    const chapters = story.chapters.sort((left, right) => left.chapterNumber - right.chapterNumber);
    expect(chapters.map(chapter => chapter.title)).toEqual(['الصدأ والشقوق', 'تقسية عظم الصدع']);
    for (const chapter of chapters) {
      // Long enough to be saved: a reply under a quarter of the chapter minimum is a failed write.
      expect(chapter.metrics.wordCount).toBeGreaterThan(450);
      expect(chapter.prose).not.toContain('[[');
    }
  });

  it('places its Sound Cues, speakers and holdings on Arabic words', () => {
    const [first, second] = story.chapters.sort((left, right) => left.chapterNumber - right.chapterNumber);
    expect(first.soundCues?.map(cue => [cue.payload.sound, cue.anchor.selectedText])).toEqual([
      ['rattle', 'تدحرجت الحصى السائبة على الحافة'],
      ['metal scrape', 'احتكّت أحذية حديدية بالصخر الأردوازي'],
      ['bell rings', 'دقّ جرس الإنذار في أعلى الوادي'],
    ]);
    expect(second.soundCues?.map(cue => cue.payload.sound)).toEqual(['chime', 'power up', 'metal scrape', 'bell rings']);
    // Each cue sits on the very words it names.
    for (const chapter of [first, second]) {
      for (const cue of chapter.soundCues ?? []) {
        const paragraph = chapter.paragraphs[Number(cue.anchor.blockId.split('-p')[1]) - 1];
        expect(paragraph.slice(cue.anchor.startOffset, cue.anchor.endOffset)).toBe(cue.anchor.selectedText);
      }
    }
    // [[@MC]] is saved under the main character's name; other tags under the Arabic names the writer used.
    expect(new Set(first.speakers?.map(line => line.payload.speaker))).toEqual(new Set(['سونغ شياوتيان', 'Gu Chen', 'المشرف لو']));
    expect(first.closingHoldings).toEqual(expect.arrayContaining(['سلك نحاسي', 'معول حديدي']));
  });
});

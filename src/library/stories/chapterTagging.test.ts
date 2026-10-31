import { describe, expect, it } from 'vitest';
import type { HarnessChapter } from '@seihouse/sen/harness-generation';
import { chapterTagMarks, describeChapterTagging, storyTaggingSummary, type ChapterTaggingKind } from './chapterTagging';

/**
 * The tagging record in words for the page (docs/create-hub.md, phase B,
 * decision 4): a quiet chapter and a failed one never look alike, and a kind
 * the tagger was never taught says so instead of "found nothing".
 */

type Chapter = Parameters<typeof describeChapterTagging>[0];
const AT = '2026-10-29T18:30:00.000Z';
const provenance = { catalogId: 'library', version: '1.0.0' };
const bare: HarnessChapter['mediaLoadout'] = { capturedAt: AT, soundscapes: [], soundCues: [] };
const equipped: HarnessChapter['mediaLoadout'] = {
  capturedAt: AT,
  soundscapes: [],
  sounds: [{ word: 'beast roar' }],
  soundCues: [{ cue: { id: 'roar', public_url: 'https://cdn.example.com/roar.mp3', metadata: { sound: 'beast roar' } } as never, provenance }],
  atmospheres: [{ id: 'bed-rain', word: 'gentle rain', label: 'Gentle Rain' }],
};
const chapter = (over: Partial<Chapter>): Chapter => ({ mediaLoadout: bare, ...over });
const kinds = (account: ReturnType<typeof describeChapterTagging>) => Object.fromEntries(account.kinds.map(line => [line.kind, [line.state, line.said]]));

describe('a chapter\'s tagging record, in words', () => {
  it('says plainly when a chapter was never tagged', () => {
    const account = describeChapterTagging(chapter({}));
    expect(account).toEqual({ status: 'untagged', headline: 'Not tagged yet.', kinds: [], problems: [] });
  });

  it('says who did not read it and why, with the notes it counted', () => {
    const account = describeChapterTagging(chapter({
      tagging: { status: 'failed', at: AT, model: 'cheap-model', problem: 'The tagger is unreachable.', notes: { written: 3, placed: 0 } },
    }), { locale: 'en-US' });
    expect(account.status).toBe('failed');
    expect(account.headline).toMatch(/^Not read by cheap-model · /);
    expect(account.problem).toBe('The tagger is unreachable.');
    expect(account.notes).toBe('3 notes written · 0 placed · 3 dropped');
    expect(account.kinds).toEqual([]);
  });

  it('tells a kind the tagger was never taught from one it found nothing for', () => {
    const account = describeChapterTagging(chapter({
      tagging: { status: 'tagged', at: AT, model: 'fixture', notes: { written: 0, placed: 0 }, providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: AT, usage: { source: 'reported', inputTokens: 5012, outputTokens: 1488 } } },
      soundCues: [], speakers: [], holdingChanges: undefined, appearances: [],
    }), { locale: 'en-US' });
    expect(account.headline).toMatch(/^Read by fixture · .* · 5,012 tokens in, 1,488 out$/);
    expect(account.notes).toBe('0 notes written · 0 placed');
    expect(kinds(account)).toEqual({
      'Soundscape and atmosphere': ['not-asked', 'No soundscapes or atmospheres were equipped, so none were asked for.'],
      'Sound Cues': ['not-asked', 'No Sound Words were equipped, so no cues were asked for.'],
      Speakers: ['nothing', 'The tagger found nothing here.'],
      Holdings: ['nothing', 'The tagger found nothing here.'],
      Appearances: ['nothing', 'The tagger found nothing here.'],
      Status: ['not-asked', 'Tagged before Status existed: tag it again to read it.'],
    });
  });

  it('names what landed per kind, by the names the Codex knows, and what was set aside', () => {
    const entries = [{ id: 'e-mc', name: 'Ye Chen' }, { id: 'e-sword', name: 'Rusted Iron Sword' }];
    const account = describeChapterTagging(chapter({
      mediaLoadout: equipped,
      tagging: {
        status: 'tagged', at: AT, model: 'fixture', notes: { written: 6, placed: 5 },
        warnings: [
          { code: 'tag_note_dropped', message: 'Dropped 1 of the tagger\'s 6 notes: [[@MC]] on paragraph 9: the paragraph has no such words.' },
          { code: 'sound_cue_set_aside', message: 'Set aside 1 sound tag: no recording answers "bell toll".' },
        ],
      },
      scene: { atmosphere: 'bed-rain' },
      soundCues: [],
      speakers: [
        { payload: { origin: 'harness', speaker: 'Ye Chen', protagonist: true } },
        { payload: { origin: 'harness', speaker: 'Elder Qin', protagonist: false } },
        { payload: { origin: 'harness', speaker: 'Ye Chen', protagonist: true } },
      ] as never,
      holdingChanges: [{ payload: { origin: 'harness', verb: 'gained', holder: { name: 'MC', entryId: 'e-mc' }, target: { name: 'MC\'s sword', entryId: 'e-sword' } } }] as never,
      appearances: [{ payload: { origin: 'harness', event: 'appears', entity: 'character', subject: { name: 'MC', entryId: 'e-mc' } } }] as never,
      statuses: [{ payload: { origin: 'harness', subject: { name: 'Elder Qin' }, status: 'dead' } }] as never,
    }), { entries, locale: 'en-US' });
    expect(account.notes).toBe('6 notes written · 5 placed · 1 dropped');
    expect(kinds(account)).toEqual({
      'Soundscape and atmosphere': ['found', 'Atmosphere: Gentle Rain'],
      'Sound Cues': ['set-aside', 'Set aside 1 sound tag: no recording answers "bell toll".'],
      Speakers: ['found', '3 spoken lines: Ye Chen, Elder Qin'],
      Holdings: ['found', '1 change: gained Rusted Iron Sword'],
      Appearances: ['found', '1 appearance: Ye Chen'],
      Status: ['found', '1 status: Elder Qin dead'],
    });
    expect(account.problems).toEqual([
      'Dropped 1 of the tagger\'s 6 notes: [[@MC]] on paragraph 9: the paragraph has no such words.',
      'Set aside 1 sound tag: no recording answers "bell toll".',
    ]);
  });

  it('lights each kind of tag on the words it was placed on, and the scene on the first word', () => {
    const anchor = (blockId: string, start: number, end: number, text: string) => ({ level: 'span' as const, blockId, startOffset: start, endOffset: end, selectedText: text });
    const chapter = {
      chapterNumber: 2,
      paragraphs: ['“Hold.” Ye Chen lifted the blade.', 'The beast roared.'],
      scene: { atmosphere: 'bed-rain' },
      speakers: [{ id: 'sp1', anchor: anchor('c2-p1', 0, 7, '“Hold.”') }],
      soundCues: [{ id: 'sc1', anchor: anchor('c2-p2', 10, 16, 'roared') }],
      holdingChanges: [{ id: 'hc1', anchor: anchor('c2-p1', 8, 33, 'Ye Chen lifted the blade.') }],
      appearances: [{ id: 'ap1', anchor: { level: 'span' as const, detached: true as const, blockId: 'c2-p1', startOffset: 0, endOffset: 1, selectedText: '“' } }],
    } as unknown as Parameters<typeof chapterTagMarks>[0];
    const all = new Set<ChapterTaggingKind>(['Soundscape and atmosphere', 'Sound Cues', 'Speakers', 'Holdings', 'Appearances']);
    const marks = chapterTagMarks(chapter, all);
    // The scene first, on the first word (the quotation mark is skipped); a detached span has no place on the page.
    expect(marks.map(mark => [mark.id, mark.selection.blockId, mark.selection.selectedText])).toEqual([
      ['mark:scene', 'c2-p1', 'Hold'],
      ['mark:sc1', 'c2-p2', 'roared'],
      ['mark:sp1', 'c2-p1', '“Hold.”'],
      ['mark:hc1', 'c2-p1', 'Ye Chen lifted the blade.'],
    ]);
    expect(new Set(marks.map(mark => mark.tone)).size).toBe(4);
    expect(chapterTagMarks(chapter, new Set<ChapterTaggingKind>(['Speakers'])).map(mark => mark.id)).toEqual(['mark:sp1']);
    expect(chapterTagMarks(chapter, new Set())).toEqual([]);
  });

  it('sums a story\'s chapters for the Chapters card', () => {
    expect(storyTaggingSummary([])).toBe('No chapters yet');
    expect(storyTaggingSummary([{ tagging: { status: 'tagged', at: AT } }])).toBe('1 chapter · 1 tagged');
    expect(storyTaggingSummary([
      { tagging: { status: 'tagged', at: AT } }, { tagging: { status: 'failed', at: AT } }, {}, {},
    ])).toBe('4 chapters · 1 tagged · 1 not read · 2 not tagged yet');
  });
});

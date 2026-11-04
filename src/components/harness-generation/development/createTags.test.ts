import { describe, expect, it } from 'vitest';
import { createTagRows, litKinds, nextLit, type CreateTagKind } from './createTags';
import type { ChapterTaggingAccount } from '../shared/chapterTagging';

const none: Record<CreateTagKind, number> = { soundscape: 0, atmosphere: 0, cues: 0, speakers: 0, holdings: 0, appearances: 0, status: 0, place: 0 };

describe('Create mode\'s tags', () => {
  it('lights every kind, one kind alone, or none, and a second tap lights them all again', () => {
    expect(litKinds('all')).toEqual(['soundscape', 'atmosphere', 'cues', 'speakers', 'holdings', 'appearances', 'status', 'place']);
    expect(litKinds('speakers')).toEqual(['speakers']);
    expect(litKinds('off')).toEqual([]);
    expect(nextLit('all', 'cues')).toBe('cues');
    expect(nextLit('cues', 'cues')).toBe('all');
  });

  it('says what each kind holds, or why it holds nothing, in the tagger\'s own words where it has some', () => {
    const account: ChapterTaggingAccount = {
      status: 'tagged', headline: 'Read', problems: [],
      kinds: [
        { kind: 'Soundscape and atmosphere', said: 'No soundscapes or atmospheres were equipped, so none were asked for.', state: 'not-asked' },
        { kind: 'Sound Cues', said: 'The tagger found nothing here.', state: 'nothing' },
        { kind: 'Speakers', said: '1 spoken line: Ye Chen', state: 'found' },
        { kind: 'Holdings', said: 'A holding was set aside.', state: 'set-aside' },
        { kind: 'Appearances', said: 'The tagger found nothing here.', state: 'nothing' },
        { kind: 'Status', said: 'Tagged before Status existed: tag it again to read it.', state: 'not-asked' },
        { kind: 'Place', said: 'Tagged before Place existed: tag it again to read it.', state: 'not-asked' },
      ],
    };
    const rows = createTagRows({ counts: { ...none, speakers: 1 }, findings: { speakers: '1 spoken line: Ye Chen' }, account });
    const said = Object.fromEntries(rows.map(row => [row.kind, row.said]));
    expect(said).toEqual({
      soundscape: 'Nothing equipped', atmosphere: 'Nothing equipped', cues: 'Nothing found', speakers: '1 spoken line: Ye Chen',
      holdings: 'A holding was set aside.', appearances: 'Nothing found',
      // A chapter tagged before Status existed says so, and how to fix it.
      status: 'Tagged before Status existed: tag it again to read it.',
      place: 'Tagged before Place existed: tag it again to read it.',
    });
    expect(rows.filter(row => row.found).map(row => row.kind)).toEqual(['speakers']);
  });
});

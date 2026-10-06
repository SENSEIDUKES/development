import { describe, expect, it } from 'vitest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { writtenChapter } from '../../../test-utils/writtenChapter';
import { acceptHarnessModelResponse } from './responseAcceptance';
import { chapterSoundtrack } from './soundtrack';

const forest = (chapterNumber: number) => LIBRARY_BASE_MEDIA.atmospheres!.filter(entry => entry.word === 'forest')[(chapterNumber - 1) % 3].id;
const reply = (paragraphs: string[]) => JSON.stringify(writtenChapter({
  title: 'Low Tide', paragraphs, recap: 'Mara returns.', chapterFunction: 'progression',
  nextProgression: 'Mara climbs.', nextWorldBuilding: 'The drowned law.', nextConflict: 'The wardens.',
}));

describe('The chapter\'s soundtrack', () => {
  it('is the first tag\'s mood and atmosphere, read in either order, the beds of one word taking turns by chapter', () => {
    expect(chapterSoundtrack([{ parts: ['Mystical', 'forest'] }], LIBRARY_BASE_MEDIA, 1)).toEqual({ scene: { soundscape: 'mystical', atmosphere: forest(1) }, unknown: [], extra: 0 });
    expect(chapterSoundtrack([{ parts: ['forest', 'sad'] }], LIBRARY_BASE_MEDIA, 2).scene).toEqual({ soundscape: 'sad', atmosphere: forest(2) });
    expect(new Set([1, 2, 3].map(chapter => chapterSoundtrack([{ parts: ['forest'] }], LIBRARY_BASE_MEDIA, chapter).scene?.atmosphere)).size).toBe(3);
    expect(chapterSoundtrack([{ parts: ['forest'] }], LIBRARY_BASE_MEDIA, 4).scene?.atmosphere).toBe(forest(1));
  });

  it('uses only the first tag, keeps what it can, and names what it could not use', () => {
    expect(chapterSoundtrack([{ parts: ['war', 'jungle drums'] }, { parts: ['sad', 'cave'] }], LIBRARY_BASE_MEDIA, 1))
      .toEqual({ scene: { soundscape: 'war' }, unknown: ['jungle drums'], extra: 1 });
    expect(chapterSoundtrack([{ parts: ['jazz'] }], LIBRARY_BASE_MEDIA, 1)).toEqual({ unknown: ['jazz'], extra: 0 });
    // Media frozen before chapters chose atmospheres plays music only.
    expect(chapterSoundtrack([{ parts: ['sad', 'forest'] }], { soundscapes: LIBRARY_BASE_MEDIA.soundscapes }, 1))
      .toEqual({ scene: { soundscape: 'sad' }, unknown: ['forest'], extra: 0 });
    expect(chapterSoundtrack([], LIBRARY_BASE_MEDIA, 1)).toEqual({ unknown: [], extra: 0 });
  });

  it('is saved with the chapter from the writer\'s tag, which leaves no trace in the prose', () => {
    const accepted = acceptHarnessModelResponse(reply([
      '[[soundtrack: mystical | forest]] The mist lay low over the pines.',
      'Mara walked on. [[soundtrack: war | ancient battlefield]] The drums began.',
    ]), 1, { media: LIBRARY_BASE_MEDIA, soundtrackExpected: true });
    expect(accepted.accepted).toBe(true);
    if (!accepted.accepted) return;
    expect(accepted.draft.scene).toEqual({ soundscape: 'mystical', atmosphere: forest(1) });
    expect(accepted.draft.paragraphs.slice(0, 2)).toEqual(['The mist lay low over the pines.', 'Mara walked on. The drums began.']);
    expect(accepted.warnings.find(warning => warning.code === 'soundtrack_incomplete')?.message).toBe('1 more soundtrack tag was removed: only the first counts.');
  });

  it('reads a tag the writer gave a paragraph of its own, and flags a chapter that chose none', () => {
    const alone = acceptHarnessModelResponse(reply(['[[soundtrack: sad | gentle rain]]', 'Rain fell on the drowned gate.']), 3, { media: LIBRARY_BASE_MEDIA, soundtrackExpected: true });
    expect(alone.accepted && alone.draft.scene?.soundscape).toBe('sad');
    expect(alone.accepted && alone.draft.paragraphs[0]).toBe('Rain fell on the drowned gate.');

    const none = acceptHarnessModelResponse(reply(['Rain fell on the drowned gate.']), 3, { media: LIBRARY_BASE_MEDIA, soundtrackExpected: true });
    expect(none.accepted && none.draft.scene).toBeUndefined();
    expect(none.warnings.find(warning => warning.code === 'soundtrack_incomplete')?.message)
      .toBe('The writer chose no soundtrack, so the Reader goes on with the one before.');
    // Not asked: nothing to flag.
    expect(acceptHarnessModelResponse(reply(['Rain fell.']), 3, { media: LIBRARY_BASE_MEDIA }).warnings.some(warning => warning.code === 'soundtrack_incomplete')).toBe(false);
  });
});

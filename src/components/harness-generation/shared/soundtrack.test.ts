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
  it('reads a category and its tags, and the HARNESS chooses the recordings: a rain bed of the asked energy, the music by category', () => {
    const reading = chapterSoundtrack([
      { kind: 'soundscape', parts: ['Fighting', 'dark', 'urgent', 'high'] },
      { kind: 'atmosphere', parts: ['rain', 'high'] },
    ], LIBRARY_BASE_MEDIA, 1);
    expect(reading.unknown).toEqual([]);
    expect(reading.scene?.music).toEqual({ category: 'Fighting', tone: 'dark', tension: 'urgent', energy: 'high' });
    const bed = LIBRARY_BASE_MEDIA.atmospheres!.find(entry => entry.id === reading.scene?.atmosphere);
    expect(bed).toMatchObject({ group: 'Rain', studioTags: { energy: 'high' } });
    // The tags may come in any order; a word that is no tag is named and left out.
    expect(chapterSoundtrack([{ kind: 'soundscape', parts: ['war', 'high', 'loud', 'dark'] }], LIBRARY_BASE_MEDIA, 1))
      .toEqual({ scene: { music: { category: 'War', energy: 'high', tone: 'dark' } }, unknown: ['loud'], extra: 0 });
    // Beds of a category that tie take turns by chapter.
    const beds = new Set([1, 2, 3, 4].map(chapter => chapterSoundtrack([{ kind: 'atmosphere', parts: ['Wind', 'low'] }], LIBRARY_BASE_MEDIA, chapter).scene?.atmosphere));
    expect(beds.size).toBeGreaterThan(1);
    // A category the story does not have is named, never guessed.
    expect(chapterSoundtrack([{ kind: 'atmosphere', parts: ['Desert', 'high'] }], LIBRARY_BASE_MEDIA, 1)).toEqual({ unknown: ['Desert'], extra: 0 });
  });

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

  it('reads the soundscape and the atmosphere from their own tags, each kind\'s first, and words of the wrong kind not at all', () => {
    expect(chapterSoundtrack([{ kind: 'soundscape', parts: ['mystical'] }, { kind: 'atmosphere', parts: ['forest'] }], LIBRARY_BASE_MEDIA, 1))
      .toEqual({ scene: { soundscape: 'mystical', atmosphere: forest(1) }, unknown: [], extra: 0 });
    // A second of a kind is removed; the other kind is still read.
    expect(chapterSoundtrack([{ kind: 'soundscape', parts: ['war'] }, { kind: 'soundscape', parts: ['sad'] }, { kind: 'atmosphere', parts: ['cave'] }], LIBRARY_BASE_MEDIA, 1).extra).toBe(1);
    // An atmosphere word in the soundscape tag is not music, and a mood in the atmosphere tag is not a place.
    expect(chapterSoundtrack([{ kind: 'soundscape', parts: ['forest'] }, { kind: 'atmosphere', parts: ['sad'] }], LIBRARY_BASE_MEDIA, 1))
      .toEqual({ unknown: ['forest', 'sad'], extra: 0 });
  });

  it('is saved with the chapter from the writer\'s tags, which leave no trace in the prose', () => {
    const accepted = acceptHarnessModelResponse(reply([
      '[[soundscape: mystical]] [[atmosphere: forest]] The mist lay low over the pines.',
      'Mara walked on. [[soundscape: war]] The drums began.',
    ]), 1, { media: LIBRARY_BASE_MEDIA, soundtrackExpected: true });
    expect(accepted.accepted).toBe(true);
    if (!accepted.accepted) return;
    expect(accepted.draft.scene).toEqual({ soundscape: 'mystical', atmosphere: forest(1) });
    expect(accepted.draft.paragraphs.slice(0, 2)).toEqual(['The mist lay low over the pines.', 'Mara walked on. The drums began.']);
    expect(accepted.warnings.find(warning => warning.code === 'soundtrack_incomplete')?.message).toBe('1 more soundtrack tag was removed: only the first soundscape and the first atmosphere count.');
    // The earlier combined tag still reads, for chapters written with it.
    const combined = acceptHarnessModelResponse(reply(['[[soundtrack: sad | forest]] Rain fell.']), 2, { media: LIBRARY_BASE_MEDIA, soundtrackExpected: true });
    expect(combined.accepted && combined.draft.scene).toEqual({ soundscape: 'sad', atmosphere: forest(2) });
    // A chapter that chose only its music says so.
    const musicOnly = acceptHarnessModelResponse(reply(['[[soundscape: sad]] Rain fell.']), 2, { media: LIBRARY_BASE_MEDIA, soundtrackExpected: true });
    expect(musicOnly.warnings.find(warning => warning.code === 'soundtrack_incomplete')?.message).toBe('The tagger chose no atmosphere, so the one before goes on.');
  });

  it('reads a tag the writer gave a paragraph of its own, and flags a chapter that chose none', () => {
    const alone = acceptHarnessModelResponse(reply(['[[soundtrack: sad | gentle rain]]', 'Rain fell on the drowned gate.']), 3, { media: LIBRARY_BASE_MEDIA, soundtrackExpected: true });
    expect(alone.accepted && alone.draft.scene?.soundscape).toBe('sad');
    expect(alone.accepted && alone.draft.paragraphs[0]).toBe('Rain fell on the drowned gate.');

    const none = acceptHarnessModelResponse(reply(['Rain fell on the drowned gate.']), 3, { media: LIBRARY_BASE_MEDIA, soundtrackExpected: true });
    expect(none.accepted && none.draft.scene).toBeUndefined();
    expect(none.warnings.find(warning => warning.code === 'soundtrack_incomplete')?.message)
      .toBe('The tagger chose no soundtrack, so the Reader goes on with the one before.');
    // Not asked: nothing to flag.
    expect(acceptHarnessModelResponse(reply(['Rain fell.']), 3, { media: LIBRARY_BASE_MEDIA }).warnings.some(warning => warning.code === 'soundtrack_incomplete')).toBe(false);
  });
});

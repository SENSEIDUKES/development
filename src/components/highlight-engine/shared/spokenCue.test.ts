import { describe, expect, it } from 'vitest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { resolvePlayableSoundCue, type SoundCueAttachment } from '../../../audio/inlineAudio';
import { soundVocabulary } from '../../../audio/media';
import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import { findSpokenWords, resolveSpokenSoundCue, wordsJustRead } from './spokenCue';

const blocks = [
  { id: 'c8-p0', text: 'The jagged basalt chimneys of the Whispering Rifts exhaled cold, whistling drafts that smelled of ozone.' },
  { id: 'c8-p1', text: 'Gu Chen met the first lunge with a ringing strike. Wei’s blade sang.' },
  { id: 'c8-p2', text: 'Again the whistling drafts rose from the rift.' },
];
const sound = soundVocabulary(LIBRARY_BASE_MEDIA)[0].word;
const request = (target: Parameters<typeof resolveSpokenSoundCue>[0]['target'], extra: Partial<Parameters<typeof resolveSpokenSoundCue>[0]> = {}) =>
  resolveSpokenSoundCue({ blocks, soundCues: [], media: LIBRARY_BASE_MEDIA, chapterNumber: 8, sound, target, ...extra });

describe('Sound Cues asked for in words', () => {
  it('finds spoken words whatever their case, punctuation or apostrophes, on whole words', () => {
    expect(findSpokenWords(blocks, 'Whistling Drafts')).toMatchObject({
      paragraph: 0, occurrences: 2, selection: { blockId: 'c8-p0', selectedText: 'whistling drafts' },
    });
    expect(findSpokenWords(blocks, 'weis blade')?.selection.selectedText).toBe('Wei’s blade');
    expect(findSpokenWords(blocks, 'whistling draft')).toBeUndefined();
    expect(findSpokenWords(blocks, '  ')).toBeUndefined();
  });

  it('prefers the next appearance from where the reader is, then the chapter’s first', () => {
    const from = { blockId: 'c8-p1', offset: 0 };
    expect(findSpokenWords(blocks, 'whistling drafts', { from })?.selection.blockId).toBe('c8-p2');
    expect(findSpokenWords(blocks, 'whistling drafts', { from: { blockId: 'c8-p2', offset: 40 } })?.selection.blockId).toBe('c8-p0');
  });

  it('takes the last few words of what Listen just read', () => {
    const line = { start: 0, end: blocks[1].text.indexOf(' Wei') };
    expect(wordsJustRead(blocks[1], line)?.selectedText).toBe('a ringing strike');
    expect(wordsJustRead(blocks[1], { start: 0, end: 0 })).toBeUndefined();
  });

  it('makes the same manual Sound Cue record a highlight places, ready to play', () => {
    const result = request({ kind: 'words', words: 'whistling drafts' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cue).toMatchObject({ kind: 'sound-cue', anchor: { blockId: 'c8-p0', selectedText: 'whistling drafts' }, payload: { origin: 'manual', sound } });
    expect(resolvePlayableSoundCue(result.cue).ok).toBe(true);
    expect(request({ kind: 'words', words: 'whistling drafts' })).toEqual(result);
    const heard = request({ kind: 'just-read' }, { listening: { blockId: 'c8-p1', start: 0, end: blocks[1].text.indexOf(' Wei') } });
    expect(heard).toMatchObject({ ok: true, paragraph: 1, cue: { anchor: { selectedText: 'a ringing strike' } } });
  });

  it('says plainly why a request cannot be placed', () => {
    expect(request({ kind: 'words', words: 'whistling drafts' }, { sound: 'not a story sound' })).toMatchObject({ ok: false, problem: expect.stringContaining('not one of this story') });
    expect(request({ kind: 'words', words: 'a lantern' })).toMatchObject({ ok: false, problem: 'I can\'t find “a lantern” in this chapter.' });
    expect(request({ kind: 'just-read' })).toMatchObject({ ok: false, problem: expect.stringContaining('Start Listen first') });
    expect(request({ kind: 'words', words: 'The jagged basalt chimneys of the Whispering Rifts exhaled' })).toMatchObject({ ok: false, problem: expect.stringContaining('1 to 8 words') });
    const placed = request({ kind: 'words', words: 'whistling drafts' });
    if (!placed.ok) throw new Error('expected a cue');
    expect(request({ kind: 'words', words: 'cold whistling' }, { soundCues: [placed.cue] })).toMatchObject({ ok: false, problem: expect.stringContaining('already has a Sound Cue') });
    const full = Array.from({ length: SOUND_CUE_RULES.maxPerChapter }, () => placed.cue as SoundCueAttachment);
    expect(request({ kind: 'words', words: 'ringing strike' }, { soundCues: full })).toMatchObject({ ok: false, problem: expect.stringContaining('already has 10 Sound Cues') });
  });
});

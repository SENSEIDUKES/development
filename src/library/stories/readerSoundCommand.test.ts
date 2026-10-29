import { describe, expect, it } from 'vitest';
import { parseReaderSoundCommand } from './readerSoundCommand';

const sounds = ['wind', 'blade clash', 'blade drawn', 'door'];

describe('Sound Cue requests to the Familiar', () => {
  it('reads a story sound and the words it goes on', () => {
    expect(parseReaderSoundCommand('wind on whistling drafts', sounds)).toEqual({ ok: true, sound: 'wind', target: { kind: 'words', words: 'whistling drafts' } });
    expect(parseReaderSoundCommand('a howling wind sound on “whistling drafts.”', sounds)).toEqual({ ok: true, sound: 'wind', target: { kind: 'words', words: 'whistling drafts' } });
    // The sound's words may themselves say "on": only the first join after a story sound splits them.
    expect(parseReaderSoundCommand('blade clash on met the lunge on the stair', sounds)).toEqual({ ok: true, sound: 'blade clash', target: { kind: 'words', words: 'met the lunge on the stair' } });
    expect(parseReaderSoundCommand('wind on he stood there', sounds)).toEqual({ ok: true, sound: 'wind', target: { kind: 'words', words: 'he stood there' } });
    expect(parseReaderSoundCommand("the door to Wei's room", sounds)).toEqual({ ok: true, sound: 'door', target: { kind: 'words', words: 'weis room' } });
  });

  it('places "right there" on what Listen just read', () => {
    for (const said of ['blade clash right there', 'a blade clash sound here', 'blade clash on right there', 'wind now']) {
      expect(parseReaderSoundCommand(said, sounds)).toMatchObject({ ok: true, target: { kind: 'just-read' } });
    }
  });

  it('never guesses a sound the story does not have, and asks where when no place is named', () => {
    expect(parseReaderSoundCommand('thunder on the sky', sounds)).toEqual({ ok: false, problem: 'Which sound? This story\'s sounds are: wind, blade clash, blade drawn, door.' });
    expect(parseReaderSoundCommand('windy on the sky', sounds)).toMatchObject({ ok: false, problem: expect.stringContaining('Which sound?') });
    expect(parseReaderSoundCommand('blade clash', sounds)).toMatchObject({ ok: false, problem: expect.stringContaining('Say where it goes') });
    expect(parseReaderSoundCommand('wind on whistling drafts', [])).toMatchObject({ ok: false, problem: 'Which sound? This story has no sounds to add.' });
  });
});

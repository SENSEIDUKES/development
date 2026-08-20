import { describe, expect, it } from 'vitest';
import { extractSFXCues } from '../components/reader-chamber/shared/readerPlayback';
import { extractReaderVisibleAudioText } from './readerVisibleText';

describe('Reader-visible audio text boundary', () => {
  it('is the exact helper used by both Reader rendering and audio placement', () => {
    expect(extractSFXCues).toBe(extractReaderVisibleAudioText);
    expect(extractReaderVisibleAudioText(
      '[SFX: Sword Unsheathe] Mei Lin drew the Ashen Sword. [Mood: tense]',
    )).toEqual({
      cleanText: 'Mei Lin drew the Ashen Sword.',
      sfxList: ['sword unsheathe'],
    });
  });
});

import { describe, expect, it } from 'vitest';
import { extractReaderVisibleAudioText } from './readerVisibleText';

describe('Reader-visible audio text boundary', () => {
  it('strips sound and mood tags from the text the Reader shows and audio places', () => {
    expect(extractReaderVisibleAudioText(
      '[SFX: Sword Unsheathe] Mei Lin drew the Ashen Sword. [Mood: tense]',
    )).toEqual({
      cleanText: 'Mei Lin drew the Ashen Sword.',
      sfxList: ['sword unsheathe'],
    });
  });
});

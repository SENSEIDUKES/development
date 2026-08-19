import { describe, expect, it } from 'vitest';
import { INLINE_AUDIO_HIGHLIGHTS } from '../workshop/previews/reader-chamber/previewData';
import { parseLibraryCues } from './libraryCues';
import {
  resolveInlineSoundAction,
  splitByInlineAudioHighlights,
  type InlineAudioHighlight,
  type InlineAudioVoiceAction,
} from './inlineAudio';

describe('inline audio contract', () => {
  it('resolves every controlled Reader example through the real Library Cue catalog', () => {
    const resolved = INLINE_AUDIO_HIGHLIGHTS.map((highlight) => {
      expect(highlight.action.type).toBe('sound');
      if (highlight.action.type !== 'sound') throw new Error('Expected sound action');
      return resolveInlineSoundAction(highlight.action);
    });

    expect(resolved.every(result => result.ok)).toBe(true);
    expect(resolved.map(result => result.ok ? result.cue.category : null)).toEqual([
      'beasts',
      'weapons',
      'artifacts',
      'locations',
      'factions',
    ]);
  });

  it('rejects arbitrary URLs and Cue categories owned by other audio surfaces', () => {
    expect(resolveInlineSoundAction({
      type: 'sound',
      cueUrl: 'https://example.com/not-in-the-library.mp3',
    })).toMatchObject({ ok: false, reason: 'not-found' });

    const loaded = parseLibraryCues([{
      file_path: 'DEFAULT/Atmosphere/Rain.mp3',
      public_url: 'https://celestialaudio.seihouse.org/DEFAULT/Atmosphere/Rain.mp3',
      metadata: {
        main_category: 'atmosphere',
        broad_variation: 'rain',
        soft_tags: ['rain'],
        description: 'Reserved atmosphere loop.',
        confidence_score: 1,
      },
    }]);
    expect(resolveInlineSoundAction({
      type: 'sound',
      cueUrl: 'https://celestialaudio.seihouse.org/DEFAULT/Atmosphere/Rain.mp3',
    }, loaded)).toMatchObject({ ok: false, reason: 'reserved-category' });
  });

  it('keeps voice actions provider-neutral', () => {
    const action: InlineAudioVoiceAction = {
      type: 'voice',
      voiceKey: 'ancient-master-female',
      quoteText: 'The mountain remembers.',
    };

    expect(Object.keys(action).sort()).toEqual(['quoteText', 'type', 'voiceKey']);
    expect(action).not.toHaveProperty('voice_id');
    expect(action).not.toHaveProperty('providerId');
  });

  it('matches literal phrases longest-first without activating inside longer words', () => {
    const highlights = [
      {
        id: 'ring',
        phrase: 'Azure Ring',
        action: { type: 'sound', cueUrl: 'https://example.com/ring.mp3' },
      },
      {
        id: 'azure',
        phrase: 'Azure',
        action: { type: 'sound', cueUrl: 'https://example.com/azure.mp3' },
      },
    ] satisfies InlineAudioHighlight[];

    const segments = splitByInlineAudioHighlights(
      'The Azure Ring shone; Azurelight did not.',
      highlights,
    );
    expect(segments.filter(segment => segment.highlight).map(segment => segment.highlight?.id)).toEqual([
      'ring',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  assignCharacterVoices,
  type DialogueSpeakerReference,
} from './characterVoiceAssignments';
import { loadVoiceCatalog, type PublicVoiceMeta } from './voiceCatalog';

const voice = (internalKey: string, ttsAvailable = true): PublicVoiceMeta => ({
  internalKey,
  fileName: `voice_preview_${internalKey}.mp3`,
  archetype: internalKey,
  classification: 'flexible',
  compatibleRoles: [],
  description: `${internalKey} test voice`,
  ageRange: 'Adult',
  ttsAvailable,
});

const voices = [voice('voice-c'), voice('voice-a'), voice('voice-b')];

describe('assignCharacterVoices', () => {
  it('assigns a provider-neutral key only to a Character with validated dialogue', () => {
    const result = assignCharacterVoices({
      characters: [
        { id: 'char-yan-shi', name: 'Yan Shi' },
        { id: 'char-li-mei', name: 'Li Mei' },
      ],
      dialogueSpeakers: [{ speakerName: 'Yan Shi' }],
      voices,
    });

    expect(result.characters[0].voiceKey).toMatch(/^voice-[abc]$/);
    expect(result.characters[1]).not.toHaveProperty('voiceKey');
    expect(result.changedCharacters).toEqual([result.characters[0]]);
    expect(result.resolutions).toEqual([
      expect.objectContaining({
        characterId: 'char-yan-shi',
        characterName: 'Yan Shi',
        assigned: true,
      }),
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('requires explicit intelligence before assigning a first voice to a non-human Character', () => {
    const result = assignCharacterVoices({
      characters: [
        {
          id: 'char-ember-fox',
          name: 'Ember Fox',
          portraitKind: 'non-human',
          creatureProfile: { intelligence: 'animal-level instinct' },
        },
        {
          id: 'char-archive-dragon',
          name: 'Archive Dragon',
          portraitKind: 'non-human',
          creatureProfile: { intelligence: 'ancient sapient intelligence' },
        },
      ],
      dialogueSpeakers: [
        { speakerName: 'Ember Fox' },
        { speakerName: 'Archive Dragon' },
      ],
      voices,
    });

    expect(result.characters[0]).not.toHaveProperty('voiceKey');
    expect(result.characters[1].voiceKey).toMatch(/^voice-[abc]$/);
    expect(result.changedCharacters).toEqual([result.characters[1]]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'ineligible-character', speakerName: 'Ember Fox' }),
    ]);
  });

  it('removes an existing voice from a non-intelligent non-human Character', () => {
    const result = assignCharacterVoices({
      characters: [{
        id: 'char-ember-fox',
        name: 'Ember Fox',
        portraitKind: 'non-human',
        creatureProfile: { intelligence: 'animal-level instinct' },
        voiceKey: 'voice-a',
      }],
      dialogueSpeakers: [{ speakerName: 'Ember Fox' }],
      voices,
    });

    expect(result.characters[0]).not.toHaveProperty('voiceKey');
    expect(result.changedCharacters).toEqual([result.characters[0]]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'ineligible-character' }),
    ]);
  });

  it('selects deterministically across catalog order and reuses the persisted key', () => {
    const input = {
      characters: [{ id: 'char-yan-shi', name: 'Yan Shi' }],
      dialogueSpeakers: [{ speakerName: 'Yan Shi' }],
    } satisfies {
      characters: Array<Record<string, unknown>>;
      dialogueSpeakers: DialogueSpeakerReference[];
    };

    const first = assignCharacterVoices({ ...input, voices });
    const reordered = assignCharacterVoices({ ...input, voices: [...voices].reverse() });
    expect(reordered.characters[0].voiceKey).toBe(first.characters[0].voiceKey);

    const repeated = assignCharacterVoices({
      ...input,
      characters: first.characters,
      voices: [voice(String(first.characters[0].voiceKey)), ...voices],
    });
    expect(repeated.characters[0].voiceKey).toBe(first.characters[0].voiceKey);
    expect(repeated.changedCharacters).toEqual([]);
    expect(repeated.resolutions).toEqual([
      expect.objectContaining({ assigned: false, voiceKey: first.characters[0].voiceKey }),
    ]);
  });

  it('never replaces an existing voiceKey when its catalog entry is unavailable', () => {
    const result = assignCharacterVoices({
      characters: [{ id: 'char-yan-shi', name: 'Yan Shi', voiceKey: 'retired-voice' }],
      dialogueSpeakers: [{ speakerName: 'Yan Shi' }],
      voices,
    });

    expect(result.characters[0].voiceKey).toBe('retired-voice');
    expect(result.changedCharacters).toEqual([]);
    expect(result.resolutions).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'invalid-existing-voice-key' }),
    ]);
  });

  it('matches aliases, prefers a canonical ID, and assigns only once per Character', () => {
    const result = assignCharacterVoices({
      characters: [
        { id: 'char-yan-shi', name: 'Yan Shi', aliases: ['The Ash Disciple'] },
        { id: 'char-other', name: 'Yan Shi' },
      ],
      dialogueSpeakers: [
        { speakerName: 'The Ash Disciple' },
        { speakerName: 'Yan Shi', characterId: 'char-yan-shi' },
      ],
      voices,
    });

    expect(result.resolutions).toHaveLength(1);
    expect(result.resolutions[0].characterId).toBe('char-yan-shi');
    expect(result.changedCharacters).toHaveLength(1);
    expect(result.warnings).toEqual([]);
  });

  it('refuses unmatched, ambiguous, or unpersisted speaker identities', () => {
    const result = assignCharacterVoices({
      characters: [
        { id: 'char-yan-a', name: 'Yan Shi' },
        { id: 'char-yan-b', name: 'Yan Shi' },
        { name: 'Li Mei' },
      ],
      dialogueSpeakers: [
        { speakerName: 'Unknown Elder' },
        { speakerName: 'Yan Shi' },
        { speakerName: 'Li Mei' },
      ],
      voices,
    });

    expect(result.changedCharacters).toEqual([]);
    expect(result.warnings.map(warning => warning.code)).toEqual([
      'character-not-found',
      'ambiguous-character',
      'missing-character-id',
    ]);
  });

  it('strips provider-facing fields and never returns catalog file metadata', () => {
    const result = assignCharacterVoices({
      characters: [{
        id: 'char-yan-shi',
        name: 'Yan Shi',
        voice_id: 'eleven-provider-id',
        providerVoiceId: 'other-provider-id',
        voicePresetId: 'legacy-browser-choice',
        profile: {
          provider_voice_id: 'nested-provider-id',
          delivery: [{ ProviderVoiceID: 'array-nested-provider-id' }],
          temperament: 'measured',
        },
      }],
      dialogueSpeakers: [{ speakerName: 'Yan Shi' }],
      voices,
    });
    const serialized = JSON.stringify(result);

    expect(result.characters[0]).not.toHaveProperty('voice_id');
    expect(result.characters[0]).not.toHaveProperty('providerVoiceId');
    expect(result.characters[0]).not.toHaveProperty('voicePresetId');
    expect(result.characters[0].profile).toEqual({
      delivery: [{}],
      temperament: 'measured',
    });
    expect(serialized).not.toContain('eleven-provider-id');
    expect(serialized).not.toContain('other-provider-id');
    expect(serialized).not.toContain('nested-provider-id');
    expect(serialized).not.toContain('array-nested-provider-id');
    expect(serialized).not.toContain('voice_preview_');
  });

  it('never preserves a raw catalog provider ID when it was stored as voiceKey', () => {
    const providerVoiceId = loadVoiceCatalog().entries.find(entry => entry.voice_id)?.voice_id;
    expect(providerVoiceId).toBeTruthy();
    const result = assignCharacterVoices({
      characters: [{ id: 'char-yan-shi', name: 'Yan Shi', voiceKey: providerVoiceId }],
      dialogueSpeakers: [{ speakerName: 'Yan Shi' }],
      voices,
    });

    expect(result.characters[0].voiceKey).toMatch(/^voice-[abc]$/);
    expect(result.characters[0].voiceKey).not.toBe(providerVoiceId);
    expect(JSON.stringify(result)).not.toContain(providerVoiceId);
  });
});

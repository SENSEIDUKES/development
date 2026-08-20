import { describe, expect, it } from 'vitest';
import { loadVoiceCatalog } from './voiceCatalog';
import {
  constructResolvedDialogueAudioMoment,
  DIALOGUE_ARTIFACT_PUBLIC_ORIGIN,
  finalizeResolvedDialogueAudioMoments,
} from './resolvedDialogueAudio';

const catalog = loadVoiceCatalog();
const availableVoice = catalog.publicView.find(voice => voice.ttsAvailable)!;
const providerVoiceId = catalog.entries.find(entry => entry.voice_id)?.voice_id!;

const validInput = () => ({
  character: {
    id: 'character-mei-lin',
    name: 'Mei Lin',
    aliases: ['Archive Guardian'],
    voiceKey: availableVoice.internalKey,
  },
  voiceKey: availableVoice.internalKey,
  block: {
    id: 'c3-p7',
    type: 'dialogue',
    text: 'Mei Lin said, “Stand behind me.” Later she repeated, “Stand behind me.”',
    metadata: { speakerName: 'Archive Guardian' },
  },
  triggerPhrase: '“Stand behind me.”',
  occurrenceIndex: 1,
  artifact: {
    publicUrl: `${DIALOGUE_ARTIFACT_PUBLIC_ORIGIN}/dialogue/character-mei-lin/c3-p7.mp3`,
  },
  semanticTags: ['protective'],
});

describe('constructResolvedDialogueAudioMoment', () => {
  it('constructs a provider-neutral exact-placement artifact when optional mode is omitted', () => {
    const result = constructResolvedDialogueAudioMoment(validInput());

    expect(result).toEqual({
      ok: true,
      moment: expect.objectContaining({
        blockId: 'c3-p7',
        triggerPhrase: '“Stand behind me.”',
        occurrenceIndex: 1,
        sourceCategory: 'voice',
        actionType: 'spoken-dialogue',
        semanticTags: ['dialogue', 'protective'],
        relatedEntity: {
          id: 'character-mei-lin',
          name: 'Mei Lin',
          type: 'character',
        },
        voiceKey: availableVoice.internalKey,
        artifact: {
          publicUrl: `${DIALOGUE_ARTIFACT_PUBLIC_ORIGIN}/dialogue/character-mei-lin/c3-p7.mp3`,
        },
      }),
    });
    expect(JSON.stringify(result)).not.toContain(providerVoiceId);
  });

  it('rejects a Character without a canonical persisted ID', () => {
    const input = validInput();
    delete (input.character as { id?: string }).id;

    expect(constructResolvedDialogueAudioMoment(input))
      .toMatchObject({ ok: false, reason: 'invalid-character' });
  });

  it('rejects a non-intelligent non-human Character even when it already has a voiceKey', () => {
    const input = validInput();
    const character = input.character as Record<string, unknown>;
    character.portraitKind = 'non-human';
    character.creatureProfile = { intelligence: 'feral instinct' };

    expect(constructResolvedDialogueAudioMoment(input))
      .toMatchObject({ ok: false, reason: 'ineligible-character' });
  });

  it('rejects a voiceKey that differs from the canonical Character assignment', () => {
    const input = validInput();
    input.voiceKey = 'different-catalog-key';

    expect(constructResolvedDialogueAudioMoment(input))
      .toMatchObject({ ok: false, reason: 'voice-key-mismatch' });
  });

  it('rejects a raw provider ID and an unknown provider-neutral-looking key', () => {
    const providerInput = validInput();
    providerInput.character.voiceKey = providerVoiceId;
    providerInput.voiceKey = providerVoiceId;
    expect(constructResolvedDialogueAudioMoment(providerInput))
      .toMatchObject({ ok: false, reason: 'provider-exposure' });

    const unknownInput = validInput();
    unknownInput.character.voiceKey = 'unknown-provider-neutral-key';
    unknownInput.voiceKey = 'unknown-provider-neutral-key';
    expect(constructResolvedDialogueAudioMoment(unknownInput))
      .toMatchObject({ ok: false, reason: 'invalid-voice-key' });
  });

  it('rejects a mismatched speaker, occurrence, or non-application artifact', () => {
    const speakerMismatch = validInput();
    speakerMismatch.block.metadata.speakerName = 'Someone Else';
    expect(constructResolvedDialogueAudioMoment(speakerMismatch))
      .toMatchObject({ ok: false, reason: 'speaker-mismatch' });

    const occurrenceMismatch = validInput();
    occurrenceMismatch.occurrenceIndex = 2;
    expect(constructResolvedDialogueAudioMoment(occurrenceMismatch))
      .toMatchObject({ ok: false, reason: 'invalid-placement' });

    const providerArtifact = validInput();
    providerArtifact.artifact.publicUrl = 'https://api.elevenlabs.io/v1/audio/private-id';
    expect(constructResolvedDialogueAudioMoment(providerArtifact))
      .toMatchObject({ ok: false, reason: 'invalid-artifact' });
  });

  it('validates placement against Reader-visible text and gives distinct quotes distinct IDs', () => {
    const hiddenTag = validInput();
    hiddenTag.block.text = '[SFX: “Stand behind me.”] Mei Lin said, “Stand behind me.”';
    hiddenTag.occurrenceIndex = 0;
    expect(constructResolvedDialogueAudioMoment(hiddenTag)).toMatchObject({ ok: true });

    hiddenTag.occurrenceIndex = 1;
    expect(constructResolvedDialogueAudioMoment(hiddenTag))
      .toMatchObject({ ok: false, reason: 'invalid-placement' });

    const firstQuote = validInput();
    firstQuote.block.text = '“First.” “Second.”';
    firstQuote.triggerPhrase = '“First.”';
    firstQuote.occurrenceIndex = 0;
    const secondQuote = validInput();
    secondQuote.block.text = firstQuote.block.text;
    secondQuote.triggerPhrase = '“Second.”';
    secondQuote.occurrenceIndex = 0;
    const firstResult = constructResolvedDialogueAudioMoment(firstQuote);
    const secondResult = constructResolvedDialogueAudioMoment(secondQuote);
    expect(firstResult).toMatchObject({ ok: true });
    expect(secondResult).toMatchObject({ ok: true });
    if (!firstResult.ok || !secondResult.ok) throw new Error('Expected valid dialogue moments.');
    expect(firstResult.moment.id).not.toBe(secondResult.moment.id);
  });

  it('finalizes only artifacts bound to a canonical persisted Character and block', () => {
    const input = validInput();
    const moments = finalizeResolvedDialogueAudioMoments({
      characters: [input.character],
      blocks: [input.block],
      candidates: [{
        characterId: String(input.character.id),
        blockId: input.block.id,
        triggerPhrase: input.triggerPhrase,
        occurrenceIndex: input.occurrenceIndex,
        publicUrl: input.artifact.publicUrl,
        semanticTags: input.semanticTags,
      }, {
        characterId: 'missing-character',
        blockId: input.block.id,
        triggerPhrase: input.triggerPhrase,
        occurrenceIndex: input.occurrenceIndex,
        publicUrl: input.artifact.publicUrl,
      }],
    });

    expect(moments).toHaveLength(1);
    expect(moments[0].relatedEntity.id).toBe(input.character.id);
    expect(JSON.stringify(moments)).not.toContain(providerVoiceId);
  });
});

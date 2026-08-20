import { describe, expect, it } from 'vitest';
import {
  CODEX_VOICE_ARTIFACT_VERSION,
  isApplicationOwnedVoiceArtifactUrl,
  isCurrentCodexVoiceArtifact,
  type CodexVoiceArtifact,
} from './voiceArtifacts';

const QUOTE = 'The archive remembers what the court forgets.';

const artifact = (overrides: Partial<CodexVoiceArtifact> = {}): CodexVoiceArtifact => ({
  publicUrl: 'https://celestialaudio.seihouse.org/voice/v1/artifact.mp3',
  quote: QUOTE,
  voiceKey: 'ancient-master-female',
  model: 'eleven_multilingual_v2',
  artifactVersion: CODEX_VOICE_ARTIFACT_VERSION,
  ...overrides,
});

describe('application-owned voice artifacts', () => {
  it('accepts only the SEIHouse voice namespace', () => {
    expect(isApplicationOwnedVoiceArtifactUrl(artifact().publicUrl)).toBe(true);
    expect(isApplicationOwnedVoiceArtifactUrl('https://api.elevenlabs.io/v1/audio/id')).toBe(false);
    expect(isApplicationOwnedVoiceArtifactUrl('https://audio.example.invalid/voice/x.mp3'))
      .toBe(false);
    expect(isApplicationOwnedVoiceArtifactUrl('http://celestialaudio.seihouse.org/voice/x.mp3'))
      .toBe(false);
    expect(isApplicationOwnedVoiceArtifactUrl('blob:https://celestialaudio.seihouse.org/local'))
      .toBe(false);
    expect(isApplicationOwnedVoiceArtifactUrl(undefined)).toBe(false);
  });

  it('reuses a stored artifact only while quote, voice, and version still match', () => {
    const expected = { quote: QUOTE, voiceKey: 'ancient-master-female' };

    expect(isCurrentCodexVoiceArtifact(artifact(), expected)).toBe(true);
    expect(isCurrentCodexVoiceArtifact(artifact(), { ...expected, quote: 'A new quote.' }))
      .toBe(false);
    expect(isCurrentCodexVoiceArtifact(artifact(), { ...expected, voiceKey: 'merchant-male' }))
      .toBe(false);
    expect(isCurrentCodexVoiceArtifact(artifact({ artifactVersion: 'v0' }), expected)).toBe(false);
    expect(isCurrentCodexVoiceArtifact(
      artifact({ publicUrl: 'https://api.elevenlabs.io/v1/audio/id' }),
      expected,
    )).toBe(false);
    expect(isCurrentCodexVoiceArtifact(undefined, expected)).toBe(false);
    expect(isCurrentCodexVoiceArtifact(artifact(), { quote: QUOTE })).toBe(false);
  });
});

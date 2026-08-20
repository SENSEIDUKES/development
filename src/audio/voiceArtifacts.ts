/**
 * Character voice artifacts — client-safe boundary.
 *
 * A voice artifact is a completed Character signature-quote recording that the
 * server generated once and published under the application-owned SEIHouse
 * audio namespace. This module carries no provider name, provider voice ID,
 * credential, or synthesis capability; the browser only recognizes a URL the
 * server already produced.
 */

/** Public application storage boundary for completed voice artifacts. */
export const VOICE_ARTIFACT_PUBLIC_ORIGIN = 'https://celestialaudio.seihouse.org';
export const VOICE_ARTIFACT_PATH_PREFIX = '/voice/';

/**
 * Artifact contract version. It is part of the stored object identity, so a
 * future change to how a signature quote is recorded cannot silently reuse an
 * older recording. The synthesis model is part of the server object key but is
 * not visible to the client-side validity check below, so changing
 * ELEVENLABS_MODEL_ID also requires bumping this version to invalidate every
 * persisted artifact.
 */
export const CODEX_VOICE_ARTIFACT_VERSION = 'v1';

/** The persisted Codex identity of one completed signature-quote recording. */
export interface CodexVoiceArtifact {
  /** Application-owned public URL inside the SEIHouse audio namespace. */
  publicUrl: string;
  /** The exact signature quote this recording speaks. */
  quote: string;
  /** Provider-neutral voice identity used to record it. */
  voiceKey: string;
  /** Server-side synthesis model identifier. Never a provider credential. */
  model: string;
  /** Contract version that produced the object key. */
  artifactVersion: string;
}

/**
 * Voice audio is playable only after the server publishes it under the
 * application-owned voice namespace. Browser-local and third-party sources are
 * never valid persisted Character artifacts.
 */
export function isApplicationOwnedVoiceArtifactUrl(value?: string): boolean {
  const source = value?.trim();
  if (!source) return false;
  try {
    const parsed = new URL(source);
    return parsed.protocol === 'https:'
      && parsed.origin === VOICE_ARTIFACT_PUBLIC_ORIGIN
      && parsed.pathname.startsWith(VOICE_ARTIFACT_PATH_PREFIX)
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

const trimmed = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

/**
 * A stored artifact is reusable only while it still matches the Character's
 * exact signature quote, current voice identity, and the active artifact
 * version. A changed quote or reassigned voice invalidates the recording.
 */
export function isCurrentCodexVoiceArtifact(
  artifact: CodexVoiceArtifact | undefined,
  expected: { quote?: string; voiceKey?: string },
): boolean {
  if (!artifact || typeof artifact !== 'object') return false;
  const quote = trimmed(expected.quote);
  const voiceKey = trimmed(expected.voiceKey);
  if (!quote || !voiceKey) return false;
  return isApplicationOwnedVoiceArtifactUrl(artifact.publicUrl)
    && trimmed(artifact.quote) === quote
    && trimmed(artifact.voiceKey) === voiceKey
    && artifact.artifactVersion === CODEX_VOICE_ARTIFACT_VERSION;
}

/** Public application storage boundary for completed dialogue artifacts. */
export const DIALOGUE_ARTIFACT_PUBLIC_ORIGIN = 'https://celestialaudio.seihouse.org';
export const DIALOGUE_ARTIFACT_PATH_PREFIX = '/dialogue/';

/**
 * Dialogue audio is playable only after the server publishes it under the
 * application-owned dialogue namespace. Browser-local and third-party
 * sources are never valid persisted Character artifacts.
 */
export function isApplicationOwnedDialogueArtifactUrl(value?: string): boolean {
  const source = value?.trim();
  if (!source) return false;
  try {
    const parsed = new URL(source);
    return parsed.protocol === 'https:'
      && parsed.origin === DIALOGUE_ARTIFACT_PUBLIC_ORIGIN
      && parsed.pathname.startsWith(DIALOGUE_ARTIFACT_PATH_PREFIX)
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

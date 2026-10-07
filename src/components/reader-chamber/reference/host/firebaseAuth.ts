/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's ReaderScreen imports `signInWithPopup` and `GoogleAuthProvider`
 * from the `firebase/auth` package for its "Authentication Required" gate.
 * The Workshop has no Firebase; `vite.config.ts` resolves `firebase/auth` to
 * this file for the copied Reader only. The gate never shows here, because
 * the Workshop is always in production's local-only mode.
 */
export class GoogleAuthProvider {
  readonly providerId = 'google.com';
}

export async function signInWithPopup(_auth: unknown, _provider: GoogleAuthProvider): Promise<never> {
  throw new Error('Sign-in is not available in the Workshop preview.');
}

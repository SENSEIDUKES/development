/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's `src/lib/firebase.ts` (Light-Novels main @ 647165a) starts
 * Firebase from `firebase-applet-config.json` unless the browser opted into
 * local-only mode. The Workshop never connects to Firebase, so this stand-in
 * is permanently local-only and signed out, which is production's own
 * `LOCAL_ONLY_MODE` shape for `auth`.
 */
export const LOCAL_ONLY_MODE = true;

export const setLocalOnlyMode = (_enabled: boolean): void => {
  // Production reloads the page to switch modes; the Workshop is always local-only.
};

export const firebaseApp = null;

export const auth = {
  currentUser: null as null | { uid: string; getIdToken: () => Promise<string> },
  onAuthStateChanged: () => () => {},
};

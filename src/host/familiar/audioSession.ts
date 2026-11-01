interface AudioSession { type: string }

/**
 * Safari's audio session (iPhone, iPad, Mac): the audio player sets it to
 * `playback` so music plays through the silent switch, and in that mode the
 * phone refuses the microphone ("AudioSession category is not compatible with
 * audio capture"). Listening switches it to `play-and-record` during the tap,
 * before the microphone is asked for; the returned release puts the earlier
 * mode back when listening ends. Browsers without it are untouched.
 */
export function openMicrophoneSession(scope: { navigator?: unknown } = globalThis): () => void {
  const session = (scope.navigator as { audioSession?: AudioSession } | undefined)?.audioSession;
  if (!session || typeof session !== 'object') return () => undefined;
  let previous: string;
  try {
    previous = session.type;
    if (previous === 'play-and-record') return () => undefined;
    session.type = 'play-and-record';
  } catch {
    return () => undefined;
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    // Only this listening's own mode is put back; a mode someone set since stays.
    try { if (session.type === 'play-and-record') session.type = previous; } catch { /* left as it is */ }
  };
}

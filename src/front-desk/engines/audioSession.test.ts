import { describe, expect, it } from 'vitest';
import { openMicrophoneSession } from './audioSession';

describe('openMicrophoneSession', () => {
  it('lets the microphone in under music\'s playback-only mode, then puts that mode back', () => {
    const session = { type: 'playback' };
    const release = openMicrophoneSession({ navigator: { audioSession: session } });
    expect(session.type).toBe('play-and-record');
    release();
    expect(session.type).toBe('playback');
    // Released once only.
    session.type = 'ambient';
    release();
    expect(session.type).toBe('ambient');
  });

  it('keeps a mode set by someone else since, and leaves browsers without it alone', () => {
    const session = { type: 'auto' };
    const release = openMicrophoneSession({ navigator: { audioSession: session } });
    session.type = 'playback';
    release();
    expect(session.type).toBe('playback');
    expect(() => openMicrophoneSession({ navigator: {} })()).not.toThrow();
    expect(() => openMicrophoneSession({})()).not.toThrow();
  });
});

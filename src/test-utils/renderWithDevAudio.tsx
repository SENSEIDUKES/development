import type { ReactElement, ReactNode } from 'react';
import { DevAudioPlaybackProvider } from '../audio/DevAudioPlayback';

/**
 * Wraps a node in the shared {@link DevAudioPlaybackProvider} so tests that
 * render components consuming `useDevAudioPlayback` (or any other context
 * rooted in the package's `AudioSessionProvider`) don't have to remember to
 * add the provider themselves.
 *
 * The wrapper is intentionally stateless: it does not register a global
 * provider, so each test gets its own session and cross-test audio leakage
 * stays impossible. If you need the JSDOM media stubs, call
 * {@link installAudioMediaStubs} from `beforeEach` — they are intentionally
 * not installed globally so tests that don't exercise audio playback are not
 * wrapped in unrelated setup.
 */
export function renderWithDevAudio(node: ReactNode): ReactElement {
  return <DevAudioPlaybackProvider>{node}</DevAudioPlaybackProvider>;
}

/**
 * JSDOM's `HTMLMediaElement` ships `play` / `pause` / `load` as
 * `Not implemented` stubs that return `undefined` (or throw on `play`'s
 * returned promise). The shared audio player resolves that promise in its
 * lifecycle, so under jsdom the package would see `undefined.then(...)` and
 * crash.
 *
 * Installing these stubs once per test gives the package a resolved promise
 * for `play()` and the synchronous `undefined` for the stopper methods. The
 * methods stay `configurable: true` so individual tests can still
 * `vi.spyOn(HTMLMediaElement.prototype, 'play', ...)` over them.
 */
export function installAudioMediaStubs(): void {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: () => undefined,
  });
}

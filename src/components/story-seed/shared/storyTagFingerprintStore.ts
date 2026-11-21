import type { Fingerprint } from '../../meaning-engine/shared/fingerprint';
import { readStoryTagFingerprints } from './storyTagEngine';

let stored: Promise<Map<string, Fingerprint>> | undefined;

/**
 * Every catalog tag's stored meaning fingerprint, loaded once and only when
 * asked for, so a page that never suggests tags never downloads them.
 */
export const loadStoryTagFingerprints = (): Promise<Map<string, Fingerprint>> => stored ??= import('./storyTagFingerprints.json')
  .then(module => readStoryTagFingerprints(module.default as unknown as Parameters<typeof readStoryTagFingerprints>[0]));

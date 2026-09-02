import type { HarnessStoryHead } from './types';

export interface HarnessRuntime {
  now(): string;
  createId(prefix: string): string;
}

const randomPart = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID().replace(/-/g, '');
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

export const defaultHarnessRuntime: HarnessRuntime = {
  now: () => new Date().toISOString(),
  createId: prefix => `${prefix}_${randomPart()}`,
};

export const chapterTitleFallback = (chapterNumber: number) => `Chapter ${chapterNumber}`;

export const emptyStoryHead = (): HarnessStoryHead => ({ nextChapterNumber: 1 });

export const cloneHarnessValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Stable local identity for replayable derived records. It is not a security hash. */
export const stableHarnessId = (prefix: string, ...parts: Array<string | number | undefined>) => {
  const source = parts.map(part => part ?? '').join('\u001f');
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
};

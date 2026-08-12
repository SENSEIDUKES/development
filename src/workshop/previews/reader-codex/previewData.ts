import { createMockReaderFallback } from '../reader-chamber/previewData';

/**
 * The Codex preview reuses the Reader Chamber's one authoritative local story
 * fixture so Reader and Codex behavior are exercised against the same data.
 */
export const createReaderCodexPreviewStory = () => createMockReaderFallback().story;

/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's `src/lib/rag.ts` (Light-Novels main @ 647165a) builds the
 * steering context with a vector search: it asks the server to embed each
 * chapter summary and ranks them against the request. The Workshop never
 * calls an embedding service, so this stand-in returns the most recent
 * chapter summaries in order, as `recent-summary` context blocks.
 */
import type { ContextBlock, StoryWorld } from '../types';
import type { ContextEngine } from './contextBlocks';

export {
  CONTEXT_CHAR_LIMITS,
  contextBlocksToLegacyStrings,
} from './contextBlocks';

export async function retrieveRelevantContext(
  _currentPremise: string,
  targetChapterNumber: number,
  story: StoryWorld,
  _apiHeaders: Record<string, string> = {},
  topK: number = 3,
  _maxContextChars?: number,
  _recentNCount: number = 3,
  _contextEngine: ContextEngine = 'v1',
): Promise<ContextBlock[]> {
  return story.arcs
    .flatMap((arc) => arc.chapters)
    .filter((chapter) => chapter.number < targetChapterNumber && Boolean(chapter.summary?.trim()))
    .slice(-topK)
    .map((chapter) => ({
      kind: 'recent-summary' as const,
      chapterNumber: chapter.number,
      text: chapter.summary as string,
      summaryText: chapter.summary,
    }));
}

import { resolveChapterAudioMoments, type ResolvedAudioMoment } from '../../../audio/inlineAudio';
import type { StoryBlock } from './types';

export interface AcceptedChapterMedia {
  blocks: StoryBlock[];
  audioMoments: ResolvedAudioMoment[];
  issues: ReturnType<typeof resolveChapterAudioMoments>['issues'];
}

/**
 * Finalizes canonical chapter blocks after their text and optional metadata
 * have been normalized. Model-authored World Cue intents are resolved through
 * the approved Library catalog, then removed so only application-owned media
 * records can reach persistence and Reader Chamber.
 */
export function acceptChapterMedia(blocks: readonly StoryBlock[]): AcceptedChapterMedia {
  const resolution = resolveChapterAudioMoments(blocks);
  return {
    blocks: blocks.map(block => {
      if (!block.metadata?.audioMoments) return block;
      const { audioMoments: _modelProposal, ...metadata } = block.metadata;
      return {
        ...block,
        ...(Object.keys(metadata).length > 0 ? { metadata } : { metadata: undefined }),
      };
    }),
    audioMoments: resolution.audioMoments,
    issues: resolution.issues,
  };
}

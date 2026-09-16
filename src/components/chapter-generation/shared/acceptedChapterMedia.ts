import { resolveChapterAudioMoments, type ResolvedAudioMoment } from '../../../audio/inlineAudio';
import {
  createAuthorizedMediaCatalog,
  resolveAuthorizedSoundscape,
  type AuthorizedMediaCatalog,
  type ResolvedSoundscape,
} from '../../../audio/mediaPacks';
import type { StoryBlock } from './types';

export interface AcceptedChapterMedia {
  blocks: StoryBlock[];
  audioMoments: ResolvedAudioMoment[];
  soundscapes: ResolvedSoundscape[];
  issues: ReturnType<typeof resolveChapterAudioMoments>['issues'];
}

/**
 * Finalizes canonical chapter blocks after their text and optional metadata
 * have been normalized. Model-authored World Cue intents are resolved through
 * the approved Library catalog, then removed so only application-owned media
 * records can reach persistence and Reader Chamber.
 */
export function acceptChapterMedia(
  blocks: readonly StoryBlock[],
  catalog: AuthorizedMediaCatalog = createAuthorizedMediaCatalog(),
): AcceptedChapterMedia {
  const resolution = resolveChapterAudioMoments(blocks, undefined, catalog.soundCues);
  const audioMoments = resolution.audioMoments.map(moment => {
    const provenance = catalog.soundCueProvenanceByUrl.get(moment.cue.publicUrl);
    return provenance?.kind === 'media-pack'
      ? { ...moment, cue: { ...moment.cue, provenance } }
      : moment;
  });
  const soundscapes = blocks.flatMap(block => {
    const mood = block.metadata?.music?.mood;
    const semanticTags = [
      ...(block.metadata?.environment ?? []),
      ...(block.metadata?.atmosphereTags ?? []),
      ...(block.metadata?.atmosphereCategory ? [block.metadata.atmosphereCategory] : []),
      ...(block.metadata?.sceneType ? [block.metadata.sceneType] : []),
    ];
    if (!mood && semanticTags.length === 0) return [];
    const resolved = resolveAuthorizedSoundscape({
      blockId: block.id,
      ...(mood ? { mood } : {}),
      semanticTags,
    }, catalog);
    return resolved ? [resolved] : [];
  });
  return {
    blocks: blocks.map(block => {
      if (!block.metadata?.audioMoments) return block;
      const { audioMoments: _modelProposal, ...metadata } = block.metadata;
      return {
        ...block,
        ...(Object.keys(metadata).length > 0 ? { metadata } : { metadata: undefined }),
      };
    }),
    audioMoments,
    soundscapes,
    issues: resolution.issues,
  };
}

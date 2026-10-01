import { findFoundationRevision, findStory, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import type { StorySeedInput, WorldBlueprint } from '@seihouse/sen/story-seed';
import type { StoryDetailDisplay } from '../../components/light-novels-home/shared/storyDetailContracts';

/**
 * A HARNESS story as its World Info page shows it, from what the story already
 * knows: its title and genre, its Story Seed tags, its Blueprint logline (else
 * its premise), and how many chapters it has. Cover art, author and arc stay
 * empty, so the page leaves them out instead of inventing them.
 */
export function harnessStoryDisplay(state: HarnessWorkspaceState, storyId: string): StoryDetailDisplay | undefined {
  const story = findStory(state, storyId);
  if (!story) return undefined;
  const input = findFoundationRevision(state, story.activeFoundationRevisionId)?.input;
  // The Story Seed and Blueprint travel as the story's frozen source evidence.
  const source = input?.sourceSnapshot?.kind === 'story-seed' ? input.sourceSnapshot : undefined;
  const seed = source?.seed as Partial<StorySeedInput> | undefined;
  const blueprint = source?.blueprint as Partial<WorldBlueprint> | undefined;
  const logline = typeof blueprint?.logline === 'string' ? blueprint.logline.trim() : '';
  const tags = seed?.story?.required?.storyTags;
  return {
    id: story.id,
    title: story.title,
    genre: input?.genre?.trim() ?? '',
    createdAt: story.createdAt,
    reads: 0,
    imageUrl: '',
    chapterCount: state.chapters.filter(chapter => chapter.storyId === story.id).length,
    ...(story.chapterWritingStyle ? { chapterWritingStyle: story.chapterWritingStyle } : {}),
    mcName: input?.cast?.find(member => member.isMainCharacter)?.name ?? '',
    powerStage: '',
    author: '',
    synopsis: logline || input?.premise.trim() || '',
    currentArc: '',
    status: '',
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [],
  };
}

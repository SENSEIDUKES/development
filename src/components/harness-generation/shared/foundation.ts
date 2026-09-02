import { defaultHarnessRuntime, emptyStoryHead, type HarnessRuntime } from './ids';
import type {
  HarnessStory,
  HarnessWorkspaceState,
  StoryFoundationInput,
  StoryFoundationRevision,
} from './types';

const optionalFoundationKeys = [
  'title',
  'permanentInstructions',
  'toneStyle',
  'genre',
  'openingSituation',
  'declaredCanon',
  'characters',
  'worldFacts',
  'intendedDirection',
] as const;

export const normalizeStoryFoundationInput = (input: StoryFoundationInput): StoryFoundationInput => {
  const premise = input.premise?.trim();
  if (!premise) throw new Error('A Story Foundation needs a premise before a chapter can be generated.');

  const normalized: StoryFoundationInput = { premise };
  for (const key of optionalFoundationKeys) {
    const value = input[key]?.trim();
    if (value) normalized[key] = value;
  }
  return normalized;
};

export const titleFromFoundation = (foundation: StoryFoundationInput): string => {
  if (foundation.title?.trim()) return foundation.title.trim();
  const firstLine = foundation.premise.split(/\r?\n|[.!?]/)[0]?.trim();
  return firstLine ? firstLine.slice(0, 72) : 'Untitled Harness Story';
};

export const findFoundationRevision = (
  state: HarnessWorkspaceState,
  foundationRevisionId: string,
): StoryFoundationRevision | undefined => state.foundations.find(revision => revision.id === foundationRevisionId);

export const findStory = (state: HarnessWorkspaceState, storyId: string): HarnessStory | undefined =>
  state.stories.find(story => story.id === storyId);

export const createHarnessStory = (
  state: HarnessWorkspaceState,
  input: StoryFoundationInput,
  runtime: HarnessRuntime = defaultHarnessRuntime,
): { state: HarnessWorkspaceState; story: HarnessStory; foundation: StoryFoundationRevision } => {
  const normalizedInput = normalizeStoryFoundationInput(input);
  const createdAt = runtime.now();
  const storyId = runtime.createId('hst');
  const foundation: StoryFoundationRevision = {
    id: runtime.createId('hfr'),
    storyId,
    revision: 1,
    createdAt,
    input: normalizedInput,
  };
  const story: HarnessStory = {
    id: storyId,
    title: titleFromFoundation(normalizedInput),
    createdAt,
    updatedAt: createdAt,
    activeFoundationRevisionId: foundation.id,
    foundationRevisionIds: [foundation.id],
    head: emptyStoryHead(),
  };
  return {
    state: {
      ...state,
      stories: [...state.stories, story],
      foundations: [...state.foundations, foundation],
    },
    story,
    foundation,
  };
};

export const reviseStoryFoundation = (
  state: HarnessWorkspaceState,
  storyId: string,
  input: StoryFoundationInput,
  runtime: HarnessRuntime = defaultHarnessRuntime,
): { state: HarnessWorkspaceState; story: HarnessStory; foundation: StoryFoundationRevision } => {
  const story = findStory(state, storyId);
  if (!story) throw new Error('The selected Harness story no longer exists.');
  const normalizedInput = normalizeStoryFoundationInput(input);
  const createdAt = runtime.now();
  const foundation: StoryFoundationRevision = {
    id: runtime.createId('hfr'),
    storyId,
    revision: story.foundationRevisionIds.length + 1,
    createdAt,
    input: normalizedInput,
  };
  const revisedStory: HarnessStory = {
    ...story,
    title: titleFromFoundation(normalizedInput),
    updatedAt: createdAt,
    activeFoundationRevisionId: foundation.id,
    foundationRevisionIds: [...story.foundationRevisionIds, foundation.id],
  };
  return {
    state: {
      ...state,
      stories: state.stories.map(candidate => candidate.id === storyId ? revisedStory : candidate),
      foundations: [...state.foundations, foundation],
    },
    story: revisedStory,
    foundation,
  };
};

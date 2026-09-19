export const HUB_STORY_ID_MARKERS = ['demo-matrix-', 'challenge-'] as const;

type StoryIdentity = { id?: string | null } | null | undefined;
type ProfileIdentity = { premiumTier?: string | null } | null | undefined;

const readStoryId = (story: StoryIdentity | string | null | undefined): string | null => {
  if (typeof story === 'string') return story;
  return typeof story?.id === 'string' ? story.id : null;
};

export const isHubStory = (story: StoryIdentity | string): boolean => {
  const id = readStoryId(story);
  return Boolean(id && HUB_STORY_ID_MARKERS.some((marker) => id.includes(marker)));
};

export const hasHubStoryIdPrefix = (story: StoryIdentity | string): boolean => {
  const id = readStoryId(story);
  return Boolean(id && HUB_STORY_ID_MARKERS.some((marker) => id.startsWith(marker)));
};

export const hasDemoMatrixIdPrefix = (story: StoryIdentity | string): boolean =>
  Boolean(readStoryId(story)?.startsWith('demo-matrix-'));

export const isMortalTier = (profile: ProfileIdentity | unknown): boolean => {
  if (!profile || typeof profile !== 'object') return true;
  const premiumTier = 'premiumTier' in profile
    ? (profile as ProfileIdentity)?.premiumTier
    : undefined;
  return !premiumTier || premiumTier === 'mortal';
};

export const isHubStoryLockedForUser = (
  story: StoryIdentity | string,
  profile: ProfileIdentity | unknown,
): boolean => isMortalTier(profile) && isHubStory(story);

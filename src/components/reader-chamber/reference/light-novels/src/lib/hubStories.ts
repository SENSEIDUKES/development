import type { UserProfile } from '../types';

/**
 * Identity rules for built-in Hub content — the demo matrices and Fate
 * survival challenges shipped with the Library rather than authored by a
 * reader.
 *
 * These predicates used to be re-derived inline at every call site (the Codex
 * character, artifact, and image-evolution surfaces each carried their own
 * copy, and the story store carried two more). The copies had already drifted:
 * the entitlement gates matched with `includes`, the store's cleanup matched
 * with `startsWith`, and nothing recorded that the difference was deliberate.
 * It is deliberate, and it is expressed here once, under two names that say
 * which question is being asked.
 */

/**
 * Id fragments that mark a story as built-in Hub content.
 *
 * A reader's own copy of a Hub world is minted as `${templateId}-${uid}`
 * (see `openPublishedWorld`), so the marker stays a leading prefix in every
 * id this app currently creates.
 */
export const HUB_STORY_ID_MARKERS = ['demo-matrix-', 'challenge-'] as const;

type StoryIdentity = { id?: string | null } | null | undefined;

const readStoryId = (story: StoryIdentity | string | null | undefined): string | null => {
  if (typeof story === 'string') return story;
  const id = story?.id;
  return typeof id === 'string' ? id : null;
};

/**
 * Whether a story is built-in Hub content, for **entitlement** decisions.
 *
 * Matches anywhere in the id, which is what the premium gates have always
 * done. The permissive form is the safe direction for a gate: the failure it
 * risks is locking a customization that could have been allowed, never
 * unlocking paid Hub content or letting a model edit a shipped codex.
 */
export const isHubStory = (story: StoryIdentity | string): boolean => {
  const id = readStoryId(story);
  if (!id) return false;
  return HUB_STORY_ID_MARKERS.some(marker => id.includes(marker));
};

/**
 * Whether a story id was minted from a built-in template, for **destructive**
 * decisions (cleanup, migration, discard).
 *
 * Deliberately stricter than `isHubStory`: it anchors at the start of the id,
 * so a reader-authored story that merely happens to contain a marker in a
 * generated suffix can never be selected for deletion. Widening this to match
 * `isHubStory` would put reader-owned worlds in range of the cleanup paths.
 */
export const hasHubStoryIdPrefix = (story: StoryIdentity | string): boolean => {
  const id = readStoryId(story);
  if (!id) return false;
  return HUB_STORY_ID_MARKERS.some(marker => id.startsWith(marker));
};

/** Whether a story id was minted from a demo-matrix template specifically. */
export const hasDemoMatrixIdPrefix = (story: StoryIdentity | string): boolean => {
  const id = readStoryId(story);
  return id ? id.startsWith('demo-matrix-') : false;
};

/**
 * Mortal tier covers both the signed-out reader and an account that has not
 * ascended, which is why an absent profile counts as mortal.
 */
export const isMortalTier = (
  userProfile: Pick<UserProfile, 'premiumTier'> | null | undefined,
): boolean =>
  !userProfile || !userProfile.premiumTier || userProfile.premiumTier === 'mortal';

/**
 * The single entitlement question the Codex surfaces actually ask: may this
 * reader re-manifest the visuals of a story they did not author?
 */
export const isHubStoryLockedForUser = (
  story: StoryIdentity | string,
  userProfile: Pick<UserProfile, 'premiumTier'> | null | undefined,
): boolean => isMortalTier(userProfile) && isHubStory(story);

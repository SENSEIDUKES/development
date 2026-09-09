/**
 * The Cave's public view of a cultivator.
 *
 * Public Home is the same composition as private Home with four of its
 * information areas swapped: cultivation progress becomes the bio, Qi Reserves
 * become Stats, Active Effects become Highlights, and the Daily Dao Pillar
 * becomes Boost. This module owns what those areas read, so the Home component
 * stays a single composition rather than two pages.
 *
 * Two rules shape it:
 *
 * 1. **One record in, one presentation out.** `buildPublicProfile` takes the
 *    *viewed* cultivator's record and the *viewed* cultivator's stories, and
 *    returns everything the public surfaces render. Public surfaces read only
 *    the returned value, never the signed-in controller, so a public page
 *    cannot accidentally show the viewer their own private state.
 * 2. **Withheld is a value, not an absence.** Each area resolves to `null`
 *    when the cultivator has not made it public, so the surface can say the
 *    area is private instead of rendering an ambiguous empty block.
 *
 * The bio, the highlight selection, and the reading-time figure have no
 * production field behind them yet. `developmentPublicRecord` derives them
 * locally from the profile record that does exist, and is the one function a
 * host replaces when a real public-profile record lands. Nothing here is
 * persisted, authorized, or rewarded.
 */

import type { CosmicArtifact, Story, UserProfile } from '../shared/types';
import { getDaoRankData } from './qi';

/** The five areas a cultivator chooses to publish. */
export interface PublicProfileVisibility {
  bio: boolean;
  stats: boolean;
  relicTitles: boolean;
  stories: boolean;
  highlights: boolean;
}

export const DEFAULT_PUBLIC_PROFILE_VISIBILITY: PublicProfileVisibility = {
  bio: true,
  stats: true,
  relicTitles: true,
  stories: true,
  highlights: true,
};

/** Rendered by the Settings visibility controls, in this order. */
export const PUBLIC_PROFILE_VISIBILITY_FIELDS: readonly {
  id: keyof PublicProfileVisibility;
  label: string;
  description: string;
}[] = [
  { id: 'bio', label: 'Bio', description: 'The paragraph shown where cultivation progress sits privately.' },
  { id: 'stats', label: 'Stats', description: 'Date started, reading activity, and reading time.' },
  { id: 'highlights', label: 'Highlights', description: 'The media and moments you chose to feature.' },
  { id: 'stories', label: 'Stories', description: 'Which of your stories appear on your public Stories page.' },
  { id: 'relicTitles', label: 'Relic titles', description: 'Relic names only — never their descriptions or rewards.' },
];

/** The media a highlight may point at. Presentation only; no player is wired. */
export type PublicHighlightMedium = 'codex-image' | 'audio' | 'clip' | 'moment';

export interface PublicProfileHighlight {
  id: string;
  medium: PublicHighlightMedium;
  title: string;
  detail: string;
  /** Where the highlight resolves to. Absent while the media route is unbuilt. */
  href?: string;
  /** Thumbnail for an image highlight. */
  previewSrc?: string;
}

export interface PublicProfileStat {
  id: string;
  label: string;
  value: string;
}

/** What a cultivator has chosen to publish, before visibility is applied. */
export interface PublicProfileRecord {
  bio: string;
  stats: readonly PublicProfileStat[];
  highlights: readonly PublicProfileHighlight[];
  storyTitles: readonly string[];
  relicTitles: readonly string[];
}

/** What the public surfaces render. `null` means withheld by the cultivator. */
export interface PublicProfilePresentation {
  bio: string | null;
  stats: readonly PublicProfileStat[] | null;
  highlights: readonly PublicProfileHighlight[] | null;
  storyTitles: readonly string[] | null;
  relicTitles: readonly string[] | null;
  visibility: PublicProfileVisibility;
}

const MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

/** The month a cultivator started, as a public profile shows it. */
function formatStartedOn(value: string | undefined): string {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 'Unknown' : MONTH_YEAR.format(new Date(parsed));
}

/** Reading time as hours and minutes, dropping an empty remainder. */
function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

/**
 * Development-only reading rate. Lifetime cultivation is the only durable
 * record of time spent reading in the current domain model, so the Workshop
 * reads an hour of reading out of it at a fixed rate. A host with real session
 * telemetry replaces this whole function, not the constant.
 */
const DEVELOPMENT_QI_PER_MINUTE = 12;

/**
 * The four featured entries, one per supported medium, drawn from the
 * cultivator's own relics and stories. A host with a real highlight selection
 * replaces this alongside `developmentPublicRecord`.
 */
function highlightsFor(profile: UserProfile, stories: readonly Story[]): PublicProfileHighlight[] {
  const inventory: readonly CosmicArtifact[] = profile.cosmicInventory ?? [];
  const relic = inventory.find(artifact => artifact.id === profile.equippedArtifactId) ?? inventory[0];
  const story = stories.find(candidate => !candidate.deleted);
  const highlights: PublicProfileHighlight[] = [];

  if (relic) {
    highlights.push({
      id: `highlight-codex-${relic.id}`,
      medium: 'codex-image',
      title: relic.name,
      detail: `Codex image · ${relic.rarity}`,
      previewSrc: relic.imageUrl || profile.avatarUrl || undefined,
    });
  }
  if (story) {
    highlights.push({
      id: `highlight-audio-${story.id}`,
      medium: 'audio',
      title: `${story.title} — opening narration`,
      detail: 'Audio · 2 min',
    });
    highlights.push({
      id: `highlight-clip-${story.id}`,
      medium: 'clip',
      title: `${story.title} — manifestation clip`,
      detail: 'Short clip · 14 sec',
    });
  }
  if (relic?.sourceStoryTitle && relic.sourceChapterNumber) {
    highlights.push({
      id: `highlight-moment-${relic.id}`,
      medium: 'moment',
      title: `${relic.sourceStoryTitle}, Chapter ${relic.sourceChapterNumber}`,
      detail: `Favorite moment · ${relic.milestoneName}`,
    });
  }
  return highlights;
}

/**
 * The development stand-in for a host-supplied public-profile record. Every
 * value is derived from the profile record the Cave already reads; nothing is
 * fetched, stored, or authorized.
 */
export function developmentPublicRecord(
  profile: UserProfile,
  stories: readonly Story[],
): PublicProfileRecord {
  const lifetimeQi = profile.dao_xp ?? profile.qi ?? 0;
  const rank = getDaoRankData(lifetimeQi).rank;
  // Scoped to the viewed cultivator, not whoever is signed in — a public page
  // must never attribute another account's stories to this profile. The
  // unowned allowance matches `UserProfileStoriesPanel`, where a story with no
  // recorded owner belongs to the local library it is being rendered for.
  const activeStories = stories.filter(
    story => !story.deleted && (story.userId === profile.uid || !story.userId),
  );

  return {
    bio: lifetimeQi > 0
      ? `${rank} of the quiet hours. I read slowly, reread often, and keep a lantern lit for the arcs everyone else abandoned.`
      : '',
    stats: [
      { id: 'started', label: 'Started', value: formatStartedOn(profile.joinedDate) },
      { id: 'stories', label: 'Stories read', value: `${profile.savedStoryCount ?? activeStories.length}` },
      { id: 'streak', label: 'Reading streak', value: `${profile.daoPillarStreak ?? 0} days` },
      {
        id: 'reading-time',
        label: 'Reading time',
        value: formatReadingTime(Math.round(lifetimeQi / DEVELOPMENT_QI_PER_MINUTE)),
      },
    ],
    highlights: highlightsFor(profile, activeStories),
    storyTitles: activeStories.map(story => story.title),
    relicTitles: (profile.cosmicInventory ?? []).map(artifact => artifact.name),
  };
}

/** Apply the cultivator's visibility choices to their record. */
export function buildPublicProfile(
  record: PublicProfileRecord,
  visibility: PublicProfileVisibility,
): PublicProfilePresentation {
  return {
    bio: visibility.bio ? record.bio : null,
    stats: visibility.stats ? record.stats : null,
    highlights: visibility.highlights ? record.highlights : null,
    storyTitles: visibility.stories ? record.storyTitles : null,
    relicTitles: visibility.relicTitles ? record.relicTitles : null,
    visibility,
  };
}

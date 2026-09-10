import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Sprout } from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { SEIEmptyState, SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import type { AppUser, Story, StorySeed, UserProfile as UserProfileType } from '../shared/types';
import { useUserProfileServices } from '../shared/userProfileServices';

interface UserProfileStoriesPanelProps {
  profile: UserProfileType | null;
  currentUser: AppUser | null;
  stories: Story[];
}

/**
 * Stories destination: Manifested Stories and the account's Story Seeds in one
 * place. The story filtering, the seed index request, and the export calls are
 * production behaviour unchanged; the services port still owns seed listing
 * and export.
 */
export function UserProfileStoriesPanel({ profile, currentUser, stories }: UserProfileStoriesPanelProps) {
  // Production imports these three from `lib/storySeedStorage` and
  // `lib/storySeedFormat`; both read the signed-in account. Injected here.
  const { listStorySeeds, downloadStorySeed, downloadStorySeedCollection } = useUserProfileServices();
  const inactiveFlowIds = profile?.inactiveStories || [];
  const inactiveFlowIdSet = new Set(inactiveFlowIds);
  const userStories = stories.filter(s => !s.deleted && (s.userId === currentUser?.uid || !s.userId));
  const activeFlows = userStories.filter(s => !inactiveFlowIdSet.has(s.id));
  const restingFlows = userStories.filter(s => inactiveFlowIdSet.has(s.id));
  const [seeds, setSeeds] = useState<StorySeed[]>([]);
  const [isLoadingSeeds, setIsLoadingSeeds] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const seedReferenceSignature = userStories
    .map(story => `${story.id}:${story.sourceSeedId || ''}`)
    .join('|');

  useEffect(() => {
    if (!currentUser) {
      setSeeds([]);
      return;
    }

    const expectedUid = currentUser.uid;
    let cancelled = false;
    setIsLoadingSeeds(true);
    setSeedError(null);
    listStorySeeds()
      .then(accountSeeds => {
        if (!cancelled && currentUser.uid === expectedUid) setSeeds(accountSeeds);
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Failed to load profile story seeds:', error);
          setSeedError('Story seeds are temporarily unavailable. Your stories and embedded seed data are unchanged.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSeeds(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, seedReferenceSignature]);

  const exportSeed = (seed: StorySeed) => {
    setSeedError(null);
    void downloadStorySeed(seed).catch(error => {
      console.error('Failed to export profile story seed:', error);
      setSeedError('That seed could not be exported. Please try again.');
    });
  };

  const exportAllSeeds = () => {
    setSeedError(null);
    void downloadStorySeedCollection(seeds).catch(error => {
      console.error('Failed to export profile story seeds:', error);
      setSeedError('Your story seeds could not be exported. Please try again.');
    });
  };

  const formatSeedDate = (seed: StorySeed): string => {
    const date = new Date(seed.updatedAt || seed.createdAt);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
  };

  const seedTitleById = new Map(seeds.map(seed => [seed.id, seed.title]));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
      {/* Manifested Stories */}
      <LibraryPanel as="section" aria-labelledby="cave-manifested-stories" padding="md" className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h3
            id="cave-manifested-stories"
            className="flex items-center gap-2 font-sc text-[11px] font-bold uppercase tracking-widest text-[#7dd3ff]"
          >
            <BookOpen size={14} aria-hidden="true" />
            Manifested Stories
          </h3>
          <span className="rounded-full bg-[#04ACFF]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#7dd3ff]">
            {activeFlows.length}
          </span>
        </div>

        {activeFlows.length === 0 ? (
          <SEIEmptyState
            icon={BookOpen}
            size="sm"
            titleAs="p"
            title="No realms manifested yet"
            description="Stories you manifest from the Creation Portal gather here."
          />
        ) : (
          <ul className="space-y-2" aria-label="Manifested stories">
            {activeFlows.map(story => (
              <li
                key={story.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#04ACFF] motion-reduce:animate-none"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-[13px] text-neutral-200">{story.title}</p>
                  {story.sourceSeedId ? (
                    <p className="truncate font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                      Seed: {seedTitleById.get(story.sourceSeedId) ?? story.sourceSeedId}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 font-sc text-[9px] uppercase tracking-widest text-[#7dd3ff]/80">Active</span>
              </li>
            ))}
          </ul>
        )}

        {restingFlows.length > 0 ? (
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            {restingFlows.length} resting {restingFlows.length === 1 ? 'realm' : 'realms'} not shown
          </p>
        ) : null}
      </LibraryPanel>

      {/* Story Seeds */}
      <LibraryPanel as="section" aria-labelledby="cave-story-seeds" padding="md" className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h3
            id="cave-story-seeds"
            className="flex items-center gap-2 font-sc text-[11px] font-bold uppercase tracking-widest text-emerald-400"
          >
            <Sprout size={14} aria-hidden="true" />
            Story Seeds
          </h3>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
            {seeds.length}
          </span>
        </div>
        <p className="font-sans text-[11px] leading-relaxed text-neutral-400">
          Private account seeds are stored separately from generated stories. Deleting a story does not
          delete its seed. Import seeds from the Creation Portal or export them here as portable JSON.
        </p>

        {seedError ? (
          <SEIInlineAlert tone="danger" role="alert" className="text-xs">
            {seedError}
          </SEIInlineAlert>
        ) : null}

        {isLoadingSeeds ? (
          <SEILoadingState size="sm" title="Loading account seeds" />
        ) : seeds.length === 0 ? (
          <SEIEmptyState
            icon={Sprout}
            size="sm"
            titleAs="p"
            title="No account seeds indexed yet"
          />
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1" aria-label="Story seeds">
            {seeds.map(seed => (
              <li
                key={seed.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-[12px] text-neutral-200">{seed.title}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                    Updated {formatSeedDate(seed)}
                  </p>
                </div>
                <LibraryButton
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  aria-label={`Export ${seed.title} seed`}
                  onClick={() => exportSeed(seed)}
                  className="shrink-0"
                >
                  Export
                </LibraryButton>
              </li>
            ))}
          </ul>
        )}

        <LibraryButton
          variant="secondary"
          icon={Download}
          fullWidth
          disabled={seeds.length === 0 || isLoadingSeeds}
          onClick={exportAllSeeds}
        >
          Export all seed JSON
        </LibraryButton>
      </LibraryPanel>
    </div>
  );
}

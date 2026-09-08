import React, { useEffect, useState } from 'react';
import { UserProfile as UserProfileType, AppUser, Story, StorySeed } from '../shared/types';
import { BookOpen, Download, Sprout } from 'lucide-react';
import { useUserProfileServices } from '../shared/userProfileServices';

interface UserProfileStoriesPanelProps {
  profile: UserProfileType | null;
  currentUser: AppUser | null;
  stories: Story[];
}

export function UserProfileStoriesPanel({ profile, currentUser, stories }: UserProfileStoriesPanelProps) {
  // Production imports these three from `lib/storySeedStorage` and
  // `lib/storySeedFormat`; both read the signed-in account. Injected here.
  const { listStorySeeds, downloadStorySeed, downloadStorySeedCollection } = useUserProfileServices();
  const inactiveFlowIds = profile?.inactiveStories || [];
  const userStories = stories.filter(s => !s.deleted && (s.userId === currentUser?.uid || !s.userId));
  const activeFlows = userStories.filter(s => !inactiveFlowIds.includes(s.id));
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

  return (
    <div className="pt-10 border-t border-neutral-900/50 mt-10">
      <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
        <BookOpen size={14} className="text-human" />
        Manifested Realms
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Stories */}
        <div className="border border-portal/10 bg-void rounded-xl p-5 shadow-[0_0_15px_rgba(4,172,255,0.03)] hover:border-portal/30 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-portal font-sc">Active Flows</h4>
            <span className="text-[9px] px-2 py-0.5 bg-portal/10 text-portal rounded-full font-bold">{activeFlows.length}</span>
          </div>
          <div className="space-y-3">
            {activeFlows.length === 0 ? (
              <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide">No realms manifested yet.</div>
            ) : (
              activeFlows.map(s => (
                <div key={s.id} className="text-[13px] text-neutral-300 font-sans flex items-center gap-3 overflow-hidden group hover:text-signal transition-colors py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-portal flex-shrink-0 animate-pulse"></span>
                  <span className="truncate">{s.title}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Account-owned story seed index */}
        <div className="border border-emerald-500/10 bg-void rounded-xl p-5 shadow-[0_0_15px_rgba(16,185,129,0.03)] hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-sc flex items-center gap-2">
              <Sprout size={13} />
              Story Seeds
            </h4>
            <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">{seeds.length}</span>
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-neutral-500 font-sans">
            Private account seeds are stored separately from generated stories. Deleting a story does not delete its seed. Import seeds from the Creation Portal or export them here as portable JSON.
          </p>

          {seedError && (
            <p className="mb-3 rounded border border-human/30 bg-human/5 p-2 text-[10px] leading-relaxed text-human font-sans" role="alert">
              {seedError}
            </p>
          )}

          <div className="space-y-3">
            {isLoadingSeeds ? (
              <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide" role="status">Loading account seeds…</div>
            ) : seeds.length === 0 ? (
              <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide">No account seeds indexed yet.</div>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {seeds.map(seed => (
                  <div key={seed.id} className="flex items-center justify-between gap-3 rounded border border-neutral-900 bg-neutral-950/40 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] text-neutral-300 font-sans">{seed.title}</div>
                      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-neutral-600 font-mono">
                        Updated {formatSeedDate(seed)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportSeed(seed)}
                      aria-label={`Export ${seed.title} seed`}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded border border-emerald-500/30 px-2.5 py-1.5 text-[9px] uppercase tracking-widest text-emerald-400 font-sc font-bold hover:bg-emerald-500/10 transition-colors"
                    >
                      <Download size={11} />
                      Export
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={exportAllSeeds}
            disabled={seeds.length === 0 || isLoadingSeeds}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded border border-neutral-800 px-3 py-2 text-[9px] uppercase tracking-widest text-neutral-300 font-sc font-bold hover:border-emerald-500/50 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <Download size={12} />
            Export All Seed JSON
          </button>
        </div>
      </div>
    </div>
  );
}

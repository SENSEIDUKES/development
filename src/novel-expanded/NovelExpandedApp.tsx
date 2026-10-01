import { useEffect, useMemo, useState } from 'react';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { StoryPages, storyHomeWorlds, useLibraryStories } from '@seihouse/library/stories';
import { findStory, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { NarrativeButton } from '@seihouse/sen/presentation';
import { DevAudioPlaybackProvider } from '../audio/DevAudioPlayback';
import { useModelPreference } from '../host/generation/modelPreference';
import { LIBRARY_ASSETS } from '../host/media/libraryAssets';
import { LIBRARY_BASE_MEDIA } from '../host/media/libraryCatalog';
import { MANIFEST_BACKDROPS } from '../host/reader/manifestBackdrops';
import { startHarnessStoryFromSeed } from '../host/story-seed/startHarnessStory';
import { AGENTS } from '../lib/agents';
import { CreatePage } from './CreatePage';
import { HomePage } from './HomePage';
import { HOME_ROUTE, useAppRoute } from './routes';
import type { NovelExpandedServices } from './services';
import { startedSeedIds } from './storyCreationRuntime';

/**
 * NovelExpanded: Home → Create (Story Seed and World Blueprint) → Story View
 * (World Info) → Reader, and nothing else. Its chapters are written the same
 * way as the Workshop's: the official CAPA skills, the Library's sound words
 * and Sound Cues, memory read only on request, and the Model Router's choice.
 */
export function NovelExpandedApp({ services }: { services: NovelExpandedServices }) {
  return <DevAudioPlaybackProvider>
    <LibraryPresentationProvider assets={LIBRARY_ASSETS} backdrops={MANIFEST_BACKDROPS}>
      <NovelExpandedPages services={services} />
    </LibraryPresentationProvider>
  </DevAudioPlaybackProvider>;
}

function NovelExpandedPages({ services }: { services: NovelExpandedServices }) {
  const [route, navigate] = useAppRoute();
  const [chapterModel] = useModelPreference('chapters');
  const [skills, setSkills] = useState<HarnessSkillManifest[]>();
  const [skillsError, setSkillsError] = useState<string>();
  const [skillsAttempt, setSkillsAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setSkillsError(undefined);
    services.installSkills().then(
      installed => { if (active) setSkills(installed); },
      error => { if (active) setSkillsError(`The writing skills could not be loaded. ${error instanceof Error ? error.message : ''}`.trim()); },
    );
    return () => { active = false; };
  }, [services, skillsAttempt]);

  const stories = useLibraryStories({
    repository: services.stories, modelAdapter: services.writer, installedSkills: skills,
    baseMedia: LIBRARY_BASE_MEDIA, preferredModel: chapterModel,
  });
  const { state } = stories;
  const worlds = useMemo(() => state ? storyHomeWorlds(state) : [], [state]);
  const seedIds = useMemo(() => state ? startedSeedIds(state) : [], [state]);
  const storyId = route.page === 'story' || route.page === 'read' ? route.storyId : undefined;
  const missing = Boolean(state && storyId && !findStory(state, storyId));
  // A story that is not here (an old link, another browser) goes Home.
  useEffect(() => { if (missing) navigate(HOME_ROUTE, { replace: true }); }, [missing, navigate]);

  if (!state || !skills) {
    const error = skillsError ?? stories.loadError;
    return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center font-sans">
      {error
        ? <>
            <p role="alert" className="text-sm text-amber-200">{error}</p>
            <NarrativeButton onClick={() => { if (skillsError) setSkillsAttempt(value => value + 1); stories.retry(); }}>Retry</NarrativeButton>
          </>
        : <p role="status" className="text-sm text-neutral-400">Opening your stories…</p>}
    </main>;
  }

  if (route.page === 'create') return <CreatePage services={services} startedSeedIds={seedIds}
    onHome={() => navigate(HOME_ROUTE)}
    onStartStory={async payload => {
      const story = await startHarnessStoryFromSeed(stories.controller, payload);
      // The new story replaces Create, so Back from it goes Home.
      navigate({ page: 'story', storyId: story.id }, { replace: true });
    }} />;

  if (storyId) return missing ? null : <StoryPages key={storyId} stories={stories} storyId={storyId}
    page={route.page === 'read' ? 'read' : 'info'} readerStateRepository={services.readerState}
    writingAgent={AGENTS.VERSA} backLabel="Back to your stories"
    onOpenReader={() => navigate({ page: 'read', storyId })}
    onCloseReader={() => navigate({ page: 'story', storyId })}
    onBack={() => navigate(HOME_ROUTE)} />;

  return <HomePage worlds={worlds} onCreate={() => navigate({ page: 'create' })}
    onOpenStory={id => navigate({ page: 'story', storyId: id })} />;
}

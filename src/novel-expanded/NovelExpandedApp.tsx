import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ReaderMixerProvider, type ReaderMixer } from '@seihouse/audio-player';
import { LibraryPresentationProvider, loadingFamiliarPresentation } from '@seihouse/library/presentation';
import {
  HeaderSoundControl, LibraryDesktopNavigationProvider, LibraryDestinationsProvider, WorkspaceHeaderSoundProvider, useMenuMusic, useStoredLibrarySidebarMode,
} from '@seihouse/library/shell';
import { CreateStorySettings, StoryPages, storyHomeWorlds, useLibraryStories, useStorySettingsDraft } from '@seihouse/library/stories';
import { findStory, nextChapterWaitsOnReader, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { createOfficialCapaDefaultLoadout } from '../host/generation/capa/officialCapaSkills';
import { NarrativeButton } from '@seihouse/sen/presentation';
import { EconomyClientProviders } from '../host/economy/EconomyClientProviders';
import { useModelPreference } from '../host/generation/modelPreference';
import { LIBRARY_ASSETS } from '../host/media/libraryAssets';
import { LIBRARY_BASE_MEDIA } from '../host/media/libraryCatalog';
import { MANIFEST_BACKDROPS } from '../host/reader/manifestBackdrops';
import { startHarnessStoryFromSeed } from '../host/story-seed/startHarnessStory';
import { AGENTS } from '../lib/agents';
import { defaultFamiliar, familiarCatalogueEntry } from '../host/familiar/catalogue';
import { useDeviceProfile } from '../host/profile/deviceProfile';
import { AccessTokenSheet, type AccessTokenRequest } from './AccessTokenSheet';
import { AppFamiliar } from './AppFamiliar';
import { APP_DESTINATIONS } from './appPlaces';
import { AppShell } from './AppShell';
import { coverRequesterWithAccessToken, writerWithAccessToken, type AskForAccessToken } from './accessToken';
import { useStoryCovers } from '../host/media/storyCovers';
import { APP_SOUNDSCAPES, useAppMusic } from './appMusic';
import { CreatePage } from './CreatePage';
import { HomePage } from './HomePage';
import { ProfilePage } from './ProfilePage';
import { HOME_ROUTE, useAppRoute } from './routes';
import type { NovelExpandedServices } from './services';
import { NOVEL_EXPANDED_READER_ID, startedSeedIds, storySourceSeedId } from './storyCreationRuntime';

/**
 * NovelExpanded: Home → Create (Story Seed and World Blueprint) → Story View
 * (World Info) → Reader, with the reader's Profile beside them. Its chapters
 * are written the same way as the Workshop's: the official CAPA skills, the
 * Library's sound words and Sound Cues, memory read only on request, and the
 * Model Router's choice.
 * Its one sound owner is the reader mixer (the SEIHouse audio player), made
 * once by the page that mounts the app and kept for the page's lifetime: the
 * app's own music plays through it on its menus (while the reader's Menu
 * music setting is on, with the music note in every Library header to mute
 * it or set its volume), and the Reader's own music and each chapter's scene
 * in the Reader. Home and World Info sit in the Library Shell (`AppShell`),
 * Create in its workspace mode, and Profile is the Library's Cave; the Reader
 * stays outside, immersive.
 * The reader's profile (`services.profile`) is the one record of their name,
 * languages, Reading Mode and Familiar: the Cave edits it, the floating
 * Familiar and the writing veil wear its Familiar, and Create starts new
 * Story Seeds from its defaults. Every page shares the one economy account
 * (`services.economy`).
 */
export function NovelExpandedApp({ services, readerMixer }: {
  services: NovelExpandedServices;
  readerMixer: ReaderMixer;
}) {
  const profile = useDeviceProfile(services.profile);
  const loadingFamiliar = useMemo(() => loadingFamiliarPresentation(
    (familiarCatalogueEntry(profile.familiarId) ?? defaultFamiliar).definition,
  ), [profile.familiarId]);
  const [menuMusic] = useMenuMusic(services.readerPreferences);
  useAppMusic(readerMixer, menuMusic);
  // The laptop sidebar opens the way the reader last left it, on this device.
  const [sidebarMode, setSidebarMode] = useStoredLibrarySidebarMode(services.readerPreferences);
  return <ReaderMixerProvider mixer={readerMixer}>
    <LibraryPresentationProvider assets={LIBRARY_ASSETS} backdrops={MANIFEST_BACKDROPS} loadingFamiliar={loadingFamiliar}>
      <LibraryDesktopNavigationProvider value="sidebar" sidebarMode={sidebarMode} onSidebarModeChange={setSidebarMode}>
        {/* The app's places in every Library navigation, the Cave's included. */}
        <LibraryDestinationsProvider destinations={APP_DESTINATIONS}>
          {/* The music note in every Library header, Story Seed's and the Cave's included, while Menu music is on. */}
          <WorkspaceHeaderSoundProvider sound={menuMusic ? <HeaderSoundControl /> : null}>
            <EconomyClientProviders clients={services.economy}>
              <NovelExpandedPages services={services} />
            </EconomyClientProviders>
          </WorkspaceHeaderSoundProvider>
        </LibraryDestinationsProvider>
      </LibraryDesktopNavigationProvider>
    </LibraryPresentationProvider>
  </ReaderMixerProvider>;
}

function NovelExpandedPages({ services }: { services: NovelExpandedServices }) {
  const [tokenRequest, setTokenRequest] = useState<AccessTokenRequest>();
  const pendingToken = useRef<Promise<string | undefined> | undefined>(undefined);
  // One sheet for the whole app: a Blueprint and a chapter past the visitor
  // limit ask for the same token, saved on this device once given.
  const askForToken = useCallback<AskForAccessToken>(({ reason, rejected }) => {
    pendingToken.current ??= new Promise<string | undefined>(resolve => {
      setTokenRequest({
        reason, rejected,
        resolve: value => {
          pendingToken.current = undefined;
          setTokenRequest(undefined);
          resolve(value);
        },
      });
    });
    return pendingToken.current;
  }, []);
  const writer = useMemo(() => writerWithAccessToken(services.writer, services.accessToken, askForToken), [services, askForToken]);
  return <>
    <NovelExpandedRoutes services={services} writer={writer} askForToken={askForToken} />
    <AccessTokenSheet request={tokenRequest} />
  </>;
}

function NovelExpandedRoutes({ services, writer, askForToken }: {
  services: NovelExpandedServices;
  writer: NovelExpandedServices['writer'];
  askForToken: AskForAccessToken;
}): ReactNode {
  const [route, navigate] = useAppRoute();
  const profile = useDeviceProfile(services.profile);
  const [chapterModel] = useModelPreference('chapters');
  // Covers are made with the Model Router's image choice, read when each is asked for.
  const [imageModel] = useModelPreference('images');
  const requestCover = useMemo(() => coverRequesterWithAccessToken(services.requestStoryCover, services.accessToken, askForToken, () => imageModel), [services, askForToken, imageModel]);
  const covers = useStoryCovers(services.storyCovers, requestCover);
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
    repository: services.stories, modelAdapter: writer, installedSkills: skills,
    baseMedia: LIBRARY_BASE_MEDIA, preferredModel: chapterModel,
  });
  const { state } = stories;
  // Story Settings chosen in Create, kept on this device until Manifest applies them.
  const [settingsDraft, setSettingsDraft] = useStorySettingsDraft(services.readerPreferences);
  const worlds = useMemo(() => state ? storyHomeWorlds(state, covers) : [], [state, covers]);
  const seedIds = useMemo(() => state ? startedSeedIds(state) : [], [state]);
  // The Cave's Stories page: each story, and the Story Seed it started from.
  const caveStories = useMemo(() => state ? state.stories.map(story => ({
    id: story.id, title: story.title, userId: NOVEL_EXPANDED_READER_ID, sourceSeedId: storySourceSeedId(state, story),
  })) : [], [state]);
  const storyId = route.page === 'story' || route.page === 'read' ? route.storyId : undefined;
  const missing = Boolean(state && storyId && !findStory(state, storyId));
  // A story that is not here (an old link, another browser) goes Home.
  useEffect(() => { if (missing) navigate(HOME_ROUTE, { replace: true }); }, [missing, navigate]);

  // One Familiar around every page, at the same place in the tree, so it keeps its
  // place as the reader moves; the Reader is immersive, so it stays out of it.
  const withFamiliar = (page: ReactNode) =>
    <AppFamiliar profile={profile} present={Boolean(state && skills) && route.page !== 'read'}>{page}</AppFamiliar>;

  if (!state || !skills) {
    const error = skillsError ?? stories.loadError;
    return withFamiliar(<main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center font-sans">
      {error
        ? <>
            <p role="alert" className="text-sm text-amber-200">{error}</p>
            <NarrativeButton onClick={() => { if (skillsError) setSkillsAttempt(value => value + 1); stories.retry(); }}>Retry</NarrativeButton>
          </>
        : <p role="status" className="text-sm text-neutral-400">Opening your stories…</p>}
    </main>);
  }

  if (route.page === 'profile') return withFamiliar(<ProfilePage services={services} stories={caveStories} navigate={navigate} />);

  if (route.page === 'create') return withFamiliar(<CreatePage services={services} askForToken={askForToken} startedSeedIds={seedIds} chapterModel={stories.model || undefined}
    // A new Story Seed starts from the profile's languages and Reading Mode.
    accountDefaultLanguage={profile.defaultReadingLanguage} accountDefaultChapterWritingStyle={profile.defaultChapterWritingStyle}
    renderStorySettings={({ seed, originalLanguage }) => <CreateStorySettings stories={stories}
      defaults={createOfficialCapaDefaultLoadout(seed.story.required.style)}
      originalLanguage={originalLanguage} chapterWritingStyle={seed.story.optional.chapterWritingStyle}
      fateMode={seed.story.optional.fateSurvival.enabled ? 'survival' : 'regular'}
      draft={settingsDraft} onDraftChange={setSettingsDraft} />}
    onHome={() => navigate(HOME_ROUTE)}
    onStartStory={async payload => {
      const story = await startHarnessStoryFromSeed(stories.controller, payload, { draft: settingsDraft, installedSkills: stories.skills });
      // The draft is the new story's now; the next story starts from its own defaults.
      setSettingsDraft({});
      // Chapter 1 begins at once, while the reader looks over the World Card, so it is
      // ready (or nearly) when they start reading. A chapter that waits on the reader
      // (Fate Survival's first direction) waits; a failed start is simply tried again by
      // Start Story, which shows any reason.
      if (!nextChapterWaitsOnReader(stories.controller.snapshot(), story.id)) void stories.generateNextChapter(story.id).catch(() => undefined);
      // The new story replaces Create, so Back from it goes Home.
      navigate({ page: 'story', storyId: story.id }, { replace: true });
    }} />);

  if (storyId) return withFamiliar(missing ? null : <StoryPages key={storyId} stories={stories} storyId={storyId}
    page={route.page === 'read' ? 'read' : 'info'} readerStateRepository={services.readerState}
    readerPreferences={services.readerPreferences} soundscapes={APP_SOUNDSCAPES}
    writingAgent={AGENTS.VERSA} backLabel="Back to your stories" covers={covers}
    // World Info sits in the Library Shell; the Reader never does.
    frame={info => <AppShell route={{ page: 'story', storyId }} navigate={navigate} stories={worlds} mainLabel="World Info">{info}</AppShell>}
    onOpenReader={() => navigate({ page: 'read', storyId })}
    onCloseReader={() => navigate({ page: 'story', storyId })}
    onBack={() => navigate(HOME_ROUTE)} />);

  return withFamiliar(<HomePage worlds={worlds} navigate={navigate} />);
}

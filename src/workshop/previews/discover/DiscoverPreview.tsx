import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LibraryDesktopNavigationProvider, LibraryDestinationsProvider, useLibraryBottomClearance, WorkspaceHeaderAccessoryProvider, WorkspaceHeaderProfileProvider } from '@seihouse/library/shell';
import { DEFAULT_BACKGROUND_IMAGE_ID, LibraryPresentationProvider, useLibraryAssets } from '@seihouse/library/presentation';
import { useInterfaceLanguageTranslation } from '@seihouse/library/profile';
import { createDeviceProfileStore, useDeviceProfile } from '../../../host/profile/deviceProfile';
import { createLocalReaderPreferenceStorage } from '../../../host/reader/readerPreferenceStorage';
import { NOVEL_EXPANDED_STORAGE } from '../../../novel-expanded/services';
import { NOVEL_EXPANDED_READER_ID } from '../../../novel-expanded/storyCreationRuntime';
import { FamiliarSprite } from '@seihouse/library/familiar';
import { defaultFamiliar } from '../../../host/familiar/catalogue';
import { APP_DESTINATIONS } from '../../../novel-expanded/appPlaces';
import { DiscoverPage } from '../../../novel-expanded/DiscoverPage';
import { routeSearch, useAppRoute, type Navigate, type NovelExpandedRoute } from '../../../novel-expanded/routes';
import {
  DISCOVER_RANKING_BOARDS, DISCOVER_SAMPLE_FATE_SURVIVAL, DISCOVER_SAMPLE_RELEASES,
  DISCOVER_SAMPLE_TRACKED, DISCOVER_SAMPLE_WORLDS, DISCOVER_SAMPLE_CREATORS,
  DISCOVER_SAMPLE_CODEX, DISCOVER_SAMPLE_FOLLOWED_CREATORS, DISCOVER_SAMPLE_TRACKED_CODEX,
} from './previewData';

const hrefFor = (route: NovelExpandedRoute) => route.page === 'discover'
  ? `/?preview=discover&canvas=1&${routeSearch(route).slice(1)}`
  : `/app/${routeSearch(route)}`;

/** The app's page and shell, with samples and sample-opening feedback confined to Workshop. */
export function DiscoverPreview() {
  const assets = useLibraryAssets();
  const [profileStore] = useState(() => createDeviceProfileStore({
    storage: createLocalReaderPreferenceStorage(NOVEL_EXPANDED_STORAGE.readerPreferences), uid: NOVEL_EXPANDED_READER_ID,
  }));
  const profile = useDeviceProfile(profileStore);
  useInterfaceLanguageTranslation(profile.interfaceLanguage);
  const [route] = useAppRoute();
  const [opened, setOpened] = useState<{ title: string; at: number }>();
  const clearance = useLibraryBottomClearance();
  useEffect(() => {
    if (!opened) return;
    const timer = setTimeout(() => setOpened(undefined), 4000);
    return () => clearTimeout(timer);
  }, [opened]);
  const navigate: Navigate = (next, { replace = false, scroll = true } = {}) => {
    if (next.page !== 'discover') { window.location.assign(hrefFor(next)); return; }
    window.history[replace ? 'replaceState' : 'pushState'](null, '', hrefFor(next));
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (scroll) window.scrollTo({ top: 0 });
  };
  return <LibraryPresentationProvider assets={assets} backgroundImageId={profile.backgroundImageId ?? DEFAULT_BACKGROUND_IMAGE_ID} accentColor={profile.accentColor} backgroundTint={profile.backgroundTint}>
    <LibraryDesktopNavigationProvider value="sidebar">
      <LibraryDestinationsProvider destinations={APP_DESTINATIONS}>
        <WorkspaceHeaderProfileProvider profile={{ name: profile.displayName, avatarUrl: profile.avatarUrl, onOpenProfile: () => navigate({ page: 'profile' }) }}>
          <WorkspaceHeaderAccessoryProvider accessory={<span className="block size-11" aria-label="Familiar preview"><FamiliarSprite familiar={defaultFamiliar.definition} animation="neutral" paused /></span>}>
            <DiscoverPage route={route.page === 'discover' ? route : { page: 'discover' }} navigate={navigate} hrefFor={hrefFor}
              stories={[]} readerProfile={profile} catalogue={{
                worlds: DISCOVER_SAMPLE_WORLDS, releases: DISCOVER_SAMPLE_RELEASES,
                trackedWorldIds: DISCOVER_SAMPLE_TRACKED, fateSurvivalWorldIds: DISCOVER_SAMPLE_FATE_SURVIVAL,
                creators: DISCOVER_SAMPLE_CREATORS, codexEntries: DISCOVER_SAMPLE_CODEX,
                followedCreatorIds: DISCOVER_SAMPLE_FOLLOWED_CREATORS, trackedCodexIds: DISCOVER_SAMPLE_TRACKED_CODEX,
                rankingBoards: DISCOVER_RANKING_BOARDS,
                onOpenWorld: id => {
                  const world = DISCOVER_SAMPLE_WORLDS.find(world => world.id === id);
                  if (world) setOpened({ title: world.title, at: Date.now() });
                },
                notice: route.page === 'discover' && route.lore ? undefined : <details className="discover-sample-notice">
                  <summary>Sample catalogue</summary>
                  <p>Explore sample stories, creators and Codex entries. Rankings and follows are examples.</p>
                </details>,
              }} />
          </WorkspaceHeaderAccessoryProvider>
        </WorkspaceHeaderProfileProvider>
      </LibraryDestinationsProvider>
    </LibraryDesktopNavigationProvider>
    {opened && createPortal(<p role="status" data-testid="discover-sample-note"
      className="pointer-events-none fixed left-1/2 z-50 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-[#14161c]/95 px-4 py-3 text-center font-serif text-sm text-[#f3eee7] shadow-lg shadow-black/50 ring-1 ring-white/10"
      style={{ bottom: clearance + 16 }}>
      “{opened.title}” is a sample world. Real worlds will open straight into their World Info and Reader.
    </p>, document.body)}
  </LibraryPresentationProvider>;
}

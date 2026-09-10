import { useCallback, useEffect, useRef, useState } from 'react';
import { GlobalHeader } from '../../../components/library-shell/reference/main-library/GlobalHeader';
import { LibraryCollectionStrip } from '../../../components/library-shell/reference/main-library/LibraryCollectionStrip';
import { MainLibraryAdapterContext, type MainLibraryAdapter } from '../../../components/library-shell/shared/MainLibraryAdapter';
import { MainLibraryNavigation } from '../../../components/library-shell/development/MainLibraryNavigation';
import type { LibraryLocation } from '../../../components/library-shell/development/libraryRoutes';
import { LightNovelsHome } from '../../../components/light-novels-home/development/LightNovelsHome';
import { LightNovelsHome as ReferenceHome } from '../../../components/light-novels-home/reference/LightNovelsHome';
import { StoryDetailScreen } from '../../../components/light-novels-home/development/StoryDetailScreen';
import { StoryDetailScreen as ReferenceStoryDetail } from '../../../components/light-novels-home/reference/StoryDetailScreen';
import { WorldExpressions } from '../../../components/light-novels-home/development/WorldExpressions';
import { featuredNovel, featuredExpansions, homePreviewWorlds, homePreviewExpansions } from '../light-novels-home/previewData';
import { libraryPreviewUrl, navigateLibraryPreview, readLibraryPreviewLocation } from './libraryPreviewNavigation';

export function MainLibraryPreview({ state, developmentHeader, developmentHomeContent, extraFeedback, developmentNavigation = false, homeReference = false, active = true }: { state: string; developmentHeader?: (adapter: MainLibraryAdapter) => React.ReactNode; developmentHomeContent?: (adapter: MainLibraryAdapter) => React.ReactNode; extraFeedback?: string; developmentNavigation?: boolean; homeReference?: boolean; active?: boolean }) {
  const initialLocation = readLibraryPreviewLocation(state);
  const [currentScreen, setCurrentScreen] = useState(developmentNavigation ? initialLocation.screen : state === 'profile' ? 'profile' : 'home');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(developmentNavigation && initialLocation.screen === 'detail' ? featuredNovel.id : state === 'active-story' ? 'mock-story' : null);
  const [activeTab, chooseTab] = useState<string>(developmentNavigation ? initialLocation.collection ?? 'featured' : 'my-library');
  const [destination, setDestination] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const worldOpenerRef = useRef<HTMLElement | null>(null);
  const previousScreenRef = useRef(currentScreen);
  const navigate = (location: LibraryLocation) => {
    if (developmentNavigation && (location.screen === 'profile' || location.screen === 'creator')) {
      navigateLibraryPreview(location);
      return;
    }
    if (developmentNavigation) window.history.pushState(window.history.state, '', libraryPreviewUrl(location));
    setCurrentScreen(location.screen);
    if (location.collection) chooseTab(location.collection);
    setDestination(location.screen);
  };
  useEffect(() => {
    if (!developmentNavigation) return;
    const onBack = () => {
      const location = readLibraryPreviewLocation(state);
      setCurrentScreen(location.screen);
      if (location.screen === 'detail') setActiveStoryId(featuredNovel.id);
      chooseTab(location.collection ?? 'featured');
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, [developmentNavigation, state]);
  useEffect(() => {
    if (!developmentNavigation) return;
    const opener = worldOpenerRef.current?.isConnected ? worldOpenerRef.current : document.getElementById(`home-world-${featuredNovel.id}`);
    if (currentScreen === 'home' && activeTab === 'featured' && previousScreenRef.current === 'detail' && opener) {
      opener.focus({ preventScroll: true });
      opener.scrollIntoView?.({ block: 'center', behavior: 'instant' });
    } else {
      mainRef.current?.focus({ preventScroll: true });
      if (currentScreen === 'detail') window.scrollTo?.({ top: 0, behavior: 'instant' });
    }
    previousScreenRef.current = currentScreen;
  }, [currentScreen, activeTab, developmentNavigation]);
  const requestDao = useCallback<MainLibraryAdapter['requestDao']>(async kind => {
    const category = kind === 'comedic' || kind === 'comforting' ? kind : 'inspirational';
    const quotes = {
      inspirational: { quote: 'The highest, cloud-shrouded peaks are climbed not by the fastest feet, but by the quietest hearts that refuse to look back.', author: 'Hermit of the Whispering Pines' },
      comedic: { quote: 'If you cannot master the celestial flying sword, try walking with a really long, polished bamboo pole. The mortals will still think you are incredibly profound.', author: 'Fairy Chef of the Red Lotus Valley' },
      comforting: { quote: 'Close your dusty scrolls. Light a single stick of cedar incense. The Great Dao is not found in old papers, but in the warmth of the tea steam rising to meet your face.', author: 'Workshop local oracle' },
    };
    return {
      ok: !(state === 'dao-error' && kind !== 'status'),
      json: async () => ({ hasServerGemini: state !== 'dao-local', ...quotes[category], category }),
    };
  }, [state]);
  const adapter: MainLibraryAdapter = {
    currentScreen, setCurrentScreen: screen => {
      if (developmentNavigation) navigate({ screen, ...(screen === 'home' ? { collection: 'featured' } : {}) });
      else { setCurrentScreen(screen); setDestination(screen); }
    },
    openLibrary: () => navigate({ screen: 'home', collection: 'my-library' }),
    activeStoryId, setActiveStoryId, syncStatus: state === 'syncing' ? 'syncing' : state === 'offline' ? 'error' : 'idle', lastSavedTime: null,
    currentUser: state === 'guest' ? null : { email: 'sensei@example.test', displayName: 'Sensei' },
    userProfile: state === 'missing-profile' ? null : { displayName: state === 'long-name' ? 'Keeper of the Nine Celestial Libraries and the Unfinished Scrolls' : 'Sensei', premiumTier: 'immortal' },
    stories: [{ id: 'mock-story', mcName: 'Ye Chen', genre: 'Xianxia' }, ...(developmentNavigation ? [featuredNovel] : [])],
    setIsSettingsOpen: () => setDestination('Settings'), setIsCodexSheetOpen: () => setDestination('Living Codex'), setIsShortcutsOpen: () => setDestination('Shortcut Spells'), requestDao,
  };
  const Home = homeReference ? ReferenceHome : LightNovelsHome;
  const Detail = homeReference ? ReferenceStoryDetail : StoryDetailScreen;
  const isHome = active && developmentNavigation && currentScreen === 'home' && activeTab === 'featured';
  const isFeaturedDetail = developmentNavigation && currentScreen === 'detail' && activeStoryId === featuredNovel.id;
  const collections = <LibraryCollectionStrip activeTab={activeTab} chooseTab={tab => developmentNavigation ? navigate({ screen: 'home', collection: tab as LibraryLocation['collection'] }) : chooseTab(tab)} syncStatus={adapter.syncStatus} libraryStories={state === 'guest' ? [] : adapter.stories} />;
  const content = <MainLibraryAdapterContext.Provider value={adapter}>
    <div className="min-h-dvh bg-[#050505] text-[#dfd8cf] font-serif overflow-x-hidden selection:bg-human/30 pb-safe">
      {developmentHeader ? developmentHeader(adapter) : <GlobalHeader />}
      <main ref={mainRef} tabIndex={developmentNavigation ? -1 : undefined} className="relative z-10 w-full outline-none min-h-[calc(100dvh-140px)]">
        <div className="px-4 py-8 max-w-7xl mx-auto w-full">
          {developmentNavigation && <div hidden={!isHome}>
            <Home active={isHome} worlds={homePreviewWorlds} expansionsByWorld={homeReference ? undefined : homePreviewExpansions}
              onCreateStory={() => navigate({ screen: 'creator' })} onOpenWorld={id => {
                worldOpenerRef.current = document.getElementById(`home-world-${id}`);
                setActiveStoryId(id); navigate({ screen: 'detail' });
              }}>
              {developmentHomeContent?.(adapter)}
              {isHome && collections}
            </Home>
          </div>}
          {isFeaturedDetail && <Detail story={featuredNovel} onBack={() => navigate({ screen: 'home', collection: 'featured' })}>
            {!homeReference && <WorldExpressions world={featuredNovel} expansions={featuredExpansions} />}
          </Detail>}
          <div hidden={isHome || isFeaturedDetail}>
          <div className="mb-8 min-h-52 border border-dashed border-neutral-800 rounded-xl p-6 text-neutral-400 text-sm font-sans">
            Workshop content slot · Featured Ascension and library content are outside this header capture.
            <p className="mt-3" role="status">{destination ? `Workshop destination: ${destination}` : 'Local account and story fixtures. Shell actions stay in this preview.'}</p>
            {(currentScreen === 'reader' || currentScreen === 'codex') && <button className="mt-4 underline" onClick={() => developmentNavigation ? navigate({ screen: 'home', collection: 'featured' }) : setCurrentScreen('home')}>Return to header capture</button>}
          </div>
          {extraFeedback && <p role="status" className="mb-4 text-sm text-portal">{extraFeedback}</p>}
          {/* Home content between the featured area and the collection tabs —
              where Dao Insights now lives, out of the top header. */}
          {!developmentNavigation && currentScreen === 'home' && developmentHomeContent?.(adapter)}
          {!isHome && collections}
          <p className="font-sans text-xs text-neutral-400">Workshop collection destination: {activeTab}</p>
          </div>
        </div>
      </main>
    </div>
  </MainLibraryAdapterContext.Provider>;
  return developmentNavigation ? <MainLibraryNavigation location={{ screen: currentScreen, collection: activeTab as LibraryLocation['collection'] }} onNavigate={navigate}>{content}</MainLibraryNavigation> : content;
}

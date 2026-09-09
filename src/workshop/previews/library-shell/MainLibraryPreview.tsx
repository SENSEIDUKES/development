import { useCallback, useEffect, useRef, useState } from 'react';
import { GlobalHeader } from '../../../components/library-shell/reference/main-library/GlobalHeader';
import { LibraryCollectionStrip } from '../../../components/library-shell/reference/main-library/LibraryCollectionStrip';
import { MainLibraryAdapterContext, type MainLibraryAdapter } from '../../../components/library-shell/shared/MainLibraryAdapter';
import { MainLibraryNavigation } from '../../../components/library-shell/development/MainLibraryNavigation';
import type { LibraryLocation } from '../../../components/library-shell/development/libraryRoutes';
import { libraryPreviewUrl, navigateLibraryPreview } from './libraryPreviewNavigation';

export function MainLibraryPreview({ state, developmentHeader, extraFeedback, developmentNavigation = false }: { state: string; developmentHeader?: (adapter: MainLibraryAdapter) => React.ReactNode; extraFeedback?: string; developmentNavigation?: boolean }) {
  const query = new URLSearchParams(window.location.search);
  const initialScreen = state === 'profile' ? 'profile' : state === 'reader' ? 'reader' : state === 'sects' ? 'sects' : state === 'tiers' ? 'pricing' : 'home';
  const [currentScreen, setCurrentScreen] = useState(developmentNavigation ? query.get('screen') ?? initialScreen : state === 'profile' ? 'profile' : 'home');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(state === 'active-story' ? 'mock-story' : null);
  const [activeTab, chooseTab] = useState(developmentNavigation ? query.get('collection') ?? (state === 'library' ? 'my-library' : state === 'discover' ? 'challenges' : 'featured') : 'my-library');
  const [destination, setDestination] = useState('');
  const mainRef = useRef<HTMLElement>(null);
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
      const params = new URLSearchParams(window.location.search);
      setCurrentScreen(params.get('screen') ?? 'home');
      chooseTab(params.get('collection') ?? 'featured');
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, [developmentNavigation]);
  useEffect(() => { if (developmentNavigation) mainRef.current?.focus(); }, [currentScreen, activeTab, developmentNavigation]);
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
    activeStoryId, setActiveStoryId, syncStatus: state === 'syncing' ? 'syncing' : state === 'offline' ? 'error' : 'idle', lastSavedTime: null,
    currentUser: state === 'guest' ? null : { email: 'sensei@example.test', displayName: 'Sensei' },
    userProfile: state === 'missing-profile' ? null : { displayName: state === 'long-name' ? 'Keeper of the Nine Celestial Libraries and the Unfinished Scrolls' : 'Sensei', premiumTier: 'immortal' },
    stories: [{ id: 'mock-story', mcName: 'Ye Chen', genre: 'Xianxia' }],
    setIsSettingsOpen: () => setDestination('Settings'), setIsCodexSheetOpen: () => setDestination('Living Codex'), setIsShortcutsOpen: () => setDestination('Shortcut Spells'), requestDao,
  };
  const content = <MainLibraryAdapterContext.Provider value={adapter}>
    <div className="min-h-dvh bg-[#050505] text-[#dfd8cf] font-serif overflow-x-hidden selection:bg-human/30 pb-safe">
      {developmentHeader ? developmentHeader(adapter) : <GlobalHeader />}
      <main ref={mainRef} tabIndex={developmentNavigation ? -1 : undefined} className="relative z-10 w-full min-h-[calc(100dvh-140px)]">
        <div className="px-4 py-8 max-w-7xl mx-auto w-full">
          <div className="mb-8 min-h-52 border border-dashed border-neutral-800 rounded-xl p-6 text-neutral-400 text-sm font-sans">
            Workshop content slot · Featured Ascension and library content are outside this header capture.
            <p className="mt-3" role="status">{destination ? `Workshop destination: ${destination}` : 'Local account and story fixtures. Shell actions stay in this preview.'}</p>
            {(currentScreen === 'reader' || currentScreen === 'codex') && <button className="mt-4 underline" onClick={() => developmentNavigation ? navigate({ screen: 'home', collection: 'featured' }) : setCurrentScreen('home')}>Return to header capture</button>}
          </div>
          {extraFeedback && <p role="status" className="mb-4 text-sm text-portal">{extraFeedback}</p>}
          <LibraryCollectionStrip activeTab={activeTab} chooseTab={tab => developmentNavigation ? navigate({ screen: 'home', collection: tab as LibraryLocation['collection'] }) : chooseTab(tab)} syncStatus={adapter.syncStatus} libraryStories={state === 'guest' ? [] : adapter.stories} />
          <p className="font-sans text-xs text-neutral-400">Workshop collection destination: {activeTab}</p>
        </div>
      </main>
    </div>
  </MainLibraryAdapterContext.Provider>;
  return developmentNavigation ? <MainLibraryNavigation location={{ screen: currentScreen, collection: activeTab as LibraryLocation['collection'] }} onNavigate={navigate}>{content}</MainLibraryNavigation> : content;
}

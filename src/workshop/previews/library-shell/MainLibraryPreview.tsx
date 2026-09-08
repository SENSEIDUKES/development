import { useCallback, useState } from 'react';
import { GlobalHeader, LibraryCollectionStrip } from '../../../components/library-shell/development/LibraryShell';
import { MainLibraryAdapterContext, type MainLibraryAdapter } from '../../../components/library-shell/shared/MainLibraryAdapter';

export function MainLibraryPreview({ state }: { state: string }) {
  const [currentScreen, setCurrentScreen] = useState(state === 'profile' ? 'profile' : 'home');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(state === 'active-story' ? 'mock-story' : null);
  const [activeTab, chooseTab] = useState('my-library');
  const [destination, setDestination] = useState('');
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
    currentScreen, setCurrentScreen: screen => { setCurrentScreen(screen); setDestination(screen); },
    activeStoryId, setActiveStoryId, syncStatus: state === 'syncing' ? 'syncing' : state === 'offline' ? 'error' : 'idle', lastSavedTime: null,
    currentUser: state === 'guest' ? null : { email: 'sensei@example.test', displayName: 'Sensei' },
    userProfile: state === 'missing-profile' ? null : { displayName: state === 'long-name' ? 'Keeper of the Nine Celestial Libraries and the Unfinished Scrolls' : 'Sensei', premiumTier: 'immortal' },
    stories: [{ id: 'mock-story', mcName: 'Ye Chen', genre: 'Xianxia' }],
    setIsSettingsOpen: () => setDestination('Settings'), setIsCodexSheetOpen: () => setDestination('Living Codex'), setIsShortcutsOpen: () => setDestination('Shortcut Spells'), requestDao,
  };
  return <MainLibraryAdapterContext.Provider value={adapter}>
    <div className="min-h-dvh bg-[#050505] text-[#dfd8cf] font-serif overflow-x-hidden selection:bg-human/30 pb-safe">
      <GlobalHeader />
      <main className="relative z-10 w-full min-h-[calc(100dvh-140px)]">
        <div className="px-4 py-8 max-w-7xl mx-auto w-full">
          <div className="mb-8 min-h-52 border border-dashed border-neutral-800 rounded-xl p-6 text-neutral-400 text-sm font-sans">
            Workshop content slot · Featured Ascension and library content are outside this header capture.
            <p className="mt-3" role="status">{destination ? `Workshop destination: ${destination}` : 'Local account and story fixtures. Shell actions stay in this preview.'}</p>
            {(currentScreen === 'reader' || currentScreen === 'codex') && <button className="mt-4 underline" onClick={() => setCurrentScreen('home')}>Return to header capture</button>}
          </div>
          <LibraryCollectionStrip activeTab={activeTab} chooseTab={chooseTab} syncStatus={adapter.syncStatus} libraryStories={state === 'guest' ? [] : adapter.stories} />
          <p className="font-sans text-xs text-neutral-400">Workshop collection destination: {activeTab}</p>
        </div>
      </main>
    </div>
  </MainLibraryAdapterContext.Provider>;
}

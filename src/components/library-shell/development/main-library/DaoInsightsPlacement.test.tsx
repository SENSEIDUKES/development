// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '../../../library-presentation/LibraryPresentationProvider';
import { MainLibraryHeader, type MainLibraryHeaderAdapter } from '../MainLibraryHeader';
import { MainLibraryHomeInsights } from '../MainLibraryHomeInsights';
import { MainLibraryPreview } from '../../../../workshop/previews/library-shell/MainLibraryPreview';

vi.mock('../../../../audio/DevAudioPlayback', () => ({ useDevAudioPlayback: () => ({
  isPlaying: false, currentTrackId: null, stop: vi.fn(),
}) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const copyText = vi.fn(async (_text: string) => {});
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  copyText.mockClear();
  vi.stubGlobal('matchMedia', (query: string) => ({ media: query, matches: false,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); document.body.innerHTML = ''; vi.unstubAllGlobals(); });

const render = async (node: React.ReactNode) => {
  await act(async () => root.render(<LibraryPresentationProvider>{node}</LibraryPresentationProvider>));
};
const click = async (element: Element) => { await act(async () => { (element as HTMLElement).click(); }); };

const adapter = (screen = 'home'): MainLibraryHeaderAdapter => ({
  currentScreen: screen, setCurrentScreen: vi.fn(), activeStoryId: null, setActiveStoryId: vi.fn(),
  syncStatus: 'idle', lastSavedTime: null, currentUser: { email: 'sensei@example.test' },
  userProfile: { displayName: 'Sensei', premiumTier: 'immortal' }, stories: [],
  setIsSettingsOpen: vi.fn(), setIsCodexSheetOpen: vi.fn(), setIsShortcutsOpen: vi.fn(), copyText,
  requestDao: (async () => ({ ok: true, json: async () => ({ hasServerGemini: false }) })) as unknown as MainLibraryHeaderAdapter['requestDao'],
});

// Regression: Dao Insights was mounted in the top header's contextual slot,
// where it competed with the page title. It belongs to Home's own content.
it('regression: keeps Dao Insights out of the header at every screen', async () => {
  for (const screen of ['home', 'detail', 'profile']) {
    await render(<MainLibraryHeader adapter={adapter(screen)} />);
    const header = container.querySelector('header')!;
    expect(header.querySelector('.dao-insights-trigger')).toBeNull();
    expect(header.querySelector('[aria-label="Insights from the Dao"]')).toBeNull();
    expect(container.querySelector('.workspace-header-context')).toBeNull();
    // The header keeps its own two utilities and the full page title.
    expect(Array.from(header.querySelectorAll('.workspace-header-utilities button'))
      .map(element => element.getAttribute('aria-label'))).toEqual(['Help', 'Search']);
    expect(header.querySelector('[data-slot="library-header-badge-title"]')?.textContent).toBe('Celestial Library');
  }
});

it('regression: renders Dao Insights in Home content, between the featured area and the collection tabs', async () => {
  await render(<MainLibraryPreview state="linked" developmentNavigation
    developmentHeader={value => <MainLibraryHeader adapter={{ ...value, copyText }} />}
    developmentHomeContent={value => <MainLibraryHomeInsights adapter={{ ...value, copyText }} />} />);
  const insights = container.querySelector('[data-home-dao-insights]')!;
  expect(insights).not.toBeNull();
  // Home content, not chrome.
  expect(insights.closest('header')).toBeNull();
  expect(insights.closest('main')).not.toBeNull();
  const featured = container.querySelector('main .border-dashed')!;
  const tabs = container.querySelector('main nav, main [role="tablist"]')
    ?? Array.from(container.querySelectorAll('main *')).find(element => element.textContent?.includes('My Library'))!;
  expect(featured.compareDocumentPosition(insights) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(tabs.compareDocumentPosition(insights) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
});

it('regression: preserves the quote, rotation, filtering, modal and clipboard behavior it had in the header', async () => {
  vi.useFakeTimers();
  try {
    await render(<MainLibraryHomeInsights adapter={adapter()} />);
    const trigger = container.querySelector('[aria-label="Insights from the Dao"]')!;
    expect(trigger.textContent).toContain('Insights from the Dao');
    const first = container.querySelector('.dao-insights-trigger p')?.textContent;
    expect(first).toBeTruthy();
    // The same 14-second rotation loop, unchanged by the move.
    await act(async () => { await vi.advanceTimersByTimeAsync(14_000); });
    expect(container.querySelector('.dao-insights-trigger p')?.textContent).toBeTruthy();

    await click(trigger);
    const dialog = document.querySelector('[role="dialog"][aria-label="The Dao Insights Oracle"]')!;
    expect(dialog).not.toBeNull();
    // The same clipboard writer the host supplied to the header.
    // Category filtering is still offered by the same pills.
    expect(Array.from(dialog.querySelectorAll('button')).map(element => element.textContent))
      .toEqual(expect.arrayContaining(['All Energies', 'Comedic Dao', 'Inspirational Qi', 'Good Feeling']));
    const copy = dialog.querySelector('[title="Click to copy quote"]')!;
    await click(copy);
    expect(copyText).toHaveBeenCalledTimes(1);
    expect(copyText.mock.calls[0][0]).toContain('—');
  } finally {
    vi.useRealTimers();
  }
});

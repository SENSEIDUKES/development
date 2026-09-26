// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { LibraryFooter, LibrarySectionSidebar, WorkspaceHeader } from '@seihouse/library/shell';
import { MainLibraryFooter } from './MainLibraryFooter';
import { MainLibraryNavigation } from './MainLibraryNavigation';
import { MainLibraryHomeInsights } from './MainLibraryHomeInsights';
import type { MainLibraryHeaderAdapter } from './MainLibraryHeader';

vi.mock('@seihouse/library-ui', async importOriginal => ({ ...await importOriginal<typeof import('@seihouse/library-ui')>(), ParticleEffect: () => null }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.stubGlobal('matchMedia', (query: string) => ({ media: query, matches: query.includes('1279px') || query.includes('min-width: 1024px'),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); document.body.innerHTML = ''; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const render = async (node: React.ReactNode) => {
  await act(async () => root.render(<LibraryPresentationProvider>{node}</LibraryPresentationProvider>));
};
const click = async (element: Element | null | undefined) => {
  expect(element).toBeTruthy();
  await act(async () => { (element as HTMLElement).click(); });
};
const settle = async (ms = 50) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const byText = (text: string, scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll<HTMLElement>('button, a')).find(element => element.textContent?.trim() === text);

const adapter = (requestDao?: MainLibraryHeaderAdapter['requestDao']): MainLibraryHeaderAdapter => ({
  currentScreen: 'home', setCurrentScreen: vi.fn(), activeStoryId: null, setActiveStoryId: vi.fn(),
  syncStatus: 'idle', lastSavedTime: null, currentUser: { email: 'sensei@example.test' },
  userProfile: { displayName: 'Sensei', premiumTier: 'immortal', interfaceLanguage: 'en' }, stories: [],
  setIsSettingsOpen: vi.fn(), setIsCodexSheetOpen: vi.fn(), setIsShortcutsOpen: vi.fn(), copyText: vi.fn(async () => {}),
  requestDao: requestDao ?? (async () => ({ ok: true, json: async () => ({ hasServerGemini: false }) })) as unknown as MainLibraryHeaderAdapter['requestDao'],
});

it('opens Help as text guidance when the host supplies no audio provider', async () => {
  await render(<WorkspaceHeader title="Host page" />);
  await click(byLabel('Help'));
  await settle(300);
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(container.querySelector('header')).not.toBeNull();
  // Narration needs the host's player, so Listen is withheld rather than broken.
  expect(Array.from(document.querySelectorAll('button')).some(button => /Listen/.test(button.textContent ?? ''))).toBe(false);
});

it('keeps the overflow open through a height-only resize and closes it on a width change', async () => {
  await render(<WorkspaceHeader title="Host page" secondaryActions={[{ id: 'export', label: 'Export', onAction: vi.fn() }]} />);
  const more = byLabel('More actions')!;
  await click(more);
  expect(more.getAttribute('aria-expanded')).toBe('true');
  vi.stubGlobal('innerHeight', 500);
  await act(async () => { window.dispatchEvent(new Event('resize')); });
  expect(more.getAttribute('aria-expanded')).toBe('true');
  vi.stubGlobal('innerWidth', window.innerWidth + 200);
  await act(async () => { window.dispatchEvent(new Event('resize')); });
  expect(more.getAttribute('aria-expanded')).toBe('false');
});

it('never renders a disabled footer destination as a working link', async () => {
  const onSelect = vi.fn();
  await render(<LibraryFooter groups={[]} social={[]} legal={[
    { id: 'terms', label: 'Terms', href: 'https://example.test/terms', disabled: true },
    { id: 'privacy', label: 'Privacy', onSelect, disabled: true },
  ]} />);
  const legal = container.querySelector('.library-footer-legal-links')!;
  expect(legal.querySelector('a')).toBeNull();
  const buttons = Array.from(legal.querySelectorAll('button'));
  expect(buttons.every(button => button.disabled)).toBe(true);
  await click(buttons[1]);
  expect(onSelect).not.toHaveBeenCalled();
});

it('opens placeholder legal documents, marked as drafts, when the host supplies none', async () => {
  await render(<MainLibraryFooter adapter={adapter()} location={{ screen: 'home', collection: 'featured' }}
    onNavigate={vi.fn()} onOpenHelp={vi.fn()} social={[]} />);
  const legal = container.querySelector('.library-footer-legal-links')!;
  expect(Array.from(legal.querySelectorAll('button')).map(button => button.textContent)).toEqual(['Terms', 'Privacy', 'Cookies']);
  await click(byText('Privacy', legal));
  await settle();
  const document_ = document.querySelector('[data-legal-document="privacy"]');
  expect(document_?.getAttribute('data-legal-status')).toBe('placeholder');
  expect(document_?.querySelector('[role="note"]')?.textContent).toContain('Draft placeholder');
});

it('uses host legal destinations instead of the placeholders when supplied', async () => {
  const onSelect = vi.fn();
  await render(<MainLibraryFooter adapter={adapter()} location={{ screen: 'home', collection: 'featured' }}
    onNavigate={vi.fn()} onOpenHelp={vi.fn()} social={[]} legal={[{ id: 'terms', label: 'Terms', onSelect }]} />);
  await click(byText('Terms', container.querySelector('.library-footer-legal-links')!));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(document.querySelector('[data-legal-document]')).toBeNull();
});

it('marks Seed Bank, not Cultivator Cave, as the active section on the Cave Stories screen', async () => {
  await render(<MainLibraryNavigation location={{ screen: 'profile', cave: '/stories' }} onNavigate={vi.fn()}>
    <LibrarySectionSidebar />
  </MainLibraryNavigation>);
  const seedBank = byText('Seed Bank');
  const cave = byText('Cultivator Cave');
  expect(seedBank?.getAttribute('aria-current')).toBeTruthy();
  expect(cave?.getAttribute('aria-current')).toBeFalsy();
});

it('keeps a divined Dao quote after the carousel settles', async () => {
  // jsdom never finishes exit animations, which would hold the previous quote.
  MotionGlobalConfig.skipAnimations = true;
  try {
  const requestDao = (async (kind: string) => ({ ok: true, json: async () => kind === 'status'
    ? { hasServerGemini: true }
    : { quote: 'A divined line from the oracle.', author: 'Test Oracle', category: 'inspirational' } })) as unknown as MainLibraryHeaderAdapter['requestDao'];
  await render(<MainLibraryHomeInsights adapter={adapter(requestDao)} />);
  await settle();
  await click(document.getElementById('dao-insights-header-center'));
  await settle();
  await click(byText('Seek Dao Insights') ?? Array.from(document.querySelectorAll('button')).find(button => /Seek Dao Insights/.test(button.textContent ?? '')));
  await settle(1700);
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain('A divined line from the oracle.');
  expect(dialog.textContent).toContain('Test Oracle');
  } finally { MotionGlobalConfig.skipAnimations = false; }
});

it('stops every Dao timer when the oracle unmounts mid-spin', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await render(<MainLibraryHomeInsights adapter={adapter()} />);
  await click(document.getElementById('dao-insights-header-center'));
  await settle();
  await click(Array.from(document.querySelectorAll('button')).find(button => /Seek Dao Insights/.test(button.textContent ?? '')));
  await act(async () => root.render(<LibraryPresentationProvider>{null}</LibraryPresentationProvider>));
  const setInterval_ = vi.spyOn(window, 'setInterval');
  await settle(1500);
  expect(setInterval_).not.toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
});

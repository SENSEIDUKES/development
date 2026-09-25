// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { LibraryFooter, libraryFooterCopyright, LIBRARY_FOOTER_STATEMENT, type LibraryFooterProps } from '@seihouse/library/shell';
import { MainLibraryFooter } from './MainLibraryFooter';
import type { MainLibraryAdapter } from '../shared/MainLibraryAdapter';
import { MainLibraryHeader } from './MainLibraryHeader';
import { MainLibraryPreview } from '../../../workshop/previews/library-shell/MainLibraryPreview';

vi.mock('@seihouse/library-ui', async importOriginal => ({ ...await importOriginal<typeof import('@seihouse/library-ui')>(), ParticleEffect: () => null }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', (query: string) => ({ media: query, matches: false,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const render = async (node: React.ReactNode) => {
  await act(async () => root.render(<LibraryPresentationProvider>{node}</LibraryPresentationProvider>));
};
const click = async (element: Element | null | undefined) => {
  expect(element).not.toBeNull();
  await act(async () => { (element as HTMLElement).click(); });
};
const footer = () => container.querySelector('[data-library-footer]')!;
const triggers = () => Array.from(footer().querySelectorAll<HTMLButtonElement>('[data-slot="disclosure-trigger"]'));
const trigger = (label: string) => triggers().find(button => button.textContent?.trim() === label);

const props = (): LibraryFooterProps => ({
  groups: [
    { id: 'explore', label: 'Explore', items: [{ id: 'sects', label: 'Sects', onSelect: vi.fn() }, { id: 'tiers', label: 'Tiers', onSelect: vi.fn() }] },
    { id: 'seihouse', label: 'SEIHouse', items: [{ id: 'story-seed', label: 'Story Seed', onSelect: vi.fn() }] },
    { id: 'support', label: 'Support', items: [{ id: 'help', label: 'Library Help', onSelect: vi.fn() }, { id: 'docs', label: 'Guide', href: 'https://example.test/guide' }] },
  ],
  social: [
    { network: 'discord', href: 'https://example.test/discord' }, { network: 'tiktok', onSelect: vi.fn() },
    { network: 'instagram', onSelect: vi.fn() }, { network: 'youtube', onSelect: vi.fn() }, { network: 'x', onSelect: vi.fn() },
  ],
  legal: [{ id: 'terms', label: 'Terms', onSelect: vi.fn() }, { id: 'privacy', label: 'Privacy', onSelect: vi.fn() }, { id: 'cookies', label: 'Cookies', onSelect: vi.fn() }],
  language: { code: 'ja', onOpenSettings: vi.fn() },
});

describe('LibraryFooter', () => {
  it('opens on the exact SEIHouse statement with nothing stacked above it', async () => {
    await render(<LibraryFooter {...props()} />);
    const identity = footer().querySelector('.library-footer-identity')!;
    expect(identity.children).toHaveLength(1);
    expect(identity.querySelector('.library-footer-statement')?.textContent).toBe(LIBRARY_FOOTER_STATEMENT);
    expect(LIBRARY_FOOTER_STATEMENT).toBe('A BETTER TIME CAPSULE AND TRANSLATOR OF ARTISTIC EXPRESSION');
    expect(footer().querySelector('img')).toBeNull();
    expect(footer().textContent).not.toContain('SEIHouse Expanded Novels');
  });

  it('shows all five social channels without opening a menu, as real links or real buttons', async () => {
    await render(<LibraryFooter {...props()} />);
    const social = Array.from(footer().querySelectorAll('.library-footer-social-link'));
    expect(social.map(element => element.getAttribute('aria-label'))).toEqual([
      'SEIHouse on Discord', 'SEIHouse on TikTok', 'SEIHouse on Instagram', 'SEIHouse on YouTube', 'SEIHouse on X',
    ]);
    expect(social[0].tagName).toBe('A');
    expect(social[0].getAttribute('href')).toBe('https://example.test/discord');
    expect(social[0].getAttribute('rel')).toBe('noreferrer');
    expect(social.slice(1).every(element => element.tagName === 'BUTTON' && element.getAttribute('type') === 'button')).toBe(true);
    // Every social control is reachable before any accordion opens.
    expect(triggers().every(button => button.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(social.every(element => element.closest('[data-slot="disclosure-content"]') === null)).toBe(true);
  });

  it('starts with Explore, SEIHouse and Support collapsed and opens only one at a time', async () => {
    await render(<LibraryFooter {...props()} />);
    expect(triggers().map(button => button.textContent?.trim())).toEqual(['Explore', 'SEIHouse', 'Support']);
    const regions = () => Array.from(footer().querySelectorAll('[data-slot="disclosure-content"]'));
    expect(regions().every(region => region.hasAttribute('inert'))).toBe(true);
    expect(triggers().every(button => button.getAttribute('aria-expanded') === 'false' && button.getAttribute('aria-controls'))).toBe(true);

    await click(trigger('Explore'));
    expect(trigger('Explore')?.getAttribute('aria-expanded')).toBe('true');
    expect(regions()[0].hasAttribute('inert')).toBe(false);
    expect(Array.from(regions()[0].querySelectorAll('.library-footer-link')).map(link => link.textContent)).toEqual(['Sects', 'Tiers']);

    await click(trigger('SEIHouse'));
    expect(trigger('SEIHouse')?.getAttribute('aria-expanded')).toBe('true');
    expect(trigger('Explore')?.getAttribute('aria-expanded')).toBe('false');
    expect(regions()[0].hasAttribute('inert')).toBe(true);
    expect(triggers().filter(button => button.getAttribute('aria-expanded') === 'true')).toHaveLength(1);

    await click(trigger('SEIHouse'));
    expect(triggers().every(button => button.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it('routes secondary links through host actions and renders external links as anchors', async () => {
    const config = props();
    await render(<LibraryFooter {...config} />);
    await click(trigger('Explore'));
    await click(Array.from(footer().querySelectorAll('.library-footer-link')).find(link => link.textContent === 'Sects'));
    expect(config.groups[0].items[0].onSelect).toHaveBeenCalledTimes(1);
    await click(trigger('Support'));
    const guide = Array.from(footer().querySelectorAll<HTMLAnchorElement>('a.library-footer-link')).find(link => link.textContent === 'Guide')!;
    expect(guide.getAttribute('href')).toBe('https://example.test/guide');
    expect(guide.getAttribute('target')).toBe('_blank');
  });

  it('omits destinations the host has not supplied instead of rendering dead controls', async () => {
    const config = props();
    config.groups = [{ id: 'explore', label: 'Explore', items: [{ id: 'unbuilt', label: 'Community' }] }, { id: 'support', label: 'Support', items: [{ id: 'help', label: 'Library Help', onSelect: vi.fn() }] }];
    config.social = [{ network: 'discord' }, { network: 'x', onSelect: vi.fn() }];
    config.legal = [{ id: 'terms', label: 'Terms' }];
    await render(<LibraryFooter {...config} />);
    expect(triggers().map(button => button.textContent?.trim())).toEqual(['Support']);
    expect(Array.from(footer().querySelectorAll('.library-footer-social-link')).map(element => element.getAttribute('data-social'))).toEqual(['x']);
    expect(footer().querySelector('.library-footer-legal-links')).toBeNull();
    expect(footer().textContent).not.toContain('Community');
  });

  it('shows the account language and opens the existing Language setting', async () => {
    const config = props();
    await render(<LibraryFooter {...config} />);
    const language = footer().querySelector<HTMLButtonElement>('.library-footer-language')!;
    expect(language.textContent).toContain('Japanese (日本語)');
    expect(language.getAttribute('aria-label')).toBe('Language: Japanese (日本語). Open Language settings');
    await click(language);
    expect(config.language?.onOpenSettings).toHaveBeenCalledTimes(1);
    // No second selector: the safeguarded setting stays the only place to change it.
    expect(footer().querySelector('select')).toBeNull();
  });

  it('carries the copyright and legal row and never a portal domain button', async () => {
    const config = props();
    await render(<LibraryFooter {...config} />);
    expect(footer().querySelector('.library-footer-copyright')?.textContent).toBe(`© ${new Date().getFullYear()} SEIHouse Productions LLC`);
    expect(libraryFooterCopyright(2031)).toBe('© 2031 SEIHouse Productions LLC');
    const legal = Array.from(footer().querySelectorAll('.library-footer-legal-link'));
    expect(legal.map(link => link.textContent)).toEqual(['Terms', 'Privacy', 'Cookies']);
    await click(legal[1]);
    expect(config.legal[1].onSelect).toHaveBeenCalledTimes(1);
    expect(footer().innerHTML.toLowerCase()).not.toContain('seaportal');
    expect(footer().textContent).not.toMatch(/\.world/);
  });
});

const adapter = (overrides: Partial<MainLibraryAdapter> = {}): MainLibraryAdapter => ({
  currentScreen: 'home', setCurrentScreen: vi.fn(), activeStoryId: null, setActiveStoryId: vi.fn(),
  syncStatus: 'idle', lastSavedTime: null, currentUser: { email: 'sensei@example.test' },
  userProfile: { displayName: 'Sensei', premiumTier: 'immortal', interfaceLanguage: 'ko' }, stories: [],
  setIsSettingsOpen: vi.fn(), setIsCodexSheetOpen: vi.fn(), setIsShortcutsOpen: vi.fn(),
  requestDao: (async () => ({ ok: true, json: async () => ({ hasServerGemini: false }) })) as unknown as MainLibraryAdapter['requestDao'],
  ...overrides,
});

describe('MainLibraryFooter', () => {
  it('uses the existing Main Library destinations and the shared router callback', async () => {
    const onNavigate = vi.fn(); const onOpenHelp = vi.fn(); const host = adapter();
    await render(<MainLibraryFooter adapter={host} location={{ screen: 'home', collection: 'featured' }} onNavigate={onNavigate} onOpenHelp={onOpenHelp} social={[]} legal={[]} />);
    expect(triggers().map(button => button.textContent?.trim())).toEqual(['Explore', 'About Us', 'Support']);
    const links = () => Array.from(footer().querySelectorAll<HTMLButtonElement>('.library-footer-link'));
    const open = async (group: string, label: string) => { await click(trigger(group)); await click(links().find(link => link.textContent === label)); };
    await open('Explore', 'Sects');
    expect(onNavigate).toHaveBeenLastCalledWith({ screen: 'sects' });
    await open('Explore', 'Tiers');
    expect(onNavigate).toHaveBeenLastCalledWith({ screen: 'pricing' });
    await open('Explore', 'Fate Survival Challenges');
    expect(onNavigate).toHaveBeenLastCalledWith({ screen: 'home', collection: 'challenges' });
    await open('About Us', 'Relics');
    expect(onNavigate).toHaveBeenLastCalledWith({ screen: 'profile', cave: '/relics' });
    await open('About Us', 'Story Seed');
    expect(onNavigate).toHaveBeenLastCalledWith({ screen: 'creator' });
    await open('Support', 'Library Help');
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
    await open('Support', 'Shortcut Spells');
    expect(host.setIsShortcutsOpen).toHaveBeenCalledWith(true);
    // Language reflects the account and opens the Cave's Language setting.
    const language = footer().querySelector<HTMLButtonElement>('.library-footer-language')!;
    expect(language.textContent).toContain('Korean (한국어)');
    await click(language);
    expect(onNavigate).toHaveBeenLastCalledWith({ screen: 'profile', cave: '/settings' });
  });

  it('follows the global navigation exclusions and the guest account state', async () => {
    await render(<MainLibraryFooter adapter={adapter()} location={{ screen: 'reader' }} onNavigate={vi.fn()} onOpenHelp={vi.fn()} social={[]} legal={[]} />);
    expect(container.querySelector('[data-library-footer]')).toBeNull();
    await render(<MainLibraryFooter adapter={adapter({ currentUser: null, userProfile: null })} location={{ screen: 'home', collection: 'featured' }} onNavigate={vi.fn()} onOpenHelp={vi.fn()} social={[]} legal={[]} />);
    expect(footer()).not.toBeNull();
    expect(footer().querySelector('.library-footer-language')).toBeNull();
  });
});

describe('Home placement', () => {
  it('renders the footer once, after Home content and outside the header', async () => {
    const copyText = vi.fn(async (_text: string) => {});
    await render(<MainLibraryPreview state="linked" developmentNavigation
      developmentHeader={value => <MainLibraryHeader adapter={{ ...value, copyText }} />} />);
    const footers = container.querySelectorAll('[data-library-footer]');
    expect(footers).toHaveLength(1);
    expect(footers[0].closest('header')).toBeNull();
    const home = container.querySelector('[data-light-novels-home]')!;
    expect(home.compareDocumentPosition(footers[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Visible social row, closed menus, no portal button, and the identity intact.
    expect(footers[0].querySelectorAll('.library-footer-social-link')).toHaveLength(5);
    expect(Array.from(footers[0].querySelectorAll('[data-slot="disclosure-trigger"]')).every(button => button.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(footers[0].textContent).toContain(LIBRARY_FOOTER_STATEMENT);
    expect(footers[0].innerHTML.toLowerCase()).not.toContain('seaportal');
    expect(footers[0].querySelector('.library-footer-language')?.textContent).toContain('English');
  });
});

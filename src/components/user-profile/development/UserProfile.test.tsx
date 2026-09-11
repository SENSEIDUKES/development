// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserProfile from './UserProfile';
import { UserProfilePublicPanel } from './UserProfilePublicPanel';
import ReferenceUserProfile from '../reference/UserProfile';
import { UserProfileServicesProvider } from '../shared/userProfileServices';
import type { UserProfileController } from '../shared/userProfileServices';
import type { MockUserProfileServicesOptions } from '../../../workshop/previews/user-profile/mockUserProfileServices';
import { effectStatement, UserProfileHome } from './UserProfileHome';
import { buildPublicProfile, developmentPublicRecord, DEFAULT_PUBLIC_PROFILE_VISIBILITY } from './publicProfile';
import { CAVE_DESTINATIONS, CAVE_PUBLIC_DESTINATIONS, publicCavePath, resolveCaveRoute } from './caveNavigation';
import { publicCreatorWorlds, type CreatorWorld, type PublicCreator } from './creatorWorlds';
import { previewPublicCreators } from '../../../workshop/previews/user-profile/publicCreatorData';
import type { AppUser } from '../shared/types';
import { createMockUserProfileServices } from '../../../workshop/previews/user-profile/mockUserProfileServices';
import { getPreviewScenario } from '../../../workshop/previews/user-profile/previewData';
import type { UserProfilePreviewState } from '../../../workshop/previews/user-profile/previewStates';
import { CAVE_ENVIRONMENTS, getCultivationStage } from './caveEnvironment';
import {
  DISPLAY_NAME_MAX_VISIBLE,
  clampDisplayName,
  countVisibleCharacters,
  isDisplayNameWithinLimit,
} from './displayName';
import {
  MASTER_RANK,
  RANKS,
  CAVE_AURA_TEXT_SURFACE,
  MIN_AURA_TEXT_CONTRAST,
  accessibleAuraTextColor,
  auraGradientTextContrastRatio,
  auraTextContrastRatio,
  getAuraSelection,
  getAuraGlowStyle,
  getAuraTextStyle,
  activeAuraOverride,
  getRankForQi,
  rankBackground,
  resolveRankVisual,
} from './qi';
import { nextEffectRefreshDelay } from './timedEffects';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let desktopViewport = false;

beforeEach(() => {
  window.history.replaceState(null, '', '/?preview=user-profile');
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  desktopViewport = false;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      media,
      // The Cave rail is mounted from the desktop breakpoint only; every other
      // query stays unmatched, so the default fixture is a phone.
      matches: media.includes('min-width: 1024px') ? desktopViewport : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

interface RenderOptions {
  publicCreators?: readonly PublicCreator[];
  accountControls?: import('./caveAccountControls').CaveAccountControls;
  state?: UserProfilePreviewState;
  onLogout?: () => void;
  onNavigateHome?: () => void;
  Component?: typeof UserProfile;
  adapter?: Partial<MockUserProfileServicesOptions>;
}

async function renderCave({ state = 'developed-cultivator', onLogout = vi.fn(), onNavigateHome = vi.fn(), Component = UserProfile, adapter = {}, accountControls, publicCreators }: RenderOptions = {}) {
  const scenario = getPreviewScenario(state);
  const logExcludedAction = vi.fn();
  const onSignIn = vi.fn<(account: AppUser) => void>();
  const services = createMockUserProfileServices({ state, logExcludedAction, onSignIn, ...adapter });
  const useOriginalController = services.useController;
  let controller: UserProfileController;
  services.useController = props => { controller = useOriginalController(props); return controller; };
  await act(async () => {
    root.render(
      <UserProfileServicesProvider services={services}>
        <Component
          currentUser={scenario.currentUser}
          stories={scenario.stories}
          accountControls={accountControls}
          publicCreators={publicCreators}
          onLogout={onLogout}
          onNavigateHome={onNavigateHome}
          onNavigateLibrary={vi.fn()}
        />
      </UserProfileServicesProvider>,
    );
  });
  // The mocked profile snapshot resolves on a 450 ms timer.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });
  return { logExcludedAction, onSignIn, services, controller: () => controller };
}

const text = () => document.body.textContent ?? '';

const byText = <T extends HTMLElement>(selector: string, needle: string): T => {
  const match = Array.from(document.body.querySelectorAll<T>(selector)).find(element =>
    (element.textContent ?? '').replace(/\s+/g, ' ').trim().includes(needle),
  );
  if (!match) throw new Error(`No ${selector} containing "${needle}"`);
  return match;
};

const click = async (element: Element) => {
  await act(async () => {
    (element as HTMLElement).click();
  });
};

const press = async (element: Element, key: string) => {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
  });
};

const open = (id: string) => id === 'stories' || id === 'relics' ? byText<HTMLElement>('nav button', id === 'stories' ? 'Stories' : 'Relics') : byText<HTMLElement>(`[data-cave-card="${id}"]`, '');
const openSearch = async () => {
  if (!document.querySelector('.workspace-search-results')) {
    await click(document.querySelector('[aria-label="Search"]')!);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  }
};
const closeSearch = async () => {
  const close = document.querySelector('[aria-label="Close Search"]');
  if (close) await click(close);
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
};
const searchCaveDestination = async (label: string) => {
  await openSearch();
  await click(byText('.workspace-search-results button', label));
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
};
const navigateTo = async (path: string) => { await act(async () => { window.history.pushState(null, '', `?preview=user-profile&cave=${path}`); window.dispatchEvent(new PopStateEvent('popstate')); }); };

describe('Profile creator navigation', () => {
  const creators = () => previewPublicCreators(getPreviewScenario('developed-cultivator').profile);

  it('places real Worlds and Store links between Inbox and Energy without changing identity', async () => {
    const { controller } = await renderCave();
    const row = container.querySelector('[data-cave-identity-actions]')!;
    expect([...row.children].map(child => child.textContent)).toEqual(['Inbox', 'Worlds', 'Store', 'Energy']);
    for (const [label, destination] of [['Worlds', 'worlds'], ['Store', 'storefront']] as const) {
      const link = byText<HTMLAnchorElement>('[data-cave-identity-actions] a', label);
      expect(link.tabIndex).toBe(0);
      expect(link.querySelector('[data-sen-navigation-icon]')?.getAttribute('aria-hidden')).toBe('true');
      expect(new URL(link.href).searchParams.get('cave')).toBe(publicCavePath(destination, controller().profile!.uid));
    }
    expect(container.querySelector('[data-cave-rank]')?.textContent).toBe('Leader');
    expect(container.querySelector('[data-cave-progress]')?.getAttribute('aria-valuetext')).toBe('13,480 Qi of 25,000');
    expect(container.querySelector('.cave-tier-badge')?.textContent).toBe('Inner Sect');
    expect(container.querySelector('.library-global-navigation')?.textContent).toContain('HomeLibraryDiscoverProfile');
  });

  it('preserves URL context, modified-click behavior and history state', async () => {
    history.replaceState({ host: 'retained' }, '', '/?preview=user-profile&keep=yes#identity');
    await renderCave();
    const link = byText<HTMLAnchorElement>('a', 'Worlds');
    const modifiedClick = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    // Suppress jsdom's native navigation after observing the React handler.
    let intercepted: boolean | undefined;
    const observe = (event: MouseEvent) => { intercepted = event.defaultPrevented; event.preventDefault(); };
    document.addEventListener('click', observe, { once: true });
    await act(async () => { link.dispatchEvent(modifiedClick); });
    expect(intercepted).toBe(false);
    expect(new URLSearchParams(location.search).has('cave')).toBe(false);
    await click(link);
    expect(location.hash).toBe('#identity');
    expect(new URLSearchParams(location.search).get('keep')).toBe('yes');
    expect(history.state).toEqual({ host: 'retained' });
    expect(document.activeElement?.textContent).toBe('Worlds');
  });

  it('uses another viewed creator for their portrait, links, worlds and return path', async () => {
    const publicCreators = creators();
    const other = publicCreators[1];
    await renderCave({ publicCreators });
    await navigateTo(publicCavePath('home', other.profile.uid));
    expect(container.querySelector('[data-cave-name] .library-elemental-title__text')?.textContent).toBe('Moon Scribe');
    expect(container.querySelector('[data-cave-account-controls]')).toBeNull();
    await click(byText('a', 'Worlds'));
    expect(container.querySelector('[data-cave-worlds]')?.getAttribute('data-cave-worlds')).toBe(other.profile.uid);
    const worlds = [...container.querySelectorAll('[data-cave-world]')];
    expect(worlds).toHaveLength(2);
    expect(worlds.every(world => world.getAttribute('data-cave-world')?.startsWith(other.profile.uid))).toBe(true);
    expect(text()).not.toMatch(/Private world fixture|Draft world fixture/);
    await click(container.querySelector('[aria-label="Return to Moon Scribe’s profile"]')!);
    expect(container.querySelector('[data-cave-name] .library-elemental-title__text')?.textContent).toBe('Moon Scribe');
    await click(byText('a', 'Store'));
    expect(container.querySelector('[data-cave-storefront]')?.getAttribute('data-cave-storefront')).toBe(other.profile.uid);
    expect(text()).toContain('Moon Scribe’s Store');
    expect(text()).toContain('No items are available yet.');
    expect(container.querySelector('[data-cave-storefront] button')).toBeNull();
  });

  it('keeps a reusable seed in its world and never lists the private account seeds', async () => {
    const publicCreators = creators();
    const { services, logExcludedAction } = await renderCave({ publicCreators });
    const privateIndex = vi.spyOn(services, 'listStorySeeds');
    await click(byText('a', 'Worlds'));
    const world = container.querySelector('[data-world-seed]')!.closest('[data-cave-world]');
    expect(world?.textContent).toContain('The Lantern Sea');
    expect(world?.textContent).toContain('Lanterns over the quiet sea');
    await click(world!.querySelector('button')!);
    expect(logExcludedAction).toHaveBeenCalledWith('Story seed JSON download (Lanterns over the quiet sea)');
    expect(privateIndex).not.toHaveBeenCalled();
    expect(container.querySelector('a[href*="seeds"]')).toBeNull();
  });

  it('shows a seed without reuse when permission is view-only, and reports export failures', async () => {
    const publicCreators = creators();
    publicCreators[0].worlds[0].seedSharing = 'view';
    const { services } = await renderCave({ publicCreators });
    await click(byText('a', 'Worlds'));
    expect(container.querySelector('[data-world-seed]')?.textContent).toContain('Reuse is not enabled');
    expect(container.querySelector('[data-world-seed] button')).toBeNull();
    publicCreators[0].worlds[0].seedSharing = 'reuse';
    await navigateTo('/home');
    vi.spyOn(services, 'downloadStorySeed').mockRejectedValue(new Error('offline'));
    await click(byText('a', 'Worlds'));
    await click(container.querySelector('[data-world-seed] button')!);
    expect(text()).toContain('This seed could not be exported. Please try again.');
    expect(container.querySelector('[data-world-seed] button')?.hasAttribute('disabled')).toBe(false);
  });

  it.each(['worlds', 'storefront'] as const)('supports signed-out direct %s links for a supplied public creator', async destination => {
    const publicCreators = creators();
    history.replaceState(null, '', `/?preview=user-profile&cave=${publicCavePath(destination, publicCreators[1].profile.uid)}`);
    await renderCave({ state: 'signed-out', publicCreators });
    expect(container.querySelector(`[data-cave-destination="${destination}"]`)).not.toBeNull();
    expect(text()).toContain('Moon Scribe');
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not fall back to the signed-in account for an unknown creator', async () => {
    await renderCave({ publicCreators: creators() });
    await navigateTo(publicCavePath('worlds', 'unknown-creator'));
    expect(text()).toContain('Creator unavailable');
    expect(container.querySelector('[data-cave-world]')).toBeNull();
    expect(text()).not.toContain('The Lantern Sea');
  });

  it('renders a safe empty state when no public records have been supplied', async () => {
    await renderCave();
    await click(byText('a', 'Worlds'));
    expect(text()).toContain('No public worlds yet');
    expect(container.querySelector('[data-world-seed]')).toBeNull();
  });

  it('encodes creator identities and rejects malformed or private creator paths', () => {
    const id = 'creator/a ?#雪';
    expect(resolveCaveRoute(publicCavePath('worlds', id))).toMatchObject({ creatorId: id, view: 'worlds', audience: 'public' });
    for (const path of ['/public/creators/%ZZ/worlds', '/public/creators/uid/worlds/private', '/public/creators/uid/settings', '/public/worlds', '/public/storefront']) {
      expect(resolveCaveRoute(path).view).toBe('unavailable');
    }
  });
});

describe('Public creator world filtering', () => {
  const published: CreatorWorld = { id: 'world', title: 'Published', userId: 'creator', visibility: 'public', status: 'published' };
  it.each([
    { visibility: 'private', highlighted: true },
    { status: 'draft', highlighted: true },
    { status: undefined },
    { visibility: undefined },
    { userId: 'viewer' },
    { userId: undefined },
    { deleted: true },
  ] as Partial<CreatorWorld>[])('excludes unpublished or incorrectly owned content: %j', override => {
    expect(publicCreatorWorlds('creator', [{ ...published, ...override }])).toEqual([]);
  });
  it('includes public and highlighted published worlds, with strict seed provenance and permissions', () => {
    const seed = { id: 'seed', userId: 'creator', title: 'Shared seed', createdAt: '', updatedAt: '' };
    expect(publicCreatorWorlds('creator', [published, { ...published, id: 'featured', highlighted: true }])).toHaveLength(2);
    for (const world of [
      { ...published, sourceSeedId: 'different', seed, seedSharing: 'reuse' as const },
      { ...published, sourceSeedId: seed.id, seed: { ...seed, userId: 'viewer' }, seedSharing: 'reuse' as const },
      { ...published, sourceSeedId: seed.id, seed, seedSharing: 'private' as const },
      { ...published, sourceSeedId: seed.id, seed },
    ]) expect(publicCreatorWorlds('creator', [world])[0].seed).toBeUndefined();
  });
});

describe('Cultivator Cave home', () => {
  it('wires host Inbox, Store and Redeem Code while hiding the Energy balance', async () => {
    const accountControls = { energyBalance: 1234, inboxUnreadCount: 3, onOpenInbox: vi.fn(), onOpenStore: vi.fn(), onRedeemCode: vi.fn() };
    await renderCave({ accountControls });
    expect(container.querySelector('[data-cave-energy]')?.textContent).toBe('Energy');
    expect(container.querySelector('[data-cave-progress]')?.getAttribute('aria-valuetext')).toBe('13,480 Qi of 25,000');
    expect(container.querySelector('[data-cave-unread]')).not.toBeNull();
    await click(container.querySelector('[aria-label="Inbox, 3 unread messages"]')!);
    expect(accountControls.onOpenInbox).toHaveBeenCalledTimes(1);
    await click(byText('[data-cave-account-actions] button', 'Store'));
    expect(accountControls.onOpenStore).toHaveBeenCalledTimes(1);
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('button', 'Account'));
    await click(byText('button', 'Redeem Code'));
    expect(accountControls.onRedeemCode).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.cave-workspace-dock')).toBeNull();
    expect(container.querySelector('.library-global-navigation')?.textContent).not.toContain('Settings');
  });

  it('keeps Energy label-only at zero and routes unconnected entries with working returns', async () => {
    await renderCave({ accountControls: { energyBalance: 0, inboxUnreadCount: 0 } });
    expect(container.querySelector('[data-cave-energy]')?.textContent).toBe('Energy');
    expect(container.querySelector('[data-cave-unread]')).toBeNull();
    await click(byText('button', 'Inbox'));
    expect(text()).toContain('Inbox is not connected');
    await click(container.querySelector('[aria-label="Return to cave"]')!);
    await click(byText('[data-cave-account-actions] button', 'Store'));
    expect(text()).toContain('The Store is not available yet.');
    await click(container.querySelector('[aria-label="Return to cave"]')!);
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('button', 'Account'));
    await click(byText('button', 'Redeem Code'));
    expect(text()).toContain('Code redemption is not connected');
    await click(container.querySelector('[aria-label="Return to Settings"]')!);
    expect(container.querySelector('[data-cave-settings]')).not.toBeNull();
  });

  it('does not invent an unavailable Energy balance or expose account controls publicly', async () => {
    await renderCave();
    expect(container.querySelector('[data-cave-energy]')?.textContent).toBe('Energy');
    await navigateTo('/public/home');
    expect(container.querySelector('[data-cave-account-controls]')).toBeNull();
    expect(container.querySelector('[data-cave-account-actions]')).toBeNull();
    for (const path of ['/public/home/inbox', '/public/home/store', '/public/settings/redeem-code']) {
      await navigateTo(path);
      expect(container.querySelector('[data-cave-destination="unavailable"]')).not.toBeNull();
    }
  });
  it('shows the portrait, compact identity, cultivation and Home controls', async () => {
    await renderCave();
    const scenario = getPreviewScenario('developed-cultivator');
    const profile = scenario.profile!;

    expect(container.querySelector('[data-cave-backdrop]')?.getAttribute('src')).toBe(CAVE_ENVIRONMENTS[0].src);
    expect(container.querySelector('[data-cave-portrait] img')?.getAttribute('src')).toBe(profile.avatarUrl);
    expect(container.querySelector('#cave-cultivator-name')?.textContent).toContain(profile.displayName);
    expect(container.querySelector('[data-cave-rank]')?.textContent).toContain('Leader');
    expect(container.querySelector('[data-cave-progress]')?.getAttribute('aria-valuetext')).toBe('13,480 Qi of 25,000');
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('11');

    for (const id of ['qi-reserves', 'dao-pillar', 'status-effects']) {
      expect(container.querySelector(`[data-cave-card="${id}"]`)).not.toBeNull();
    }
    expect(open('dao-pillar').textContent).toContain('12 Day Streak');
    expect(open('status-effects').textContent).toContain('Active Effects · 2');
    expect(text()).not.toContain(profile.username);
    expect(container.querySelector('.workspace-header [aria-label="Open settings"]')).toBeNull();
    // The chrome names the workspace without owning the page heading.
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('[data-slot="library-header-badge-title"]')?.textContent).toBe('Profile');
    // Below the desktop breakpoint the drawer is the only navigation mounted:
    // no rail, and so no second copy of the same destinations.
    expect(container.querySelectorAll('nav[aria-label="Library global navigation"]')).toHaveLength(1);
    expect(container.querySelectorAll('nav[aria-label="Cultivator Cave navigation"]')).toHaveLength(0);
    expect(container.querySelector('[data-slot="app-shell-sidebar"]')).toBeNull();
    expect(text()).not.toContain('Cultivate in silence. Ascend in the unseen.');
  });

  it('regression: keeps a full-width Relics destination under the Dao Pillar and above Store/Settings', async () => {
    await renderCave();
    const home = container.querySelector('[data-cave-page="home"]')!;
    const cards = Array.from(home.querySelectorAll('[data-cave-card="dao-pillar"], [data-cave-card="relics"], [data-cave-account-actions]'));
    // Order on the page: Daily Dao Pillar, then Relics, then Store/Settings.
    expect(cards.map(card => card.getAttribute('data-cave-card') ?? 'account-actions'))
      .toEqual(['dao-pillar', 'relics', 'account-actions']);
    const relics = container.querySelector<HTMLButtonElement>('[data-cave-card="relics"]')!;
    // Full width, like the Dao Pillar it follows — not one half of the small pair.
    expect(relics.className).toContain('cave-home-pillar');
    expect(relics.closest('[data-cave-account-actions]')).toBeNull();
    expect(relics.disabled).toBe(false);
    expect(relics.textContent).toContain('Relics');

    await click(relics);
    // The existing /relics route and the one inventory panel, not a second copy.
    expect(window.location.search).toContain('cave=%2Frelics');
    expect(container.querySelector('[data-cave-destination="relics"]')).not.toBeNull();
    expect(text()).toContain('Inventory, attunement, and the Offering Hall');
    expect(container.querySelectorAll('[data-cave-destination="relics"]')).toHaveLength(1);
    expect(container.querySelector('[data-cave-card="relics"]')).toBeNull();
  });

  it('opens special reserves without including cultivation Qi', async () => {
    await renderCave();
    await click(open('qi-reserves'));
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Sect Qi620');
    expect(dialog?.textContent).toContain('Demonic Qi145');
    expect(dialog?.textContent).not.toContain('Heavenly Qi');
    expect(window.location.search).not.toContain('cave=');
  });

  it('replaces the signed-out Cave with OAuth and links the mock account', async () => {
    const { onSignIn } = await renderCave({ state: 'signed-out' });
    expect(text()).not.toContain('Spirit Unlinked');
    expect(text()).not.toContain('Link Spirit Realm');
    expect(container.querySelector('[aria-label="Open settings"]')).toBeNull();
    expect(container.querySelector('[data-cave-card="stories"]')).toBeNull();
    expect(container.querySelector('[data-auth-context="spirit-link"]')).not.toBeNull();
    expect(text()).toContain('Continue with Google');
    expect(text()).toContain('Continue with Apple');
    expect(text()).toContain('Continue with Email');

    await click(byText('button', 'Continue with Google'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('keeps a loading and an error state reachable', async () => {
    await renderCave({ state: 'loading' });
    expect(text()).toContain('Loading profile');

    act(() => {
      root.unmount();
    });
    root = createRoot(container);

    await renderCave({ state: 'error' });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('celestial record could not be retrieved');
  });
});

describe('Cultivator Cave destinations', () => {
  it('opens Stories with manifested stories and seeds, then returns home', async () => {
    await renderCave();
    await searchCaveDestination('Stories');
    const destination = container.querySelector('[data-cave-destination="stories"]');
    expect(destination).not.toBeNull();
    expect(document.activeElement?.id).toBe('cave-destination-stories-title');
    expect(destination?.textContent).toContain('Ashes of the Ninth Heaven');
    expect(destination?.textContent).toContain('Saltwind Sovereign');
    expect(destination?.textContent).not.toContain('archived draft');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(container.querySelectorAll('[aria-label="Story seeds"] li')).toHaveLength(3);
    expect(byText<HTMLButtonElement>('button', 'Export').className).toContain('!min-h-11');

    await click(container.querySelector('[aria-label="Return to cave"]')!);
    expect(container.querySelector('[data-cave-home]')).not.toBeNull();
  });

  it('opens Relics with inventory, attunement, and a working Offering Hall', async () => {
    await renderCave();
    await searchCaveDestination('Relics');
    const destination = () => container.querySelector('[data-cave-destination="relics"]')!;
    expect(destination().textContent).toContain('Soul Attuned');
    expect(destination().textContent).toContain('Fragment of the First Sentence');
    expect(byText('[role="tab"]', 'Inventory').textContent).toContain('6');
    expect(byText('[role="tab"]', 'Offering Pouch').textContent).toContain('3');
    expect(byText('[role="tab"]', 'History').textContent).toContain('3');

    // Inspect a relic and release / re-attune the soul.
    await click(byText('button', 'Crown of the Ninth Refusal'));
    const dialog = () => document.body.querySelector('[data-relic-inspect="relic-mythic"]');
    expect(dialog()).not.toBeNull();
    expect(dialog()?.querySelector('dd')?.className).toContain('[overflow-wrap:anywhere]');
    await click(byText('button', 'Attune Soul'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(byText('button', 'Release Attunement')).toBeTruthy();
    expect(destination().textContent).toContain('Crown of the Ninth Refusal · +8% Sect Qi');
    await click(byText('button', 'Close'));
    expect(dialog()).toBeNull();

    // Submit the weekly pouch: relics move to history and rewards pay out.
    await click(byText('[role="tab"]', 'Offering Pouch'));
    await click(byText('button', 'Submit Offerings'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(document.body.querySelector('[role="status"]')?.textContent).toContain('3 relics offered: +7,250 Qi and +175 Sect Merit');
    expect(byText('[role="tab"]', 'Offering Pouch').textContent).toContain('(0)');
    expect(byText('[role="tab"]', 'History').textContent).toContain('(6)');
  });

  it('opens the Dao Pillar and refines the daily streak', async () => {
    await renderCave();
    await navigateTo('/home/dao-pillar');
    expect(container.querySelector('#cave-dao-pillar-streak')?.textContent).toBe('12 Days');
    await click(byText('button', 'Refine Daily Dao'));
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(container.querySelector('#cave-dao-pillar-streak')?.textContent).toBe('13 Days');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Refinement complete today');
    await click(container.querySelector('[aria-label="Return to cave"]')!);
    expect(open('dao-pillar').textContent).toContain('13 Day Streak');
    expect(container.querySelector('[data-cave-progress]')?.getAttribute('aria-valuetext')).toBe('13,485 Qi of 25,000');
  });

  it('offers repair when the pillar is cracked', async () => {
    await renderCave({ state: 'owner-admin' });
    await navigateTo('/home/dao-pillar');
    expect(container.querySelector('[data-cracked="true"]')).not.toBeNull();
    await click(byText('button', 'Repair Pillar (50 Qi)'));
    expect(container.querySelector('[data-cracked="true"]')).toBeNull();
    expect(byText('button', 'Refine Daily Dao')).toBeTruthy();
  });

  it('lists active status effects and shows an empty state for a new cultivator', async () => {
    await renderCave();
    await navigateTo('/home/status-effects');
    const cards = container.querySelectorAll('[aria-label="Active status effects"] > li');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Blessing • Account-wide');
    expect(cards[0].querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('62');
    expect(cards[1].textContent).toContain('Reward unlocked');

    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    await renderCave({ state: 'new-cultivator' });
    // URL selection survives remounts, just as a direct link survives reload.
    expect(container.querySelector('[data-cave-destination="status-effects"]')).not.toBeNull();
    expect(text()).toContain('No status effects are active');
  });
});

describe('Cultivator Cave settings', () => {
  it('opens a Settings page holding every existing setting section', async () => {
    const onLogout = vi.fn();
    await renderCave({ onLogout });
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    const panel = () => document.body.querySelector('[data-cave-settings]');
    expect(panel()).not.toBeNull();
    const headings = Array.from(panel()!.querySelectorAll('[data-slot="disclosure-heading"]')).map(
      element => element.textContent,
    );
    expect(headings).toEqual([
      'Identity & Celestial Aura',
      'Public Profile',
      'Cultivator Portrait',
      'Cave Environment',
      'Language',
      'Writing Preferences',
      'Harmony & Sync',
      'Backup, Import & Export',
      'Advanced Tools',
      'Account',
    ]);
    expect(panel()!.querySelectorAll('[role="radiogroup"][aria-label="Cave environment"] [role="radio"]')).toHaveLength(
      CAVE_ENVIRONMENTS.length,
    );

    // Changing the environment swaps the backdrop behind the cave.
    await click(byText('[aria-label="Cave environment"] [role="radio"]', 'Blood Moon'));
    expect(container.querySelector('[data-cave-backdrop]')?.getAttribute('src')).toBe('/manifest-backdrops/immortal-land-5.jpg');

    // Sever Link lives in the panel.
    await click(byText('[data-slot="disclosure-trigger"]', 'Account'));
    await click(byText('button', 'Sever Link'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('keeps custom radio groups to one tab stop and supports native radio keys', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));

    const radios = (label: string) => Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(`[role="radiogroup"][aria-label="${label}"] [role="radio"]`),
    );
    const selected = (label: string) => document.body.querySelector<HTMLButtonElement>(
      `[role="radiogroup"][aria-label="${label}"] [role="radio"][aria-checked="true"]`,
    )!;
    const enabled = (label: string) => radios(label).filter(radio => !radio.disabled);

    const auraLabel = 'Celestial Aura rank';
    expect(enabled(auraLabel).filter(radio => radio.tabIndex === 0)).toHaveLength(1);
    expect(selected(auraLabel).textContent).toContain('Leader');

    selected(auraLabel).focus();
    await press(selected(auraLabel), 'ArrowRight');
    expect(selected(auraLabel).textContent).toContain('Reader');
    expect(document.activeElement).toBe(selected(auraLabel));
    expect(enabled(auraLabel).filter(radio => radio.tabIndex === 0)).toHaveLength(1);

    await press(selected(auraLabel), 'End');
    expect(selected(auraLabel).textContent).toContain('Leader');
    await press(selected(auraLabel), 'Home');
    expect(selected(auraLabel).textContent).toContain('Reader');

    const environmentLabel = 'Cave environment';
    await click(byText('[data-slot="disclosure-trigger"]', 'Cave Environment'));
    expect(enabled(environmentLabel).filter(radio => radio.tabIndex === 0)).toHaveLength(1);
    selected(environmentLabel).focus();
    await press(selected(environmentLabel), 'End');
    expect(selected(environmentLabel).textContent).toContain(CAVE_ENVIRONMENTS.at(-1)!.name);
    await press(selected(environmentLabel), 'Home');
    expect(selected(environmentLabel).textContent).toContain(CAVE_ENVIRONMENTS[0].name);
    await press(selected(environmentLabel), 'ArrowDown');
    expect(selected(environmentLabel).textContent).toContain(CAVE_ENVIRONMENTS[1].name);
    expect(document.activeElement).toBe(selected(environmentLabel));
  });

  it('keeps an enabled Aura tab stop when a legacy selected rank is now locked', async () => {
    await renderCave({
      adapter: {
        profileOverride: {
          dao_xp: 0,
          qi: 0,
          displayNameColor: 'rank:master',
        },
      },
    });
    await click(byText('[data-cave-account-actions] button', 'Settings'));

    const auraRows = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '[role="radiogroup"][aria-label="Celestial Aura rank"] [role="radio"]',
      ),
    );
    const selectedLocked = auraRows.find(row => row.getAttribute('aria-checked') === 'true')!;
    const enabledRows = auraRows.filter(row => !row.disabled);

    expect(selectedLocked.disabled).toBe(true);
    expect(selectedLocked.tabIndex).toBe(-1);
    expect(enabledRows).toHaveLength(1);
    expect(enabledRows[0].textContent).toContain('Reader');
    expect(enabledRows[0].tabIndex).toBe(0);
  });

  it('announces the selected Custom Spectrum without changing its picker behavior', async () => {
    await renderCave({
      adapter: {
        profileOverride: {
          dao_xp: 50_000,
          qi: 50_000,
          displayNameColor: '#000000',
        },
      },
    });
    await click(byText('[data-cave-account-actions] button', 'Settings'));

    const spectrum = document.body.querySelector<HTMLButtonElement>('[aria-label="Custom spectrum"]')!;
    expect(spectrum.disabled).toBe(false);
    expect(spectrum.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps Harmony and a cracked Pillar text opaque enough for their dark surface', async () => {
    expect(auraTextContrastRatio('#9ca3af')).toBeGreaterThanOrEqual(MIN_AURA_TEXT_CONTRAST);
    expect(auraTextContrastRatio('#ff3333')).toBeGreaterThanOrEqual(MIN_AURA_TEXT_CONTRAST);

    await renderCave({ adapter: { profileOverride: { daoPillarCracked: true } } });
    await navigateTo('/home/dao-pillar');
    expect(document.body.querySelector('#cave-dao-pillar-streak')?.className).not.toContain('/60');
    await navigateTo('/home');
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('[data-slot="disclosure-trigger"]', 'Harmony & Sync'));
    expect(document.body.querySelector('[aria-label^="Harmony:"] [aria-live="polite"]')?.className).not.toContain('opacity-');
  });

  it('keeps Profile-specific small controls touch-sized and focusable', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));

    const username = document.body.querySelector<HTMLInputElement>('#cave-username')!;
    const displayName = document.body.querySelector<HTMLInputElement>('#cave-display-name')!;
    const auraRows = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[aria-label="Celestial Aura rank"] [role="radio"]'));
    const spectrum = document.body.querySelector<HTMLButtonElement>('[aria-label="Custom spectrum"]')!;
    expect(username.className).toContain('!min-h-11');
    expect(displayName.className).toContain('!min-h-11');
    expect(auraRows.every(row => row.className.includes('min-h-11'))).toBe(true);
    expect(spectrum.className).toContain('h-11');
    expect(spectrum.className).toContain('focus-visible:outline');

    await click(byText('[data-slot="disclosure-trigger"]', 'Public Profile'));
    expect(Array.from(document.body.querySelectorAll<HTMLElement>('[data-cave-visibility] label'))
      .some(control => control.className.includes('!min-h-11'))).toBe(true);
    expect(byText<HTMLButtonElement>('button', 'Preview Public View').className).toContain('!min-h-11');

    await click(byText('[data-slot="disclosure-trigger"]', 'Cultivator Portrait'));
    const mirror = byText<HTMLButtonElement>('button', 'Open Divine Mirror');
    expect(mirror.className).toContain('!min-h-11');
    await click(mirror);
    const close = document.body.querySelector<HTMLButtonElement>('[aria-label="Close Portrait Builder"]')!;
    expect(close.className).toContain('h-11');
    expect(close.className).toContain('w-11');
    expect(close.className).toContain('focus-visible:outline');

    await click(close);
    await click(byText('[data-slot="disclosure-trigger"]', 'Language'));
    expect(document.body.querySelector<HTMLSelectElement>('#cave-preferred-language')?.className).toContain('!h-11');
    expect(document.body.querySelector<HTMLSelectElement>('#cave-translation-language')?.className).toContain('!h-11');
  });

  it('edits identity through the panel and saves it to the profile', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    const input = document.body.querySelector<HTMLInputElement>('#cave-display-name')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(input, 'Cave Dweller');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(byText('button', 'Guard Changes'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    await searchCaveDestination('Home');
    expect(container.querySelector('#cave-cultivator-name')?.textContent).toContain('Cave Dweller');
  });

  it('asks for confirmation on a language change and reverts on request', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('[data-slot="disclosure-trigger"]', 'Language'));
    const select = document.body.querySelector<HTMLSelectElement>('#cave-preferred-language')!;
    await act(async () => {
      select.value = 'Spanish';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(document.body.querySelector('[data-cave-language-confirm]')?.textContent).toContain('Confirm Language Change');
    await click(byText('button', 'No, Revert Back'));
    expect(document.body.querySelector('[data-cave-language-confirm]')).toBeNull();
    expect(select.value).toBe('English');
  });

  it('exposes the Akashic Switchboard to an owner and opens it as a destination', async () => {
    await renderCave({ state: 'owner-admin' });
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('button', 'Open Akashic Switchboard'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    const destination = container.querySelector('[data-cave-destination="switchboard"]');
    expect(destination).not.toBeNull();
    expect(destination?.textContent).toContain('Akashic Records Control Switchboard');
    expect(destination?.textContent).toContain('User Directory (4)');
  });

  it('makes the Akashic Switchboard controls named, stateful, and touch-sized', async () => {
    await renderCave({ state: 'owner-admin' });
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('button', 'Open Akashic Switchboard'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    const viewSwitcher = document.body.querySelector<HTMLElement>('[role="group"][aria-label="Akashic record view"]')!;
    const directory = byText<HTMLButtonElement>('[role="group"] button', 'User Directory');
    const chronicles = byText<HTMLButtonElement>('[role="group"] button', 'Novel Chronicles');
    expect(viewSwitcher).not.toBeNull();
    expect(directory.type).toBe('button');
    expect(directory.getAttribute('aria-pressed')).toBe('true');
    expect(chronicles.getAttribute('aria-pressed')).toBe('false');
    expect(directory.className).toContain('min-h-11');
    expect(directory.className).toContain('focus-visible:outline');
    expect(document.body.querySelector<HTMLInputElement>('[aria-label="Search users"]')?.className).toContain('min-h-11');

    await click(chronicles);
    expect(directory.getAttribute('aria-pressed')).toBe('false');
    expect(chronicles.getAttribute('aria-pressed')).toBe('true');
    expect(document.body.querySelector<HTMLInputElement>('[aria-label="Search stories"]')).not.toBeNull();
    expect(byText<HTMLButtonElement>('button', 'Purge Matrix').getAttribute('aria-label')).toContain('Purge Matrix for');

    await click(directory);
    const selector = document.body.querySelector<HTMLElement>('[aria-label^="Premium Rank Override for"]')!;
    expect(selector.getAttribute('role')).toBe('group');
    expect(selector.querySelector<HTMLButtonElement>('button')?.getAttribute('aria-pressed')).not.toBeNull();
    expect(selector.querySelector<HTMLButtonElement>('button')?.className).toContain('min-h-11');
  });
});

describe('Cultivator Cave stage helper', () => {
  it('derives a stage from progress and reports the peak at max rank', () => {
    expect(getCultivationStage(10, 'Master')).toBe('Early Stage');
    expect(getCultivationStage(50, 'Master')).toBe('Middle Stage');
    expect(getCultivationStage(80, 'Master')).toBe('Late Stage');
    expect(getCultivationStage(100, null)).toBe('Peak');
  });
});

describe('rank colour system', () => {
  it('is one ten-rank ladder with the agreed Qi thresholds', () => {
    expect(RANKS.map(rank => [rank.name, rank.unlockedAt])).toEqual([
      ['Reader', 0],
      ['Disciple', 100],
      ['Scribe', 300],
      ['Scholar', 750],
      ['Author', 1500],
      ['Adept', 3000],
      ['Elder', 6000],
      ['Leader', 12000],
      ['Sage', 25000],
      ['Master', 50000],
    ]);
    expect(MASTER_RANK.name).toBe('Master');
    expect(MASTER_RANK.visual.kind).toBe('spectrum');
  });

  it('renders solid colours and weighted multi-stop gradients from the same data', () => {
    const reader = RANKS[0];
    expect(reader.visual.kind).toBe('solid');
    expect(rankBackground(reader.visual)).toBe('#E5E7EB');

    const leader = RANKS.find(rank => rank.id === 'leader')!;
    expect(leader.visual.kind).toBe('gradient');
    // Red into trophy gold, with the restrained orange support stop between them.
    expect(rankBackground(leader.visual)).toBe(
      'linear-gradient(90deg, #DC2626 0%, #F2762A 52%, #FFD700 100%)',
    );
  });

  it('chains the ladder end to end so no two adjacent ranks read alike', () => {
    const stopsFor = (id: string) => RANKS.find(rank => rank.id === id)!.visual.stops;
    const LIGHT_BLUE = '#7DD3FC';
    const YELLOW = '#FFE02E';
    const PINK = '#EC4899';
    const RED = '#DC2626';
    const TROPHY_GOLD = '#FFD700';

    // Each rank hands its end colour to the next: light blue → yellow → pink →
    // red → gold → violet. Adept, Elder and Leader all ran through orange
    // before, which made their swatches near-indistinguishable.
    expect(stopsFor('author')[0]).toBe(LIGHT_BLUE);
    expect(stopsFor('author').at(-1)).toBe(YELLOW);
    expect(stopsFor('adept')[0]).toBe(YELLOW);
    expect(stopsFor('adept').at(-1)).toBe(PINK);
    expect(stopsFor('elder')[0]).toBe(PINK);
    expect(stopsFor('elder').at(-1)).toBe(RED);
    expect(stopsFor('leader')[0]).toBe(RED);
    expect(stopsFor('leader').at(-1)).toBe(TROPHY_GOLD);
    expect(stopsFor('sage')[0]).toBe(TROPHY_GOLD);
    expect(stopsFor('sage').at(-1)).toBe('#A855F7');

    // The trophy ranks use gold, never the yellow above.
    expect(stopsFor('leader')).not.toContain(YELLOW);
    expect(stopsFor('sage')).not.toContain(YELLOW);
  });

  it('falls back to the rank the cultivator has earned when nothing is selected', () => {
    expect(getRankForQi(0).id).toBe('reader');
    expect(getRankForQi(11999).id).toBe('elder');
    expect(getRankForQi(12000).id).toBe('leader');
    expect(getRankForQi(50000).id).toBe('master');
    expect(resolveRankVisual(undefined, 6000).rank.id).toBe('elder');
  });

  it('resolves rank tokens, the legacy aura values, and a custom spectrum', () => {
    expect(resolveRankVisual('rank:sage', 0).rank.id).toBe('sage');

    // Legacy values map by the Qi threshold they were unlocked at, so nobody is
    // promoted or demoted by the ladder change.
    expect(resolveRankVisual('#8B5CF6', 0).rank.id).toBe('author');
    expect(resolveRankVisual('gradient-violet-gold', 0).rank.id).toBe('leader');
    expect(resolveRankVisual('animated-custom', 0).rank.id).toBe('sage');

    const custom = resolveRankVisual('#00FFFF', 50000);
    expect(custom.source).toBe('custom');
    expect(custom.visual.stops).toEqual(['#00FFFF']);
    expect(getAuraSelection('#00FFFF', 50000)).toBe('#00FFFF');
    expect(getAuraSelection(undefined, 3000)).toBe('rank:adept');
  });

  it('paints rank text with an accessible foreground while preserving its rank visual data', () => {
    const scribe = getAuraTextStyle('rank:scribe', undefined, 300);
    expect(scribe.style?.color).not.toBe('#2563EB');
    expect(auraTextContrastRatio(scribe.style?.color as string, CAVE_AURA_TEXT_SURFACE)).toBeGreaterThanOrEqual(MIN_AURA_TEXT_CONTRAST);
    expect(scribe.className).not.toContain('aura-gradient-text');

    const sage = getAuraTextStyle('rank:sage', undefined, 25000);
    expect(sage.className).toContain('aura-gradient-text');
    expect(sage.style?.backgroundImage).toContain('#FFD700');

    const master = getAuraTextStyle('rank:master', undefined, 50000);
    expect(master.className).toContain('aura-spectrum-text');
  });

  it('keeps every rendered Master spectrum midpoint above AA contrast', () => {
    const rawMaster = resolveRankVisual('rank:master', 50000).visual;
    expect(auraGradientTextContrastRatio(rawMaster.stops)).toBeLessThan(MIN_AURA_TEXT_CONTRAST);

    const textStyle = getAuraTextStyle('rank:master', undefined, 50000);
    const renderedStops = textStyle.style?.backgroundImage?.match(/#[0-9a-f]{6}/gi) ?? [];
    expect(auraGradientTextContrastRatio(renderedStops)).toBeGreaterThanOrEqual(MIN_AURA_TEXT_CONTRAST);
    expect(rawMaster.stops).toEqual(['#00FFFF', '#FF007F', '#FFD700', '#00FFFF']);
  });

  it('keeps all Aura text colours above AA contrast without rewriting stored custom colours', () => {
    for (const color of RANKS.flatMap(rank => rank.visual.stops)) {
      const accessibleColor = accessibleAuraTextColor(color);
      expect(auraTextContrastRatio(accessibleColor)).toBeGreaterThanOrEqual(MIN_AURA_TEXT_CONTRAST);
    }

    const custom = getAuraTextStyle('#000000', undefined, 50000);
    expect(custom.style?.color).not.toBe('#000000');
    expect(auraTextContrastRatio(custom.style?.color as string)).toBeGreaterThanOrEqual(MIN_AURA_TEXT_CONTRAST);
    expect(resolveRankVisual('#000000', 50000).visual.stops).toEqual(['#000000']);

    const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
    const silenced = getAuraTextStyle('rank:leader', [{
      ...effect,
      effectDef: { ...effect.effectDef, name: 'Ghostly Silence' },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }], 12000);
    expect(silenced.className).toContain('text-neutral-400');
    expect(silenced.className).not.toContain('opacity-60');

    const cursed = getAuraGlowStyle('rank:leader', [{
      ...effect,
      effectDef: { ...effect.effectDef, name: 'Curse of the Cursed Tome' },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }], 12000);
    expect(cursed.className).toContain('motion-reduce:animate-none');
  });

  it('does not paint a future Aura override before its effect starts', () => {
    const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
    const futureSilence = {
      ...effect,
      effectDef: { ...effect.effectDef, name: 'Ghostly Silence' },
      appliedAt: new Date(Date.now() + 60_000).toISOString(),
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    };

    const textStyle = getAuraTextStyle('rank:leader', [futureSilence], 12000);
    const glowStyle = getAuraGlowStyle('rank:leader', [futureSilence], 12000);
    expect(textStyle.className).not.toContain('text-neutral-400');
    expect(glowStyle.className).not.toContain('border-neutral-900');
  });

  it('lists every rank in Settings as name, colour and Qi, with no aura lore', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    const rows = Array.from(
      document.body.querySelectorAll('[role="radiogroup"][aria-label="Celestial Aura rank"] [role="radio"]'),
    );
    expect(rows).toHaveLength(RANKS.length);
    expect(rows[0].textContent).toBe('Reader0 Qi');
    expect(rows[RANKS.length - 1].textContent).toBe('Master50,000 Qi');

    // The developed cultivator sits at 13,480 Qi: Leader is equipped, Sage is locked.
    const leader = rows[7];
    expect(leader.textContent).toContain('Leader');
    expect(leader.textContent).toContain('Equipped');
    expect(leader.getAttribute('aria-checked')).toBe('true');
    expect(rows[8].hasAttribute('disabled')).toBe(true);

    // The old per-tier aura names are gone from the list.
    expect(document.body.textContent).not.toContain('Prism Branching Gradient');
    expect(document.body.textContent).not.toContain('Sect Entrance Aura');
  });

  it('gates the custom spectrum on reaching Master at 50,000 Qi', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    expect(document.body.textContent).toContain('Requires Master (50,000 Qi)');

    const spectrum = document.body.querySelector<HTMLButtonElement>('[aria-label="Custom spectrum"]')!;
    expect(spectrum.disabled).toBe(true);
  });
});

describe('locked reference replica', () => {
  it('still renders the original Celestial Tools page', async () => {
    await renderCave({ Component: ReferenceUserProfile });
    expect(text()).toContain('Celestial Tools');
    expect(text()).not.toContain('Cultivator Cave');
  });
});


describe('Cave workspace shell', () => {
  it('uses the supplied SEN icons for global and Cave navigation plus profile controls', async () => {
    desktopViewport = true;
    await renderCave();
    expect(CAVE_DESTINATIONS.slice(0, 3).map(item => item.icon)).toEqual(['home', 'scroll', 'relic']);
    expect(CAVE_PUBLIC_DESTINATIONS.map(item => item.icon)).toEqual(['home', 'scroll', 'relic']);
    const icons = Array.from(container.querySelectorAll<HTMLElement>('[data-sen-navigation-icon]'))
      .map(icon => icon.dataset.senNavigationIcon);
    expect(icons).toEqual(expect.arrayContaining(['home', 'book', 'discovery', 'scroll', 'relic', 'energy', 'store']));
  });

  it('keeps the decorative backdrop behind the interactive shell', async () => {
    await renderCave();
    const backdrop = container.querySelector('[data-cave-backdrop-layer]');
    const shell = container.querySelector('[data-slot="app-shell"]');

    expect(backdrop?.classList.contains('pointer-events-none')).toBe(true);
    expect(shell?.classList.contains('relative')).toBe(true);
    expect(shell?.classList.contains('z-10')).toBe(true);
  });

  it('mounts the desktop rail only once the desktop breakpoint fits', async () => {
    desktopViewport = true;
    await renderCave();
    const rail = container.querySelector('[data-slot="app-shell-sidebar"]');
    expect(rail).not.toBeNull();
    expect(rail?.getAttribute('aria-label')).toBe('Cultivator Cave navigation');
    expect(rail?.querySelectorAll('nav[aria-label="Cultivator Cave navigation"]')).toHaveLength(1);
    // One visible rail: the shell column, never a second bare aside beside it.
    expect(container.querySelectorAll('aside')).toHaveLength(1);
    // The workspace keeps its own scrolling region beside the rail.
    expect(container.querySelector('[data-slot="app-shell-main"] .cave-workspace-body')).not.toBeNull();
  });
});

describe('Cave workspace routing', () => {
  it('selects the three navigation destinations and focuses each page without duplicating history', async () => {
    await renderCave();
    for (const label of ['Stories', 'Relics', 'Home']) {
      await searchCaveDestination(label);
      expect(new URLSearchParams(location.search).get('cave')).toBe('/' + label.toLowerCase());
      expect(document.activeElement?.tagName).toBe('H2');
      await openSearch();
      const selected = document.querySelectorAll('.workspace-search-results [aria-pressed="true"]');
      expect(selected).toHaveLength(1);
      for (const item of selected) expect(item.textContent).toContain(label);
      const count = history.length;
      await searchCaveDestination(label);
      expect(history.length).toBe(count);
    }
  });

  it('loads a direct Settings link and retains host URL and history state', async () => {
    history.replaceState({ host: 'kept' }, '', '/?preview=user-profile&state=owner-admin&cave=/settings#host');
    await renderCave();
    expect(container.querySelector('[data-cave-settings]')).not.toBeNull();
    await searchCaveDestination('Stories');
    expect(location.hash).toBe('#host');
    expect(new URLSearchParams(location.search).get('state')).toBe('owner-admin');
    expect(history.state).toEqual({ host: 'kept' });
    await act(async () => {
      history.replaceState(history.state, '', '/?preview=user-profile&cave=/settings');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(container.querySelector('[data-cave-settings]')).not.toBeNull();
    expect(document.activeElement?.id).toBe('cave-destination-settings-title');
  });

  it.each(['/stories/story-123/manifestations', '/relics/item-123', '/relics/offering-hall'])('keeps parent navigation for future route %s', async path => {
    history.replaceState(null, '', '/?preview=user-profile&cave=' + encodeURIComponent(path));
    await renderCave();
    expect(text()).toContain('Page unavailable');
    await openSearch();
    expect(document.querySelector('.workspace-search-results [aria-pressed="true"]')?.textContent?.toLowerCase()).toContain(path.split('/')[1]);
    expect(container.querySelector('.library-global-navigation [aria-current="page"]')?.textContent).toBe('Profile');
    await closeSearch();
    await click(container.querySelector('[data-cave-destination="unavailable"] button')!);
    expect(new URLSearchParams(location.search).get('cave')).toBe('/' + path.split('/')[1]);
  });

  it('keeps Home active for existing cultivation pages and denies unauthorized admin links', async () => {
    await renderCave();
    await click(open('dao-pillar'));
    await openSearch();
    expect(document.querySelector('.workspace-search-results [aria-pressed="true"]')?.textContent).toContain('Home');
    await closeSearch();
    await act(async () => {
      history.replaceState(null, '', '/?cave=/settings/switchboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(text()).toContain('Authorization required');
    await openSearch();
    expect(document.querySelector('.workspace-search-results [aria-pressed="true"]')).toBeNull();
    expect(container.querySelector('.library-global-navigation [aria-current="page"]')?.textContent).toBe('Profile');
  });
});


describe('Cave overlays and history', () => {
  it('dismisses the portrait when history selects another destination', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('button', 'Open Divine Mirror'));
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Cultivator Portrait Builder');
    await act(async () => {
      history.replaceState(null, '', '/?preview=user-profile&cave=/stories');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[data-cave-destination="stories"]')).not.toBeNull();
  });

  it('reverts an unanswered language change when history leaves Settings', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    const select = document.body.querySelector<HTMLSelectElement>('#cave-preferred-language')!;
    await act(async () => {
      select.value = 'Spanish';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(document.body.querySelector('[data-cave-language-confirm]')).not.toBeNull();
    await act(async () => {
      history.replaceState(null, '', '/?preview=user-profile&cave=/home');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(document.body.querySelector('[data-cave-language-confirm]')).toBeNull();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    expect(document.body.querySelector<HTMLSelectElement>('#cave-preferred-language')?.value).toBe('English');
  });
});


describe('Home dynamic data and claim contract', () => {
  it.each(['mortal', 'outer_sect', 'inner_sect', 'sect_master', 'immortal'] as const)('shows the %s subscription accessibly', async premiumTier => {
    await renderCave({ adapter: { profileOverride: { premiumTier } } });
    expect(container.querySelector('.cave-tier-badge')?.getAttribute('aria-label')).toMatch(/^Subscription tier: /);
    expect(container.querySelector('.cave-tier-badge')?.textContent?.toLowerCase()).toBe(premiumTier.replaceAll('_', ' '));
  });
  it.each([['', 'Cultivator'], ['A'.repeat(180), 'A'.repeat(180)]])('handles missing or long display names', async (displayName, expected) => {
    await renderCave({ adapter: { profileOverride: { displayName, username: 'private-handle' } } });
    expect(container.querySelector('h2')?.textContent).toContain(expected);
    expect(container.innerHTML).not.toContain('private-handle');
  });
  it.each([[0, 1234, 0], [undefined, 300, 300], [50000, 0, 50000]])('uses canonical cultivation %s with legacy %s', async (dao_xp, qi, expected) => {
    await renderCave({ adapter: { profileOverride: { dao_xp, qi, heavenly_qi: 99 } } });
    expect(container.querySelector('[data-cave-progress]')?.getAttribute('aria-valuetext')).toMatch(new RegExp(`^${expected.toLocaleString()}`));
    expect(container.querySelector('[data-cave-rank], [data-cave-rank][data-element="none"]')?.textContent).toBe(getRankForQi(expected).name);
    expect((container.querySelector('[data-cave-progress]') as HTMLElement).style.getPropertyValue('--cave-rank-background')).toBeTruthy();
    if (expected === 50000) expect(text()).toContain('Maximum rank');
  });
  it('keeps explicitly unlocked zero reserves and excludes locked positive balances', async () => {
    await renderCave({ adapter: { unlockedSpecialQi: ['sect'], profileOverride: { sect_qi: 0, demonic_qi: 200 } } });
    await click(open('qi-reserves'));
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Sect Qi0');
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('Demonic Qi');
  });
  it('shows empty reserves and hides effects for a new cultivator', async () => {
    await renderCave({ state: 'new-cultivator' });
    expect(container.querySelector('[data-cave-card="status-effects"]')).toBeNull();
    await click(open('qi-reserves'));
    expect(text()).toContain('No special Qi reserves unlocked.');
  });
  it('expires effects while the panel is open and closes on navigation', async () => {
    const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
    await renderCave({ adapter: { profileOverride: { activeStatusEffects: [{ ...effect, expiresAt: new Date(Date.now() + 2000).toISOString(), effectDef: { ...effect.effectDef, sectQiMultiplier: 1.1 } }] } } });
    await click(open('status-effects'));
    expect(text()).toContain('+10% Sect Qi');
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(text()).toContain('No active effects.');
    expect(container.querySelector('[data-cave-card="status-effects"]')).toBeNull();
    await navigateTo('/home/status-effects');
    expect(text()).toContain('No status effects are active');
    await navigateTo('/stories');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('formats multipliers and actual remaining duration without inventing values', () => {
    const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
    const now = Date.now();
    expect(effectStatement({ ...effect, expiresAt: new Date(now + 7 * 86400000).toISOString(), effectDef: { ...effect.effectDef, qiMultiplier: undefined, sectQiMultiplier: 1.1 } }, now)).toBe('+10% Sect Qi · 7 days');
  });
  it('claims once across repeated taps and route changes, with rank progress updated', async () => {
    const result = await renderCave();
    await click(open('dao-pillar'));
    expect((open('dao-pillar') as HTMLButtonElement).disabled).toBe(true);
    await navigateTo('/home/dao-pillar');
    let repeat;
    await act(async () => { repeat = await result.controller().dailyClaim!.claim(); });
    expect(repeat).toMatchObject({ outcome: 'blocked' });
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    await navigateTo('/home');
    expect(text()).toContain('Collected Today');
    expect(container.querySelector('[data-cave-progress]')?.getAttribute('aria-valuetext')).toBe('13,485 Qi of 25,000');
    const pending = result.controller().dailyClaim!.claim();
    await act(async () => { await vi.advanceTimersByTimeAsync(650); await pending; });
    expect(result.controller().dailyClaim?.result?.outcome).toBe('already-collected');
    expect(result.controller().profile?.dao_xp).toBe(13485);
  });
  it.each(['failed', 'unresolved'] as const)('does not award Qi for a %s claim', async claimMode => {
    const result = await renderCave({ adapter: { claimMode } });
    await click(open('dao-pillar'));
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(result.controller().profile?.dao_xp).toBe(13480);
    expect(result.controller().dailyClaim?.result?.outcome).toBe(claimMode);
    expect((open('dao-pillar') as HTMLButtonElement).disabled).toBe(claimMode === 'unresolved');
  });
  it('preserves collected state without awarding again', async () => {
    await renderCave({ adapter: { profileOverride: { lastReadDate: new Date().toISOString().split('T')[0] } } });
    expect(open('dao-pillar').textContent).toContain('Collected Today');
    expect((open('dao-pillar') as HTMLButtonElement).disabled).toBe(true);
  });
  it.each([[2, 25], [9, 105], [0, 5]])('preserves streak %s milestone award of %s', async (streak, reward) => {
    const result = await renderCave({ adapter: { profileOverride: { daoPillarStreak: streak, lastReadDate: new Date(Date.now() - 86400000).toISOString().split('T')[0] } } });
    await click(open('dao-pillar'));
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(result.controller().profile?.dao_xp).toBe(13480 + reward);
    expect(result.controller().currentStreak).toBe(streak + 1);
  });
  it.each([10, 100])('repairs inline only with sufficient balance %s', async heavenly_qi => {
    const result = await renderCave({ adapter: { profileOverride: { daoPillarCracked: true, heavenly_qi } } });
    expect((open('dao-pillar') as HTMLButtonElement).disabled).toBe(true);
    await click(byText('button', 'Repair Pillar · 50 Qi'));
    expect(result.controller().isCracked).toBe(heavenly_qi < 50);
    expect(result.controller().profile?.heavenly_qi).toBe(heavenly_qi < 50 ? heavenly_qi : heavenly_qi - 50);
    expect(window.location.search).not.toContain('cave=');
  });
  it('announces a repair failure and leaves the Pillar cracked', async () => {
    const result = await renderCave({ state: 'owner-admin', adapter: { repairMode: 'failed' } });
    await click(byText('button', 'Repair Pillar · 50 Qi'));
    expect(text()).toContain('Repair failed. Please try again.');
    expect(result.controller().isCracked).toBe(true);
  });
});

describe('Profile timed effects', () => {
  it('schedules only meaningful effect boundaries and never creates a one-second interval', async () => {
    const now = Date.UTC(2026, 8, 10, 12, 0, 5);
    const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
    const activeEffect = {
      ...effect,
      appliedAt: new Date(now - 60_000).toISOString(),
      expiresAt: new Date(now + 10 * 60_000).toISOString(),
    };
    const futureEffect = {
      ...effect,
      appliedAt: new Date(now + 20_000).toISOString(),
      expiresAt: new Date(now + 40_000).toISOString(),
    };

    expect(nextEffectRefreshDelay([], now, true)).toBeNull();
    expect(nextEffectRefreshDelay([futureEffect], now)).toBe(20_000);
    expect(nextEffectRefreshDelay([activeEffect], now, true)).toBe(55_000);

    const interval = vi.spyOn(window, 'setInterval');
    await renderCave({ state: 'new-cultivator' });
    expect(interval).not.toHaveBeenCalled();
  });

  it('pauses effect refreshes while hidden and reschedules them when visible', async () => {
    const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');

    try {
      await renderCave({
        adapter: {
          profileOverride: {
            activeStatusEffects: [{
              ...effect,
              appliedAt: new Date(Date.now() - 60_000).toISOString(),
              expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
            }],
          },
        },
      });
      setTimeoutSpy.mockClear();
      clearTimeoutSpy.mockClear();

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(clearTimeoutSpy).toHaveBeenCalled();

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(setTimeoutSpy).toHaveBeenCalled();
    } finally {
      if (originalVisibility) {
        Object.defineProperty(document, 'visibilityState', originalVisibility);
      } else {
        delete (document as { visibilityState?: string }).visibilityState;
      }
    }
  });

  it('refreshes the Settings Aura preview at an effect boundary without minute polling', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
    const now = Date.now();
    const effectStart = now + 150_000;
    await renderCave({
      adapter: {
        profileOverride: {
          activeStatusEffects: [{
            ...effect,
            effectDef: { ...effect.effectDef, name: 'Ghostly Silence' },
            appliedAt: new Date(effectStart).toISOString(),
            expiresAt: new Date(now + 5 * 60_000).toISOString(),
          }],
        },
      },
    });
    setTimeoutSpy.mockClear();

    await click(byText('[data-cave-account-actions] button', 'Settings'));

    const preview = document.body.querySelector<HTMLElement>('[data-cave-aura-preview]')!;
    expect(preview.className).not.toContain('text-neutral-400');
    const expectedBoundaryDelay = effectStart - Date.now();
    const positiveDelays = setTimeoutSpy.mock.calls
      .map(([, delay]) => delay)
      .filter((delay): delay is number => typeof delay === 'number' && delay > 0);
    expect(positiveDelays).toEqual([expectedBoundaryDelay]);
    expect(positiveDelays[0]).toBeGreaterThan(60_000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(expectedBoundaryDelay + 1);
    });
    expect(preview.className).toContain('text-neutral-400');
  });

  it('does not install effect listeners when no time-sensitive effect is rendered', async () => {
    const addWindowListener = vi.spyOn(window, 'addEventListener');
    const addDocumentListener = vi.spyOn(document, 'addEventListener');

    await renderCave({ state: 'new-cultivator' });

    expect(addWindowListener.mock.calls.filter(([event]) => event === 'focus')).toHaveLength(0);
    expect(addDocumentListener.mock.calls.filter(([event]) => event === 'visibilitychange')).toHaveLength(0);
  });
});


describe('Claim reconciliation', () => {
  it('keeps uncertain claims blocked across navigation until the adapter reconciles', async () => {
    const result = await renderCave({ adapter: { claimMode: 'unresolved' } });
    await click(open('dao-pillar'));
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    await navigateTo('/stories');
    await navigateTo('/home');
    expect((open('dao-pillar') as HTMLButtonElement).disabled).toBe(true);
    await click(byText('button', 'Check collection status'));
    expect(result.controller().dailyClaim?.result?.outcome).toBe('failed');
    expect((open('dao-pillar') as HTMLButtonElement).disabled).toBe(false);
    expect(result.controller().profile?.dao_xp).toBe(13480);
  });
  it('protects the existing repair callback against same-turn duplicate charges', async () => {
    const result = await renderCave({ state: 'owner-admin' });
    const before = result.controller().profile!.heavenly_qi!;
    await act(async () => { result.controller().handleRepairPillar(); result.controller().handleRepairPillar(); });
    expect(result.controller().profile?.heavenly_qi).toBe(before - 50);
  });
});


describe('Claim and existing profile edits', () => {
  it('preserves the award and daily key when an overlapping profile save finishes', async () => {
    const result = await renderCave();
    await click(open('dao-pillar'));
    await act(async () => { result.controller().setFormData(previous => ({ ...previous, displayName: 'Updated Display Name' })); });
    let save: Promise<void> | void;
    await act(async () => { save = result.controller().handleSave(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(650); await save; });
    expect(result.controller().profile?.displayName).toBe('Updated Display Name');
    expect(result.controller().profile?.dao_xp).toBe(13485);
    expect(result.controller().profile?.lastReadDate).toBe(new Date().toISOString().split('T')[0]);
    expect((open('dao-pillar') as HTMLButtonElement).disabled).toBe(true);
  });
  it('updates the rank and bar together when collection crosses a threshold', async () => {
    await renderCave({ adapter: { profileOverride: { dao_xp: 99, qi: 99 } } });
    expect(container.querySelector('[data-cave-rank], [data-cave-rank][data-element="none"]')?.textContent).toBe(getRankForQi(99).name);
    await click(open('dao-pillar'));
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(container.querySelector('[data-cave-rank], [data-cave-rank][data-element="none"]')?.textContent).toBe(getRankForQi(104).name);
    expect((container.querySelector('[data-cave-progress]') as HTMLElement).style.getPropertyValue('--cave-rank-background')).toBe(rankBackground(getRankForQi(104).visual));
  });
});

describe('Public view of the Cave', () => {
  it('wraps unbroken public titles instead of widening a narrow Cave', async () => {
    const title = 'A'.repeat(320);
    await act(async () => {
      root.render(
        <UserProfilePublicPanel
          kind="stories"
          displayName={'Cultivator'.repeat(24)}
          titles={[title]}
        />,
      );
    });

    const panel = container.querySelector('[data-cave-public-panel="stories"]')!;
    const renderedTitle = panel.querySelector<HTMLElement>('[data-cave-public-title]')!;
    expect(renderedTitle.textContent).toBe(title);
    expect(panel.className).toContain('[overflow-wrap:anywhere]');
    expect(renderedTitle.className).toContain('[overflow-wrap:anywhere]');
  });

  const destinationLabels = async () => {
    await openSearch();
    const labels = Array.from(document.querySelectorAll('.workspace-search-results button')).map(button => (button.textContent ?? '').trim()).filter(label => ['Home', 'Stories', 'Relics', 'Exit'].includes(label));
    await closeSearch();
    return labels;
  };
  const enterPublicView = async () => {
    if (!container.querySelector('[data-cave-settings]')) {
      await searchCaveDestination('Home');
      await click(byText('[data-cave-account-actions] button', 'Settings'));
    }
    await click(byText('[data-slot="disclosure-trigger"]', 'Public Profile'));
    await click(byText('button', 'Preview Public View'));
  };
  const cave = () => new URLSearchParams(location.search).get('cave');

  it('keeps the identity and swaps only the private information areas', async () => {
    await renderCave();
    const profile = getPreviewScenario('developed-cultivator').profile!;

    // Private Home first: progress, reserves, effects, Pillar.
    expect(container.querySelector('[data-cave-home-mode]')?.getAttribute('data-cave-home-mode')).toBe('private');
    expect(container.querySelector('[data-cave-progress]')).not.toBeNull();

    await enterPublicView();
    expect(cave()).toBe('/public/home');
    expect(container.querySelector('[data-cave-home-mode]')?.getAttribute('data-cave-home-mode')).toBe('public');
    expect(container.querySelector('[data-cave-audience="public"]')).not.toBeNull();

    // The identity is untouched: same portrait, name, badge, rank.
    expect(container.querySelector('[data-cave-portrait] img')?.getAttribute('src')).toBe(profile.avatarUrl);
    expect(container.querySelector('#cave-cultivator-name')?.textContent).toContain(profile.displayName);
    expect(container.querySelector('[data-cave-identity-group] .cave-tier-badge')?.textContent).toBe('Inner Sect');
    expect(container.querySelector('[data-cave-rank]')?.textContent).toContain('Leader');

    // The four private areas are replaced, not hidden alongside their public twin.
    expect(container.querySelector('[data-cave-bio]')?.textContent).toContain('quiet hours');
    expect(container.querySelector('[data-cave-progress]')).not.toBeNull();
    expect(container.querySelector('[data-cave-qi]')).toBeNull();
    expect(container.querySelector('[data-cave-card="stats"]')).not.toBeNull();
    expect(container.querySelector('[data-cave-card="qi-reserves"]')).toBeNull();
    expect(container.querySelector('[data-cave-card="highlights"]')).not.toBeNull();
    expect(container.querySelector('[data-cave-card="status-effects"]')).toBeNull();
    expect(container.querySelector('[data-cave-card="boost"]')).not.toBeNull();
    expect(container.querySelector('[data-cave-card="dao-pillar"]')).toBeNull();

    // The private username never reaches either Home view.
    expect(text()).not.toContain(profile.username);
  });

  it('shows a Public View indicator and centres the name in both modes', async () => {
    await renderCave();
    expect(container.querySelector('.workspace-header-status')).toBeNull();
    expect(container.querySelector('.workspace-header-toolbar')).toBeNull();
    expect(container.textContent).not.toContain('View Public Profile');
    // The badge is never a sibling of the name inside the heading.
    expect(container.querySelector('#cave-cultivator-name .cave-tier-badge')).toBeNull();
    expect(container.querySelector('[data-cave-identity-group] .cave-tier-badge')).not.toBeNull();

    await enterPublicView();
    expect(container.querySelector('.workspace-header-context [role="status"]')?.textContent).toContain('Public View');
    expect(container.querySelector('#cave-cultivator-name .cave-tier-badge')).toBeNull();
    expect(container.querySelector('[data-cave-identity-group] .cave-tier-badge')).not.toBeNull();
  });

  it('keeps Cave destinations in Search and public Exit returns to the previous location', async () => {
    await renderCave();
    expect(await destinationLabels()).toEqual(['Home', 'Stories', 'Relics']);
    expect(Array.from(container.querySelectorAll('.library-global-navigation button')).map(button => button.textContent)).toEqual(['Home', 'Library', 'Discover', 'Profile']);

    await searchCaveDestination('Relics');
    expect(cave()).toBe('/relics');
    await enterPublicView();
    expect(await destinationLabels()).toEqual(['Home', 'Stories', 'Relics', 'Exit']);
    expect(container.querySelector('[data-cave-settings]')).toBeNull();

    await searchCaveDestination('Exit');
    expect(cave()).toBe('/settings');
    expect(container.querySelector('[data-cave-audience="private"]')).not.toBeNull();
  });

  it('exits a directly linked public view to the private Cave home', async () => {
    history.replaceState(null, '', '/?preview=user-profile&cave=/public/home');
    await renderCave();
    expect(container.querySelector('[data-cave-home-mode]')?.getAttribute('data-cave-home-mode')).toBe('public');
    await searchCaveDestination('Exit');
    expect(cave()).toBe('/home');
    expect(container.querySelector('[data-cave-card="dao-pillar"]')).not.toBeNull();
  });

  it('boosts and withdraws without touching cultivation', async () => {
    const { controller } = await renderCave();
    const before = controller().profile?.dao_xp;
    await enterPublicView();
    const boost = () => container.querySelector<HTMLButtonElement>('[data-cave-card="boost"]')!;
    expect(boost().getAttribute('aria-pressed')).toBe('false');
    expect(boost().textContent).toContain('0 Boosts');

    await click(boost());
    expect(boost().getAttribute('aria-pressed')).toBe('true');
    expect(boost().textContent).toContain('1 Boost');
    expect(boost().className).toContain('is-boosted');
    expect(container.querySelector('[data-cave-boost-status]')?.textContent).toContain('Your boost is showing.');

    await click(boost());
    expect(boost().getAttribute('aria-pressed')).toBe('false');
    expect(boost().textContent).toContain('0 Boosts');
    expect(controller().profile?.dao_xp).toBe(before);
  });

  it('opens Stats and Highlights from the same two-card composition', async () => {
    await renderCave();
    await enterPublicView();

    await click(container.querySelector('[data-cave-card="stats"]')!);
    const stats = document.body.querySelector('[role="dialog"]')!;
    expect(stats.textContent).toContain('Started');
    expect(stats.textContent).toContain('Reading streak');
    expect(stats.textContent).toContain('Reading time');
    await click(document.body.querySelector('[role="dialog"] button')!);

    await click(container.querySelector('[data-cave-card="highlights"]')!);
    const highlights = document.body.querySelector('[role="dialog"]')!;
    expect(highlights.querySelectorAll('[data-cave-highlight]').length).toBeGreaterThan(0);
    expect(highlights.querySelector('[data-cave-highlight="codex-image"]')).not.toBeNull();
    expect(highlights.querySelector('[data-cave-highlight="audio"]')).not.toBeNull();
    expect(highlights.querySelector('[data-cave-highlight="clip"]')).not.toBeNull();
    expect(highlights.querySelector('[data-cave-highlight="moment"]')).not.toBeNull();
  });

  it('scopes public Stories and Relics to the viewed profile without private content', async () => {
    await renderCave();
    await enterPublicView();

    await searchCaveDestination('Stories');
    expect(cave()).toBe('/public/stories');
    expect(container.querySelector('[data-cave-public-panel="stories"]')).not.toBeNull();
    expect(text()).toContain('Ashes of the Ninth Heaven');
    expect(text()).not.toContain('Abandoned Fragment');
    expect(text()).not.toContain('Story Seeds');
    expect(text()).not.toContain('Manifested Stories');

    await searchCaveDestination('Relics');
    expect(cave()).toBe('/public/relics');
    expect(container.querySelector('[data-cave-public-panel="relics"]')).not.toBeNull();
    expect(text()).toContain('Fragment of the First Sentence');
    expect(text()).not.toContain('Offering Hall');
    expect(text()).not.toContain('Attune');
  });

  it('never attributes another cultivator\'s stories to the viewed profile', async () => {
    // The owner account owns none of the mock stories; every one belongs to the
    // developed cultivator. A public page must be scoped to the profile it
    // renders, not to whatever story collection the host passed in.
    await renderCave({ state: 'owner-admin' });
    await enterPublicView();
    await searchCaveDestination('Stories');
    expect(container.querySelector('[data-cave-public-panel="stories"]')).not.toBeNull();
    expect(container.querySelector('[data-cave-public-title]')).toBeNull();
    expect(container.querySelector('[data-cave-public-empty]')?.textContent).toContain('not published any stories');
    expect(text()).not.toContain('Ashes of the Ninth Heaven');
    expect(text()).not.toContain('Saltwind Sovereign');

    // The owner's own relics, which are their profile's record, still publish.
    await searchCaveDestination('Relics');
    expect(text()).toContain('Fragment of the First Sentence');
  });

  it.each(['/public/settings', '/public/home/dao-pillar', '/public/settings/switchboard'])(
    'keeps %s out of the public view',
    async path => {
      history.replaceState(null, '', '/?preview=user-profile&cave=' + encodeURIComponent(path));
      await renderCave();
      expect(text()).toContain('Page unavailable');
      expect(container.querySelector('[data-cave-settings]')).toBeNull();
      expect(container.querySelector('[data-cave-card="dao-pillar"]')).toBeNull();
      await click(container.querySelector('[data-cave-destination="unavailable"] button')!);
      expect(cave()).toBe('/public/home');
    },
  );

  it('honours the visibility configuration across Home and the public pages', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('[data-slot="disclosure-trigger"]', 'Public Profile'));
    const switches = () =>
      Array.from(document.body.querySelectorAll<HTMLInputElement>('[data-cave-visibility] input'));
    expect(switches()).toHaveLength(5);
    for (const control of switches()) {
      if (control.checked) await click(control);
    }

    await click(byText('button', 'Preview Public View'));
    expect(cave()).toBe('/public/home');
    expect(container.querySelector('[data-cave-bio-section]')).toBeNull();
    expect(container.querySelector<HTMLButtonElement>('[data-cave-card="stats"]')!.disabled).toBe(true);
    expect(container.querySelector('[data-cave-card="stats"]')?.textContent).toContain('Kept private');
    expect(container.querySelector<HTMLButtonElement>('[data-cave-card="highlights"]')!.disabled).toBe(true);
    expect(container.querySelector('[data-cave-card="highlights"]')?.textContent).toContain('Kept private');
    expect(container.querySelector('[data-cave-card="stats"]')?.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('[data-cave-card="highlights"]')?.querySelectorAll('svg')).toHaveLength(1);

    await searchCaveDestination('Stories');
    expect(container.querySelector('[data-cave-public-empty]')?.textContent).toContain('private');
    expect(text()).not.toContain('Ashes of the Ninth Heaven');

    await searchCaveDestination('Relics');
    expect(container.querySelector('[data-cave-public-empty]')?.textContent).toContain('private');
    expect(text()).not.toContain('Fragment of the First Sentence');
  });
});

describe('Display name limit', () => {
  it('counts what a reader sees, not UTF-16 units', () => {
    expect(DISPLAY_NAME_MAX_VISIBLE).toBe(12);
    expect(countVisibleCharacters('')).toBe(0);
    expect(countVisibleCharacters('Cave Dweller')).toBe(12);
    expect(countVisibleCharacters('守心见道')).toBe(4);
    expect(countVisibleCharacters('🌊🌊🌊')).toBe(3);
    expect(isDisplayNameWithinLimit('Cave Dweller')).toBe(true);
    expect(isDisplayNameWithinLimit('Cave Dwellers')).toBe(false);
  });

  it('clamps without splitting a character', () => {
    expect(clampDisplayName('Cave Dweller')).toBe('Cave Dweller');
    expect(clampDisplayName('The Cave Dweller')).toBe('The Cave Dwe');
    expect(clampDisplayName('🌊'.repeat(20))).toBe('🌊'.repeat(12));
    expect(countVisibleCharacters(clampDisplayName('🌊'.repeat(20)))).toBe(12);
  });

  it('clamps the display name as it is typed and leaves the username alone', async () => {
    await renderCave();
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    const type = async (selector: string, value: string) => {
      const input = document.body.querySelector<HTMLInputElement>(selector)!;
      await act(async () => {
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      return input;
    };

    const name = await type('#cave-display-name', 'A Name Far Beyond The Limit');
    expect(name.value).toBe('A Name Far B');
    expect(document.body.querySelector('[data-cave-display-name-count]')?.textContent).toBe('12/12');

    const username = await type('#cave-username', 'a_very_long_private_dao_name_kept_whole');
    expect(username.value).toBe('a_very_long_private_dao_name_kept_whole');
  });

  it('blocks saving a longer name stored before the limit existed', async () => {
    await renderCave({ state: 'home-edge-cases' });
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    expect(text()).toContain('Display names are limited to 12 characters.');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    const type = async (selector: string, value: string) => {
      const input = document.body.querySelector<HTMLInputElement>(selector)!;
      await act(async () => {
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };

    // Dirty the form without touching the display name, so a disabled save
    // proves the cap rather than merely proving nothing was edited. Typing in
    // the name field would clamp it and remove the very state under test.
    await type('#cave-username', 'edge_case_dao_name');
    expect(text()).toContain('Display names are limited to 12 characters.');
    expect(byText<HTMLButtonElement>('button', 'Guard Changes').disabled).toBe(true);

    await type('#cave-display-name', 'Edge Reader');
    expect(text()).not.toContain('Display names are limited to 12 characters.');
    expect(byText<HTMLButtonElement>('button', 'Guard Changes').disabled).toBe(false);
  });
});


it('uses the SEN emblem as the Profile header home action', async () => {
  const onNavigateHome = vi.fn();
  await renderCave({ onNavigateHome });
  const header = container.querySelector('header')!;
  const emblem = header.querySelector('img[alt="SEN"]')!;
  expect(emblem.getAttribute('src')).toBe('/favicon.jpg');
  expect(header.querySelector('img[src="/icons/sacred-tree.svg"]')).toBeNull();
  const link = emblem.closest('a')!;
  expect(link.getAttribute('aria-label')).toBe('Return to Library');
  await act(async () => link.click());
  expect(onNavigateHome).toHaveBeenCalledTimes(1);
});


describe('LibraryElementalTitle profile integration', () => {
  it('uses semantic package titles for the Leader name and rank', async () => {
    await renderCave();
    const name = container.querySelector('[data-cave-name]')!;
    const rank = container.querySelector('[data-cave-rank]')!;
    expect(name.tagName).toBe('H2');
    expect(name.getAttribute('data-element')).toBe('fire');
    expect(name.getAttribute('tabindex')).toBe('-1');
    expect(rank.tagName).toBe('P');
    expect(rank.classList.contains('aura-gradient-text')).toBe(true);
    expect(rank.textContent).toBe('Leader');
    expect(container.querySelector('[aria-label="Subscription tier: Inner Sect"]')).not.toBeNull();
  });

  it('keeps the LibraryTierBadge beside the username and above progression', async () => {
    await renderCave();
    const row = container.querySelector('[data-cave-identity-group]')!;
    const badge = row.querySelector('[data-slot="library-tier-badge"]') as HTMLElement;
    expect(badge.classList.contains('cave-tier-badge')).toBe(true);
    expect(badge.previousElementSibling?.id).toBe('cave-cultivator-name');
    expect(row.querySelectorAll('[data-cave-name]')).toHaveLength(1);
    expect(badge.textContent).toBe('Inner Sect');
    expect(badge.getAttribute('aria-label')).toBe('Subscription tier: Inner Sect');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.getAttribute('role')).toBeNull();
    expect(badge.getAttribute('tabindex')).toBeNull();
    expect(row.querySelectorAll('[data-slot="library-tier-badge"]')).toHaveLength(1);
    // The rank treatment, name, and progress bar around it are untouched.
    expect(row.querySelector('[data-cave-rank]')).toBeNull();
    expect(container.querySelector('[data-cave-name]')?.textContent).toContain(getPreviewScenario('developed-cultivator').profile!.displayName);
    expect(container.querySelector('[data-cave-progress]')).not.toBeNull();
  });

  it.each([
    ['mortal', 'Mortal'],
    ['outer_sect', 'Outer Sect'],
    ['sect_master', 'Sect Master'],
    ['immortal', 'Immortal'],
  ] as const)('labels the %s tier from the profile as %s', async (premiumTier, label) => {
    await renderCave({ adapter: { profileOverride: { premiumTier } } });
    const badge = container.querySelector('[data-cave-identity-group] [data-slot="library-tier-badge"]')!;
    expect(badge.textContent).toBe(label);
    expect(badge.getAttribute('aria-label')).toBe(`Subscription tier: ${label}`);
  });

  it.each(['', '<img src=x onerror=alert(1)>', '讀者🌟'.repeat(80)])('safely renders dynamic name %s', async displayName => {
    await renderCave({ adapter: { profileOverride: { displayName } } });
    const name = container.querySelector('[data-cave-name]')!;
    expect(name.querySelector('.library-elemental-title__text')?.textContent).toBe(displayName || 'Cultivator');
    expect(name.querySelector('img')).toBeNull();
  });

  it('preserves a custom aura instead of replacing its color with fire', async () => {
    await renderCave({ adapter: { profileOverride: { displayNameColor: '#abcdef' } } });
    const name = container.querySelector('[data-cave-name]') as HTMLElement;
    expect(name.getAttribute('data-element')).not.toBe('fire');
    expect(name.style.color).toBe('rgb(171, 205, 239)');
  });
});


describe('elemental aura overrides', () => {
  it.each(['Ghostly Silence', 'Curse of the Cursed Tome'])('respects %s on the name and rank', async effectName => {
    const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
    await renderCave({ adapter: { profileOverride: { activeStatusEffects: [{
      ...effect, effectDef: { ...effect.effectDef, name: effectName },
      appliedAt: new Date(Date.now() - 1000).toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }] } } });
    expect(container.querySelector('[data-cave-name]')?.getAttribute('data-element')).toBe('none');
    expect(container.querySelector('[data-cave-rank]')?.classList.contains('aura-gradient-text')).toBe(true);
    expect(container.querySelector('[data-cave-name] .library-elemental-title__particles')).toBeNull();
  });
});


it('uses the supplied profile clock consistently at aura expiry', () => {
  const clock = Date.now() - 10_000;
  const effect = getPreviewScenario('developed-cultivator').profile!.activeStatusEffects![0];
  const effects = [{ ...effect, effectDef: { ...effect.effectDef, name: 'Ghostly Silence' },
    appliedAt: new Date(clock - 1000).toISOString(), expiresAt: new Date(clock + 1000).toISOString() }];
  expect(activeAuraOverride(effects, clock)).toBe('silenced');
  expect(getAuraTextStyle('rank:leader', effects, 12000, clock).className).toContain('text-neutral-400');
  expect(getAuraGlowStyle('rank:leader', effects, 12000, clock).className).toContain('shadow-none');
  expect(activeAuraOverride(effects, clock + 1000)).toBeNull();
  expect(getAuraTextStyle('rank:leader', effects, 12000, clock + 1000).className).not.toContain('text-neutral-400');
  expect(getAuraGlowStyle('rank:leader', effects, 12000, clock + 1000).className).not.toContain('shadow-none');
});

describe('identity rank progression and cultivator bio', () => {
  it.each(RANKS)('shows canonical endpoints and colors for $name', async rank => {
    await renderCave({ adapter: { profileOverride: { dao_xp: rank.unlockedAt, qi: 999999, sect_qi: 765432 } } });
    const current = container.querySelector<HTMLElement>('[data-cave-rank]')!;
    const next = RANKS[RANKS.indexOf(rank) + 1];
    expect(current.textContent).toBe(rank.name);
    expect(container.querySelector('[data-cave-next-rank]')?.textContent).toBe(next?.name ?? 'Maximum rank');
    const expected = getAuraTextStyle(`rank:${rank.id}`, [], rank.unlockedAt);
    expect(current.className).toBe(expected.className);
    const expectedPaint = document.createElement('p');
    Object.assign(expectedPaint.style, expected.style);
    expect(current.style.cssText).toBe(expectedPaint.style.cssText);
    if (next) {
      expectedPaint.style.cssText = '';
      Object.assign(expectedPaint.style, getAuraTextStyle(`rank:${next.id}`, [], next.unlockedAt).style);
      expect(container.querySelector<HTMLElement>('[data-cave-next-rank]')!.style.cssText).toBe(expectedPaint.style.cssText);
    }
    const identity = container.querySelector('[data-cave-identity]')!;
    expect(identity.textContent).not.toContain('Qi Reserves');
    expect(identity.textContent).not.toContain('765,432');
    expect(identity.querySelector('[data-cave-qi]')).toBeNull();
  });

  it('reveals exact cultivation in the existing dismissible dialog', async () => {
    await renderCave({ adapter: { profileOverride: { dao_xp: 13480, qi: 987654, sect_qi: 54321 } } });
    const trigger = container.querySelector<HTMLButtonElement>('.cave-progress-trigger')!;
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(document.querySelector('[data-cave-qi]')).toBeNull();
    await click(trigger);
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('13,480 / 25,000 Qi');
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('98');
    const close = byText('button', 'Close');
    expect(close).not.toBeNull();
    await click(close);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('uses the viewed creator bio instead of the signed-in creator', async () => {
    const creators = previewPublicCreators(getPreviewScenario('developed-cultivator').profile!);
    const other = creators.find(creator => creator.profile.uid !== 'workshop-cultivator')!;
    other.profile = { ...other.profile, dao_xp: 300 };
    await renderCave({ publicCreators: creators });
    await navigateTo(publicCavePath('home', other.profile.uid));
    expect(container.querySelector('[data-cave-bio]')?.textContent).toBe(developmentPublicRecord(other.profile, []).bio);
    expect(container.querySelector('[data-cave-bio]')?.textContent).toContain('Scribe of');
    expect(container.querySelector('[data-cave-bio]')?.textContent).not.toContain('Leader of');
  });

  it.each(['', '   '])('hides the whole section for an empty bio %j', async bio => {
    const result = await renderCave();
    const controller = result.controller();
    const presentation = buildPublicProfile({ ...developmentPublicRecord(controller.profile!, []), bio }, DEFAULT_PUBLIC_PROFILE_VISIBILITY);
    await act(async () => root.render(<UserProfileHome controller={controller} now={Date.now()} publicProfile={presentation} />));
    expect(container.querySelector('[data-cave-bio-section]')).toBeNull();
    expect(container.textContent).not.toContain('CULTIVATOR BIO');
  });

  it('offers the complete long bio only when the measured text overflows', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(48);
    await renderCave();
    const bio = container.querySelector('[data-cave-bio]')!.textContent!;
    expect(container.querySelector('.cave-bio-label')?.textContent).toBe('CULTIVATOR BIO');
    await click(byText('button', 'Read full bio'));
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(bio);
  });

  it('does not remove published Worlds when the Stories list is hidden', async () => {
    const creators = previewPublicCreators(getPreviewScenario('developed-cultivator').profile!);
    await renderCave({ publicCreators: creators });
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('[data-slot="disclosure-trigger"]', 'Public Profile'));
    const labels = Array.from(document.querySelectorAll('[data-cave-visibility] label'));
    const stories = labels.find(label => label.textContent?.includes('Stories'))!;
    await click(stories.querySelector('input')!);
    await navigateTo(publicCavePath('worlds', 'workshop-cultivator'));
    expect(container.querySelectorAll('[data-cave-world]')).toHaveLength(2);
  });
});

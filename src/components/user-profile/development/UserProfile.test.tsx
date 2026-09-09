// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserProfile from './UserProfile';
import ReferenceUserProfile from '../reference/UserProfile';
import { UserProfileServicesProvider } from '../shared/userProfileServices';
import type { UserProfileController } from '../shared/userProfileServices';
import type { MockUserProfileServicesOptions } from '../../../workshop/previews/user-profile/mockUserProfileServices';
import { effectStatement } from './UserProfileHome';
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
  getAuraSelection,
  getAuraTextStyle,
  getRankForQi,
  rankBackground,
  resolveRankVisual,
} from './qi';

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
  accountControls?: import('./caveAccountControls').CaveAccountControls;
  state?: UserProfilePreviewState;
  onLogout?: () => void;
  Component?: typeof UserProfile;
  adapter?: Partial<MockUserProfileServicesOptions>;
}

async function renderCave({ state = 'developed-cultivator', onLogout = vi.fn(), Component = UserProfile, adapter = {}, accountControls }: RenderOptions = {}) {
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
          onLogout={onLogout}
          onNavigateHome={vi.fn()}
        />
      </UserProfileServicesProvider>,
    );
  });
  // The mocked profile snapshot resolves on a 450 ms timer.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });
  return { logExcludedAction, onSignIn, controller: () => controller };
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

const open = (id: string) => id === 'stories' || id === 'relics' ? byText<HTMLElement>('nav button', id === 'stories' ? 'Stories' : 'Relics') : byText<HTMLElement>(`[data-cave-card="${id}"]`, '');
const navigateTo = async (path: string) => { await act(async () => { window.history.pushState(null, '', `?preview=user-profile&cave=${path}`); window.dispatchEvent(new PopStateEvent('popstate')); }); };

describe('Cultivator Cave home', () => {
  it('wires host Inbox, Store and Redeem Code while displaying separate account balances', async () => {
    const accountControls = { energyBalance: 1234, inboxUnreadCount: 3, onOpenInbox: vi.fn(), onOpenStore: vi.fn(), onRedeemCode: vi.fn() };
    await renderCave({ accountControls });
    expect(container.querySelector('[data-cave-energy]')?.textContent).toBe('Energy1,234');
    expect(container.querySelector('[data-cave-qi]')?.textContent).toBe('13,480 / 25,000 Qi');
    expect(container.querySelector('[data-cave-unread]')).not.toBeNull();
    await click(container.querySelector('[aria-label="Inbox, 3 unread messages"]')!);
    expect(accountControls.onOpenInbox).toHaveBeenCalledTimes(1);
    await click(byText('[data-cave-account-actions] button', 'Store'));
    expect(accountControls.onOpenStore).toHaveBeenCalledTimes(1);
    await click(byText('[data-cave-account-actions] button', 'Settings'));
    await click(byText('button', 'Account'));
    await click(byText('button', 'Redeem Code'));
    expect(accountControls.onRedeemCode).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.cave-workspace-dock')?.textContent).not.toContain('Settings');
  });

  it('shows zero Energy and no unread dot, and routes unconnected entries with working returns', async () => {
    await renderCave({ accountControls: { energyBalance: 0, inboxUnreadCount: 0 } });
    expect(container.querySelector('[data-cave-energy]')?.textContent).toBe('Energy0');
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
    expect(container.querySelector('[data-cave-energy]')?.textContent).toBe('EnergyUnavailable');
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
    expect(container.querySelector('[data-cave-qi]')?.textContent).toBe('13,480 / 25,000 Qi');
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
    expect(container.querySelector('[data-slot="library-header-badge-title"]')?.textContent).toBe('Cultivator Cave');
    // Below the desktop breakpoint the drawer is the only navigation mounted:
    // no rail, and so no second copy of the same destinations.
    expect(container.querySelectorAll('nav[aria-label="Cultivator Cave navigation"]')).toHaveLength(1);
    expect(container.querySelector('[data-slot="app-shell-sidebar"]')).toBeNull();
    expect(text()).not.toContain('Cultivate in silence. Ascend in the unseen.');
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
    await click(open('stories'));
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

    await click(container.querySelector('[aria-label="Return to cave"]')!);
    expect(container.querySelector('[data-cave-home]')).not.toBeNull();
  });

  it('opens Relics with inventory, attunement, and a working Offering Hall', async () => {
    await renderCave();
    await click(open('relics'));
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
    expect(container.querySelector('[data-cave-qi]')?.textContent).toBe('13,485 / 25,000 Qi');
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
    await click(byText('.cave-workspace-dock button', 'Home'));
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

  it('paints a solid rank as text colour and a gradient rank as clipped background', () => {
    const scribe = getAuraTextStyle('rank:scribe', undefined, 300);
    expect(scribe.style?.color).toBe('#2563EB');
    expect(scribe.className).not.toContain('aura-gradient-text');

    const sage = getAuraTextStyle('rank:sage', undefined, 25000);
    expect(sage.className).toContain('aura-gradient-text');
    expect(sage.style?.backgroundImage).toContain('#FFD700');

    const master = getAuraTextStyle('rank:master', undefined, 50000);
    expect(master.className).toContain('aura-spectrum-text');
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
      await click(byText('.cave-workspace-dock button', label));
      expect(new URLSearchParams(location.search).get('cave')).toBe('/' + label.toLowerCase());
      expect(document.activeElement?.tagName).toBe('H2');
      const selected = container.querySelectorAll('nav[aria-label="Cultivator Cave navigation"] [aria-current="page"]');
      expect(selected).toHaveLength(1);
      for (const item of selected) expect(item.textContent).toContain(label);
      const count = history.length;
      await click(byText('.cave-workspace-dock button', label));
      expect(history.length).toBe(count);
    }
  });

  it('loads a direct Settings link and retains host URL and history state', async () => {
    history.replaceState({ host: 'kept' }, '', '/?preview=user-profile&state=owner-admin&cave=/settings#host');
    await renderCave();
    expect(container.querySelector('[data-cave-settings]')).not.toBeNull();
    await click(byText('.cave-workspace-dock button', 'Stories'));
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
    expect(container.querySelector('.cave-workspace-dock [aria-current="page"]')?.textContent?.toLowerCase()).toContain(path.split('/')[1]);
    await click(container.querySelector('[data-cave-destination="unavailable"] button')!);
    expect(new URLSearchParams(location.search).get('cave')).toBe('/' + path.split('/')[1]);
  });

  it('keeps Home active for existing cultivation pages and denies unauthorized admin links', async () => {
    await renderCave();
    await click(open('dao-pillar'));
    expect(container.querySelector('.cave-workspace-dock [aria-current="page"]')?.textContent).toContain('Home');
    await act(async () => {
      history.replaceState(null, '', '/?cave=/settings/switchboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(text()).toContain('Authorization required');
    expect(container.querySelector('.cave-workspace-dock [aria-current="page"]')).toBeNull();
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
    expect(container.querySelector('[data-cave-qi]')?.textContent).toMatch(new RegExp(`^${expected.toLocaleString()}`));
    expect(container.querySelector('[data-cave-rank]')?.textContent).toBe(getRankForQi(expected).name);
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
    expect(container.querySelector('[data-cave-qi]')?.textContent).toBe('13,485 / 25,000 Qi');
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
    expect(container.querySelector('[data-cave-rank]')?.textContent).toBe(getRankForQi(99).name);
    await click(open('dao-pillar'));
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(container.querySelector('[data-cave-rank]')?.textContent).toBe(getRankForQi(104).name);
    expect((container.querySelector('[data-cave-progress]') as HTMLElement).style.getPropertyValue('--cave-rank-background')).toBe(rankBackground(getRankForQi(104).visual));
  });
});

describe('Public view of the Cave', () => {
  const dockLabels = () =>
    Array.from(container.querySelectorAll('.cave-workspace-dock button')).map(button =>
      (button.textContent ?? '').trim(),
    );
  const enterPublicView = async () => {
    await click(byText('.workspace-secondary-actions button', 'View Public Profile'));
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
    expect(container.querySelector('[data-cave-rank-row] .cave-tier-badge')?.textContent).toBe('Inner Sect');
    expect(container.querySelector('[data-cave-rank]')?.textContent).toContain('Leader');

    // The four private areas are replaced, not hidden alongside their public twin.
    expect(container.querySelector('[data-cave-bio]')?.textContent).toContain('quiet hours');
    expect(container.querySelector('[data-cave-progress]')).toBeNull();
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
    // The badge is never a sibling of the name inside the heading.
    expect(container.querySelector('#cave-cultivator-name .cave-tier-badge')).toBeNull();
    expect(container.querySelector('[data-cave-rank-row] .cave-tier-badge')).not.toBeNull();

    await enterPublicView();
    expect(container.querySelector('.workspace-header-status')?.textContent).toContain('Public View');
    expect(container.querySelector('#cave-cultivator-name .cave-tier-badge')).toBeNull();
    expect(container.querySelector('[data-cave-rank-row] .cave-tier-badge')).not.toBeNull();
  });

  it('replaces Settings with Exit and returns to the previous location', async () => {
    await renderCave();
    expect(dockLabels()).toEqual(['Home', 'Stories', 'Relics']);

    await click(byText('.cave-workspace-dock button', 'Relics'));
    expect(cave()).toBe('/relics');
    await enterPublicView();
    expect(dockLabels()).toEqual(['Home', 'Stories', 'Relics', 'Exit']);
    expect(container.querySelector('[data-cave-settings]')).toBeNull();

    await click(byText('.cave-workspace-dock button', 'Exit'));
    expect(cave()).toBe('/relics');
    expect(container.querySelector('[data-cave-audience="private"]')).not.toBeNull();
  });

  it('exits a directly linked public view to the private Cave home', async () => {
    history.replaceState(null, '', '/?preview=user-profile&cave=/public/home');
    await renderCave();
    expect(container.querySelector('[data-cave-home-mode]')?.getAttribute('data-cave-home-mode')).toBe('public');
    await click(byText('.cave-workspace-dock button', 'Exit'));
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

    await click(byText('.cave-workspace-dock button', 'Stories'));
    expect(cave()).toBe('/public/stories');
    expect(container.querySelector('[data-cave-public-panel="stories"]')).not.toBeNull();
    expect(text()).toContain('Ashes of the Ninth Heaven');
    expect(text()).not.toContain('Abandoned Fragment');
    expect(text()).not.toContain('Story Seeds');
    expect(text()).not.toContain('Manifested Stories');

    await click(byText('.cave-workspace-dock button', 'Relics'));
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
    await click(byText('.cave-workspace-dock button', 'Stories'));
    expect(container.querySelector('[data-cave-public-panel="stories"]')).not.toBeNull();
    expect(container.querySelector('[data-cave-public-title]')).toBeNull();
    expect(container.querySelector('[data-cave-public-empty]')?.textContent).toContain('not published any stories');
    expect(text()).not.toContain('Ashes of the Ninth Heaven');
    expect(text()).not.toContain('Saltwind Sovereign');

    // The owner's own relics, which are their profile's record, still publish.
    await click(byText('.cave-workspace-dock button', 'Relics'));
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
    expect(container.querySelector('[data-cave-bio]')?.textContent).toContain('keeps their bio private');
    expect(container.querySelector<HTMLButtonElement>('[data-cave-card="stats"]')!.disabled).toBe(true);
    expect(container.querySelector('[data-cave-card="stats"]')?.textContent).toContain('Kept private');
    expect(container.querySelector<HTMLButtonElement>('[data-cave-card="highlights"]')!.disabled).toBe(true);
    expect(container.querySelector('[data-cave-card="highlights"]')?.textContent).toContain('Kept private');

    await click(byText('.cave-workspace-dock button', 'Stories'));
    expect(container.querySelector('[data-cave-public-empty]')?.textContent).toContain('private');
    expect(text()).not.toContain('Ashes of the Ninth Heaven');

    await click(byText('.cave-workspace-dock button', 'Relics'));
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

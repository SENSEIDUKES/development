// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserProfile from './UserProfile';
import ReferenceUserProfile from '../reference/UserProfile';
import { UserProfileServicesProvider } from '../shared/userProfileServices';
import type { AppUser } from '../shared/types';
import { createMockUserProfileServices } from '../../../workshop/previews/user-profile/mockUserProfileServices';
import { getPreviewScenario } from '../../../workshop/previews/user-profile/previewData';
import type { UserProfilePreviewState } from '../../../workshop/previews/user-profile/previewStates';
import { CAVE_ENVIRONMENTS, getCultivationStage } from './caveEnvironment';
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

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      media,
      matches: false,
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
  state?: UserProfilePreviewState;
  onLogout?: () => void;
  Component?: typeof UserProfile;
}

async function renderCave({ state = 'developed-cultivator', onLogout = vi.fn(), Component = UserProfile }: RenderOptions = {}) {
  const scenario = getPreviewScenario(state);
  const logExcludedAction = vi.fn();
  const onSignIn = vi.fn<(account: AppUser) => void>();
  const services = createMockUserProfileServices({ state, logExcludedAction, onSignIn });
  await act(async () => {
    root.render(
      <UserProfileServicesProvider services={services}>
        <Component
          currentUser={scenario.currentUser}
          stories={scenario.stories}
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
  return { logExcludedAction, onSignIn };
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

const open = (id: string) => byText<HTMLElement>(`[data-cave-card="${id}"]`, '');

describe('Cultivator Cave home', () => {
  it('shows the portrait, identity, rank and stage, Qi, and the four destinations', async () => {
    await renderCave();
    const scenario = getPreviewScenario('developed-cultivator');
    const profile = scenario.profile!;

    expect(container.querySelector('h1')?.textContent).toBe('Cultivator Cave');
    expect(container.querySelector('[data-cave-backdrop]')?.getAttribute('src')).toBe(CAVE_ENVIRONMENTS[0].src);
    expect(container.querySelector('[data-cave-portrait] img')?.getAttribute('src')).toBe(profile.avatarUrl);
    expect(container.querySelector('#cave-cultivator-name')?.textContent).toContain(profile.displayName);
    expect(container.querySelector('[data-cave-rank]')?.textContent).toContain('Leader · Early Stage');
    expect(container.querySelector('[data-cave-qi]')?.textContent).toBe('13,480 / 25,000');
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('11');

    for (const id of ['stories', 'relics', 'dao-pillar', 'status-effects']) {
      expect(container.querySelector(`[data-cave-card="${id}"]`)).not.toBeNull();
    }
    expect(open('dao-pillar').textContent).toContain('12 Day Streak');
    expect(open('status-effects').textContent).toContain('Blessing of the Unwritten + Curse of the Half-Finished Arc');
    expect(container.querySelector('[data-cave-settings-trigger]')).not.toBeNull();
    expect(text()).toContain('Cultivate in silence. Ascend in the unseen.');
  });

  it('reveals a Qi core description when its chip is pressed', async () => {
    await renderCave();
    const sect = byText<HTMLButtonElement>('button', 'Sect Qi');
    expect(sect.textContent).toContain('620');
    await click(sect);
    expect(sect.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('#cave-qi-core-description')?.textContent).toContain('community contribution');
  });

  it('replaces the signed-out Cave with OAuth and links the mock account', async () => {
    const { onSignIn } = await renderCave({ state: 'signed-out' });
    expect(text()).not.toContain('Spirit Unlinked');
    expect(text()).not.toContain('Link Spirit Realm');
    expect(container.querySelector('[data-cave-settings-trigger]')).toBeNull();
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
    expect(text()).toContain('Reading your celestial record');

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
    expect(container.querySelector('[data-cave-card="stories"]')).not.toBeNull();
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
    await click(open('dao-pillar'));
    expect(container.querySelector('#cave-dao-pillar-streak')?.textContent).toBe('12 Days');
    await click(byText('button', 'Refine Daily Dao'));
    expect(container.querySelector('#cave-dao-pillar-streak')?.textContent).toBe('13 Days');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Refinement complete today');
    await click(container.querySelector('[aria-label="Return to cave"]')!);
    expect(open('dao-pillar').textContent).toContain('13 Day Streak');
    expect(container.querySelector('[data-cave-qi]')?.textContent).toBe('13,485 / 25,000');
  });

  it('offers repair when the pillar is cracked', async () => {
    await renderCave({ state: 'owner-admin' });
    await click(open('dao-pillar'));
    expect(container.querySelector('[data-cracked="true"]')).not.toBeNull();
    await click(byText('button', 'Repair Pillar (50 Qi)'));
    expect(container.querySelector('[data-cracked="true"]')).toBeNull();
    expect(byText('button', 'Refine Daily Dao')).toBeTruthy();
  });

  it('lists active status effects and shows an empty state for a new cultivator', async () => {
    await renderCave();
    await click(open('status-effects'));
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
    await click(open('status-effects'));
    expect(text()).toContain('No status effects are active');
  });
});

describe('Cultivator Cave settings', () => {
  it('opens one gear-triggered panel holding every setting section', async () => {
    const onLogout = vi.fn();
    await renderCave({ onLogout });
    await click(container.querySelector('[data-cave-settings-trigger]')!);
    const panel = () => document.body.querySelector('[data-cave-settings]');
    expect(panel()).not.toBeNull();
    const headings = Array.from(panel()!.querySelectorAll('[data-slot="disclosure-heading"]')).map(
      element => element.textContent,
    );
    expect(headings).toEqual([
      'Identity & Celestial Aura',
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
    await click(container.querySelector('[data-cave-settings-trigger]')!);
    const input = document.body.querySelector<HTMLInputElement>('#cave-display-name')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(input, 'The Cave Dweller');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(byText('button', 'Guard Changes'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(container.querySelector('#cave-cultivator-name')?.textContent).toContain('The Cave Dweller');
  });

  it('asks for confirmation on a language change and reverts on request', async () => {
    await renderCave();
    await click(container.querySelector('[data-cave-settings-trigger]')!);
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
    await click(container.querySelector('[data-cave-settings-trigger]')!);
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

  it('carries yellow through Author and Adept, and trophy gold through Leader and Sage', () => {
    const stopsFor = (id: string) => RANKS.find(rank => rank.id === id)!.visual.stops;
    const YELLOW = '#FFE02E';
    const TROPHY_GOLD = '#FFD700';

    // 5 is light blue → yellow, 6 is yellow → orange: one shared yellow endpoint.
    expect(stopsFor('author')[0]).toBe('#7DD3FC');
    expect(stopsFor('author').at(-1)).toBe(YELLOW);
    expect(stopsFor('adept')[0]).toBe(YELLOW);
    expect(stopsFor('adept').at(-1)).toBe('#F97316');

    // The trophy ranks use gold, never the yellow above.
    expect(stopsFor('leader').at(-1)).toBe(TROPHY_GOLD);
    expect(stopsFor('sage')[0]).toBe(TROPHY_GOLD);
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
    await click(container.querySelector('[data-cave-settings-trigger]')!);
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
    await click(container.querySelector('[data-cave-settings-trigger]')!);
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

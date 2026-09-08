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
    expect(container.querySelector('[data-cave-rank]')?.textContent).toContain('Sage of Branching Paths · Early Stage');
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
    expect(getCultivationStage(10, 'Dao Master')).toBe('Early Stage');
    expect(getCultivationStage(50, 'Dao Master')).toBe('Middle Stage');
    expect(getCultivationStage(80, 'Dao Master')).toBe('Late Stage');
    expect(getCultivationStage(100, null)).toBe('Peak');
  });
});

describe('locked reference replica', () => {
  it('still renders the original Celestial Tools page', async () => {
    await renderCave({ Component: ReferenceUserProfile });
    expect(text()).toContain('Celestial Tools');
    expect(text()).not.toContain('Cultivator Cave');
  });
});

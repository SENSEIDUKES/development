// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MysteryScrollView, OpenMysteryScrollResponse } from '../../../library/rewards/achievements';
import type { RewardGrant } from '../../../library/rewards/contracts';
import { MysteryScrollReveal } from './MysteryScrollReveal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // Reduced motion keeps the unseal instant, so each test waits only on the server answer.
  vi.stubGlobal('matchMedia', vi.fn((media: string) => ({ media, matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const GRANTS: RewardGrant[] = [{ type: 'dao-xp', amount: 75 }, { type: 'qi', amount: 250 }];

const scroll = (overrides: Partial<MysteryScrollView> = {}): MysteryScrollView => ({
  id: 'scroll-1', achievementKey: 'reading.ten-chapters', achievementName: 'Steady Lantern', category: 'reading',
  presentation: 'concealed', status: 'sealed', rarity: null, rewards: null, delivered: null,
  earnedAt: '2026-09-23T00:00:00.000Z', openedAt: null, ...overrides,
});

const opened = (base: MysteryScrollView): OpenMysteryScrollResponse => ({
  outcome: 'opened',
  message: 'Opened.',
  scroll: {
    ...base, status: 'opened', rarity: 'Rare', rewards: GRANTS, openedAt: '2026-09-23T00:01:00.000Z',
    delivered: GRANTS.map((grant, index) => ({ ...grant, transactionId: `tx-${index}`, balanceAfter: grant.amount })),
  },
  snapshot: { uid: 'reader', achievements: [], scrolls: [], delivery: 'on-open', creationDaoXp: { perActivity: {}, dailyCap: null }, updatedAt: '2026-09-23T00:01:00.000Z' },
});

const settle = async () => {
  for (let round = 0; round < 5; round += 1) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
};
const openButton = () => document.querySelector<HTMLButtonElement>('[data-reveal-action="unseal"]')!;

describe('MysteryScrollReveal', () => {
  it('lands the server answer under StrictMode, where React mounts the reveal twice in development', async () => {
    const onOpen = vi.fn(async (id: string) => opened(scroll({ id })));
    await act(async () => {
      root.render(<StrictMode><MysteryScrollReveal scroll={scroll()} onOpen={onOpen} onClose={vi.fn()} /></StrictMode>);
    });
    await act(async () => openButton().click());
    await settle();
    expect(onOpen).toHaveBeenCalledWith('scroll-1');
    const card = document.querySelector('[data-reward-card]');
    expect(card?.getAttribute('data-reward-rarity')).toBe('Rare');
    expect([...card!.querySelectorAll('[data-reward-grant]')].map(cell => cell.getAttribute('data-reward-grant'))).toEqual(['dao-xp', 'qi']);
    expect(card?.textContent).toContain('Added to your DAO XP and QI.');
  });

  it('keeps a concealed scroll’s contents hidden and a curated milestone’s reward visible before opening', async () => {
    await act(async () => {
      root.render(<MysteryScrollReveal scroll={scroll()} onOpen={vi.fn()} onClose={vi.fn()} />);
    });
    expect(document.querySelector('[data-mystery-scroll-concealed]')).not.toBeNull();
    expect(document.querySelector('[data-reward-grant]')).toBeNull();

    await act(async () => {
      root.render(<MysteryScrollReveal scroll={scroll({ id: 'scroll-2', presentation: 'curated', rarity: 'Legendary', rewards: GRANTS })} onOpen={vi.fn()} onClose={vi.fn()} />);
    });
    expect(document.querySelector('[data-mystery-scroll-curated]')).not.toBeNull();
    expect(document.querySelectorAll('[data-mystery-scroll-curated] [data-reward-grant]')).toHaveLength(2);
  });

  it('stays sealed after a failed open, says nothing was credited, and opens on retry', async () => {
    const onOpen = vi.fn()
      .mockRejectedValueOnce(new Error('The Library could not open this scroll. Nothing was credited.'))
      .mockImplementation(async (id: string) => opened(scroll({ id })));
    await act(async () => {
      root.render(<MysteryScrollReveal scroll={scroll()} onOpen={onOpen} onClose={vi.fn()} />);
    });
    await act(async () => openButton().click());
    await settle();
    expect(document.querySelector('[data-mystery-scroll-phase]')?.getAttribute('data-mystery-scroll-phase')).toBe('sealed');
    expect(document.querySelector('[role="alert"][data-mystery-scroll-status]')?.textContent).toContain('Nothing was credited');
    expect(document.querySelector('[data-reward-card]')).toBeNull();

    await act(async () => openButton().click());
    await settle();
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[data-reward-card]')).not.toBeNull();
  });
});

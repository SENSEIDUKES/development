// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENERGY_PRICE_CATALOG } from '@seihouse/library/energy';
import { EnergyClientProvider, createHttpEnergyClient, type EnergyClient } from '@seihouse/library/energy';
import { useEnergyAccount, type EnergyAccountState } from '@seihouse/library/energy';
import { ENERGY_ITEM_PRICES, ENERGY_PACKS, QI_ITEM_PRICES, QI_PACKS, QiAmount, type QiAccountState } from '@seihouse/library/cultivation';
import { createLocalEnergyClient } from '../../../workshop/previews/energy/localEnergyClient';
import { EnergyActionCost, EnergyBalanceIndicator, EnergyDeductionNotice, EnergyInsufficientState, EnergyPanel, energyDeductionToast } from '@seihouse/library/energy';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const render = async (node: React.ReactNode) => {
  await act(async () => { root.render(node); });
};

const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

let latest: EnergyAccountState | null = null;
function Harness({ client, enabled = true }: { client: EnergyClient | null; enabled?: boolean }) {
  latest = useEnergyAccount({ enabled, client });
  return <EnergyPanel account={latest} />;
}

describe('Energy client hook', () => {
  it('reads the server snapshot through the injected client and never a local number', async () => {
    const client = createLocalEnergyClient({ uid: 'reader' });
    await render(<Harness client={client} />);
    await flush();
    expect(latest?.status).toBe('ready');
    expect(latest?.snapshot?.available).toBe(500);
    expect(container.querySelector('[aria-label="Energy balance 500"]')).not.toBeNull();
  });

  it('is unavailable without a client and never fetches', async () => {
    await render(<Harness client={null} />);
    await flush();
    expect(latest?.status).toBe('unavailable');
    expect(container.textContent).toContain('Energy is not connected here');
  });

  it('routes development grant and reset through the client and replaces the snapshot with the server response', async () => {
    const client = createLocalEnergyClient({ uid: 'reader' });
    const grant = vi.spyOn(client, 'grantDevelopment');
    await render(<Harness client={client} />);
    await flush();
    const grantButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Grant 100 Energy'))!;
    await act(async () => { grantButton.click(); });
    await flush();
    expect(grant).toHaveBeenCalledWith({ amount: undefined, idempotencyKey: expect.any(String) });
    expect(latest?.snapshot?.available).toBe(600);
    expect(container.querySelector('[data-energy-activity-kind="grant"]')?.textContent).toContain('Development test grant');
    const resetButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Reset'))!;
    await act(async () => { resetButton.click(); });
    await flush();
    expect(latest?.snapshot?.available).toBe(500);
  });

  it('hides development controls when the server exposes none', async () => {
    await render(<Harness client={createLocalEnergyClient({ uid: 'prod', developmentAccess: false })} />);
    await flush();
    expect(latest?.snapshot).toMatchObject({ available: 0, developmentControls: null });
    expect(container.querySelector('[data-energy-development-controls]')).toBeNull();
    expect(container.textContent).toContain('No Energy activity yet.');
  });

  it('reports a failed read with a retry', async () => {
    const failing: EnergyClient = {
      getSnapshot: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(await createLocalEnergyClient({ uid: 'x' }).getSnapshot()),
      grantDevelopment: vi.fn(),
      resetDevelopment: vi.fn(),
    };
    await render(<Harness client={failing} />);
    await flush();
    expect(latest?.status).toBe('error');
    expect(container.textContent).toContain('offline');
    const retry = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Try again'))!;
    await act(async () => { retry.click(); });
    await flush();
    expect(latest?.status).toBe('ready');
  });

  it('sends the bearer token and the operation body over HTTP', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => new Response(JSON.stringify({ uid: 'u', balance: 1, held: 0, available: 1, prices: [], activity: [], developmentControls: null, updatedAt: 'now' }), { status: 200 }));
    const client = createHttpEnergyClient({ token: () => 'dev:u', fetch: fetchMock as unknown as typeof fetch });
    await client.grantDevelopment({ amount: 5, idempotencyKey: 'k' });
    expect(fetchMock).toHaveBeenCalledWith('/api/library-economy?capability=energy', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer dev:u' }),
      body: JSON.stringify({ operation: 'development.grant', amount: 5, idempotencyKey: 'k' }),
    }));
    const denied = createHttpEnergyClient({ token: () => 'dev:u', fetch: (async () => new Response(JSON.stringify({ error: 'nope', code: 'forbidden' }), { status: 403 })) as unknown as typeof fetch });
    await expect(denied.resetDevelopment()).rejects.toMatchObject({ status: 403, code: 'forbidden', message: 'nope' });
    await expect(createHttpEnergyClient({ token: () => null }).getSnapshot()).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('exposes the hook through the provider context', async () => {
    function Consumer() { latest = useEnergyAccount(); return <EnergyBalanceIndicator account={latest} />; }
    await render(<EnergyClientProvider client={createLocalEnergyClient({ uid: 'ctx' })}><Consumer /></EnergyClientProvider>);
    await flush();
    expect(container.querySelector('[aria-label="Energy balance 500"]')).not.toBeNull();
  });
});

describe('Reusable Energy pieces', () => {
  it('announces QI balance changes through one persistent status region', async () => {
    await render(<QiAmount amount={2_500} label="QI balance 2,500" />);
    const status = container.querySelector<HTMLElement>('[data-qi-status]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toBe('QI balance 2,500');
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('QI balance 2,500');

    await render(<QiAmount amount={2_600} label="QI balance 2,600" />);
    expect(container.querySelector('[data-qi-status]')).toBe(status);
    expect(status?.textContent).toBe('QI balance 2,600');
  });

  it('renders the configured action cost from the shared catalog', async () => {
    await render(<><EnergyActionCost actionId="chapter.generate" /><EnergyActionCost actionId="image.generate" /><EnergyActionCost actionId="narration.generate" /><EnergyActionCost price={7} /></>);
    const costs = Array.from(container.querySelectorAll('.energy-action-cost'));
    // The Energy mark is drawn artwork now, so only the number is text.
    expect(costs.map(cost => cost.textContent)).toEqual(['1', '3', '7']);
    expect(costs.every(cost => cost.querySelector('[data-sen-navigation-icon="energy"]'))).toBe(true);
    expect(costs[0].getAttribute('aria-label')).toBe('Costs 1 Energy (projected)');
    expect(ENERGY_PRICE_CATALOG.find(entry => entry.actionId === 'narration.generate')?.price).toBeNull();
  });

  it('renders the three balances and every current price-schedule entry without a checkout control', async () => {
    const client = createLocalEnergyClient({ uid: 'economy-reader' });
    const snapshot = await client.getSnapshot();
    const account: EnergyAccountState = {
      status: 'ready',
      snapshot,
      error: null,
      pending: false,
      refresh: vi.fn(),
      grantDevelopment: vi.fn(),
      resetDevelopment: vi.fn(),
    };
    const qi: QiAccountState = {
      status: 'ready',
      snapshot: { uid: 'economy-reader', balance: 2_150, transactions: [] },
      error: null,
    };

    await render(<EnergyPanel account={account} qi={qi} daoXp={13_480} />);

    expect(container.querySelector('[data-economy-balance="energy"] [aria-label="Energy balance 500"]')).not.toBeNull();
    expect(container.querySelector('[data-economy-balance="qi"] [aria-label="QI balance 2,150"]')).not.toBeNull();
    expect(container.querySelector('[data-economy-balance="dao-xp"]')?.textContent).toContain('Current rank: Leader');
    expect(container.querySelector('[data-economy-balance="dao-xp"] [role="progressbar"]')?.getAttribute('aria-valuetext'))
      .toBe('13,480 DAO XP of 25,000 toward Sage');
    expect(container.querySelector('[data-economy-section="energy"]')?.textContent).toContain('1 Energy = $0.02');
    expect(container.querySelector('[data-economy-section="energy"]')?.textContent).toContain('Energy price schedule');
    expect(container.textContent).not.toContain('$0.020');
    expect(container.querySelector('[data-economy-section="qi"]')?.textContent).toContain('1 QI = $0.002');
    expect(container.querySelector('[data-economy-section="qi"]')?.textContent).toContain('QI price schedule');

    expect(ENERGY_PACKS).toEqual([
      { amount: 250, priceUsd: 5 }, { amount: 500, priceUsd: 10 },
      { amount: 1_000, priceUsd: 20 }, { amount: 2_500, priceUsd: 50 },
    ]);
    expect(ENERGY_ITEM_PRICES).toEqual({ rare: 300, epic: 600, legendary: 1_000 });
    expect(QI_PACKS).toEqual([
      { amount: 2_500, priceUsd: 5 }, { amount: 5_000, priceUsd: 10 },
      { amount: 10_000, priceUsd: 20 }, { amount: 25_000, priceUsd: 50 },
    ]);
    expect(QI_ITEM_PRICES).toEqual({ common: 500, rare: 2_000, epic: 8_000, legendary: 25_000 });
    expect(container.querySelector('[data-energy-action="chapter.generate"]')?.textContent).toContain('Projected');
    expect(container.querySelector('[data-energy-action="video.generate"]')?.textContent).toContain('30–50 Energy');
    expect(container.textContent).toContain('No checkout is connected here');
    expect(container.textContent).toContain('No QI checkout is connected here');
    expect(container.querySelector('[data-economy-section="dao-xp"]')?.textContent).toContain('It alone sets the Cultivator Rank');
  });

  it('renders the balance indicator for loading, ready, unavailable and plain values', async () => {
    const base = { snapshot: null, error: null, pending: false, refresh: vi.fn(), grantDevelopment: vi.fn(), resetDevelopment: vi.fn() };
    await render(<>
      <EnergyBalanceIndicator account={{ ...base, status: 'loading' }} />
      <EnergyBalanceIndicator account={{ ...base, status: 'unavailable' }} />
      <EnergyBalanceIndicator account={{ available: 1234 }} size="md" />
    </>);
    expect(container.querySelector('[aria-label="Energy balance loading"]')).not.toBeNull();
    expect(container.querySelectorAll('.energy-amount')).toHaveLength(2);
    const indicator = container.querySelector('[aria-label="Energy balance 1,234"]')!;
    expect(indicator.textContent).toBe('1,234');
    expect(indicator.querySelector('[data-sen-navigation-icon="energy"]')).not.toBeNull();
  });

  it('describes a successful deduction and an insufficient balance without triggering them', async () => {
    const onOpenEnergy = vi.fn();
    await render(<>
      <EnergyDeductionNotice details={{ amount: 1, actionLabel: 'Chapter', available: 499 }} />
      <EnergyInsufficientState required={3} available={1} onOpenEnergy={onOpenEnergy} />
    </>);
    expect(container.querySelector('[data-energy-deduction]')?.textContent).toContain('1 Energy used for chapter');
    expect(container.querySelector('[data-energy-deduction]')?.textContent).toContain('499 Energy remaining.');
    expect(container.querySelector('[data-energy-insufficient]')?.textContent).toContain('This needs 3 Energy and you have 1.');
    await act(async () => { Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Open Energy')!.click(); });
    expect(onOpenEnergy).toHaveBeenCalledOnce();
    expect(energyDeductionToast({ amount: 3, actionLabel: 'Image', available: 10 })).toMatchObject({ tone: 'success', title: '3 Energy used for image', duration: 4000 });
  });
});

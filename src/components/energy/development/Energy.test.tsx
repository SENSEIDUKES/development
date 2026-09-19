// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENERGY_PRICE_CATALOG } from '@seihouse/library/energy';
import { EnergyClientProvider, createHttpEnergyClient, type EnergyClient } from '@seihouse/library/energy';
import { useEnergyAccount, type EnergyAccountState } from '@seihouse/library/energy';
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
  it('renders the configured action cost from the shared catalog', async () => {
    await render(<><EnergyActionCost actionId="chapter.generate" /><EnergyActionCost actionId="image.generate" /><EnergyActionCost actionId="narration.generate" /><EnergyActionCost price={7} /></>);
    const costs = Array.from(container.querySelectorAll('.energy-action-cost'));
    expect(costs.map(cost => cost.textContent)).toEqual(['⚡1', '⚡3', '⚡7']);
    expect(costs[0].getAttribute('aria-label')).toBe('Costs 1 Energy');
    expect(ENERGY_PRICE_CATALOG.find(entry => entry.actionId === 'narration.generate')?.price).toBeNull();
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
    expect(container.querySelector('[aria-label="Energy balance 1,234"]')?.textContent).toBe('⚡1,234');
  });

  it('describes a successful deduction and an insufficient balance without triggering them', async () => {
    const onOpenEnergy = vi.fn();
    await render(<>
      <EnergyDeductionNotice details={{ amount: 1, actionLabel: 'Chapter', available: 499 }} />
      <EnergyInsufficientState required={3} available={1} onOpenEnergy={onOpenEnergy} />
    </>);
    expect(container.querySelector('[data-energy-deduction]')?.textContent).toContain('⚡ 1 Energy used for chapter');
    expect(container.querySelector('[data-energy-deduction]')?.textContent).toContain('499 Energy remaining.');
    expect(container.querySelector('[data-energy-insufficient]')?.textContent).toContain('This needs ⚡ 3 and you have ⚡ 1.');
    await act(async () => { Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Open Energy')!.click(); });
    expect(onOpenEnergy).toHaveBeenCalledOnce();
    expect(energyDeductionToast({ amount: 3, actionLabel: 'Image', available: 10 })).toMatchObject({ tone: 'success', title: '⚡ 3 Energy used for image', duration: 4000 });
  });
});

// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeliveredReward } from '../shared/daoPillarContracts';
import { useDaoPillarCalendar, type UseDaoPillarCalendarOptions } from '../shared/useDaoPillarCalendar';
import { createLocalDaoPillarClient } from '../../../workshop/previews/dao-pillar/localDaoPillarClient';
import { DaoPillarView, describeToday } from './DaoPillarView';
import { daoPillarCardLabels } from '../../user-profile/development/UserProfileHome';
import { formatCycleRange } from './daoPillarFormat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
  document.body.innerHTML = '';
});

let latest: ReturnType<typeof useDaoPillarCalendar>;
function Harness(options: UseDaoPillarCalendarOptions) {
  latest = useDaoPillarCalendar(options);
  return <DaoPillarView calendar={latest} />;
}

const render = async (options: UseDaoPillarCalendarOptions) => {
  await act(async () => { root.render(<Harness {...options} />); });
  await act(async () => { await Promise.resolve(); });
};

const tiles = () => Array.from(container.querySelectorAll<HTMLButtonElement>('.dao-tile'));
const tile = (day: number) => container.querySelector<HTMLButtonElement>(`.dao-tile[data-day="${day}"]`)!;
const click = async (element: Element) => { await act(async () => { (element as HTMLElement).click(); }); };

describe('Dao Pillar view', () => {
  it('renders the active theme banner and thirty tiles with their server states', async () => {
    const client = createLocalDaoPillarClient({ uid: 'u1', collectedDays: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12] });
    await render({ client });
    expect(container.querySelector('.dao-banner-name')?.textContent).toBe('Beta Test');
    expect(container.querySelector('.dao-banner-tagline')?.textContent).toBe('30-Day Cultivation Trial');
    expect(container.querySelector('.dao-banner-art')?.getAttribute('src')).toBe('/dao-pillar/beta-test-banner.jpg');
    const snapshot = latest.snapshot!;
    expect(container.querySelector('.dao-banner-dates')?.textContent).toContain(formatCycleRange(snapshot.cycle.startsOn, snapshot.cycle.endsOn).split(' – ')[0]);
    expect(tiles()).toHaveLength(30);
    expect(tiles().map(element => element.dataset.state)).toEqual([
      'collected', 'collected', 'collected', 'collected', 'missed', 'collected', 'collected', 'collected', 'missed', 'collected', 'collected', 'collected',
      'available', ...Array(17).fill('locked'),
    ]);
    expect(tile(7).dataset.milestone).toBe('true');
    expect(tile(7).textContent).toContain('1,000 Qi');
    expect(tile(13).textContent).toContain('100 Qi');
    expect(tile(13).textContent).toContain('Collect');
    expect(tile(14).disabled).toBe(true);
    expect(tile(5).disabled).toBe(true);
    expect(container.querySelector('[data-dao-today-line]')?.textContent).toBe('Day 13 • Available today');
    expect(container.querySelector('.dao-streak')?.textContent).toContain('3 day streak');
  });

  it('collects today once, updates the tile, streak and footer, and reports the deposit to the host', async () => {
    const client = createLocalDaoPillarClient({ uid: 'u1', collectedDays: [12] });
    const delivered: DeliveredReward[][] = [];
    await render({ client, onRewardDelivered: entries => delivered.push(entries) });
    expect(tile(13).dataset.state).toBe('available');
    // Rapid taps: the hook's lock lets one request through; the server would replay anyway.
    await act(async () => { tile(13).click(); tile(13).click(); tile(13).click(); });
    await act(async () => { await Promise.resolve(); });
    expect(tile(13).dataset.state).toBe('collected');
    expect(tile(13).disabled).toBe(false);
    expect(container.querySelectorAll('.dao-tile[data-state="available"]')).toHaveLength(0);
    expect(delivered).toEqual([[{ type: 'qi', amount: 100, transactionId: expect.any(String), balanceAfter: 200 }]]);
    expect(container.querySelector('[data-dao-live]')?.textContent).toBe('Day 13 collected: +100 Qi.');
    expect(container.querySelector('[data-dao-today-line]')?.textContent).toBe('Day 13 • Collected today · +100 Qi');
    expect(container.querySelector('.dao-streak')?.textContent).toContain('2 day streak');
    expect(await client.repository.getQiBalance('u1')).toBe(200);
    // A second claim after the first settled is a replay, never a second deposit.
    await act(async () => { await latest.claim(); });
    expect(delivered).toHaveLength(1);
    expect(latest.lastClaim?.outcome).toBe('already-collected');
    expect(await client.repository.getQiBalance('u1')).toBe(200);
  });

  it('shows the reward and exact collection time when a collected tile is tapped', async () => {
    const client = createLocalDaoPillarClient({ uid: 'u1', collectedDays: [7], todayIsDay: 9 });
    await render({ client });
    await click(tile(7));
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Day 7 collected');
    expect(dialog?.textContent).toContain('1,000 Qi · Milestone');
    const claimedAt = latest.snapshot!.tiles[6].claimedAt!;
    expect(dialog?.querySelector('time')?.getAttribute('datetime')).toBe(claimedAt);
    expect(dialog?.textContent).toContain(new Date(claimedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }));
  });

  it('keeps the tile open and nothing deposited when the server refuses the claim', async () => {
    const client = createLocalDaoPillarClient({ uid: 'u1', mode: 'claim-failed' });
    const delivered: DeliveredReward[][] = [];
    await render({ client, onRewardDelivered: entries => delivered.push(entries) });
    await click(tile(13));
    await act(async () => { await Promise.resolve(); });
    expect(tile(13).dataset.state).toBe('available');
    expect(container.querySelector('[data-dao-live]')?.textContent).toBe('The Dao Pillar is unavailable right now. Please try again shortly.');
    expect(delivered).toEqual([]);
    expect(await client.repository.getQiBalance('u1')).toBe(0);
  });

  it('re-reads server truth when the claim answer is lost, showing the day collected once', async () => {
    const client = createLocalDaoPillarClient({ uid: 'u1', mode: 'claim-unresolved' });
    const delivered: DeliveredReward[][] = [];
    await render({ client, onRewardDelivered: entries => delivered.push(entries) });
    await click(tile(13));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(tile(13).dataset.state).toBe('collected');
    expect(container.querySelectorAll('.dao-tile[data-state="collected"]')).toHaveLength(1);
    expect(await client.repository.getQiBalance('u1')).toBe(100);
    // The deposit happened on the server but this surface never saw the receipt; the host reconciles on its next profile read.
    expect(delivered).toEqual([]);
  });

  it('describes the cycle boundaries and shows loading, error and unavailable states', async () => {
    const before = createLocalDaoPillarClient({ uid: 'u1', phase: 'before' });
    await render({ client: before });
    expect(tiles().every(element => element.dataset.state === 'locked')).toBe(true);
    expect(describeToday(latest.snapshot!)).toMatch(/^Beta Test begins /);
    const after = createLocalDaoPillarClient({ uid: 'u1', phase: 'after', collectedDays: [30] });
    await render({ client: after });
    expect(tile(30).dataset.state).toBe('collected');
    expect(tile(29).dataset.state).toBe('missed');
    expect(describeToday(latest.snapshot!)).toMatch(/^Beta Test ended /);

    await render({ client: createLocalDaoPillarClient({ uid: 'u1', mode: 'offline' }) });
    expect(container.textContent).toContain('The Dao Pillar could not be opened');
    expect(daoPillarCardLabels(latest)).toEqual({ streakLabel: 'Streak unavailable', daoPillarLabel: 'Calendar unavailable · open to retry' });

    await render({ client: null });
    expect(container.textContent).toContain('The Dao Pillar is not connected here');
    expect(daoPillarCardLabels(latest)).toEqual({ streakLabel: 'Streak unavailable', daoPillarLabel: 'Dao Pillar not connected' });
  });

  it('labels the profile card from the same snapshot', async () => {
    await render({ client: createLocalDaoPillarClient({ uid: 'u1', collectedDays: [11, 12] }) });
    expect(daoPillarCardLabels(latest)).toEqual({ streakLabel: '2 Day Streak', daoPillarLabel: 'Day 13 · 100 Qi ready to collect' });
    await act(async () => { await latest.claim(); });
    expect(daoPillarCardLabels(latest)).toEqual({ streakLabel: '3 Day Streak', daoPillarLabel: 'Collected today · +100 Qi' });
    await render({ client: createLocalDaoPillarClient({ uid: 'u2', todayIsDay: 14 }) });
    expect(daoPillarCardLabels(latest).daoPillarLabel).toBe('Day 14 · 1,000 Qi ready to collect');
  });
});

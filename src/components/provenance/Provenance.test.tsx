// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProvenanceBadge } from './development/ProvenanceBadge';
import { ProvenanceDetails } from './development/ProvenanceDetails';
import { createProvenanceRecord } from './shared/createProvenanceRecord';
import type { ProvenanceRecord } from './shared/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const completeRecord: ProvenanceRecord = {
  provenanceId: 'prov_test_001',
  contentType: 'cover',
  userId: 'user_test_01',
  assetId: 'asset_test_01',
  contentHash: 'mock-only:fingerprint',
  parentAssetId: 'story_test_01',
  generator: 'SEIHouse Image Generation',
  model: 'Image model mock',
  generatedAt: '2026-09-11T12:00:00.000Z',
  recordedAt: '2026-09-11T12:00:05.000Z',
  status: 'recorded',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
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
    })),
  });
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('createProvenanceRecord', () => {
  it('preserves supplied future evidence while keeping recordedAt distinct from generatedAt', () => {
    expect(createProvenanceRecord(completeRecord)).toEqual(completeRecord);
  });

  it('creates only local defaults for the required record fields', () => {
    const record = createProvenanceRecord({ contentType: 'other' });
    expect(record.provenanceId).toMatch(/^prov_/);
    expect(Number.isNaN(Date.parse(record.recordedAt))).toBe(false);
    expect(record.status).toBe('recorded');
    expect(record.generatedAt).toBeUndefined();
    expect(record.parentAssetId).toBeUndefined();
  });
});

describe('ProvenanceDetails', () => {
  it('makes the SEIHouse recording claim primary and presents all available evidence', () => {
    act(() => root.render(<ProvenanceDetails record={completeRecord} />));
    expect(container.textContent).toContain('SEIHouse recorded this asset for this user at this time.');
    const times = container.querySelectorAll('time');
    expect(times).toHaveLength(2);
    expect(times[0].getAttribute('datetime')).toBe(completeRecord.recordedAt);
    expect(times[1].getAttribute('datetime')).toBe(completeRecord.generatedAt);
    for (const value of [completeRecord.provenanceId, completeRecord.userId, completeRecord.assetId, completeRecord.contentHash, completeRecord.parentAssetId]) {
      expect(container.textContent).toContain(value);
    }
    expect(container.textContent).toContain('Cryptographic verification is not connected.');
  });

  it('does not imply an exact generation time or user relationship when neither is known', () => {
    const record = createProvenanceRecord({
      contentType: 'video',
      provenanceId: 'prov_video_unknown',
      recordedAt: '2026-09-11T13:00:00.000Z',
    });
    act(() => root.render(<ProvenanceDetails record={record} />));
    expect(container.textContent).toContain('No user record is attached');
    expect([...container.querySelectorAll('dt')].map(term => term.textContent)).not.toContain('Generated');
    expect(container.querySelectorAll('time')).toHaveLength(1);
    expect(container.textContent?.match(/Not provided/g)?.length).toBeGreaterThanOrEqual(6);
  });
});

describe('ProvenanceBadge', () => {
  it('opens its compact details view from the accessible provenance trigger', async () => {
    await act(async () => root.render(<ProvenanceBadge record={completeRecord} />));
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="View SEIHouse provenance for this cover"]');
    expect(trigger).not.toBeNull();
    expect(document.body.textContent).not.toContain('Generated through SEIHouse');

    await act(async () => trigger!.click());

    expect(document.body.textContent).toContain('Generated through SEIHouse');
    expect(document.body.textContent).toContain(completeRecord.provenanceId);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.body.textContent).not.toContain('Generated through SEIHouse');
  });
});

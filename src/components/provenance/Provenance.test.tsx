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
  assetId: 'asset_test_01',
  versionId: 'version_test_02',
  actor: 'ai',
  action: 'generated',
  userId: 'user_test_01',
  contentHash: 'mock-only:fingerprint',
  parentVersions: [{ assetId: 'story_test_01', versionId: 'story_version_03' }],
  generator: 'SEIHouse Image Generation',
  model: 'Image model mock',
  generatedAt: '2026-09-11T12:00:00.000Z',
  recordedAt: '2026-09-11T12:00:05.000Z',
  status: 'mock',
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
  it('preserves version lineage and event details while always marking the local record as a mock', () => {
    const { status: _status, ...input } = completeRecord;
    expect(createProvenanceRecord(input)).toEqual(completeRecord);
  });

  it('creates local defaults without a parent and requires an asset version and actor/action', () => {
    const record = createProvenanceRecord({
      contentType: 'other',
      assetId: 'asset_other_01',
      versionId: 'version_01',
      actor: 'import',
      action: 'uploaded',
    });
    expect(record.provenanceId).toMatch(/^prov_/);
    expect(Number.isNaN(Date.parse(record.recordedAt))).toBe(false);
    expect(record.status).toBe('mock');
    expect(record.generatedAt).toBeUndefined();
    expect(record.parentVersions).toBeUndefined();
  });

  it('copies and freezes parent version references so an old record cannot be mutated indirectly', () => {
    const parentVersions = [{ assetId: 'asset_parent', versionId: 'v1' }];
    const record = createProvenanceRecord({
      contentType: 'chapter',
      assetId: 'asset_child',
      versionId: 'v2',
      actor: 'user',
      action: 'edited',
      parentVersions,
    });

    parentVersions[0].versionId = 'v2';
    expect(record.parentVersions?.[0].versionId).toBe('v1');
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.parentVersions)).toBe(true);
  });

  it('ignores a runtime attempt to override the development mock status', () => {
    const untrustedInput = {
      contentType: 'image',
      assetId: 'asset_fake_01',
      versionId: 'version_fake_01',
      actor: 'ai',
      action: 'generated',
      status: 'verified',
    } as unknown as Parameters<typeof createProvenanceRecord>[0];

    expect(createProvenanceRecord(untrustedInput).status).toBe('mock');
  });
});

describe('ProvenanceDetails', () => {
  it('treats record data as a development sample by default and hides internal evidence IDs', () => {
    act(() => root.render(<ProvenanceDetails record={completeRecord} />));
    expect(container.textContent).toContain('ⓈSEIHouse Provenance');
    expect(container.textContent).toContain('Development sample only. This mock does not assert a SEIHouse recording.');
    expect(container.textContent).toContain('Development mock');
    expect(container.textContent).not.toContain('user_test_01');
    expect(container.textContent).not.toContain('asset_test_01');
    expect(container.textContent).not.toContain('mock-only:fingerprint');
    expect(container.textContent).not.toContain('story_test_01');
    expect(container.textContent).not.toContain('Not provided');
    const times = container.querySelectorAll('time');
    expect(times).toHaveLength(2);
    expect(times[0].getAttribute('datetime')).toBe(completeRecord.recordedAt);
    expect(times[1].getAttribute('datetime')).toBe(completeRecord.generatedAt);
    expect(container.textContent).toContain(completeRecord.provenanceId);
    expect(container.textContent).toContain('SEIHouse Image Generation');
    expect(container.textContent).toContain('Image model mock');
    expect(container.textContent).toContain('No authoritative recording or verification is connected.');
  });

  it('does not let arbitrary recorded or verified status fields imply authority', () => {
    const untrustedRecord = { ...completeRecord, status: 'verified' } as const;
    act(() => root.render(<ProvenanceDetails record={untrustedRecord} />));
    expect(container.textContent).toContain('Development mock');
    expect(container.textContent).not.toContain('Verified');
    expect(container.textContent).not.toContain('SEIHouse recorded this asset');

    const forgedRecordedRecord = { ...completeRecord, status: 'recorded' } as const;
    act(() => root.render(<ProvenanceDetails record={forgedRecordedRecord} />));
    expect(container.textContent).toContain('Development mock');
    expect(container.textContent).not.toContain('SEIHouse recorded this asset');
  });

  it('keeps optional generation time and generator rows absent', () => {
    const record = createProvenanceRecord({
      contentType: 'video',
      assetId: 'video_mock_unknown',
      versionId: 'v1',
      actor: 'ai',
      action: 'generated',
      provenanceId: 'prov_video_unknown',
      recordedAt: '2026-09-11T13:00:00.000Z',
    });
    act(() => root.render(<ProvenanceDetails record={record} />));
    expect(container.textContent).toContain('ⓈSEIHouse Provenance');
    expect(container.textContent).toContain('Development sample only.');
    const labels = [...container.querySelectorAll('dt')].map(term => term.textContent);
    expect(labels).not.toContain('Generated');
    expect(labels).not.toContain('Generator');
    expect(labels).not.toContain('Model');
    expect(container.querySelectorAll('time')).toHaveLength(1);
  });

  it('does not trust a serialized record status after it has lost its local mock marker', () => {
    const serialized = JSON.parse(JSON.stringify({ ...completeRecord, status: 'verified' })) as ProvenanceRecord;
    act(() => root.render(<ProvenanceDetails record={serialized} />));
    expect(container.textContent).toContain('Development mock');
    expect(container.textContent).not.toContain('Verified');
    expect(container.textContent).not.toContain('SEIHouse recorded this asset');
  });
});

describe('ProvenanceBadge', () => {
  it('opens its compact details view from the accessible provenance trigger', async () => {
    const mockRecord = createProvenanceRecord({
      contentType: 'cover',
      assetId: 'cover_mock',
      versionId: 'cover_v1',
      actor: 'ai',
      action: 'generated',
    });
    await act(async () => root.render(<ProvenanceBadge record={mockRecord} />));
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="View development provenance sample for this cover"]');
    expect(trigger).not.toBeNull();
    expect(document.body.textContent).not.toContain('SEIHouse Provenance');

    await act(async () => trigger!.click());

    expect(document.body.textContent).toContain('SEIHouse Provenance');
    expect(document.body.textContent).toContain('Development mock');
    expect(document.body.textContent).toContain(mockRecord.provenanceId);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.body.textContent).not.toContain('SEIHouse Provenance');
  });
});

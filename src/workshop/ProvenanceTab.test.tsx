// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProvenanceTab } from './ProvenanceTab';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  act(() => root.render(<ProvenanceTab />));
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('ProvenanceTab', () => {
  it('shows representative generated assets with interactive provenance marks', () => {
    expect(container.querySelectorAll('.provenance-example')).toHaveLength(6);
    expect(container.querySelectorAll('.provenance-example .provenance-badge')).toHaveLength(6);
    expect(container.querySelector('[aria-label="Supported provenance content types"]')?.textContent)
      .toContain('Other generated assets');
  });

  it('shows the complete intended flow in order and labels verification as future', () => {
    const steps = [...container.querySelectorAll('.provenance-flow li strong')]
      .map(element => element.textContent);
    expect(steps).toEqual([
      'AI Generation',
      'Provenance Record',
      'Ⓢ Badge',
      'Provenance Details',
      'Future Backend Verification',
    ]);
    expect(container.querySelector('.provenance-flow-future')?.textContent).toContain('Future · Not connected');
  });

  it('keeps every future evidence relationship visibly non-functional', () => {
    const evidence = [...container.querySelectorAll('.provenance-evidence li')]
      .map(item => item.textContent);
    expect(evidence).toEqual([
      'User recordFuture',
      'Asset recordFuture',
      'Content fingerprintFuture · Not connected',
      'Parent lineageFuture · Not connected',
    ]);
    expect(container.textContent).toContain('No Firestore, Postgres, R2, APIs, hashing');
  });
});

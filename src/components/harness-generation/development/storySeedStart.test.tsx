// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../shared/repository';
import type { HarnessGenerationModelAdapter, HarnessStorySeedSource } from '../shared/types';
import { HarnessGenerationWorkspace } from './HarnessGenerationWorkspace';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const modelAdapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({
    provider: 'gemini',
    configured: true,
    models: [{ id: 'gemini-test', label: 'Gemini test' }],
    defaultModel: 'gemini-test',
  }),
  generate: vi.fn(async () => {
    throw new Error('Generation is not used by this test.');
  }),
};

const storySeedSource: HarnessStorySeedSource = {
  manageHref: '?preview=story-seed',
  list: async () => [{
    id: 'seed-1',
    title: 'The Drowned Archive',
    updatedAt: '2026-09-03T12:00:00.000Z',
    hasBlueprint: true,
    foundation: {
      title: 'The Drowned Archive',
      premise: 'An archivist returns to a city that erased her name.',
      sourceSnapshot: {
        kind: 'story-seed',
        sourceId: 'seed-1',
        sourceUpdatedAt: '2026-09-03T12:00:00.000Z',
        schemaVersion: 3,
        seed: { story: { required: { premise: 'An archivist returns to a city that erased her name.' } } },
      },
    },
  }],
};

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
});

describe('Harness Story Seed entry', () => {
  it('starts with saved Story Seeds and freezes the selection before generation', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    await act(async () => {
      root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} storySeedSource={storySeedSource} />);
    });

    expect(container.textContent).toContain('Choose a Story Seed');
    expect(container.textContent).toContain('The Drowned Archive');
    expect(container.textContent).not.toContain('Create Harness Story');

    const start = [...container.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Start with Harness'));
    expect(start).toBeTruthy();
    await act(async () => start!.click());

    expect(container.textContent).toContain('Generate Chapter 1');
    expect(container.textContent).toContain('Foundation snapshot and revisions');
    const foundation = repository.snapshot().foundations[0];
    expect(foundation.input.sourceSnapshot?.sourceId).toBe('seed-1');
    expect(foundation.input.premise).toContain('archivist');
  });
});

// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../shared/repository';
import type { HarnessGenerationModelAdapter, HarnessSkillManifest, HarnessStorySeedSource } from '../shared/types';
import { HarnessGenerationWorkspace } from './HarnessGenerationWorkspace';
import { HarnessGenerationController } from '../shared/controller';

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

const installedSkills: HarnessSkillManifest[] = [{
  id: 'seihouse.long-range-pacing', version: '1.0.0', name: 'Long-Range Pacing',
  description: 'Spaces major story events across chapters.', slot: 'pacing', applications: ['generation'],
  instructions: 'Earn major events across several chapters.',
}];

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
  it('clears an unsaved steering draft before another story can receive it', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = new HarnessGenerationController({ repository, modelAdapter });
    await controller.hydrate();
    await controller.createStory({ title: 'Story A', premise: 'A courier crosses the sea.' });
    await controller.createStory({ title: 'Story B', premise: 'A healer crosses the mountains.' });
    await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} />));
    const select = (title: string) => [...container.querySelectorAll('button')].find(button => button.textContent?.includes(`${title}Next:`))!;
    await act(async () => select('Story A').click());
    const draft = container.querySelector<HTMLTextAreaElement>('#harness-direction')!;
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(draft, 'Make the enemy an ally.');
      draft.dispatchEvent(new Event('input', { bubbles: true }));
      checkbox.click();
    });
    expect(draft.value).toBe('Make the enemy an ally.');
    expect(checkbox.checked).toBe(true);
    await act(async () => select('Story B').click());
    expect(draft.value).toBe('');
    expect(checkbox.checked).toBe(false);
    expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Save direction')?.disabled).toBe(true);
    expect(repository.snapshot().stories.every(story => !story.steering?.length)).toBe(true);
  });

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

  it('shows understandable per-story slots and the actual equipped state', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter, installedSkills });
    await setup.hydrate();
    const story = await setup.createStory({ title: 'Slow Fire', premise: 'A rebellion begins with one missing ledger.' });
    await setup.setSkillSlot(story.id, 'pacing', { id: installedSkills[0].id, version: installedSkills[0].version });

    await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} installedSkills={installedSkills} />));

    expect(container.textContent).toContain('Harness skill slots');
    expect(container.textContent).toContain('2/7 equipped');
    expect(container.textContent).toContain('AuthorEquipped');
    expect(container.textContent).toContain('SEN Novel Author');
    expect(container.textContent).toContain('View skill instructions');
    expect(container.textContent).toContain('elite fantasy web-novel author specializing in light novels');
    expect(container.textContent).toContain('PacingEquipped');
    expect(container.textContent).toContain('MediaEmpty');
    expect(container.querySelector<HTMLSelectElement>('#harness-skill-pacing')?.value).toBe('seihouse.long-range-pacing@1.0.0');
  });
});

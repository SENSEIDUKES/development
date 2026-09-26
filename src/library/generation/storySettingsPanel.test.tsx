// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { HarnessGenerationController, validateHarnessSkillManifest, type HarnessGenerationModelAdapter, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { HarnessGenerationWorkspace } from '@seihouse/library/generation';
import type { SenLanguageCode } from '@seihouse/sen/contracts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const modelAdapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }], defaultModel: 'fixture' }),
  generate: async () => { throw new Error('unused'); },
};

const japaneseWriting: HarnessSkillManifest = validateHarnessSkillManifest({
  id: 'test.writing.ja', version: '1.0.0', name: 'Test Japanese Writing', description: 'Test-only writing package.',
  slot: 'translation', applications: ['generation'], instructions: 'Write in Japanese.', translation: { targetLanguage: 'ja' },
});

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const storyWith = async (language: SenLanguageCode) => {
  const repository = new InMemoryHarnessGenerationRepository();
  const setup = new HarnessGenerationController({ repository, modelAdapter });
  await setup.hydrate();
  await setup.createStory({ premise: 'A courier climbs to a mountain school.' }, language);
  return repository;
};

const render = async (repository: InMemoryHarnessGenerationRepository, props: { installedSkills?: HarnessSkillManifest[]; showHarnessInternals?: boolean } = {}) => {
  await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} {...props} />));
};
const settings = () => container.querySelector<HTMLElement>('[data-testid="story-settings"]')!;
const readingModeSelect = () => settings().querySelector<HTMLSelectElement>('select')!;

describe('Story Settings on the novel page', () => {
  it('shows Story Language and Reading Mode in plain terms, with no Harness internals, for a production host', async () => {
    await render(await storyWith('en'));

    expect(settings().textContent).toContain('Story Settings');
    expect(container.querySelector('[data-testid="story-settings-language"]')?.textContent).toBe('English');
    expect(readingModeSelect().value).toBe('Standard');
    expect(settings().textContent).not.toMatch(/CAPA|skill|slot|Translation|Accessibility|Harness|manifest/i);
    // CAPA slots, managed-slot state and package intake stay out of the product surface.
    expect(container.querySelector('#harness-skills-title')).toBeNull();
    expect(container.querySelector('[data-testid="harness-accessibility-slot"]')).toBeNull();
    expect(container.textContent).not.toContain('CAPA skill slots');
  });

  it('saves the owner\'s Reading Mode for the chapters still to come', async () => {
    const repository = await storyWith('en');
    await render(repository);

    await act(async () => {
      readingModeSelect().value = 'Easy Read';
      readingModeSelect().dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(repository.snapshot().stories[0].chapterWritingStyle).toBe('Easy Read');
    expect(readingModeSelect().value).toBe('Easy Read');
    expect(settings().textContent).toContain('Applies to chapters written from now on');
  });

  it('tells the owner, in product terms, when no writing package covers the Story Language', async () => {
    await render(await storyWith('ja'));

    expect(container.querySelector('[data-testid="story-settings-language"]')?.textContent).toBe('Japanese (日本語)');
    expect(container.querySelector('[data-testid="story-settings-language-notice"]')?.textContent)
      .toBe('No specialized Japanese (日本語) writing package is installed. Chapters are still written in Japanese (日本語).');
  });

  it('shows no notice when the Story Language has its package, or needs none', async () => {
    await render(await storyWith('ja'), { installedSkills: [japaneseWriting] });
    expect(container.querySelector('[data-testid="story-settings-language-notice"]')).toBeNull();

    await act(async () => root.unmount());
    root = createRoot(container);
    await render(await storyWith('en'));
    expect(container.querySelector('[data-testid="story-settings-language-notice"]')).toBeNull();
  });

  it('lets development tooling inspect the resolved managed slots, read-only', async () => {
    const repository = await storyWith('ja');
    await render(repository, { installedSkills: [japaneseWriting], showHarnessInternals: true });

    const slot = (id: string) => container.querySelector<HTMLElement>(`[data-testid="harness-${id}-slot"]`)!;
    expect(slot('translation').dataset.status).toBe('Loaded');
    expect(slot('translation').textContent).toContain('Test Japanese Writing v1.0.0 writes every chapter in Japanese (日本語).');
    expect(slot('accessibility').dataset.status).toBe('Not used');
    expect(slot('fate').dataset.status).toBe('Not used');
    // Managed slots offer no equip control.
    expect(slot('translation').querySelector('select')).toBeNull();
    expect(slot('accessibility').querySelector('select')).toBeNull();

    await act(async () => {
      readingModeSelect().value = 'Literal Reading';
      readingModeSelect().dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(slot('accessibility').dataset.status).toBe('Loaded');
    expect(slot('accessibility').textContent).toContain('SEN Literal Reading v1.0.0 loads on every chapter while the Reading Mode is Literal Reading.');
    expect(container.querySelector('[data-testid="harness-official-requirements"]')?.textContent)
      .toContain('Sent with this story\'s chapters');
  });
});

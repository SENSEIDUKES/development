// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { HarnessGenerationController, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { HarnessGenerationWorkspace } from '@seihouse/library/generation';
import { validateMediaPack, type MediaPack } from '@seihouse/library/media';
import { LIBRARY_BASE_MEDIA } from '../../host/media/libraryCatalog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const modelAdapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }], defaultModel: 'fixture' }),
  generate: async () => { throw new Error('unused'); },
};

const towerPack = validateMediaPack({
  id: 'test.tower-cues', version: '1.0.0', type: 'sound-cue',
  displayName: 'Tower Climb', description: 'Test-only tower sounds.',
  source: { path: 'catalogs/tower.json', digest: 'c'.repeat(64) },
  sounds: [{ word: 'floor cleared', example: 'the floor was cleared', meaning: 'a tower floor completed' }],
  entries: [{
    file_path: 'fixtures/floor-cleared.mp3',
    public_url: 'https://fixtures.r2.dev/floor-cleared.mp3',
    metadata: {
      main_category: 'system', broad_variation: 'clear', soft_tags: [], description: 'Test.', confidence_score: 1,
      sound: 'floor cleared', studio_tags: { tone: 'bright', energy: 'medium' },
    },
  }],
}) as MediaPack;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const render = async (repository: InMemoryHarnessGenerationRepository) => {
  await act(async () => root.render(
    <HarnessGenerationWorkspace
      repository={repository}
      modelAdapter={modelAdapter}
      baseMedia={LIBRARY_BASE_MEDIA}
      registeredMediaPacks={[towerPack]}
      mediaPackEntitlements={[{ pack: towerPack, unlockedAt: '2026-01-01T00:00:00.000Z' }]}
    />,
  ));
};

const storyWords = () => [...container.querySelectorAll('[aria-labelledby="harness-sound-words-title"] li')].map(item => item.textContent);

describe('Media Loadout sound words', () => {
  it('shows the default library\'s words until a Sound Cue Pack replaces them', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter });
    await setup.hydrate();
    const story = await setup.createStory({ premise: 'A climber ascends the tower.' });
    await render(repository);

    expect(container.textContent).toContain('Sound words for this story · 30');
    expect(storyWords()).toContain('blade drawn');
    expect(container.querySelector('[aria-labelledby="harness-sound-words-title"] li[title]')?.getAttribute('title')).toContain('e.g. "the beast roared"');
    expect(container.textContent).toContain('From the default library.');
    expect([...container.querySelectorAll('[aria-label="Tower Climb sound words"] li')].map(item => item.textContent)).toEqual(['floor cleared']);

    const select = container.querySelector<HTMLSelectElement>('#harness-media-soundCues')!;
    await act(async () => {
      select.value = 'test.tower-cues@1.0.0';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(repository.snapshot().stories.find(entry => entry.id === story.id)?.mediaLoadout?.soundCues).toEqual({ id: 'test.tower-cues', version: '1.0.0' });
    expect(storyWords()).toEqual(['floor cleared']);
    expect(container.textContent).toContain('From the equipped pack, which replaces the default library.');
  });
});

// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { HarnessGenerationController, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import type { SoundWordsPreset } from '@seihouse/sen/audio';
import { HarnessGenerationWorkspace } from '@seihouse/library/generation';
import { validateMediaPack, type MediaPack } from '@seihouse/library/media';
import { LIBRARY_BASE_MEDIA, LIBRARY_SOUND_WORDS } from '../../host/media/libraryCatalog';
import { LIBRARY_SOUND_WORDS_PRESET } from '../../host/media/soundWordPacks';

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
      main_category: 'locations', broad_variation: 'clear', soft_tags: [], description: 'Test.', confidence_score: 1,
      sound: 'floor cleared', studio_tags: { tone: 'bright', energy: 'medium' },
    },
  }],
}) as MediaPack;

const TOWER_PRESET: SoundWordsPreset = { id: 'test.tower-words', version: '1.0.0', name: 'Tower words', words: ['floor cleared', 'gong strikes'] };

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const UNLOCKED = [{ pack: towerPack, unlockedAt: '2026-01-01T00:00:00.000Z' }];
const render = async (repository: InMemoryHarnessGenerationRepository, entitlements = UNLOCKED) => {
  await act(async () => root.render(
    <HarnessGenerationWorkspace
      repository={repository}
      modelAdapter={modelAdapter}
      baseMedia={LIBRARY_BASE_MEDIA}
      registeredMediaPacks={[towerPack]}
      mediaPackEntitlements={entitlements}
      soundWordPresets={[LIBRARY_SOUND_WORDS_PRESET, TOWER_PRESET]}
    />,
  ));
};

const panel = () => container.querySelector<HTMLElement>('[data-testid="story-settings-sound-words"]')!;
const chips = () => [...panel().querySelectorAll<HTMLElement>('[data-testid="sound-word"]')];
const chipWords = () => chips().map(chip => chip.querySelector('button')!.firstChild!.textContent);
const silentWords = () => chips().filter(chip => chip.textContent?.includes('no recording')).map(chip => chip.querySelector('button')!.firstChild!.textContent);
const savedWords = (repository: InMemoryHarnessGenerationRepository, storyId: string) =>
  repository.snapshot().stories.find(entry => entry.id === storyId)?.soundWords;
const choose = async (select: HTMLSelectElement, value: string) => {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
};
const type = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('Story Settings sound words', () => {
  it('keeps the story\'s own words when its Sound Cue pack changes, and marks the ones no recording plays', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter });
    await setup.hydrate();
    const story = await setup.createStory({ premise: 'A climber ascends the tower.' });
    await render(repository);

    // A story from before it kept a list shows its recordings' words: the Library's 30, renamed.
    expect(panel().querySelector('[data-testid="sound-words-count"]')?.textContent).toBe('30/30');
    expect(chipWords()).toEqual(LIBRARY_SOUND_WORDS.map(sound => sound.word));
    expect(chipWords()).toEqual(expect.arrayContaining(['growl', 'screech', 'unsheathe']));
    expect(chipWords()).not.toEqual(expect.arrayContaining(['blade drawn']));
    expect(silentWords()).toEqual([]);
    // The Media Loadout lists what a pack's recordings play; the words are no longer its.
    expect([...container.querySelectorAll('[aria-label="Sounds Tower Climb plays"] li')].map(item => item.textContent)).toEqual(['floor cleared']);
    expect(container.querySelector('[aria-labelledby="harness-sound-words-title"]')).toBeNull();

    await choose(container.querySelector<HTMLSelectElement>('#harness-media-soundCues')!, 'test.tower-cues@1.0.0');
    expect(repository.snapshot().stories.find(entry => entry.id === story.id)?.mediaLoadout?.soundCues).toEqual({ id: 'test.tower-cues', version: '1.0.0' });
    // The words stay; the tower's recordings play none of them.
    expect(savedWords(repository, story.id)).toEqual(LIBRARY_SOUND_WORDS.map(sound => sound.word));
    expect(chipWords()).toHaveLength(30);
    expect(silentWords()).toHaveLength(30);
    expect(panel().querySelector('[data-testid="sound-words-silent"]')?.textContent).toContain('30 words have no recording yet');

    // A preset replaces the list; the tower plays one of its two words.
    await choose(panel().querySelector('select')!, 'test.tower-words@1.0.0');
    expect(savedWords(repository, story.id)).toEqual(['floor cleared', 'gong strikes']);
    expect(silentWords()).toEqual(['gong strikes']);

    // When the host withdraws the unlock the Library's recordings play again: the words stay as chosen.
    await render(repository, []);
    expect(chipWords()).toEqual(['floor cleared', 'gong strikes']);
    expect(silentWords()).toEqual(['floor cleared']);
  });

  it('adds, changes and removes words, refuses a duplicate or a 31st, and an empty list plays no Sound Cues', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter });
    await setup.hydrate();
    const story = await setup.createStory({ premise: 'A climber ascends the tower.' });
    await setup.setSoundWords(story.id, ['gong strikes', 'chime']);
    await render(repository, []);

    const input = panel().querySelector<HTMLInputElement>('input:not([type="file"])')!;
    await type(input, 'Door_Slam');
    await act(async () => { panel().querySelector('form')!.requestSubmit(); });
    expect(savedWords(repository, story.id)).toEqual(['gong strikes', 'chime', 'door slam']);
    expect(silentWords()).toEqual(['door slam']);

    // Change a word in place.
    await act(async () => { chips()[1].querySelector('button')!.click(); });
    await type(input, 'bell rings');
    await act(async () => { panel().querySelector('form')!.requestSubmit(); });
    expect(savedWords(repository, story.id)).toEqual(['gong strikes', 'bell rings', 'door slam']);

    // A duplicate is refused with a reason, and nothing is saved.
    await type(input, 'gong strikes');
    await act(async () => { panel().querySelector('form')!.requestSubmit(); });
    expect(panel().querySelector('[role="alert"]')?.textContent).toContain('listed twice');
    expect(savedWords(repository, story.id)).toEqual(['gong strikes', 'bell rings', 'door slam']);

    // Remove every word: the story plays no Sound Cues.
    for (const word of ['gong strikes', 'bell rings', 'door slam']) {
      await act(async () => { panel().querySelector<HTMLButtonElement>(`[aria-label="Remove ${word}"]`)!.click(); });
    }
    expect(savedWords(repository, story.id)).toEqual([]);
    expect(panel().querySelector('[data-testid="sound-words-empty"]')?.textContent).toBe('No sound words: this story plays no Sound Cues.');

    // A preset of 30 fills the list: no 31st can be added.
    await choose(panel().querySelector('select')!, `${LIBRARY_SOUND_WORDS_PRESET.id}@${LIBRARY_SOUND_WORDS_PRESET.version}`);
    expect(savedWords(repository, story.id)).toHaveLength(30);
    expect(panel().querySelector('[data-testid="sound-words-count"]')?.textContent).toBe('30/30');
    expect(panel().querySelector<HTMLInputElement>('input:not([type="file"])')!.disabled).toBe(true);
  });
});

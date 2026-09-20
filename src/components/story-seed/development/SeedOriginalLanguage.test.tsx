// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type SenLanguageCode } from '@seihouse/sen/contracts';
import { LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, createStorySeed, listStorySeeds, resetStorySeedRepository, updateStorySeed } from '../../../workshop/previews/story-seed/storySeedStorage';
import { createEmptyStorySeedInput, type StorySeedInput } from '@seihouse/sen/story-seed';
import { resetMockState } from '../shared/stubs';
import { createMockStorySeedRecord } from '../../../workshop/previews/story-seed/previewData';
import { CreationModal } from '@seihouse/library/story-seed';

vi.mock('../../../audio/playback', () => ({
  useNarrativeAudio: () => ({
    currentSource: null, currentTrackId: null, isMuted: false, isPlaying: false, volume: 1,
    load: vi.fn(), pause: vi.fn(), play: vi.fn(), setVolume: vi.fn(), stop: vi.fn(),
    subscribeToTrackChange: vi.fn(() => () => undefined),
    subscribeToQueueEnd: vi.fn(() => () => undefined),
    toggleMute: vi.fn(),
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const seedInput = (premise: string): StorySeedInput => {
  const seed = createEmptyStorySeedInput();
  seed.story.optional.activeArcGoal = { id: 'arc-1-gate', text: 'Reach the gate.', chapters: 100 };
  seed.story.required.premise = premise;
  seed.story.required.genre = 'Xianxia';
  seed.story.required.style = 'chinese';
  return seed;
};

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
  resetStorySeedRepository();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  resetMockState();
  resetStorySeedRepository();
  vi.restoreAllMocks();
});

const buttonNamed = (name: string) => Array.from(
  container.querySelectorAll<HTMLButtonElement>('button'),
).find(button => button.textContent?.trim() === name);

const allButtonsNamed = (name: string) => Array.from(
  container.querySelectorAll<HTMLButtonElement>('button'),
).filter(button => button.textContent?.trim() === name);

const languageSelect = () => container.querySelector<HTMLSelectElement>('#story-original-language');

describe('saved Story Seed records own their Original Language', () => {
  it('stores and reloads a per-record language rather than one shared value', async () => {
    const japanese = await createStorySeed('creator-1', seedInput('A courier crosses the sea.'), undefined, 'ja');
    const korean = await createStorySeed('creator-1', seedInput('A healer crosses the mountains.'), undefined, 'ko');

    expect(japanese.originalLanguage).toBe('ja');
    expect(korean.originalLanguage).toBe('ko');

    const reloaded = await listStorySeeds('creator-1');
    expect(new Map(reloaded.map(record => [record.id, record.originalLanguage])))
      .toEqual(new Map([[japanese.id, 'ja'], [korean.id, 'ko']]));
  });

  it('keeps each record’s language independent when another record is updated', async () => {
    const japanese = await createStorySeed('creator-1', seedInput('A courier crosses the sea.'), undefined, 'ja');
    const korean = await createStorySeed('creator-1', seedInput('A healer crosses the mountains.'), undefined, 'ko');

    await updateStorySeed('creator-1', korean, seedInput('A healer turns back.'), undefined, 'vi');

    const reloaded = await listStorySeeds('creator-1');
    expect(reloaded.find(record => record.id === japanese.id)?.originalLanguage).toBe('ja');
    expect(reloaded.find(record => record.id === korean.id)?.originalLanguage).toBe('vi');
  });
});

describe('reopening a saved seed restores that seed’s own language', () => {
  const renderModal = (onStartStory = vi.fn()) => {
    act(() => root.render(
      <LibraryPresentationProvider>
        <CreationModal
          onNavigateHome={vi.fn()}
          onStartStory={onStartStory}
          onGenerateBlueprint={vi.fn()}
          isGenerating={false}
          error={null}
          accountDefaultLanguage="en"
        />
      </LibraryPresentationProvider>,
    ));
    return onStartStory;
  };

  const renderWithAccountDefault = (accountDefaultLanguage?: SenLanguageCode) => {
    act(() => root.render(
      <LibraryPresentationProvider>
        <CreationModal
          onNavigateHome={vi.fn()}
          onStartStory={vi.fn()}
          onGenerateBlueprint={vi.fn()}
          isGenerating={false}
          error={null}
          {...(accountDefaultLanguage ? { accountDefaultLanguage } : {})}
        />
      </LibraryPresentationProvider>,
    ));
  };

  const openBank = async () => {
    await act(async () => { buttonNamed('Story Bank')!.click(); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
  };

  const openBlueprintFor = async (index: number) => {
    await act(async () => { allButtonsNamed('Blueprint')[index]!.click(); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
  };

  const backToWorkspace = async () => {
    await act(async () => { buttonNamed('Refine Details')!.click(); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
  };

  const twoSavedSeeds = (first: SenLanguageCode, second: SenLanguageCode) => {
    resetStorySeedRepository([
      createMockStorySeedRecord({ id: 'seed-first', title: 'First Seed', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, originalLanguage: first, updatedAt: '2026-09-02T00:00:00.000Z' }),
      createMockStorySeedRecord({ id: 'seed-second', title: 'Second Seed', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, originalLanguage: second, updatedAt: '2026-09-01T00:00:00.000Z' }),
    ]);
  };

  it('shows the second seed’s language after the first seed was opened', async () => {
    twoSavedSeeds('ja', 'ko');
    renderModal();

    await openBank();
    await openBlueprintFor(0);
    expect(languageSelect()?.value).toBe('ja');

    await backToWorkspace();
    await openBank();
    await openBlueprintFor(1);
    // The regression: this previously still read the first seed's language.
    expect(languageSelect()?.value).toBe('ko');
  });

  it('manifests a banked seed with that seed’s saved language, not the one last opened', async () => {
    twoSavedSeeds('ja', 'ko');
    const onStartStory = renderModal();

    await openBank();
    await openBlueprintFor(0);
    expect(languageSelect()?.value).toBe('ja');

    await backToWorkspace();
    await openBank();
    await act(async () => { allButtonsNamed('Manifest Novel')[1]!.click(); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 250)); });

    expect(onStartStory).toHaveBeenCalledTimes(1);
    expect(onStartStory.mock.calls[0][0].administrative.originalLanguage).toBe('ko');
  });

  // The Original Language selector itself lives on the Blueprint stage, so a
  // brand-new seed is observed where its language first becomes durable: the
  // draft the intake workspace saves.
  const saveDraft = async () => {
    await act(async () => { (buttonNamed('Save Draft') ?? buttonNamed('Saved'))!.click(); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
  };

  it('starts a new seed on the active account’s Default Reading Language', async () => {
    resetStorySeedRepository();
    renderWithAccountDefault('vi');

    await saveDraft();

    const saved = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    expect(saved.map(record => record.originalLanguage)).toEqual(['vi']);
  });

  it('adopts an account default that only resolves after the workspace mounts', async () => {
    resetStorySeedRepository();
    // The host's profile lands a render later; a new seed must follow it
    // rather than keeping the English fallback it mounted with.
    renderWithAccountDefault(undefined);
    renderWithAccountDefault('th');

    await saveDraft();

    const saved = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    expect(saved.map(record => record.originalLanguage)).toEqual(['th']);
  });

  it('freezes the resolved language on first save before later account-default changes', async () => {
    resetStorySeedRepository();
    renderWithAccountDefault('th');
    await saveDraft();

    renderWithAccountDefault('ms');
    await saveDraft();

    const saved = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    expect(saved).toHaveLength(1);
    expect(saved[0].originalLanguage).toBe('th');
  });

  it('never lets a later account default overwrite a banked seed’s own language', async () => {
    twoSavedSeeds('ja', 'ko');
    renderWithAccountDefault('en');

    await openBank();
    await openBlueprintFor(0);
    expect(languageSelect()?.value).toBe('ja');

    renderWithAccountDefault('ms');
    expect(languageSelect()?.value).toBe('ja');
  });
});

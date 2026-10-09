// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import type { ReaderStateRepository, ReaderStoryState } from '@seihouse/sen/reader-runtime';
import { buildInitialStoryGenerationPayload, createStoryAdministrativeMetadata, type StorySeedRecord } from '@seihouse/sen/story-seed';
import { InMemoryHarnessGenerationRepository } from '../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../test-utils/writtenChapter';
import { installAudioMediaStubs } from '../test-utils/renderWithDevAudio';
import { createMockStorySeedRecord } from '../workshop/previews/story-seed/previewData';
import { createOfficialCapaDefaultLoadout, installOfficialCapaSkillsInMemory, OFFICIAL_CAPA_DEFAULT_REFERENCES } from '../host/generation/capa/officialCapaSkills';
import { HarnessGenerationRequestError } from '../host/generation/httpClient';
import { writeModelPreference } from '../host/generation/modelPreference';
import { BlueprintRequestError } from '../host/story-seed/blueprintGenerationClient';
import { StoryCoverRequestError } from '../host/media/storyCoverClient';
import { createLocalStorySeedRepository } from '../host/story-seed/localStorySeedRepository';
import { startHarnessStoryFromSeed } from '../host/story-seed/startHarnessStory';
import { createLocalReaderPreferenceStorage } from '../host/reader/readerPreferenceStorage';
import { createHostReaderMixer } from '../host/reader/readerMixer';
import { SEN_SOUNDSCAPES } from '../host/media/soundscapeCatalog';
import { piecesForMood, storySoundtrack } from '@seihouse/sen/reader-runtime';
import { APP_MUSIC_MOOD } from './appMusic';
import { LIBRARY_SIDEBAR_MODE_KEY, writeMenuMusic } from '@seihouse/library/shell';
import { READER_MUSIC_MOOD } from '../components/harness-generation/development/useReaderSoundtrack';
import { installFakeSpeechSynthesis } from '../test-utils/fakeSpeechSynthesis';
import { NovelExpandedApp } from './NovelExpandedApp';
import { NOVEL_EXPANDED_STORAGE, type NovelExpandedServices } from './services';
import { createMemoryStoryCoverStore } from '../host/media/storyCovers';
import { readStorySettingsDraft, writeStorySettingsDraft } from '@seihouse/library/stories';
import { NOVEL_EXPANDED_READER_ID } from './storyCreationRuntime';
import { createDeviceProfileStore } from '../host/profile/deviceProfile';
import { createPracticeEconomy } from '../host/economy/practiceEconomy';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const receipt = { provider: 'gemini' as const, model: 'fixture', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' as const } };

/** A writer whose chapter waits until the test releases it, so the veil can be seen. */
const scriptedWriter = () => {
  let release = () => undefined as void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const generate = vi.fn(async (request: HarnessGenerationRequest) => {
    void request;
    await gate;
    return { rawProviderResponse: JSON.stringify(writtenChapter({
      title: 'Low Tide', paragraphs: ['The tide pulled back from the drowned gate.', 'Mara counted the bells that no longer rang.'],
      arcCompletion: { goalId: 'none', completed: false, evidence: '' }, recap: 'Mara returns.', chapterFunction: 'progression',
      nextProgression: 'Mara climbs the bell tower.', nextWorldBuilding: 'The keeper explains the drowned law.', nextConflict: 'The tide wardens seize the causeway.',
    })), providerReceipt: receipt };
  });
  const recoverMemory = vi.fn(async () => ({ rawProviderResponse: JSON.stringify({ events: [] }), providerReceipt: receipt }));
  const writer: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }, { id: 'remembered', label: 'Remembered' }], defaultModel: 'fixture' }),
    generate: generate as unknown as HarnessGenerationModelAdapter['generate'],
    arcOperation: async () => ({ rawProviderResponse: JSON.stringify({ plan: { arcNumber: 1, goals: [{ id: 'arc-1', text: 'Reach the gate.', chapters: 30 }] }, destinedEnding: 'Mara reclaims her name.' }), providerReceipt: receipt }),
  };
  return { writer, generate, recoverMemory, release: () => release() };
};

class MemoryReaderStateRepository implements ReaderStateRepository {
  records = new Map<string, ReaderStoryState>();
  async load(storyId: string) { return this.records.has(storyId) ? structuredClone(this.records.get(storyId)) : undefined; }
  async save(state: ReaderStoryState) { this.records.set(state.storyId, structuredClone(state)); }
}

let officialSkills: HarnessSkillManifest[];
beforeAll(async () => {
  // Copied into this realm's Uint8Array: the package checks the type of what it reads.
  officialSkills = await installOfficialCapaSkillsInMemory(async definition =>
    new Uint8Array(await readFile(path.resolve(__dirname, '../host/generation/capa/official-capa', definition.archiveFile))));
});

const appServices = (writer: HarnessGenerationModelAdapter, overrides: Partial<NovelExpandedServices> = {}): NovelExpandedServices => {
  const readerPreferences = overrides.readerPreferences ?? createLocalReaderPreferenceStorage(NOVEL_EXPANDED_STORAGE.readerPreferences);
  return {
    stories: new InMemoryHarnessGenerationRepository(),
    readerState: new MemoryReaderStateRepository(),
    readerPreferences,
    storySeeds: createLocalStorySeedRepository({ storageKey: 'test-novelexpanded-seeds' }),
    writer,
    installSkills: async () => officialSkills,
    requestWorldBlueprint: vi.fn(),
    accessToken: { current: undefined },
    profile: createDeviceProfileStore({ storage: readerPreferences, uid: NOVEL_EXPANDED_READER_ID }),
    economy: createPracticeEconomy({ uid: NOVEL_EXPANDED_READER_ID }).clients,
    storyCovers: createMemoryStoryCoverStore(),
    requestStoryCover: vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })),
    requestProfilePicture: vi.fn(async () => new Blob([new Uint8Array([4, 5, 6])], { type: 'image/png' })),
    ...overrides,
  };
};

/** A Regular Reader story's seed: Next writes the next chapter (Fate Survival waits on the reader's direction). */
const regularSeedRecord = (): StorySeedRecord => {
  const record = createMockStorySeedRecord({ userId: NOVEL_EXPANDED_READER_ID });
  record.seed.story.optional.fateSurvival = { ...record.seed.story.optional.fateSurvival, enabled: false };
  return record;
};

/** A story started from a Story Seed the way Create starts one. */
const startedStory = async (repository: InMemoryHarnessGenerationRepository, writer: HarnessGenerationModelAdapter, record: StorySeedRecord = regularSeedRecord()) => {
  const controller = new HarnessGenerationController({ repository, modelAdapter: writer, installedSkills: officialSkills });
  await controller.hydrate();
  return startHarnessStoryFromSeed(controller, buildInitialStoryGenerationPayload(record.seed, createStoryAdministrativeMetadata({
    storyId: 'story-1', creatorId: record.userId, sourceSeedId: record.id, originalLanguage: 'en',
  }), record.blueprint!, 10));
};

let container: HTMLDivElement;
let root: Root;
const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const click = async (element: Element | null | undefined, label: string, wait = 0) => {
  expect(element, `Expected ${label}`).toBeTruthy();
  await act(async () => { (element as HTMLElement).click(); });
  await flush(wait);
};
const buttonByText = (text: string, scope: ParentNode = document) => [...scope.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === text);
const worldInfo = () => document.querySelector<HTMLElement>('[data-testid="harness-world-info"]');
const chaptersAction = () => worldInfo()?.querySelector<HTMLElement>('[data-world-info-chapters="action"]');
const address = () => `${window.location.pathname}${window.location.search}`;
const shell = () => document.querySelector<HTMLElement>('[data-testid="novel-expanded-shell"]');
const strip = () => document.querySelector<HTMLElement>('nav[aria-label="Library global navigation"]');
const footer = () => document.querySelector<HTMLElement>('[data-library-footer]');
/** The music note on phones and tablets: floating just above the bottom bar, as in the Reader. */
const floatingNote = () => document.querySelector<HTMLButtonElement>('[data-library-sound-slot] .header-sound-control button');
/** The music note on laptops: in the header. */
const headerNote = () => document.querySelector<HTMLButtonElement>('header .header-sound-control button');
const render = async (services: NovelExpandedServices, url = '/app/', readerMixer = createHostReaderMixer(services.readerPreferences)) => {
  window.history.replaceState(null, '', url);
  await act(async () => root.render(<NovelExpandedApp services={services} readerMixer={readerMixer} />));
  await flush(20);
  return readerMixer;
};
const typeInto = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  installAudioMediaStubs();
  // The Cave measures its name and badges as they change.
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  window.localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('NovelExpanded: Home → Story View → Reader', { timeout: 30_000 }, () => {
  it('starts on an empty Home that says where stories will appear', async () => {
    await render(appServices(scriptedWriter().writer));
    expect(document.querySelector('[data-testid="novel-expanded-home"]')).toBeTruthy();
    expect(container.textContent).toContain('Your stories appear here');
    expect(container.textContent).not.toContain('Curated worlds');
  });

  it.each([undefined, 'phoenix'])('opens a story under the equipped Familiar (%s) and walks back with the app and browser', async equippedFamiliarId => {
    const story = scriptedWriter();
    const services = appServices(story.writer);
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
    // The Model Router's chapter model is the one choice shared with the Workshop.
    writeModelPreference('chapters', 'remembered');
    // The reader's profile on this device is where the equipped Familiar is kept.
    if (equippedFamiliarId) services.profile.save({ familiarId: equippedFamiliarId });
    await render(services, '/app/');

    await click(container.querySelector(`#home-world-${created.id} button[aria-label^="Open ${created.title}"]`), 'the Home card');
    expect(address()).toBe(`/app/?story=${created.id}`);
    expect(worldInfo()!.querySelector('h1')!.textContent).toBe(created.title);

    // Start Story opens the Reader and writes Chapter 1 under the equipped Familiar's veil.
    await click(chaptersAction(), 'Start Story', 10);
    expect(address()).toBe(`/app/?story=${created.id}&read=1`);
    expect(document.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
    const veil = document.querySelector<HTMLElement>('[data-testid="generation-overlay"]')!;
    expect(veil.dataset.familiarId).toBe(equippedFamiliarId ?? 'quill');
    expect(veil.querySelector(`[aria-label="${equippedFamiliarId ? 'Phoenix' : 'Quill'}, Waving"]`)).toBeTruthy();
    expect(veil.textContent).toContain('Chapter 1');
    expect(veil.style.getPropertyValue('--veil-accent')).toBe(equippedFamiliarId ? '#ff6a13' : '#2589ff');
    expect(document.querySelector('img[alt="VERSA"]')).toBeNull();
    expect(story.generate).toHaveBeenCalledTimes(1);
    const request = story.generate.mock.calls[0][0];
    expect(request.model).toBe('remembered');
    // The same official CAPA skills as the Workshop.
    expect(JSON.stringify(request.capaPrompt)).toContain(OFFICIAL_CAPA_DEFAULT_REFERENCES.author.id);

    await act(async () => { story.release(); });
    await flush(10);
    expect(document.querySelector('[data-chapter-number="1"]')!.textContent).toContain('The tide pulled back from the drowned gate.');
    expect(story.recoverMemory).not.toHaveBeenCalled();

    // The Reader's Back returns to Story View, which now continues where the reader is.
    await click(buttonByText('Back'), 'Back', 10);
    expect(address()).toBe(`/app/?story=${created.id}`);
    expect(chaptersAction()!.textContent).toBe('Continue');

    // Story View's Back goes Home, where the story's card now has its chapter.
    await click(worldInfo()!.querySelector('button[aria-label="Back to your stories"]'), 'Back to your stories');
    expect(address()).toBe('/app/');
    expect(container.querySelector(`button[aria-label^="Open ${created.title}, 1 chapters"]`)).toBeTruthy();

    // The browser's Back walks the same pages; nothing is written again.
    await act(async () => { window.history.back(); });
    await flush(30);
    expect(address()).toBe(`/app/?story=${created.id}`);
    expect(worldInfo()).toBeTruthy();
    await act(async () => { window.history.back(); });
    await flush(30);
    expect(address()).toBe(`/app/?story=${created.id}&read=1`);
    expect(document.querySelector('[data-chapter-number="1"]')).toBeTruthy();
    expect(story.generate).toHaveBeenCalledTimes(1);
  });

  it('asks for the access token when a chapter reaches the visitor limit, then writes it with the token', async () => {
    const story = scriptedWriter();
    const accessToken = { current: undefined as string | undefined };
    const sentWith: Array<string | undefined> = [];
    // The server refuses a chapter past the visitor limit unless the owner's token rides with it.
    const writer: HarnessGenerationModelAdapter = {
      ...story.writer,
      generate: async request => {
        sentWith.push(accessToken.current);
        if (!accessToken.current) throw new HarnessGenerationRequestError('This Development action has reached its temporary request limit. Please try again shortly.', 429);
        if (accessToken.current !== 'owner-token') throw new HarnessGenerationRequestError('The access token was not accepted.', 401);
        return story.writer.generate(request);
      },
    };
    const services = appServices(writer, { accessToken });
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
    await render(services, `/app/?story=${created.id}`);
    await click(chaptersAction(), 'Start Story', 10);

    const sheet = () => document.querySelector<HTMLFormElement>('[data-testid="access-token-sheet"]');
    expect(sheet(), 'Expected the access token sheet').toBeTruthy();
    expect(sheet()!.textContent).toContain('chapters are limited to 6 every 30 minutes');
    // The writing veil covers the page while the chapter waits; the sheet opens above it.
    expect(sheet()!.closest('.workspace-sheet')!.classList.contains('workspace-sheet--above-veil')).toBe(true);
    await typeInto(sheet()!.querySelector('input[type="password"]')!, 'wrong-token');
    await click(buttonByText('Continue', sheet()!), 'Continue', 20);
    expect(sheet()!.textContent).toContain('That token was not accepted.');
    await typeInto(sheet()!.querySelector('input[type="password"]')!, 'owner-token');
    await click(buttonByText('Continue', sheet()!), 'Continue', 20);
    expect(sheet()).toBeNull();
    await act(async () => { story.release(); });
    await flush(10);
    expect(document.querySelector('[data-chapter-number="1"]')!.textContent).toContain('The tide pulled back from the drowned gate.');
    // One chapter written: the refused tries never reached the model.
    expect(sentWith).toEqual([undefined, 'wrong-token', 'owner-token']);
    expect(story.generate).toHaveBeenCalledTimes(1);
    expect(accessToken.current).toBe('owner-token');
  });

  it('reads a chapter aloud in the Library\'s voices and keeps the reader\'s speed on this device', async () => {
    const { fake: speech, uninstall } = installFakeSpeechSynthesis();
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    try {
      const story = scriptedWriter();
      const services = appServices(story.writer);
      const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
      await render(services, `/app/?story=${created.id}`);
      await click(chaptersAction(), 'Start Story', 10);
      await act(async () => { story.release(); });
      await flush(10);

      await click(buttonByText('Listen'), 'Listen');
      expect(speech.spoken.map(utterance => [utterance.text, utterance.voice?.name])).toEqual([['Chapter 1. Low Tide', 'Daniel']]);
      await click(document.querySelector('button[aria-label="Reader Settings"]'), 'Reader Settings');
      await click(document.querySelector('input[name="read-aloud-rate"][value="1.5"]'), 'Speed 1.5×');
      expect(JSON.parse(window.localStorage.getItem('novelexpanded-reader-read-aloud')!)).toMatchObject({ v: 1, rate: 1.5 });

      // The soundtrack: the note sits with the Listen bar, and its mute is kept with the reader's other device choices.
      const note = document.querySelector<HTMLButtonElement>('[data-testid="read-aloud-player"] [data-testid="story-audio-note"] button');
      expect(note?.getAttribute('aria-label')).toBe('Mute story audio');
      await click(note, 'Mute story audio', 350);
      expect(JSON.parse(window.localStorage.getItem('novelexpanded-reader-audio-mixer')!)).toMatchObject({ masterEnabled: false });
    } finally {
      uninstall();
      vi.unstubAllGlobals();
    }
  });

  it('plays its own calm music from SEN Soundscapes on its menus, with no model, and never into the Reader', async () => {
    const story = scriptedWriter();
    const services = appServices(story.writer);
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
    const mixer = await render(services);
    const soundtrack = storySoundtrack(mixer);
    const calm = piecesForMood(APP_MUSIC_MOOD, SEN_SOUNDSCAPES).map(piece => piece.id);
    const first = soundtrack.piece();
    expect(calm).toContain(first?.id);
    expect(mixer.getState().layers.soundscapes.requested).toContain(first!.id);

    // The same piece plays on through World Info.
    await click(container.querySelector(`#home-world-${created.id} button[aria-label^="Open ${created.title}"]`), 'the Home card');
    expect(soundtrack.piece()).toBe(first);
    // The Reader never opens to it: the veil while Chapter 1 is written plays the Reader's own music.
    await click(chaptersAction(), 'Start Story', 10);
    expect(document.querySelector('[data-testid="generation-overlay"]')?.textContent).toContain('Chapter 1');
    expect(soundtrack.piece()).not.toBe(first);
    expect(piecesForMood(READER_MUSIC_MOOD, SEN_SOUNDSCAPES).map(piece => piece.id)).toContain(soundtrack.piece()?.id);
    expect(story.generate).toHaveBeenCalledTimes(1);
    story.release();
    await flush(50);
  });

  it('floats the music note above Home\'s bar while Menu music is on; off, the menus are silent and the note goes', async () => {
    const services = appServices(scriptedWriter().writer);
    const mixer = await render(services);
    const note = () => floatingNote();
    expect(note()?.getAttribute('aria-label')).toBe('Mute sound');
    expect(headerNote()).toBeNull();
    expect(storySoundtrack(mixer).piece()).toBeDefined();
    // One tap silences the app at once.
    await act(async () => { note()!.click(); });
    expect(mixer.getState().preferences.masterEnabled).toBe(false);
    await act(async () => { note()!.click(); });

    // Turned off (Profile Settings › Sound): the menus fall silent and the note leaves the header.
    await act(async () => { writeMenuMusic(services.readerPreferences, false); });
    await flush(5);
    expect(note()).toBeNull();
    expect(storySoundtrack(mixer).piece()).toBeUndefined();
    await act(async () => { writeMenuMusic(services.readerPreferences, true); });
    await flush(5);
    expect(note()).not.toBeNull();
    expect(storySoundtrack(mixer).piece()).toBeDefined();
  });

  it('sends an unknown story home instead of a developer page', async () => {
    await render(appServices(scriptedWriter().writer), '/app/?story=hst_missing&read=1');
    expect(address()).toBe('/app/');
    expect(document.querySelector('[data-testid="novel-expanded-home"]')).toBeTruthy();
  });

  it('says plainly when the writing skills cannot load, and opens on Retry', async () => {
    let fail = true;
    await render(appServices(scriptedWriter().writer, {
      installSkills: async () => {
        if (fail) throw new Error('Official CAPA package CAPA-AUTHOR.spp could not be loaded (503).');
        return officialSkills;
      },
    }));
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('The writing skills could not be loaded.');
    fail = false;
    await click(buttonByText('Retry', container), 'Retry', 20);
    expect(document.querySelector('[data-testid="novel-expanded-home"]')).toBeTruthy();
  });
});


describe('NovelExpanded: the Library Shell', { timeout: 30_000 }, () => {
  it('holds Home and World Info with the app\'s places, and leaves the Reader full-screen', async () => {
    const story = scriptedWriter();
    const services = appServices(story.writer);
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
    await render(services);

    // Home: the Library header, the navigation and the footer around the reader's stories.
    const header = shell()!.querySelector('header')!;
    expect(header.querySelector('.novel-expanded-wordmark img')?.getAttribute('alt')).toBe('NovelExpanded');
    expect(header.querySelector('[data-slot="library-header-badge-title"]')).toBeNull();
    expect(header.querySelector('button[aria-label="Help"]')).toBeTruthy();
    expect(header.querySelector('button[aria-label="Search"]')).toBeTruthy();
    // On a phone the music note floats above the bar, not in the header.
    expect(floatingNote()).toBeTruthy();
    expect(headerNote()).toBeNull();
    expect([...strip()!.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Home', 'Create', 'Profile']);
    expect(strip()!.querySelector('[aria-current="page"]')?.textContent).toBe('Home');
    // Only places the app has built: no Discover. Settings sits beside Profile in the laptop sidebar.
    const sidebar = document.querySelector('[data-slot="app-shell-sidebar"]')!;
    expect(sidebar.textContent).toContain('Create');
    expect(sidebar.textContent).toContain('Settings');
    expect(document.body.textContent).not.toContain('Discover');
    expect(footer()!.querySelector('.novel-expanded-footer-wordmark')?.getAttribute('alt')).toBe('NovelExpanded');
    expect(footer()!.querySelector('.library-footer-statement')?.textContent).toBe('An Experience by SEIHouse');
    expect([...footer()!.querySelectorAll('.library-footer-legal-link')].map(link => link.textContent)).toEqual(['Terms', 'Privacy', 'Cookies']);
    // No channel is published yet, so the footer shows none.
    expect(footer()!.querySelector('.library-footer-social')).toBeNull();
    expect(document.querySelectorAll('main')).toHaveLength(1);

    // World Info: the same shell, with Home selected.
    await click(container.querySelector(`#home-world-${created.id} button[aria-label^="Open ${created.title}"]`), 'the Home card');
    expect(worldInfo()!.closest('[data-testid="novel-expanded-shell"]')).toBeTruthy();
    expect(strip()!.querySelector('[aria-current="page"]')?.textContent).toBe('Home');
    expect(floatingNote()).toBeTruthy();
    expect(footer()).toBeTruthy();
    expect(document.querySelectorAll('main')).toHaveLength(1);

    // The Reader: immersive, outside the shell, and Start Story still writes Chapter 1.
    await click(chaptersAction(), 'Start Story', 10);
    expect(document.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
    expect(shell()).toBeNull();
    expect(strip()).toBeNull();
    expect(footer()).toBeNull();
    // The Reader keeps its own note above its Listen bar.
    expect(floatingNote()).toBeNull();
    expect(story.generate).toHaveBeenCalledTimes(1);
    await act(async () => { story.release(); });
    await flush(10);

    // Back in World Info, Home in the navigation goes Home.
    await click(buttonByText('Back'), 'Back', 10);
    await click(buttonByText('Home', strip()!), 'Home in the navigation');
    expect(address()).toBe('/app/');
    expect(document.querySelector('[data-testid="novel-expanded-home"]')).toBeTruthy();
  });

  it('Create in the navigation opens Story Seed in the shell\'s workspace mode, with the music note', async () => {
    await render(appServices(scriptedWriter().writer));
    await click(buttonByText('Create', strip()!), 'Create in the navigation', 20);
    expect(address()).toBe('/app/?page=create');
    expect(document.querySelector('[data-testid="novel-expanded-create"]')).toBeTruthy();
    // Manifest wears the Energy badge with the World Blueprint's price (a chapter's, for now).
    expect(document.querySelector('[data-testid="novel-expanded-create"] .energy-badge[data-energy-action="chapter.generate"]')?.textContent).toBe('1');
    // Story Seed's own task bar stands where the global strip was; the note floats above it.
    expect(strip()).toBeNull();
    const bar = document.querySelector<HTMLElement>('nav[aria-label="Story Seed navigation"]')!;
    expect([...bar.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Sections', 'Story Bank', 'Settings', 'Back']);
    expect(floatingNote()).toBeTruthy();
    expect(headerNote()).toBeNull();
    await click(buttonByText('Back', bar), 'Back on the task bar', 20);
    expect(address()).toBe('/app/');
  });

  it('Search opens the reader\'s stories; the footer opens Help and the draft legal pages', async () => {
    const story = scriptedWriter();
    const services = appServices(story.writer);
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
    await render(services);

    await click(shell()!.querySelector('header button[aria-label="Search"]'), 'Search', 20);
    const results = document.querySelector<HTMLElement>('[role="dialog"]')!;
    for (const label of ['Your stories', 'Create a story', created.title]) expect(results.querySelector(`button[aria-label="${label}"]`)).toBeTruthy();
    await click(results.querySelector(`button[aria-label="${created.title}"]`), 'the story in Search', 60);
    expect(address()).toBe(`/app/?story=${created.id}`);
    expect(worldInfo()).toBeTruthy();

    const menus = footer()!;
    expect(document.body.textContent).not.toContain('Library Help');
    await click(buttonByText('Support', menus), 'Support');
    await click(buttonByText('Help', menus), 'Help in the footer', 60);
    expect(document.body.textContent).toContain('Library Help');
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    await flush(30);

    await click(buttonByText('Privacy', footer()!), 'Privacy', 30);
    const page = document.querySelector('[data-legal-document="privacy"]');
    expect(page?.getAttribute('data-legal-status')).toBe('placeholder');
    expect(page?.querySelector('[role="note"]')?.textContent).toContain('Draft placeholder');
  });

  it('keeps the music note in the header on laptops, where the sidebar and the rail replace the bars', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 1024px)', media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    await render(appServices(scriptedWriter().writer));
    expect(headerNote()).toBeTruthy();
    expect(floatingNote()).toBeNull();
    await click(buttonByText('Create', document.querySelector<HTMLElement>('nav[aria-label="Library pathways"]')!), 'Create in the sidebar', 20);
    expect(address()).toBe('/app/?page=create');
    expect(headerNote()).toBeTruthy();
    expect(floatingNote()).toBeNull();
  });

  it('opens the laptop sidebar the way the reader left it on this device', async () => {
    const services = appServices(scriptedWriter().writer);
    services.readerPreferences.write(LIBRARY_SIDEBAR_MODE_KEY, 'compact');
    await render(services);
    expect(document.querySelector('[data-sidebar-mode]')?.getAttribute('data-sidebar-mode')).toBe('compact');
    expect(window.localStorage.getItem(`${NOVEL_EXPANDED_STORAGE.readerPreferences}${LIBRARY_SIDEBAR_MODE_KEY}`)).toBe('compact');
  });
});

describe('NovelExpanded: Create', { timeout: 30_000 }, () => {
  it('keeps the access token on this device: leaving Create and coming back does not ask again', async () => {
    const record = createMockStorySeedRecord({ userId: NOVEL_EXPANDED_READER_ID });
    const { blueprint, ...withoutBlueprint } = record;
    const seeds = createLocalStorySeedRepository({ storageKey: 'test-novelexpanded-seeds' });
    seeds.reset([withoutBlueprint]);
    const requestWorldBlueprint = vi.fn(async (_payload: unknown, _accessToken: string) => blueprint!);
    const services = appServices(scriptedWriter().writer, { storySeeds: seeds, requestWorldBlueprint: requestWorldBlueprint as unknown as NovelExpandedServices['requestWorldBlueprint'] });
    await render(services, '/app/');
    const sheet = () => document.querySelector<HTMLFormElement>('[data-testid="access-token-sheet"]');
    const blueprintFromTheBank = async () => {
      await click(buttonByText('Carve New Destiny', container), 'Carve New Destiny', 20);
      await click(buttonByText('Story Bank', container), 'Story Bank', 200);
      await click(buttonByText('Use Seed', container), 'Use Seed', 200);
      await click(buttonByText('Refine Details', container), 'Refine Details', 200);
      await click([...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Manifest World Blueprint') && !button.disabled), 'Manifest World Blueprint', 20);
    };

    await blueprintFromTheBank();
    await typeInto(sheet()!.querySelector('input[type="password"]')!, 'visit-token');
    await click(buttonByText('Continue', sheet()!), 'Continue', 300);
    expect(requestWorldBlueprint).toHaveBeenCalledTimes(1);
    // The Blueprint is written by the model chapters are written with.
    expect((requestWorldBlueprint.mock.calls[0] as unknown[])[3]).toBe('fixture');

    // Leave Create for Home, then come back for another Blueprint.
    await act(async () => { window.history.back(); });
    await flush(30);
    expect(address()).toBe('/app/');
    await blueprintFromTheBank();
    await flush(300);
    expect(sheet()).toBeNull();
    expect(requestWorldBlueprint.mock.calls.map(call => call[1])).toEqual(['visit-token', 'visit-token']);
    // Kept in the app's saved token, which chapters carry too.
    expect(services.accessToken.current).toBe('visit-token');
  });

  it('asks for the access token before a Blueprint, asks again when it is refused, and starts the story on Story View', async () => {
    const record = createMockStorySeedRecord({ userId: NOVEL_EXPANDED_READER_ID });
    const { blueprint, ...withoutBlueprint } = record;
    const seeds = createLocalStorySeedRepository({ storageKey: 'test-novelexpanded-seeds' });
    seeds.reset([withoutBlueprint]);
    const requestWorldBlueprint = vi.fn(async (_payload: unknown, accessToken: string) => {
      if (accessToken !== 'right-token') throw new BlueprintRequestError('A valid Development Story Seed access token is required.', 401);
      return blueprint!;
    });
    const writer = scriptedWriter();
    const services = appServices(writer.writer, { storySeeds: seeds, requestWorldBlueprint: requestWorldBlueprint as unknown as NovelExpandedServices['requestWorldBlueprint'] });
    await render(services, '/app/');
    // Home's Carve New Destiny opens Create.
    await click(buttonByText('Carve New Destiny', container), 'Carve New Destiny', 20);
    expect(address()).toBe('/app/?page=create');

    // The banked seed goes back into Story Seed, then on to a World Blueprint.
    await click(buttonByText('Story Bank', container), 'Story Bank', 200);
    await click(buttonByText('Use Seed', container), 'Use Seed', 200);
    await click(buttonByText('Refine Details', container), 'Refine Details', 200);
    await click([...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Manifest World Blueprint') && !button.disabled), 'Manifest World Blueprint', 20);

    const sheet = () => document.querySelector<HTMLFormElement>('[data-testid="access-token-sheet"]');
    expect(sheet(), 'Expected the access token sheet').toBeTruthy();
    expect(requestWorldBlueprint).not.toHaveBeenCalled();
    await typeInto(sheet()!.querySelector('input[type="password"]')!, 'wrong-token');
    await click(buttonByText('Continue', sheet()!), 'Continue', 20);
    expect(sheet()!.textContent).toContain('That token was not accepted.');
    await typeInto(sheet()!.querySelector('input[type="password"]')!, 'right-token');
    await click(buttonByText('Continue', sheet()!), 'Continue', 300);
    expect(requestWorldBlueprint.mock.calls.map(call => call[1])).toEqual(['wrong-token', 'right-token']);
    expect(sheet()).toBeNull();

    // Manifest Story starts it with the official CAPA skills and shows its Story View.
    await click(buttonByText('Manifest Story', container), 'Manifest Story', 50);
    const [started] = (services.stories as InMemoryHarnessGenerationRepository).snapshot().stories;
    expect(started.skillLoadout).toEqual(createOfficialCapaDefaultLoadout(record.seed.story.required.style));
    expect(address()).toBe(`/app/?story=${started.id}`);
    expect(worldInfo()!.querySelector('h1')!.textContent).toBe(started.title);
    // A Fate Survival story's Chapter 1 waits on the reader's direction, so nothing is written early.
    await flush(20);
    expect(writer.generate).not.toHaveBeenCalled();

    // The started story replaced Create, so the browser's Back goes Home.
    await act(async () => { window.history.back(); });
    await flush(30);
    expect(address()).toBe('/app/');
  });

  it('a Regular story: Manifest Story begins Chapter 1 at once, and Start Story opens it without writing it twice', async () => {
    const record = createMockStorySeedRecord({ userId: NOVEL_EXPANDED_READER_ID });
    record.seed.story.optional.fateSurvival = { ...record.seed.story.optional.fateSurvival, enabled: false };
    const { blueprint, ...withoutBlueprint } = record;
    const seeds = createLocalStorySeedRepository({ storageKey: 'test-novelexpanded-seeds' });
    seeds.reset([withoutBlueprint]);
    const writer = scriptedWriter();
    const services = appServices(writer.writer, { storySeeds: seeds, requestWorldBlueprint: (async () => blueprint!) as unknown as NovelExpandedServices['requestWorldBlueprint'] });
    services.accessToken.current = 'owner-token';
    await render(services, '/app/');
    await click(buttonByText('Carve New Destiny', container), 'Carve New Destiny', 20);
    await click(buttonByText('Story Bank', container), 'Story Bank', 200);
    await click(buttonByText('Use Seed', container), 'Use Seed', 200);
    await click(buttonByText('Refine Details', container), 'Refine Details', 200);
    await click([...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Manifest World Blueprint') && !button.disabled), 'Manifest World Blueprint', 300);
    await click(buttonByText('Manifest Story', container), 'Manifest Story', 50);
    const [started] = (services.stories as InMemoryHarnessGenerationRepository).snapshot().stories;
    expect(address()).toBe(`/app/?story=${started.id}`);
    // Chapter 1 is already being written while the reader looks over the World Card.
    expect(writer.generate).toHaveBeenCalledTimes(1);

    // Start Story finds it still being written: the veil, never a second write; it opens when saved.
    await click(chaptersAction(), 'Start Story', 10);
    expect(document.querySelector('[data-testid="generation-overlay"]')?.textContent).toContain('Chapter 1');
    await act(async () => { writer.release(); });
    await flush(20);
    expect(document.querySelector('[data-chapter-number="1"]')!.textContent).toContain('The tide pulled back from the drowned gate.');
    expect(writer.generate).toHaveBeenCalledTimes(1);
  });

  it('a chapter keeps writing when the reader leaves the Reader, and is there when they come back', async () => {
    const story = scriptedWriter();
    const services = appServices(story.writer);
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
    await render(services);
    await click(container.querySelector(`#home-world-${created.id} button[aria-label^="Open ${created.title}"]`), 'the Home card');
    await click(chaptersAction(), 'Start Story', 10);
    expect(story.generate).toHaveBeenCalledTimes(1);

    // Back out mid-write: the chapter is still being written.
    await click(buttonByText('Back'), 'Back', 10);
    expect(address()).toBe(`/app/?story=${created.id}`);
    await act(async () => { story.release(); });
    await flush(20);
    // Come back: Chapter 1 is there, written once.
    await click(chaptersAction(), 'Continue', 10);
    expect(document.querySelector('[data-chapter-number="1"]')!.textContent).toContain('The tide pulled back from the drowned gate.');
    expect(story.generate).toHaveBeenCalledTimes(1);
  });
});

describe('NovelExpanded: Story Settings and cover art', { timeout: 30_000 }, () => {
  it('Create\'s Settings holds the story\'s CAPA skills and media; what the reader changes there is the new story\'s', async () => {
    const record = createMockStorySeedRecord({ userId: NOVEL_EXPANDED_READER_ID });
    record.seed.story.optional.fateSurvival = { ...record.seed.story.optional.fateSurvival, enabled: false };
    const { blueprint, ...withoutBlueprint } = record;
    const seeds = createLocalStorySeedRepository({ storageKey: 'test-novelexpanded-seeds' });
    seeds.reset([withoutBlueprint]);
    const writer = scriptedWriter();
    const services = appServices(writer.writer, { storySeeds: seeds, requestWorldBlueprint: (async () => blueprint!) as unknown as NovelExpandedServices['requestWorldBlueprint'] });
    services.accessToken.current = 'owner-token';
    await render(services, '/app/?page=create');

    // Story Seed's Settings: the language and Reading Mode, then the skills and media the story starts with.
    const bar = document.querySelector<HTMLElement>('nav[aria-label="Story Seed navigation"]')!;
    await click(buttonByText('Settings', bar), 'Settings on the task bar', 50);
    const settings = document.querySelector<HTMLElement>('[data-testid="create-story-settings"]');
    expect(settings, 'Expected Story Settings in Create').toBeTruthy();
    const pacing = settings!.querySelector<HTMLSelectElement>('#harness-skill-pacing')!;
    expect(pacing.value).not.toBe('');
    // The reader takes Pacing off; the choice waits on this device until Manifest.
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(pacing, '');
      pacing.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush(20);
    expect(readStorySettingsDraft(services.readerPreferences)).toEqual({ skills: { pacing: null } });
    await click(document.querySelector('button[aria-label="Close settings"]'), 'Close settings', 50);

    await click(buttonByText('Story Bank', container), 'Story Bank', 200);
    await click(buttonByText('Use Seed', container), 'Use Seed', 200);
    await click(buttonByText('Refine Details', container), 'Refine Details', 200);
    await click([...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Manifest World Blueprint') && !button.disabled), 'Manifest World Blueprint', 300);
    await click(buttonByText('Manifest Story', container), 'Manifest Story', 50);
    const [started] = (services.stories as InMemoryHarnessGenerationRepository).snapshot().stories;
    const { pacing: _pacing, ...withoutPacing } = createOfficialCapaDefaultLoadout(record.seed.story.required.style);
    expect(started.skillLoadout).toEqual(withoutPacing);
    // The draft became the story's; the next story starts from its own defaults.
    expect(readStorySettingsDraft(services.readerPreferences)).toEqual({});
  });

  it('a Create draft naming a pack no longer unlocked starts the story with the Library\'s own sounds', async () => {
    const services = appServices(scriptedWriter().writer);
    writeStorySettingsDraft(services.readerPreferences, { media: { soundCues: { id: 'gone-pack', version: '1.0.0' } } });
    const controller = new HarnessGenerationController({ repository: services.stories, modelAdapter: services.writer, installedSkills: officialSkills });
    await controller.hydrate();
    const record = regularSeedRecord();
    const story = await startHarnessStoryFromSeed(controller, buildInitialStoryGenerationPayload(record.seed, createStoryAdministrativeMetadata({
      storyId: 'story-1', creatorId: record.userId, sourceSeedId: record.id, originalLanguage: 'en',
    }), record.blueprint!, 10), { draft: readStorySettingsDraft(services.readerPreferences), installedSkills: officialSkills });
    expect(story.mediaLoadout).toBeUndefined();
    expect(story.skillLoadout).toEqual(createOfficialCapaDefaultLoadout(record.seed.story.required.style));
  });

  it('Story View makes a cover with the Router\'s image model, keeps it on the device, and Home wears it', async () => {
    // jsdom has no object URLs; a browser shows the kept image through one.
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:cover-1'), revokeObjectURL: vi.fn() });
    writeModelPreference('images', 'google/gemini-3-pro-image');
    const storyCovers = createMemoryStoryCoverStore();
    const requestStoryCover = vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
    const writer = scriptedWriter();
    const services = appServices(writer.writer, { storyCovers, requestStoryCover });
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, writer.writer);
    await render(services, `/app/?story=${created.id}`);

    // The cover itself says Manifest; one cover is made and worn.
    await click(worldInfo()!.querySelector('[aria-label="Manifest cover art"]'), 'Manifest on the cover', 20);
    await click(document.querySelector('.story-cover-option[data-count="1"]'), 'One cover', 20);
    expect(requestStoryCover).toHaveBeenCalledTimes(1);
    expect(requestStoryCover).toHaveBeenCalledWith(expect.objectContaining({ title: created.title }), { model: 'google/gemini-3-pro-image', accessToken: undefined });
    expect((await storyCovers.loadAll()).map(cover => cover.storyId)).toEqual([created.id]);
    expect(worldInfo()!.querySelector('[data-world-card="info-cover"] img')?.getAttribute('src')).toBe('blob:cover-1');

    await click(document.querySelector('button[aria-label="Back to your stories"]'), 'Back to your stories', 20);
    expect(container.querySelector(`#home-world-${created.id} img`)?.getAttribute('src')).toBe('blob:cover-1');
  });

  it('asks for the access token once when three covers reach the visitor limit, then makes all three with it', async () => {
    let made = 0;
    Object.assign(URL, { createObjectURL: vi.fn(() => `blob:cover-${++made}`), revokeObjectURL: vi.fn() });
    const requestStoryCover = vi.fn(async (_story: unknown, options?: { accessToken?: string }) => {
      if (!options?.accessToken) throw new StoryCoverRequestError('This Development action has reached its temporary request limit.', 429);
      return new Blob([new Uint8Array([1])], { type: 'image/png' });
    });
    const writer = scriptedWriter();
    const services = appServices(writer.writer, { requestStoryCover: requestStoryCover as unknown as NovelExpandedServices['requestStoryCover'] });
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, writer.writer);
    await render(services, `/app/?story=${created.id}`);
    await click(worldInfo()!.querySelector('[aria-label="Manifest cover art"]'), 'Manifest on the cover', 20);
    await click(document.querySelector('.story-cover-option[data-count="3"]'), 'Three to choose from', 20);
    const sheet = document.querySelector<HTMLFormElement>('[data-testid="access-token-sheet"]')!;
    expect(sheet.textContent).toContain('covers are limited to 3 every 30 minutes');
    await typeInto(sheet.querySelector('input[type="password"]')!, 'owner-token');
    await click(buttonByText('Continue', sheet), 'Continue', 50);
    // Asked for once; the three refused are asked for again with the token.
    expect(requestStoryCover.mock.calls.map(call => call[1]?.accessToken)).toEqual([undefined, undefined, undefined, 'owner-token', 'owner-token', 'owner-token']);
    expect(services.accessToken.current).toBe('owner-token');
    expect(document.querySelectorAll('.story-cover-choice')).toHaveLength(3);
  });
});

describe('NovelExpanded: the Profile', { timeout: 30_000 }, () => {
  const cave = () => document.querySelector<HTMLElement>('[data-testid="novel-expanded-profile"]');
  const recall = (name = 'Quill') => document.querySelector<HTMLButtonElement>(`.workspace-header [aria-label="Show ${name} actions"]`);
  const companion = () => document.querySelector<HTMLElement>('.familiar-companion');
  const summon = async (name = 'Quill') => {
    await click(recall(name), `the ${name} recall`);
    await click(document.querySelector('[aria-label="Expand Familiar"]'), 'Expand Familiar');
  };

  it('opens the Cave from the navigation, on the practice account, inside the app\'s places', async () => {
    await render(appServices(scriptedWriter().writer));
    await click(buttonByText('Profile', strip()!), 'Profile in the navigation', 100);
    expect(address()).toBe('/app/?page=profile&cave=%2Fhome');
    expect(cave()).toBeTruthy();
    // The Cave draws the Library's navigation itself, with the app's places.
    expect([...strip()!.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Home', 'Create', 'Profile']);
    expect(strip()!.querySelector('[aria-current="page"]')?.textContent).toBe('Profile');
    // The practice account opens with the most QI a tester could want.
    expect(cave()!.querySelector('[data-cave-qi]')?.textContent).toBe('1,000,000 to spend');
    // The music note floats above the Cave's bar on a phone, and the Familiar's recall sits in its header.
    expect(floatingNote()).toBeTruthy();
    expect(recall()).toBeTruthy();
    // The Cave's logo goes Home, and so does Home in the navigation.
    expect(document.querySelector<HTMLAnchorElement>('.workspace-header a[aria-label="Return to Library"]')?.getAttribute('href')).toBe('/app/');
    await click(buttonByText('Home', strip()!), 'Home in the navigation');
    expect(address()).toBe('/app/');
    expect(document.querySelector('[data-testid="novel-expanded-home"]')).toBeTruthy();
  });

  it('Settings keeps the reader\'s choices on the device; what needs a server says it is not in the app yet', async () => {
    const services = appServices(scriptedWriter().writer);
    await render(services, '/app/?page=profile&cave=/settings', undefined);
    await flush(100);
    expect(cave()!.querySelector('[data-cave-settings]')).toBeTruthy();
    // Account and server pieces still show, each disabled with the note.
    const notes = [...cave()!.querySelectorAll('[data-cave-not-yet-built]')].map(note => note.textContent);
    expect(notes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(notes)).toEqual(new Set(['Not in the app yet.']));
    for (const name of ['Sever Link', 'Redeem Code', 'Shortcuts', 'Aether Router', 'Import Scroll']) {
      expect(buttonByText(name, cave()!)?.disabled, name).toBe(true);
    }
    // Every Familiar is unlocked on the practice account; choosing one equips it everywhere at once.
    await click(buttonByText('Select Phoenix', cave()!), 'Select Phoenix', 20);
    expect(services.profile.read().familiarId).toBe('phoenix');
    expect(recall('Phoenix')).toBeTruthy();
    expect(recall('Quill')).toBeNull();
  });

  it('makes the profile picture from the reader\'s photo: three to choose from, the chosen one kept on the device', async () => {
    let n = 0;
    const requestProfilePicture = vi.fn(async () => new Blob([new Uint8Array([++n])], { type: 'image/png' }));
    const services = appServices(scriptedWriter().writer, { requestProfilePicture, accessToken: { current: 'owner-token' } });
    await render(services, '/app/?page=profile&cave=/home', undefined);
    await flush(100);
    await click(cave()!.querySelector('[data-cave-portrait] button'), 'the portrait', 20);
    const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog().textContent).toContain('Profile picture');
    expect(dialog().textContent).not.toContain('Divine Mirror');
    const make = () => [...dialog().querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Make my portraits'));
    // A photo first; the cost shows beside the button.
    expect(make()?.disabled).toBe(true);
    expect(dialog().querySelector('.energy-action-cost')?.textContent).toBe('15');
    const input = dialog().querySelector<HTMLInputElement>('[data-portrait-photo]')!;
    Object.defineProperty(input, 'files', { value: [new File(['me'], 'me.jpg', { type: 'image/jpeg' })], configurable: true });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await flush(20);
    await click(make(), 'Make my portraits', 50);
    expect(requestProfilePicture).toHaveBeenCalledTimes(3);
    expect(requestProfilePicture).toHaveBeenCalledWith({ data: btoa('me'), mimeType: 'image/jpeg' }, expect.objectContaining({ accessToken: 'owner-token' }));
    const choices = [...dialog().querySelectorAll<HTMLButtonElement>('.portrait-builder-choice')];
    expect(choices).toHaveLength(3);
    expect(dialog().querySelectorAll('.portrait-builder-download')).toHaveLength(3);
    expect(dialog().querySelector('[data-energy-spend]')?.getAttribute('data-energy-spend')).toBe('15');
    await click(choices[1], 'the second portrait');
    await click(buttonByText('Use this portrait', dialog()), 'Use this portrait', 50);
    expect(services.profile.read().avatarUrl).toBe(`data:image/png;base64,${btoa(String.fromCharCode(2))}`);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(cave()!.querySelector('[data-cave-portrait] img')?.getAttribute('src')).toBe(services.profile.read().avatarUrl);
  });

  it('a new Story Seed in Create starts from the profile\'s reading language and Reading Mode', async () => {
    const services = appServices(scriptedWriter().writer);
    services.profile.save({ defaultReadingLanguage: 'ja', defaultChapterWritingStyle: 'Easy Read' });
    await render(services, '/app/?page=create');
    await click(buttonByText('Save Draft') ?? buttonByText('Saved'), 'Save Draft', 200);
    const saved = await services.storySeeds.list(NOVEL_EXPANDED_READER_ID);
    expect(saved.map(record => [record.originalLanguage, record.seed.story.optional.chapterWritingStyle])).toEqual([['ja', 'Easy Read']]);
  });

  it('one Familiar for the app: summoned once, it stays from page to page, and keeps out of the Reader', async () => {
    const story = scriptedWriter();
    const services = appServices(story.writer);
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
    await render(services);
    // It starts minimized, its recall in the header.
    expect(companion()).toBeNull();
    await summon();
    expect(companion()).toBeTruthy();
    expect(recall()).toBeNull();
    // Profile and Create keep the same companion.
    const summoned = companion();
    await click(buttonByText('Profile', strip()!), 'Profile in the navigation', 50);
    expect(companion()).toBe(summoned);
    await click(buttonByText('Home', strip()!), 'Home in the navigation');
    // The Reader is immersive: no Familiar and no recall.
    await click(container.querySelector(`#home-world-${created.id} button[aria-label^="Open ${created.title}"]`), 'the Home card');
    await click(chaptersAction(), 'Start Story', 10);
    expect(document.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
    expect(companion()).toBeNull();
    expect(recall()).toBeNull();
    await act(async () => { story.release(); });
    await flush(10);
  });
});

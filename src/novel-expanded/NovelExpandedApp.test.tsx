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
import { createLocalStorySeedRepository } from '../host/story-seed/localStorySeedRepository';
import { startHarnessStoryFromSeed } from '../host/story-seed/startHarnessStory';
import { createLocalReaderPreferenceStorage } from '../host/reader/readerPreferenceStorage';
import { createHostReaderMixer } from '../host/reader/readerMixer';
import { installFakeSpeechSynthesis } from '../test-utils/fakeSpeechSynthesis';
import { NovelExpandedApp } from './NovelExpandedApp';
import { NOVEL_EXPANDED_STORAGE, type NovelExpandedServices } from './services';
import { NOVEL_EXPANDED_READER_ID } from './storyCreationRuntime';

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
    recoverMemory,
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

const appServices = (writer: HarnessGenerationModelAdapter, overrides: Partial<NovelExpandedServices> = {}): NovelExpandedServices => ({
  stories: new InMemoryHarnessGenerationRepository(),
  readerState: new MemoryReaderStateRepository(),
  readerPreferences: createLocalReaderPreferenceStorage(NOVEL_EXPANDED_STORAGE.readerPreferences),
  storySeeds: createLocalStorySeedRepository({ storageKey: 'test-novelexpanded-seeds' }),
  writer,
  installSkills: async () => officialSkills,
  requestWorldBlueprint: vi.fn(),
  accessToken: { current: undefined },
  ...overrides,
});

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
const render = async (services: NovelExpandedServices, url = '/app/') => {
  window.history.replaceState(null, '', url);
  await act(async () => root.render(<NovelExpandedApp services={services} readerMixer={createHostReaderMixer(services.readerPreferences)} />));
  await flush(20);
};
const typeInto = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  installAudioMediaStubs();
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

  it('opens a story from Home, starts it under the veil, and walks back with the app and the browser', async () => {
    const story = scriptedWriter();
    const services = appServices(story.writer);
    const created = await startedStory(services.stories as InMemoryHarnessGenerationRepository, story.writer);
    // The Model Router's chapter model is the one choice shared with the Workshop.
    writeModelPreference('chapters', 'remembered');
    await render(services);

    await click(container.querySelector(`#home-world-${created.id} button[aria-label^="Open ${created.title}"]`), 'the Home card');
    expect(address()).toBe(`/app/?story=${created.id}`);
    expect(worldInfo()!.querySelector('h1')!.textContent).toBe(created.title);

    // Start Story opens the Reader and writes Chapter 1 under VERSA's veil.
    await click(chaptersAction(), 'Start Story', 10);
    expect(address()).toBe(`/app/?story=${created.id}&read=1`);
    expect(document.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
    expect(document.querySelector('img[alt="VERSA"]')?.closest('.fixed')?.textContent).toContain('Chapter 1');
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
    expect(chaptersAction()!.textContent).toContain('Continue · Ch. 1');

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
    const services = appServices(scriptedWriter().writer, { storySeeds: seeds, requestWorldBlueprint: requestWorldBlueprint as unknown as NovelExpandedServices['requestWorldBlueprint'] });
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

    // The started story replaced Create, so the browser's Back goes Home.
    await act(async () => { window.history.back(); });
    await flush(30);
    expect(address()).toBe('/app/');
  });
});

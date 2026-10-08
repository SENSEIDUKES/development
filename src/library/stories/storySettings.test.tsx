// @vitest-environment jsdom
import { act, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../test-utils/writtenChapter';
import { installAudioMediaStubs, renderWithDevAudio } from '../../test-utils/renderWithDevAudio';
import { findStory, HarnessGenerationController, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import {
  applyStorySettingsDraft, readStorySettingsDraft, StoryPages, storyCoverRequest, storyHomeWorlds, useLibraryStories, writeStorySettingsDraft,
  STORY_SETTINGS_DRAFT_KEY, type LibraryStories, type StoryCoverService,
} from '@seihouse/library/stories';
import { COVER_REVEAL_HOLD_MS } from './StoryCoverManifest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VERSA = { id: 'versa', name: 'VERSA', logoUrl: '/versa.png', colorClass: 'text-human' };
const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 30 }] };
const receipt = { provider: 'gemini' as const, model: 'fixture', generatedAt: '2026-10-08T12:00:00.000Z', usage: { source: 'unavailable' as const } };

/** A writer whose chapter waits until the test releases it, so a chapter can be "being written". */
const gatedWriter = () => {
  let release = () => undefined as void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }], defaultModel: 'fixture' }),
    generate: (async () => {
      await gate;
      return { rawProviderResponse: JSON.stringify(writtenChapter({
        title: 'Low Tide', paragraphs: ['The tide pulled back from the drowned gate.'],
        arcCompletion: { goalId: 'arc-1-name', completed: false, evidence: '' }, recap: 'Mara returns.', chapterFunction: 'progression',
        nextProgression: 'Mara climbs.', nextWorldBuilding: 'The keeper speaks.', nextConflict: 'The wardens come.',
      })), providerReceipt: receipt };
    }) as unknown as HarnessGenerationModelAdapter['generate'],
    arcOperation: async () => ({ rawProviderResponse: JSON.stringify({ plan: GOAL, destinedEnding: 'Mara reclaims her name.' }), providerReceipt: receipt }),
  };
  return { adapter, release: () => release() };
};

const createStory = async (repository: InMemoryHarnessGenerationRepository, adapter: HarnessGenerationModelAdapter) => {
  const setup = new HarnessGenerationController({ repository, modelAdapter: adapter });
  await setup.hydrate();
  return setup.createStory({
    title: 'The Drowned Name', premise: 'A courier returns to the drowned city that erased her name.', genre: 'Xianxia',
    destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL,
    cast: [{ name: 'Mara', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
  });
};

let latest: LibraryStories | undefined;
let latestCovers: StoryCoverService | undefined;
function Host({ repository, adapter, storyId, makeCover }: {
  repository: InMemoryHarnessGenerationRepository; adapter: HarnessGenerationModelAdapter; storyId: string;
  /** The host's cover maker; the host keeps what it makes, as the app does. */
  makeCover?: StoryCoverService['manifest'];
}) {
  const stories = useLibraryStories({ repository, modelAdapter: adapter });
  latest = stories;
  const [urls, setUrls] = useState<Record<string, string>>({});
  const covers = useMemo<StoryCoverService | undefined>(() => makeCover && {
    coverUrl: id => urls[id],
    manifest: async (id, request) => {
      const url = await makeCover(id, request);
      setUrls(current => ({ ...current, [id]: url }));
      return url;
    },
  }, [makeCover, urls]);
  latestCovers = covers;
  return <StoryPages stories={stories} storyId={storyId} page="info" writingAgent={VERSA} covers={covers}
    onOpenReader={() => undefined} onCloseReader={() => undefined} onBack={() => undefined} />;
}

let container: HTMLDivElement;
let root: Root;
const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const click = async (element: HTMLElement | null | undefined, label: string) => {
  expect(element, `Expected ${label}`).toBeTruthy();
  await act(async () => { element!.click(); });
  await flush();
};
const settings = () => container.querySelector<HTMLElement>('[data-testid="story-view-settings"]');
const buttonByText = (text: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === text);
const select = async (element: HTMLSelectElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await flush();
};

beforeEach(() => {
  installAudioMediaStubs();
  latest = undefined;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); });

describe('Story Settings on Story View', () => {
  it('opens to the story\'s language, Reading Mode, CAPA skills and media, and saves a Reading Mode for the chapters to come', async () => {
    const writer = gatedWriter();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createStory(repository, writer.adapter);
    await act(async () => root.render(renderWithDevAudio(<Host repository={repository} adapter={writer.adapter} storyId={story.id} />)));
    await flush();

    // Closed until the reader opens it, so World Info stays about the story.
    const toggle = settings()!.querySelector<HTMLButtonElement>('button[aria-expanded]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[data-testid="story-settings"]')).toBeNull();
    await click(toggle, 'Story Settings');

    expect(container.querySelector('[data-testid="story-settings-language"]')!.textContent).toBe('English');
    // Hand-equipped slots offer the installed skills; managed slots say what fills them.
    expect(container.querySelector('#harness-skill-author')).toBeTruthy();
    expect(container.querySelector('[data-testid="harness-fate-slot"]')!.getAttribute('data-status')).toBe('Not used');
    // The developer page's inspection stays there.
    expect(container.querySelector('[data-testid="harness-official-requirements"]')).toBeNull();
    expect(settings()!.textContent).not.toContain('View skill instructions');
    // No other packs: the Library's own sounds play.
    expect(container.querySelector('[data-testid="story-media-soundCues-default"]')!.textContent).toContain('The Library\'s own Sound Cues');

    await select(container.querySelector<HTMLSelectElement>('[data-testid="story-settings"] select')!, 'Easy Read');
    expect(findStory(latest!.state!, story.id)!.chapterWritingStyle).toBe('Easy Read');
  });

  it('waits while a chapter is being written, and says so', async () => {
    const writer = gatedWriter();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createStory(repository, writer.adapter);
    await act(async () => root.render(renderWithDevAudio(<Host repository={repository} adapter={writer.adapter} storyId={story.id} />)));
    await flush();
    await click(settings()!.querySelector<HTMLButtonElement>('button[aria-expanded]'), 'Story Settings');

    let writing: Promise<void> | undefined;
    await act(async () => { writing = latest!.generateNextChapter(story.id); });
    await flush();
    expect(container.querySelector('[data-testid="story-settings-writing"]')!.textContent).toContain('A chapter is being written');
    expect(container.querySelector<HTMLSelectElement>('[data-testid="story-settings"] select')!.disabled).toBe(true);

    await act(async () => { writer.release(); await writing; });
    await flush();
    expect(container.querySelector('[data-testid="story-settings-writing"]')).toBeNull();
    expect(container.querySelector<HTMLSelectElement>('[data-testid="story-settings"] select')!.disabled).toBe(false);
  });
});

describe('Cover art on Story View', () => {
  it('Manifest cover makes one behind the media reveal; World Info and Home then wear it', async () => {
    const writer = gatedWriter();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createStory(repository, writer.adapter);
    let finish: (url: string) => void = () => undefined;
    const manifest = vi.fn((_storyId: string) => new Promise<string>(resolve => { finish = resolve; }));
    await act(async () => root.render(renderWithDevAudio(<Host repository={repository} adapter={writer.adapter} storyId={story.id} makeCover={manifest} />)));
    await flush();

    await click(buttonByText('Manifest cover'), 'Manifest cover');
    // The cover is made from the story's own words.
    expect(manifest).toHaveBeenCalledWith(story.id, expect.objectContaining({ title: 'The Drowned Name', genre: 'Xianxia', mainCharacter: 'Mara' }));
    // The media reveal: the scroll unseals while the cover is made.
    const overlay = container.querySelector('[data-testid="generation-overlay"]');
    expect(overlay).toBeTruthy();
    expect(container.querySelector('[data-reveal-state="unsealing"], [data-state="unsealing"]')).toBeTruthy();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    await act(async () => { finish('blob:cover-1'); });
    await flush();
    // The scroll opens on the finished cover.
    expect(container.querySelector('image[href="blob:cover-1"]')).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(COVER_REVEAL_HOLD_MS + 2_000); });
    await flush(50);
    vi.useRealTimers();

    expect(container.querySelector<HTMLImageElement>('[data-world-card="info"] img')?.getAttribute('src')).toBe('blob:cover-1');
    expect(buttonByText('New cover')).toBeTruthy();
    expect(storyHomeWorlds(latest!.state!, latestCovers)[0].imageUrl).toBe('blob:cover-1');
  });

  it('says why a cover could not be made, and World Info keeps going without one', async () => {
    const writer = gatedWriter();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createStory(repository, writer.adapter);
    const failing = vi.fn(async (): Promise<string> => { throw new Error('The cover could not be made. Nothing was changed; please try again.'); });
    await act(async () => root.render(renderWithDevAudio(<Host repository={repository} adapter={writer.adapter} storyId={story.id} makeCover={failing} />)));
    await flush();
    await click(buttonByText('Manifest cover'), 'Manifest cover');
    await flush();
    expect(container.querySelector('[data-testid="story-cover"] [role="alert"]')!.textContent).toContain('Nothing was changed');
    expect(buttonByText('Manifest cover')!.disabled).toBe(false);
  });

  it('builds the request from the story alone: title, genre, premise and main character', async () => {
    const writer = gatedWriter();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createStory(repository, writer.adapter);
    const controller = new HarnessGenerationController({ repository, modelAdapter: writer.adapter });
    await controller.hydrate();
    expect(storyCoverRequest(controller.snapshot(), story.id)).toEqual({
      title: 'The Drowned Name', genre: 'Xianxia', synopsis: 'A courier returns to the drowned city that erased her name.', mainCharacter: 'Mara',
    });
    expect(storyCoverRequest(controller.snapshot(), 'gone')).toBeUndefined();
  });
});

describe('The Create draft of Story Settings', () => {
  const memory = (): ReaderPreferenceStorage & { values: Map<string, string> } => {
    const values = new Map<string, string>();
    return { values, read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
  };
  const AUTHOR = { id: 'author', version: '1.0.0' };
  const PACING = { id: 'pacing', version: '1.0.0' };
  const BRISK = { id: 'brisk', version: '2.0.0' };

  it('keeps only what the reader changed, on the device, and an empty draft leaves nothing behind', () => {
    const storage = memory();
    writeStorySettingsDraft(storage, { skills: { pacing: BRISK, continuity: null }, media: { soundCues: { id: 'tower', version: '1.0.0' } } });
    expect(readStorySettingsDraft(storage)).toEqual({ skills: { pacing: BRISK, continuity: null }, media: { soundCues: { id: 'tower', version: '1.0.0' } } });
    writeStorySettingsDraft(storage, {});
    expect(storage.values.has(STORY_SETTINGS_DRAFT_KEY)).toBe(false);
  });

  it('reads a damaged or hand-edited draft as no change', () => {
    const storage = memory();
    storage.write(STORY_SETTINGS_DRAFT_KEY, '{not json');
    expect(readStorySettingsDraft(storage)).toEqual({});
    storage.write(STORY_SETTINGS_DRAFT_KEY, JSON.stringify({ skills: { pacing: { id: 7 } }, media: { soundscapes: 'tower' } }));
    expect(readStorySettingsDraft(storage)).toEqual({});
  });

  it('puts the reader\'s changes over the story\'s defaults, never empties Author, and skips a skill no longer installed', () => {
    const defaults = { author: AUTHOR, pacing: PACING, continuity: { id: 'continuity', version: '1.0.0' } };
    expect(applyStorySettingsDraft(defaults, { skills: { pacing: BRISK, continuity: null, author: null } }, [AUTHOR, PACING, BRISK]))
      .toEqual({ author: AUTHOR, pacing: BRISK });
    expect(applyStorySettingsDraft(defaults, { skills: { pacing: BRISK } }, [AUTHOR, PACING])).toEqual(defaults);
  });
});

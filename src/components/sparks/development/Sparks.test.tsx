// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryLook, LibraryPresentationProvider } from '@seihouse/library/presentation';
import type { StorySpark, StorySparkRequest } from '@seihouse/sen/story-seed';
import type { SparkHost } from '../shared/SparkHost';
import { SparksButton } from './SparksButton';
import { HAND_SPARKS, handSpark } from '../shared/builtInSparks';

vi.mock('@seihouse/library-ui', async importOriginal => ({ ...await importOriginal<typeof import('@seihouse/library-ui')>(), ParticleEffect: () => null }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  MotionGlobalConfig.skipAnimations = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.stubGlobal('matchMedia', (query: string) => ({ media: query, matches: false,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); document.body.innerHTML = '';
  MotionGlobalConfig.skipAnimations = false; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const settle = async (ms = 50) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const click = async (element: Element | null | undefined) => {
  expect(element).toBeTruthy();
  await act(async () => { (element as HTMLElement).click(); });
};
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Sparks"]')!;
const button = (pattern: RegExp) => Array.from(dialog().querySelectorAll('button')).find(item => pattern.test(item.textContent ?? '') || pattern.test(item.getAttribute('aria-label') ?? ''));
const type = async (element: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
};

const trigger = () => document.querySelector<HTMLButtonElement>('button[aria-label="Sparks: story ideas"]');
const open = async (host?: SparkHost, purpose?: 'new-seed' | 'fill-seed') => {
  await act(async () => root.render(<LibraryPresentationProvider>
    <SparksButton host={host} purpose={purpose} />
  </LibraryPresentationProvider>));
  await settle();
  await click(trigger());
  await settle();
};

/** Choose a genre path the way a writer does: open Story Seed's path picker, then the path. */
const choosePath = async (name: RegExp) => {
  await click(button(/Pick a path$/));
  await click(Array.from(dialog().querySelectorAll('[role="radio"], button[aria-pressed], button[aria-expanded]'))
    .find(item => name.test(item.textContent ?? '')));
};

it('works as a standalone SEN surface without a Library presentation provider', async () => {
  const beginSpark = vi.fn(async (_spark: StorySpark) => {});
  await act(async () => root.render(<SparksButton host={{ beginSpark }} />));
  await click(trigger());
  await settle();
  expect(dialog().textContent).toContain('Protagonist');
  expect(dialog().closest('.library-look')).toBeNull();
  await choosePath(/Regression/);
  await click(button(/Seek a spark/));
  await settle(1100);
  await click(button(/Use this spark/));
  expect(beginSpark).toHaveBeenCalledWith(expect.objectContaining({ genre: 'Regression' }));
});

it('keeps the overlay within the host look so saved appearance reaches portaled content', async () => {
  await act(async () => root.render(<LibraryPresentationProvider>
    <LibraryLook accentColor="#55aaff"><SparksButton /></LibraryLook>
  </LibraryPresentationProvider>));
  await settle();
  await click(trigger());
  await settle();
  expect(dialog().closest('.library-look')).toBe(trigger()?.closest('.library-look'));
  expect(dialog().closest<HTMLElement>('.library-appearance-scope')?.style.getPropertyValue('--library-accent')).toBe('#55aaff');
});

const modelSpark = (request: StorySparkRequest): StorySpark => ({
  premise: request.idea ? `Shaped: ${request.idea}` : 'A model premise.',
  genre: request.inventGenre ? 'Echo Cultivation' : request.genre,
  title: 'The Tested Path', style: 'korean', survival: Boolean(request.fateSurvival),
  inventedGenre: Boolean(request.inventGenre),
  ...(request.inventGenre ? { genreNote: 'Techniques are sounds.' } : {}),
  aside: 'Hm. Hm.', voice: 'Elder of Tests',
});

it('has every Story Seed genre among its own sparks, and invented ones besides', () => {
  const genres = new Set(HAND_SPARKS.filter(item => !item.inventedGenre).map(item => item.genre));
  expect(genres.size).toBe(15);
  expect(HAND_SPARKS.some(item => item.inventedGenre && item.genreNote)).toBe(true);
  const current = handSpark({ genre: 'Regression' });
  expect(handSpark({ genre: 'Regression' }, current).premise).not.toBe(current.premise);
});

it('offers two modes and the genre first, then asks the host for a spark in the chosen genre', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  expect(button(/^Random/)?.getAttribute('aria-pressed')).toBe('true');
  expect(button(/^Custom/)).toBeTruthy();
  expect(dialog().textContent).toContain('Any genre');
  await click(button(/Pick a path$/));
  expect(dialog().querySelector('[role="radiogroup"][aria-label="Story paths"]')).toBeTruthy();
  expect(dialog().textContent).toContain('Invent a genre');
  await click(Array.from(dialog().querySelectorAll('[role="radio"]')).find(item => item.textContent?.includes('Tower Climb')));
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ genre: 'Tower Climb' }), expect.any(AbortSignal), expect.any(Function));
  expect(dialog().textContent).toContain('A model premise.');
  expect(dialog().textContent).not.toContain('Elder of Tests');
  expect(dialog().textContent).not.toContain('Hm. Hm.');
  expect(dialog().querySelector('[aria-label="Origin this spark plants"]')).toBeNull();
});

it('Custom shapes the writer\'s own beginning in the genre, and needs one first', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  await click(button(/^Custom/));
  await click(button(/Shape my premise/));
  expect(dialog().querySelector('[role="alert"]')?.textContent).toMatch(/beginning of your idea/);
  expect(requestSpark).not.toHaveBeenCalled();
  await type(dialog().querySelector('textarea')!, 'a sword that writes letters');
  await click(button(/Shape my premise/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ idea: 'a sword that writes letters' }), expect.any(AbortSignal), expect.any(Function));
  expect(dialog().textContent).toContain('Shaped: a sword that writes letters');
});

it('conjures a genre: the spark names it and says how it reads', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  await choosePath(/Invent a genre/);
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ inventGenre: true }), expect.any(AbortSignal), expect.any(Function));
  expect(dialog().textContent).toContain('Echo Cultivation');
  expect(dialog().textContent).not.toContain('Conjured genre');
  expect(dialog().textContent).toContain('Techniques are sounds.');
});

it('a writer\'s own genre steers the spark, with or without a model', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  await choosePath(/Define My Own Path/);
  const input = dialog().querySelector<HTMLInputElement>('#dao-genre-custom-input')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(input, 'Noodle Cultivation'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ genre: 'Noodle Cultivation' }), expect.any(AbortSignal), expect.any(Function));
  expect(dialog().textContent).toContain('Noodle Cultivation');
});

it('keeps Sparks focused on beginnings without a Survival control or request', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  expect(dialog().querySelector('h2')?.textContent).toBe('Sparks');
  expect(dialog().querySelector('[role="switch"]')).toBeNull();
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledTimes(1);
  expect(requestSpark.mock.calls[0][0]).not.toHaveProperty('fateSurvival');
  expect(dialog().textContent).not.toContain('Fate Survival');
});

it('opens the Story Paths in the spark\'s place, and a path brings the spark back', async () => {
  await open();
  expect(dialog().querySelector('[aria-label="Story spark"]')).toBeTruthy();
  await click(button(/Pick a path$/));
  expect(dialog().querySelector('[aria-label="Story spark"]')).toBeNull();
  expect(dialog().querySelector('[role="radiogroup"][aria-label="Story paths"]')).toBeTruthy();
  // Arrow keys move through the paths without closing them.
  const regression = Array.from(dialog().querySelectorAll<HTMLElement>('[role="radio"]')).find(item => item.textContent?.includes('Regression'))!;
  await act(async () => { regression.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
  expect(dialog().querySelector('[role="radiogroup"]')).toBeTruthy();
  expect(dialog().querySelector('[role="radio"][aria-checked="true"]')?.textContent).toContain('Urban');
  await click(regression);
  expect(dialog().querySelector('[role="radiogroup"]')).toBeNull();
  expect(dialog().querySelector('[aria-label="Story spark"]')).toBeTruthy();
  expect(button(/Pick a path$/)?.textContent).toContain('Regression');
  await click(button(/Pick a path$/));
  await click(button(/Back to the spark/));
  expect(dialog().querySelector('[aria-label="Story spark"]')).toBeTruthy();
});

it('keeps the Story Paths open while the writer types their own genre, even one starting with a path\'s name', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  await choosePath(/Define My Own Path/);
  const typeGenre = async (value: string) => {
    const input = dialog().querySelector<HTMLInputElement>('#dao-genre-custom-input')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
  };
  await typeGenre('Xianxia');
  expect(dialog().querySelector('[role="radiogroup"][aria-label="Story paths"]')).toBeTruthy();
  expect(dialog().querySelector<HTMLInputElement>('#dao-genre-custom-input')?.value).toBe('Xianxia');
  await typeGenre('Xianxia mystery');
  await click(button(/Back to the spark/));
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ genre: 'Xianxia mystery' }), expect.any(AbortSignal), expect.any(Function));
});

it('shows what an action did while the Story Paths are open, and an empty beginning returns to the spark', async () => {
  const keepSpark = vi.fn(async () => { throw new Error('The Story Bank is full.'); });
  await open({ checkSparks: async () => true, requestSpark: async request => modelSpark(request), keepSpark });
  await click(button(/Pick a path$/));
  await click(button(/Keep in Story Bank/));
  expect(dialog().querySelector('[role="radiogroup"]')).toBeTruthy();
  expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('The Story Bank is full.');
  await click(button(/Back to the spark/));
  await click(button(/^Custom/));
  await click(button(/Pick a path$/));
  await click(button(/Shape my premise/));
  expect(dialog().querySelector('[role="radiogroup"]')).toBeNull();
  expect(dialog().querySelector('textarea')).toBeTruthy();
  expect(dialog().querySelector('[role="alert"]')?.textContent).toMatch(/beginning of your idea/);
});

it('without a model, Random offers the Dao\'s own sparks and Custom keeps the writer\'s words as written', async () => {
  await open();
  await choosePath(/Regression/);
  await click(button(/Seek a spark/));
  await settle(1100);
  const premise = HAND_SPARKS.find(item => dialog().textContent?.includes(item.premise));
  expect(premise?.genre).toBe('Regression');
  await click(button(/^Custom/));
  await type(dialog().querySelector('textarea')!, 'my own half idea');
  await click(button(/Shape my premise/));
  await settle(1100);
  expect(dialog().textContent).toContain('my own half idea');
  expect(dialog().querySelector('[role="status"]')?.textContent).toMatch(/kept as written/);
});

it('a failed Random request surfaces an older spark and says why', async () => {
  await open({ checkSparks: async () => true, requestSpark: async () => { throw new Error('The Dao has spoken its twenty sparks for today.'); } });
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(dialog().querySelector('[role="status"]')?.textContent).toMatch(/twenty sparks for today.*older spark/);
});

it('keeps a spark in the Story Bank once, and Begin hands it to the host and closes', async () => {
  const keepSpark = vi.fn(async (_spark: StorySpark) => {});
  const beginSpark = vi.fn(async (_spark: StorySpark) => {});
  await open({ keepSpark, beginSpark });
  await click(button(/Keep in Story Bank/));
  expect(keepSpark).toHaveBeenCalledTimes(1);
  expect(button(/Kept in your Story Bank/)?.hasAttribute('disabled')).toBe(true);
  await click(button(/Use this spark/));
  await settle();
  // The spark kept is the one begun: the same premise and genre.
  expect(beginSpark).toHaveBeenCalledWith(keepSpark.mock.calls[0][0]);
  expect(document.querySelector('[role="dialog"][aria-label="Sparks"]')).toBeNull();
});

it('opens from a spark icon button and never turns sparks over on its own', async () => {
  const intervals = vi.spyOn(window, 'setInterval');
  await act(async () => root.render(<LibraryPresentationProvider>
    <SparksButton />
  </LibraryPresentationProvider>));
  await settle();
  expect(trigger()?.textContent).toBe('Sparks');
  expect(trigger()?.getAttribute('aria-haspopup')).toBe('dialog');
  expect(intervals).not.toHaveBeenCalled();
  await click(trigger());
  await settle();
  expect(dialog().querySelector('h2')?.textContent).toBe('Sparks');
  expect(trigger()?.getAttribute('aria-expanded')).toBe('true');
});

it('inside a Story Seed, Use this spark hands the spark to the host to fill the Origin, without Keep', async () => {
  const beginSpark = vi.fn(async (_spark: StorySpark) => {});
  await open({ beginSpark }, 'fill-seed');
  expect(dialog().querySelector('[data-spark-fill-note]')?.textContent).toContain('replaces this seed');
  expect(button(/Keep in Story Bank/)).toBeUndefined();
  expect(button(/Begin this story/)).toBeUndefined();
  await click(button(/Use this spark/));
  await settle();
  expect(beginSpark).toHaveBeenCalledTimes(1);
  expect(document.querySelector('[role="dialog"][aria-label="Sparks"]')).toBeNull();
});

it('shows server usage, refreshes on reopen, and does not spend sparks on Save or Use', async () => {
  let remaining = 20;
  const usage = () => ({ unlimited: false as const, limit: 20, remaining, resetsAt: null });
  const requestSpark = vi.fn<NonNullable<SparkHost['requestSpark']>>(async (request, _signal, onUsage) => {
    remaining -= 1;
    onUsage?.(usage());
    return modelSpark(request);
  });
  await open({ checkSparks: async () => ({ configured: true, usage: usage() }), requestSpark,
    keepSpark: async () => {}, beginSpark: async () => {} });
  const counter = () => dialog().querySelector('[aria-label="Daily sparks"]')?.textContent;
  expect(counter()).toBe('20 / 20 left');
  expect(dialog().querySelector('[aria-label="Copy spark"]')).toBeNull();
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(counter()).toBe('19 / 20 left');
  await click(button(/Keep in Story Bank/));
  expect(counter()).toBe('19 / 20 left');
  await click(button(/Use this spark/));
  await settle();
  expect(requestSpark).toHaveBeenCalledTimes(1);
  remaining = 12;
  await click(trigger());
  await settle();
  expect(counter()).toBe('12 / 20 left');
});

it('shows owner access without a numeric cap', async () => {
  await open({ checkSparks: async () => ({ configured: true, usage: { unlimited: true } }),
    requestSpark: async request => modelSpark(request) });
  expect(dialog().querySelector('[aria-label="Daily sparks"]')?.textContent).toBe('No daily limit');
});

it('defaults to Any and sends the selected protagonist for Random, Custom and invented genres', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  expect(button(/^Any$/)?.getAttribute('aria-pressed')).toBe('true');
  await click(button(/^Female$/));
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark.mock.lastCall?.[0]).toMatchObject({ protagonistGender: 'female' });
  await click(button(/^Custom/));
  await type(dialog().querySelector('textarea')!, 'a flower that cultivates');
  await click(button(/^Male$/));
  await choosePath(/Invent a genre/);
  await click(button(/Shape my premise/));
  await settle(1100);
  expect(requestSpark.mock.lastCall?.[0]).toMatchObject({ protagonistGender: 'male', inventGenre: true, idea: 'a flower that cultivates' });
  await click(button(/^Any$/));
  await click(button(/Shape my premise/));
  await settle(1100);
  expect(requestSpark.mock.lastCall?.[0]).not.toHaveProperty('protagonistGender');
});

it('does not silently ignore a protagonist preference when no model is available', async () => {
  await open();
  const premise = dialog().querySelector('[aria-label="Story spark"]')?.textContent;
  await click(button(/^Female$/));
  await click(button(/Seek a spark/));
  expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('needs a connected model');
  expect(dialog().querySelector('[aria-label="Story spark"]')?.textContent).toBe(premise);
});

it('keeps the current spark on model failure rather than ignoring the requested protagonist', async () => {
  await open({ checkSparks: async () => true, requestSpark: async () => { throw new Error('The model failed.'); } });
  const premise = dialog().querySelector('[aria-label="Story spark"]')?.textContent;
  await click(button(/^Male$/));
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(dialog().querySelector('[role="alert"]')?.textContent).toBe('The model failed.');
  expect(dialog().querySelector('[aria-label="Story spark"]')?.textContent).toBe(premise);
});

it('keeps the server count after a failed request falls back to an older spark', async () => {
  await open({ checkSparks: async () => ({ configured: true, usage: { unlimited: false, limit: 20, remaining: 1, resetsAt: null } }),
    requestSpark: async (_request, _signal, onUsage) => {
      onUsage?.({ unlimited: false, limit: 20, remaining: 0, resetsAt: null });
      throw new Error('The model failed.');
    } });
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(dialog().querySelector('[aria-label="Daily sparks"]')?.textContent).toBe('0 / 20 left');
  expect(dialog().querySelector('[role="status"]')?.textContent).toContain('older spark');
});

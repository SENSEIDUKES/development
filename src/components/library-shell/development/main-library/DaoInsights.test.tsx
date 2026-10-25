// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import type { StorySpark, StorySparkRequest } from '@seihouse/sen/story-seed';
import type { DaoSparkHost } from '../../shared/MainLibraryAdapter';
import { MainLibraryHomeInsights } from '../MainLibraryHomeInsights';
import { HAND_SPARKS, handSpark } from './daoSparks';

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
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Dao Insights"]')!;
const button = (pattern: RegExp) => Array.from(dialog().querySelectorAll('button')).find(item => pattern.test(item.textContent ?? '') || pattern.test(item.getAttribute('aria-label') ?? ''));
const type = async (element: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
};

const open = async (host?: DaoSparkHost) => {
  await act(async () => root.render(<LibraryPresentationProvider>
    <MainLibraryHomeInsights everyWidth adapter={{ copyText: vi.fn(async () => {}), daoSparks: host }} />
  </LibraryPresentationProvider>));
  await settle();
  await click(document.getElementById('dao-insights-header-center'));
  await settle();
};

/** Choose a genre path the way a writer does: open Story Seed's path picker, then the path. */
const choosePath = async (name: RegExp) => {
  await click(button(/Pick a path$/));
  await click(Array.from(dialog().querySelectorAll('[role="radio"], button[aria-pressed], button[aria-expanded]'))
    .find(item => name.test(item.textContent ?? '')));
};

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
  expect(dialog().textContent).toContain('Any path');
  await click(button(/Pick a path$/));
  expect(dialog().querySelector('[role="radiogroup"][aria-label="Story paths"]')).toBeTruthy();
  expect(dialog().textContent).toContain('Let the Dao conjure one');
  await click(Array.from(dialog().querySelectorAll('[role="radio"]')).find(item => item.textContent?.includes('Tower Climb')));
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ genre: 'Tower Climb' }), expect.any(AbortSignal));
  expect(dialog().textContent).toContain('A model premise.');
  expect(dialog().textContent).toContain('Elder of Tests');
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
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ idea: 'a sword that writes letters' }), expect.any(AbortSignal));
  expect(dialog().textContent).toContain('Shaped: a sword that writes letters');
});

it('conjures a genre: the spark names it and says how it reads', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  await choosePath(/Let the Dao conjure one/);
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ inventGenre: true }), expect.any(AbortSignal));
  expect(dialog().textContent).toContain('Echo Cultivation');
  expect(dialog().textContent).toContain('Conjured genre');
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
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ genre: 'Noodle Cultivation' }), expect.any(AbortSignal));
  expect(dialog().textContent).toContain('Noodle Cultivation');
});

it('asks for a Fate Survival spark when Survival is on, and marks the spark', async () => {
  const requestSpark = vi.fn(async (request: StorySparkRequest) => modelSpark(request));
  await open({ checkSparks: async () => true, requestSpark });
  const fate = dialog().querySelector<HTMLElement>('[role="switch"][aria-label="Fate Survival"]')!;
  expect(fate.getAttribute('aria-checked')).toBe('false');
  await click(fate);
  expect(fate.getAttribute('aria-checked')).toBe('true');
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ fateSurvival: true }), expect.any(AbortSignal));
  expect(dialog().querySelector('[aria-label="Story spark"]')?.textContent).toContain('Fate Survival');
});

it('opens the Story Paths in the spark\'s place, and a path brings the spark back', async () => {
  await open();
  expect(dialog().querySelector('[aria-label="Story spark"]')).toBeTruthy();
  await click(button(/Pick a path$/));
  expect(dialog().querySelector('[aria-label="Story spark"]')).toBeNull();
  expect(dialog().querySelector('[role="radiogroup"][aria-label="Story paths"]')).toBeTruthy();
  await click(Array.from(dialog().querySelectorAll('[role="radio"]')).find(item => item.textContent?.includes('Regression')));
  expect(dialog().querySelector('[role="radiogroup"]')).toBeNull();
  expect(dialog().querySelector('[aria-label="Story spark"]')).toBeTruthy();
  expect(button(/Pick a path$/)?.textContent).toContain('Regression');
  await click(button(/Pick a path$/));
  await click(button(/Back to the spark/));
  expect(dialog().querySelector('[aria-label="Story spark"]')).toBeTruthy();
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
  await click(button(/Begin this story/));
  await settle();
  // The spark kept is the one begun: the same premise and genre.
  expect(beginSpark).toHaveBeenCalledWith(keepSpark.mock.calls[0][0]);
  expect(document.querySelector('[role="dialog"][aria-label="Dao Insights"]')).toBeNull();
});

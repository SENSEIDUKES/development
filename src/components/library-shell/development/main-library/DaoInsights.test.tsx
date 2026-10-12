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

const modelSpark = (request: StorySparkRequest): StorySpark => ({
  premise: request.idea ? `Shaped: ${request.idea}` : 'A model premise.',
  genre: request.inventGenre ? 'Echo Cultivation' : request.genre,
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
  const genres = dialog().querySelector('fieldset')!;
  expect(genres.textContent).toContain('Any genre');
  expect(genres.textContent).toContain('Conjure a genre');
  await click(Array.from(genres.querySelectorAll('button')).find(item => item.textContent?.includes('Tower Climb')));
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
  await click(Array.from(dialog().querySelectorAll('fieldset button')).find(item => item.textContent?.includes('Conjure a genre')));
  await click(button(/Seek a spark/));
  await settle(1100);
  expect(requestSpark).toHaveBeenCalledWith(expect.objectContaining({ inventGenre: true }), expect.any(AbortSignal));
  expect(dialog().textContent).toContain('Echo Cultivation');
  expect(dialog().textContent).toContain('Conjured genre');
  expect(dialog().textContent).toContain('Techniques are sounds.');
});

it('without a model, Random offers the Dao\'s own sparks and Custom keeps the writer\'s words as written', async () => {
  await open();
  await click(Array.from(dialog().querySelectorAll('fieldset button')).find(item => item.textContent?.includes('Regression')));
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

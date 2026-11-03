// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { resolveWorldTitle, WorldCardLanguageProvider } from './worldCardText';
import { WorldCardCompactTile } from './WorldCardCompactTile';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); delete document.documentElement.dataset.interfaceLanguage; });

const ninth = { title: 'المحنة التاسعة', originalLanguage: 'ar', titleTranslations: { en: 'The Ninth Trial' } };

it('shows a real translation in the reader’s language, else the original with its language tag', () => {
  expect(resolveWorldTitle(ninth, 'en')).toEqual({ text: 'The Ninth Trial', lang: 'en' });
  // A regional reader language matches a translation in its base language, and back.
  expect(resolveWorldTitle(ninth, 'en-GB')).toEqual({ text: 'The Ninth Trial', lang: 'en' });
  expect(resolveWorldTitle(ninth, 'ja')).toEqual({ text: 'المحنة التاسعة', lang: 'ar', foreignTag: 'AR', foreignLanguage: 'ar' });
  // Its own readers see the original, untagged.
  expect(resolveWorldTitle(ninth, 'ar')).toEqual({ text: 'المحنة التاسعة', lang: 'ar' });
  expect(resolveWorldTitle({ title: '九月之烬', originalLanguage: 'zh-CN' }, 'zh-TW')).toEqual({ text: '九月之烬', lang: 'zh-CN' });
  // Unknown language or no reader language: the title as written, with no tag.
  expect(resolveWorldTitle({ title: 'Untitled' }, 'ja')).toEqual({ text: 'Untitled', lang: undefined });
  expect(resolveWorldTitle(ninth)).toEqual({ text: 'المحنة التاسعة', lang: 'ar' });
});

it('marks titles and creator names as the author’s words, in their own language, and follows the page language', async () => {
  const world = { id: 'w', imageUrl: '', genre: 'Fantasy', creatorName: 'المُتعبِّد', creatorLanguage: 'ar', ...ninth };
  act(() => root.render(<WorldCardLanguageProvider language="ja"><WorldCardCompactTile world={world} onOpen={() => {}} /></WorldCardLanguageProvider>));
  const title = container.querySelector('.world-card-compact-tile-title')!;
  expect(title.textContent).toBe('المحنة التاسعة');
  expect(title.getAttribute('lang')).toBe('ar');
  // The interface translator never rewrites a creator's words, even ones like "Fantasy".
  expect(title.hasAttribute('data-no-interface-translate')).toBe(true);
  const creator = container.querySelector('.world-card-compact-tile-creator')!;
  expect(creator.getAttribute('lang')).toBe('ar');
  expect(creator.hasAttribute('data-no-interface-translate')).toBe(true);
  expect(container.querySelector('.world-card-language-tag')?.textContent).toBe('AR');
  expect(container.querySelector('.world-card-compact-tile-detail')?.textContent).toBe('ARFantasy');

  // Without a provider, the card follows the language the interface translator set on the page.
  act(() => root.render(<WorldCardCompactTile world={world} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-language-tag')).toBeNull();
  await act(async () => { document.documentElement.dataset.interfaceLanguage = 'en'; });
  expect(container.querySelector('.world-card-compact-tile-title')?.textContent).toBe('The Ninth Trial');
  expect(container.querySelector('.world-card-compact-tile-title')?.getAttribute('lang')).toBe('en');
});

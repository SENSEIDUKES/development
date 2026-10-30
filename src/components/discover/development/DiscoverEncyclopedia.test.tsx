// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SenLanguageCode } from '@seihouse/sen/contracts';
import { loadLoreCatalogue } from '../shared/loreCatalogue';
import { DiscoverEncyclopedia, type DiscoverEncyclopediaProps, type DiscoverLoreLocation } from './DiscoverEncyclopedia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });
const hrefFor = (location?: DiscoverLoreLocation) => location ? `?page=discover&lore=${location.term ?? 'index'}` : '?page=discover';
const input = (element: HTMLInputElement | HTMLSelectElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLSelectElement.prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLInputElement ? 'input' : 'change', { bubbles: true }));
});
const clickText = (selector: string, text: string) => act(() => [...container.querySelectorAll<HTMLElement>(selector)].find(element => element.textContent?.includes(text))!.click());
function Harness({ initial = {}, ...props }: Partial<DiscoverEncyclopediaProps> & { initial?: DiscoverLoreLocation }) {
  const [location, setLocation] = useState(initial);
  return <DiscoverEncyclopedia hrefFor={hrefFor} location={location} onNavigate={next => setLocation(next ?? {})} {...props} />;
}
/** Lets the glossary and the reading language's renderings arrive. */
async function settle(language: SenLanguageCode = 'en') {
  await act(async () => {
    await loadLoreCatalogue();
    await import('../shared/loreLocales').then(module => Promise.all([module.loadLoreRenderings(language), language === 'en' ? undefined : module.loadLoreLocale(language)]));
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}
async function render(props: Partial<DiscoverEncyclopediaProps> & { initial?: DiscoverLoreLocation } = {}, language?: SenLanguageCode) {
  await act(async () => { root.render(<Harness {...props} />); });
  await settle(language);
}

it('searches aliases, opens the canonical article and preserves filters when returning', async () => {
  const scroll = vi.fn();
  await render();
  Object.defineProperty(container.querySelector('[data-encyclopedia]'), 'scrollIntoView', { value: scroll });
  input(container.querySelector('input')!, 'Origin Infant');
  expect(scroll).not.toHaveBeenCalled();
  expect(container.querySelectorAll('.encyclopedia-result')).toHaveLength(1);
  clickText('a', 'Nascent Soul');
  expect(container.querySelector('h1')?.textContent).toBe('Nascent Soul');
  expect(document.activeElement).toBe(container.querySelector('h1'));
  expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
  expect(container.querySelector('.encyclopedia-script')?.textContent).toBe('元婴');
  expect(container.querySelector('.encyclopedia-aliases')?.textContent).toContain('Origin Infant');
  expect(container.querySelector('.encyclopedia-pronunciation')?.textContent).toBe('yuán yīng');
  clickText('.encyclopedia-breadcrumb a', 'Encyclopedia');
  expect(container.querySelector('input')?.value).toBe('Origin Infant');
});

it('combines category and search, recovers from no results, and handles an invalid entry', async () => {
  await render();
  clickText('button', 'Crafts & Treasures');
  expect(container.querySelectorAll('.encyclopedia-result')).toHaveLength(21);
  input(container.querySelector('input')!, 'Yuanying');
  expect(container.textContent).toContain('No matching terms');
  clickText('button', 'Clear filters');
  expect(container.querySelectorAll('.encyclopedia-result')).toHaveLength(398);
  await render({ location: { term: 'missing' } });
  expect(container.textContent).toContain('This term is not in the encyclopedia');
  expect(container.querySelector('a[href="?page=discover&lore=index"]')).toBeTruthy();
});

it('uses profile defaults, isolates Arabic text, and updates when the language pack arrives', async () => {
  await render({ initial: { term: 'nascent-soul' }, readingLanguage: 'ar', readingMode: 'Easy Read', interfaceLanguage: 'en' }, 'ar');
  expect(container.querySelector('h1')?.textContent).toBe('الروح الوليدة');
  expect(container.querySelector('select')?.value).toBe('ar');
  expect(container.querySelector('.encyclopedia-prose')?.getAttribute('data-reading-mode')).toBe('Easy Read');
  expect(container.querySelector('.encyclopedia-prose [lang="ar"]')?.getAttribute('dir')).toBe('rtl');
  expect(container.querySelector('.encyclopedia-script')?.getAttribute('dir')).toBe('ltr');
  expect(container.querySelector('[data-no-interface-translate]')).toBeTruthy();
  expect(container.querySelector('.encyclopedia-write bdi')?.textContent).toBe('الروح الناشئة');
  expect(container.querySelector('.encyclopedia-write bdi')?.getAttribute('dir')).toBe('rtl');
});

it('changes actual reading content, keeps literal idiom meanings, and follows related terms', async () => {
  await render({ initial: { term: 'courting-death' } });
  const mode = container.querySelectorAll('select')[1];
  const meaning = () => container.querySelector('.encyclopedia-prose section div')!;
  const full = meaning().textContent;
  input(mode, 'Easy Read');
  expect(meaning().textContent).not.toBe(full);
  expect(meaning().textContent).toContain('does not mean that the person wants to die');
  expect(container.textContent).toContain('Write it as');
  input(mode, 'Clear Reading');
  expect(meaning().querySelectorAll('p').length).toBeGreaterThan(1);
  input(mode, 'Literal Reading');
  expect(meaning().textContent).toContain('does not mean that the person wants to die');
  clickText('.encyclopedia-related a', 'Face');
  expect(container.querySelector('h1')?.textContent).toBe('Face');
});

it('uses right-to-left interface copy independently of the reading language', async () => {
  await render({ initial: { term: 'nascent-soul' }, interfaceLanguage: 'ar', readingLanguage: 'en' }, 'ar');
  expect(container.querySelector('[data-encyclopedia]')?.getAttribute('dir')).toBe('rtl');
  expect(container.querySelector('[data-encyclopedia]')?.getAttribute('lang')).toBe('ar');
  expect(container.querySelector('h1')?.textContent).toBe('Nascent Soul');
  expect(container.querySelector('.encyclopedia-prose [lang="en"]')?.getAttribute('dir')).toBe('ltr');
});

it('labels a failed language load and recovers with Retry', async () => {
  const module = await import('../shared/loreLocales');
  vi.spyOn(module, 'loadLoreLocale').mockRejectedValueOnce(new Error('Offline'));
  await render({ initial: { term: 'nascent-soul' }, readingLanguage: 'de' });
  expect(container.querySelector('[role="status"]')?.textContent).toContain('Showing what is available');
  expect(container.querySelector('h1')?.textContent).toBe('Nascent Soul');
  clickText('button', 'Retry');
  await settle('de');
  expect(container.querySelector('h1')?.textContent).not.toBe('Nascent Soul');
  expect(container.querySelector('[role="status"]')).toBeNull();
});

it('retains native link behavior for opening a term in another tab', async () => {
  const navigate = vi.fn();
  await render({ onNavigate: navigate });
  const link = container.querySelector<HTMLAnchorElement>('.encyclopedia-result')!;
  act(() => link.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true, cancelable: true })));
  expect(navigate).not.toHaveBeenCalled();
  expect(link.href).toContain('page=discover&lore=');
});

it('copies how a term is written for a translation skill', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  await render({ initial: { term: 'qi' }, readingLanguage: 'vi' }, 'vi');
  expect(container.querySelector('.encyclopedia-write bdi')?.textContent).toBe('Khí');
  expect(container.querySelector('.encyclopedia-write-note')?.textContent).toBe('Giữ nguyên Hán Việt.');
  await act(async () => { container.querySelector<HTMLButtonElement>('.encyclopedia-copy')!.click(); });
  expect(writeText).toHaveBeenCalledWith('Qi → Khí — Giữ nguyên Hán Việt.');
  expect(container.querySelector('.encyclopedia-copy')?.textContent).toBe('Copied');
});

it('copies a whole category from the directory', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  await render({ initial: { category: 'systems', query: 'Status Window' } });
  const entry = container.querySelector('.encyclopedia-entry')!;
  expect(entry.querySelector('.encyclopedia-result-title')?.textContent).toBe('Status Window');
  // The copy button sits beside the link, never inside it.
  expect(entry.querySelector('a .encyclopedia-copy')).toBeNull();
  await act(async () => { container.querySelector<HTMLButtonElement>('.encyclopedia-results-head .encyclopedia-copy')!.click(); });
  expect(writeText).toHaveBeenLastCalledWith(expect.stringMatching(/^Status Window — /));
  expect(container.querySelector('.encyclopedia-results-head .encyclopedia-copy')?.textContent).toBe('Copied');
});

it('opens a glossary term with its English meaning and links to related terms', async () => {
  await render({ initial: { term: 'status-window' } });
  expect(container.querySelector('h1')?.textContent).toBe('Status Window');
  expect(container.querySelector('.encyclopedia-category')?.textContent).toBe('Game Systems');
  expect(container.querySelector('.encyclopedia-prose section div')?.getAttribute('lang')).toBe('en');
  expect(container.querySelectorAll('.encyclopedia-related a').length).toBeGreaterThan(0);
  expect(container.textContent).not.toContain('Further reading');
});

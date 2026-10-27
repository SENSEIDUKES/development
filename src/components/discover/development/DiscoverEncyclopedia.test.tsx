// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
async function render(props: Partial<DiscoverEncyclopediaProps> & { initial?: DiscoverLoreLocation } = {}) {
  await act(async () => { root.render(<Harness {...props} />); });
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
  clickText('button', 'Weapons & Relics');
  expect(container.querySelectorAll('.encyclopedia-result')).toHaveLength(5);
  input(container.querySelector('input')!, 'Yuanying');
  expect(container.textContent).toContain('No matching terms');
  clickText('button', 'Clear filters');
  expect(container.querySelectorAll('.encyclopedia-result')).toHaveLength(36);
  await render({ location: { term: 'missing' } });
  expect(container.textContent).toContain('This term is not in the encyclopedia');
  expect(container.querySelector('a[href="?page=discover&lore=index"]')).toBeTruthy();
});

it('uses profile defaults, isolates Arabic text, and updates when the language pack arrives', async () => {
  await render({ initial: { term: 'nascent-soul' }, readingLanguage: 'ar', readingMode: 'Easy Read', interfaceLanguage: 'en' });
  await act(async () => { await import('../shared/loreLocales').then(module => module.loadLoreLocale('ar')); });
  expect(container.querySelector('h1')?.textContent).toBe('الروح الوليدة');
  expect(container.querySelector('select')?.value).toBe('ar');
  expect(container.querySelector('.encyclopedia-prose')?.getAttribute('data-reading-mode')).toBe('Easy Read');
  expect(container.querySelector('.encyclopedia-prose [lang="ar"]')?.getAttribute('dir')).toBe('rtl');
  expect(container.querySelector('.encyclopedia-script')?.getAttribute('dir')).toBe('ltr');
  expect(container.querySelector('[data-no-interface-translate]')).toBeTruthy();
  expect(container.textContent).toContain('In the genre');
});

it('changes actual reading content, keeps literal idiom meanings, and follows related terms', async () => {
  await render({ initial: { term: 'courting-death' } });
  const mode = container.querySelectorAll('select')[1];
  const meaning = () => container.querySelector('.encyclopedia-prose section div')!;
  const full = meaning().textContent;
  input(mode, 'Easy Read');
  expect(meaning().textContent).not.toBe(full);
  expect(meaning().textContent).toContain('does not mean that the person wants to die');
  expect(container.textContent).toContain('In the genre');
  input(mode, 'Clear Reading');
  expect(meaning().querySelectorAll('p').length).toBeGreaterThan(1);
  input(mode, 'Literal Reading');
  expect(meaning().textContent).toContain('does not mean that the person wants to die');
  clickText('.encyclopedia-related a', 'Face');
  expect(container.querySelector('h1')?.textContent).toBe('Face');
});

it('uses right-to-left interface copy independently of the reading language', async () => {
  await render({ initial: { term: 'nascent-soul' }, interfaceLanguage: 'ar', readingLanguage: 'en' });
  await act(async () => { await import('../shared/loreLocales').then(module => module.loadLoreLocale('ar')); });
  expect(container.querySelector('[data-encyclopedia]')?.getAttribute('dir')).toBe('rtl');
  expect(container.querySelector('[data-encyclopedia]')?.getAttribute('lang')).toBe('ar');
  expect(container.querySelector('h1')?.textContent).toBe('Nascent Soul');
  expect(container.querySelector('.encyclopedia-prose [lang="en"]')?.getAttribute('dir')).toBe('ltr');
});

it('labels a failed language load and recovers with Retry', async () => {
  const module = await import('../shared/loreLocales');
  vi.spyOn(module, 'loadLoreLocale').mockRejectedValueOnce(new Error('Offline'));
  await render({ initial: { term: 'nascent-soul' }, readingLanguage: 'de' });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(container.querySelector('[role="status"]')?.textContent).toContain('Showing English where needed');
  expect(container.querySelector('h1')?.textContent).toBe('Nascent Soul');
  clickText('button', 'Retry');
  await act(async () => { await module.loadLoreLocale('de'); });
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

// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkshopDocs } from './WorkshopDocs';
import { docsTopics } from './catalog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
const onNavigate = vi.fn();

beforeEach(() => {
  onNavigate.mockReset();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation(media => ({ media, matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<WorkshopDocs topicId="overview" onNavigate={onNavigate} />));
});

afterEach(() => { act(() => root.unmount()); container.remove(); });

function search(value: string) {
  const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}

describe('NovelExpanded Docs', () => {
  it('opens the shared mobile drawer, follows a topic, and dismisses it with Escape', async () => {
    const trigger = container.querySelector<HTMLButtonElement>('[aria-label="Browse NovelExpanded Docs topics"]')!;
    await act(async () => trigger.click());
    const drawer = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(drawer).not.toBeNull();
    expect(document.getElementById(drawer.getAttribute('aria-labelledby')!)?.textContent).toBe('NovelExpanded Docs topics');
    const link = drawer.querySelector<HTMLAnchorElement>('a[href="?tab=docs&doc=spp"]')!;
    await act(async () => link.click());
    expect(onNavigate).toHaveBeenCalledWith('spp');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => trigger.click());
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('searches, navigates a result, and clears search back to the article', () => {
    search('SPP');
    expect(container.querySelectorAll('.docs-results li')).toHaveLength(2);
    const link = container.querySelector<HTMLAnchorElement>('.docs-results a')!;
    act(() => link.click());
    expect(onNavigate).toHaveBeenCalledWith('spp');
    expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('');
    search('nothing-matches');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('0 results');
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Clear search"]')!.click());
    expect(container.querySelector('h1')?.textContent).toBe('What each thing is.How it all fits.');
    expect(document.activeElement).toBe(container.querySelector('input'));
  });

  it('handles Escape, whitespace, and browser navigation during a search', () => {
    const input = search('capa');
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(input.value).toBe('');
    search('   ');
    expect(container.querySelector('.docs-results')).toBeNull();
    search('spp');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(input.value).toBe('');
  });

  it('collapses a parent category across sidebar, drawer, and overview, then reopens it', async () => {
    const productToggles = [...container.querySelectorAll<HTMLButtonElement>('.docs-navigation .docs-category-toggle')]
      .filter(button => button.textContent?.includes('Product & people'));
    expect(productToggles).toHaveLength(1);
    expect(productToggles.every(button => button.getAttribute('aria-expanded') === 'false')).toBe(true);

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Browse NovelExpanded Docs topics"]')!.click());
    const allProductToggles = [...document.querySelectorAll<HTMLButtonElement>('.docs-navigation .docs-category-toggle')]
      .filter(button => button.textContent?.includes('Product & people'));
    expect(allProductToggles).toHaveLength(2);
    expect(allProductToggles.every(button => button.getAttribute('aria-expanded') === 'false')).toBe(true);
    act(() => allProductToggles[1].click());
    expect(allProductToggles.every(button => button.getAttribute('aria-expanded') === 'true')).toBe(true);
    expect(allProductToggles.every(button => !document.getElementById(button.getAttribute('aria-controls')!)?.hasAttribute('hidden'))).toBe(true);
    const overviewToggle = [...container.querySelectorAll<HTMLButtonElement>('.docs-category-index .docs-category-toggle')]
      .find(button => button.textContent?.includes('Product & people'))!;
    expect(overviewToggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(overviewToggle.getAttribute('aria-controls')!)?.hasAttribute('hidden')).toBe(false);

    act(() => overviewToggle.click());
    expect(allProductToggles.every(button => button.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(document.getElementById(overviewToggle.getAttribute('aria-controls')!)?.hasAttribute('hidden')).toBe(true);
  });

  it('keeps modified clicks as real links and marks the active topic', () => {
    act(() => root.render(<WorkshopDocs topicId="spp" onNavigate={onNavigate} />));
    const link = container.querySelector<HTMLAnchorElement>('.docs-navigation a[aria-current="page"]')!;
    expect(link.textContent).toBe('SPP');
    expect(link.getAttribute('href')).toBe('?tab=docs&doc=spp');
    const click = new MouseEvent('click', { ctrlKey: true, bubbles: true, cancelable: true });
    // Stop jsdom's unimplemented navigation after observing our handler.
    const preventNavigation = (event: Event) => {
      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
    };
    document.addEventListener('click', preventNavigation, { once: true });
    act(() => link.dispatchEvent(click));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('renders and searches approved content from the same entry when filled', () => {
    const entry = docsTopics.find(topic => topic.id === 'spp')!;
    const original = { definition: entry.definition, howItFits: entry.howItFits, related: entry.related };
    try {
      entry.definition = 'A test definition with a uniquely searchable phrase.';
      entry.howItFits = 'A test connection.';
      entry.related = ['capa'];
      act(() => root.render(<WorkshopDocs topicId="spp" onNavigate={onNavigate} />));
      expect(container.querySelector('article')?.textContent).toContain(entry.definition);
      expect(container.querySelector('.docs-related a')?.textContent).toBe('CAPA');
      search('uniquely searchable');
      expect(container.querySelectorAll('.docs-results li')).toHaveLength(1);
    } finally {
      if (original.definition === undefined) delete entry.definition;
      else entry.definition = original.definition;
      if (original.howItFits === undefined) delete entry.howItFits;
      else entry.howItFits = original.howItFits;
      if (original.related === undefined) delete entry.related;
      else entry.related = original.related;
    }
  });
});

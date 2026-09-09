// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkshopHome } from './WorkshopHome';
import { getWorkshopVersionLabel, workshopEntries } from './manifest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation((media: string) => ({ media, matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<WorkshopHome />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function tab(label: string) {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    .find((element) => element.textContent === label)!;
}
function select(label: string) {
  act(() => tab(label).click());
}
function previewIds() {
  return [...container.querySelectorAll<HTMLAnchorElement>('a.workshop-card')]
    .map((card) => new URL(card.href).searchParams.get('preview'));
}

describe('WorkshopHome', () => {
  it('groups each existing preview exactly once and preserves direct links and release labels', () => {
    const groups = {
      Home: ['library-shell', 'user-profile'],
      Library: ['story-seed'],
      SEN: ['chapter-generation-flow', 'harness-generation', 'chapter-generation-manifestation', 'character-voice', 'reader-codex', 'reader-chamber', 'card-workshop'],
      Shared: ['celestial-backdrop', 'idle-cultivation', 'relics-gallery'],
      'Library Components': [],
    };
    expect(previewIds()).toEqual(groups.Home);
    const visited: Array<string | null> = [];
    for (const [label, ids] of Object.entries(groups)) {
      select(label);
      expect(previewIds()).toEqual(ids);
      visited.push(...previewIds());
      for (const id of ids) {
        const entry = workshopEntries.find((entry) => entry.id === id)!;
        const card = container.querySelector(`a[href="?preview=${id}"]`)!;
        expect(card.querySelector('h2')?.textContent).toBe(entry.title);
        expect(card.querySelector('.workshop-status')?.textContent).toContain(getWorkshopVersionLabel(entry.version));
      }
    }
    expect(visited.sort()).toEqual(workshopEntries.map((entry) => entry.id).sort());
    expect(new Set(visited).size).toBe(visited.length);
  });

  it('keeps the live Library Components inventory separate and interactive', () => {
    select('Library Components');
    expect(container.querySelectorAll('.workshop-card-library').length).toBeGreaterThan(0);
    expect(container.querySelector('section[aria-label="Library components"]')).not.toBeNull();
    select('Library');
    expect(container.querySelectorAll('.workshop-card-library')).toHaveLength(0);
    expect(previewIds()).toEqual(['story-seed']);
  });

  it('connects all five tabs to uniquely labelled panels with one tab stop', () => {
    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect([...tabs].map((element) => element.textContent)).toEqual(['Home', 'Library', 'SEN', 'Shared', 'Library Components']);
    for (const element of tabs) {
      select(element.textContent!);
      expect(container.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
      expect(container.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1);
      const panel = document.getElementById(element.getAttribute('aria-controls')!)!;
      expect(panel.getAttribute('aria-labelledby')).toBe(element.id);
      expect(panel.hidden).toBe(false);
      expect(element.getAttribute('aria-selected')).toBe('true');
      expect(panel.tabIndex).toBe(0);
    }
  });

  it('supports arrow wrapping, Home and End while moving focus with selection', () => {
    act(() => tab('Home').focus());
    for (const [key, label] of [['ArrowLeft', 'Library Components'], ['ArrowRight', 'Home'], ['ArrowRight', 'Library'], ['End', 'Library Components'], ['Home', 'Home']]) {
      act(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
      expect(document.activeElement).toBe(tab(label));
      expect(tab(label).getAttribute('aria-selected')).toBe('true');
    }
  });
});

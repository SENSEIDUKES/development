// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkshopHome } from './WorkshopHome';
import { getWorkshopVersionLabel, WORKSHOP_OWNER_LABELS, workshopEntries, workshopPanels } from './manifest';

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
function activePanel() {
  return container.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])')!;
}
function previewIds(scope: ParentNode = activePanel()) {
  return [...scope.querySelectorAll<HTMLAnchorElement>('a.workshop-card')]
    .map((card) => new URL(card.href).searchParams.get('preview'));
}
function archiveToggle() {
  return container.querySelector<HTMLButtonElement>('#workshop-archive-toggle')!;
}

const ACTIVE_GROUPS = {
  Pages: ['light-novels-home', 'library-shell', 'story-seed', 'reader-chamber', 'reader-codex', 'user-profile', 'dao-pillar', 'celestial-store'],
  Customization: ['familiar', 'relics-gallery', 'idle-cultivation'],
  Systems: ['harness-generation', 'chapter-generation-manifestation', 'character-voice', 'energy'],
  Components: ['motion-picture', 'celestial-backdrop', 'card-workshop'],
};

describe('WorkshopHome', () => {
  it('shows exactly the four Workshop sections as tabs', () => {
    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect([...tabs].map((element) => element.textContent)).toEqual(['Pages', 'Customization', 'Systems', 'Components']);
  });

  it('groups each active preview exactly once and preserves direct links and release labels', () => {
    const visited: Array<string | null> = [];
    for (const [label, ids] of Object.entries(ACTIVE_GROUPS)) {
      select(label);
      expect(previewIds()).toEqual(ids);
      visited.push(...previewIds());
      for (const id of ids) {
        const entry = workshopEntries.find((entry) => entry.id === id)!;
        const card = activePanel().querySelector(`a[href="?preview=${id}"]`)!;
        expect(card.querySelector('h2')?.textContent).toBe(entry.title);
        expect(card.querySelector('.workshop-status')?.textContent).toContain(getWorkshopVersionLabel(entry.version));
      }
    }
    const active = workshopEntries.filter((entry) => entry.status !== 'archived').map((entry) => entry.id);
    expect(visited.sort()).toEqual(active.sort());
    expect(new Set(visited).size).toBe(visited.length);
  });

  it('splits Pages into Home, Create, Read, Account and Commerce subsections', () => {
    const groups = [...activePanel().querySelectorAll<HTMLElement>('section.workshop-group')].map((group) => ({
      label: group.querySelector('.workshop-group-title')?.textContent,
      ids: previewIds(group),
    }));
    expect(groups).toEqual([
      { label: 'Home', ids: ['light-novels-home', 'library-shell'] },
      { label: 'Create', ids: ['story-seed'] },
      { label: 'Read', ids: ['reader-chamber', 'reader-codex'] },
      { label: 'Account', ids: ['user-profile', 'dao-pillar'] },
      { label: 'Commerce', ids: ['celestial-store'] },
    ]);
  });

  it('shows the declared package owner on every card and inline panel', () => {
    for (const label of Object.keys(ACTIVE_GROUPS)) {
      select(label);
      for (const card of activePanel().querySelectorAll<HTMLAnchorElement>('a.workshop-card')) {
        const entry = workshopEntries.find((entry) => entry.id === new URL(card.href).searchParams.get('preview'))!;
        expect(card.querySelector('.workshop-owner')?.textContent).toBe(`Owned by ${WORKSHOP_OWNER_LABELS[entry.owner]}`);
      }
    }
    expect(Object.fromEntries(workshopEntries.map((entry) => [entry.id, entry.owner]))).toEqual({
      'light-novels-home': 'library', 'library-shell': 'library', 'story-seed': 'library',
      'reader-chamber': 'sen', 'reader-codex': 'sen', 'user-profile': 'library', 'dao-pillar': 'library', 'celestial-store': 'library',
      familiar: 'library', 'relics-gallery': 'library', 'idle-cultivation': 'library',
      'harness-generation': 'sen', 'chapter-generation-manifestation': 'library', 'character-voice': 'sen', energy: 'library',
      'motion-picture': 'sen', 'celestial-backdrop': 'library-ui', 'card-workshop': 'workshop',
      'chapter-generation-flow': 'workshop',
    });
    for (const panel of workshopPanels) {
      select({ systems: 'Systems', components: 'Components', pages: 'Pages', customization: 'Customization' }[panel.section]);
      const section = activePanel().querySelector(`section[data-panel="${panel.id}"]`)!;
      expect(section.querySelector('.workshop-group-title')?.textContent).toBe(panel.title);
      expect(section.querySelector('.workshop-owner')?.textContent).toBe(`Owned by ${WORKSHOP_OWNER_LABELS[panel.owner]}`);
    }
  });

  it('renders Provenance under Systems and the live Library Components and Icons under Components', () => {
    select('Systems');
    expect(activePanel().querySelector('section[data-panel="provenance"]')).not.toBeNull();
    expect(activePanel().querySelectorAll('.workshop-card-library')).toHaveLength(0);
    select('Components');
    expect([...activePanel().querySelectorAll('section[data-panel]')].map((section) => section.getAttribute('data-panel'))).toEqual(['library-components', 'icons']);
    expect(activePanel().querySelectorAll('.workshop-card-library').length).toBeGreaterThan(0);
    expect(activePanel().querySelector('section[aria-label="Library components"]')).not.toBeNull();
  });

  it('keeps only the old Chapter Generation archived, reachable, and outside the four sections', () => {
    expect(workshopEntries.filter((entry) => entry.status === 'archived').map((entry) => entry.id)).toEqual(['chapter-generation-flow']);
    expect(workshopEntries.find((entry) => entry.id === 'idle-cultivation')?.status).toBe('active');
    expect(container.querySelector('#workshop-archive-panel')!.closest('[role="tabpanel"]')).toBeNull();
    expect(archiveToggle().getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('a[href="?preview=chapter-generation-flow"]')).toBeNull();

    act(() => archiveToggle().click());
    expect(archiveToggle().getAttribute('aria-expanded')).toBe('true');
    const archive = container.querySelector<HTMLElement>('#workshop-archive-panel')!;
    expect(archive.hidden).toBe(false);
    expect(previewIds(archive)).toEqual(['chapter-generation-flow']);
    const card = archive.querySelector('a[href="?preview=chapter-generation-flow"]')!;
    expect(card.textContent).toContain('Superseded by Harness Generation.');
    expect(card.querySelector('.workshop-lifecycle')?.textContent).toBe('archived');
    expect(card.querySelector('.workshop-owner')?.textContent).toBe('Owned by WORKSHOP');

    act(() => archiveToggle().click());
    expect(archive.hidden).toBe(true);
  });

  it('connects every tab to uniquely labelled panels with one tab stop', () => {
    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
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
    act(() => tab('Pages').focus());
    for (const [key, label] of [['ArrowLeft', 'Components'], ['ArrowRight', 'Pages'], ['ArrowRight', 'Customization'], ['End', 'Components'], ['Home', 'Pages']]) {
      act(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
      expect(document.activeElement).toBe(tab(label));
      expect(tab(label).getAttribute('aria-selected')).toBe('true');
    }
  });
});

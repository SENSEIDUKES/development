// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkshopHome } from './WorkshopHome';
import { getWorkshopVersionLabel, workshopEntries } from './manifest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderHome() {
  act(() => {
    root.render(<WorkshopHome />);
  });
}

describe('WorkshopHome', () => {
  it('renders every manifest entry in the Development tab regardless of version', () => {
    renderHome();

    const grid = container.querySelector('#workshop-component-grid');
    expect(grid).not.toBeNull();

    const cards = grid!.querySelectorAll('.workshop-card');
    expect(cards).toHaveLength(workshopEntries.length);

    // Verify all entries from manifest are present with their direct preview links
    for (const entry of workshopEntries) {
      const card = [...cards].find((el) => el.getAttribute('href') === `?preview=${entry.id}`);
      expect(card).toBeDefined();
      expect(card!.querySelector('h2')?.textContent).toBe(entry.title);
      expect(card!.querySelector('.workshop-status')?.textContent).toContain(
        getWorkshopVersionLabel(entry.version),
      );
    }
  });

  it('specifically includes Chapter Generation (v2.1) which was previously filtered out', () => {
    renderHome();

    const chapterGenCard = container.querySelector('a[href="?preview=chapter-generation-flow"]');
    expect(chapterGenCard).not.toBeNull();
    expect(chapterGenCard?.querySelector('h2')?.textContent).toBe('Chapter Generation');
    expect(chapterGenCard?.querySelector('.workshop-status')?.textContent).toContain('v2.1');
  });

  it('switches between Development and Library Components tabs', () => {
    renderHome();

    const tabs = container.querySelectorAll<HTMLButtonElement>('nav[aria-label="Workshop tracks"] button');
    expect(tabs).toHaveLength(2);

    const [devTab, libraryTab] = tabs;
    expect(devTab.textContent?.trim()).toBe('Development');
    expect(devTab.getAttribute('aria-selected')).toBe('true');
    expect(libraryTab.textContent?.trim()).toBe('Library Components');
    expect(libraryTab.getAttribute('aria-selected')).toBe('false');

    // Switch to Library Components tab
    act(() => {
      libraryTab.click();
    });

    expect(libraryTab.getAttribute('aria-selected')).toBe('true');
    expect(devTab.getAttribute('aria-selected')).toBe('false');
    expect(container.querySelector('section[aria-label="Development components"]')).toBeNull();
    expect(container.querySelector('section[aria-label="Library components"]')).not.toBeNull();
    expect(container.querySelectorAll('.workshop-card-library').length).toBeGreaterThan(0);

    // Switch back to Development tab
    act(() => {
      devTab.click();
    });

    expect(devTab.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('section[aria-label="Development components"]')).not.toBeNull();
    expect(container.querySelectorAll('a.workshop-card')).toHaveLength(workshopEntries.length);
  });
});

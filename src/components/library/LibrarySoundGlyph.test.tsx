// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LibrarySoundGlyph } from './index';

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

describe('LibrarySoundGlyph', () => {
  it('renders a decorative custom SVG by default', () => {
    act(() => root.render(<LibrarySoundGlyph />));

    const glyph = container.querySelector('[data-library-glyph="sound"]');
    expect(glyph?.tagName).toBe('svg');
    expect(glyph?.getAttribute('aria-hidden')).toBe('true');
    expect(glyph?.querySelectorAll('path')).toHaveLength(4);
    expect(container.textContent).toBe('');
  });

  it('supports an accessible standalone title and defensive sizing', () => {
    act(() => root.render(
      <LibrarySoundGlyph
        decorative={false}
        size={Number.NaN}
        title="Play Library sound cue"
        titleId="library-sound-title"
      />,
    ));

    const glyph = container.querySelector('svg');
    expect(glyph?.getAttribute('role')).toBe('img');
    expect(glyph?.getAttribute('aria-labelledby')).toBe('library-sound-title');
    expect(glyph?.getAttribute('width')).toBe('16');
    expect(glyph?.querySelector('title')?.textContent).toBe('Play Library sound cue');
  });
});

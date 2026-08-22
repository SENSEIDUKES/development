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

const renderGlyph = (props: Parameters<typeof LibrarySoundGlyph>[0] = {}) => {
  act(() => {
    root.render(<LibrarySoundGlyph {...props} />);
  });
  return container.querySelector('svg');
};

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

  it('stays exposed when an external aria-labelledby supplies its name', () => {
    act(() => root.render(
      <>
        <span id="external-sound-label">Library sound cue</span>
        <LibrarySoundGlyph aria-labelledby="external-sound-label" />
      </>,
    ));

    const glyph = container.querySelector('svg');
    expect(glyph?.getAttribute('role')).toBe('img');
    expect(glyph?.getAttribute('aria-labelledby')).toBe('external-sound-label');
    expect(glyph?.getAttribute('aria-hidden')).toBeNull();
  });

  describe('Interaction surface isolation', () => {
    it('drops a stray tabIndex={0} so the glyph does not create a duplicate focus stop', () => {
      const svg = renderGlyph({ tabIndex: 0 });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('tabindex')).toBeNull();
    });

    it('drops a stray onClick so the static mark never enters the click chain', () => {
      const svg = renderGlyph({
        onClick: () => { throw new Error('onClick must not be forwarded to the glyph'); },
      });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('onclick')).toBeNull();
    });

    it('drops interactive ARIA state on the decorative default', () => {
      const svg = renderGlyph({ 'aria-pressed': 'true', 'aria-expanded': 'true' });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('aria-pressed')).toBeNull();
      expect(svg?.getAttribute('aria-expanded')).toBeNull();
    });

    it('still drops interactive ARIA state when decorative={false}', () => {
      const svg = renderGlyph({
        decorative: false,
        'aria-pressed': 'true',
        'aria-expanded': 'true',
        'aria-controls': 'some-id',
      });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('aria-pressed')).toBeNull();
      expect(svg?.getAttribute('aria-expanded')).toBeNull();
      expect(svg?.getAttribute('aria-controls')).toBeNull();
    });

    it('keeps presentation attributes (className, style, id, data-*)', () => {
      const svg = renderGlyph({
        className: 'ml-1 text-portal',
        style: { verticalAlign: 'middle' },
        id: 'sound-x',
      });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('class')).toContain('ml-1');
      expect(svg?.getAttribute('class')).toContain('text-portal');
      expect(svg?.getAttribute('style')).toContain('vertical-align: middle');
      expect(svg?.getAttribute('id')).toBe('sound-x');
      expect(svg?.getAttribute('data-library-glyph')).toBe('sound');
    });
  });

  describe('Standalone title id wiring', () => {
    it('mints a non-empty aria-labelledby and matching inner <title id> when only title is provided', () => {
      const svg = renderGlyph({
        title: 'Library sound cue',
        decorative: false,
      });
      expect(svg).toBeTruthy();
      const ariaLabelledBy = svg?.getAttribute('aria-labelledby');
      expect(ariaLabelledBy).toBeTruthy();
      expect(ariaLabelledBy).not.toBe('');
      const titleEl = svg?.querySelector('title');
      expect(titleEl?.id).toBe(ariaLabelledBy);
      expect(titleEl?.textContent).toBe('Library sound cue');
      expect(svg?.getAttribute('role')).toBe('img');
    });

    it('does not leak a generated id onto the <svg> when no title is provided', () => {
      const svg = renderGlyph();
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('id')).toBeNull();
    });

    it('generates distinct ids across two glyphs sharing the same title', () => {
      act(() => {
        root.render(
          <>
            <LibrarySoundGlyph title="Library sound cue" decorative={false} />
            <LibrarySoundGlyph title="Library sound cue" decorative={false} />
          </>,
        );
      });
      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(2);
      const firstLabelledBy = svgs[0]?.getAttribute('aria-labelledby');
      const secondLabelledBy = svgs[1]?.getAttribute('aria-labelledby');
      expect(firstLabelledBy).toBeTruthy();
      expect(secondLabelledBy).toBeTruthy();
      expect(firstLabelledBy).not.toBe(secondLabelledBy);
      const firstTitleId = svgs[0]?.querySelector('title')?.id;
      const secondTitleId = svgs[1]?.querySelector('title')?.id;
      expect(firstTitleId).toBe(firstLabelledBy);
      expect(secondTitleId).toBe(secondLabelledBy);
      expect(firstTitleId).not.toBe(secondTitleId);
    });
  });
});

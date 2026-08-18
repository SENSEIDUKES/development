// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LibraryDragonCycleIcon, type LibraryDragonCycleIconProps } from './index';

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

const renderIcon = (props: LibraryDragonCycleIconProps = {}) => {
  act(() => {
    root.render(<LibraryDragonCycleIcon {...props} />);
  });
  return container.querySelector('svg');
};

describe('LibraryDragonCycleIcon', () => {
  describe('Accessibility contracts', () => {
    it('defaults to decorative behavior with aria-hidden="true"', () => {
      const svg = renderIcon();
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.getAttribute('role')).toBeNull();
      expect(svg?.querySelector('title')).toBeNull();
    });

    it('renders an accessible img with a <title> element when title is provided', () => {
      const svg = renderIcon({ title: 'Shuffle example premise' });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-hidden')).toBeNull();
      const titleEl = svg?.querySelector('title');
      expect(titleEl).toBeTruthy();
      expect(titleEl?.textContent).toBe('Shuffle example premise');
    });

    it('links aria-labelledby to titleId when provided', () => {
      const svg = renderIcon({ title: 'Cycle fate', titleId: 'cycle-fate-title' });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-labelledby')).toBe('cycle-fate-title');
      const titleEl = svg?.querySelector('title');
      expect(titleEl?.id).toBe('cycle-fate-title');
      expect(titleEl?.textContent).toBe('Cycle fate');
    });

    it('promotes to role="img" and unhides when aria-label is provided', () => {
      const svg = renderIcon({ 'aria-label': 'Cycle premise option' });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-label')).toBe('Cycle premise option');
      expect(svg?.getAttribute('aria-hidden')).toBeNull();
    });

    it('promotes to role="img" when decorative is explicitly false', () => {
      const svg = renderIcon({ decorative: false });
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-hidden')).toBeNull();
    });

    it('respects explicit aria-hidden override even when title or aria-label is present', () => {
      const svg = renderIcon({ title: 'Ignored title', 'aria-hidden': 'true' });
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Sizing and defensive guards', () => {
    it('defaults to 24px square', () => {
      const svg = renderIcon();
      expect(svg?.getAttribute('width')).toBe('24');
      expect(svg?.getAttribute('height')).toBe('24');
    });

    it('accepts custom positive number size', () => {
      const svg = renderIcon({ size: 18 });
      expect(svg?.getAttribute('width')).toBe('18');
      expect(svg?.getAttribute('height')).toBe('18');
    });

    it('defensively falls back to 24px on negative or non-finite values', () => {
      const svgNegative = renderIcon({ size: -10 });
      expect(svgNegative?.getAttribute('width')).toBe('24');
      expect(svgNegative?.getAttribute('height')).toBe('24');

      const svgNaN = renderIcon({ size: Number.NaN });
      expect(svgNaN?.getAttribute('width')).toBe('24');
      expect(svgNaN?.getAttribute('height')).toBe('24');
    });

    it('allows 0 as a valid non-negative size', () => {
      const svgZero = renderIcon({ size: 0 });
      expect(svgZero?.getAttribute('width')).toBe('0');
      expect(svgZero?.getAttribute('height')).toBe('0');
    });
  });

  describe('Styling and DOM attributes', () => {
    it('applies custom className and inherits currentColor fill', () => {
      const svg = renderIcon({ className: 'text-portal transition-transform' });
      expect(svg?.getAttribute('fill')).toBe('currentColor');
      expect(svg?.getAttribute('class')).toContain('text-portal');
      expect(svg?.getAttribute('class')).toContain('transition-transform');
    });

    it('contains all three canonical SVG path elements for the dragon glyph', () => {
      const svg = renderIcon();
      const paths = svg?.querySelectorAll('path');
      expect(paths?.length).toBe(3);
    });
  });
});

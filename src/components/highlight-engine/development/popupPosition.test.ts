import { describe, expect, it } from 'vitest';
import { popupPosition } from './popupPosition';

const defaults = {
  viewport: { left: 0, top: 0, width: 390, height: 760 },
  rectangles: [{ left: 140, top: 360, width: 80, height: 24 }],
  width: 168, height: 204, clearance: 48,
};

describe('selection popup placement', () => {
  it('honors the touch preference below and falls back above near the bottom', () => {
    const result = popupPosition({ ...defaults, preferred: 'below' });
    expect(result.side).toBe('below');
    expect(result.top).toBe(384 + 48);
    expect(popupPosition({ ...defaults, preferred: 'below',
      rectangles: [{ left: 140, top: 650, width: 80, height: 24 }] }).side).toBe('above');
  });
  it('centers above the selection with room for the upward handle', () => {
    const result = popupPosition(defaults);
    expect(result.side).toBe('above');
    expect(result.left + result.width / 2).toBe(180);
    expect(result.top + defaults.height).toBe(312);
  });
  it('uses below near the top and keeps that side when a submenu shrinks', () => {
    const rectangles = [{ left: 140, top: 200, width: 80, height: 24 }];
    expect(popupPosition({ ...defaults, rectangles }).side).toBe('below');
    expect(popupPosition({ ...defaults, rectangles, height: 108, preferred: 'below' }).side).toBe('below');
  });
  it('changes side when a larger submenu no longer fits', () => {
    expect(popupPosition({ ...defaults, height: 310, preferred: 'above' }).side).toBe('below');
  });
  it('limits height in free space instead of clamping the menu over the selection', () => {
    const result = popupPosition({ ...defaults, height: 600 });
    expect(result.side).toBe('below');
    expect(result.maxHeight).toBe(316);
    expect(result.top).toBeGreaterThanOrEqual(384 + 48);
    expect(result.top + result.maxHeight).toBe(748);
  });
  it('uses a compact bottom tray for a selection filling the screen', () => {
    const result = popupPosition({ ...defaults, height: 500,
      rectangles: [{ left: 20, top: 10, width: 350, height: 740 }] });
    expect(result.side).toBe('docked');
    expect(result.maxHeight).toBeLessThanOrEqual(760 * .4);
    expect(result.top + result.maxHeight).toBe(748);
  });
  it('respects the visible viewport when the keyboard or zoom changes its size and offset', () => {
    const viewport = { left: 50, top: 120, width: 260, height: 300 };
    const result = popupPosition({ ...defaults, viewport, width: 360, height: 500,
      rectangles: [{ left: 270, top: 180, width: 40, height: 190 }] });
    expect(result.left).toBeGreaterThanOrEqual(62);
    expect(result.left + result.width).toBeLessThanOrEqual(298);
    expect(result.top).toBeGreaterThanOrEqual(132);
    expect(result.top + Math.min(500, result.maxHeight)).toBeLessThanOrEqual(408);
  });
  it('anchors to visible lines of a multiline selection and fits both horizontal edges', () => {
    for (const left of [0, 380]) {
      const result = popupPosition({ ...defaults, rectangles: [
        { left, top: -100, width: 10, height: 24 }, { left, top: 360, width: 10, height: 24 },
      ] });
      expect(result.top).toBe(108);
      expect(result.left).toBeGreaterThanOrEqual(12);
      expect(result.left + result.width).toBeLessThanOrEqual(378);
    }
  });
});

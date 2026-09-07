// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { RelicsWorkspace } from './RelicsWorkspace';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it('opens the canonical particle reveal from a gallery card', () => {
  vi.stubGlobal('matchMedia', vi.fn((media: string) => ({ media, matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<RelicsWorkspace />));
    expect(container.querySelector('canvas.particle-canvas')).toBeNull();
    const reveal = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Reveal');
    expect(reveal).toBeDefined();
    act(() => reveal!.click());
    expect(container.querySelectorAll('canvas.particle-canvas')).toHaveLength(1);
  } finally {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

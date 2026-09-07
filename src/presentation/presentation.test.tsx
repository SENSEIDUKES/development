// @vitest-environment jsdom
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import {
  NarrativeButton,
  NarrativeCard,
  NarrativePresentationProvider,
  NarrativeTextBox,
  AmbientEffect,
} from './index';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi
      .fn()
      .mockImplementation((media: string) => ({
        media,
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('narrative host presentation', () => {
  it('keeps universal defaults usable without Library UI presentation', () => {
    const ref = createRef<HTMLInputElement>();
    const change = vi.fn();
    act(() =>
      root.render(
        <>
          <NarrativeTextBox
            ref={ref}
            label="World"
            onChange={change}
            defaultValue="Astral"
          />
          <NarrativeButton>Save</NarrativeButton>
          <AmbientEffect />
        </>,
      ),
    );
    expect(ref.current?.value).toBe('Astral');
    expect(container.querySelector('label')?.htmlFor).toBe(ref.current?.id);
    expect(container.querySelector('.glass-field')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    act(() => {
      setter.call(ref.current, 'Moon');
      ref.current!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(change).toHaveBeenCalledWith('Moon');
  });
  it('supplies canonical Library fields and particles while preserving refs and class overrides', () => {
    const ref = createRef<HTMLInputElement>();
    act(() =>
      root.render(
        <LibraryPresentationProvider>
          <NarrativeTextBox
            ref={ref}
            label="World"
            size="compact"
            className="px-8"
          />
          <AmbientEffect />
        </LibraryPresentationProvider>,
      ),
    );
    expect(ref.current?.className).toContain('glass-field');
    expect(ref.current?.className).toContain('library-compact-field');
    expect(ref.current?.className).toContain('px-8');
    expect(ref.current?.className).not.toContain('px-2.5');
    expect(container.querySelectorAll('canvas.particle-canvas')).toHaveLength(
      1,
    );
  });
  it('keeps nested host overrides local and card keyboard activation on the card itself', () => {
    const action = vi.fn();
    const components = { NarrativeButton: () => <button>Host action</button> };
    act(() =>
      root.render(
        <LibraryPresentationProvider>
          <NarrativePresentationProvider components={components}>
            <NarrativeButton>Save</NarrativeButton>
            <NarrativeCard interactive onClick={action}>
              <span tabIndex={0}>Descendant</span>
            </NarrativeCard>
          </NarrativePresentationProvider>
          <NarrativeButton>Sibling</NarrativeButton>
        </LibraryPresentationProvider>,
      ),
    );
    expect(container.textContent).toContain('Host action');
    expect(container.textContent).toContain('Sibling');
    const card = container.querySelector('[role="button"]')!;
    act(() =>
      card
        .querySelector('span')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        ),
    );
    expect(action).not.toHaveBeenCalled();
    act(() =>
      card.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      ),
    );
    expect(action).toHaveBeenCalledTimes(1);
  });
});

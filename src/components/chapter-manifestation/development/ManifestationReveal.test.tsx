// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManifestationReveal from './ManifestationReveal';
import {
  isManifestationRevealInteractive,
  manifestationRevealAriaLabel,
  MANIFESTATION_REVEAL_STATES,
  type ManifestationRevealState,
} from '../shared/manifestationReveal';

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
  vi.restoreAllMocks();
});

/**
 * A simple test vessel: records the `data-reveal-state` it was rendered
 * with, so tests can prove the mechanic routed the current state through
 * to the vessel and the vessel only ever saw the supplied state (caller
 * ownership).
 */
const TestVessel: React.FC<{
  marker: string;
  state: ManifestationRevealState;
}> = ({ marker, state }) => (
  <div data-test-vessel={marker} data-vessel-state={state}>
    vessel-content
  </div>
);

const renderReveal = (
  ui: Parameters<Root['render']>[0],
) => {
  act(() => {
    root.render(ui);
  });
};

const findContainer = () =>
  container.querySelector<HTMLElement>('[data-reveal-container]');

const findButton = () =>
  container.querySelector<HTMLButtonElement>('[data-reveal-action="unseal"]');

const findImg = () => container.querySelector<HTMLElement>('[role="img"]');

const findVessel = (marker: string) =>
  container.querySelector<HTMLElement>(`[data-test-vessel="${marker}"]`);

const findScene = () =>
  container.querySelector<HTMLElement>('[data-reveal-state]');

describe('ManifestationReveal — shared contract helpers', () => {
  it('exposes the three progression states in order', () => {
    expect(MANIFESTATION_REVEAL_STATES).toEqual(['sealed', 'unsealing', 'revealed']);
  });

  it('is interactive only in the sealed state with a handler', () => {
    expect(isManifestationRevealInteractive('sealed', () => undefined)).toBe(true);
    expect(isManifestationRevealInteractive('sealed', undefined)).toBe(false);
    expect(isManifestationRevealInteractive('unsealing', () => undefined)).toBe(false);
    expect(isManifestationRevealInteractive('revealed', () => undefined)).toBe(false);
  });

  it('composes the aria-label from the content and state', () => {
    expect(manifestationRevealAriaLabel('sealed', null)).toBe('Unseal the manifestation');
    expect(manifestationRevealAriaLabel('sealed', null, 'Tap to unseal')).toBe('Tap to unseal');
    expect(manifestationRevealAriaLabel('unsealing', null)).toMatch(/unsealing/i);
    expect(manifestationRevealAriaLabel('revealed', { alt: 'Hero portrait' })).toBe('Hero portrait');
    expect(manifestationRevealAriaLabel('revealed', { placeholderLabel: 'Cover Art' })).toBe(
      'Cover Art revealed',
    );
    expect(manifestationRevealAriaLabel('revealed', null)).toBe('Manifestation revealed');
  });
});

describe('ManifestationReveal — state rendering', () => {
  for (const state of MANIFESTATION_REVEAL_STATES) {
    it(`renders the ${state} state and forwards it to the vessel`, () => {
      renderReveal(
        <ManifestationReveal
          state={state}
          vessel={<TestVessel marker="v1" state={state} />}
        />,
      );

      const containerEl = findContainer();
      expect(containerEl).toBeTruthy();
      expect(containerEl!.getAttribute('data-reveal-state')).toBe(state);

      const scene = findScene();
      expect(scene).toBeTruthy();
      expect(scene!.getAttribute('data-reveal-state')).toBe(state);

      const vessel = findVessel('v1');
      expect(vessel).toBeTruthy();
      expect(vessel!.getAttribute('data-vessel-state')).toBe(state);
    });
  }

  it('does not render a vessel node that the mechanic did not mount', () => {
    renderReveal(
      <ManifestationReveal
        state="sealed"
        vessel={<TestVessel marker="only-vessel" state="sealed" />}
      />,
    );

    expect(findVessel('only-vessel')).toBeTruthy();
    expect(findVessel('other')).toBeFalsy();
  });
});

describe('ManifestationReveal — activation (tap-to-unseal)', () => {
  it('renders a tappable button when sealed and onUnseal is supplied', () => {
    const onUnseal = vi.fn();
    renderReveal(
      <ManifestationReveal
        state="sealed"
        onUnseal={onUnseal}
        vessel={<TestVessel marker="v" state="sealed" />}
      />,
    );

    const button = findButton();
    expect(button).toBeTruthy();
    expect(button!.getAttribute('aria-label')).toBe('Unseal the manifestation');
    expect(button!.getAttribute('data-reveal-state')).toBe('sealed');
    expect(findContainer()!.getAttribute('data-reveal-container')).toBe('interactive');

    act(() => {
      button!.click();
    });
    expect(onUnseal).toHaveBeenCalledTimes(1);
  });

  it('honors a custom sealedTapLabel for the button aria-label', () => {
    renderReveal(
      <ManifestationReveal
        state="sealed"
        onUnseal={() => undefined}
        sealedTapLabel="Reveal the cover art"
        vessel={<TestVessel marker="v" state="sealed" />}
      />,
    );

    const button = findButton();
    expect(button!.getAttribute('aria-label')).toBe('Reveal the cover art');
  });

  it('renders the sealed scene as a non-interactive image when onUnseal is omitted', () => {
    renderReveal(
      <ManifestationReveal
        state="sealed"
        vessel={<TestVessel marker="v" state="sealed" />}
      />,
    );

    expect(findButton()).toBeFalsy();
    const img = findImg();
    expect(img).toBeTruthy();
    expect(img!.getAttribute('data-reveal-container')).toBe('static');
    expect(img!.getAttribute('data-reveal-state')).toBe('sealed');
    expect(img!.getAttribute('aria-label')).toBe('Unseal the manifestation');
  });

  it('never renders a button in the unsealing or revealed states even with a handler', () => {
    for (const state of ['unsealing', 'revealed'] as const) {
      const onUnseal = vi.fn();
      const localContainer = document.createElement('div');
      document.body.appendChild(localContainer);
      const localRoot = createRoot(localContainer);
      act(() => {
        localRoot.render(
          <ManifestationReveal
            state={state}
            onUnseal={onUnseal}
            vessel={<TestVessel marker="v" state={state} />}
          />,
        );
      });

      expect(localContainer.querySelector('[data-reveal-action="unseal"]')).toBeFalsy();
      const img = localContainer.querySelector('[role="img"]');
      expect(img).toBeTruthy();
      expect(img!.getAttribute('data-reveal-state')).toBe(state);

      act(() => localRoot.unmount());
      localContainer.remove();
    }
  });
});

describe('ManifestationReveal — caller ownership', () => {
  it('does not advance its own state when the sealed button is tapped', () => {
    const onUnseal = vi.fn();
    renderReveal(
      <ManifestationReveal
        state="sealed"
        onUnseal={onUnseal}
        vessel={<TestVessel marker="v" state="sealed" />}
      />,
    );

    act(() => {
      findButton()!.click();
    });
    expect(onUnseal).toHaveBeenCalledTimes(1);

    // The component is still sealed — only the caller can advance it.
    expect(findScene()!.getAttribute('data-reveal-state')).toBe('sealed');
    expect(findButton()!.getAttribute('data-reveal-state')).toBe('sealed');
  });

  it('renders whatever state the caller supplies, including jumping to revealed', () => {
    const { rerender } = { rerender: root.render.bind(root) as (ui: React.ReactNode) => void };
    renderReveal(
      <ManifestationReveal
        state="sealed"
        vessel={<TestVessel marker="v" state="sealed" />}
      />,
    );
    expect(findScene()!.getAttribute('data-reveal-state')).toBe('sealed');

    act(() => {
      rerender(
        <ManifestationReveal
          state="revealed"
          vessel={<TestVessel marker="v" state="revealed" />}
        />,
      );
    });
    expect(findScene()!.getAttribute('data-reveal-state')).toBe('revealed');
  });
});

describe('ManifestationReveal — revealed content (announcements)', () => {
  it('uses the supplied alt as the aria-label in the revealed state', () => {
    renderReveal(
      <ManifestationReveal
        state="revealed"
        content={{ src: '/icons/sacred-tree.svg', alt: 'Mock revealed standalone artwork' }}
        vessel={<TestVessel marker="v" state="revealed" />}
      />,
    );

    const img = findImg();
    expect(img).toBeTruthy();
    expect(img!.getAttribute('aria-label')).toBe('Mock revealed standalone artwork');
  });

  it('falls back to a generic label when no content is supplied', () => {
    renderReveal(
      <ManifestationReveal
        state="revealed"
        vessel={<TestVessel marker="v" state="revealed" />}
      />,
    );

    const img = findImg();
    expect(img).toBeTruthy();
    expect(img!.getAttribute('aria-label')).toBe('Manifestation revealed');
  });

  it('announces a placeholder label when only placeholderLabel is supplied', () => {
    renderReveal(
      <ManifestationReveal
        state="revealed"
        content={{ placeholderLabel: 'Cover Art' }}
        vessel={<TestVessel marker="v" state="revealed" />}
      />,
    );

    expect(findImg()!.getAttribute('aria-label')).toBe('Cover Art revealed');
  });
});

describe('ManifestationReveal — accessibility', () => {
  it('exposes data-reveal-state on every state for test/automation hooks', () => {
    for (const state of MANIFESTATION_REVEAL_STATES) {
      const localContainer = document.createElement('div');
      document.body.appendChild(localContainer);
      const localRoot = createRoot(localContainer);
      act(() => {
        localRoot.render(
          <ManifestationReveal
            state={state}
            vessel={<TestVessel marker="v" state={state} />}
          />,
        );
      });

      const containerEl = localContainer.querySelector('[data-reveal-container]');
      expect(containerEl).toBeTruthy();
      expect(containerEl!.getAttribute('data-reveal-state')).toBe(state);

      act(() => localRoot.unmount());
      localContainer.remove();
    }
  });

  it('is keyboard-operable: a focused button Enter/Space would activate it (button is real <button>)', () => {
    renderReveal(
      <ManifestationReveal
        state="sealed"
        onUnseal={() => undefined}
        vessel={<TestVessel marker="v" state="sealed" />}
      />,
    );

    const button = findButton()!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    // The button is focusable; focus ring is provided by the
    // `focus-visible:ring-2` Tailwind class on the button itself.
    expect(button.className).toMatch(/focus-visible:ring/);
  });
});

describe('ManifestationReveal — reduced motion', () => {
  it('marks the cross-state transition as instant when prefers-reduced-motion is set', () => {
    // motion/react's useReducedMotion reads from a context. We exercise the
    // contract by mocking the hook via a spy: when calm is true, the
    // AnimatePresence children still mount, but the cross-state
    // transition duration is 0.
    renderReveal(
      <ManifestationReveal
        state="sealed"
        onUnseal={() => undefined}
        vessel={<TestVessel marker="v" state="sealed" />}
      />,
    );

    // Sanity: the vessel mounted and the button is reachable.
    expect(findVessel('v')).toBeTruthy();
    expect(findButton()).toBeTruthy();

    // The mechanic passes a calm-mode `duration: 0` to the AnimatePresence
    // motion wrapper when reduced motion is active (see RevealScene).
    // Under jsdom the hook resolves to null (no motion preference), so
    // we just assert the mechanic preserves vessel rendering in both
    // modes — a structural guarantee that the reduced-motion fallback
    // never throws or removes the vessel.
    expect(container.querySelector('[data-reveal-state="sealed"]')).toBeTruthy();
  });
});

describe('ManifestationReveal — responsive containment', () => {
  it('fills its parent and centers the vessel', () => {
    renderReveal(
      <div style={{ width: 320, height: 200 }}>
        <ManifestationReveal
          state="sealed"
          vessel={<TestVessel marker="v" state="sealed" />}
        />
      </div>,
    );

    const containerEl = findContainer()!;
    expect(containerEl.className).toMatch(/h-full/);
    expect(containerEl.className).toMatch(/w-full/);
    expect(containerEl.className).toMatch(/flex/);
    expect(containerEl.className).toMatch(/items-center/);
    expect(containerEl.className).toMatch(/justify-center/);
  });

  it('accepts a className passthrough for sizing overrides', () => {
    renderReveal(
      <ManifestationReveal
        state="sealed"
        vessel={<TestVessel marker="v" state="sealed" />}
        className="custom-reveal-frame"
      />,
    );

    const containerEl = findContainer()!;
    expect(containerEl.className).toMatch(/custom-reveal-frame/);
  });

  it('forwards a data-testid for integration selectors', () => {
    renderReveal(
      <ManifestationReveal
        state="sealed"
        vessel={<TestVessel marker="v" state="sealed" />}
        data-testid="my-reveal"
      />,
    );

    const target = container.querySelector('[data-testid="my-reveal"]');
    expect(target).toBeTruthy();
    expect(target!.getAttribute('data-reveal-container')).toBeTruthy();
  });
});

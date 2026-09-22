// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShopCard } from './ShopCard';

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

const render = async (node: React.ReactNode) => {
  await act(async () => { root.render(node); });
};

// React synthesizes pointerenter/pointerleave from pointerover/pointerout, so
// the gesture has to be dispatched as the event React actually delegates.
const pointer = async (element: Element, type: string, pointerType: string) => {
  const dispatched = type === 'pointerenter' ? 'pointerover' : type === 'pointerleave' ? 'pointerout' : type;
  await act(async () => {
    element.dispatchEvent(Object.assign(
      new Event(dispatched, { bubbles: true }),
      { pointerType, relatedTarget: null },
    ));
  });
};

/** The media renderer reports what the card told it, so previews can be asserted. */
const media = (active: boolean) => <img alt="artwork" data-active={active} src="/still.png" />;

describe('ShopCard', () => {
  it('shows the name, tier and price, and carries its identity and currency', async () => {
    await render(<ShopCard offerId="phoenix" name="Phoenix" rank="epic" currency="energy"
      renderMedia={media} price={<span data-store-price="600">600 Energy</span>} onOpen={vi.fn()} />);
    const card = container.querySelector('[data-store-offer="phoenix"]')!;
    expect(card.getAttribute('data-store-currency')).toBe('energy');
    expect(card.getAttribute('data-rarity')).toBe('epic');
    expect(card.querySelector('.shop-card-name')?.textContent).toBe('Phoenix');
    expect(card.querySelector('.shop-card-rank')?.textContent).toBe('epic');
    expect(card.querySelector('[data-store-price]')?.textContent).toBe('600 Energy');
  });

  it('replaces the price with an owned state rather than showing both', async () => {
    await render(<ShopCard offerId="phoenix" name="Phoenix" renderMedia={media}
      price={<span data-store-price="600">600 Energy</span>}
      state={{ label: 'Equipped', tone: 'equipped' }} onOpen={vi.fn()} />);
    expect(container.querySelector('[data-store-price]')).toBeNull();
    const state = container.querySelector('.shop-card-state')!;
    expect(state.textContent).toBe('Equipped');
    expect(state.getAttribute('data-tone')).toBe('equipped');
  });

  it('omits the tier badge for a kind of thing that has no tiers', async () => {
    await render(<ShopCard offerId="dawn-pack" name="Dawn Pack" renderMedia={media} onOpen={vi.fn()} />);
    expect(container.querySelector('.shop-card-rank')).toBeNull();
    expect(container.querySelector('[data-store-offer="dawn-pack"]')?.getAttribute('data-rarity')).toBeNull();
  });

  it('previews on mouse hover and on focus, and stops when they leave', async () => {
    await render(<ShopCard offerId="phoenix" name="Phoenix" renderMedia={media} onOpen={vi.fn()} />);
    const button = container.querySelector('button')!;
    const active = () => container.querySelector('img')?.getAttribute('data-active');
    expect(active()).toBe('false');
    await pointer(button, 'pointerenter', 'mouse');
    expect(active()).toBe('true');
    await pointer(button, 'pointerleave', 'mouse');
    expect(active()).toBe('false');
    await act(async () => { button.focus(); });
    expect(active()).toBe('true');
    await act(async () => { button.blur(); });
    expect(active()).toBe('false');
  });

  it('previews on a touch press, where there is no pointer to hover with', async () => {
    await render(<ShopCard offerId="phoenix" name="Phoenix" renderMedia={media} onOpen={vi.fn()} />);
    const button = container.querySelector('button')!;
    const active = () => container.querySelector('img')?.getAttribute('data-active');
    await pointer(button, 'pointerdown', 'touch');
    expect(active()).toBe('true');
    await pointer(button, 'pointerup', 'touch');
    expect(active()).toBe('false');
  });

  it('opens with the control to return focus to', async () => {
    const onOpen = vi.fn();
    await render(<ShopCard offerId="phoenix" name="Phoenix" renderMedia={media} onOpen={onOpen} />);
    const button = container.querySelector('button')!;
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    await act(async () => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(onOpen).toHaveBeenCalledWith(button);
  });
});

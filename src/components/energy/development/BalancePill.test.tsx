// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { BalancePill, BalancePills } from './BalancePill';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
const root = createRoot(container);
afterEach(() => act(() => root.render(null)));

describe('The official balance pill', () => {
  it('shows QI then Energy, each with its own mark, and never invents a number', () => {
    act(() => root.render(<BalancePills qi={{ amount: 1_000_000 }} energy={{ amount: null, state: 'loading' }} />));
    const pills = [...container.querySelectorAll<HTMLElement>('.balance-pill')];
    expect(pills.map(pill => pill.dataset.balance)).toEqual(['qi', 'energy']);
    expect(pills[0].textContent).toBe('1,000,000');
    expect(pills[0].getAttribute('aria-label')).toBe('1,000,000 QI available');
    expect(pills[1].textContent).toBe('—');
    expect(pills[1].getAttribute('aria-label')).toBe('Energy balance loading');
    expect(pills[1].querySelector('[data-energy-sun]')).not.toBeNull();
  });

  it('shortens numbers past 9,999,999 so every pill keeps one width, while the label keeps every digit', () => {
    act(() => root.render(<BalancePill kind="energy" amount={12_400_000} />));
    const pill = container.querySelector<HTMLElement>('.balance-pill')!;
    expect(pill.textContent).toBe('12.4M');
    expect(pill.getAttribute('aria-label')).toBe('12,400,000 Energy available');
  });

  it('leaves out a balance that is not connected', () => {
    act(() => root.render(<BalancePills qi={{ amount: 5 }} />));
    expect(container.querySelectorAll('.balance-pill')).toHaveLength(1);
    act(() => root.render(<BalancePills />));
    expect(container.querySelector('.balance-pills')).toBeNull();
  });
});

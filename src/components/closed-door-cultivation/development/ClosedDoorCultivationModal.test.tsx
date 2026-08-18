// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClosedDoorCultivationModal } from './ClosedDoorCultivationModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe('ClosedDoorCultivationModal Focus & Accessibility', () => {
  it('renders role="dialog" with aria-modal="true" and links to idle cultivation title', () => {
    act(() => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={vi.fn()}
          onClaim={vi.fn()}
          daysCultivating={7}
        />
      );
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toMatch(/^cdc-title-/);

    const titleId = dialog?.getAttribute('aria-labelledby');
    const title = titleId ? container.querySelector(`#${CSS.escape(titleId)}`) : null;
    expect(title).not.toBeNull();
    expect(title?.textContent?.trim()).toBe('Closed-Door Cultivation');
  });

  it('moves focus to the claim button when the dialog appears', async () => {
    const triggerButton = document.createElement('button');
    triggerButton.textContent = 'Trigger';
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={vi.fn()}
          onClaim={vi.fn()}
          daysCultivating={7}
        />
      );
    });

    // Wait for rAF
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');
    expect(claimButton).not.toBeNull();
    expect(document.activeElement).toBe(claimButton);

    triggerButton.remove();
  });

  it('restores focus to previous active element when dialog closes', async () => {
    const triggerButton = document.createElement('button');
    triggerButton.textContent = 'Trigger';
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    const { rerender } = {
      rerender: (props: any) =>
        act(() => {
          root.render(<ClosedDoorCultivationModal {...props} />);
        }),
    };

    await act(async () => {
      rerender({
        qiEarned: 150,
        onClose: vi.fn(),
        onClaim: vi.fn(),
        daysCultivating: 7,
      });
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');
    expect(document.activeElement).toBe(claimButton);

    // Close modal (qiEarned: null)
    await act(async () => {
      rerender({
        qiEarned: null,
        onClose: vi.fn(),
        onClaim: vi.fn(),
        daysCultivating: 7,
      });
    });

    expect(document.activeElement).toBe(triggerButton);
    triggerButton.remove();
  });

  it('collapses the dialog when pressing Escape', async () => {
    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={vi.fn()}
          onClaim={vi.fn()}
          daysCultivating={7}
        />
      );
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    // Press Escape
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Collapsed orb should be rendered and focused with parametric label
    const collapsedOrb = container.querySelector<HTMLButtonElement>('button[aria-label="Open closed-door cultivation reward of 150 Qi"]');
    expect(collapsedOrb).not.toBeNull();
    expect(document.activeElement).toBe(collapsedOrb);
  });

  it('traps focus inside the dialog when Tab is pressed', async () => {
    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={vi.fn()}
          onClaim={vi.fn()}
          daysCultivating={7}
        />
      );
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');
    expect(claimButton).not.toBeNull();
    expect(document.activeElement).toBe(claimButton);

    // Press Tab
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(tabEvent);
    });

    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(claimButton);

    // Press Shift+Tab
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(shiftTabEvent);
    });

    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(claimButton);
  });

  it('cycles focus back to claim button when expanding from collapsed orb', async () => {
    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={vi.fn()}
          onClaim={vi.fn()}
          daysCultivating={7}
        />
      );
    });

    // Collapse via Escape
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const collapsedOrb = container.querySelector<HTMLButtonElement>('button[aria-label="Open closed-door cultivation reward of 150 Qi"]');
    expect(collapsedOrb).not.toBeNull();
    expect(document.activeElement).toBe(collapsedOrb);

    // Expand
    act(() => {
      collapsedOrb?.click();
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');
    expect(claimButton).not.toBeNull();
    expect(document.activeElement).toBe(claimButton);
  });

  it('announces the reward amount while claiming', async () => {
    let resolveClaim: () => void = () => undefined;
    const onClaim = vi.fn(() => new Promise<void>((res) => { resolveClaim = res; }));

    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={350}
          onClose={vi.fn()}
          onClaim={onClaim}
          daysCultivating={7}
        />
      );
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 350 Qi & Awaken"]');
    expect(claimButton).not.toBeNull();

    // Trigger claim
    await act(async () => {
      claimButton?.click();
    });

    const absorbingButton = container.querySelector<HTMLButtonElement>('button[aria-label="350 Qi, absorbing…"]');
    expect(absorbingButton).not.toBeNull();
    expect(absorbingButton?.disabled).toBe(true);

    // Finish claim
    await act(async () => {
      resolveClaim();
    });
  });

  it('exposes days cultivating and progression quote via aria-describedby without aria-hidden on text (A3)', async () => {
    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={vi.fn()}
          onClaim={vi.fn()}
          daysCultivating={14}
        />
      );
    });

    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');
    expect(claimButton).not.toBeNull();
    const describedBy = claimButton?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const describedIds = describedBy!.split(' ');
    expect(describedIds.length).toBe(2);

    const daysEl = container.querySelector(`#${describedIds[0]}`);
    expect(daysEl).not.toBeNull();
    expect(daysEl?.textContent?.trim()).toBe('14 DAYS');
    expect(daysEl?.closest('[aria-hidden="true"]')).toBeNull();

    const quoteEl = container.querySelector(`#${describedIds[1]}`);
    expect(quoteEl).not.toBeNull();
    expect(quoteEl?.textContent?.trim()).toBeTruthy();
    expect(quoteEl?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('announces claim start and success via polite aria-live region (A4)', async () => {
    let resolveClaim: () => void = () => undefined;
    const onClaim = vi.fn(() => new Promise<void>((res) => {
      resolveClaim = res;
    }));

    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={vi.fn()}
          onClaim={onClaim}
          daysCultivating={7}
        />
      );
    });

    const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent?.trim()).toBe('');

    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');

    // Trigger claim
    await act(async () => {
      claimButton?.click();
    });

    expect(liveRegion?.textContent?.trim()).toBe('Absorbing 150 Qi…');

    // Finish claim
    await act(async () => {
      resolveClaim();
    });

    expect(liveRegion?.textContent?.trim()).toBe('Claimed 150 Qi.');
  });

  it('announces failure via polite aria-live region when claim fails (A4)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onClaim = vi.fn(() => Promise.reject(new Error('Network error')));

    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={350}
          onClose={vi.fn()}
          onClaim={onClaim}
          daysCultivating={7}
        />
      );
    });

    const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).not.toBeNull();

    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 350 Qi & Awaken"]');

    await act(async () => {
      claimButton?.click();
    });

    expect(liveRegion?.textContent?.trim()).toBe('Could not claim reward. Tap to retry.');
    errorSpy.mockRestore();
  });

  it('includes visible focus ring classes on the collapsed orb button (A5)', async () => {
    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={vi.fn()}
          onClaim={vi.fn()}
          daysCultivating={7}
        />
      );
    });

    // Collapse
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const collapsedOrb = container.querySelector<HTMLButtonElement>('button[aria-label="Open closed-door cultivation reward of 150 Qi"]');
    expect(collapsedOrb).not.toBeNull();

    expect(collapsedOrb?.className).toContain('focus-visible:ring-2');
    expect(collapsedOrb?.className).toContain('focus-visible:ring-portal/60');
    expect(collapsedOrb?.className).toContain('focus-visible:ring-offset-2');
    expect(collapsedOrb?.className).toContain('focus-visible:ring-offset-[#05080f]');
  });
});

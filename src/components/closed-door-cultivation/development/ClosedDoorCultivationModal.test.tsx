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

  it('dismisses the dialog when pressing Escape (K1)', async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={onClose}
          onClaim={vi.fn()}
          daysCultivating={7}
        />
      );
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    // Press Escape on document
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss when pressing Escape while claiming (K1)', async () => {
    const onClose = vi.fn();
    let resolveClaim: () => void = () => undefined;
    const onClaim = vi.fn(() => new Promise<void>((res) => { resolveClaim = res; }));

    await act(async () => {
      root.render(
        <ClosedDoorCultivationModal
          qiEarned={150}
          onClose={onClose}
          onClaim={onClaim}
          daysCultivating={7}
        />
      );
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');
    expect(claimButton).not.toBeNull();

    // Trigger claim
    await act(async () => {
      claimButton?.click();
    });

    // Press Escape during claim animation
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();

    // Clean up claim
    await act(async () => {
      resolveClaim();
    });
  });

  it('traps focus inside the dialog when Tab is pressed (K2)', async () => {
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
      document.dispatchEvent(tabEvent);
    });

    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(claimButton);

    // Press Shift+Tab
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(shiftTabEvent);
    });

    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(claimButton);
  });

  it('cycles focus back to claim button when expanding from collapsed orb', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
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

      // Auto-collapse after 5s timeout
      await act(async () => {
        vi.advanceTimersByTime(5000);
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
    } finally {
      vi.useRealTimers();
    }
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
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
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

      // Auto-collapse
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const collapsedOrb = container.querySelector<HTMLButtonElement>('button[aria-label="Open closed-door cultivation reward of 150 Qi"]');
      expect(collapsedOrb).not.toBeNull();

      expect(collapsedOrb?.className).toContain('focus-visible:ring-2');
      expect(collapsedOrb?.className).toContain('focus-visible:ring-portal/60');
      expect(collapsedOrb?.className).toContain('focus-visible:ring-offset-2');
      expect(collapsedOrb?.className).toContain('focus-visible:ring-offset-[#05080f]');
    } finally {
      vi.useRealTimers();
    }
  });

  it('collapses to the orb on the first pointerdown outside the dialog (U2)', async () => {
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

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    // Tap the page behind the (pointer-events-none) scrim
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });

    // Let the AnimatePresence exit animation finish before asserting removal
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(
      container.querySelector('button[aria-label="Open closed-door cultivation reward of 150 Qi"]')
    ).not.toBeNull();
  });

  it('does not collapse when the pointerdown lands inside the dialog (U2)', async () => {
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

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    act(() => {
      dialog!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('shows a visible retry message after a failed claim and clears it on the next attempt (U3)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let rejectClaim: (e: Error) => void = () => undefined;
    let resolveClaim: () => void = () => undefined;
    const onClaim = vi.fn(
      () =>
        new Promise<void>((res, rej) => {
          resolveClaim = res;
          rejectClaim = rej;
        })
    );

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

    const claimButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');
    expect(claimButton).not.toBeNull();

    // Fail the claim
    await act(async () => {
      claimButton?.click();
    });
    await act(async () => {
      rejectClaim(new Error('Network error'));
    });

    const retryMessage = Array.from(container.querySelectorAll('span')).find(
      (el) => el.textContent?.trim() === "Couldn't reach the Library. Tap the cloud to try again."
    );
    expect(retryMessage).toBeTruthy();

    // Retry: the message clears as soon as the next attempt starts
    const retryButton = container.querySelector<HTMLButtonElement>('button[aria-label="Claim 150 Qi & Awaken"]');
    await act(async () => {
      retryButton?.click();
    });
    const cleared = Array.from(container.querySelectorAll('span')).find(
      (el) => el.textContent?.trim() === "Couldn't reach the Library. Tap the cloud to try again."
    );
    expect(cleared).toBeUndefined();

    // Finish cleanly
    await act(async () => {
      resolveClaim();
    });
    errorSpy.mockRestore();
  });
});

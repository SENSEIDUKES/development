// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetMockState } from '../../reader-chamber/shared/stubs';
import { CodexHovercard } from './CodexHovercard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('CodexHovercard image eligibility', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetMockState();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const openHovercard = () => {
    const trigger = container.querySelector<HTMLElement>('[role="button"]');
    expect(trigger).toBeTruthy();
    act(() => trigger!.click());
  };

  it('does not expose a Manifest image action for an informational Faction', () => {
    act(() => root.render(
      <CodexHovercard
        term="Ninth House"
        type="faction"
        entry={{
          id: 'faction-ninth-house',
          name: 'Ninth House',
          description: 'An oathbound judicial faction.',
          alignment: 'Neutral',
          status: 'Active',
        }}
      >
        Ninth House
      </CodexHovercard>,
    ));
    openHovercard();

    expect(container.textContent).toContain('An oathbound judicial faction.');
    expect(container.querySelector('button[aria-label*="Manifest portrait"]')).toBeFalsy();
  });

  it('keeps the existing Manifest action for an eligible visual Codex entry', () => {
    act(() => root.render(
      <CodexHovercard
        term="Oath Seal"
        type="artifact"
        entry={{
          id: 'artifact-oath-seal',
          name: 'Oath Seal',
          description: 'A seal that binds spoken vows.',
          tier: 'Rare',
        }}
      >
        Oath Seal
      </CodexHovercard>,
    ));
    openHovercard();

    expect(container.querySelector('button[aria-label="Manifest portrait for Oath Seal"]')).toBeTruthy();
  });
});

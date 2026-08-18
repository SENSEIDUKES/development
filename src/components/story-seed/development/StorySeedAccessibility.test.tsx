// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyStorySeedInput } from '../shared/storySeedSchema';
import { StorySeedHeader } from './StorySeedHeader';
import { StorySeedMobileNavigation } from './StorySeedMobileNavigation';
import { OriginPremiseAndTags } from './workspaces/origin/OriginPremiseAndTags';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const buttonNamed = (name: string) => Array.from(
  container.querySelectorAll<HTMLButtonElement>('button'),
).find(button => button.textContent?.trim() === name);

describe('Story Seed keyboard and mobile navigation', () => {
  it('traps desktop Settings focus and restores it to the trigger on Escape', () => {
    act(() => root.render(
      <StorySeedHeader
        seed={createEmptyStorySeedInput()}
        updateSeed={vi.fn()}
        isGenerating={false}
        savedFeedback={false}
        showStoryBank={false}
        onSaveDraft={vi.fn()}
        onToggleStoryBank={vi.fn()}
        onOpenHelp={vi.fn()}
      />,
    ));

    const trigger = buttonNamed('Settings');
    expect(trigger).toBeTruthy();
    act(() => trigger!.click());

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = Array.from(dialog!.querySelectorAll<HTMLButtonElement>('button'));
    expect(dialog).toBeTruthy();
    expect(dialog?.contains(document.activeElement)).toBe(true);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })));
    expect(document.activeElement).toBe(first);

    first.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })));
    expect(document.activeElement).toBe(last);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps Tab native in Premise and presents suggestions as explicit buttons', () => {
    const onPremiseChange = vi.fn();
    const updateSeed = vi.fn();
    act(() => root.render(
      <OriginPremiseAndTags
        premise=""
        storyTags={[]}
        onPremiseChange={onPremiseChange}
        updateSeed={updateSeed}
        genrePicker={<button type="button">Genre</button>}
      />,
    ));

    const textarea = container.querySelector<HTMLTextAreaElement>('#core-premise-input');
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    act(() => textarea!.dispatchEvent(tab));
    expect(tab.defaultPrevented).toBe(false);
    expect(onPremiseChange).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('press Tab');

    act(() => root.render(
      <OriginPremiseAndTags
        premise="A reborn cultivator returns to the ruined sect."
        storyTags={[]}
        onPremiseChange={onPremiseChange}
        updateSeed={updateSeed}
        genrePicker={<button type="button">Genre</button>}
      />,
    ));
    expect(container.textContent).toContain('Add tag:');
    expect(container.textContent).not.toContain('Tab:');
  });

  it('shows four labeled mobile destinations and omits the placeholder Profile', () => {
    act(() => root.render(
      <StorySeedMobileNavigation
        seed={createEmptyStorySeedInput()}
        updateSeed={vi.fn()}
        activeSection="origin"
        showStoryBank={false}
        helpOpen={false}
        isGenerating={false}
        savedFeedback={false}
        onSelectSection={vi.fn()}
        onToggleStoryBank={vi.fn()}
        onOpenHelp={vi.fn()}
        onSaveDraft={vi.fn()}
      />,
    ));

    const nav = container.querySelector<HTMLElement>('nav[aria-label="Story Seed navigation"]');
    const buttons = Array.from(nav!.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([
      'Sections',
      'Story Bank',
      'Help',
      'Settings',
    ]);
    expect(buttons.every(button => !button.querySelector('.sr-only'))).toBe(true);
    expect(container.textContent).not.toContain('Profile');
  });
});

// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FamiliarHelperAction, FamiliarHelperProvider, useFamiliarHelperContext } from './FamiliarHelper';
import type { FamiliarHelperContext, FamiliarVoice } from '../../../library/familiars/helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const button = (label: string) => [...document.querySelectorAll('button')].find(element => element.textContent === label || element.getAttribute('aria-label') === label)!;
const click = async (label: string) => { await act(async () => button(label).click()); };
function Screen({ context }: { context: FamiliarHelperContext }) { useFamiliarHelperContext(context); return null; }
function setup() {
  let heard: (text: string) => void = () => {};
  const abort = vi.fn();
  const run = vi.fn(async () => {});
  const release = vi.fn();
  const voice: FamiliarVoice = { available: true,
    listen: vi.fn((_language, result) => { heard = result; return abort; }),
    speak: vi.fn(() => () => {}),
  };
  const context: FamiliarHelperContext = { key: 'reader:2', title: 'Fate', hint: 'Say Conflict.', interrupt: () => release,
    actions: [{ id: 'conflict', label: 'Conflict', phrases: ['conflict'], describe: () => 'Chapter 2: A rival arrives.', success: 'Saved.', run }],
  };
  const render = (screen: FamiliarHelperContext | undefined = context) => act(() => root.render(<StrictMode><FamiliarHelperProvider voice={voice}>
    {screen && <Screen context={screen} />}<FamiliarHelperAction />
  </FamiliarHelperProvider></StrictMode>));
  render();
  return { render, context, voice, run, release, abort, heard: (text: string) => heard(text) };
}

describe('Familiar helper surface', () => {
  it('focuses a nonmodal panel and returns focus on Escape without saving', async () => {
    const t = setup();
    await click('Talk to Familiar');
    const panel = document.querySelector('[role="dialog"]')!;
    expect(panel.getAttribute('aria-modal')).toBe('false');
    expect(document.activeElement).toBe(panel);
    await click('Conflict');
    expect(document.activeElement).toBe(button('Confirm'));
    expect(t.abort).toHaveBeenCalled();
    expect(t.voice.speak).not.toHaveBeenCalled();
    expect(t.run).not.toHaveBeenCalled();
    act(() => panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(button('Talk to Familiar'));
    expect(t.release).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('clears a proposal when the screen leaves and ignores late speech', async () => {
    const t = setup();
    await click('Talk to Familiar');
    await click('Conflict');
    // Explicitly render no screen under the same global provider.
    act(() => root.render(<StrictMode><FamiliarHelperProvider voice={t.voice}><FamiliarHelperAction /></FamiliarHelperProvider></StrictMode>));
    act(() => t.heard('confirm'));
    expect(document.body.textContent).toContain('No actions on this page yet.');
    expect(button('Confirm')).toBeUndefined();
    expect(t.run).not.toHaveBeenCalled();
    expect(t.release).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('applies once on confirmation and removes the proposal', async () => {
    const t = setup();
    await click('Talk to Familiar');
    await click('Conflict');
    await click('Confirm');
    expect(t.run).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain('Saved.');
    expect(document.activeElement).toBe(document.querySelector('[role="dialog"]'));
    expect(button('Confirm')).toBeUndefined();
    expect(t.release).toHaveBeenCalledExactlyOnceWith(true);
  });
});

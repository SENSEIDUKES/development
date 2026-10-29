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
    listen: vi.fn((_language, result) => { heard = result; return { stop: vi.fn(), cancel: abort }; }),
    speak: vi.fn(() => () => {}),
  };
  const context: FamiliarHelperContext = { key: 'reader:2', title: 'Fate', hint: 'Say Conflict.', topics: [], interrupt: () => release,
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
    expect(document.body.textContent).toContain('Nothing to do here yet.');
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
  it('explains a topic with its clip and recorded voice, and keeps a topic without a clip compact', async () => {
    const t = setup();
    const play = vi.fn(() => () => {});
    const voice = { ...t.voice, play };
    const topics = [
      { id: 'codex', label: 'Codex', phrases: ['codex'], explanation: 'The Codex keeps who you have met.', audioUrl: 'https://cdn.example/codex.mp3', videoUrl: 'https://cdn.example/codex.mp4' },
      { id: 'fate', label: 'Fate', phrases: ['fate'], explanation: 'Fate chooses the next chapter.' },
    ];
    act(() => root.render(<StrictMode><FamiliarHelperProvider voice={voice}>
      <Screen context={{ ...t.context, topics }} /><FamiliarHelperAction />
    </FamiliarHelperProvider></StrictMode>));
    await click('Talk to Familiar');
    await click('Explain');
    expect(document.querySelector('video')).toBeNull();
    await click('Fate');
    expect(document.querySelector('.familiar-helper-topic')!.textContent).toContain('Fate chooses the next chapter.');
    expect(document.querySelector('video')).toBeNull();
    expect(voice.speak).toHaveBeenLastCalledWith('Fate chooses the next chapter.', 'en-US', expect.any(Function), expect.any(Function));
    await click('Codex');
    expect(document.querySelector('video')!.getAttribute('src')).toBe('https://cdn.example/codex.mp4');
    expect(play).toHaveBeenCalledWith('https://cdn.example/codex.mp3', expect.any(Function), expect.any(Function));
    expect(t.run).not.toHaveBeenCalled();
  });
  it('keeps how to talk behind the info button', async () => {
    setup();
    await click('Talk to Familiar');
    expect(document.body.textContent).not.toContain('Say Conflict.');
    await click('How to talk to your Familiar');
    expect(document.querySelector('.familiar-helper-info')!.textContent).toContain('Say Conflict.');
  });
});

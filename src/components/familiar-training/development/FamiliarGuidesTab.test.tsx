// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FamiliarHelperProvider } from '../../familiar/development/FamiliarHelper';
import type { FamiliarVoice } from '../../../library/familiars/helper';
import type { FamiliarGuide } from '../../familiar/shared/familiar';
import { normalizeFamiliarGuidesSeen } from '../../familiar/shared/familiar';
import { FamiliarGuidesTab } from './FamiliarGuidesTab';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GUIDES: FamiliarGuide[] = [
  { id: 'meet', title: 'Meet your Familiar', line: 'I go everywhere you go.', videoUrl: 'https://cdn.example/meet.mp4' },
  { id: 'seed', title: 'Start a story seed', line: 'Every story begins as a seed.' },
  { id: 'highlight', title: 'Use the highlight engine', line: 'Highlight a line.', videoUrl: 'https://cdn.example/highlight.mp4', audioUrl: 'https://cdn.example/highlight.mp3' },
];

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

const voice = (): FamiliarVoice & { speak: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn> } => ({
  available: true,
  listen: vi.fn(() => ({ stop: vi.fn(), cancel: vi.fn() })),
  speak: vi.fn(() => () => {}),
  play: vi.fn(() => () => {}),
});
const click = (element: Element | null | undefined) => { expect(element).toBeTruthy(); act(() => { (element as HTMLElement).click(); }); };
const guideButton = (id: string) => container.querySelector(`[data-familiar-guide="${id}"]`);
const step = (which: 'next' | 'previous') => container.querySelector(`[data-familiar-guide-step="${which}"]`);
const openId = () => container.querySelector('[data-familiar-guide-open]')?.getAttribute('data-familiar-guide-open');

describe('Familiar Guides tab', () => {
  it('lists every guide, marks the first unwatched one, and keeps guides without a video as coming soon', () => {
    act(() => root.render(<FamiliarGuidesTab guides={GUIDES} name="Quill" seen={['meet']} />));
    expect([...container.querySelectorAll('[data-familiar-guide]')].map(entry => entry.getAttribute('data-familiar-guide'))).toEqual(['meet', 'seed', 'highlight']);
    expect(guideButton('meet')!.hasAttribute('data-seen')).toBe(true);
    expect(guideButton('meet')!.textContent).toContain('(watched)');
    expect(guideButton('seed')!.querySelector('[data-familiar-guide-start]')).toBeTruthy();
    expect(guideButton('seed')!.querySelector('[data-familiar-coming-soon]')).toBeTruthy();
    expect(guideButton('highlight')!.querySelector('[data-familiar-coming-soon]')).toBeNull();
  });

  it('plays a guide’s clip with its line, steps through the guides, and marks a watched guide seen', () => {
    const onSeen = vi.fn();
    act(() => root.render(<FamiliarGuidesTab guides={GUIDES} name="Quill" onSeen={onSeen} />));
    click(guideButton('meet'));
    expect(openId()).toBe('meet');
    expect(container.querySelector('video')!.getAttribute('src')).toBe('https://cdn.example/meet.mp4');
    expect(container.querySelector('video')!.muted).toBe(true);
    expect(container.querySelector('[data-familiar-guide-line]')!.textContent).toBe('I go everywhere you go.');
    expect(onSeen).toHaveBeenCalledExactlyOnceWith('meet');
    // A guide not recorded yet is read, not counted as watched.
    click(step('next'));
    expect(openId()).toBe('seed');
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('[data-familiar-guide-video="none"]')!.textContent).toContain('Coming soon');
    expect(onSeen).toHaveBeenCalledTimes(1);
    // Steps wrap, and the keyboard's arrows step too.
    click(step('previous'));
    click(step('previous'));
    expect(openId()).toBe('highlight');
    act(() => { container.querySelector('[data-familiar-guide-open]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(openId()).toBe('meet');
    click(container.querySelector('[data-familiar-guides-list]'));
    expect(openId()).toBeUndefined();
    expect(document.activeElement).toBe(guideButton('meet'));
  });

  it('frames a tall recording whole instead of cropping it to a wide shape', () => {
    act(() => root.render(<FamiliarGuidesTab guides={GUIDES} name="Quill" openGuideId="meet" />));
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'videoWidth', { value: 1080 });
    Object.defineProperty(video, 'videoHeight', { value: 1920 });
    act(() => { video.dispatchEvent(new Event('loadedmetadata')); });
    expect(container.querySelector('[data-familiar-clip]')!.getAttribute('data-shape')).toBe('tall');
  });

  it('has the Familiar read a guide’s line: its recording where there is one, its device voice otherwise', () => {
    const familiarVoice = voice();
    act(() => root.render(<FamiliarHelperProvider voice={familiarVoice}><FamiliarGuidesTab guides={GUIDES} name="Quill" openGuideId="seed" /></FamiliarHelperProvider>));
    click(container.querySelector('[data-familiar-guide-hear]'));
    expect(familiarVoice.speak).toHaveBeenCalledWith('Every story begins as a seed.', 'en-US', expect.any(Function), expect.any(Function));
    expect(container.querySelector('[data-familiar-guide-hear]')!.getAttribute('aria-label')).toBe('Stop');
    click(step('next'));
    click(container.querySelector('[data-familiar-guide-hear]'));
    expect(familiarVoice.play).toHaveBeenCalledWith('https://cdn.example/highlight.mp3', expect.any(Function), expect.any(Function));
  });

  it('hides Hear it where no Familiar is present to speak', () => {
    act(() => root.render(<FamiliarGuidesTab guides={GUIDES} name="Quill" openGuideId="seed" />));
    expect(container.querySelector('[data-familiar-guide-line]')).toBeTruthy();
    expect(container.querySelector('[data-familiar-guide-hear]')).toBeNull();
  });
});

describe('watched guides on the profile', () => {
  it('keeps only valid, distinct guide ids', () => {
    expect(normalizeFamiliarGuidesSeen(undefined)).toEqual([]);
    expect(normalizeFamiliarGuidesSeen(['meet', 'meet', '', 3, ' seed '])).toEqual(['meet', 'seed']);
    expect(normalizeFamiliarGuidesSeen(Array.from({ length: 150 }, (_, index) => `g${index}`))).toHaveLength(100);
  });
});

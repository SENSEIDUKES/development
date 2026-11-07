// @vitest-environment jsdom
import { act, Profiler, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FamiliarHelperProvider } from './FamiliarHelper';
import type { FamiliarVoice } from '../../../library/familiars/helper';
import { celestialGuardian, celestialGuardianOption } from '../../../host/familiar/celestialGuardian';
import { allFamiliarOptions, familiarCatalogue } from '../../../host/familiar/catalogue';
import { familiarLookAnimation } from './useFamiliarLook';
import { Familiar } from './Familiar';
import { FamiliarSprite } from './FamiliarSprite';
import { FamiliarHero } from './FamiliarHero';
import { FamiliarSettingsMenu } from '../../familiar-training/development/FamiliarSettingsMenu';
import { FamiliarCompanion } from './FamiliarCompanion';
import { FamiliarRecall } from './FamiliarRecall';
import { FAMILIAR_MOBILE_QUERY } from './useFamiliarMobile';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let reduced = false;
let mobile = false;
let mediaListeners: Set<() => void>;
let frames: Map<number, FrameRequestCallback>;
const flushFrames = () => act(() => {
  const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0));
});
beforeEach(() => {
  reduced = false;
  mobile = false;
  mediaListeners = new Set();
  frames = new Map();
  let nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation((media: string) => ({ media, get matches() { return media === FAMILIAR_MOBILE_QUERY ? mobile : reduced; }, addEventListener: (_: string, callback: () => void) => mediaListeners.add(callback), removeEventListener: (_: string, callback: () => void) => mediaListeners.delete(callback) })) });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const atlas = () => container.querySelector<HTMLImageElement>('.familiar-sprite-atlas')!;
const imageLoaded = () => act(() => atlas().dispatchEvent(new Event('load')));
const frame = () => container.querySelector('[data-familiar-frame]')?.getAttribute('data-familiar-frame');
const click = async (element: Element | null | undefined) => { expect(element).toBeTruthy(); await act(async () => (element as HTMLElement).click()); };
const hover = (element: Element, entering: boolean) => {
  const event = new Event(entering ? 'pointerover' : 'pointerout', { bubbles: true });
  Object.assign(event, { pointerType: 'mouse' });
  act(() => element.dispatchEvent(event));
};
const touch = (element: Element, type: string) => {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { pointerType: 'touch' });
  act(() => element.dispatchEvent(event));
};
const voice = (): FamiliarVoice => ({ available: true, listen: vi.fn(() => ({ stop: vi.fn(), cancel: vi.fn() })), speak: vi.fn(() => () => {}) });
const GUIDES = [
  { id: 'meet', title: 'Meet your Familiar', line: 'I go everywhere you go.' },
  { id: 'seed', title: 'Start a story seed', line: 'Every story begins as a seed.' },
];
const guidesButton = () => document.querySelector<HTMLButtonElement>('[aria-label="Guides"]');
const card = () => document.querySelector<HTMLElement>('[data-familiar-welcome]');
const helperCard = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Familiar"]');
const playing = () => document.querySelector<HTMLElement>('[data-familiar-guides-playing]');

describe('Familiar sprite playback', () => {
  it.each(familiarCatalogue.map(entry => entry.definition))('holds every $displayName idle frame six times longer in companion mode', familiar => {
    vi.useFakeTimers();
    act(() => root.render(<FamiliarSprite familiar={familiar} playback="companion" />));
    imageLoaded();
    const idle = familiar.animations.idle;
    for (let index = 0; index < idle.columns.length; index++) {
      expect(frame()).toBe(String(index));
      act(() => vi.advanceTimersByTime(idle.durations[index] * 6 - 1));
      expect(frame()).toBe(String(index));
      act(() => vi.advanceTimersByTime(1));
    }
    expect(frame()).toBe('0');
    act(() => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finishes three reaction cycles before looking, without restarts from mouse targets or rerenders', () => {
    vi.useFakeTimers();
    const render = (lookAnimation?: string) => act(() => root.render(<FamiliarSprite familiar={celestialGuardian} playback="companion" animation="waving" lookAnimation={lookAnimation} />));
    const pose = () => container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose');
    render(); imageLoaded();
    const loadedAtlas = atlas();
    act(() => vi.advanceTimersByTime(140));
    expect(frame()).toBe('1');
    render('look-270');
    expect(frame()).toBe('1');
    expect(pose()).toBe('reacting');
    act(() => vi.advanceTimersByTime(1960 - 1));
    expect(pose()).toBe('reacting');
    act(() => vi.advanceTimersByTime(1));
    expect(pose()).toBe('looking');
    expect(atlas().style.transform).toBe('translate(-50%, -90.9090909090909%)');
    expect(vi.getTimerCount()).toBe(0);
    render('look-270');
    act(() => vi.advanceTimersByTime(30_000));
    expect(pose()).toBe('looking');
    expect(atlas()).toBe(loadedAtlas);
    render();
    expect(pose()).toBe('idle');
    act(() => vi.advanceTimersByTime(1680));
    expect(frame()).toBe('1');
  });

  it('finishes an engagement while the action tray stays open, and reacts again on a new engagement', () => {
    vi.useFakeTimers();
    const render = () => act(() => root.render(<Familiar familiar={celestialGuardian} playback="companion" />));
    render(); imageLoaded();
    hover(container.querySelector('.familiar-interaction')!, true);
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('reacting');
    act(() => vi.advanceTimersByTime(2100));
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('idle');
    expect(container.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(false);
    render();
    act(() => vi.advanceTimersByTime(1680));
    expect(frame()).toBe('1');
    hover(container.querySelector('.familiar-interaction')!, false);
    hover(container.querySelector('.familiar-interaction')!, true);
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('reacting');
  });

  it('resets a held gaze when inspecting the same idle clip without reloading the image', () => {
    vi.useFakeTimers();
    act(() => root.render(<Familiar familiar={celestialGuardian} playback="companion" lookAnimation="look-270" />));
    imageLoaded();
    const loadedAtlas = atlas();
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('looking');
    act(() => root.render(<Familiar familiar={celestialGuardian} playback="companion" animation="idle" lookAnimation="look-270" />));
    expect(atlas()).toBe(loadedAtlas);
    expect(atlas().style.transform).toBe('translate(0%, 0%)');
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Celestial Guardian, Idle');
    expect(container.querySelector('.familiar-sprite')?.hasAttribute('data-familiar-pose')).toBe(false);
    act(() => vi.advanceTimersByTime(280));
    expect(frame()).toBe('1');
    act(() => root.render(<Familiar familiar={celestialGuardian} playback="companion" />));
    act(() => vi.advanceTimersByTime(2340));
    expect(frame()).toBe('2');
    act(() => root.render(<Familiar familiar={celestialGuardian} playback="companion" animation="idle" />));
    expect(frame()).toBe('0');
    expect(atlas().style.transform).toBe('translate(0%, 0%)');
  });

  it('replaces changed activity, suppresses paused reactions, and preserves raw inspection and one-shots', () => {
    vi.useFakeTimers();
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} playback="companion" activity="running" />));
    imageLoaded();
    act(() => vi.advanceTimersByTime(300));
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} playback="companion" activity="blocked" />));
    expect(frame()).toBe('0');
    expect(atlas().style.transform).toBe('translate(0%, -45.45454545454545%)');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} playback="companion" activity="blocked" paused />));
    expect(vi.getTimerCount()).toBe(0);
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} playback="companion" activity="blocked" />));
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('idle');
    act(() => root.render(<Familiar familiar={celestialGuardian} playback="companion" animation="idle" />));
    imageLoaded();
    act(() => vi.advanceTimersByTime(280));
    expect(frame()).toBe('1');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} playback="companion" animation="waving" playOnce={0} />));
    imageLoaded();
    expect(vi.getTimerCount()).toBe(0);
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} playback="companion" animation="waving" playOnce={1} />));
    act(() => vi.advanceTimersByTime(700));
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('resting');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops companion reactions offscreen, hidden, reduced, failed or unmounted and resumes calmly', () => {
    vi.useFakeTimers();
    let intersect!: IntersectionObserverCallback;
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect() {} });
    const visibility = (isIntersecting: boolean) => act(() => intersect([{ isIntersecting }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    const render = (animation = 'idle') => act(() => root.render(<FamiliarSprite familiar={celestialGuardian} playback="companion" animation={animation} lookAnimation="look-090" />));
    render(); imageLoaded(); visibility(true);
    render('waving');
    expect(vi.getTimerCount()).toBe(1);
    visibility(false);
    expect(vi.getTimerCount()).toBe(0);
    visibility(true);
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('looking');
    reduced = true;
    act(() => mediaListeners.forEach(listener => listener()));
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('resting');
    expect(vi.getTimerCount()).toBe(0);
    reduced = false;
    act(() => mediaListeners.forEach(listener => listener()));
    render('running');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(vi.getTimerCount()).toBe(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('looking');
    render('failed');
    act(() => atlas().dispatchEvent(new Event('error')));
    expect(vi.getTimerCount()).toBe(0);
    act(() => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['000', '022.5', '045', '067.5', '090', '112.5', '135', '157.5', '180', '202.5', '225', '247.5', '270', '292.5', '315', '337.5'])('selects the supplied %s degree look sector', direction => {
    const angle = Number(direction) * Math.PI / 180;
    expect(familiarLookAnimation({ left: 0, top: 0, width: 100, height: 100 }, 50 + 100 * Math.sin(angle), 50 - 100 * Math.cos(angle))).toBe(`look-${direction}`);
    expect(familiarLookAnimation({ left: 0, top: 0, width: 100, height: 100 }, 50, 50)).toBeUndefined();
  });

  it('stays neutral until requested, plays one complete wave, and does not restart or repeat it', () => {
    vi.useFakeTimers();
    const render = (request = 0) => act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="waving" playOnce={request} />));
    const pose = () => container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose');
    render();
    imageLoaded();
    const resting = atlas().style.transform;
    expect(resting).toBe('translate(-75%, 0%)');
    act(() => vi.advanceTimersByTime(20_000));
    render();
    expect(atlas().style.transform).toBe(resting);
    expect(pose()).toBe('resting');
    expect(vi.getTimerCount()).toBe(0);
    render(1);
    expect(atlas().style.transform).not.toBe(resting);
    expect(pose()).toBe('playing');
    act(() => vi.advanceTimersByTime(300));
    render(2); // Another interaction during a wave must not restart it.
    act(() => vi.advanceTimersByTime(399));
    expect(pose()).toBe('playing');
    act(() => vi.advanceTimersByTime(1));
    expect(atlas().style.transform).toBe(resting);
    expect(pose()).toBe('resting');
    act(() => vi.advanceTimersByTime(20_000));
    render(2);
    expect(pose()).toBe('resting');
    expect(vi.getTimerCount()).toBe(0);
    render(3);
    expect(pose()).toBe('playing');
    act(() => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores requests while paused, offscreen, backgrounded or under reduced motion without replaying later', () => {
    vi.useFakeTimers();
    let intersect!: IntersectionObserverCallback;
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect() {} });
    let request = 0;
    const render = (paused = false) => act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="waving" playOnce={request} paused={paused} />));
    const wave = (paused = false) => { request += 1; render(paused); };
    const visible = (isIntersecting: boolean) => act(() => intersect([{ isIntersecting }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    render();
    imageLoaded();
    wave(); // Offscreen.
    expect(vi.getTimerCount()).toBe(0);
    visible(true);
    expect(vi.getTimerCount()).toBe(0);
    wave();
    expect(container.querySelector('.familiar-sprite')?.getAttribute('data-familiar-pose')).toBe('playing');
    render(true);
    wave(true);
    expect(atlas().style.transform).toBe('translate(-75%, 0%)');
    expect(vi.getTimerCount()).toBe(0);
    render();
    expect(vi.getTimerCount()).toBe(0);
    wave();
    visible(false);
    expect(vi.getTimerCount()).toBe(0);
    visible(true);
    reduced = true;
    act(() => mediaListeners.forEach(listener => listener()));
    wave();
    expect(vi.getTimerCount()).toBe(0);
    reduced = false;
    act(() => mediaListeners.forEach(listener => listener()));
    expect(vi.getTimerCount()).toBe(0);
    wave();
    expect(vi.getTimerCount()).toBe(1);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    wave();
    act(() => vi.advanceTimersByTime(10_000));
    expect(atlas().style.transform).toBe('translate(-75%, 0%)');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses exact supplied idle durations, skips unused cells, loops, pauses, and clears timers', () => {
    vi.useFakeTimers();
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} />));
    imageLoaded();
    act(() => vi.advanceTimersByTime(279));
    expect(frame()).toBe('0');
    act(() => vi.advanceTimersByTime(1));
    expect(frame()).toBe('1');
    expect(atlas().style.transform).toBe('translate(-12.5%, 0%)');
    for (const duration of [110, 110, 140, 140, 320]) act(() => vi.advanceTimersByTime(duration));
    expect(frame()).toBe('0');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} paused />));
    act(() => vi.advanceTimersByTime(2000));
    expect(frame()).toBe('0');
    act(() => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resets when switching clips and renders static neutral and look cells without timers', () => {
    vi.useFakeTimers();
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="running-right" />));
    const initialAtlas = atlas();
    expect(container.querySelector('.familiar-sprite-placeholder')).not.toBeNull();
    imageLoaded();
    expect(container.querySelector('.familiar-sprite-placeholder')).toBeNull();
    act(() => vi.advanceTimersByTime(120));
    expect(frame()).toBe('1');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="neutral" />));
    expect(atlas()).toBe(initialAtlas);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('');
    expect(frame()).toBe('0');
    expect(atlas().style.transform).toBe('translate(-75%, 0%)');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="look-270" />));
    expect(atlas()).toBe(initialAtlas);
    expect(atlas().style.transform).toBe('translate(-50%, -90.9090909090909%)');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('selects the supplied Codex activity clip when used as a standalone renderer', () => {
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} activity="ready" />));
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Celestial Guardian, Thoughtful review');
  });

  it('respects reduced motion and reports a missing image', () => {
    vi.useFakeTimers();
    reduced = true;
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} />));
    imageLoaded();
    act(() => vi.advanceTimersByTime(2000));
    expect(frame()).toBe('0');
    expect(vi.getTimerCount()).toBe(0);
    act(() => atlas().dispatchEvent(new Event('error')));
    expect(container.textContent).toContain('Familiar artwork could not load.');
  });

  it('plays without React commits and stops offscreen, in the background, and after unmount', () => {
    vi.useFakeTimers();
    let intersect!: IntersectionObserverCallback;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect = disconnect; });
    const commit = vi.fn();
    act(() => root.render(<Profiler id="sprite" onRender={commit}><FamiliarSprite familiar={celestialGuardian} /></Profiler>));
    imageLoaded();
    expect(vi.getTimerCount()).toBe(0);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    const count = commit.mock.calls.length;
    act(() => vi.advanceTimersByTime(390));
    expect(frame()).toBe('2');
    expect(commit).toHaveBeenCalledTimes(count);
    act(() => intersect([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(vi.getTimerCount()).toBe(0);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(vi.getTimerCount()).toBe(0);
    act(() => root.render(null));
    expect(disconnect).toHaveBeenCalledOnce();
    expect(mediaListeners.size).toBe(0);
  });
});

describe('Familiar tray', () => {
  it('announces artwork status outside the image semantics and describes the trigger', () => {
    act(() => root.render(<Familiar familiar={celestialGuardian} />));
    const status = container.querySelector('[role="status"]')!;
    expect(status.closest('[role="img"]')).toBeNull();
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.hasAttribute('data-failed')).toBe(false);
    expect(container.querySelector('button')!.getAttribute('aria-describedby')).toContain(status.id);
    expect(status.textContent).toBe('Loading Familiar…');
    imageLoaded();
    expect(status.textContent).toBe('');
    act(() => atlas().dispatchEvent(new Event('error')));
    expect(status.hasAttribute('data-failed')).toBe(true);
    expect(status.textContent).toBe('Familiar artwork could not load.');
  });

  it('keeps its Guides beside the card’s microphone, not in its tray; they play in the card in the mode it is in, and nothing navigates', async () => {
    const before = window.location.href;
    await act(async () => root.render(<FamiliarHelperProvider voice={voice()} guides={{ guides: GUIDES, familiar: celestialGuardianOption }}>
      <FamiliarCompanion familiar={celestialGuardian} />
    </FamiliarHelperProvider>));
    const pet = () => document.querySelector<HTMLElement>('.familiar-companion .familiar-trigger')!;
    await click(pet());
    expect(document.querySelector('[aria-label="Show Energy"]')).toBeNull();
    // The tray has no Guides: they are this screen's quick action, beside the card's microphone.
    expect(document.querySelector('.familiar-actions [aria-label="Guides"]')).toBeNull();
    await click(document.querySelector('[aria-label="Talk to Familiar"]'));
    expect(guidesButton()!.closest('.familiar-helper-bottom')).toBeTruthy();
    expect(playing()).toBeNull();
    // In Action mode the guide plays in Action mode: no extra step to switch.
    await click(helperCard()!.querySelector('[aria-label="Action"]'));
    await click(guidesButton());
    expect(helperCard()!.querySelector('[aria-label="Action"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(guidesButton()!.getAttribute('aria-pressed')).toBe('true');
    // The guide plays in the Familiar's card, in place of its topics, with the microphone still under it. No second window.
    expect(card()).toBeNull();
    expect(playing()!.closest('[aria-label="Familiar"]')).toBe(helperCard());
    expect(helperCard()!.querySelector('.familiar-helper-mic')).toBeTruthy();
    expect(playing()!.querySelector('[data-familiar-guide-open]')?.getAttribute('data-familiar-guide-open')).toBe('meet');
    expect(playing()!.querySelectorAll('.familiar-guide-progress > li')).toHaveLength(2);
    // What the Familiar says shows two lines; a tap shows all of it.
    const whole = playing()!.querySelector<HTMLButtonElement>('.familiar-guide-line-toggle')!;
    expect(whole.getAttribute('aria-expanded')).toBe('false');
    await click(whole);
    expect(whole.getAttribute('aria-expanded')).toBe('true');
    // Back waits on the first guide, and Done comes on the last.
    expect(playing()!.querySelector<HTMLButtonElement>('[data-familiar-guide-step="previous"]')!.disabled).toBe(true);
    expect(playing()!.querySelector('[data-familiar-guides-done]')).toBeNull();
    await click(playing()!.querySelector('[data-familiar-guide-step="next"]'));
    expect(playing()!.querySelector('[data-familiar-guide-open]')?.getAttribute('data-familiar-guide-open')).toBe('seed');
    expect(playing()!.querySelector('[data-familiar-guide-step="next"]')).toBeNull();
    // The last guide does not wrap around to the first.
    act(() => { playing()!.querySelector('[data-familiar-guide-open]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(playing()!.querySelector('[data-familiar-guide-open]')?.getAttribute('data-familiar-guide-open')).toBe('seed');
    // Done gives the card its actions back; the card stays open.
    await click(playing()!.querySelector('[data-familiar-guides-done]'));
    expect(playing()).toBeNull();
    expect(helperCard()).toBeTruthy();
    expect(window.location.href).toBe(before);
    // The Guides button toggles; choosing Explain or Action ends a guide too, and closing the card ends it.
    await click(guidesButton());
    expect(playing()).toBeTruthy();
    await click(guidesButton());
    expect(playing()).toBeNull();
    await click(guidesButton());
    await click(helperCard()!.querySelector('[aria-label="Explain"]'));
    expect(playing()).toBeNull();
    await click(guidesButton());
    await click(helperCard()!.querySelector('[aria-label="Close Familiar"]'));
    expect(helperCard()).toBeNull();
    // Opened to talk, the card shows its topics, not the guide it was closed on.
    await click(pet());
    await click(document.querySelector('[aria-label="Talk to Familiar"]'));
    expect(helperCard()).toBeTruthy();
    expect(playing()).toBeNull();
  });

  it('greets a reader who has not met it once; Show me around opens its card on the guides, and either answer is remembered', async () => {
    const onWelcomed = vi.fn();
    await act(async () => root.render(<FamiliarHelperProvider voice={voice()} guides={{ guides: GUIDES, familiar: celestialGuardianOption, welcome: true, onWelcomed }}>
      <FamiliarCompanion familiar={celestialGuardian} />
    </FamiliarHelperProvider>));
    expect(card()?.textContent).toContain('I’m Celestial Guardian.');
    await click(card()!.querySelector('[data-familiar-welcome-tour]'));
    expect(card()).toBeNull();
    expect(playing()!.querySelector('[data-familiar-guide-open]')?.getAttribute('data-familiar-guide-open')).toBe('meet');
    expect(onWelcomed).toHaveBeenCalledOnce();
  });

  it('has no Guides button where the host gives it no guides', async () => {
    await act(async () => root.render(<Familiar familiar={celestialGuardian} />));
    await click(container.querySelector('button'));
    expect(guidesButton()).toBeNull();
  });
});

describe('Familiar hero', () => {
  it('keeps the catalogue rarity and default on the options it is given', () => {
    expect(allFamiliarOptions).toHaveLength(12);
    expect(allFamiliarOptions.find(option => option.id === 'celestial-guardian')?.rarity).toBe('epic');
    const quill = allFamiliarOptions.find(option => option.id === 'quill')!;
    expect([quill.rarity, quill.isDefault]).toEqual(['common', true]);
    // Only a Familiar with its own clip carries one.
    expect(allFamiliarOptions.filter(option => option.videoUrl).map(option => option.id)).toEqual(['celestial-guardian']);
  });

  it('plays only while active, and falls back to the host still image when the hero is unavailable', () => {
    act(() => root.render(<FamiliarHero option={celestialGuardianOption} active={false} />));
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.stillUrl);
    act(() => root.render(<FamiliarHero option={celestialGuardianOption} active />));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.heroUrl);
    act(() => img.dispatchEvent(new Event('error')));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.stillUrl);
    expect(img.dataset.fallback).toBe('true');
  });
});

describe('Floating companion', () => {
  function ManagedCompanion() {
    const [minimized, setMinimized] = useState(false);
    return <>
      {minimized && <FamiliarRecall familiar={celestialGuardian} onRecall={() => setMinimized(false)} />}
      <FamiliarCompanion familiar={celestialGuardian} minimized={minimized} onMinimize={() => setMinimized(true)} />
    </>;
  }
  const pet = () => document.querySelector<HTMLButtonElement>('.familiar-companion button')!;
  const pointer = (type: string, x: number, y: number, pointerId = 1, pointerType = 'mouse') => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { clientX: x, clientY: y, pointerId, pointerType, button: 0, isPrimary: pointerId === 1 });
    act(() => pet().dispatchEvent(event));
    flushFrames();
  };
  const mouseClick = () => act(() => { pet().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })); });
  const location = () => {
    const style = document.querySelector<HTMLElement>('.familiar-companion')!.style;
    const [x, y] = style.transform.match(/-?[\d.]+/g)!.map(Number);
    return { x, y };
  };

  it('tracks the mouse only inside the preview, holds a sector, and clears touch, blur, reduction and minimize', () => {
    vi.useFakeTimers();
    const boundary = document.createElement('div');
    const boundaryRef = { current: boundary };
    vi.spyOn(boundary, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 800, bottom: 700, width: 800, height: 700 } as DOMRect);
    const render = (minimized = false, animation?: string) => act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} boundaryRef={boundaryRef} minimized={minimized} animation={animation} />));
    render();
    const sprite = document.querySelector<HTMLElement>('.familiar-companion .familiar-sprite')!;
    const spriteAtlas = document.querySelector<HTMLImageElement>('.familiar-companion .familiar-sprite-atlas')!;
    vi.spyOn(sprite, 'getBoundingClientRect').mockReturnValue({ left: 500, top: 400, right: 600, bottom: 500, width: 100, height: 100 } as DOMRect);
    act(() => spriteAtlas.dispatchEvent(new Event('load')));
    const move = (x: number, y: number, pointerType = 'mouse', type = 'pointermove') => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { clientX: x, clientY: y, pointerType });
      act(() => document.dispatchEvent(event));
    };
    move(400, 450);
    expect(sprite.dataset.familiarPose).toBe('looking');
    expect(sprite.getAttribute('aria-label')).toBe('Celestial Guardian, Look 270°');
    const held = spriteAtlas.style.transform;
    move(401, 450);
    act(() => vi.advanceTimersByTime(30_000));
    expect(spriteAtlas.style.transform).toBe(held);
    expect(vi.getTimerCount()).toBe(0);
    move(900, 450);
    expect(sprite.dataset.familiarPose).toBe('idle');
    move(400, 450); move(400, 450, 'touch', 'pointerdown');
    expect(sprite.dataset.familiarPose).toBe('idle');
    move(400, 450);
    act(() => window.dispatchEvent(new Event('blur')));
    expect(sprite.dataset.familiarPose).toBe('idle');
    move(400, 450);
    act(() => document.dispatchEvent(new Event('pointerout')));
    expect(sprite.dataset.familiarPose).toBe('idle');
    reduced = true;
    act(() => mediaListeners.forEach(listener => listener()));
    move(400, 450);
    expect(sprite.dataset.familiarPose).toBe('resting');
    expect(vi.getTimerCount()).toBe(0);
    reduced = false;
    act(() => mediaListeners.forEach(listener => listener()));
    render(false, 'running-right');
    move(400, 450);
    expect(sprite.getAttribute('aria-label')).toBe('Celestial Guardian, Moving right');
    act(() => vi.advanceTimersByTime(120));
    expect(sprite.dataset.familiarFrame).toBe('1');
    render(true);
    expect(document.querySelector('.familiar-companion')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    act(() => root.render(null));
    expect(mediaListeners.size).toBe(0);
  });

  it.each(['mouse', 'touch'])('distinguishes %s drag from tap and only shows its actions after a tap', async pointerType => {
    await act(async () => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    pointer('pointerdown', 900, 600, 1, pointerType);
    pointer('pointermove', 100, 100, 2, pointerType);
    expect(document.querySelector('[data-dragging]')).toBeNull();
    pointer('pointermove', -2000, -2000, 1, pointerType);
    expect(location()).toEqual({ x: 12, y: 12 });
    pointer('pointerup', -2000, -2000, 1, pointerType);
    mouseClick();
    expect(pet().getAttribute('aria-expanded')).toBe('false');
    pointer('pointerdown', 50, 50, 1, pointerType);
    pointer('pointermove', 52, 51, 1, pointerType);
    pointer('pointerup', 52, 51, 1, pointerType);
    await act(async () => mouseClick());
    expect(pet().getAttribute('aria-expanded')).toBe('true');
  });

  it('cleans up cancelled gestures, supports keyboard movement, and reclamps after resizing', async () => {
    await act(async () => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    pointer('pointerdown', 900, 600);
    pointer('pointermove', 890, 580);
    pointer('pointercancel', 890, 580);
    mouseClick();
    expect(pet().getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-dragging]')).toBeNull();
    const before = location();
    act(() => pet().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })));
    expect(location().x).toBe(before.x - 16);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving left');
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 });
      act(() => window.dispatchEvent(new Event('resize')));
      flushFrames();
      expect(location().x).toBeLessThanOrEqual(204);
      expect(location().y).toBeLessThanOrEqual(300 - 12 - 104 * 208 / 192 + 0.001);
      await click(pet()); // Keyboard-style activation still works after a cancelled pointer.
      expect(pet().getAttribute('aria-expanded')).toBe('true');
      expect(document.querySelector('[aria-label="Minimize Familiar"], [aria-label="Talk to Familiar"]')).toBeDefined();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    }
  });

  it('keeps hidden comparison panes from creating another floating companion', () => {
    const hidden = document.createElement('div');
    const boundaryRef = { current: hidden };
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} boundaryRef={boundaryRef} />));
    expect(document.querySelector('.familiar-companion')).toBeNull();
  });

  it('minimizes from the action tray, restores its position, and returns keyboard focus', async () => {
    await act(async () => root.render(<ManagedCompanion />));
    act(() => pet().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    const before = location();
    await click(pet());
    await click(document.querySelector('[aria-label="Minimize Familiar"]')!);
    expect(document.querySelector('.familiar-companion')).toBeNull();
    const recall = container.querySelector<HTMLButtonElement>('.familiar-recall')!;
    expect(document.activeElement).toBe(recall);
    await click(recall);
    expect(document.querySelector('.familiar-companion')).toBeNull();
    await click(document.querySelector('[aria-label="Expand Familiar"]')!);
    expect(location()).toEqual(before);
    expect(document.activeElement).toBe(pet());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('resizes live, preserves aspect ratio, and caps invalid host preferences', () => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} size={2} />));
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('208px');
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} size={0.6} />));
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('62.4px');
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} size={NaN} />));
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('104px');
    expect(container.querySelector('.familiar-companion')).toBeNull(); // The pet remains portalled to the page.
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} size={2} bottomInset={72} />));
    pointer('pointerdown', 600, 500);
    pointer('pointermove', 4000, 4000);
    pointer('pointerup', 4000, 4000);
    expect(location().y + 208 * (208 / 192) + 48).toBeLessThanOrEqual(window.innerHeight - 72 - 12 + 0.001);
  });

  it('reveals actions on mouse hover, dismisses them outside, and preserves touch access', async () => {
    await act(async () => root.render(<FamiliarCompanion familiar={celestialGuardian} activity="running" />));
    expect(document.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(true);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Working with timepiece');
    pointer('pointerover', 100, 100);
    expect(document.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(false);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Waving');
    await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(document.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(true);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Working with timepiece');
    await click(document.querySelector('[aria-label="Show Familiar actions"]')!);
    expect(document.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(false);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Waving');
  });

  it('does not let a keyboard movement reset interrupt a pointer drag', () => {
    vi.useFakeTimers();
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    act(() => pet().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })));
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving left');
    pointer('pointerdown', 600, 500);
    pointer('pointermove', 640, 500);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving right');
    act(() => vi.advanceTimersByTime(280));
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving right');
  });

  it.each([
    ['running', 'Working with timepiece'],
    ['needs-input', 'Waiting for input'],
    ['ready', 'Thoughtful review'],
    ['blocked', 'Disappointed'],
  ] as const)('uses the supplied Codex %s activity clip', (activity, label) => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} activity={activity} />));
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe(`Celestial Guardian, ${label}`);
  });

  it('uses the supplied side-running animation for horizontal drag direction and restores activity on release', () => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} activity="running" />));
    pointer('pointerdown', 600, 500);
    pointer('pointermove', 640, 500);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving right');
    const reversal = new Event('pointermove', { bubbles: true });
    Object.assign(reversal, { clientX: 620, clientY: 500, pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true });
    act(() => {
      pet().dispatchEvent(reversal); // Reverse before crossing the original pointer-down position.
      expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving left');
    });
    flushFrames();
    pointer('pointerup', 620, 500);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Working with timepiece');
  });

  it('does not substitute an unrelated task animation for a vertical drag', () => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    pointer('pointerdown', 600, 500);
    pointer('pointermove', 600, 440);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Idle');
  });
});

describe('Header Familiar actions', () => {
  it('opens the Familiar’s card, and its guides, from the header without restoring the floating pet until Expand is chosen', async () => {
    const onRecall = vi.fn();
    await act(async () => root.render(<FamiliarHelperProvider voice={voice()} guides={{ guides: GUIDES, familiar: celestialGuardianOption }}><FamiliarRecall familiar={celestialGuardian} onRecall={onRecall} /></FamiliarHelperProvider>));
    await click(container.querySelector('.familiar-recall')!);
    expect(container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Waving');
    expect(document.querySelector('[aria-label="Show Energy"]')).toBeNull();
    expect(guidesButton()).toBeNull();
    await click(document.querySelector('[aria-label="Talk to Familiar"]'));
    await click(guidesButton());
    // The guides open in the Familiar's card, even while it waits in the header.
    expect(playing()).toBeTruthy();
    expect(onRecall).not.toHaveBeenCalled();
    await click(playing()!.querySelector('[data-familiar-guides-close]'));
    expect(playing()).toBeNull();
    await click(helperCard()!.querySelector('[aria-label="Close Familiar"]'));
    await click(container.querySelector('.familiar-recall')!);
    await click(document.querySelector('[aria-label="Expand Familiar"]')!);
    expect(onRecall).toHaveBeenCalledOnce();
  });
});

describe('Mobile sizing and inactive work', () => {
  it('maps mobile 10–100 to 0.6–1.5, defaults/resets to 50, and preserves desktop preferences on resize', async () => {
    mobile = true;
    const change = vi.fn();
    const render = (size?: number) => act(() => root.render(<>
      <FamiliarSettingsMenu settings={{ size, onSizeChange: change }} familiar={{ id: celestialGuardian.id, catalogueName: 'Celestial Guardian', owned: true }} onClose={vi.fn()} />
      <FamiliarCompanion familiar={celestialGuardian} size={size} />
    </>));
    const value = () => document.querySelector('[data-familiar-size-value]')!.textContent;
    const step = (label: 'Smaller' | 'Larger') => document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
    render();
    expect(value()).toBe('50%');
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('104px');
    await click(step('Larger'));
    expect(change).toHaveBeenLastCalledWith(1.1);
    render(0.6);
    expect(value()).toBe('10%');
    expect(step('Smaller').disabled).toBe(true);
    render(2);
    expect(value()).toBe('100%');
    expect(step('Larger').disabled).toBe(true);
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('156px');
    await click([...document.querySelectorAll<HTMLButtonElement>('.familiar-settings-footer button')].find(button => button.textContent === 'Restore defaults')!);
    expect(change).toHaveBeenLastCalledWith(1);
    change.mockClear();
    act(() => { mobile = false; mediaListeners.forEach(update => update()); });
    expect(value()).toBe('200%');
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('208px');
    expect(change).not.toHaveBeenCalled();
  });

  it('batches scroll measurements and detaches geometry work while minimized', () => {
    const boundary = document.createElement('div');
    const measure = vi.spyOn(boundary, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 1000, bottom: 800 } as DOMRect);
    const boundaryRef = { current: boundary };
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} boundaryRef={boundaryRef} />));
    measure.mockClear();
    for (let n = 0; n < 20; n++) act(() => window.dispatchEvent(new Event('scroll')));
    expect(measure).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    flushFrames();
    expect(measure).toHaveBeenCalledOnce();
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} boundaryRef={boundaryRef} minimized />));
    measure.mockClear();
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(frames.size).toBe(0);
    expect(measure).not.toHaveBeenCalled();
  });

  it('coalesces drag samples, flushes the final position on release, and cancels queued work on unmount', () => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    const pet = document.querySelector('.familiar-companion button')!;
    const pointer = (type: string, x: number) => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { pointerId: 1, button: 0, clientX: x, clientY: 500, isPrimary: true });
      act(() => pet.dispatchEvent(event));
    };
    pointer('pointerdown', 900);
    const before = document.querySelector<HTMLElement>('.familiar-companion')!.style.transform;
    for (let x = 890; x >= 700; x -= 10) pointer('pointermove', x);
    expect(frames.size).toBe(1);
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.transform).toBe(before);
    pointer('pointerup', 700);
    expect(frames.size).toBe(0);
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.transform).not.toBe(before);
    pointer('pointerdown', 700);
    pointer('pointermove', 650);
    expect(frames.size).toBe(1);
    act(() => root.render(null));
    expect(frames.size).toBe(0);
  });

  it('releases the animated hero when offscreen and resumes the supplied GIF on return', () => {
    let intersect!: IntersectionObserverCallback;
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect() {} });
    act(() => root.render(<FamiliarHero option={celestialGuardianOption} active />));
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.stillUrl);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.heroUrl);
    act(() => intersect([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.stillUrl);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.heroUrl);
  });
});

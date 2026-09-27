// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NarrativeAudioProvider, type NarrativeAudioPlayback } from '../../../audio/playback';
import { TextHighlightEnginePreview } from './TextHighlightEngineWorkspace';
import { previewBlocks } from './previewData';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: Root;
const replace = vi.fn();
const stop = vi.fn();
const playback = {
  autoplayBlocked: false, currentSource: null, currentTrackId: null, errorMessage: '', hasError: false,
  isBuffering: false, isMuted: false, isPlaying: false, volume: 1,
  load: vi.fn(), pause: vi.fn(), play: vi.fn(), replace, restart: vi.fn(), setVolume: vi.fn(), stop,
  subscribe: () => () => {}, subscribeToTrackChange: () => () => {}, subscribeToQueueEnd: () => () => {}, toggleMute: vi.fn(),
} as unknown as NarrativeAudioPlayback;
const button = (name: string) => Array.from(document.querySelectorAll('button')).find(item => item.textContent === name)!;
const click = (name: string) => act(() => button(name).click());
const block = () => host.querySelector<HTMLElement>('[data-sen-text-block="harbor-arrival"]')!;
async function select(node: Node, start: number, end: number) {
  await act(async () => {
    const range = document.createRange(); range.setStart(node, start); range.setEnd(node, end);
    document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
}
function openCue() { click('Media'); click('Audio'); click('Cue'); }
function inlinePhrase() { return block().querySelector<HTMLElement>('[data-cue-annotation] .inline-world-cue-annotation__text')!; }

beforeEach(() => {
  replace.mockClear(); stop.mockClear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Range.prototype.getClientRects = () => [{ left: 100, top: 200, right: 230, bottom: 222, width: 130, height: 22 }] as unknown as DOMRectList;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(<NarrativeAudioProvider value={playback}><TextHighlightEnginePreview /></NarrativeAudioProvider>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); document.getSelection()?.removeAllRanges(); vi.unstubAllGlobals(); });

describe('Workshop manual Sound Cue flow', () => {
  it('navigates nested actions, previews and places one existing cue through shared playback', async () => {
    const paragraph = block(); const original = previewBlocks[0].text;
    await select(paragraph.firstChild!, 12, 35);
    expect(button('Edit')).toBeDefined(); expect(button('Media')).toBeDefined();
    openCue();
    expect(document.querySelectorAll('.sen-manual-cue-picker__item')).toHaveLength(92);
    expect(document.querySelector('.sen-text-highlight-marks span')).not.toBeNull();
    const first = document.querySelector('.sen-manual-cue-picker__item')!;
    act(() => first.querySelectorAll('button')[0].click());
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({ id: expect.stringContaining('manual-cue-preview:'), source: expect.stringMatching(/^https:/) }));
    act(() => first.querySelectorAll('button')[1].click());
    expect(block()).toBe(paragraph);
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    expect(inlinePhrase().textContent).toBe(original.slice(12, 35));
    expect(block().textContent?.replaceAll('\u2060', '')).toBe(original);
    expect(document.querySelector('.sen-manual-cue-picker')).toBeNull();
    act(() => block().querySelector<HTMLButtonElement>('[data-action-type="world-cue"]')!.click());
    expect(replace.mock.lastCall?.[0]).toMatchObject({ id: expect.stringContaining('reader-inline:manual-world-cue:'),
      source: expect.stringMatching(/^https:/) });
  });

  it('reselects annotated prose for replacement and removal without duplicate glyphs', async () => {
    await select(block().firstChild!, 12, 35); openCue();
    act(() => document.querySelector('.sen-manual-cue-picker__item')!.querySelectorAll('button')[1].click());
    await select(inlinePhrase().firstChild!, 0, inlinePhrase().textContent!.length);
    openCue();
    expect(button('Remove cue')).toBeDefined();
    act(() => document.querySelectorAll('.sen-manual-cue-picker__item')[1].querySelectorAll('button')[1].click());
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    await select(inlinePhrase().firstChild!, 0, inlinePhrase().textContent!.length);
    openCue(); click('Remove cue');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(0);
    expect(block().textContent).toBe(previewBlocks[0].text);
  });

  it('rejects a second cue whose selected range overlaps an existing placement', async () => {
    await select(block().firstChild!, 12, 35); openCue();
    act(() => document.querySelector('.sen-manual-cue-picker__item')!.querySelectorAll('button')[1].click());
    const anchored = inlinePhrase().firstChild!;
    await select(anchored, 2, 12); openCue();
    act(() => document.querySelector('.sen-manual-cue-picker__item')!.querySelectorAll('button')[1].click());
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('overlaps an existing cue');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
  });

  it('rebases an annotation after an earlier Edit and drops it when its words change', async () => {
    await select(block().firstChild!, 12, 35); openCue();
    act(() => document.querySelector('.sen-manual-cue-picker__item')!.querySelectorAll('button')[1].click());
    await select(block().firstChild!, 0, 2); click('Edit');
    act(() => {
      const editor = block().querySelector('[contenteditable]')!;
      editor.textContent = 'Before'; editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    click('Save');
    expect(block().textContent?.replaceAll('\u2060', '')).toBe(`Before${previewBlocks[0].text.slice(2)}`);
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    await select(inlinePhrase().firstChild!, 0, inlinePhrase().textContent!.length);
    click('Edit');
    act(() => {
      const editor = block().querySelector('[contenteditable]')!;
      editor.textContent = 'the old pier'; editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    click('Save');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(0);
  });

  it('restores an anchored cue after undoing a deletion immediately before it', async () => {
    await select(block().firstChild!, 12, 35); openCue();
    act(() => document.querySelector('.sen-manual-cue-picker__item')!.querySelectorAll('button')[1].click());
    await select(block().firstChild!, 0, 12); click('Edit');
    act(() => {
      const editor = block().querySelector('[contenteditable]')!;
      editor.textContent = ''; editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    click('Delete Passage');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    click('Undo');
    expect(block().textContent?.replaceAll('\u2060', '')).toBe(previewBlocks[0].text);
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    expect(inlinePhrase().textContent).toBe(previewBlocks[0].text.slice(12, 35));
  });
});

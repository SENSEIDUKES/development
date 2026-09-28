// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextHighlightEngine } from './TextHighlightEngine';
import type { PassageSelection, TextHighlightBlock } from '../shared/selection';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let update: (blocks: TextHighlightBlock[]) => void;
let setFixed: (fixed: boolean) => void;
const changed = vi.fn();
const selections = vi.fn<(selection: PassageSelection | null) => void>();
const initial = [{ id: 'a', text: 'Before middle after.' }, { id: 'b', text: 'Another paragraph.' }];
function Host() {
  const [blocks, setBlocks] = useState(initial); update = setBlocks;
  const [fixed, setFixedState] = useState(false); setFixed = setFixedState;
  return <TextHighlightEngine blocks={blocks} onBlocksChange={(next, edit) => { changed(next, edit); setBlocks(next); }} onSelectionChange={selections} editable={!fixed} />;
}
const button = (name: string) => Array.from(document.querySelectorAll('button')).find(node => node.textContent === name);
const click = (name: string) => act(() => button(name)!.click());
const block = (id = 'a') => container.querySelector<HTMLElement>(`[data-sen-text-block="${id}"]`)!;
async function select(from = 7, to = 13, id = 'a') {
  await act(async () => {
    const node = block(id).firstChild!; const range = document.createRange(); range.setStart(node, from); range.setEnd(node, to);
    document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange')); await vi.runAllTimersAsync();
  });
}
function fill(value: string) {
  act(() => {
    const input = document.querySelector('[contenteditable]')!;
    input.textContent = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
beforeEach(() => {
  vi.useFakeTimers(); changed.mockClear(); selections.mockClear();
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Range.prototype.getClientRects = () => [{ left: 100, top: 200, right: 170, bottom: 222, width: 70, height: 22 }] as unknown as DOMRectList;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  act(() => root.render(<Host />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); document.getSelection()?.removeAllRanges(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Text Highlight Engine', () => {
  it('captures the final drag range before keyboard focus enters Edit', async () => {
    await select(7, 11);
    act(() => {
      const range = document.createRange(); range.setStart(block().firstChild!, 7); range.setEnd(block().firstChild!, 13);
      document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
      document.dispatchEvent(new Event('pointerup'));
      button('Edit')!.focus();
    });
    await act(async () => { await vi.runAllTimersAsync(); });
    click('Edit'); expect(document.querySelector('[contenteditable]')?.textContent).toBe('middle');
  });
  it('edits only the intended passage, retains identity, and clears state', async () => {
    const element = block(); await select();
    expect(selections).toHaveBeenLastCalledWith({ blockId: 'a', selectedText: 'middle', startOffset: 7, endOffset: 13 });
    expect(document.querySelector('.sen-text-highlight-marks span')).not.toBeNull();
    click('Edit'); expect(document.querySelector('[contenteditable]')?.textContent).toBe('middle');
    expect(block().querySelector('[contenteditable]')).not.toBeNull();
    fill('new text'); click('Save');
    expect(block()).toBe(element); expect(block().textContent).toBe('Before new text after.');
    expect(block('b').textContent).toBe(initial[1].text);
    expect(button('Edit')).toBeUndefined(); expect(document.querySelector('[contenteditable]')).toBeNull();
    expect(selections).toHaveBeenLastCalledWith(null);
  });
  it('requires explicit deletion, then restores the exact text through Undo', async () => {
    await select(); click('Edit'); fill('');
    expect(button('Save')?.disabled).toBe(true); expect(changed).not.toHaveBeenCalled();
    click('Delete Passage'); expect(block().textContent).toBe('Before  after.');
    expect(changed.mock.lastCall?.[1].operation).toBe('delete');
    click('Undo'); expect(block().textContent).toBe(initial[0].text); expect(button('Undo')).toBeUndefined();
  });
  it('keeps inline draft input isolated until Save, including literal markup and newlines', async () => {
    await select(); click('Edit');
    const editor = block().querySelector('[contenteditable]')!;
    act(() => editor.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    fill('<b>new</b>\nwords');
    expect(changed).not.toHaveBeenCalled();
    expect(block().querySelector('b')).toBeNull();
    expect(block().textContent).toBe('Before <b>new</b>\nwords after.');
    click('Save');
    expect(changed.mock.lastCall?.[1].before.text).toBe(initial[0].text);
    expect(block().textContent).toBe('Before <b>new</b>\nwords after.');
    expect(block().querySelector('[contenteditable]')).toBeNull();
  });
  it('dismisses an unsaved draft through Escape or outside pointer activation', async () => {
    await select(); click('Edit'); fill('discard');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('[contenteditable]')).toBeNull(); expect(changed).not.toHaveBeenCalled();
    await select(); click('Edit');
    act(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(document.querySelector('[contenteditable]')).toBeNull(); expect(block().textContent).toBe(initial[0].text);
  });
  it('ignores collapsed selections and invalidates drafts after external updates', async () => {
    await select(7, 7); expect(button('Edit')).toBeUndefined();
    await select(); click('Edit');
    act(() => update([{ id: 'a', text: 'Changed externally.' }, initial[1]]));
    expect(document.querySelector('[contenteditable]')).toBeNull(); expect(changed).not.toHaveBeenCalled();
  });
  it('keeps Undo across edits to another block and invalidates it for changed source text', async () => {
    await select(); click('Edit'); fill(''); click('Delete Passage');
    await select(0, 7, 'b'); click('Edit'); fill('Different'); click('Save');
    expect(button('Undo')).toBeDefined(); click('Undo');
    expect(block('b').textContent).toBe('Different paragraph.');
    await select(); click('Edit'); fill(''); click('Delete Passage');
    act(() => update([{ id: 'a', text: 'External replacement' }, initial[1]]));
    expect(button('Undo')).toBeUndefined();
  });
  it('moves the first Tab after a selection into its controls, whatever the host renders after the prose', async () => {
    const after = document.createElement('button'); after.textContent = 'Host control'; container.append(after);
    await select();
    const shiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(shiftTab); });
    expect(shiftTab.defaultPrevented).toBe(false);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(tab); });
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('Edit'));
    const again = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(again); });
    expect(again.defaultPrevented).toBe(false);
    // Once focus leaves for the host's own control, Tab keeps its normal order for this selection.
    act(() => after.focus());
    const onward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(onward); });
    expect(onward.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(after);
    // A new selection gets its own first-Tab jump.
    await select(0, 6);
    const fresh = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(fresh); });
    expect(fresh.defaultPrevented).toBe(true);
    after.remove();
  });
  it('closes an open draft when the host fixes its text mid-edit', async () => {
    await select(); click('Edit'); fill('unsaved words');
    expect(document.querySelector('[contenteditable]')).not.toBeNull();
    act(() => setFixed(true));
    expect(document.querySelector('[contenteditable]')).toBeNull();
    expect(button('Save')).toBeUndefined();
    expect(block().textContent).toBe(initial[0].text);
    expect(changed).not.toHaveBeenCalled();
  });
  it('offers no Edit, Delete or Undo once the host fixes its text, but still reports selections', async () => {
    await select(); click('Edit'); fill(''); click('Delete Passage');
    expect(button('Undo')).toBeDefined();
    act(() => setFixed(true));
    expect(button('Undo')).toBeUndefined();
    await select(0, 6);
    expect(selections).toHaveBeenLastCalledWith({ blockId: 'a', selectedText: 'Before', startOffset: 0, endOffset: 6 });
    expect(document.querySelector('.sen-text-highlight-marks span')).not.toBeNull();
    expect(button('Edit')).toBeUndefined();
    expect(document.querySelector('.sen-text-highlight-controls')).toBeNull();
  });
  it('keeps the desktop bar inline, just under the selection', async () => {
    await select();
    const controls = document.querySelector<HTMLElement>('.sen-text-highlight-controls')!;
    expect(controls.dataset.layout).toBe('inline');
    expect(controls.querySelector('.sen-text-highlight-actions--stacked')).toBeNull();
    expect(controls.style.top).toBe('232px');
  });
  it('stacks the bar on touch screens and keeps the phone menu band clear until the menu is gone', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)', media: query, addEventListener() {}, removeEventListener() {} }));
    await select();
    const controls = document.querySelector<HTMLElement>('.sen-text-highlight-controls')!;
    expect(controls.dataset.layout).toBe('stacked');
    expect(controls.querySelector('.sen-text-highlight-menu.sen-text-highlight-actions--stacked')).not.toBeNull();
    // The stubbed selection line ends at 222px; the phone's own menu owns the next 72px.
    expect(parseFloat(controls.style.top)).toBeGreaterThanOrEqual(222 + 72);
    click('Edit');
    const editing = document.querySelector<HTMLElement>('.sen-text-highlight-controls')!;
    expect(editing.querySelector('.sen-text-highlight-actions--stacked')).not.toBeNull();
    expect(parseFloat(editing.style.top)).toBeLessThan(222 + 72);
  });
  it('draws no overlay and attaches no overlay work when the host sets none', () => {
    expect(document.querySelector('.sen-text-highlight-overlay')).toBeNull();
  });
  it('draws a host overlay beside the words it points at, without covering them, taking taps or changing the prose', () => {
    const extra = document.createElement('div'); document.body.append(extra);
    const overlayRoot = createRoot(extra);
    const overlay = () => ({
      marks: [
        { id: 'cue', selection: { blockId: 'a', selectedText: 'middle', startOffset: 7, endOffset: 13 }, tone: 'rgba(59, 130, 246, .38)', attention: true },
        { id: 'stale', selection: { blockId: 'a', selectedText: 'missing', startOffset: 0, endOffset: 7 }, tone: 'red' },
      ],
      pins: [
        { id: 'p1', blockId: 'a', offset: 0, label: '¶1', placement: 'margin' as const },
        { id: 's1', blockId: 'a', offset: 0, label: '1', placement: 'raised' as const },
        { id: 's2', blockId: 'b', offset: 0, label: '12', placement: 'raised' as const },
      ],
    });
    // A host that rebuilds an identical overlay on every render must not cause repeated work.
    for (let render = 0; render < 3; render += 1) {
      act(() => overlayRoot.render(<TextHighlightEngine blocks={initial} onBlocksChange={vi.fn()} overlay={overlay()} />));
    }
    const layers = extra.querySelectorAll('.sen-text-highlight-overlay');
    expect(layers).toHaveLength(2);
    layers.forEach(layer => expect(layer.getAttribute('aria-hidden')).toBe('true'));
    expect(extra.querySelectorAll('.sen-overlay-mark')).toHaveLength(1);
    // A range that needs a decision keeps its tint and is marked for its dashed underline.
    expect(extra.querySelector('.sen-overlay-mark')!.hasAttribute('data-attention')).toBe(true);
    const pins = Array.from(extra.querySelectorAll<HTMLElement>('.sen-overlay-pin'));
    expect(pins.map(pin => [pin.textContent, pin.dataset.placement])).toEqual([['¶1', 'margin'], ['1', 'raised'], ['12', 'raised']]);
    // The stubbed glyph box starts at top 200, left 100 and is 22px tall.
    const [margin, first, second] = pins;
    expect(margin.style.left).toBe('');
    expect(parseFloat(margin.style.top)).toBeCloseTo(200 + 22 * 0.8 - 10);
    // Raised numbers end where the glyph box begins, so they never cover a letter…
    for (const pin of [first, second]) expect(parseFloat(pin.style.top) + 10).toBeLessThanOrEqual(200);
    // …and two sentences starting at the same spot never stack their numbers.
    expect(parseFloat(first.style.left)).toBe(100);
    expect(parseFloat(second.style.left)).toBeGreaterThanOrEqual(100 + 6.5 + 3);
    expect(extra.querySelector('.sen-overlay-label')).toBeNull();
    expect(extra.querySelector('[data-sen-text-block="a"]')!.textContent).toBe(initial[0].text);
    act(() => overlayRoot.render(<TextHighlightEngine blocks={initial} onBlocksChange={vi.fn()} />));
    expect(extra.querySelector('.sen-text-highlight-overlay')).toBeNull();
    act(() => overlayRoot.unmount()); extra.remove();
  });
  it.each(['mouse', 'touch'])('retains the selection during %s activation of Edit', async pointerType => {
    await select();
    act(() => {
      const event = new Event('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'pointerType', { value: pointerType }); button('Edit')!.dispatchEvent(event);
      document.getSelection()!.removeAllRanges(); document.dispatchEvent(new Event('selectionchange'));
    });
    await act(async () => { await vi.runAllTimersAsync(); });
    click('Edit'); expect(document.querySelector('[contenteditable]')?.textContent).toBe('middle');
  });
});

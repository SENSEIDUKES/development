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
const changed = vi.fn();
const selections = vi.fn<(selection: PassageSelection | null) => void>();
const initial = [{ id: 'a', text: 'Before middle after.' }, { id: 'b', text: 'Another paragraph.' }];
function Host() {
  const [blocks, setBlocks] = useState(initial); update = setBlocks;
  return <TextHighlightEngine blocks={blocks} onBlocksChange={(next, edit) => { changed(next, edit); setBlocks(next); }} onSelectionChange={selections} />;
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
    const input = document.querySelector('textarea')!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
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
    click('Edit'); expect(document.querySelector('textarea')?.value).toBe('middle');
  });
  it('edits only the intended passage, retains identity, and clears state', async () => {
    const element = block(); await select();
    expect(selections).toHaveBeenLastCalledWith({ blockId: 'a', selectedText: 'middle', startOffset: 7, endOffset: 13 });
    click('Edit'); expect(document.querySelector('textarea')?.value).toBe('middle');
    expect(document.querySelector('.sen-text-highlight-marks span')).not.toBeNull();
    fill('new text'); click('Save');
    expect(block()).toBe(element); expect(block().textContent).toBe('Before new text after.');
    expect(block('b').textContent).toBe(initial[1].text);
    expect(button('Edit')).toBeUndefined(); expect(document.querySelector('textarea')).toBeNull();
    expect(selections).toHaveBeenLastCalledWith(null);
  });
  it('requires explicit deletion, then restores the exact text through Undo', async () => {
    await select(); click('Edit'); fill('');
    expect(button('Save')?.disabled).toBe(true); expect(changed).not.toHaveBeenCalled();
    click('Delete Passage'); expect(block().textContent).toBe('Before  after.');
    expect(changed.mock.lastCall?.[1].operation).toBe('delete');
    click('Undo'); expect(block().textContent).toBe(initial[0].text); expect(button('Undo')).toBeUndefined();
  });
  it('dismisses an unsaved draft through Escape or outside pointer activation', async () => {
    await select(); click('Edit'); fill('discard');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('textarea')).toBeNull(); expect(changed).not.toHaveBeenCalled();
    await select(); click('Edit');
    act(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(document.querySelector('textarea')).toBeNull(); expect(block().textContent).toBe(initial[0].text);
  });
  it('ignores collapsed selections and invalidates drafts after external updates', async () => {
    await select(7, 7); expect(button('Edit')).toBeUndefined();
    await select(); click('Edit');
    act(() => update([{ id: 'a', text: 'Changed externally.' }, initial[1]]));
    expect(document.querySelector('textarea')).toBeNull(); expect(changed).not.toHaveBeenCalled();
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
  it.each(['mouse', 'touch'])('retains the selection during %s activation of Edit', async pointerType => {
    await select();
    act(() => {
      const event = new Event('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'pointerType', { value: pointerType }); button('Edit')!.dispatchEvent(event);
      document.getSelection()!.removeAllRanges(); document.dispatchEvent(new Event('selectionchange'));
    });
    await act(async () => { await vi.runAllTimersAsync(); });
    click('Edit'); expect(document.querySelector('textarea')?.value).toBe('middle');
  });
});

// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HighlightEngine } from './HighlightEngine';
import type { PassageAction } from '../shared/actions';
import type { PassageSelection, TextHighlightBlock } from '../shared/selection';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let update: (blocks: TextHighlightBlock[]) => void;
let setFixed: (fixed: boolean) => void;
const changed = vi.fn();
const selections = vi.fn<(selection: PassageSelection | null) => void>();
const initial = [{ id: 'a', text: 'Before middle after.' }, { id: 'b', text: 'Another paragraph.' }];
function Host({ actions, removeActions }: { actions?: PassageAction[]; removeActions?: PassageAction[] }) {
  const [blocks, setBlocks] = useState(initial); update = setBlocks;
  const [fixed, setFixedState] = useState(false); setFixed = setFixedState;
  return <HighlightEngine blocks={blocks} onBlocksChange={(next, edit) => { changed(next, edit); setBlocks(next); }} onSelectionChange={selections}
    editable={!fixed} actions={actions} removeActions={removeActions} />;
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

describe('engine-owned selection input', () => {
  let offset = 9;
  const pointer = (type: string, pointerType = 'mouse', x = 110, y = 210, target: Element = block()) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperties(event, { pointerType: { value: pointerType }, pointerId: { value: 1 }, isPrimary: { value: true } });
    act(() => target.dispatchEvent(event));
    return event;
  };
  beforeEach(() => {
    offset = 9;
    Object.defineProperty(document, 'caretRangeFromPoint', { configurable: true, value: () => {
      const range = document.createRange(); range.setStart(block().firstChild!, offset); range.collapse(true); return range;
    } });
    vi.spyOn(block(), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 190, 300, 100));
  });
  afterEach(() => { delete (document as { caretRangeFromPoint?: unknown }).caretRangeFromPoint; vi.restoreAllMocks(); });

  it('captures host-supplied selections and immediately retires the native range', async () => {
    await select();
    expect(document.getSelection()!.rangeCount).toBe(0);
    act(() => document.dispatchEvent(new Event('selectionchange')));
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'middle' }));
    expect(container.querySelector('[data-selection-mode="owned"]')).not.toBeNull();
  });
  it('rejects a cross-paragraph host range without leaving actions on an old selection', async () => {
    await select();
    act(() => {
      const range = document.createRange(); range.setStart(block().firstChild!, 7); range.setEnd(block('b').firstChild!, 5);
      document.getSelection()!.addRange(range); document.dispatchEvent(new Event('selectionchange'));
    });
    expect(selections).toHaveBeenLastCalledWith(null);
    expect(document.getSelection()!.rangeCount).toBe(0);
    expect(button('Edit')).toBeUndefined();
  });
  it('selects with a mouse drag without ever installing a browser selection', () => {
    offset = 7; expect(pointer('pointerdown').defaultPrevented).toBe(true);
    offset = 13; pointer('pointermove', 'mouse', 150); pointer('pointerup');
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'middle' }));
    expect(document.getSelection()!.rangeCount).toBe(0);
    expect(button('Edit')).toBeDefined();
  });
  it('keeps an active drag and pending hold through equivalent host block arrays', async () => {
    offset = 7; pointer('pointerdown');
    offset = 10; pointer('pointermove', 'mouse', 130);
    act(() => update(initial.map(block => ({ ...block }))));
    offset = 13; pointer('pointermove', 'mouse', 150); pointer('pointerup');
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'middle' }));
    pointer('pointerdown', 'touch');
    act(() => update(initial.map(block => ({ ...block }))));
    await act(() => vi.advanceTimersByTimeAsync(450)); pointer('pointerup', 'touch');
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'middle' }));
  });
  it('keeps word and paragraph clicks working through small mouse jitter', () => {
    for (const detail of [2, 3]) {
      pointer('pointerdown'); pointer('pointermove', 'mouse', 111); pointer('pointerup');
      act(() => block().dispatchEvent(new MouseEvent('click', { detail, bubbles: true, cancelable: true, clientX: 111, clientY: 210 })));
      expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: detail === 2 ? 'middle' : initial[0].text }));
    }
  });
  it('hides an off-screen endpoint when a browser cannot measure a collapsed range', async () => {
    Range.prototype.getClientRects = function () {
      return (this.collapsed ? [] : [new DOMRect(100, -30, 70, 22), new DOMRect(100, 200, 70, 22)]) as unknown as DOMRectList;
    };
    await select();
    expect(document.querySelector('[data-sen-selection-handle="start"]')).toBeNull();
    expect(document.querySelector('[data-sen-selection-handle="end"]')).not.toBeNull();
  });
  it('holds to select a word, suppresses its native menu, and exposes adjustable handles', async () => {
    pointer('pointerdown', 'touch');
    await act(() => vi.advanceTimersByTimeAsync(450));
    pointer('pointerup', 'touch');
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'middle' }));
    expect(document.querySelectorAll('[data-sen-selection-handle]').length).toBe(2);
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    act(() => block().dispatchEvent(menu)); expect(menu.defaultPrevented).toBe(true);
    expect(document.getSelection()!.rangeCount).toBe(0);
  });
  it('leaves swipes alone and cancels pending holds on movement, cancellation, or blur', async () => {
    pointer('pointerdown', 'touch');
    expect(pointer('pointermove', 'touch', 110, 235).defaultPrevented).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(button('Edit')).toBeUndefined();
    for (const cancel of ['pointercancel', 'blur']) {
      pointer('pointerdown', 'touch');
      act(() => (cancel === 'blur' ? window : document).dispatchEvent(new Event(cancel)));
      await act(() => vi.advanceTimersByTimeAsync(600));
      expect(button('Edit')).toBeUndefined();
    }
  });
  it('adjusts an edge without collapsing or crossing the other edge', async () => {
    await select();
    const start = document.querySelector<HTMLElement>('[data-sen-selection-handle="start"]')!;
    pointer('pointerdown', 'touch', 110, 235, start);
    offset = 0; pointer('pointermove', 'touch', 120, 235, start);
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'Before middle' }));
    offset = 18; pointer('pointermove', 'touch', 125, 235, start); pointer('pointerup', 'touch', 125, 235, start);
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ startOffset: 12, endOffset: 13 }));
  });
  it('supports keyboard entry, extension, handles, and copying without a native range', async () => {
    act(() => { block().focus(); block().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'Before' }));
    act(() => block().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true, cancelable: true })));
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'Before ' }));
    const handle = document.querySelector<HTMLElement>('[data-sen-selection-handle="end"]')!;
    act(() => { handle.focus(); handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })); });
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: initial[0].text }));
    const setData = vi.fn();
    const copy = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(copy, 'clipboardData', { value: { setData } });
    act(() => handle.dispatchEvent(copy));
    expect(setData).toHaveBeenCalledWith('text/plain', initial[0].text);
    expect(copy.defaultPrevented).toBe(true);
  });
  it('still selects and edits in a host without Intl.Segmenter', () => {
    const intl = Intl as { Segmenter?: typeof Intl.Segmenter };
    const segmenter = intl.Segmenter; intl.Segmenter = undefined;
    try {
      act(() => { block().focus(); block().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
      expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'Before' }));
      click('Edit'); fill('Changed'); click('Save');
      expect(block().textContent).toBe('Changed middle after.');
    } finally { intl.Segmenter = segmenter; }
  });
  it('announces copy feedback in an already-mounted live region', async () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    try {
      await select();
      const status = document.querySelector('.sen-text-highlight-controls [role="status"]')!;
      expect(status.textContent).toBe('');
      await act(async () => { button('Copy')!.click(); });
      expect(document.querySelector('.sen-text-highlight-controls [role="status"]')).toBe(status);
      expect(status.textContent).toBe('Copied');
    } finally {
      if (previous) Object.defineProperty(navigator, 'clipboard', previous);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });
  it('copies a host-created selection from its originating control without taking over other copy targets', async () => {
    const origin = document.createElement('button'); document.body.append(origin); origin.focus();
    await select();
    const copy = () => {
      const event = new Event('copy', { bubbles: true, cancelable: true }); const setData = vi.fn();
      Object.defineProperty(event, 'clipboardData', { value: { setData } });
      act(() => document.activeElement!.dispatchEvent(event)); return { event, setData };
    };
    expect(document.activeElement).toBe(origin);
    expect(copy().setData).toHaveBeenCalledWith('text/plain', 'middle');
    const unrelated = document.createElement('button'); document.body.append(unrelated); unrelated.focus();
    expect(copy().event.defaultPrevented).toBe(false);
    const input = document.createElement('input'); document.body.append(input); input.focus();
    expect(copy().event.defaultPrevented).toBe(false);
    origin.remove(); unrelated.remove(); input.remove();
  });
  it('leaves editor input and read-only browser selections native', async () => {
    await select(); click('Edit');
    const editor = document.querySelector<HTMLElement>('[contenteditable]')!;
    expect(pointer('pointerdown', 'touch', 110, 210, editor).defaultPrevented).toBe(false);
    expect(editor.getAttribute('contenteditable')).toBe('plaintext-only');
    act(() => setFixed(true)); await select();
    expect(container.querySelector('[data-selection-mode="native"]')).not.toBeNull();
    expect(document.getSelection()!.toString()).toBe('middle');
    expect(document.querySelector('[data-sen-selection-handle]')).toBeNull();
  });
  it('extends by whole characters in emoji/combining text and follows RTL arrow direction', () => {
    act(() => update([{ id: 'a', text: 'A👩🏽‍🚀éZ' }, initial[1]]));
    const extend = (key: string) => act(() => { block().focus(); block().dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: true, bubbles: true, cancelable: true })); });
    extend('ArrowRight'); extend('ArrowRight');
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'A👩🏽‍🚀' }));
    extend('ArrowRight'); expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'A👩🏽‍🚀é' }));
    act(() => update([{ id: 'a', text: 'مَرْحَبًا بالعالم' }, initial[1]]));
    block().style.direction = 'rtl'; extend('ArrowLeft');
    expect(selections).toHaveBeenLastCalledWith(expect.objectContaining({ selectedText: 'مَ', startOffset: 0, endOffset: 2 }));
  });
  it('cancels a pending hold when its source changes or Create mode closes', async () => {
    pointer('pointerdown', 'touch'); act(() => update([{ id: 'a', text: 'Replaced text.' }, initial[1]]));
    await act(() => vi.advanceTimersByTimeAsync(600)); expect(button('Edit')).toBeUndefined();
    pointer('pointerdown', 'touch'); act(() => setFixed(true));
    await act(() => vi.advanceTimersByTimeAsync(600)); expect(document.querySelector('[data-sen-selection-handle]')).toBeNull();
  });
});

describe('Highlight Engine', () => {
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
  it('keeps the desktop bar inline, clear of the selection handles', async () => {
    await select();
    const controls = document.querySelector<HTMLElement>('.sen-text-highlight-controls')!;
    expect(controls.dataset.layout).toBe('inline');
    expect(controls.querySelector('.sen-text-highlight-actions--stacked')).toBeNull();
    expect(controls.style.top).toBe('270px');
  });
  it('stacks the touch bar clear of our handles and moves close to the inline editor', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)', media: query, addEventListener() {}, removeEventListener() {} }));
    await select();
    const controls = document.querySelector<HTMLElement>('.sen-text-highlight-controls')!;
    expect(controls.dataset.layout).toBe('stacked');
    expect(controls.querySelector('.sen-text-highlight-menu.sen-text-highlight-actions--stacked')).not.toBeNull();
    // The stubbed selection line ends at 222px; our handles need 44px below it.
    expect(parseFloat(controls.style.top)).toBeGreaterThanOrEqual(222 + 44);
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
      act(() => overlayRoot.render(<HighlightEngine blocks={initial} onBlocksChange={vi.fn()} overlay={overlay()} />));
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
    act(() => overlayRoot.render(<HighlightEngine blocks={initial} onBlocksChange={vi.fn()} />));
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

describe('Action Bar Remove mode', () => {
  const controls = () => document.querySelector<HTMLElement>('.sen-text-highlight-controls');
  const barButton = (name: string) => Array.from(controls()?.querySelectorAll('button') ?? []).find(node => node.textContent === name);
  /** A right-click at a point on the stubbed selection line (left 100–170, top 200–222). */
  const rightClick = (target: Element = block(), x = 120, y = 210) => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: x, clientY: y });
    act(() => { target.dispatchEvent(event); });
    return event;
  };
  const press = (key: string, shiftKey = false) => {
    const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(event); });
    return event;
  };

  it('opens on a right-click on the selection instead of the browser menu, then deletes and undoes', async () => {
    await select();
    expect(rightClick().defaultPrevented).toBe(true);
    expect(controls()?.dataset.mode).toBe('remove');
    expect(controls()?.getAttribute('aria-label')).toBe('Remove from passage');
    expect(controls()?.dataset.layout).toBe('stacked');
    expect(barButton('Edit')).toBeUndefined();
    expect(barButton('Delete Passage')?.hasAttribute('data-destructive')).toBe(true);
    act(() => barButton('Delete Passage')!.click());
    expect(block().textContent).toBe('Before  after.');
    expect(changed.mock.calls.at(-1)![1].operation).toBe('delete');
    // Undo sits in the Remove bar too while the deletion can be undone.
    await select(0, 6);
    rightClick();
    act(() => barButton('Undo')!.click());
    expect(block().textContent).toBe(initial[0].text);
    expect(changed.mock.calls.at(-1)![1].operation).toBe('undo');
  });

  it('selects the word under a right-click when nothing is selected, and leaves the browser menu elsewhere', () => {
    Object.defineProperty(document, 'caretRangeFromPoint', { configurable: true, value: () => {
      const range = document.createRange(); range.setStart(block().firstChild!, 9); range.collapse(true); return range;
    } });
    try {
      expect(rightClick().defaultPrevented).toBe(true);
      expect(selections).toHaveBeenLastCalledWith({ blockId: 'a', selectedText: 'middle', startOffset: 7, endOffset: 13 });
      expect(controls()?.dataset.mode).toBe('remove');
      expect(rightClick(document.body).defaultPrevented).toBe(false);
    } finally { delete (document as { caretRangeFromPoint?: unknown }).caretRangeFromPoint; }
  });

  it('opens from the ContextMenu key and Shift+F10 with focus on its first action, swallowing the browser menu that follows', async () => {
    await select();
    expect(press('ContextMenu').defaultPrevented).toBe(true);
    expect(controls()?.dataset.mode).toBe('remove');
    expect(document.activeElement?.textContent).toBe('Delete Passage');
    expect(rightClick(document.body).defaultPrevented).toBe(true);
    press('Escape');
    await select();
    expect(press('F10', true).defaultPrevented).toBe(true);
    expect(controls()?.dataset.mode).toBe('remove');
  });

  it('is reached on touch screens from the bar itself, and Back returns to Add', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)', media: query, addEventListener() {}, removeEventListener() {} }));
    await select();
    // Long press is owned by the engine; no browser context menu accompanies it.
    act(() => { const down = new Event('pointerdown', { bubbles: true }); Object.defineProperty(down, 'pointerType', { value: 'touch' }); block().dispatchEvent(down); });
    expect(rightClick().defaultPrevented).toBe(true);
    expect(barButton('Remove')).toBeDefined();
    act(() => barButton('Remove')!.click());
    expect(controls()?.dataset.mode).toBe('remove');
    act(() => barButton('Back')!.click());
    expect(controls()?.dataset.mode).toBe('add');
    expect(barButton('Edit')).toBeDefined();
  });

  it('belongs to one selection: a new selection is back in Add mode', async () => {
    await select();
    rightClick();
    expect(controls()?.dataset.mode).toBe('remove');
    await select(0, 6);
    expect(controls()?.dataset.mode).toBe('add');
  });

  it('does not exist on fixed text, which keeps the browser menu', async () => {
    act(() => setFixed(true));
    await select();
    expect(rightClick().defaultPrevented).toBe(false);
    expect(press('ContextMenu').defaultPrevented).toBe(false);
    expect(controls()).toBeNull();
  });

  it('shows an unavailable action dimmed with its reason, and runs the host removals', async () => {
    const removeCue = vi.fn(() => null);
    act(() => root.render(<Host
      actions={[{ id: 'cue', label: 'Cue', unavailable: () => 'Sound Cues fit 1–5 words', onActivate: () => null }]}
      removeActions={[{ id: 'remove-cue', label: 'Remove cue here', unavailable: selection => selection.selectedText === 'middle' ? undefined : 'No Sound Cue here', onActivate: removeCue }]} />));
    await select();
    const cue = controls()!.querySelector<HTMLButtonElement>('button[aria-label="Cue"]')!;
    expect(cue.disabled).toBe(true);
    expect(document.getElementById(cue.getAttribute('aria-describedby')!)?.textContent).toBe('Sound Cues fit 1–5 words');
    rightClick();
    const removal = controls()!.querySelector<HTMLButtonElement>('[data-destructive]:not([aria-label])')!;
    expect(removal.textContent).toBe('Remove cue here');
    act(() => removal.click());
    expect(removeCue).toHaveBeenCalledWith(expect.objectContaining({ selectedText: 'middle' }), expect.any(Function));
    expect(controls()).toBeNull();
    await select(0, 6);
    rightClick();
    expect(controls()!.querySelector<HTMLButtonElement>('button[aria-label="Remove cue here"]')?.disabled).toBe(true);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { normalizePassageSelection, passageRange, replacePassage } from './selection';

afterEach(() => { document.getSelection()?.removeAllRanges(); document.body.innerHTML = ''; });
function fixture() {
  document.body.innerHTML = '<main><p data-sen-text-block="stable">A 🌙 <span>quiet</span> harbor. A quiet harbor.</p><p data-sen-text-block="second">Another paragraph.</p></main>';
  return document.querySelector('main')!;
}
function select(start: Node, from: number, end = start, to = from) {
  const range = document.createRange(); range.setStart(start, from); range.setEnd(end, to);
  const selection = document.getSelection()!; selection.removeAllRanges(); selection.addRange(range); return selection;
}
describe('PassageSelection', () => {
  it('counts only prose when a cue glyph and word joiner interrupt the DOM', () => {
    document.body.innerHTML = '<main><p data-sen-text-block="stable">A <span class="inline-world-cue-annotation"><span>quiet harbor</span><span aria-hidden="true">\u2060</span><button type="button">Play</button></span> greeted Mara.</p></main>';
    const root = document.querySelector('main')!;
    const phrase = root.querySelector('.inline-world-cue-annotation span')!.firstChild!;
    const result = normalizePassageSelection(root, select(phrase, 6, phrase, 12));
    expect(result).toEqual({ blockId: 'stable', selectedText: 'harbor', startOffset: 8, endOffset: 14 });
    expect(passageRange(root, result!)?.toString()).toBe('harbor');
    expect(normalizePassageSelection(root, select(root.querySelector('button')!.firstChild!, 0,
      root.querySelector('button')!.firstChild!, 4))).toBeNull();
  });
  it('normalizes split nodes and UTF-16 offsets without retaining DOM state', () => {
    const root = fixture(); const span = root.querySelector('span')!;
    const result = normalizePassageSelection(root, select(span.firstChild!, 1, span.nextSibling!, 7));
    expect(result).toEqual({ blockId: 'stable', selectedText: 'uiet harbor', startOffset: 6, endOffset: 17 });
    expect(passageRange(root, result!)?.toString()).toBe('uiet harbor');
  });
  it('starts a range that begins at a text-node boundary in the node that follows', () => {
    const root = fixture();
    const block = root.querySelector('[data-sen-text-block="stable"]')!;
    const range = passageRange(root, { blockId: 'stable', selectedText: 'quiet', startOffset: 5, endOffset: 10 })!;
    expect(range.toString()).toBe('quiet');
    expect(range.startContainer).toBe(block.querySelector('span')!.firstChild);
    expect(range.startOffset).toBe(0);
  });
  it('normalizes a backward selection in document order', () => {
    const root = fixture(); const node = root.querySelector('span')!.firstChild!;
    const selection = document.getSelection()!; selection.setBaseAndExtent(node, 5, node, 0);
    expect(normalizePassageSelection(root, selection)).toEqual({ blockId: 'stable', selectedText: 'quiet', startOffset: 5, endOffset: 10 });
  });
  it('supports a whole paragraph and the second occurrence of a repeated phrase', () => {
    const root = fixture(); const block = root.firstChild!; const tail = block.lastChild!;
    const selection = normalizePassageSelection(root, select(tail, 11, tail, 16))!;
    expect(selection.selectedText).toBe('quiet'); expect(selection.startOffset).toBe(21);
    const original = { id: 'stable', text: block.textContent!, metadata: 'preserved' };
    expect(replacePassage(original, selection, 'busy')).toEqual({ ...original, text: 'A 🌙 quiet harbor. A busy harbor.' });
    const all = normalizePassageSelection(root, select(block, 0, block, block.childNodes.length))!;
    expect(replacePassage(original, all, '')).toEqual({ ...original, text: '' });
  });
  it('rejects collapsed, whitespace, cross-block and outside selections', () => {
    const root = fixture(); const first = root.querySelector('p')!.firstChild!;
    expect(normalizePassageSelection(root, select(first, 0))).toBeNull();
    expect(normalizePassageSelection(root, select(first, 1, first, 2))).toBeNull();
    expect(normalizePassageSelection(root, select(first, 0, root.lastChild!.firstChild!, 3))).toBeNull();
    expect(normalizePassageSelection(document.createElement('div'), select(first, 0, first, 1))).toBeNull();
    expect(normalizePassageSelection(root, null)).toBeNull();
  });
  it('rejects invalid offsets and stale text without modifying the original', () => {
    const block = { id: 'stable', text: 'Before middle after.' };
    const selection = { blockId: 'stable', selectedText: 'middle', startOffset: 7, endOffset: 13 };
    expect(replacePassage(block, selection, '<b>new</b>\nline')?.text).toBe('Before <b>new</b>\nline after.');
    for (const change of [{ startOffset: -1 }, { endOffset: 99 }, { startOffset: 7.5 }, { blockId: 'other' }, { selectedText: 'wrong' }]) {
      expect(replacePassage(block, { ...selection, ...change }, 'new')).toBeNull();
    }
    expect(block.text).toBe('Before middle after.');
  });
});

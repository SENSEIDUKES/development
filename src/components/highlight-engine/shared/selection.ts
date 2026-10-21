/** Offsets are UTF-16 code units, with an inclusive start and exclusive end. */
export interface PassageSelection {
  blockId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
}

export interface TextHighlightBlock { id: string; text: string }

export interface PassageEdit {
  operation: 'replace' | 'delete' | 'undo';
  selection: PassageSelection;
  before: TextHighlightBlock;
  after: TextHighlightBlock;
}

export function isValidPassage(block: TextHighlightBlock, selection: PassageSelection): boolean {
  const { startOffset: start, endOffset: end } = selection;
  return block.id === selection.blockId && Number.isInteger(start) && Number.isInteger(end)
    && start >= 0 && end > start && end <= block.text.length
    && selection.selectedText.trim().length > 0
    && block.text.slice(start, end) === selection.selectedText;
}

/** Invalid or stale selections never mutate the source. An empty replacement is explicit deletion. */
export function replacePassage<T extends TextHighlightBlock>(block: T, selection: PassageSelection, replacement: string): T | null {
  if (!isValidPassage(block, selection)) return null;
  return { ...block, text: block.text.slice(0, selection.startOffset) + replacement + block.text.slice(selection.endOffset) };
}

export const BLOCK_ATTRIBUTE = 'data-sen-text-block';

export function findBlockElement(root: HTMLElement, id: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ATTRIBUTE}]`))
    .find(element => element.getAttribute(BLOCK_ATTRIBUTE) === id);
}

/** Inline controls, their joiners and host decorations: inside a block, but not passage text. */
const INLINE_DECORATION = 'button, [aria-hidden="true"], [data-sen-selection-ignore]';

/** Text that belongs to the passage, excluding inline controls and their joiners. */
function passageTextNodes(block: HTMLElement): Text[] {
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest(INLINE_DECORATION)) nodes.push(node as Text);
  }
  return nodes;
}

function logicalOffset(block: HTMLElement, container: Node, offset: number, nodes: readonly Text[]): number {
  const prefix = block.ownerDocument.createRange();
  prefix.selectNodeContents(block);
  prefix.setEnd(container, offset);
  let length = 0;
  for (const node of nodes) {
    if (!prefix.intersectsNode(node)) continue;
    length += container === node ? offset : node.length;
  }
  return length;
}

/** DOM is an input adapter only. The returned value contains no live DOM objects. */
export function normalizePassageSelection(root: HTMLElement, browserSelection: Selection | null): PassageSelection | null {
  if (!browserSelection || browserSelection.isCollapsed || browserSelection.rangeCount !== 1) return null;
  const range = browserSelection.getRangeAt(0);
  const blockFor = (node: Node) => (node.nodeType === 1 ? node as Element : node.parentElement)?.closest<HTMLElement>(`[${BLOCK_ATTRIBUTE}]`);
  const block = blockFor(range.startContainer);
  if (!block || !root.contains(block) || blockFor(range.endContainer) !== block) return null;
  if ((range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer as Element)?.closest(INLINE_DECORATION)) return null;
  if ((range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer as Element)?.closest(INLINE_DECORATION)) return null;
  const nodes = passageTextNodes(block);
  const text = nodes.map(node => node.data).join('');
  const startOffset = logicalOffset(block, range.startContainer, range.startOffset, nodes);
  const endOffset = logicalOffset(block, range.endContainer, range.endOffset, nodes);
  const selectedText = text.slice(startOffset, endOffset);
  const blockId = block.getAttribute(BLOCK_ATTRIBUTE);
  if (!blockId || !selectedText.trim() || startOffset === endOffset) return null;
  return { blockId, selectedText, startOffset, endOffset };
}

/** Where a DOM position (e.g. the point under a pointer) falls in its block's passage text; null outside it. */
export function passageOffsetAt(root: HTMLElement, node: Node, offset: number): { blockId: string; offset: number } | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  const block = element?.closest<HTMLElement>(`[${BLOCK_ATTRIBUTE}]`);
  const blockId = block?.getAttribute(BLOCK_ATTRIBUTE);
  if (!block || !blockId || !root.contains(block) || element?.closest(INLINE_DECORATION)) return null;
  return { blockId, offset: logicalOffset(block, node, offset, passageTextNodes(block)) };
}

/** Hit testing reads a caret position without creating a browser selection. */
export function passagePoint(root: HTMLElement, x: number, y: number): { blockId: string; offset: number } | null {
  const doc = root.ownerDocument as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const caret = doc.caretPositionFromPoint?.(x, y);
  const range = caret ? null : doc.caretRangeFromPoint?.(x, y);
  return caret ? passageOffsetAt(root, caret.offsetNode, caret.offset)
    : range ? passageOffsetAt(root, range.startContainer, range.startOffset) : null;
}

/** Selection edges never split a surrogate pair or a combining-character sequence. */
export function passageEdges(text: string, locale?: string): number[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return [...Array.from(new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text), part => part.index), text.length];
  }
  // Older embedded browsers still need selection. Walk code points (UTF-16 offsets)
  // and keep combining marks, emoji modifiers/joins, flag pairs and CRLF together.
  const edges: number[] = [];
  let offset = 0, regionalCount = 0;
  let previous = '';
  for (const character of text) {
    const regional = /\p{Regional_Indicator}/u.test(character);
    const continuation = /[\p{M}\u200d\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]/u.test(character)
      || previous === '\u200d' || (regional && regionalCount % 2 === 1) || (character === '\n' && previous === '\r');
    if (offset === 0 || !continuation) edges.push(offset);
    regionalCount = regional ? regionalCount + 1 : 0;
    previous = character;
    offset += character.length;
  }
  return [...edges, text.length];
}

/** Reconstruct transient geometry from canonical offsets, including split inline text nodes. */
export function passageRange(root: HTMLElement, selection: PassageSelection): Range | null {
  const block = findBlockElement(root, selection.blockId);
  if (!block) return null;
  const nodes = passageTextNodes(block);
  if (!isValidPassage({ id: selection.blockId, text: nodes.map(node => node.data).join('') }, selection)) return null;
  const range = root.ownerDocument.createRange();
  let offset = 0;
  let started = false;
  for (const [index, node] of nodes.entries()) {
    const length = node.length;
    // A start exactly where one text node ends is the same position as the next
    // node's beginning; starting there keeps the geometry with the words that follow
    // instead of the previous node's line-end space.
    if (!started && (selection.startOffset < offset + length || (selection.startOffset === offset + length && index === nodes.length - 1))) {
      range.setStart(node, selection.startOffset - offset);
      started = true;
    }
    if (started && selection.endOffset <= offset + length) {
      range.setEnd(node, selection.endOffset - offset);
      return range;
    }
    offset += length;
  }
  return null;
}

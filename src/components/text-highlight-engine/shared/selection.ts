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

/** Text that belongs to the passage, excluding inline controls and their joiners. */
function passageTextNodes(block: HTMLElement): Text[] {
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest('button, [aria-hidden="true"], [data-sen-selection-ignore]')) nodes.push(node as Text);
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
  if ((range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer as Element)?.closest('button, [aria-hidden="true"], [data-sen-selection-ignore]')) return null;
  if ((range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer as Element)?.closest('button, [aria-hidden="true"], [data-sen-selection-ignore]')) return null;
  const nodes = passageTextNodes(block);
  const text = nodes.map(node => node.data).join('');
  const startOffset = logicalOffset(block, range.startContainer, range.startOffset, nodes);
  const endOffset = logicalOffset(block, range.endContainer, range.endOffset, nodes);
  const selectedText = text.slice(startOffset, endOffset);
  const blockId = block.getAttribute(BLOCK_ATTRIBUTE);
  if (!blockId || !selectedText.trim() || startOffset === endOffset) return null;
  return { blockId, selectedText, startOffset, endOffset };
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

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

/** DOM is an input adapter only. The returned value contains no live DOM objects. */
export function normalizePassageSelection(root: HTMLElement, browserSelection: Selection | null): PassageSelection | null {
  if (!browserSelection || browserSelection.isCollapsed || browserSelection.rangeCount !== 1) return null;
  const range = browserSelection.getRangeAt(0);
  const blockFor = (node: Node) => (node.nodeType === 1 ? node as Element : node.parentElement)?.closest<HTMLElement>(`[${BLOCK_ATTRIBUTE}]`);
  const block = blockFor(range.startContainer);
  if (!block || !root.contains(block) || blockFor(range.endContainer) !== block) return null;
  const prefix = root.ownerDocument.createRange();
  prefix.selectNodeContents(block);
  prefix.setEnd(range.startContainer, range.startOffset);
  const startOffset = prefix.toString().length;
  prefix.setEnd(range.endContainer, range.endOffset);
  const endOffset = prefix.toString().length;
  const selectedText = (block.textContent ?? '').slice(startOffset, endOffset);
  const blockId = block.getAttribute(BLOCK_ATTRIBUTE);
  if (!blockId || !selectedText.trim() || startOffset === endOffset) return null;
  return { blockId, selectedText, startOffset, endOffset };
}

/** Reconstruct transient geometry from canonical offsets, including split inline text nodes. */
export function passageRange(root: HTMLElement, selection: PassageSelection): Range | null {
  const block = findBlockElement(root, selection.blockId);
  if (!block || !isValidPassage({ id: selection.blockId, text: block.textContent ?? '' }, selection)) return null;
  const walker = root.ownerDocument.createTreeWalker(block, 4 /* SHOW_TEXT */);
  const range = root.ownerDocument.createRange();
  let offset = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (!started && selection.startOffset <= offset + length) {
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

/**
 * Semantic reading anchors.
 *
 * One utility shared by rendering, narration, bookmarks, and restoration so
 * every readable block exposes the same identity attributes:
 *
 *   data-reader-anchor      — "chapter:paragraphIndex" canonical key
 *   data-paragraph-index    — numeric index within the chapter
 *   data-block-id           — stable generated block ID when one exists
 *
 * Reading positions persist as a `ReadingAnchor` (chapter + paragraph index +
 * fractional offset inside the block) instead of raw pixels, so restoration
 * survives viewport, font, and layout changes.
 */

export interface ReadingAnchor {
  chapterNumber: number;
  blockId?: string;
  paragraphIndex: number;
  /** Small normalized signature of the block text to detect content changes. */
  contentSignature?: string;
  /** 0..1 fractional position of the focus line inside the block. */
  intraBlockRatio: number;
  savedAt: string;
}

export function anchorKey(chapterNumber: number, paragraphIndex: number): string {
  return `${chapterNumber}:${paragraphIndex}`;
}

/** Attributes to spread onto every readable block element. */
export function anchorAttributes(
  chapterNumber: number,
  paragraphIndex: number,
  blockId?: string,
  text?: string,
): Record<string, string | number | undefined> {
  return {
    'data-reader-anchor': anchorKey(chapterNumber, paragraphIndex),
    'data-paragraph-index': paragraphIndex,
    'data-block-id': blockId,
    'data-content-signature': text ? contentSignature(text) : undefined,
  };
}

/**
 * Normalized content signature: first 24 chars of collapsed, lowercased text.
 * Cheap, language-agnostic, and stable across whitespace-only edits.
 */
export function contentSignature(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 24);
}

export interface AnchorElementInfo {
  element: HTMLElement;
  paragraphIndex: number;
  blockId?: string;
  contentSignature?: string;
}

/** All anchor elements inside a container, in document order. */
export function getAnchorElements(container: ParentNode): AnchorElementInfo[] {
  const nodes = container.querySelectorAll<HTMLElement>('[data-reader-anchor]');
  const infos: AnchorElementInfo[] = [];
  nodes.forEach((element) => {
    const idx = Number(element.getAttribute('data-paragraph-index'));
    if (!Number.isFinite(idx)) return;
    infos.push({
      element,
      paragraphIndex: idx,
      blockId: element.getAttribute('data-block-id') || undefined,
      contentSignature:
        element.getAttribute('data-content-signature') || undefined,
    });
  });
  return infos;
}

/**
 * The anchor whose block is nearest to the given document Y position
 * (typically the focus line), plus the fractional position within it.
 */
export function findAnchorAtDocumentPosition(
  container: ParentNode,
  documentY: number,
  scrollTop: number,
): { info: AnchorElementInfo; intraBlockRatio: number } | null {
  const anchors = getAnchorElements(container);
  if (anchors.length === 0) return null;

  let best: AnchorElementInfo | null = null;
  let bestDistance = Infinity;
  let bestRatio = 0;

  for (const info of anchors) {
    const rect = info.element.getBoundingClientRect();
    const top = rect.top + scrollTop;
    const bottom = top + rect.height;
    let distance: number;
    let ratio: number;
    if (documentY >= top && documentY <= bottom) {
      distance = 0;
      ratio = rect.height > 0 ? (documentY - top) / rect.height : 0;
    } else {
      distance = documentY < top ? top - documentY : documentY - bottom;
      ratio = documentY < top ? 0 : 1;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      best = info;
      bestRatio = ratio;
      if (distance === 0) break;
    }
  }

  return best ? { info: best, intraBlockRatio: bestRatio } : null;
}

/** Locate a saved anchor's element: block ID first, paragraph index fallback. */
export function locateAnchorElement(
  container: ParentNode,
  anchor: Pick<ReadingAnchor, 'blockId' | 'paragraphIndex' | 'contentSignature'>,
): HTMLElement | null {
  if (anchor.blockId) {
    // CSS.escape is unavailable in some DOM shims; escape quotes/backslashes
    // manually so arbitrary block IDs stay a valid attribute selector.
    const escaped = anchor.blockId.replace(/[\\"]/g, '\\$&');
    const byId = container.querySelector<HTMLElement>(
      `[data-block-id="${escaped}"]`,
    );
    if (byId) return byId;
  }
  const byIndex = container.querySelector<HTMLElement>(
    `[data-paragraph-index="${anchor.paragraphIndex}"]`,
  );
  if (!anchor.contentSignature) return byIndex;

  const signatureOf = (element: HTMLElement | null) =>
    element?.getAttribute('data-content-signature') ||
    (element?.textContent ? contentSignature(element.textContent) : undefined);
  if (signatureOf(byIndex) === anchor.contentSignature) return byIndex;

  // Paragraph indexes can shift after content edits. When no stable block ID
  // exists, use the saved signature to locate the same prose at its new index.
  for (const info of getAnchorElements(container)) {
    if (signatureOf(info.element) === anchor.contentSignature) {
      return info.element;
    }
  }
  return null;
}

/**
 * The scroll position that places the anchor's stored intra-block point on
 * the focus line. Callers clamp via the scroll surface.
 */
export function scrollPositionForAnchor(
  element: HTMLElement,
  intraBlockRatio: number,
  focusLine: number,
  scrollTop: number,
): number {
  const rect = element.getBoundingClientRect();
  const blockTopInDocument = rect.top + scrollTop;
  const pointInDocument =
    blockTopInDocument + rect.height * Math.min(Math.max(intraBlockRatio, 0), 1);
  return pointInDocument - focusLine;
}

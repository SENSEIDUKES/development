import { useEffect, useMemo, useState, type RefObject } from 'react';
import { ATMOSPHERE_CHANGE_KIND, SOUNDSCAPE_CHANGE_KIND, type SoundtrackChangeAttachment } from '@seihouse/sen/audio';
import type { HarnessChapter, HarnessChapterScene } from '../../../narrative/generation';

/** What the chapter plays at the reader's place: a mood's pieces, or one exact piece, and an atmosphere. */
export interface ReaderScene extends HarnessChapterScene {
  /** One exact piece the reader chose in Create mode, in place of the writer's music. */
  piece?: string;
}

/** How far down the screen a change's word must come before it plays: about where the eye reads. */
const READING_LINE = 0.55;

/** The text node and offset inside a paragraph where its plain text reaches `offset`. */
function pointIn(block: HTMLElement, offset: number): { node: Text; offset: number } | undefined {
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let seen = 0;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const length = node.data.length;
    if (seen + length >= offset) return { node, offset: offset - seen };
    seen += length;
  }
  return undefined;
}

/** Where a change's word sits on screen now (its top), or the paragraph's top when the word cannot be measured. */
function wordTop(article: HTMLElement, change: SoundtrackChangeAttachment): number | undefined {
  const block = article.querySelector<HTMLElement>(`[data-sen-text-block="${CSS.escape(change.anchor.blockId)}"]`);
  if (!block) return undefined;
  const point = pointIn(block, change.anchor.startOffset);
  if (point && typeof document.createRange === 'function') {
    const range = document.createRange();
    range.setStart(point.node, point.offset);
    range.setEnd(point.node, Math.min(point.node.data.length, point.offset + 1));
    const rect = range.getClientRects?.()[0] ?? range.getBoundingClientRect?.();
    if (rect && (rect.top || rect.height)) return rect.top;
  }
  return block.getBoundingClientRect().top;
}

/**
 * The scene the chapter plays at the reader's place. It opens with the
 * reader's own opening (Create mode) or else the writer's; a change partway
 * through takes over once its word reaches the reading line, by scrolling or
 * while Listen reads past it, and scrolling back above it returns to the
 * opening. The music and the atmosphere change separately.
 */
export function useSoundtrackChanges({ chapter, scene, article, listening }: {
  chapter?: Pick<HarnessChapter, 'id' | 'openingSound' | 'soundtrackChanges'>;
  /** The writer's scene for this chapter (carried on from the chapters before where it chose none). */
  scene?: HarnessChapterScene;
  article: RefObject<HTMLElement | null>;
  /** Where Listen is reading, if it is: its paragraph and offset. */
  listening?: { blockId: string; offset: number; order: readonly string[] };
}): ReaderScene | undefined {
  const changes = chapter?.soundtrackChanges;
  const [reached, setReached] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    setReached(new Set());
    if (!changes?.length || typeof window === 'undefined') return undefined;
    // At most two words to measure, so each scroll measures them at once.
    const measure = () => {
      const root = article.current;
      if (!root) return;
      const line = window.innerHeight * READING_LINE;
      const next = new Set(changes.filter(change => {
        const top = wordTop(root, change);
        return top !== undefined && top <= line;
      }).map(change => change.id));
      setReached(current => (current.size === next.size && [...next].every(id => current.has(id)) ? current : next));
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true, capture: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [article, chapter?.id, changes]);

  // Listen reading past a change's word counts as reaching it, wherever the page is.
  const heard = useMemo(() => {
    if (!listening || !changes?.length) return new Set<string>();
    const at = listening.order.indexOf(listening.blockId);
    return new Set(changes.filter(change => {
      const index = listening.order.indexOf(change.anchor.blockId);
      return index >= 0 && at >= 0 && (index < at || (index === at && change.anchor.startOffset <= listening.offset));
    }).map(change => change.id));
  }, [changes, listening]);

  return useMemo(() => readerSceneAt({ chapter, scene, reached: new Set([...reached, ...heard]) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the chapter's sound, not its other fields
    [chapter?.openingSound, changes, heard, reached, scene]);
}

/**
 * The scene at a place in the chapter: the reader's opening over the writer's
 * (each sound on its own), then each change the reader has reached.
 */
export function readerSceneAt({ chapter, scene, reached }: {
  chapter?: Pick<HarnessChapter, 'openingSound' | 'soundtrackChanges'>;
  scene?: HarnessChapterScene;
  reached: ReadonlySet<string>;
}): ReaderScene | undefined {
  const opening = chapter?.openingSound;
  let piece = opening?.soundscape?.pieceId;
  let atmosphere = opening?.atmosphere?.atmosphereId ?? scene?.atmosphere;
  for (const change of chapter?.soundtrackChanges ?? []) {
    if (!reached.has(change.id)) continue;
    if (change.kind === SOUNDSCAPE_CHANGE_KIND) piece = change.payload.pieceId;
    else if (change.kind === ATMOSPHERE_CHANGE_KIND) atmosphere = change.payload.atmosphereId;
  }
  const soundscape = scene?.soundscape;
  const music = scene?.music;
  if (!piece && !music && !soundscape && !atmosphere) return undefined;
  return { ...(music ? { music } : {}), ...(soundscape ? { soundscape } : {}), ...(piece ? { piece } : {}), ...(atmosphere ? { atmosphere } : {}) };
}

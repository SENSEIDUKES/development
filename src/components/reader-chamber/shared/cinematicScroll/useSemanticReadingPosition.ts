import { useEffect, useRef, type RefObject } from 'react';
import type { StoryWorld, UpdateStoryFields } from '../../../../narrative/story';
import {
  contentSignature,
  findAnchorAtDocumentPosition,
  locateAnchorElement,
  scrollPositionForAnchor,
  type ReadingAnchor,
} from './anchors';

const SAVE_DEBOUNCE_MS = 2000;

const scrollingElement = () => document.scrollingElement ?? document.documentElement;
const getScrollTop = () => scrollingElement().scrollTop;
const setScrollTop = (position: number) => {
  const element = scrollingElement();
  element.scrollTop = Math.min(Math.max(0, position), Math.max(0, element.scrollHeight - element.clientHeight));
};

/** The reading line a third of the way down the visible viewport. */
function getFocusLine() {
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop ?? 0;
  const height = viewport?.height ?? window.innerHeight;
  return top + Math.max(0, height) * 0.33;
}

/**
 * Semantic reading-position persistence.
 *
 * Saves the paragraph nearest the focus line (and the focus line's position
 * inside it) after scrolling settles, when the reader navigates to another
 * chapter, and when the page is hidden or unloaded; restores it once the
 * last-read chapter renders. Positions are paragraph anchors, never pixels,
 * so they survive font, width, and layout changes.
 */
export function useSemanticReadingPosition({
  contentRef, activeStory, selectedChapterNum, updateStoryFields, hasRenderableContent, onSaved,
}: {
  contentRef: RefObject<HTMLElement | null>;
  activeStory: StoryWorld;
  selectedChapterNum: number;
  updateStoryFields: UpdateStoryFields;
  hasRenderableContent: boolean;
  onSaved?: (anchor: ReadingAnchor) => void;
}) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredChapterRef = useRef<string | null>(null);
  const suppressSaveUntilRef = useRef(0);
  const latest = useRef({ updateStoryFields, storyId: activeStory.id, chapter: selectedChapterNum, hasRenderableContent, onSaved });
  useEffect(() => {
    latest.current = { updateStoryFields, storyId: activeStory.id, chapter: selectedChapterNum, hasRenderableContent, onSaved };
  });

  const buildAnchor = (): ReadingAnchor | null => {
    const container = contentRef.current;
    if (!container || !latest.current.hasRenderableContent) return null;
    const scrollTop = getScrollTop();
    const found = findAnchorAtDocumentPosition(container, scrollTop + getFocusLine(), scrollTop);
    if (!found) return null;
    return {
      chapterNumber: latest.current.chapter,
      blockId: found.info.blockId,
      paragraphIndex: found.info.paragraphIndex,
      contentSignature: found.info.contentSignature
        || (found.info.element.textContent ? contentSignature(found.info.element.textContent) : undefined),
      intraBlockRatio: found.intraBlockRatio,
      savedAt: new Date().toISOString(),
    };
  };

  const persistAnchor = (anchor: ReadingAnchor) => {
    // The saved place is the current place: never restore over it again.
    restoredChapterRef.current = `${latest.current.storyId}:${anchor.chapterNumber}`;
    void latest.current.updateStoryFields(latest.current.storyId, {
      lastReadChapter: anchor.chapterNumber,
      readingAnchor: anchor,
      lastReadScrollPosition: undefined,
      lastReadAt: anchor.savedAt,
    }).then(() => latest.current.onSaved?.(anchor), () => undefined);
  };

  const saveNow = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
    if (performance.now() < suppressSaveUntilRef.current) return;
    const anchor = buildAnchor();
    if (anchor) persistAnchor(anchor);
  };

  const scheduleSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
  };

  // Save after scrolling settles, and immediately when the page is left.
  useEffect(() => {
    const flush = () => { if (saveTimeoutRef.current) saveNow(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('scroll', scheduleSave, { passive: true });
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      flush();
      window.removeEventListener('scroll', scheduleSave);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore the last-read chapter's place; record any other chapter the reader opens.
  useEffect(() => {
    if (!hasRenderableContent) return;
    const key = `${activeStory.id}:${selectedChapterNum}`;
    if (restoredChapterRef.current === key) return;
    const anchor = activeStory.readingAnchor;
    if (activeStory.lastReadChapter !== selectedChapterNum || !anchor || anchor.chapterNumber !== selectedChapterNum) {
      restoredChapterRef.current = key;
      scheduleSave();
      return;
    }
    restoredChapterRef.current = key;

    let cancelled = false;
    let completed = false;
    const applyAnchor = (): boolean => {
      const container = contentRef.current;
      if (!container) return false;
      const element = locateAnchorElement(container, anchor);
      if (!element) return false;
      suppressSaveUntilRef.current = performance.now() + SAVE_DEBOUNCE_MS;
      setScrollTop(scrollPositionForAnchor(element, anchor.intraBlockRatio, getFocusLine(), getScrollTop()));
      return true;
    };

    const restore = async () => {
      // Fonts change wrapping and block heights; wait briefly, never indefinitely.
      if (document.fonts?.ready) {
        try { await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 800))]); }
        catch { /* restore with current metrics */ }
      }
      let attempts = 0;
      const tryApply = () => {
        if (cancelled) return;
        if (applyAnchor()) {
          completed = true;
          // One corrective pass after entrance animation and late layout shifts.
          setTimeout(() => { if (!cancelled) applyAnchor(); }, 650);
          return;
        }
        attempts += 1;
        if (attempts < 90) requestAnimationFrame(tryApply);
        else completed = true;
      };
      tryApply();
    };

    void restore();
    return () => {
      cancelled = true;
      if (!completed) restoredChapterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapterNum, activeStory.id, hasRenderableContent, activeStory.lastReadChapter]);
}

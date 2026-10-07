import { useEffect, useRef } from 'react';
import { StoryWorld, UpdateStoryFields } from '../types';
import { useAppStore } from '../store/useAppStore';
import {
  ReadingAnchor,
  contentSignature,
  findAnchorAtDocumentPosition,
  locateAnchorElement,
  scrollPositionForAnchor,
} from '../lib/cinematicScroll/anchors';
import {
  createDocumentScrollSurface,
  getFocusLine,
} from '../lib/cinematicScroll/scrollSurface';

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Semantic reading-position persistence.
 *
 * Saves the paragraph nearest the focus line (plus the fractional position of
 * the focus line inside it) on debounced document scrolling, and restores it
 * when the chapter's content is rendered. Legacy raw-pixel positions
 * (`lastReadScrollPosition`) are migrated once: the pixel offset is restored,
 * resolved to the nearest paragraph, and re-saved as a semantic anchor.
 */
export function useReadingPosition({
  contentRef,
  activeStory,
  selectedChapterNum,
  updateStoryFields,
  hasRenderableContent,
}: {
  contentRef: React.RefObject<HTMLElement | null>;
  activeStory: StoryWorld;
  selectedChapterNum: number;
  updateStoryFields: UpdateStoryFields;
  hasRenderableContent: boolean;
}) {
  const surfaceRef = useRef(createDocumentScrollSurface());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredChapterRef = useRef<string | null>(null);
  const suppressSaveUntilRef = useRef(0);
  const updateStoryFieldsRef = useRef(updateStoryFields);
  const storyIdRef = useRef(activeStory.id);
  const chapterNumRef = useRef(selectedChapterNum);
  useEffect(() => {
    updateStoryFieldsRef.current = updateStoryFields;
    storyIdRef.current = activeStory.id;
    chapterNumRef.current = selectedChapterNum;
  });

  const buildAnchor = (): ReadingAnchor | null => {
    const container = contentRef.current;
    if (!container) return null;
    const surface = surfaceRef.current;
    const scrollTop = surface.getPosition();
    const focusLine = getFocusLine();
    const found = findAnchorAtDocumentPosition(container, scrollTop + focusLine, scrollTop);
    if (!found) return null;
    return {
      chapterNumber: chapterNumRef.current,
      blockId: found.info.blockId,
      paragraphIndex: found.info.paragraphIndex,
      contentSignature:
        found.info.contentSignature ||
        (found.info.element.textContent
          ? contentSignature(found.info.element.textContent)
          : undefined),
      intraBlockRatio: found.intraBlockRatio,
      savedAt: new Date().toISOString(),
    };
  };

  const persistAnchor = (anchor: ReadingAnchor) => {
    void updateStoryFieldsRef.current(storyIdRef.current, {
      lastReadChapter: anchor.chapterNumber,
      readingAnchor: anchor,
      // Raw pixels are never written anymore; clear the legacy field so the
      // one-time migration cannot repeat.
      lastReadScrollPosition: undefined,
      lastReadAt: anchor.savedAt,
    });
  };

  // --- Save on debounced document scroll ------------------------------------
  useEffect(() => {
    const onScroll = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (performance.now() < suppressSaveUntilRef.current) return;
        const anchor = buildAnchor();
        if (anchor) persistAnchor(anchor);
      }, SAVE_DEBOUNCE_MS);
    };
    const unsubscribe = surfaceRef.current.subscribe(onScroll);
    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Restore on chapter render ---------------------------------------------
  useEffect(() => {
    if (!hasRenderableContent) return;
    if (activeStory.lastReadChapter !== selectedChapterNum) return;
    const restorationKey = `${activeStory.id}:${selectedChapterNum}`;
    if (restoredChapterRef.current === restorationKey) return;
    restoredChapterRef.current = restorationKey;

    let cancelled = false;
    let completed = false;
    const surface = surfaceRef.current;

    const applyAnchor = (anchor: ReadingAnchor): boolean => {
      const container = contentRef.current;
      if (!container) return false;
      const element = locateAnchorElement(container, anchor);
      if (!element) return false;
      const position = scrollPositionForAnchor(
        element,
        anchor.intraBlockRatio,
        getFocusLine(),
        surface.getPosition(),
      );
      // Don't let restoration writes be saved back as a "new" position
      // before the layout fully settles.
      suppressSaveUntilRef.current = performance.now() + SAVE_DEBOUNCE_MS;
      surface.setPosition(position);
      return true;
    };

    const restore = async () => {
      // Fonts change line wrapping, which changes block heights — wait for
      // them before measuring, but never block restoration on a hung font
      // request: the corrective pass absorbs late font swaps.
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 800)),
          ]);
        } catch {
          /* restoration proceeds with current metrics */
        }
      }
      if (cancelled) return;

      const anchor = activeStory.readingAnchor;
      if (anchor && anchor.chapterNumber === selectedChapterNum) {
        // The chapter content may still be animating in (AnimatePresence
        // replaces the old chapter before mounting the new one), so retry on
        // a bounded number of frames — no open-ended polling.
        let attempts = 0;
        const tryApply = () => {
          if (cancelled) return;
          if (applyAnchor(anchor)) {
            completed = true;
            // One corrective pass after the next stable rendering opportunity
            // (the chapter entrance animation and late layout shift geometry).
            setTimeout(() => {
              if (!cancelled) applyAnchor(anchor);
            }, 650);
            return;
          }
          attempts += 1;
          if (attempts < 90) requestAnimationFrame(tryApply);
        };
        tryApply();
        return;
      }

      // One-time legacy migration: restore the raw pixel offset, resolve the
      // nearest paragraph, and re-save it as a semantic anchor.
      const legacyPixels = activeStory.lastReadScrollPosition;
      if (legacyPixels != null && legacyPixels > 0 && !anchor) {
        completed = true;
        suppressSaveUntilRef.current = performance.now() + SAVE_DEBOUNCE_MS;
        surface.setPosition(legacyPixels);
        requestAnimationFrame(() => {
          if (cancelled) return;
          const migrated = buildAnchor();
          if (migrated) persistAnchor(migrated);
        });
      } else {
        completed = true; // nothing to restore for this chapter
      }
    };

    restore();
    return () => {
      cancelled = true;
      // A dep change interrupted an unfinished restoration (e.g. content was
      // still animating in) — allow the re-run to try again.
      if (!completed) restoredChapterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedChapterNum,
    activeStory.id,
    hasRenderableContent,
    activeStory.lastReadChapter,
  ]);
}

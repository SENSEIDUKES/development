import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Whether the reader has reached the chapter's last paragraph: scrolled it into
 * view, or heard Listen read to the end. Watched only while `watch` is on (Fate
 * Survival's newest chapter), and remembered per chapter for this visit. The
 * watch follows the chapter's current last paragraph, even when a chapter body
 * renders or replaces its passages later. Where the browser cannot tell what is
 * on screen, the chapter counts as reached, so nothing is ever locked for good.
 */
export function useChapterFinished({ article, chapterEnd, chapterId, watch, listened }: {
  article: RefObject<HTMLElement | null>;
  /** The chapter's own end, after its last paragraph: watched when the body has no paragraphs to find. */
  chapterEnd: HTMLElement | null;
  chapterId: string | undefined;
  watch: boolean;
  /** Listen has read the chapter to its end. */
  listened: boolean;
}): boolean {
  const [finished, setFinished] = useState<ReadonlySet<string>>(() => new Set());
  const reached = Boolean(chapterId && finished.has(chapterId));
  // Listen's end belongs to the chapter it was heard on: a new chapter starts unheard.
  const heardOn = useRef<string | undefined>(undefined);
  const previousChapter = useRef(chapterId);
  if (previousChapter.current !== chapterId) {
    previousChapter.current = chapterId;
    heardOn.current = undefined;
  } else if (listened) heardOn.current = chapterId;
  const heard = Boolean(chapterId && heardOn.current === chapterId);
  useEffect(() => {
    if (!watch || !chapterId || reached) return undefined;
    const finish = () => setFinished(current => new Set(current).add(chapterId));
    if (heard || typeof IntersectionObserver === 'undefined') { finish(); return undefined; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) finish();
    });
    let watched: Element | null = null;
    const follow = () => {
      const blocks = article.current?.querySelectorAll<HTMLElement>('[data-sen-text-block]');
      const last = blocks?.length ? blocks[blocks.length - 1] : chapterEnd;
      if (last === watched) return;
      if (watched) observer.unobserve(watched);
      watched = last;
      if (last) observer.observe(last);
    };
    follow();
    // A body may render or replace its passages after this runs: keep watching its last one.
    const changes = article.current && typeof MutationObserver !== 'undefined' ? new MutationObserver(follow) : undefined;
    if (changes && article.current) changes.observe(article.current, { childList: true, subtree: true });
    return () => { changes?.disconnect(); observer.disconnect(); };
  }, [article, chapterEnd, chapterId, watch, heard, reached]);
  return reached;
}

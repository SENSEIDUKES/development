import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether the reader has reached the chapter's last paragraph: scrolled it into
 * view, or heard Listen read to the end. Watched only while `watch` is on (Fate
 * Survival's newest chapter), and remembered per chapter for this visit. Where
 * the browser cannot tell what is on screen, the chapter counts as reached, so
 * nothing is ever locked for good.
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
  useEffect(() => {
    if (!watch || !chapterId || reached) return undefined;
    const finish = () => setFinished(current => new Set(current).add(chapterId));
    if (listened || typeof IntersectionObserver === 'undefined') { finish(); return undefined; }
    const blocks = article.current?.querySelectorAll<HTMLElement>('[data-sen-text-block]');
    const last = blocks?.length ? blocks[blocks.length - 1] : chapterEnd;
    if (!last) return undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) finish();
    });
    observer.observe(last);
    return () => observer.disconnect();
  }, [article, chapterEnd, chapterId, watch, listened, reached]);
  return reached;
}

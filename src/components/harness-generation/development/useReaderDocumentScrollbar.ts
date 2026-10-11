import { useEffect } from 'react';

/** Keep the Reader's native document scroll owner (reading place and narration
 * follow depend on it). Only expose activity to the host's scrollbar skin. */
export function useReaderDocumentScrollbar() {
  useEffect(() => {
    const root = document.documentElement;
    let idle: ReturnType<typeof setTimeout> | undefined;
    root.setAttribute('data-reader-scrollbar', '');
    const onScroll = (event: Event) => {
      if (event.target !== document) return;
      root.setAttribute('data-reader-scrolling', '');
      clearTimeout(idle);
      idle = setTimeout(() => root.removeAttribute('data-reader-scrolling'), 1000);
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll);
      clearTimeout(idle);
      root.removeAttribute('data-reader-scrollbar');
      root.removeAttribute('data-reader-scrolling');
    };
  }, []);
}

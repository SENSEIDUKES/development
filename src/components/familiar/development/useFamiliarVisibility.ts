import { useEffect, useState, type RefObject } from 'react';

/** Stop decorative playback outside the viewport or while the document is hidden. */
export function useFamiliarVisibility(element: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [intersecting, setIntersecting] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      setIntersecting(entries.some(entry => entry.isIntersecting));
    });
    if (element.current) observer?.observe(element.current);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [element]);
  return visible && intersecting;
}

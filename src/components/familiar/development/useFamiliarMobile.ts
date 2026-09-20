import { useEffect, useState } from 'react';

// Narrow layouts and touch-only devices (including phones in landscape).
export const FAMILIAR_MOBILE_QUERY = '(max-width: 767px), (hover: none) and (pointer: coarse)';

/** Keep the size control and floating renderer on the same responsive policy. */
export function useFamiliarMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(FAMILIAR_MOBILE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(FAMILIAR_MOBILE_QUERY);
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mobile;
}

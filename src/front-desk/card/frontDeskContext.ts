import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { FrontDeskController } from '../core/controller';

/** The app's one Familiar helper, provided by `FrontDeskProvider`. Kept apart so the Familiar's card and guides can read it without importing the provider. */
export const FrontDeskControllerContext = createContext<FrontDeskController | null>(null);
const Helper = FrontDeskControllerContext;

/**
 * The Familiar's voice for a page's own words (a guide's line): `read` speaks
 * in the recorded voice where there is one, the device voice otherwise;
 * `speaking` is true while it talks. Null where no Familiar is present.
 */
export function useFrontDeskReadAloud() {
  const helper = useContext(Helper);
  const speaking = useSyncExternalStore(
    helper?.subscribe ?? noSubscribe,
    () => helper?.getSnapshot().phase === 'speaking',
    () => false,
  );
  return useMemo(() => helper ? { speaking, read: helper.read, stop: helper.quiet } : null, [helper, speaking]);
}
const noSubscribe = () => () => {};

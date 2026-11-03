import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { FamiliarHelperController } from '../../../library/familiars/helper';

/** The app's one Familiar helper, provided by `FamiliarHelperProvider`. Kept apart so the Familiar's card and guides can read it without importing the provider. */
export const FamiliarHelperContextValue = createContext<FamiliarHelperController | null>(null);
const Helper = FamiliarHelperContextValue;

/**
 * The Familiar's voice for a page's own words (a guide's line): `read` speaks
 * in the recorded voice where there is one, the device voice otherwise;
 * `speaking` is true while it talks. Null where no Familiar is present.
 */
export function useFamiliarReadAloud() {
  const helper = useContext(Helper);
  const speaking = useSyncExternalStore(
    helper?.subscribe ?? noSubscribe,
    () => helper?.getSnapshot().phase === 'speaking',
    () => false,
  );
  return useMemo(() => helper ? { speaking, read: helper.read, stop: helper.quiet } : null, [helper, speaking]);
}
const noSubscribe = () => () => {};

import { createContext, useContext, type PropsWithChildren } from 'react';
import type { ReaderTranslationController } from './controller';

const TranslationRuntime = createContext<ReaderTranslationController | null>(null);

/** Optional per-host/per-account translation service. Omission keeps original reading available. */
export function ReaderTranslationRuntimeProvider({ controller, children }: PropsWithChildren<{ controller: ReaderTranslationController | null }>) {
  return <TranslationRuntime.Provider value={controller}>{children}</TranslationRuntime.Provider>;
}

export const useReaderTranslationController = () => useContext(TranslationRuntime);

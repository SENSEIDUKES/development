import { createContext, useContext, type ReactNode } from 'react';

/**
 * The host's clipboard writer, shared by every Main Library surface that
 * offers a copy action. It lives beside the header rather than inside it so a
 * surface placed in Home content — Dao Insights, for one — can be given the
 * same host writer without depending on the header module.
 */
export type MainLibraryCopyText = (text: string) => Promise<void>;

const CopyContext = createContext<MainLibraryCopyText | null>(null);

export function MainLibraryClipboardProvider({ copyText, children }: { copyText: MainLibraryCopyText; children: ReactNode }) {
  return <CopyContext.Provider value={copyText}>{children}</CopyContext.Provider>;
}

export function useHeaderClipboard() {
  const copy = useContext(CopyContext);
  if (!copy) throw new Error('MainLibraryHeader requires a clipboard adapter');
  return copy;
}

import { createContext, useContext } from 'react';

export type DaoQuoteCategory = 'comedic' | 'inspirational' | 'comforting';
export type DaoRequestKind = 'status' | DaoQuoteCategory;
export type DaoStatusPayload = { hasServerGemini?: boolean };
export type DaoQuotePayload = { quote: string; author: string; category: DaoQuoteCategory };
export type DaoResponse<T> = { ok: boolean; json: () => Promise<T> };

/** Host-only contracts for the frozen header. No production store or credentials. */
export interface MainLibraryAdapter {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  activeStoryId: string | null;
  setActiveStoryId: (id: string | null) => void;
  syncStatus: string;
  lastSavedTime: number | null;
  currentUser: { email: string; displayName?: string } | null;
  userProfile: { displayName?: string; premiumTier: string } | null;
  stories: { id: string; mcName: string; genre: string }[];
  setIsSettingsOpen: (open: boolean) => void;
  setIsCodexSheetOpen: (open: boolean) => void;
  setIsShortcutsOpen: (open: boolean) => void;
  requestDao: {
    (kind: 'status'): Promise<DaoResponse<DaoStatusPayload>>;
    (kind: DaoQuoteCategory): Promise<DaoResponse<DaoQuotePayload>>;
  };
}
export const MainLibraryAdapterContext = createContext<MainLibraryAdapter | null>(null);
export function useMainLibraryAdapter<T>(select: (adapter: MainLibraryAdapter) => T): T {
  const adapter = useContext(MainLibraryAdapterContext);
  if (!adapter) throw new Error('Main Library capture requires a Workshop adapter');
  return select(adapter);
}
/** Haptics intentionally stop at the capture boundary. */
export function vibrate(_pattern: string) {}

import { createContext, useContext } from 'react';
import type { StorySpark, StorySparkRequest } from '@seihouse/sen/story-seed';

export type DaoQuoteCategory = 'comedic' | 'inspirational' | 'comforting';
export type DaoRequestKind = 'status' | DaoQuoteCategory;
export type DaoStatusPayload = { hasServerGemini?: boolean };
export type DaoQuotePayload = { quote: string; author: string; category: DaoQuoteCategory };
export type DaoResponse<T> = { ok: boolean; json: () => Promise<T> };

/**
 * Sparks' host (code: Dao Insights): where its Story Sparks come from and where a planted one
 * goes. Every part is optional; without a writer, Sparks offers its own
 * hand-written sparks, and without a Story Bank it offers only to copy.
 */
export interface DaoSparkHost {
  /** Whether `requestSpark` can be used now (a model is configured). */
  checkSparks?: () => Promise<boolean>;
  requestSpark?: (request: StorySparkRequest, signal?: AbortSignal) => Promise<StorySpark>;
  /** Keeps the spark in the Story Bank as a new Story Seed. */
  keepSpark?: (spark: StorySpark) => Promise<void>;
  /** Plants the spark: a new Story Seed it opens, or (inside a Story Seed) the open seed's Origin. */
  beginSpark?: (spark: StorySpark) => Promise<void>;
}

/** Host-only contracts for the frozen header. No production store or credentials. */
export interface MainLibraryAdapter {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  openLibrary?: () => void;
  activeStoryId: string | null;
  setActiveStoryId: (id: string | null) => void;
  syncStatus: string;
  lastSavedTime: number | null;
  currentUser: { email: string; displayName?: string } | null;
  /** `interfaceLanguage` is the account's SEN language code; the footer reads it and the Cave setting owns it. */
  userProfile: { displayName?: string; premiumTier: string; interfaceLanguage?: string } | null;
  stories: { id: string; mcName: string; genre: string }[];
  setIsSettingsOpen: (open: boolean) => void;
  setIsCodexSheetOpen: (open: boolean) => void;
  setIsShortcutsOpen: (open: boolean) => void;
  /** Sparks: Story Sparks. The `requestDao` quote oracle serves only the historical reference. */
  daoSparks?: DaoSparkHost;
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

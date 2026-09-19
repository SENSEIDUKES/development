import { createContext, useContext, type PropsWithChildren } from 'react';

/** Locations are supplied by the host; Library owns only their presentation roles. */
export interface LibraryAssets {
  emblem?: string;
  authImage?: string;
  authVideo?: string;
  homeImages?: readonly string[];
  homeVideos?: readonly string[];
  caveImages?: Readonly<Record<string, string>>;
  helpAudio?: Readonly<Record<string, string>>;
}
const Context = createContext<LibraryAssets>({});
export function LibraryAssetsProvider({ value, children }: PropsWithChildren<{ value: LibraryAssets }>) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useLibraryAssets = () => useContext(Context);

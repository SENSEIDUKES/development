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
  /** Short silent clips showing a help topic, by its id; the Familiar plays them in Explain. */
  helpVideos?: Readonly<Record<string, string>>;
  /** Decorative landscape for the Pathways sidebar on laptops. */
  navigationArtwork?: string;
}
const Context = createContext<LibraryAssets>({});
export function LibraryAssetsProvider({ value, children }: PropsWithChildren<{ value: LibraryAssets }>) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useLibraryAssets = () => useContext(Context);

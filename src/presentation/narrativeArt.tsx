import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import { Search, Settings, Users, Loader2 } from 'lucide-react';

export type NarrativeIconName = 'search' | 'settings' | 'characters' | 'generating';
export interface NarrativeIconProps { name: NarrativeIconName; className?: string; size?: number | string }
export interface NarrativeArt {
  Icon: ComponentType<NarrativeIconProps>;
  backdrops: readonly string[];
}
const icons = { search: Search, settings: Settings, characters: Users, generating: Loader2 };
function DefaultIcon({ name, ...props }: NarrativeIconProps) { const Icon = icons[name]; return <Icon aria-hidden="true" {...props} />; }
const ArtContext = createContext<NarrativeArt>({ Icon: DefaultIcon, backdrops: [] });

export function NarrativeArtProvider({ value, children }: { value: Partial<NarrativeArt>; children: ReactNode }) {
  const parent = useContext(ArtContext);
  return <ArtContext.Provider value={{ ...parent, ...value }}>{children}</ArtContext.Provider>;
}
export const useNarrativeArt = () => useContext(ArtContext);
export function NarrativeIcon(props: NarrativeIconProps) { const { Icon } = useNarrativeArt(); return <Icon {...props} />; }

/** Deterministic selection from a host's artwork. No first-party assets are built in. */
export function selectNarrativeBackdrop(id: string, backdrops: readonly string[]): string | undefined {
  if (!backdrops.length) return undefined;
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = id.charCodeAt(index) + ((hash << 5) - hash);
  return backdrops[Math.abs(hash) % backdrops.length];
}

import { createContext, useContext, type ReactNode } from 'react';

/**
 * The part of a long step a phone is showing (Origin's Style, Synopsis, Fate
 * and Tags; Arc's Ending, Hard Pins and Fun Settings), or null where the whole
 * step shows at once: tablets, laptops, and the World Blueprint's Arcs page.
 */
export const SeedPartContext = createContext<string | null>(null);

/**
 * One part of a step. Every part stays mounted, so a half-typed field or an
 * open tag browser survives moving between parts; only the shown part is
 * visible.
 */
export function SeedPart({ id, children }: { id: string; children: ReactNode }) {
  const active = useContext(SeedPartContext);
  return <div data-seed-part={id} hidden={active !== null && active !== id}>{children}</div>;
}

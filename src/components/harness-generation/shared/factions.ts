import { normalizeIdentityLabel } from './canonicalProjection';

/** A group the story declares or names: a faction, never a character, whatever it does in the record. */
export interface DeclaredFaction {
  name: string;
  aliases?: readonly string[];
}

/**
 * The last word of a name that makes it a body of people rather than a person
 * ("Iron Crane Sect", "Black Wolf Tribe"), for a group the Story Seed did not
 * declare. Named beasts are characters; a species belongs to the Bestiary.
 */
const FACTION_WORDS = new Set([
  'sect', 'sects', 'clan', 'clans', 'faction', 'factions', 'guild', 'order', 'cult', 'legion', 'army', 'empire', 'kingdom',
  'dynasty', 'alliance', 'league', 'society', 'brotherhood', 'sisterhood', 'academy', 'tribe', 'horde', 'family',
]);

/**
 * The faction a name names, by its declared name: one the story declares (by
 * name or alias), or a name whose last word names a body of people. A name
 * that is neither is no faction.
 */
export function factionNamed(name: string, declaredFactions: readonly DeclaredFaction[]): string | undefined {
  const key = normalizeIdentityLabel(name);
  const known = declaredFactions.find(faction => [faction.name, ...(faction.aliases ?? [])].some(other => normalizeIdentityLabel(other) === key));
  if (known) return known.name;
  return FACTION_WORDS.has(key.split(' ').at(-1) ?? '') ? name.trim() : undefined;
}

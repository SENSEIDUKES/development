/**
 * Resolves the identity band — and from it the ambient accent color — for a
 * Codex Card surface.
 *
 * This module is the single owner of the Codex entity classification rules
 * (main-character detection, character relationship, Artifact tier, Location
 * specialness, Faction). Both consumers derive from `resolveCodexEntityBand`:
 * the Development Codex Cards map the band to a luminous hex accent (rim
 * light, glass tint, seal ring, and particle color on the dark spectral
 * glass), while the CodexHovercard's highlighted-term trigger maps the same
 * band to its Tailwind class bundle. Adding or retuning a rule here updates
 * card ambience and prose highlight together.
 */

export interface CodexEntityAccentInput {
  name?: string;
  relationshipToMC?: string;
  role?: string;
  portraitKind?: string;
  description?: string;
  tier?: string;
  safetyLevel?: string;
  realm?: string;
}

/**
 * The classification result for a Codex entity. One band feeds both the card
 * accent (`ACCENT`) and the hovercard trigger theme, so the two presentations
 * can never drift apart.
 */
export type CodexEntityBand =
  | 'protagonist'
  | 'bond'
  | 'gold'
  | 'ally'
  | 'hostile'
  | 'mystery'
  | 'nonHuman'
  | 'artifactGreat'
  | 'artifactGood'
  | 'artifactModest'
  | 'artifactPlain'
  | 'location'
  | 'faction'
  | 'fallback';

export const CODEX_ENTITY_ACCENT_FALLBACK = '#04ACFF';

const ACCENT: Record<Exclude<CodexEntityBand, 'fallback'>, string> = {
  /** MC / default character — portal blue. */
  protagonist: '#04ACFF',
  /** Lover / spouse / dao companion. */
  bond: '#F472B6',
  /** Mentor / master / elder, legendary-grade finds, and special locations. */
  gold: '#D4AF37',
  /** Friend / ally / companion. */
  ally: '#4ADE80',
  /** Enemy / rival / antagonist. */
  hostile: '#EF4444',
  /** Stranger / neutral / unknown. */
  mystery: '#A3A3A3',
  /** Non-human individual without a stronger relationship signal. */
  nonHuman: '#A78BFA',
  /** Great / epic / heaven / saint artifact tier. */
  artifactGreat: '#FB923C',
  /** Good / rare / earth / spirit artifact tier — portal blue. */
  artifactGood: '#04ACFF',
  /** Decent / uncommon / mortal / profane artifact tier. */
  artifactModest: '#2DD4BF',
  /** Basic / common / untiered artifact. */
  artifactPlain: '#E5E7EB',
  /** Ordinary location. */
  location: '#C084FC',
  /** Faction. */
  faction: '#34D399',
};

/**
 * Classifies a character: the main character first, then relationship bands
 * from strongest sentiment to weakest, then non-human individuals, defaulting
 * to the protagonist band.
 */
function resolveCharacterBand(entry: CodexEntityAccentInput, mcName?: string): CodexEntityBand {
  const relationship = (entry.relationshipToMC || '').toLowerCase();
  const role = (entry.role || '').toLowerCase();
  const isMainCharacter = Boolean(
    (mcName && entry.name === mcName)
    || relationship.includes('self')
    || role.includes('main character')
    || relationship.includes('mc'),
  );

  if (isMainCharacter) return 'protagonist';
  if (/(lover|wife|husband|fiance|partner|spouse|concubine|dao companion)/.test(relationship)) return 'bond';
  if (/(mentor|master|teacher|elder)/.test(relationship) || /(mentor|elder)/.test(role)) return 'gold';
  if (/(friend|ally|brother|sister|companion|comrade)/.test(relationship)) return 'ally';
  if (/(enemy|rival|nemesis|antagonist|hostile|villain)/.test(relationship)) return 'hostile';
  if (/(unknown|stranger|neutral|mystery)/.test(relationship)) return 'mystery';
  if (entry.portraitKind === 'non-human') return 'nonHuman';
  return 'protagonist';
}

/**
 * Classifies a location: sacred, hidden, lethal, or divine/heaven-realm places
 * earn the gold band; everything else is an ordinary location.
 */
function resolveLocationBand(entry: CodexEntityAccentInput): CodexEntityBand {
  const description = (entry.description || '').toLowerCase();
  const safety = (entry.safetyLevel || '').toLowerCase();
  const realm = (entry.realm || '').toLowerCase();
  const isSpecial = /(special|sacred|divine|secret|hidden|forbidden)/.test(description)
    || /(divine|heaven)/.test(realm)
    || safety.includes('lethal');
  return isSpecial ? 'gold' : 'location';
}

/**
 * Classifies an artifact by tier from most to least exalted, falling back to
 * legendary/divine description keywords and finally the plain band.
 */
function resolveArtifactBand(entry: CodexEntityAccentInput): CodexEntityBand {
  const tier = (entry.tier || '').toLowerCase();
  const description = (entry.description || '').toLowerCase();

  if (/(legendary|divine|mythic|primordial|supreme)/.test(tier)) return 'gold';
  if (/(great|epic|heaven|saint)/.test(tier)) return 'artifactGreat';
  if (/(good|rare|earth|spirit)/.test(tier)) return 'artifactGood';
  if (/(decent|uncommon|mortal|profane)/.test(tier)) return 'artifactModest';
  if (/(legendary|divine)/.test(description)) return 'gold';
  return 'artifactPlain';
}

/**
 * The identity band for a Codex entity. `type` accepts every casing the two
 * cards receive: Codex term types (`character`, `artifact`, `location`,
 * `faction`) and reveal display types (`Human Portrait`, `Non-Human
 * Portrait`, `Artifact`, `Location`).
 */
export function resolveCodexEntityBand(
  type: string,
  entry?: CodexEntityAccentInput | null,
  mcName?: string,
): CodexEntityBand {
  const kind = (type || '').toLowerCase();
  if (!entry) return 'fallback';

  if (kind === 'character' || kind.includes('portrait') || kind === 'creature') {
    return resolveCharacterBand(entry, mcName);
  }
  if (kind.includes('artifact')) return resolveArtifactBand(entry);
  if (kind.includes('location')) return resolveLocationBand(entry);
  if (kind.includes('faction')) return 'faction';
  return 'fallback';
}

/**
 * The luminous hex accent a Codex Card wears for the entity — derived from
 * the shared band so the card ambience always agrees with the prose
 * highlight's classification.
 */
export function resolveCodexEntityAccent(
  type: string,
  entry?: CodexEntityAccentInput | null,
  mcName?: string,
): string {
  const band = resolveCodexEntityBand(type, entry, mcName);
  return band === 'fallback' ? CODEX_ENTITY_ACCENT_FALLBACK : ACCENT[band];
}

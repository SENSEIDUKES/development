/**
 * Resolves the ambient accent color for a Codex Card surface.
 *
 * The rules mirror the CodexHovercard's established highlight theme
 * (character relationship, Artifact tier, Location specialness, Faction) so a
 * card glows with the same identity the prose highlight already carries — but
 * every tone here is luminous enough to read as rim light, glass tint, seal
 * ring, and particle color on the dark spectral glass. The highlight trigger
 * text keeps its own class-based theme; this helper owns only the card
 * ambience and is shared by both Development Codex Card experiences
 * (the inline `CodexCard` reveal and the highlighted-term `CodexHovercard`).
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

export const CODEX_ENTITY_ACCENT_FALLBACK = '#04ACFF';

const ACCENT = {
  /** MC / default character — portal blue. */
  protagonist: '#04ACFF',
  /** Lover / spouse / dao companion. */
  bond: '#F472B6',
  /** Mentor / master / elder — and legendary-grade finds. */
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
  /** Decent / uncommon / mortal / profane artifact tier. */
  artifactModest: '#2DD4BF',
  /** Basic / common / untiered artifact. */
  artifactPlain: '#E5E7EB',
  /** Ordinary location. */
  location: '#C084FC',
  /** Faction. */
  faction: '#34D399',
} as const;

function resolveCharacterAccent(entry: CodexEntityAccentInput, mcName?: string): string {
  const relationship = (entry.relationshipToMC || '').toLowerCase();
  const role = (entry.role || '').toLowerCase();
  const isMainCharacter = Boolean(
    (mcName && entry.name === mcName)
    || relationship.includes('self')
    || role.includes('main character')
    || relationship.includes('mc'),
  );

  if (isMainCharacter) return ACCENT.protagonist;
  if (/(lover|wife|husband|fiance|partner|spouse|concubine|dao companion)/.test(relationship)) return ACCENT.bond;
  if (/(mentor|master|teacher|elder)/.test(relationship) || /(mentor|elder)/.test(role)) return ACCENT.gold;
  if (/(friend|ally|brother|sister|companion|comrade)/.test(relationship)) return ACCENT.ally;
  if (/(enemy|rival|nemesis|antagonist|hostile|villain)/.test(relationship)) return ACCENT.hostile;
  if (/(unknown|stranger|neutral|mystery)/.test(relationship)) return ACCENT.mystery;
  if (entry.portraitKind === 'non-human') return ACCENT.nonHuman;
  return ACCENT.protagonist;
}

function resolveLocationAccent(entry: CodexEntityAccentInput): string {
  const description = (entry.description || '').toLowerCase();
  const safety = (entry.safetyLevel || '').toLowerCase();
  const realm = (entry.realm || '').toLowerCase();
  const isSpecial = /(special|sacred|divine|secret|hidden|forbidden)/.test(description)
    || /(divine|heaven)/.test(realm)
    || safety.includes('lethal');
  return isSpecial ? ACCENT.gold : ACCENT.location;
}

function resolveArtifactAccent(entry: CodexEntityAccentInput): string {
  const tier = (entry.tier || '').toLowerCase();
  const description = (entry.description || '').toLowerCase();

  if (/(legendary|divine|mythic|primordial|supreme)/.test(tier)) return ACCENT.gold;
  if (/(great|epic|heaven|saint)/.test(tier)) return ACCENT.artifactGreat;
  if (/(good|rare|earth|spirit)/.test(tier)) return ACCENT.protagonist;
  if (/(decent|uncommon|mortal|profane)/.test(tier)) return ACCENT.artifactModest;
  if (/(legendary|divine)/.test(description)) return ACCENT.gold;
  return ACCENT.artifactPlain;
}

/**
 * The accent for a Codex entity. `type` accepts every casing the two cards
 * receive: Codex term types (`character`, `artifact`, `location`, `faction`)
 * and reveal display types (`Human Portrait`, `Non-Human Portrait`,
 * `Artifact`, `Location`).
 */
export function resolveCodexEntityAccent(
  type: string,
  entry?: CodexEntityAccentInput | null,
  mcName?: string,
): string {
  const kind = (type || '').toLowerCase();
  if (!entry) return CODEX_ENTITY_ACCENT_FALLBACK;

  if (kind === 'character' || kind.includes('portrait') || kind === 'creature') {
    return resolveCharacterAccent(entry, mcName);
  }
  if (kind.includes('artifact')) return resolveArtifactAccent(entry);
  if (kind.includes('location')) return resolveLocationAccent(entry);
  if (kind.includes('faction')) return ACCENT.faction;
  return CODEX_ENTITY_ACCENT_FALLBACK;
}

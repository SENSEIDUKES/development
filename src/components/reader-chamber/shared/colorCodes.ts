/**
 * The Color Code registry is the shared semantic color authority for the
 * Reader and Codex. Values stay as CSS variable references so the active
 * accessibility palette repaints every consumer together.
 */

export type ColorCodeId =
  | 'mainCharacter'
  | 'ally'
  | 'enemy'
  | 'unknown'
  | 'bond'
  | 'mentor'
  | 'nonHuman'
  | 'location'
  | 'specialLocation'
  | 'itemBasic'
  | 'itemDecent'
  | 'itemGood'
  | 'itemGreat'
  | 'itemLegendary'
  | 'corruption';

export interface ColorCodeDefinition {
  id: ColorCodeId;
  cssVar: string;
  name: string;
  colorName: string;
  playerMeaning: string;
}

export const COLOR_CODES: Record<ColorCodeId, ColorCodeDefinition> = {
  mainCharacter: { id: 'mainCharacter', cssVar: '--color-entity-mc', name: 'Main Character', colorName: 'Blue', playerMeaning: 'The main character and direct Codex updates' },
  ally: { id: 'ally', cssVar: '--color-entity-friend', name: 'Friend & Ally', colorName: 'Green', playerMeaning: 'Trusted allies, stable growth, and favorable alignment' },
  enemy: { id: 'enemy', cssVar: '--color-entity-enemy', name: 'Enemy & Threat', colorName: 'Red', playerMeaning: 'Hostility, danger, loss, and direct threat' },
  unknown: { id: 'unknown', cssVar: '--color-entity-unknown', name: 'Unknown & Neutral', colorName: 'Gray', playerMeaning: 'Unknown characters, neutral alignment, and ordinary system context' },
  bond: { id: 'bond', cssVar: '--color-entity-lover', name: 'Karmic Bond', colorName: 'Pink', playerMeaning: 'Lovers, partners, and meaningful emotional bonds' },
  mentor: { id: 'mentor', cssVar: '--color-entity-mentor', name: 'Mentor & Awakening', colorName: 'Gold', playerMeaning: 'Mentors, awakening, special locations, and legendary value' },
  nonHuman: { id: 'nonHuman', cssVar: '--color-entity-non-human', name: 'Non-Human Individual', colorName: 'Violet', playerMeaning: 'Named non-human individuals without a stronger relationship signal' },
  location: { id: 'location', cssVar: '--color-location-regular', name: 'Regular Location', colorName: 'Purple', playerMeaning: 'Ordinary places, mysteries, fate threads, and prophecy' },
  specialLocation: { id: 'specialLocation', cssVar: '--color-location-special', name: 'Special Location', colorName: 'Gold', playerMeaning: 'Sacred, divine, hidden, forbidden, or lethal places' },
  itemBasic: { id: 'itemBasic', cssVar: '--color-item-basic', name: 'Basic Item', colorName: 'White', playerMeaning: 'Common, untiered, and ordinary items' },
  itemDecent: { id: 'itemDecent', cssVar: '--color-item-decent', name: 'Decent Item', colorName: 'Green', playerMeaning: 'Decent, uncommon, mortal, and profane items' },
  itemGood: { id: 'itemGood', cssVar: '--color-item-good', name: 'Good Item', colorName: 'Light Blue', playerMeaning: 'Good, rare, earth, and spirit items' },
  itemGreat: { id: 'itemGreat', cssVar: '--color-item-great', name: 'Great Item', colorName: 'Orange', playerMeaning: 'Great items, warnings, risk, and meaningful consequences' },
  itemLegendary: { id: 'itemLegendary', cssVar: '--color-item-legendary', name: 'Legendary Item', colorName: 'Gold', playerMeaning: 'Legendary rewards, achievements, and supreme artifacts' },
  corruption: { id: 'corruption', cssVar: '--color-system-corruption', name: 'Permanent Curse', colorName: 'Dark Rose', playerMeaning: 'Permanent damage, curse, tragedy, and death scars' },
};

export const COLOR_CODE_PALETTE_IDS = [
  'default',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'high_contrast_dark',
] as const;

export type ColorCodePaletteId = (typeof COLOR_CODE_PALETTE_IDS)[number];

export const COLOR_CODE_PALETTES: Record<ColorCodePaletteId, { label: string }> = {
  default: { label: 'Custom Mapping: Default' },
  protanopia: { label: 'Protanopia (Red-Blind)' },
  deuteranopia: { label: 'Deuteranopia (Green-Blind)' },
  tritanopia: { label: 'Tritanopia (Blue-Blind)' },
  high_contrast_dark: { label: 'High Contrast Dark' },
};

export function getColorCode(code: ColorCodeId): ColorCodeDefinition {
  return COLOR_CODES[code];
}

/** A palette-aware value for inline style, SVG, and LibraryCard accents. */
export function getColorCodeValue(code: ColorCodeId): string {
  return `var(${getColorCode(code).cssVar})`;
}

export interface ColorCodeStyle {
  color: string;
}

export interface ColorCodeSurfaceStyle extends ColorCodeStyle {
  borderColor: string;
  backgroundColor: string;
  boxShadow?: string;
}

export interface SystemColorStyle extends ColorCodeStyle {
  '--system-color': string;
  '--system-color-border': string;
  '--system-color-surface': string;
}

export function getColorCodeStyle(code: ColorCodeId): ColorCodeStyle {
  return { color: getColorCodeValue(code) };
}

export function getColorCodeSurfaceStyle(
  code: ColorCodeId,
  { borderOpacity = 0.3, backgroundOpacity = 0.1, glowOpacity }: {
    borderOpacity?: number;
    backgroundOpacity?: number;
    glowOpacity?: number;
  } = {},
): ColorCodeSurfaceStyle {
  const color = getColorCodeValue(code);
  return {
    color,
    borderColor: `color-mix(in srgb, ${color} ${Math.round(borderOpacity * 100)}%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${color} ${Math.round(backgroundOpacity * 100)}%, transparent)`,
    ...(glowOpacity === undefined
      ? {}
      : { boxShadow: `0 0 12px color-mix(in srgb, ${color} ${Math.round(glowOpacity * 100)}%, transparent)` }),
  };
}

export interface CodexEntityAccentInput {
  name?: string;
  relationshipToMC?: string;
  role?: string;
  portraitKind?: string;
  description?: string;
  tier?: string;
  safetyLevel?: string;
  realm?: string;
  alignment?: string;
  status?: string;
}

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

const CODEX_BAND_COLOR_CODES: Record<CodexEntityBand, ColorCodeId> = {
  protagonist: 'mainCharacter', bond: 'bond', gold: 'mentor', ally: 'ally', hostile: 'enemy', mystery: 'unknown', nonHuman: 'nonHuman',
  artifactGreat: 'itemGreat', artifactGood: 'itemGood', artifactModest: 'itemDecent', artifactPlain: 'itemBasic', location: 'location', faction: 'ally', fallback: 'mainCharacter',
};

/**
 * Relationship state comes from the current character record. Hostility wins
 * over historical terms so "former ally, now enemy" is a current threat on
 * every surface instead of a stale green link or card.
 */
export function resolveCharacterRelationshipColorCode(
  entry: Pick<CodexEntityAccentInput, 'name' | 'relationshipToMC' | 'role' | 'portraitKind'>,
  mcName?: string,
): ColorCodeId {
  const relationship = (entry.relationshipToMC || '').toLowerCase();
  const role = (entry.role || '').toLowerCase();
  const isExplicitSelfRelationship = /^(self|mc(?:\s*\(you\))?|main character|protagonist)$/.test(relationship.trim());
  const isMainCharacter = Boolean(
    (mcName && entry.name === mcName)
    || isExplicitSelfRelationship
    || role.includes('main character')
  );

  if (isMainCharacter) return 'mainCharacter';
  if (/(enemy|rival|nemesis|antagonist|hostile|villain|hate)/.test(relationship)) return 'enemy';
  if (/(mentor|master|teacher|elder)/.test(relationship) || /(mentor|master|teacher|elder)/.test(role)) return 'mentor';
  if (/(lover|wife|husband|fianc[ée]?|partner|spouse|concubine|dao companion)/.test(relationship)) return 'bond';
  if (/(friend|ally|brother|sister|companion|comrade|loyal)/.test(relationship)) return 'ally';
  if (/(unknown|stranger|neutral|mystery)/.test(relationship)) return 'unknown';
  if (entry.portraitKind === 'non-human') return 'nonHuman';
  return 'mainCharacter';
}

function resolveCharacterBand(entry: CodexEntityAccentInput, mcName?: string): CodexEntityBand {
  switch (resolveCharacterRelationshipColorCode(entry, mcName)) {
    case 'bond': return 'bond';
    case 'mentor': return 'gold';
    case 'ally': return 'ally';
    case 'enemy': return 'hostile';
    case 'unknown': return 'mystery';
    case 'nonHuman': return 'nonHuman';
    default: return 'protagonist';
  }
}

function resolveLocationBand(entry: CodexEntityAccentInput): CodexEntityBand {
  const description = (entry.description || '').toLowerCase();
  const safety = (entry.safetyLevel || '').toLowerCase();
  const realm = (entry.realm || '').toLowerCase();
  const isSpecial = /(special|sacred|divine|secret|hidden|forbidden)/.test(description)
    || /(divine|heaven)/.test(realm)
    || safety.includes('lethal');
  return isSpecial ? 'gold' : 'location';
}

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

export function resolveCodexEntityBand(type: string, entry?: CodexEntityAccentInput | null, mcName?: string): CodexEntityBand {
  const kind = (type || '').toLowerCase();
  if (!entry) return 'fallback';
  if (kind === 'character' || kind.includes('portrait') || kind === 'creature') return resolveCharacterBand(entry, mcName);
  if (kind.includes('artifact')) return resolveArtifactBand(entry);
  if (kind.includes('location')) return resolveLocationBand(entry);
  if (kind.includes('faction')) return 'faction';
  return 'fallback';
}

export function getCodexEntityBandColorCode(band: CodexEntityBand): ColorCodeId {
  return CODEX_BAND_COLOR_CODES[band];
}

export function resolveCodexEntityColorCode(type: string, entry?: CodexEntityAccentInput | null, mcName?: string): ColorCodeId {
  const kind = (type || '').toLowerCase();
  if (!entry) return 'mainCharacter';
  if (kind === 'character' || kind.includes('portrait') || kind === 'creature') {
    return resolveCharacterRelationshipColorCode(entry, mcName);
  }
  if (kind.includes('artifact')) return resolveArtifactColorCode(entry);
  if (kind.includes('location')) return resolveLocationColorCode(entry);
  if (kind.includes('faction')) return resolveFactionAlignmentColorCode(entry.alignment);
  return getCodexEntityBandColorCode(resolveCodexEntityBand(type, entry, mcName));
}

export function resolveArtifactColorCode(entry?: Pick<CodexEntityAccentInput, 'tier' | 'description'> | null): ColorCodeId {
  switch (resolveArtifactBand(entry ?? {})) {
    case 'gold': return 'itemLegendary';
    case 'artifactGreat': return 'itemGreat';
    case 'artifactGood': return 'itemGood';
    case 'artifactModest': return 'itemDecent';
    default: return 'itemBasic';
  }
}

export function resolveLocationColorCode(entry?: Pick<CodexEntityAccentInput, 'description' | 'safetyLevel' | 'realm'> | null): ColorCodeId {
  return resolveLocationBand(entry ?? {}) === 'gold' ? 'specialLocation' : 'location';
}

export function resolveLocationSafetyColorCode(safetyLevel?: string): ColorCodeId {
  const safety = (safetyLevel || '').toLowerCase();
  if (safety.includes('safe')) return 'ally';
  if (safety.includes('danger')) return 'mentor';
  return safety ? 'enemy' : 'unknown';
}

export function resolveFactionAlignmentColorCode(alignment?: string): ColorCodeId {
  const value = (alignment || '').toLowerCase();
  if (value.includes('righteous')) return 'ally';
  if (value.includes('demonic')) return 'enemy';
  if (value.includes('mysterious')) return 'mainCharacter';
  return 'unknown';
}

export function resolveFactionStatusColorCode(status?: string): ColorCodeId {
  const value = (status || '').toLowerCase();
  if (value.includes('active')) return 'ally';
  if (value.includes('destroyed')) return 'enemy';
  if (value.includes('fractured')) return 'mentor';
  return 'unknown';
}

export function resolveCharacterStatusColorCode(status?: string): ColorCodeId {
  const value = (status || '').toLowerCase();
  if (value === 'alive') return 'ally';
  if (value === 'deceased') return 'enemy';
  if (value === 'ascended') return 'mentor';
  return 'unknown';
}

/** Karmic dashboard metrics preserve their existing danger, boon, and destiny meanings. */
export function resolveKarmaMetricColorCode(metric: 'debt' | 'boon' | 'destiny'): ColorCodeId {
  if (metric === 'debt') return 'enemy';
  if (metric === 'boon') return 'ally';
  return 'mentor';
}

/**
 * Bestiary threat labels have always used the warning-orange treatment. Keep
 * that established meaning in the registry even when the source vocabulary
 * for a threat level varies between stories.
 */
export function resolveCreatureThreatColorCode(_threatLevel?: string): ColorCodeId {
  return 'itemGreat';
}

/** Open threads retain danger red; completed threads retain boon green. */
export function resolvePlotThreadStatusColorCode(status: 'unresolved' | 'resolved'): ColorCodeId {
  return status === 'resolved' ? 'ally' : 'enemy';
}

/** Fate-consequence details keep their prior story-state and genre meanings. */
export function resolveFateConsequenceDetailColorCode(
  detail: 'newStoryState' | 'genreShift',
): ColorCodeId {
  return detail === 'newStoryState' ? 'mainCharacter' : 'location';
}

/** Progression stages retain the existing Reader power-chart semantic colors. */
export function resolvePowerStageColorCode(stageName?: string): ColorCodeId {
  const stage = (stageName || '').toLowerCase();
  if (stage.includes('nascent')) return 'location';
  if (stage.includes('core')) return 'mentor';
  if (stage.includes('foundation')) return 'mainCharacter';
  if (stage.includes('mortal')) return 'unknown';
  if (stage.includes('qi')) return 'ally';
  return 'unknown';
}

/** Breakthrough nodes and badges retain the chart's established gold emphasis. */
export const POWER_STAGE_BREAKTHROUGH_COLOR_CODE: ColorCodeId = 'mentor';

/** Numeric affinity belongs to the separate inter-character graph, not relationshipToMC. */
export function resolveRelationshipAffinityColorCode(affinity?: number): ColorCodeId {
  if (!Number.isFinite(affinity)) return 'unknown';
  if (affinity! > 0) return 'ally';
  if (affinity! < 0) return 'enemy';
  return 'unknown';
}

export type SystemOutcomeTone = 'positive' | 'uncertain' | 'warning' | 'negative';

export function resolveSystemOutcomeColorCode(tone: SystemOutcomeTone | undefined, direction?: string): ColorCodeId {
  const resolvedTone = tone ?? (direction === 'loss' ? 'negative' : 'positive');
  if (resolvedTone === 'uncertain') return 'mentor';
  if (resolvedTone === 'warning') return 'itemGreat';
  if (resolvedTone === 'negative') return 'enemy';
  return 'ally';
}

/** Fate-result meanings intentionally retain their established gold/orange/rose hierarchy. */
export function resolveFateResultColorCode(outcome?: string): ColorCodeId {
  switch ((outcome || '').trim().toUpperCase()) {
    case 'FATE AVERTED': return 'mentor';
    case 'FATE SCARRED': return 'itemGreat';
    case 'DOOM MANIFESTED': return 'corruption';
    default: return 'corruption';
  }
}

/** Reader Fate Survival categories share the same accessible semantic palette. */
export function resolveFateTypeColorCode(type?: string): ColorCodeId {
  switch ((type || '').trim().toLowerCase()) {
    case 'death fate': return 'corruption';
    case 'love fate': return 'bond';
    case 'kingdom fate': return 'mentor';
    case 'villain fate': return 'location';
    case 'betrayal fate': return 'itemGreat';
    case 'poverty fate': return 'mentor';
    case 'war fate': return 'enemy';
    case 'regression fate': return 'mainCharacter';
    case 'reputation fate': return 'unknown';
    case 'world fate': return 'itemGood';
    default: return 'unknown';
  }
}

/** Death and Iron Fate flags deliberately use the same danger and gold meanings everywhere. */
export function resolveFateFlagColorCode(flag: 'death' | 'ironFate'): ColorCodeId {
  return flag === 'death' ? 'corruption' : 'mentor';
}

export interface SystemBadgeColorCode {
  colorCode: ColorCodeId;
  inverted?: boolean;
}

export function resolveSystemBadgeColorCode(value?: string): SystemBadgeColorCode {
  switch ((value || '').trim().toLowerCase()) {
    case 'light': return { colorCode: 'mentor' };
    case 'moderate': return { colorCode: 'itemGreat' };
    case 'severe': return { colorCode: 'enemy' };
    case 'deadly': return { colorCode: 'itemBasic', inverted: true };
    case 'unknown': return { colorCode: 'unknown' };
    default: return { colorCode: 'itemBasic' };
  }
}

export interface SystemColorMeaning {
  type: string;
  name: string;
  colorName: string;
  playerMeaning: string;
  colorCode: ColorCodeId;
  borderColorCode: ColorCodeId;
  surfaceColorCode: ColorCodeId;
  /** Retained for legend/API compatibility; derived from colorCode. */
  cssVar: string;
  /** Generic classes read the scoped System Color Code custom properties. */
  textColor: string;
  borderColor: string;
  bgColor: string;
}

const SYSTEM_TEXT_CLASS = 'text-[var(--system-color)]';
const SYSTEM_BORDER_CLASS = 'border-[color-mix(in_srgb,var(--system-color-border)_40%,transparent)]';
const SYSTEM_BACKGROUND_CLASS = 'bg-[color-mix(in_srgb,var(--system-color-surface)_10%,transparent)]';

function systemMeaning(
  type: string,
  name: string,
  colorName: string,
  playerMeaning: string,
  colorCode: ColorCodeId,
  options: {
    borderColorCode?: ColorCodeId;
    surfaceColorCode?: ColorCodeId;
    textPresentationClass?: string;
    borderPresentationClass?: string;
  } = {},
): SystemColorMeaning {
  return {
    type,
    name,
    colorName,
    playerMeaning,
    colorCode,
    borderColorCode: options.borderColorCode ?? colorCode,
    surfaceColorCode: options.surfaceColorCode ?? colorCode,
    cssVar: getColorCode(colorCode).cssVar,
    textColor: [SYSTEM_TEXT_CLASS, options.textPresentationClass].filter(Boolean).join(' '),
    borderColor: [SYSTEM_BORDER_CLASS, options.borderPresentationClass].filter(Boolean).join(' '),
    bgColor: SYSTEM_BACKGROUND_CLASS,
  };
}

/** The established system-event taxonomy expressed through Color Codes. */
export const SYSTEM_COLORS_LEGEND: SystemColorMeaning[] = [
  systemMeaning('neutral', 'Basic System Info | Unknown (Gray)', 'Gray', 'Basic system info, Unknown characters', 'unknown'),
  systemMeaning('other', 'Other System Context | Miscellaneous (Gray)', 'Gray', 'Miscellaneous system information', 'unknown'),
  systemMeaning('codex_update', 'New Info | Main Character (Blue)', 'Blue', 'New info, ally scan, codex record, Good items', 'mainCharacter'),
  systemMeaning('progression', 'Stable Growth | Friend (Green)', 'Emerald', 'Training progress, stable growth, Decent items', 'ally'),
  systemMeaning('breakthrough', 'Awakening | Mentor & Special Location (Gold)', 'Gold', 'Level-up, evolution, awakening, Special locations, Legendary items', 'mentor'),
  systemMeaning('reward', 'Loot & Achievements | Legendary (Gold)', 'Gold', 'Loot, Qi gain, achievement, Legendary items', 'itemLegendary'),
  systemMeaning('warning', 'Risk & Pressure | Great Item (Orange)', 'Orange', 'Risk, instability, choice pressure, Great items', 'itemGreat'),
  systemMeaning('critical_danger', 'Combat Threat | Enemy (Red)', 'Red', 'Enemy, death risk, combat threat', 'enemy'),
  systemMeaning('combat_artifact', 'Combat Artifact | Special Encounter (Red-Gold)', 'Red-Gold', 'Powerful artifact found or used during combat', 'enemy', { borderColorCode: 'itemLegendary', textPresentationClass: 'font-semibold' }),
  systemMeaning('combat_breakthrough', 'Combat Breakthrough | Mid-fight Evolution (Gold-Red)', 'Gold-Red', 'Breakthrough achieved under combat pressure', 'mentor', { borderColorCode: 'enemy', textPresentationClass: 'font-bold' }),
  systemMeaning('heavenly_tribulation', 'Heavenly Tribulation | Divine Trial (Purple-Gold)', 'Purple-Gold', 'A moment of supreme destiny or danger', 'location', { borderColorCode: 'mentor', textPresentationClass: 'font-bold italic' }),
  systemMeaning('corruption', 'Permanent Curse | Tragedy (Dark Rose)', 'Dark Rose', 'Permanent damage, curse, tragedy', 'corruption'),
  systemMeaning('mystery', 'Fate & Prophecy | Regular Location (Purple)', 'Violet', 'Hidden truth, fate thread, prophecy, Regular locations', 'location'),
  systemMeaning('romance', 'Karmic Affinity | Lover (Pink)', 'Pink', 'Bonds, affection, emotional lock-in', 'bond'),
  systemMeaning('choice_consequence', 'Karmic Consequence | Great Item (Orange)', 'Orange', 'The world remembers your decision, Great items', 'itemGreat'),
  systemMeaning('system_error', 'System Instability | System Error (Red Glitch)', 'Red glitch', 'The “system” itself is unstable', 'enemy', { textPresentationClass: 'font-bold', borderPresentationClass: 'border-double' }),
];

const COMPACT_CLASSIFICATIONS: Record<string, { category: string; subtype: string }> = {
  neutral: { category: 'System', subtype: 'Info' }, other: { category: 'System', subtype: 'General' }, codex_update: { category: 'Codex', subtype: 'Update' }, progression: { category: 'Growth', subtype: 'Stable' }, breakthrough: { category: 'Breakthrough', subtype: 'Awakening' }, reward: { category: 'Reward', subtype: 'Loot' }, warning: { category: 'Warning', subtype: 'Risk' }, critical_danger: { category: 'Combat', subtype: 'Enemy' }, combat_artifact: { category: 'Combat', subtype: 'Artifact' }, combat_breakthrough: { category: 'Combat', subtype: 'Breakthrough' }, heavenly_tribulation: { category: 'Tribulation', subtype: 'Divine' }, corruption: { category: 'Curse', subtype: 'Permanent' }, mystery: { category: 'Fate', subtype: 'Prophecy' }, romance: { category: 'Bond', subtype: 'Karmic' }, choice_consequence: { category: 'Karma', subtype: 'Consequence' }, system_error: { category: 'System', subtype: 'Error' },
};

export function getSystemCompactClassification(meaning: SystemColorMeaning) {
  return COMPACT_CLASSIFICATIONS[meaning.type] ?? COMPACT_CLASSIFICATIONS.neutral;
}

const SYSTEM_TYPE_ALIASES: Record<string, string> = {
  friendly_scan: 'codex_update', quest_update: 'codex_update', ally_scan: 'codex_update', enemy_scan: 'critical_danger', danger: 'critical_danger', death_event: 'corruption', death_flag: 'corruption', fate_event: 'mystery', fate: 'mystery', prophecy: 'mystery', revelation: 'mystery', quest: 'mystery', appraisal: 'breakthrough', karmic_bond: 'romance', bond: 'romance', relationship: 'romance', level_up: 'breakthrough', levelup: 'breakthrough', skill_acquired: 'progression', technique_learned: 'progression', ability_gained: 'progression', achievement: 'reward', loot: 'reward', error: 'system_error', glitch: 'system_error', karma: 'choice_consequence', consequence: 'choice_consequence', tribulation: 'heavenly_tribulation',
};

export function normalizeSystemType(type?: string): string | undefined {
  if (typeof type !== 'string' || !type) return undefined;
  const key = type.trim().toLowerCase();
  return SYSTEM_TYPE_ALIASES[key] ?? key;
}

export function getSystemInferredType(context?: string): string {
  if (!context) return 'other';
  const value = context.toLowerCase();
  if (value.includes('combat') && value.includes('artifact')) return 'combat_artifact';
  if (value.includes('combat') && value.includes('breakthrough')) return 'combat_breakthrough';
  if (['tribulation', 'divine trial'].some(term => value.includes(term))) return 'heavenly_tribulation';
  if (['system error', 'unstable', 'glitch', 'malfunction', 'iron fate warning'].some(term => value.includes(term))) return 'system_error';
  if (['karma backlash', 'choice_consequence', 'remembers', 'consequence', 'decision'].some(term => value.includes(term))) return 'choice_consequence';
  if (['danger', 'critical', 'death threat', 'hostile', 'enemy'].some(term => value.includes(term))) return 'critical_danger';
  if (['death flag', 'death', 'corruption', 'permanent', 'curse', 'tragedy'].some(term => value.includes(term))) return 'corruption';
  if (['breakthrough', 'evolution', 'level up', 'level-up', 'ascension', 'legendary', 'awakening'].some(term => value.includes(term))) return 'breakthrough';
  if (['romance', 'bond', 'affection', 'karmic affinity', 'relationship'].some(term => value.includes(term))) return 'romance';
  if (['loot', 'qi gain', 'achievement', 'reward', 'artifact', 'treasure', 'gain'].some(term => value.includes(term))) return 'reward';
  if (['warning', 'risk', 'instability', 'pressure'].some(term => value.includes(term))) return 'warning';
  if (['fate lock', 'fate event', 'mystery', 'revelation', 'fate', 'unknown', 'prophecy', 'truth'].some(term => value.includes(term))) return 'mystery';
  if (['friendly', 'update', 'quest', 'info', 'codex', 'scan', 'record', 'discover'].some(term => value.includes(term))) return 'codex_update';
  if (['progress', 'stable', 'growth', 'training', 'technique', 'skill', 'learned', 'mastered', 'comprehension', 'insight'].some(term => value.includes(term))) return 'progression';
  return 'other';
}

export interface SystemContextSource {
  title?: string;
  rows?: Array<{ label?: string; value?: string }>;
}

export function buildSystemContext(system?: SystemContextSource, content?: string): string {
  const rows = Array.isArray(system?.rows) ? system.rows : [];
  const rowText = rows.map(row => `${row?.label ?? ''} ${row?.value ?? ''}`.trim()).join(' ');
  return [system?.title, rowText, content].filter(Boolean).join(' ').trim();
}

export function getSystemColorMeaning(promptType?: string, context?: string): SystemColorMeaning {
  let type = normalizeSystemType(promptType) || getSystemInferredType(context);
  let match = SYSTEM_COLORS_LEGEND.find(meaning => meaning.type === type);
  if (!match && promptType && context) {
    type = getSystemInferredType(context);
    match = SYSTEM_COLORS_LEGEND.find(meaning => meaning.type === type);
  }
  return match || SYSTEM_COLORS_LEGEND[0];
}

export function getSystemColorStyle(meaning: SystemColorMeaning): SystemColorStyle {
  return {
    color: getColorCodeValue(meaning.colorCode),
    '--system-color': getColorCodeValue(meaning.colorCode),
    '--system-color-border': getColorCodeValue(meaning.borderColorCode),
    '--system-color-surface': getColorCodeValue(meaning.surfaceColorCode),
  };
}

export function getSystemPromptColor(promptType?: string, context?: string): string {
  const meaning = getSystemColorMeaning(promptType, context);
  const base = `${meaning.borderColor} ${meaning.textColor} ${meaning.bgColor} shadow-[0_0_15px_color-mix(in_srgb,var(--system-color)_15%,transparent)]`;
  return meaning.type === 'system_error' ? `${base} animate-pulse` : base;
}

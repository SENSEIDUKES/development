import { STORY_TAG_CATALOG, type StoryTagMetadata } from './storyTagCatalog';

/** Genre supplies a small prior; premise evidence always ranks ahead of it. */
const GENRE_TAGS: Record<string, string[]> = {
  Xianxia: ['cultivation realms', 'sect politics', 'dao comprehension', 'tribulation events'],
  Xuanhuan: ['bloodline awakening', 'martial techniques', 'tribulation events'],
  'LitRPG / System': ['game systems', 'level progression', 'system missions', 'skill trees'],
  'Academy Cultivation': ['academy cultivation', 'exam arcs', 'class rankings', 'rival schools'],
  'Kingdom Building': ['kingdom building', 'territory control', 'resource management', 'laws'],
  'Crafting / Alchemy': ['crafting/alchemy', 'pill refinement', 'artifact economy'],
  'Beast Taming': ['beast-taming / monster evolution', 'bonded beasts', 'bloodline awakenings'],
  'Tower Climb': ['dungeon/tower climb', 'floor bosses', 'trial rooms'],
  Regression: ['regression/reincarnation', 'future knowledge', 'second chances'],
  'Urban Cultivation': ['urban/modern cultivation', 'hidden sects in modern cities', 'social status growth'],
  'Apocalypse Cultivation': ['apocalypse cultivation', 'survival camps', 'mutated beasts'],
  'Cosmic Cultivation': ['cosmic cultivation', 'star realms', 'galactic inheritances'],
  'Political Intrigue': ['court intrigue', 'political pressure', 'faction memory'],
  'Cozy Slice-of-Life': ['cozy / slice-of-life cultivation', 'village bonds', 'low-stakes daily progress'],
  'Mystery Cultivation': ['mystery cultivation', 'forbidden cases', 'hidden murders'],
};

export const INFERRED_TAG_LIMIT = 8;
export interface StoryTagInferenceInput {
  premise?: string;
  genre?: string;
  style?: string;
}

// These cues translate ordinary premise language into existing catalog concepts.
// Specific tropes require specific evidence: love does not imply arranged marriage,
// a town does not imply kingdom building, and a star does not imply cultivation.
const PREMISE_CUES: { match: RegExp; tags: string[] }[] = [
  { match: /\b(?:cultivat(?:ion|or|ors|e|es|ing)|qi|meridians?|dantian)\b/i, tags: ['cultivation realms'] },
  { match: /\b(?:game system|litrpg|status screen|status window)\b/i, tags: ['game systems'] },
  { match: /\b(?:level up|levels up|experience points)\b/i, tags: ['level progression'] },
  { match: /\b(?:sect|sects|disciple|disciples)\b/i, tags: ['sect politics'] },
  { match: /\b(?:reborn|reincarnat(?:ion|ed|es)|past lives)\b/i, tags: ['reincarnation rules'] },
  { match: /\b(?:back in time|time loops?|timelines?|regress(?:ion|or|ed))\b/i, tags: ['regression/reincarnation'] },
  { match: /\b(?:doomed|dies|destined to die|death sentence)\b/i, tags: ['destined death'] },
  { match: /\b(?:fall(?:s|ing)? in love|romance|romantic|lovers?|beloved|wife|husband)\b/i, tags: ['romantic tension'] },
  { match: /\b(?:forced to marry|marriage of convenience|arranged marriage)\b/i, tags: ['arranged marriage'] },
  { match: /\b(?:slow burn|gradually fall(?:s|ing)? in love)\b/i, tags: ['slow-burn romance'] },
  { match: /\b(?:grief|grieving|mourn(?:s|ing)?|trauma|haunted by the past)\b/i, tags: ['emotional continuity', 'tragedy'] },
  { match: /\b(?:old promises?|unresolved promises?|remember(?:s|ing)?|memories|years later)\b/i, tags: ['chapter memory', 'delayed payoffs'] },
  { match: /\b(?:consequences|lasting scars?|past decisions|past mistakes)\b/i, tags: ['long-term consequences'] },
  { match: /\b(?:clues?|investigat(?:e|es|ion|ing)|detective|disappearance)\b/i, tags: ['mystery clues', 'mystery'] },
  { match: /\b(?:cozy|gentle|wholesome|peaceful)\b/i, tags: ['cozy fantasy', 'slow life'] },
  { match: /\b(?:daily life|everyday life|slice of life)\b/i, tags: ['slice of life'] },
  { match: /\b(?:funny|comedy|humou?r|banter)\b/i, tags: ['comedy'] },
  { match: /\b(?:cook(?:s|ing)?|bakery|restaurant|chef)\b/i, tags: ['food'] },
  { match: /\b(?:farm(?:s|ing)?|crops?|harvest)\b/i, tags: ['farming'] },
  { match: /\b(?:harbou?r|port city|seaside|maritime)\b/i, tags: ['port economy'] },
  { match: /\b(?:ancient ruins|ruined temple|lost civilization)\b/i, tags: ['ancient ruins', 'lost history'] },
  { match: /\b(?:found family|adopted family|chosen family)\b/i, tags: ['found family'] },
  { match: /\b(?:betray(?:al|ed|s)?|backstab(?:bed|bing)?)\b/i, tags: ['betrayal fallout'] },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const containsPhrase = (text: string, phrase: string) => (` ${text} `).includes(` ${phrase} `);
// Preserve the catalog lookup's last-entry authority for historical duplicate labels.
const catalog = [...new Map(STORY_TAG_CATALOG.map(entry => [normalize(entry.label), entry])).values()].map(entry => ({
  entry,
  phrases: [entry.label, ...entry.aliases].map(normalize).filter(Boolean),
}));
const moodTags = new Set(['comedy', 'tragedy', 'mystery', 'slow life', 'slice of life', 'cozy fantasy', 'tone control']);
const settingTags = new Set(['ancient ruins', 'secret realms', 'port economy', 'lost history', 'map expansion']);
const dimension = (entry: StoryTagMetadata) => moodTags.has(entry.label)
  ? 'Mood' : settingTags.has(entry.label) ? 'Setting' : entry.category;

/**
 * Rank the entire catalog, then spread relevant candidates across dimensions.
 * Style breaks ties, never excludes tags or supplies evidence on its own.
 * No random filler: a sparse premise may correctly yield fewer suggestions.
 */
export const recommendStoryTags = (
  input: StoryTagInferenceInput,
  selectedTags: string[] = [],
  limit = 10,
): StoryTagMetadata[] => {
  const raw = input.premise || '';
  // Handle explicit exclusions conservatively within a clause. This is lexical
  // matching, not a model: complex negation and implied intent remain limited.
  const exclusions = [...raw.matchAll(/\b(?:no|without|not|never)\s+([^,.!?;]+?)(?=\b(?:but|instead|yet)\b|[,.;!?]|$)/gi)]
    .map(match => normalize(match[1]));
  const premise = normalize(raw.replace(/\b(?:no|without|not|never)\s+[^,.!?;]+?(?=\b(?:but|instead|yet)\b|[,.;!?]|$)/gi, ' '));
  const selected = new Set(selectedTags.map(tag => normalize(tag)));
  const genreKey = Object.keys(GENRE_TAGS).find(key => normalize(key) === normalize(input.genre || ''));
  const genreTags = genreKey ? GENRE_TAGS[genreKey].slice(0, 2) : [];
  const cueScores = new Set(PREMISE_CUES.filter(rule => rule.match.test(premise)).flatMap(rule => rule.tags));
  const excludedCues = new Set(PREMISE_CUES.filter(rule => exclusions.some(text => rule.match.test(text))).flatMap(rule => rule.tags));
  const candidates = catalog.flatMap(({ entry, phrases }) => {
    if (selected.has(normalize(entry.label)) || excludedCues.has(entry.label)
      || exclusions.some(text => phrases.some(phrase => containsPhrase(text, phrase)))) return [];
    const matched = phrases.filter(phrase => containsPhrase(premise, phrase));
    const evidence = Math.max(0, ...matched.map(phrase => 12 + Math.min(phrase.split(' ').length, 4)));
    const score = Math.max(evidence, cueScores.has(entry.label) ? 10 : 0,
      genreTags.includes(entry.label) ? 2 : 0);
    return score ? [{ entry, score, style: entry.styles.some(style => style === input.style) ? 1 : 0 }] : [];
  });
  const result: StoryTagMetadata[] = [];
  const counts = new Map<string, number>();
  while (candidates.length && result.length < Math.max(0, Math.min(limit, 30))) {
    // A repeated family gradually loses priority, without forcing irrelevant families.
    candidates.sort((a, b) =>
      b.score / (1 + (counts.get(dimension(b.entry)) || 0))
      - a.score / (1 + (counts.get(dimension(a.entry)) || 0))
      || b.style - a.style || a.entry.label.localeCompare(b.entry.label));
    const { entry } = candidates.shift()!;
    result.push(entry);
    const key = dimension(entry);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return result;
};

/** Same ranked recommendations at generation; creator-selected tags stay untouched. */
export const inferStoryTags = (input: StoryTagInferenceInput): string[] => {
  const tags = recommendStoryTags(input, [], INFERRED_TAG_LIMIT).map(entry => entry.label);
  return tags.length ? tags : ['long-term consequences', 'emotional continuity', 'character status'];
};

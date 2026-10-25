import { getTagMetadata, normalizeStoryTagIdentity, type StoryTagMetadata } from './storyTagCatalog';

/**
 * Story Tag niches: the second axis of the tag catalog, beside its families.
 * A family says what kind of tag something is (System & Progression, Politics
 * & War); a niche says which kind of story reaches for it. SENSEI, 2026-10-25:
 * "literally have a lit RPG parent tab that has those type game element tags.
 * And we need to do that for a lot of different genres."
 *
 * Each niche is one of the genre paths a creator picks in Origin, keyed by the
 * same id, so a story's saved genre opens its own niche with no new seed
 * field. A tag may belong to several niches (a status window is as much Tower
 * Climb as System). Tags every story can use (Genre, Tone, the protagonist
 * archetypes, most romance) belong to no niche: they are always reached from
 * All tags.
 *
 * `core` is the niche's few defining tags: the weak prior a genre gives
 * premise-led suggestions. `tags` is everything the niche holds, core first.
 */
export interface StoryTagNiche {
  /** The genre path id the niche belongs to, exactly as Origin saves it. */
  id: string;
  label: string;
  core: readonly string[];
  tags: readonly string[];
}

const niche = (id: string, label: string, core: string[], more: string[]): StoryTagNiche =>
  ({ id, label, core, tags: [...core, ...more.filter(tag => !core.includes(tag))] });

export const STORY_TAG_NICHES: readonly StoryTagNiche[] = [
  niche('Xianxia', 'Xianxia', ['cultivation realms', 'sect politics', 'dao comprehension', 'heavenly tribulation'], [
    'breakthrough pressure', 'bottleneck arcs', 'power scaling', 'martial techniques', 'bloodline awakening', 'inheritance trials',
    'artifact growth', 'weapon spirits', 'artifact refining', 'alchemy', 'formations & arrays', 'talisman design', 'forbidden manual',
    'immortal ascension', 'heaven defiance', "heaven's punishment", 'sect diplomacy', 'sect rankings', 'righteous sect', 'demonic path',
    'ancient clan', 'clan politics', 'young master rivalry', 'face slapping', 'master-disciple bond', 'dual cultivation',
    'adult-only double cultivation politics', 'karmic bonds', 'karmic debt', 'secret realms', 'ancient ruins', 'spirit beast',
    'auction politics', 'rare materials', 'ancient grudges', 'mythic history', 'sworn brotherhood', 'hidden instructors',
    'borrowed lifespan', 'stolen fate',
  ]),
  niche('Xuanhuan', 'Xuanhuan', ['bloodline awakening', 'martial techniques', 'heavenly tribulation'], [
    'cultivation realms', 'power scaling', 'breakthrough pressure', 'inheritance trials', 'artifact growth', 'weapon spirits',
    'heaven defiance', 'immortal ascension', 'magic', 'secret bloodlines', 'ancient clan', 'clan politics', 'young master rivalry',
    'face slapping', 'demonic path', 'secret realms', 'ancient ruins', 'spirit beast', 'gods & deities', 'mythic history',
    'forbidden manual', 'auction politics',
  ]),
  niche('LitRPG / System', 'System', ['game systems', 'level progression', 'system missions', 'skill trees'], [
    'status window', 'player system', 'stat growth', 'job classes', 'class evolution', 'quest systems', 'achievement systems',
    'system awakening', 'system rewards', 'system penalties', 'system shop', 'system diagnostics', 'system corruption',
    'hidden stats', 'karma points', 'influence points', 'admin points', 'military points', 'diplomacy points', 'logistics points',
    'rank system', 'scenario system', 'awakening', 'cheat skill', 'cooking skill', 'save points', 'death penalties', 'respawn logic',
    'dungeon systems', 'loot systems', 'raid mechanics', 'boss mechanics', 'party roles', 'quest chains', 'hidden quests',
    'tutorial systems', 'safe zones', 'player factions', 'NPC agendas', 'world events', 'constellation sponsors', 'streamed trials',
    'crafting systems', 'enchantment systems', 'summoning systems', 'isekai', 'summoned hero', 'demon king', 'adventurer guild',
    'guild ranks',
  ]),
  niche('Academy Cultivation', 'Academy Cultivation', ['academy cultivation', 'exams', 'class rankings', 'rival schools'], [
    'academy', 'school life', 'school hierarchy', 'academy rankings', 'student factions', 'teacher politics', 'discipline systems',
    'training schedules', 'mission boards', 'campus secrets', 'forbidden libraries', 'trial grounds', 'rival dorms',
    'hidden instructors', 'dungeon academy', 'training arc', 'tournament', 'arena rankings', 'master-disciple bond',
    'senpai-kouhai', 'rivalry', 'young master rivalry',
  ]),
  niche('Kingdom Building', 'Kingdom Building', ['kingdom building', 'territory control', 'resource management', 'laws'], [
    'kingdom economy', 'city building', 'village growth', 'settlement upgrades', 'territory upgrades', 'infrastructure growth',
    'trade routes', 'supply chains', 'port economy', 'mining economy', 'tax reform', 'law reform', 'public order', 'land rights',
    'tribute systems', 'famine pressure', 'scarcity economy', 'refugee crisis', 'labor shortage', 'grain pricing', 'currency pressure',
    'debt crisis', 'trade embargo', 'war economy', 'economic recovery', 'modern knowledge uplift', 'diplomacy', 'vassal management',
    'noble resistance', 'rebellion risk', 'military strategy', 'border defense', 'troop morale', 'unit progression', 'officer loyalty',
    'elite units', 'special corps', 'siege warfare', 'fortress defense', 'campaign planning', 'battlefield tactics', 'military doctrine',
    'weapon upgrades', 'mercenary contracts', 'occupied territory', 'conquered loyalty', 'war', 'war exhaustion',
    'guerrilla warfare', 'border raids', 'supply raids', 'strategic retreat', 'city evacuation', 'enemy generals',
    'battlefield reputation', 'veteran trauma', 'smuggling routes', 'contract enforcement', 'logistics points', 'military points',
    'diplomacy points',
  ]),
  niche('Crafting / Alchemy', 'Crafting/Alchemy', ['crafting systems', 'alchemy', 'artifact economy'], [
    'artifact refining', 'artifact growth', 'weapon forging', 'weapon spirits', 'enchantment systems', 'talisman design',
    'formations & arrays', 'cooking skill', 'food', 'rare materials', 'magical resources', 'master workshops', 'artisan production',
    'guild economy', 'guild systems', 'auction politics', 'market control', 'monopoly strategy', 'black market',
  ]),
  niche('Beast Taming', 'Beast Taming', ['beast taming', 'bonded beasts', 'bloodline awakening'], [
    'monster evolution', 'pet evolution', 'monster companions', 'spirit beast', 'summoning systems', 'beast sect politics',
    'spirit contracts', 'mutated beasts', 'void beasts', 'reincarnated monster',
  ]),
  niche('Tower Climb', 'Tower Climb', ['tower climbing', 'floor bosses', 'trial rooms'], [
    'ancient tower rankings', 'dungeon systems', 'dungeon gates', 'boss mechanics', 'raid mechanics', 'raid team', 'hero party',
    'party roles', 'party chemistry', 'party conflict', 'party banishment', 'loot systems', 'hidden quests', 'safe zones',
    'tutorial systems', 'level progression', 'status window', 'death penalties', 'respawn logic', 'constellation sponsors',
    'streamed trials', 'ranker', 'survival games',
  ]),
  niche('Regression', 'Regression', ['regression', 'foreknowledge', 'second chances'], [
    'returner', 'revenge returner', 'reincarnation rules', 'time loops', 'save points', 'changing timelines', 'saving the doomed',
    'destined death', 'death flags', 'doom timers', 'fate correction', 'fate repair', 'transmigration', 'villainess', 'otome game',
    'revenge', 'revenge spiral', 'betrayal', 'hiding true strength', 'stolen fate', 'fate exchange', 'borrowed lifespan',
    'reincarnation debt', 'blood debt', 'broken prophecy',
  ]),
  niche('Urban Cultivation', 'Urban Cultivation', ['urban cultivation', 'hidden society', 'social status growth'], [
    'corporate clans', 'chaebol clans', 'district control', 'urban territory', 'underworld sects', 'spiritual black markets',
    'apartment spirits', 'subway realms', 'convenience spirits', 'celebrity vessels', 'idol factions', 'media pressure',
    'viral reputation', 'public scandal', 'modern artifacts', 'phone talismans', 'contract rewriting', 'spiritual real estate',
    'debt curses', 'revenge climb', 'family pressure', 'hunter rankings', 'hunter society', 'awakened citizens',
    'association politics', 'gate outbreaks', 'dungeon gates', 'ranker', 'face slapping', 'hiding true strength',
  ]),
  niche('Apocalypse Cultivation', 'Apocalypse', ['apocalypse cultivation', 'survival camps', 'mutated beasts'], [
    'apocalypse survival', 'ruined worlds', 'broken heavenly laws', 'gate outbreaks', 'system awakening', 'awakening',
    'survival games', 'doom timers', 'monster evolution', 'scarcity economy', 'famine pressure', 'refugee crisis',
    'resource management',
  ]),
  niche('Cosmic Cultivation', 'Cosmic', ['cosmic cultivation', 'star realms', 'galactic inheritances'], [
    'planetary sects', 'void beasts', 'immortal ascension', 'gods & deities', 'power scaling', 'mythic history', 'map expansion',
    'world events',
  ]),
  niche('Political Intrigue', 'Political Intrigue', ['court intrigue', 'political pressure', 'spy networks'], [
    'imperial oversight', 'noble resistance', 'succession crisis', 'legitimacy crisis', 'intelligence war', 'diplomatic leverage',
    'treaty instability', 'alliance building', 'alliance decay', 'betrayal', 'betrayal fallout', 'rival factions', 'proxy war',
    'hostage diplomacy', 'merchant politics', 'council politics', 'propaganda war', 'public scandal', 'hidden patrons',
    'puppet ruler', 'marriage alliances', 'political romance', 'arranged marriage', 'assassination plots', 'warlord politics',
    'regional politics', 'cultural tension', 'religious pressure', 'rebellion risk', 'rebel recruitment', 'clan politics',
    'sect politics', 'guild politics', 'banking influence', 'foreign investment', 'prisoner politics', 'war', 'villainess',
    'clever protagonist',
  ]),
  niche('Cozy Slice-of-Life', 'Cozy/Slice-of-Life', ['cozy / slice-of-life cultivation', 'village bonds', 'low-stakes daily progress'], [
    'farming', 'food', 'healing', 'cooking skill', 'village growth', 'found family', 'childhood friend', 'affection growth',
    'artisan production', 'master workshops', 'crafting systems', 'spirit beast', 'monster companions',
  ]),
  niche('Mystery Cultivation', 'Mystery', ['mystery cultivation', 'forbidden cases', 'hidden murders'], [
    'secret bloodlines', 'sealed memories', 'lost history', 'mythic history', 'cursed relics', 'ancient sealed truths',
    'forbidden libraries', 'hidden identity', 'hidden patrons', 'spy networks', 'assassination plots', 'curses', 'debt curses',
    'campus secrets', 'ancient ruins',
  ]),
];

const nicheKey = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** The niche a story's genre opens, matched on its genre path id; a custom genre has none. */
export const findStoryTagNiche = (genre: string | undefined): StoryTagNiche | undefined => {
  const key = nicheKey(genre ?? '');
  return key ? STORY_TAG_NICHES.find(entry => nicheKey(entry.id) === key) : undefined;
};

const NICHES_BY_TAG = new Map<string, StoryTagNiche[]>();
for (const entry of STORY_TAG_NICHES) {
  for (const tag of entry.tags) {
    const identity = normalizeStoryTagIdentity(tag);
    NICHES_BY_TAG.set(identity, [...(NICHES_BY_TAG.get(identity) ?? []), entry]);
  }
}

/** Every niche a tag belongs to, in niche order. */
export const getStoryTagNiches = (label: string): StoryTagNiche[] =>
  [...(NICHES_BY_TAG.get(normalizeStoryTagIdentity(label)) ?? [])];

/** A niche's tags as catalog entries, in the niche's own order. */
export const storyTagNicheEntries = (entry: StoryTagNiche): StoryTagMetadata[] =>
  entry.tags.map(tag => getTagMetadata(tag)).filter((metadata): metadata is StoryTagMetadata => Boolean(metadata));

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

const niche = (name: string, core: string[], more: string[]): StoryTagNiche =>
  ({ id: name, label: name, core, tags: [...new Set([...core, ...more])] });

export const STORY_TAG_NICHES: readonly StoryTagNiche[] = [
  niche('Xianxia', ['cultivation realms', 'sect politics', 'dao comprehension', 'heavenly tribulation'], [
    'immortals',
    'cultivation',
    'breakthrough pressure', 'bottleneck arcs', 'power scaling', 'martial techniques', 'bloodline awakening',
    'inheritance trials', 'artifact growth', 'weapon spirits', 'artifact refining', 'alchemy', 'formations & arrays',
    'talisman design', 'forbidden manual', 'immortal ascension', 'heaven defiance', "heaven's punishment", 'sect diplomacy',
    'sect rankings', 'righteous sect', 'demonic path', 'ancient clan', 'clan politics', 'young master rivalry',
    'face slapping', 'master-disciple bond', 'dual cultivation', 'karmic bonds',
    'karmic debt', 'secret realms', 'ancient ruins', 'spirit beast', 'auction politics', 'rare materials', 'ancient grudges',
    'mythic history', 'sworn brotherhood', 'hidden instructors', 'borrowed lifespan', 'stolen fate',
  ]),
  niche('Xuanhuan', ['bloodline awakening', 'martial techniques', 'heavenly tribulation'], [
    'cultivation',
    'cultivation realms', 'power scaling', 'breakthrough pressure', 'inheritance trials', 'artifact growth', 'weapon spirits',
    'heaven defiance', 'immortal ascension', 'magic', 'secret bloodlines', 'ancient clan', 'clan politics',
    'young master rivalry', 'face slapping', 'demonic path', 'secret realms', 'ancient ruins', 'spirit beast',
    'gods & deities', 'mythic history', 'forbidden manual', 'auction politics',
  ]),
  niche('Wuxia', ['jianghu', 'martial techniques', 'sworn brotherhood'], [
    'ancient grudges', 'blood debt', 'revenge', 'righteous sect', 'demonic path', 'forbidden manual',
    'hidden instructors', 'master-disciple bond', 'sect politics', 'clan politics', 'assassination plots', 'hidden identity',
    'betrayal', 'tournament', 'oaths & vows',
  ]),
  niche('Murim', ['martial techniques', 'sect rankings'], [
    'jianghu', 'righteous sect', 'demonic path', 'clan politics', 'sect politics', 'young master rivalry', 'face slapping',
    'hidden instructors', 'forbidden manual', 'tournament', 'arena rankings', 'revenge', 'blood debt', 'hiding true strength',
    'weak to strong',
  ]),
  niche('High Martial', ['power scaling', 'rank system'], [
    'martial techniques', 'arena rankings', 'tournament', 'academy rankings', 'class rankings', 'social status growth',
    'corporate clans', 'association politics', 'bloodline awakening', 'breakthrough pressure', 'weak to strong',
    'face slapping', 'modern artifacts',
  ]),
  niche('Martial Academy', ['academy cultivation', 'exams', 'class rankings', 'rival schools'], [
    'academy', 'school life', 'school hierarchy', 'academy rankings', 'student factions', 'teacher politics',
    'discipline systems', 'training schedules', 'mission boards', 'campus secrets', 'forbidden libraries', 'trial grounds',
    'rival dorms', 'hidden instructors', 'dungeon academy', 'training arc', 'tournament', 'arena rankings',
    'master-disciple bond', 'senpai-kouhai', 'rivalry', 'young master rivalry',
  ]),
  niche('High Fantasy', ['magic', 'gods & deities', 'ancient ruins'], [
    'demons',
    'dragons',
    'map expansion', 'mythic history', 'lost history', 'prophecy', 'chosen one', 'demon king',
    'hero party', 'summoned hero', 'secret realms', 'kingdom economy', 'political pressure', 'war', 
  ]),
  niche('Isekai', ['isekai', 'summoned hero', 'modern knowledge uplift'], [
    'reincarnation', 'transmigration', 'cheat skill', 'status window', 'adventurer guild', 'guild ranks', 'demon king',
    'hero party', 'party banishment', 'monster companions', 'otome game', 'overpowered protagonist',
    'map expansion',
  ]),
  niche('Magic Academy', ['magic', 'academy', 'academy rankings'], [
    'school life', 'school hierarchy', 'student factions', 'teacher politics', 'exams', 'class rankings', 'rival schools',
    'rival dorms', 'campus secrets', 'forbidden libraries', 'trial grounds', 'training arc', 'tournament', 'dungeon academy',
    'rivalry', 'senpai-kouhai',
  ]),
  niche('Beast Taming', ['beast taming', 'bonded beasts', 'bloodline awakening'], [
    'monster evolution', 'pet evolution', 'monster companions', 'spirit beast', 'summoning systems', 'beast sect politics',
    'spirit contracts', 'mutated beasts', 'void beasts', 'reincarnated monster',
  ]),
  niche('Monster Reincarnation', ['reincarnated monster', 'monster evolution', 'reincarnation'], [
    'level progression', 'status window', 'skill trees', 'power scaling', 'monster companions', 'dungeon systems',
    'demon king', 'weak to strong', 'overpowered protagonist', 'map expansion',
  ]),
  niche('Villainess', ['villainess', 'otome game', 'death flags'], [
    'transmigration', 'reincarnation', 'regression', 'foreknowledge', 'saving the doomed', 'destined death', 'fate repair',
    'arranged marriage', 'political romance', 'court intrigue', 'succession crisis', 'public scandal', 'reverse harem',
    'enemies to lovers', 'clever protagonist',
  ]),
  niche('System', ['game systems', 'level progression', 'system missions', 'skill trees'], [
    'status window', 'player system', 'stat growth', 'job classes', 'class evolution', 'quest systems', 'achievement systems',
    'system awakening', 'system rewards', 'system penalties', 'system shop', 'system diagnostics', 'system corruption',
    'hidden stats', 'karma points', 'influence points', 'admin points', 'military points', 'diplomacy points',
    'logistics points', 'rank system', 'scenario system', 'awakening', 'cheat skill', 'cooking skill', 'save points',
    'death penalties', 'respawn logic', 'dungeon systems', 'loot systems', 'raid mechanics', 'boss mechanics', 'party roles',
    'quest chains', 'hidden quests', 'tutorial systems', 'safe zones', 'player factions', 'NPC agendas', 'world events',
    'constellation sponsors', 'streamed trials', 'crafting systems', 'enchantment systems', 'summoning systems', 'isekai',
    'summoned hero', 'demon king', 'adventurer guild', 'guild ranks',
  ]),
  niche('LitRPG', ['game systems', 'level progression', 'stat growth', 'skill trees'], [
    'status window', 'job classes', 'class evolution', 'quest systems', 'quest chains', 'hidden quests', 'loot systems',
    'dungeon systems', 'boss mechanics', 'raid mechanics', 'party roles', 'crafting systems', 'enchantment systems',
    'summoning systems', 'achievement systems', 'hidden stats', 'tutorial systems', 'safe zones', 'adventurer guild',
    'guild ranks',
  ]),
  niche('VRMMO', ['virtual reality', 'game systems', 'player factions'], [
    'level progression', 'job classes', 'class evolution', 'skill trees', 'loot systems', 'raid mechanics', 'boss mechanics',
    'party roles', 'guild politics', 'guild ranks', 'NPC agendas', 'world events', 'hidden quests', 'quest chains',
    'arena rankings', 'ranker', 'respawn logic', 'death penalties', 'hiding true strength',
  ]),
  niche('Tower Climb', ['tower climbing', 'floor bosses', 'trial rooms'], [
    'dungeons',
    'ancient tower rankings', 'dungeon systems', 'dungeon gates', 'boss mechanics', 'raid mechanics', 'raid team',
    'hero party', 'party roles', 'party chemistry', 'party conflict', 'party banishment', 'loot systems', 'hidden quests',
    'safe zones', 'tutorial systems', 'level progression', 'status window', 'death penalties', 'respawn logic',
    'constellation sponsors', 'streamed trials', 'ranker', 'survival games',
  ]),
  niche('Gates & Dungeons', ['dungeon gates', 'gate outbreaks', 'hunter rankings'], [
    'dungeons',
    'dungeon systems', 'raid team', 'raid mechanics', 'boss mechanics', 'loot systems', 'awakened citizens',
    'association politics', 'hunter society', 'ranker', 'system awakening', 'awakening', 'level progression', 'status window',
    'weak to strong', 'hiding true strength',
  ]),
  niche('Infinite Trials', ['scenario system', 'streamed trials', 'survival games'], [
    'constellation sponsors', 'trial rooms', 'death penalties', 'respawn logic', 'save points', 'hidden quests',
    'system rewards', 'system penalties', 'party conflict', 'betrayal', 'doom timers', 'survival rules', 'clever protagonist',
  ]),
  niche('Death Game', ['survival games', 'death penalties', 'doom timers'], [
    'betrayal', 'party conflict', 'alliance decay', 'scenario system',
    'streamed trials', 'survival rules', 'clever protagonist', 'assassination plots', 
  ]),
  niche('Urban Cultivation', ['urban cultivation', 'hidden society', 'social status growth'], [
    'cultivation',
    'corporate clans', 'chaebol clans', 'district control', 'urban territory', 'underworld sects', 'spiritual black markets',
    'apartment spirits', 'subway realms', 'convenience spirits', 'celebrity vessels', 'idol factions', 'media pressure',
    'viral reputation', 'public scandal', 'modern artifacts', 'phone talismans', 'contract rewriting', 'spiritual real estate',
    'debt curses', 'revenge climb', 'family pressure', 'hunter rankings', 'hunter society', 'awakened citizens',
    'association politics', 'gate outbreaks', 'dungeon gates', 'ranker', 'face slapping', 'hiding true strength',
  ]),
  niche('Urban Superpower', ['awakened citizens', 'awakening', 'hidden society'], [
    'system awakening', 'power scaling', 'association politics', 'hunter society', 'media pressure', 'viral reputation',
    'corporate clans', 'district control', 'underworld sects', 'modern artifacts', 'hiding true strength',
    'overpowered protagonist', 'face slapping',
  ]),
  niche('Hunter', ['hunter rankings', 'hunter society', 'dungeon gates'], [
    'monsters',
    'gate outbreaks', 'ranker', 'raid team', 'association politics', 'awakened citizens', 'guild politics', 'guild ranks',
    'loot systems', 'level progression', 'status window', 'media pressure', 'corporate clans', 'weak to strong', 'returner',
    'regression',
  ]),
  niche('Hidden World', ['hidden society', 'underworld sects', 'spiritual black markets'], [
    'urban cultivation', 'apartment spirits', 'subway realms', 'convenience spirits', 'contract rewriting',
    'spiritual real estate', 'debt curses', 'modern artifacts', 'phone talismans', 'hidden identity', 'secret bloodlines',
    'ancient clan', 'yokai', 'exorcism',
  ]),
  niche('School Life', ['school life', 'school hierarchy', 'student factions'], [
    'academy', 'class rankings', 'exams', 'rival schools', 'rival dorms', 'campus secrets', 'teacher politics',
    'senpai-kouhai', 'childhood friend', 'rivalry', 'romantic tension', 'social status growth', 'family pressure', 
  ]),
  niche('Entertainment Industry', ['idol factions', 'celebrity vessels', 'media pressure'], [
    'showbiz',
    'viral reputation', 'public scandal', 'social status growth', 'rivalry', 'revenge climb', 'corporate clans',
    'chaebol clans', 'family pressure', 'romantic tension', 'hidden identity', 'regression', 
  ]),
  niche('Business Tycoon', ['corporate clans', 'market control', 'monopoly strategy'], [
    'CEO',
    'chaebol clans', 'banking influence', 'foreign investment', 'trade routes', 'supply chains', 'merchant politics',
    'debt crisis', 'revenge climb', 'social status growth', 'family pressure', 'media pressure', 'modern knowledge uplift',
    'regression', 'clever protagonist',
  ]),
  niche('Sports & E-sports', ['tournament', 'training arc', 'rivalry'], [
    'e-sports',
    'arena rankings', 'ranker', 'weak to strong', 'underdog', 'party chemistry', 'party conflict', 'media pressure',
    'viral reputation', 'virtual reality', 'regression', 
  ]),
  niche('Apocalypse', ['apocalypse cultivation', 'survival camps', 'mutated beasts'], [
    'zombies',
    'apocalypse survival', 'ruined worlds', 'broken heavenly laws', 'gate outbreaks', 'system awakening', 'awakening',
    'survival games', 'doom timers', 'monster evolution', 'scarcity economy', 'famine pressure', 'refugee crisis',
    'resource management',
  ]),
  niche('Occult Mystery', ['mystery cultivation', 'forbidden cases', 'hidden murders'], [
    'vampires',
    'secret bloodlines', 'sealed memories', 'lost history', 'mythic history', 'cursed relics', 'ancient sealed truths',
    'forbidden libraries', 'hidden identity', 'hidden patrons', 'spy networks', 'assassination plots', 'curses', 'debt curses',
    'campus secrets', 'ancient ruins',
  ]),
  niche('Rules Horror', ['survival rules', 'doom timers', 'death flags'], [
    'clever protagonist', 'forbidden cases', 'cursed relics', 'sealed memories', 'survival games',
    'scenario system', 'apartment spirits', 'subway realms', 'convenience spirits', 
  ]),
  niche('Cosmic Horror', ['eldritch horror', 'sealed memories', 'ancient sealed truths'], [
    'gods & deities', 'lost history', 'mythic history', 'forbidden cases', 'cursed relics',
    'secret bloodlines', 'curses', 'prophecy', 
  ]),
  niche('Folklore & Yokai', ['yokai', 'spirit contracts', 'curses'], [
    'exorcism', 'gods & deities', 'mythic history', 'apartment spirits', 'convenience spirits',
    'monster companions', 'spirit beast', 'oaths & vows', 'village bonds', 
  ]),
  niche('Exorcist', ['exorcism', 'curses', 'cursed relics'], [
    'demons',
    'yokai', 'forbidden cases', 'hidden murders', 'spirit contracts', 'apartment spirits',
    'subway realms', 'debt curses', 'hidden society', 'talisman design', 'phone talismans',
  ]),
  niche('Sect Building', ['sect politics', 'resource management', 'sect rankings'], [
    'cultivation',
    'sect diplomacy', 'righteous sect', 'demonic path', 'master-disciple bond', 'hidden instructors', 'forbidden manual',
    'martial techniques', 'cultivation realms', 'alchemy', 'formations & arrays', 'rare materials', 'territory control',
    'alliance building', 'rival factions', 'ancient grudges', 'young master rivalry', 'tribute systems', 'auction politics',
  ]),
  niche('Kingdom Building', ['kingdom building', 'territory control', 'resource management', 'law reform'], [
    'kingdom economy', 'city building', 'village growth', 'settlement upgrades', 'settlement upgrades', 'infrastructure growth',
    'trade routes', 'supply chains', 'port economy', 'mining economy', 'tax reform', 'law reform', 'public order',
    'land rights', 'tribute systems', 'famine pressure', 'scarcity economy', 'refugee crisis', 'labor shortage',
    'grain pricing', 'currency pressure', 'debt crisis', 'trade embargo', 'war economy', 'economic recovery',
    'modern knowledge uplift', 'diplomacy', 'vassal management', 'noble resistance', 'rebellion risk', 'military strategy',
    'border defense', 'troop morale', 'unit progression', 'officer loyalty', 'elite units', 'special corps', 'siege warfare',
    'fortress defense', 'campaign planning', 'battlefield tactics', 'military doctrine', 'weapon upgrades',
    'mercenary contracts', 'occupied territory', 'conquered loyalty', 'war', 'war exhaustion', 'guerrilla warfare',
    'border raids', 'supply raids', 'strategic retreat', 'city evacuation', 'enemy generals', 'battlefield reputation',
    'veteran trauma', 'smuggling routes', 'contract enforcement', 'logistics points', 'military points', 'diplomacy points',
  ]),
  niche('Court Intrigue', ['court intrigue', 'political pressure', 'spy networks'], [
    'imperial oversight', 'noble resistance', 'succession crisis', 'legitimacy crisis', 'intelligence war',
    'diplomatic leverage', 'treaty instability', 'alliance building', 'alliance decay', 'betrayal', 'betrayal fallout',
    'rival factions', 'proxy war', 'hostage diplomacy', 'merchant politics', 'council politics', 'propaganda war',
    'public scandal', 'hidden patrons', 'puppet ruler', 'marriage alliances', 'political romance', 'arranged marriage',
    'assassination plots', 'warlord politics', 'regional politics', 'cultural tension', 'religious pressure', 'rebellion risk',
    'rebel recruitment', 'clan politics', 'sect politics', 'guild politics', 'banking influence', 'foreign investment',
    'prisoner politics', 'war', 'villainess', 'clever protagonist',
  ]),
  niche('Palace Intrigue', ['court intrigue', 'succession crisis', 'harem jealousy'], [
    'harem',
    'imperial oversight', 'political pressure', 'assassination plots', 'arranged marriage', 'marriage alliances',
    'political romance', 'hidden patrons', 'spy networks', 'public scandal', 'legitimacy crisis', 'betrayal', 'revenge',
    'villainess', 'clever protagonist',
  ]),
  niche('Household Intrigue', ['family pressure', 'arranged marriage', 'clan politics'], [
    'marriage alliances', 'political romance', 'succession crisis', 'hidden patrons', 'public scandal', 'assassination plots',
    'betrayal', 'revenge', 'villainess', 'land rights', 'debt crisis', 'clever protagonist',
  ]),
  niche('War & Strategy', ['military strategy', 'battlefield tactics', 'campaign planning'], [
    'military',
    'war', 'siege warfare', 'fortress defense', 'border defense', 'guerrilla warfare', 'border raids', 'supply raids',
    'troop morale', 'officer loyalty', 'unit progression', 'elite units', 'special corps', 'military doctrine',
    'weapon upgrades', 'mercenary contracts', 'enemy generals', 'battlefield reputation', 'war economy', 'war exhaustion',
    'strategic retreat', 'veteran trauma', 'intelligence war',
  ]),
  niche('Clan Warfare', ['clan politics', 'ancient clan', 'blood debt'], [
    'ancient grudges', 'rival factions', 'alliance building', 'alliance decay', 'betrayal', 'revenge', 'young master rivalry',
    'secret bloodlines', 'bloodline awakening', 'marriage alliances', 'succession crisis', 'family pressure', 'war',
  ]),
  niche('Historical Dynasty', ['imperial oversight', 'succession crisis', 'legitimacy crisis'], [
    'court intrigue', 'rebellion risk', 'warlord politics', 'noble resistance', 'regional politics', 'cultural tension',
    'religious pressure', 'tax reform', 'law reform', 'military strategy', 'war', 'modern knowledge uplift', 'transmigration',
    'rebirth of the strong',
  ]),
  niche('Cosmic Cultivation', ['cosmic cultivation', 'star realms', 'galactic inheritances'], [
    'cultivation',
    'planetary sects', 'void beasts', 'immortal ascension', 'gods & deities', 'power scaling', 'mythic history',
    'map expansion', 'world events',
  ]),
  niche('Interstellar', ['space travel', 'star realms', 'map expansion'], [
    'planetary sects', 'void beasts', 'galactic inheritances', 'alliance building', 'rival factions', 'war',
    'military strategy', 'trade routes', 'foreign investment', 'mecha',
  ]),
  niche('Mecha', ['mecha', 'military strategy', 'elite units'], [
    'military',
    'war', 'battlefield tactics', 'unit progression', 'weapon upgrades', 'special corps', 'academy rankings',
    'tournament', 'rivalry', 'veteran trauma', 'space travel',
  ]),
  niche('Cyberpunk', ['cyberpunk', 'corporate clans', 'district control'], [
    'underworld sects', 'black market', 'smuggling routes', 'media pressure', 'hidden identity', 'debt curses',
    'contract rewriting', 'modern artifacts', 'revenge climb', 
  ]),
  niche('Dimensional Rift', ['dungeon gates', 'gate outbreaks', 'map expansion'], [
    'void beasts', 'mutated beasts', 'ruined worlds', 'awakened citizens', 'hunter society', 'survival camps',
    'system awakening', 'world events', 'apocalypse survival',
  ]),
  niche('Alchemy', ['crafting systems', 'alchemy', 'artifact economy'], [
    'artifact refining', 'artifact growth', 'weapon forging', 'weapon spirits', 'enchantment systems', 'talisman design',
    'formations & arrays', 'cooking skill', 'food', 'rare materials', 'magical resources', 'master workshops',
    'artisan production', 'guild economy', 'guild systems', 'auction politics', 'market control', 'monopoly strategy',
    'black market',
  ]),
  niche('Forging & Artificing', ['weapon forging', 'artifact refining', 'master workshops'], [
    'artifact growth', 'weapon spirits', 'enchantment systems', 'crafting systems', 'rare materials', 'magical resources',
    'artisan production', 'guild economy', 'auction politics', 'artifact economy', 'talisman design', 'formations & arrays',
  ]),
  niche('Farming & Territory', ['farming', 'village growth', 'territory control'], [
    'resource management', 'settlement upgrades', 'settlement upgrades', 'infrastructure growth', 'land rights',
    'grain pricing', 'trade routes', 'village bonds', 'food', 
    'monster companions',
  ]),
  niche('Merchant & Shop', ['merchant politics', 'market control', 'trade routes'], [
    'monopoly strategy', 'guild economy', 'auction politics', 'black market', 'smuggling routes', 'supply chains',
    'currency pressure', 'banking influence', 'rare materials', 'artisan production', 'contract enforcement', 
  ]),
  niche('Culinary', ['food', 'cooking skill', 'artisan production'], [
    'tournament', 'rivalry', 'village bonds', 'rare materials', 'magical resources', 
  ]),
  niche('Divine Doctor', ['healing', 'alchemy', 'hidden identity'], [
    'medicine',
    'rare materials', 'magical resources', 'curses', 'borrowed lifespan', 'face slapping', 'social status growth',
    'corporate clans', 'family pressure', 'hiding true strength', 'overpowered protagonist',
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

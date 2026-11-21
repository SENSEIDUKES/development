/**
 * Story genres, grouped on eight shelves (SENSEI, 2026-11-20).
 *
 * A shelf only helps a creator find a genre; it is never saved and never limits
 * anything. Style, genre and tags stay independent: any tradition can take any
 * genre, and the story keeps exactly one genre. Tropes and devices that can ride
 * on any genre (regression, reincarnation, romance, cozy) are tags, not genres.
 *
 * A genre's `id` is what Origin saves and what the writer reads, so it is the
 * genre's plain name. `definition` is one line on what the creator is doing in
 * that story. `Fate Survival` is deliberately absent: it is an experience layer
 * owned by Story Seed Settings, not a genre.
 */
export const GENRE_SHELVES = [
  { id: 'martial', name: 'Martial' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'system', name: 'System' },
  { id: 'modern', name: 'Modern' },
  { id: 'horror', name: 'Horror' },
  { id: 'political', name: 'Political' },
  { id: 'sci-fi', name: 'Sci-fi' },
  { id: 'discipline', name: 'Discipline' },
] as const;

export type GenreShelfId = typeof GENRE_SHELVES[number]['id'];

export interface GenrePreset {
  /** Saved on the Story Seed and read by the writer: the genre's plain name. */
  id: string;
  name: string;
  shelf: GenreShelfId;
  /** One line on what the creator is doing in this story. */
  definition: string;
}

const genre = (shelf: GenreShelfId, name: string, definition: string): GenrePreset => ({ id: name, name, shelf, definition });

export const GENRE_PRESETS: readonly GenrePreset[] = [
  genre('martial', 'Xianxia', 'Cultivate toward immortality, defying heaven one realm at a time.'),
  genre('martial', 'Xuanhuan', 'Rise through a mythic world of bloodlines, beasts and boundless power.'),
  genre('martial', 'Wuxia', 'Walk the jianghu as a martial hero, bound by honor and old grudges.'),
  genre('martial', 'Murim', 'Fight your way up a martial world of sects, clans and factions.'),
  genre('martial', 'High Martial', 'Live in a society ranked and run by martial power.'),
  genre('martial', 'Martial Academy', 'Train, compete and rise through a martial academy.'),

  genre('fantasy', 'High Fantasy', 'Adventure through a world of magic, kingdoms and ancient powers.'),
  genre('fantasy', 'Isekai', 'Start over in another world, carrying what you knew.'),
  genre('fantasy', 'Magic Academy', 'Study, duel and rise through a school of magic.'),
  genre('fantasy', 'Beast Taming', 'Bond with beasts and grow stronger together.'),
  genre('fantasy', 'Monster Reincarnation', 'Be reborn as a monster and evolve your way to the top.'),
  genre('fantasy', 'Villainess', 'Wake as the doomed villainess of a story and rewrite your ending.'),

  genre('system', 'System', 'Grow through a system that hands out quests, rewards and stats.'),
  genre('system', 'LitRPG', 'Level, build and fight in a world that runs on game rules.'),
  genre('system', 'VRMMO', 'Play to win inside a virtual game where the stakes are real.'),
  genre('system', 'Tower Climb', 'Climb a tower floor by floor, each one a deadlier trial.'),
  genre('system', 'Gates & Dungeons', 'Clear the gates and dungeons that pour monsters into the world.'),
  genre('system', 'Infinite Trials', 'Survive world after world of trials, each with its own rules.'),
  genre('system', 'Death Game', 'Win a game where losing means dying.'),

  genre('modern', 'Urban Cultivation', 'Cultivate in secret inside the modern city.'),
  genre('modern', 'Urban Superpower', 'Live with powers that have awakened in today’s world.'),
  genre('modern', 'Hunter', 'Rank up as a licensed hunter who fights monsters for a living.'),
  genre('modern', 'Hidden World', 'Uncover the secret world beneath ordinary life.'),
  genre('modern', 'School Life', 'Rise through a modern school’s rivalries and secrets.'),
  genre('modern', 'Entertainment Industry', 'Climb to fame as an actor, idol or star.'),
  genre('modern', 'Business Tycoon', 'Build an empire in modern business.'),
  genre('modern', 'Sports & E-sports', 'Train and compete to become the best in your game.'),

  genre('horror', 'Apocalypse', 'Survive a world that has already ended.'),
  genre('horror', 'Occult Mystery', 'Investigate cases where the truth is supernatural.'),
  genre('horror', 'Rules Horror', 'Survive by obeying strange rules, and learn which ones lie.'),
  genre('horror', 'Cosmic Horror', 'Face truths too vast for the mind to hold.'),
  genre('horror', 'Folklore & Yokai', 'Walk among the spirits and monsters of old legends.'),
  genre('horror', 'Exorcist', 'Hunt ghosts, curses and demons as a professional exorcist.'),

  genre('political', 'Sect Building', 'Run a sect: its disciples, resources, techniques and rivals.'),
  genre('political', 'Kingdom Building', 'Rule and grow a realm, from village to empire.'),
  genre('political', 'Court Intrigue', 'Fight for power among ministers, princes and the throne.'),
  genre('political', 'Palace Intrigue', 'Survive and rise among the consorts of the inner palace.'),
  genre('political', 'Household Intrigue', 'Run and survive the schemes of a great household.'),
  genre('political', 'War & Strategy', 'Command armies and win wars through strategy.'),
  genre('political', 'Clan Warfare', 'Lead your clan through feuds, alliances and revenge.'),
  genre('political', 'Historical Dynasty', 'Shape the fate of a dynasty in a historical era.'),

  genre('sci-fi', 'Cosmic Cultivation', 'Cultivate across stars, planets and the void.'),
  genre('sci-fi', 'Interstellar', 'Explore, fight and rise among star empires.'),
  genre('sci-fi', 'Mecha', 'Pilot giant machines into war.'),
  genre('sci-fi', 'Cyberpunk', 'Survive the streets of a high-tech, low-life future.'),
  genre('sci-fi', 'Dimensional Rift', 'Fight what pours through the rifts between worlds.'),

  genre('discipline', 'Alchemy', 'Rise by the pills and elixirs you make: alchemy is the story.'),
  genre('discipline', 'Forging & Artificing', 'Forge the weapons and artifacts that shape the world.'),
  genre('discipline', 'Farming & Territory', 'Grow a single field into a thriving domain.'),
  genre('discipline', 'Merchant & Shop', 'Build a fortune through trade and a shop of your own.'),
  genre('discipline', 'Culinary', 'Win the world over one dish at a time.'),
  genre('discipline', 'Divine Doctor', 'Rise through a healer’s art that can cure anything.'),
];

/** The genres on one shelf, in shelf order. */
export const genresOnShelf = (shelf: GenreShelfId): GenrePreset[] => GENRE_PRESETS.filter(preset => preset.shelf === shelf);

/** The preset a saved genre names; a custom genre has none. */
export const findGenrePreset = (genre: string | undefined): GenrePreset | undefined => {
  const value = genre?.trim();
  return value ? GENRE_PRESETS.find(preset => preset.id === value) : undefined;
};

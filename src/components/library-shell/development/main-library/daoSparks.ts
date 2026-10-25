import type { StoryStyle, StorySpark } from '@seihouse/sen/story-seed';
import { GENRE_PRESETS } from '../../../story-seed/development/constants';

/**
 * Dao Insights' own sparks: what the elder mutters when no model is connected,
 * and what the header turns over while the panel is closed. Two for every
 * Story Seed genre, plus genres no list holds. Each is a whole Origin — premise,
 * title and novel tradition — usable as written; the aside and the
 * voice are the Library's dressing.
 */
export const DAO_GENRES = GENRE_PRESETS;

type HandSpark = Omit<StorySpark, 'inventedGenre' | 'survival'>;

const spark = (
  genre: string, premise: string, aside: string, voice: string,
  title: string, style: StoryStyle,
): HandSpark => ({ genre, premise, aside, voice, title, style });

const CHOSEN_GENRE_SPARKS: readonly HandSpark[] = [
  spark('Xianxia', 'An outer-sect sweeper discovers the dust he clears every morning is the ground-down bones of failed immortals, and it remembers their techniques.', 'Sweep long enough and the floor starts sweeping you back. Mind the corners.', 'Sleepless Master of the Nine Tea Cups', 'The Sweeper of Bone Dust', 'chinese'),
  spark('Xianxia', 'Every time a cultivator breaks through, Heaven sends a tribulation. Hers sends an apology letter instead, and nobody knows what Heaven did wrong.', 'Heaven is never sorry. Unless it is. Then everyone should be worried.', 'Hermit of the Leaking Roof', 'Heaven\'s Apology', 'chinese'),
  spark('Xuanhuan', 'A boy with no bloodline inherits a broken divine beast egg that hatches a different creature every full moon, each one hunted by a different empire.', 'Eggs are honest. They never tell you what is coming.', 'Drunken Quill Immortal', 'Full Moon Hatchling', 'chinese'),
  spark('Xuanhuan', 'The continent ranks people by the color of their soul flame. Hers burns clear, and every flame near it goes out.', 'The brightest fire is the one you cannot see. Or so I tell the cook.', 'Old Taoist of the Drunken Clay Pot', 'The Clear Flame', 'chinese'),
  spark('LitRPG / System', 'The System gives everyone a class at sixteen. Hers is "Patch Notes": she can read the changes coming to the world a week before they arrive.', 'Read the fine print, child. The world certainly did not.', 'Arch-Elder of the Rejected Inkstone', 'Patch Notes of the World', 'korean'),
  spark('LitRPG / System', 'A retired dungeon boss takes a desk job at the Adventurers Guild and starts writing quests that slowly dismantle the dungeon system from inside.', 'Even monsters want weekends.', 'Gluttonous Hermit of Blue-Wave Pier', 'The Boss Who Took a Desk Job', 'korean'),
  spark('Academy Cultivation', 'The academy\'s worst student is secretly its founder, reborn into a body with no talent, and every textbook she wrote is wrong.', 'The teacher who hated her own lessons. A classic.', 'Grand Scholar of the Burnt Wok', 'Every Textbook Is Wrong', 'chinese'),
  spark('Academy Cultivation', 'Exams at the Celestial Academy are graded by a living sword. It has failed every student for three hundred years, until it passes a boy who never drew it.', 'Some judges only want you to stop asking.', 'Sentinel of the Quiet Valley', 'The Sword That Never Passes', 'chinese'),
  spark('Kingdom Building', 'A disgraced general is exiled to rule a village of retired monsters who only agree to follow her if she can make the harvest festival fun again.', 'Kingdoms are built on bread and parties. Swords come later.', 'Fairy Chef of the Red Lotus Valley', 'The Harvest Festival Kingdom', 'chinese'),
  spark('Kingdom Building', 'A boy inherits a kingdom of one acre that grows by a mile every time someone in it laughs.', 'Tell a better joke, little king. The borders are waiting.', 'Free-Spirited Wanderer of Southern Reach', 'The Kingdom of One Acre', 'japanese'),
  spark('Crafting / Alchemy', 'An alchemist\'s apprentice can taste lies in a pill, and every elixir the sect sells has started tasting like one.', 'Bitter pills, bitter truths. I take mine with honey.', 'Mother of the Gentle Breeze', 'The Pill That Tastes of Lies', 'chinese'),
  spark('Crafting / Alchemy', 'A blacksmith forges swords that remember everyone they cut, and one of them refuses to forget the emperor.', 'Steel keeps grudges longer than men do.', 'Wandering Sword-Saint of Crimson River', 'The Sword That Remembers', 'chinese'),
  spark('Beast Taming', 'Every tamer bonds with a beast at birth. He bonded with a stray cat that may be the last dragon in disguise, or may just be a very rude cat.', 'Never ask a cat what it is. It will lie, and you will deserve it.', 'Guardian of the Red Hearth', 'The Very Rude Dragon', 'japanese'),
  spark('Beast Taming', 'A girl who can talk to monsters is hired to negotiate peace with a dungeon, and the dungeon wants a union.', 'Even the beasts are tired of working for free.', 'Jade Scholar of the Northern Star', 'The Dungeon Wants a Union', 'korean'),
  spark('Tower Climb', 'The Tower grants one wish at the top. The last climber wished the Tower would never stop growing, and now each floor is someone\'s abandoned life.', 'Careful what you wish for. Especially floors.', 'Ancestor of the Unfaded Ink', 'Floors of Abandoned Lives', 'korean'),
  spark('Tower Climb', 'A porter who has carried climbers to floor ninety-nine forty times finally goes up alone, and the Tower recognizes him.', 'The stairs always remember who carried the luggage.', 'Hermit of the Whispering Pines', 'The Porter of Floor Ninety-Nine', 'korean'),
  spark('Regression', 'She regresses every time she dies, but each time she wakes one day later, and she has six days left before the end of the world.', 'Time is a short candle. Hers is shorter. Light it carefully.', 'Sage of the Gushing Torrent', 'Six Days Until the End', 'korean'),
  spark('Regression', 'A villain regresses to childhood and tries to become a good person, but the hero who killed him also regressed, and doesn\'t believe him.', 'Second chances are crowded. Everyone wants one.', 'Sleepless Master of the Nine Tea Cups', 'Two Regressors, One Grudge', 'korean'),
  spark('Urban Cultivation', 'A delivery rider realizes his late-night route traces a forgotten formation across the city, and every package he drops off powers it a little more.', 'Five stars for the courier. The city owes him its soul.', 'Gluttonous Hermit of Blue-Wave Pier', 'The Midnight Courier Formation', 'chinese'),
  spark('Urban Cultivation', 'A ten-thousand-year-old immortal wakes up in a modern city with no Qi and must pass high school to get a hospital to check his meridians.', 'Even immortals fear algebra. I certainly do.', 'Arch-Elder of the Rejected Inkstone', 'The Immortal Who Failed Algebra', 'chinese'),
  spark('Apocalypse Cultivation', 'When the sky cracked, everyone got powers except her. Then the monsters started kneeling every time she walked by.', 'Some gifts arrive late and very loudly.', 'Drunken Quill Immortal', 'The Monsters Kneel to Her', 'korean'),
  spark('Apocalypse Cultivation', 'The last city survives because one librarian keeps reading aloud, and the creatures outside stop to listen.', 'A good story is a wall. A great one is a gate.', 'Old Auntie of the Peach Blossom Orchard', 'The Last Librarian Reads Aloud', 'chinese'),
  spark('Cosmic Cultivation', 'Stars are the corpses of ancient cultivators. A boy who swallows a falling one inherits a dead god\'s unfinished revenge.', 'Do not eat things that fall from the sky. I learned this twice.', 'Hermit of the Leaking Roof', 'The Swallowed Star', 'chinese'),
  spark('Cosmic Cultivation', 'Planets cultivate too. A girl living on one that is about to break through must survive its tribulation from the surface.', 'When the ground meditates, hold onto something.', 'Sentinel of the Quiet Valley', 'Tribulation From the Surface', 'chinese'),
  spark('Political Intrigue', 'The emperor dies at dinner and each of the nine princes is sure he did it, because each of them tried.', 'Too many cooks spoil the poison.', 'Fairy Chef of the Red Lotus Valley', 'Nine Princes, One Poison', 'chinese'),
  spark('Political Intrigue', 'A palace maid who can hear the last thought of anyone who dies becomes the only person who knows who really rules the empire.', 'The dead gossip. The living just don\'t listen.', 'Mother of the Gentle Breeze', 'The Last Thought of the Dead', 'chinese'),
  spark('Cozy Slice-of-Life', 'A retired demon lord opens a tea shop at the foot of the sect mountain, and the disciples keep coming back for advice they shouldn\'t need.', 'The best tea is brewed by someone who once burned a kingdom. Do not ask.', 'Guardian of the Red Hearth', 'The Demon Lord\'s Tea Shop', 'japanese'),
  spark('Cozy Slice-of-Life', 'An immortal\'s only goal is to grow the perfect cabbage, but every vegetable she plants accidentally becomes a spirit beast with opinions.', 'The cabbage is wiser than me. It knows when to stay quiet.', 'Old Taoist of the Drunken Clay Pot', 'The Perfect Cabbage', 'japanese'),
  spark('Mystery Cultivation', 'A sect elder is found dead inside a sealed formation only he could open, and the only witness is his sword, which won\'t stop lying.', 'Swords make terrible witnesses. Very pointed.', 'Jade Scholar of the Northern Star', 'The Sword That Won\'t Stop Lying', 'chinese'),
  spark('Mystery Cultivation', 'Disciples vanish once a year, and every time the sect\'s ancestral portrait has one more face in the crowd behind the founder.', 'Paintings are patient. Do not stand still too long.', 'Ancestor of the Unfaded Ink', 'One More Face in the Portrait', 'chinese'),
];

const INVENTED_GENRE_SPARKS: readonly HandSpark[] = [
  { genre: 'Weather Cultivation', genreNote: 'Cultivators bind storms, seasons and fog instead of Qi; a realm is measured by the sky above you.', premise: 'A farm girl bonds with a drizzle so small no sect wants it, but wherever she walks it never stops raining, and the drought kingdoms will go to war for her.', aside: 'Little rain, big trouble. The sky has a sense of humor.', voice: 'Free-Spirited Wanderer of Southern Reach', title: 'The Girl Who Brought the Rain', style: 'chinese' },
  { genre: 'Debt Cultivation', genreNote: 'Power is borrowed from Heaven at interest; the strongest cultivators are the most in debt.', premise: 'A boy inherits his grandfather\'s cultivation and his grandfather\'s debts, and Heaven\'s collectors want payment by spring.', aside: 'Heaven lends generously. Heaven also counts.', voice: 'Arch-Elder of the Rejected Inkstone', title: 'Heaven\'s Collectors', style: 'chinese' },
  { genre: 'Library Cultivation', genreNote: 'Books are living sects and readers rise by the stories they finish.', premise: 'A girl who has never finished a book is chosen by the oldest unfinished novel in the world, and the only way out is to write its ending.', aside: 'Every story wants an ending. Some want one very badly.', voice: 'Sleepless Master of the Nine Tea Cups', title: 'The Unfinished Novel', style: 'japanese' },
];

export const HAND_SPARKS: readonly StorySpark[] = [
  ...CHOSEN_GENRE_SPARKS.map(item => ({ ...item, inventedGenre: false, survival: false })),
  ...INVENTED_GENRE_SPARKS.map(item => ({ ...item, inventedGenre: true, survival: false })),
];

const pick = <T,>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)];

/**
 * A hand-written spark in the genre (any genre when absent, an invented one
 * when asked), not the one showing now. Asked for Fate Survival, it is planted
 * with Survival on.
 */
export const handSpark = (
  choice: { genre?: string; inventGenre?: boolean; survival?: boolean },
  current?: StorySpark,
  random: () => number = Math.random,
): StorySpark => {
  const pool = HAND_SPARKS.filter(item => choice.inventGenre ? item.inventedGenre
    : choice.genre ? !item.inventedGenre && item.genre === choice.genre : !item.inventedGenre);
  const fresh = pool.filter(item => item.premise !== current?.premise);
  const chosen = pick(fresh.length ? fresh : pool.length ? pool : HAND_SPARKS, random);
  return choice.survival ? { ...chosen, survival: true } : chosen;
};

import type { LoreCategory } from './loreCatalogue';

export const LORE_ENGLISH = {
  'qi-refining': ['Qi Refining', 'An early cultivation stage: a person learns to gather and use qi. Qi Condensation is a common rendering, but a novel can distinguish the two.'],
  'foundation-establishment': ['Foundation Establishment', 'A cultivator stabilizes the basis of their practice so they can develop further. It often follows Qi Refining; the requirements belong to the story.'],
  'golden-core': ['Golden Core', 'A concentrated inner core of cultivated power. Core Formation names the process or stage of forming it; the two labels are often used for the same realm.'],
  'nascent-soul': ['Nascent Soul', 'A cultivator develops a small spiritual self, often pictured as an infant. Some stories let it survive outside the body. Yuanying and Origin Infant name this same concept.'],
  'heavenly-tribulation': ['Heavenly Tribulation', 'A supernatural trial associated with a major advance in cultivation. Lightning is common, but the trial can take other forms. It is not itself a universal realm.'],
  ascension: ['Ascension', 'A cultivator passes into a higher state or world, often becoming an immortal. Stories differ about whether this ends the journey or begins another stage.'],
  qi: ['Qi', 'Vital energy in these fictional systems, used to train the body or perform extraordinary techniques. Chi is another spelling. Spiritual energy can mean a narrower kind of qi in a particular story.'],
  dantian: ['Dantian', 'An inner center where a practitioner gathers or refines energy, commonly described in the lower abdomen. Some traditions and stories describe more than one dantian.'],
  meridians: ['Meridians', 'Channels through which qi travels in the story’s model of the body. Blocked or damaged channels can limit training. These are not another name for blood vessels.'],
  'spiritual-root': ['Spiritual Root', 'An inborn aptitude or affinity for cultivation, often connected to elements. Its grades and limitations depend on the setting; it need not be a physical root.'],
  'internal-energy': ['Internal Energy', 'Power developed through disciplined internal training in martial fiction. Korean naegong and Chinese neigong also name the practice or skill; they do not simply mean all energy in the world.'],
  'qi-deviation': ['Qi Deviation', 'A dangerous failure of cultivation in which a practitioner loses control of their energy or mental state. The phrase can suggest going astray; literal demonic possession is not required.'],
  alchemy: ['Alchemy', 'The craft of refining ingredients into pills or elixirs in cultivation fiction. This usually means preparing substances; inner alchemy is a related but distinct practice.'],
  'spirit-pill': ['Spirit Pill', 'A refined preparation used for healing, training or other effects in a fantasy setting. Its quality, side effects and effectiveness are rules of the individual story.'],
  formation: ['Formation', 'An arrangement of symbols, objects or positions that produces a coordinated effect, such as a barrier or trap. Array is a common translation; some formations are battle arrangements.'],
  talisman: ['Talisman', 'An inscribed object that carries a ritual or magical effect. Fiction often uses paper charms, but the material, activation method and number of uses vary.'],
  dragon: ['Chinese Dragon', 'A powerful being associated with water, weather and authority in Chinese traditions. Fantasy authors adapt its shape and abilities; it need not resemble a winged, fire-breathing dragon.'],
  qilin: ['Qilin', 'An auspicious mythical creature often associated with benevolent rule. Chinese unicorn is a familiar translation, but its appearance and cultural meaning differ from a European unicorn.'],
  fenghuang: ['Fenghuang', 'An auspicious bird associated with harmony and virtue. It is often translated as phoenix, but rebirth from ashes is not automatically part of the Chinese creature’s tradition.'],
  'nine-tailed-fox': ['Nine-tailed Fox', 'A fox spirit with nine tails, whose powers and character depend on the tradition and story. Chinese huli jing, Japanese kitsune and Korean gumiho are related traditions, not interchangeable names.'],
  yao: ['Yao', 'A strange or transformed being, sometimes an animal or object that has gained supernatural abilities. Demon is a broad translation here; it does not always mean an evil being or a devil.'],
  dao: ['Dao', 'The Way: a path, principle or underlying order. Cultivation fiction often turns understanding a Dao into power. It is a different Chinese word from dāo, the saber.'],
  jianghu: ['Jianghu', 'Literally rivers and lakes; in martial fiction, the social world of wandering fighters, schools and rivalries. It describes a community and way of life, not just a geographical place.'],
  murim: ['Murim', 'The Korean term for the martial arts community, written 武林 in Hanja. Wulin is the Chinese reading. It overlaps with jianghu but is not the name of one universal fictional world.'],
  face: ['Face', 'A person’s social standing and the respect others show them. Saving face means avoiding humiliation; giving face means showing respect. The expression does not refer to someone’s physical face.'],
  'courting-death': ['Courting Death', 'A threat or accusation that someone is acting recklessly enough to get killed. The speaker is warning or intimidating them, not saying that they want to die.'],
  'frog-in-well': ['Frog in a Well', 'An insult for someone whose limited experience makes them underestimate the wider world. The frog is an image for a narrow viewpoint; the person is not being called an actual animal.'],
  xianxia: ['Xianxia', 'Chinese fantasy about the pursuit of immortality and extraordinary powers, often drawing on Daoist ideas. Immortal heroes is a literal gloss; cultivation systems differ between works.'],
  wuxia: ['Wuxia', 'Martial hero fiction centered on skilled fighters, loyalties and moral choices. Abilities may be extraordinary, but a progression toward immortality is not required.'],
  xuanhuan: ['Xuanhuan', 'A broad Chinese fantasy category that can mix traditions and invented power systems. It overlaps with xianxia, but does not require the same focus on Daoist immortality.'],
  'progression-fantasy': ['Progression Fantasy', 'Fantasy in which developing skills or power is a central, sustained part of the story. Cultivation can be one method; levels, game systems and Eastern settings are not required.'],
  jian: ['Jian', 'A straight, double-edged Chinese sword. The word names a weapon type, not a magical rank. It differs from the single-edged dao.'],
  'dao-saber': ['Dao (Saber)', 'A single-edged Chinese blade, often translated as saber or broadsword. Dāo (刀) is the weapon; dào (道) is the Way. Tone-free searches can mean either.'],
  'flying-sword': ['Flying Sword', 'A sword controlled at a distance, often through cultivated power. Some stories also let its owner ride it; flight does not imply one fixed weapon grade.'],
  'spiritual-treasure': ['Spiritual Treasure', 'A magical implement with special functions, such as attack, defense or transport. Fabao is a broad term; a novel may reserve Spiritual Treasure for a particular grade.'],
  'storage-ring': ['Storage Ring', 'A ring that holds objects in an extra space larger than the ring itself. Capacity, access and whether it can contain living things are determined by the story.'],
} as const;

export type LoreTermId = keyof typeof LORE_ENGLISH;
export type LoreTermCopy = Readonly<Record<LoreTermId, readonly [name: string, meaning: string]>>;

/** Direct, literal prose for the accessibility modes; keep every material qualification. */
export const LORE_ACCESSIBLE_ENGLISH: Readonly<Record<LoreTermId, string>> = {
  'qi-refining': 'At this early stage, a person learns to collect and use qi. Translators often call it Qi Condensation. Some stories make Qi Refining and Qi Condensation different stages.',
  'foundation-establishment': 'A cultivator builds a firm base for more training. This stage often comes after Qi Refining. Each story decides what the person must do to reach it.',
  'golden-core': 'A cultivator forms a core of power inside their body. Golden Core names the core. Core Formation names the act or stage of making it. Translations often use both names for the same stage.',
  'nascent-soul': 'A cultivator creates a small spirit that represents them. It often looks like a baby. Some stories let this spirit live outside the body. Yuanying and Origin Infant are other names for Nascent Soul.',
  'heavenly-tribulation': 'A cultivator faces a supernatural test when gaining great power. The test often involves lightning. It can take other forms. It is a test, rather than a fixed stage used by every story.',
  ascension: 'A cultivator moves to a higher state of being or another world. They often become an immortal. A story may end their journey here or begin a new part of it.',
  qi: 'Qi is the energy that people use to train their bodies and perform special techniques in these stories. Chi is another spelling. A story may use spiritual energy for only one kind of qi.',
  dantian: 'A dantian is a place inside the body where a person gathers or changes energy. Stories usually place it in the lower belly. Some stories and traditions describe several dantian.',
  meridians: 'Meridians are channels that carry qi through the body in a story. A blocked or damaged channel can stop a person from training well. Meridians are not the same as blood vessels.',
  'spiritual-root': 'A spiritual root is a natural ability to cultivate. It often links a person to an element. Each story sets its strengths and limits. It does not have to be a real root inside the body.',
  'internal-energy': 'Martial artists develop this power by training their bodies and minds. Korean naegong and Chinese neigong can also name the training or skill. These words do not mean every kind of energy.',
  'qi-deviation': 'A cultivator loses control of their energy or mental state during training. This can be dangerous. The name can mean that their practice has gone wrong. It does not require a demon to possess them.',
  alchemy: 'An alchemist makes pills or elixirs from ingredients in cultivation stories. This usually means working with substances. Inner alchemy is a related practice, but it is different.',
  'spirit-pill': 'A spirit pill is a preparation used to heal, train or produce other effects. Each story decides how well it works, its quality and its side effects.',
  formation: 'People arrange symbols, objects or positions to create an effect together. A formation might make a barrier or trap. Array is another translation. Some formations arrange fighters for battle.',
  talisman: 'A talisman is an object with writing or symbols that hold a ritual or magical effect. Stories often use paper charms. Each story decides its material, how to use it and how often it works.',
  dragon: 'Chinese traditions link this powerful being with water, weather and authority. Fantasy stories can change its shape and powers. It does not have to have wings or breathe fire.',
  qilin: 'A qilin is a mythical creature that brings good signs. It is often linked with a kind ruler. Chinese unicorn is a common translation. Its appearance and meaning differ from those of a European unicorn.',
  fenghuang: 'A fenghuang is a mythical bird linked with harmony and good character. Translators often call it a phoenix. That name does not mean it must die in fire and rise from ashes.',
  'nine-tailed-fox': 'This is a fox spirit with nine tails. Its powers and behavior change between stories and traditions. Chinese huli jing, Japanese kitsune and Korean gumiho are related traditions. They are not simply different names for the same being.',
  yao: 'A yao is a strange or changed being with supernatural powers. It can be an animal or an object. Demon is a common translation, but a yao does not have to be evil or be a devil.',
  dao: 'Dao means the Way. It can mean a path, principle or the order of things. In cultivation stories, understanding a Dao can give a person power. The word for a saber is a different Chinese word, dāo.',
  jianghu: 'The words mean rivers and lakes. In martial stories, they mean the society of traveling fighters, schools and rivals. Jianghu describes their community and way of life. It is more than a place on a map.',
  murim: 'Murim is the Korean name for the martial arts community. Its Hanja is 武林. In Chinese, this is read as wulin. Its meaning overlaps with jianghu. It does not name one world shared by all stories.',
  face: 'Face means the respect a person has in their community. Saving face means avoiding shame. Giving face means showing respect. Here, face does not mean the front of a person’s head.',
  'courting-death': 'A speaker uses this phrase to warn or threaten someone. It means that the person is acting so recklessly that they could be killed. It does not mean that the person wants to die.',
  'frog-in-well': 'This insult means that a person has seen too little of the world and thinks they know more than they do. The frog is a comparison. The speaker is not saying that the person is an animal.',
  xianxia: 'Xianxia is Chinese fantasy about seeking immortality and great powers. It often uses ideas from Daoism. Immortal heroes is a direct translation of the name. Each story can use a different cultivation system.',
  wuxia: 'Wuxia tells stories about skilled martial artists, their loyalties and their choices about right and wrong. Their abilities may go beyond normal human limits. They do not have to seek immortality.',
  xuanhuan: 'Xuanhuan is a broad kind of Chinese fantasy. It can mix traditions and invented systems of power. It overlaps with xianxia. It does not have to focus on Daoist ideas about immortality.',
  'progression-fantasy': 'Gaining skills or power is a main part of a progression fantasy story over time. Cultivation is one way to do this. The story does not need levels, game rules or an Eastern setting.',
  jian: 'A jian is a straight Chinese sword with two sharp edges. This is a type of weapon, not a level of magic. A dao has one sharp edge instead.',
  'dao-saber': 'A dao is a Chinese blade with one sharp edge. Translators often call it a saber or broadsword. Dāo, written 刀, is the blade. Dào, written 道, means the Way. A search without tone marks can find either word.',
  'flying-sword': 'A person controls this sword from a distance, often by using cultivated power. Some stories let the owner ride it. Being able to fly does not give a sword one fixed rank.',
  'spiritual-treasure': 'This is a magical object with a special use, such as attack, defense or travel. Fabao is a broad name for such objects. A story may use Spiritual Treasure for only one rank of object.',
  'storage-ring': 'A storage ring holds objects in a space larger than the ring itself. Each story decides how much it holds, who can open it and whether living things can stay inside.',
};

export const LORE_LABELS = {
  title: 'Eastern Fantasy Encyclopedia',
  intro: 'One reference for the words behind the worlds. Find a term by any of its names.',
  search: 'Search terms or aliases', all: 'All terms', directory: 'Encyclopedia', back: 'Back to Discover',
  language: 'Reading language', mode: 'Reading Mode', meaning: 'Meaning', context: 'In the genre',
  aliases: 'Also called', original: 'Original & pronunciation', related: 'See also', sources: 'Further reading',
  empty: 'No matching terms. Try another name or clear the category.', reset: 'Clear filters',
  missing: 'This term is not in the encyclopedia.',
  scope: 'A genre reference, separate from every story’s Codex. Names and rules can vary by author.',
  literal: 'The meaning below explains the expression directly, including any figurative language.',
  standard: 'Standard', clear: 'Clear Reading', easy: 'Easy Read', literalMode: 'Literal Reading',
  results: 'Terms found', browse: 'Browse the encyclopedia',
} as const;
export type LoreLabels = { readonly [K in keyof typeof LORE_LABELS]: string };

export const LORE_CATEGORY_COPY: Record<LoreCategory, readonly [string, string]> = {
  realms: ['Cultivation Realms', 'Realm order, sub-stages and powers belong to each story. Matching names do not guarantee matching strength.'],
  qi: ['Qi & Anatomy', 'These terms describe traditional concepts as adapted by fiction. A story can give its energy and body systems their own rules.'],
  crafts: ['Alchemy & Crafts', 'Recipes, grades and costs depend on the setting. The same translated name does not guarantee the same effect.'],
  beasts: ['Mythology & Beasts', 'Myths change across periods and regions. Related creatures from different traditions are not automatically the same being.'],
  culture: ['Idioms & Cultural Terms', 'An expression’s literal words may differ from its intended meaning. Read it in context; genre labels can overlap.'],
  weapons: ['Weapons & Relics', 'An object’s name describes its type or role. Its power, rank and restrictions are set by the author.'],
};

export interface LoreLocale {
  labels: LoreLabels;
  categories: Record<LoreCategory, readonly [string, string]>;
  terms: LoreTermCopy;
}

export const ENGLISH_LORE: LoreLocale = { labels: LORE_LABELS, categories: LORE_CATEGORY_COPY, terms: LORE_ENGLISH };

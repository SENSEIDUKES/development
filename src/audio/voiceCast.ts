/**
 * The SEIHouse voice cast: the character voices SENSEI made, as every part of
 * the app may know them. Each voice has a provider-neutral key; which
 * provider's voice answers a key, and its id there, stay on the server
 * (`src/server/audio/voiceCatalog.ts`, read from the same catalog, with a test
 * that keeps the two in step). A character's voice on its Codex card is one
 * of these keys, so any speech engine can voice it: the browser's own voices
 * today, a full text-to-speech provider as a premium option.
 */

export type VoiceCastGender = 'male' | 'female' | 'unisex';
/** How old a voice sounds, from its age range: young (to 18), adult, elder (from 50), ageless or unknown. */
export type VoiceCastAge = 'young' | 'adult' | 'elder' | 'ageless' | 'unknown';

export interface VoiceCastMember {
  /** Provider-neutral key, the catalog's internal key (`deriveInternalKey`). */
  key: string;
  archetype: string;
  gender: VoiceCastGender;
  age: VoiceCastAge;
  /** The age range the catalog gives, in its own words. */
  ageRange: string;
  /** The kinds of character it suits. */
  roles: readonly string[];
  description: string;
  /** Made for one kind of being (a dragon, a goblin, the System): chosen by hand, never given automatically. */
  fixed?: true;
  /** No provider voice exists for it yet. */
  recorded?: false;
}

export const SEIHOUSE_VOICE_CAST: readonly VoiceCastMember[] = [
  { key: "ancient-master-female", archetype: "Ancient Master", gender: 'female', age: 'ageless', ageRange: "Ageless",
    roles: ["Wise Oracle","Ethereal Spirit Guide","Regal Queen","Powerful Sorceress","Ancient Goddess"],
    description: "A deep, resonant, and calm female voice with a deliberate and measured delivery, conveying ancient wisdom, immense patience, and a mystical presence." },
  { key: "arrogant-young-master-male", archetype: "Arrogant Young Master", gender: 'male', age: 'adult', ageRange: "18-28",
    roles: ["Cunning Rival","Face Slapping","Arrogant Noble","Spoiled Heir","Wealthy Scion"],
    description: "A clear, mid-to-high pitched male voice with a smooth texture and a distinct hint of nasality. The delivery is articulate, deliberate, and theatrical, oozing with condescension, dismissiveness, and an air of entitled superiority." },
  { key: "bright-disciple-male", archetype: "Eager Young Disciple", gender: 'male', age: 'adult', ageRange: "18-28",
    roles: ["Curious Student","Young Adventurer","Inquisitive Scholar","Naive Apprentice","Comedic Sidekick"],
    description: "A clear, bright male voice with a mid-to-high pitch. It possesses a smooth texture and highly expressive delivery, effectively conveying youthful enthusiasm, curiosity, and sudden panic." },
  { key: "bright-heroine-female", archetype: "Bright Heroine", gender: 'female', age: 'adult', ageRange: "18-28",
    roles: ["Enthusiastic Apprentice","Young Mage","Supportive Friend","Female Adventurer","Naive Princess"],
    description: "A clear, bright, and articulate female voice with a warm, encouraging tone. It possesses a smooth, light texture, medium-high pitch, and an earnest, slightly formal yet friendly delivery, conveying optimism and support." },
  { key: "dark-sect-elder-male", archetype: "Sinister Cultivator", gender: 'male', age: 'elder', ageRange: "50-70",
    roles: ["Sophisticated Villain","Cunning Politician","Demonic Cultivator","Scheming Noble","Cunning Advisor"],
    description: "The voice is deep, smooth, and highly resonant, delivered with a deliberate, almost purring cadence. It carries a subtle, sophisticated menace and a confident, theatrical quality, hinting at intelligence and manipulation." },
  { key: "dragonkin-male", archetype: "Ancient Dragonkin", gender: 'male', age: 'ageless', ageRange: "Ancient (non-human)",
    roles: [],
    description: "A very deep, resonant, and heavily guttural voice with a distinct gravelly and raspy texture. The delivery is slow, deliberate, and powerful, conveying a formidable, ancient, and intimidating presence with a growling undertone that occasionally borders on a roar.",
    fixed: true },
  { key: "goblin-male", archetype: "Cunning Goblin", gender: 'male', age: 'unknown', ageRange: "Adult",
    roles: [],
    description: "A high-pitched, raspy, and gravelly voice with a pronounced nasal quality. The delivery is fast, chittering, and excitable, fluctuating in pitch to convey a sense of eagerness and sly cunning, often sounding sibilant.",
    fixed: true },
  { key: "merchant-male", archetype: "Persuasive Merchant", gender: 'male', age: 'adult', ageRange: "35-55",
    roles: ["Sophisticated Villain","Auctioneer","Master Alchemist","Prime Minister","Secret Villian"],
    description: "A smooth, articulate, and highly persuasive male voice with a warm, resonant quality and excellent control over pacing and intonation. It exudes charm and intellectual confidence while subtly hinting at deeper, potentially manipulative motives, making it very engaging." },
  { key: "mysterious-oracle-female", archetype: "Mysterious Oracle", gender: 'female', age: 'adult', ageRange: "35-65",
    roles: ["Enchantress","Mysterious Woman","Seductive Villainess","Succubus","Siren"],
    description: "A deep, resonant, and smoothly delivered female voice with an unhurried pace, conveying ancient wisdom, serene authority, and a touch of the mystical." },
  { key: "old-dragonkin-male", archetype: "Ancient Draconic Warlord", gender: 'male', age: 'ageless', ageRange: "Ancient",
    roles: [],
    description: "A profoundly deep, resonant, and gravelly male voice, delivered with deliberate, authoritative, and menacing confidence. It possesses a raw, ancient power and a distinctive leathery texture, hinting at a formidable, non-human speaker of immense age and reptilian origin.",
    fixed: true },
  { key: "old-grandmaster-male", archetype: "Wise Old Grandmaster", gender: 'male', age: 'elder', ageRange: "60-80",
    roles: ["Ancient Monk/Spiritual Guide","Elderly Wizard/Sorcerer","Sect Elder","Ancient Master","Wise Scholar"],
    description: "A deep, resonant, and smooth male voice with a calm and deliberate delivery, conveying wisdom and ancient knowledge. The tone is authoritative yet gentle." },
  { key: "prodigy-male", archetype: "Arrogant Prodigy", gender: 'male', age: 'adult', ageRange: "20-35",
    roles: ["Cunning Mage","Noble Antagonist","Intellectual Strategist","Rival Sect Disciple","Merciless Assassin"],
    description: "A clear, smooth male voice with a mid-low pitch, delivered with confident, measured articulation and a subtle undertone of arrogance, conveying authority and a controlled demeanor." },
  { key: "sect-matriarch-female", archetype: "Authoritative Matron", gender: 'female', age: 'adult', ageRange: "40-65",
    roles: ["Elder Sorceress","Sect Matriarch","Stern Grandmother","Regal Queen","Wise Ruler"],
    description: "A clear, resonant female voice with a lower-mid pitch and a measured, deliberate delivery. It conveys confidence, gravitas, and a calm, unwavering authority, with a slightly stern but controlled tone." },
  { key: "teacher-male", archetype: "Enthusiastic Scholar", gender: 'male', age: 'adult', ageRange: "35-55",
    roles: ["Eccentric Inventor","Arcane Wizard","Pill Master","Helpful Teacher","Wise Companion"],
    description: "A clear, articulate male voice with a mid-to-high pitch, characterized by an enthusiastic, inquisitive, and slightly theatrical delivery. The tone is warm and engaging, conveying a strong sense of intellectual curiosity and excitement." },
  { key: "the-system-unisex", archetype: "Omniscient AI", gender: 'unisex', age: 'unknown', ageRange: "Unknown",
    roles: [],
    description: "A synthesized voice with a consistent mid-low pitch, smooth and artificial texture, and a flat, emotionless delivery. It projects an authoritative and slightly unsettling calm, characteristic of an omnipresent digital entity or advanced AI.",
    fixed: true },
  { key: "voice-of-god-male", archetype: "Voice of God / Omniscient Narrator", gender: 'male', age: 'elder', ageRange: "50-70",
    roles: [],
    description: "A profoundly deep, resonant, and rich male voice with an unhurried, deliberate, and authoritative delivery. The tone is grave and commanding, possessing a smooth, full texture that conveys immense power and ageless wisdom, bordering on the ethereal.",
    fixed: true },
  { key: "war-veteran-male", archetype: "Gruff Drill Sergeant", gender: 'male', age: 'elder', ageRange: "50-70",
    roles: ["Seasoned Warrior","Tough Mentor","Experienced Storyteller","Hardened Detective","Rugged Cultivator"],
    description: "A deep, resonant, and gravelly voice with a stern and commanding delivery, conveying a sense of world-weary authority and unwavering toughness." },
  { key: "weathered-wanderer-male", archetype: "Weathered Wanderer", gender: 'male', age: 'elder', ageRange: "50-70",
    roles: ["Weary Traveler","Wise Mentor","Old Adventurer","Narrator","Gruff Shopkeeper"],
    description: "A deep, resonant male voice with a warm, slightly gravelly texture. Delivers lines with a deliberate, world-weary cadence, conveying a sense of experience and contemplative wisdom." },
  { key: "wise-sect-elder-male", archetype: "Wise Sect Elder", gender: 'male', age: 'elder', ageRange: "55-75",
    roles: ["Mystic Sage","Caring Mentor","Experienced Storyteller","Benevolent King/Leader","Clan Head"],
    description: "The voice is deep and warm, possessing a soothing yet authoritative presence. It carries a slight, pleasant gravelly texture that hints at age and experience, while maintaining a clear, gentle, and deliberate delivery." },
  { key: "young-disciple-male", archetype: "young disciple", gender: 'male', age: 'young', ageRange: "12-18",
    roles: ["Young aspiring hero","Student/Apprentice","Innocent villager","Little Brother","Young Prince"],
    description: "A clear, earnest, and somewhat breathy male voice with a mid-to-high pitch. It conveys a blend of youthful awe, humility, and growing determination, with a smooth and clean vocal texture." },
  { key: "powerful-spirit-female", archetype: "Ancient Ethereal Being", gender: 'female', age: 'adult', ageRange: "35-55",
    roles: ["Sorceress/Enchantress","Deity/Goddess","Ancient Queen/Empress","Artistic Spirit","Seductive Villainess"],
    description: "A deep, resonant, and velvety female voice with an ancient, ethereal quality. The delivery is deliberate, commanding, and subtly seductive, conveying immense power, wisdom, and a hint of menace." },
  { key: "sensei-pragmatic-narrator-male", archetype: "Pragmatic Narrator", gender: 'male', age: 'adult', ageRange: "25-40",
    roles: ["Unnammed Charecter","Storyteller","Announcer","Narrator","Guide"],
    description: "A clear, smooth, and mid-range male voice with a calm, articulate, and trustworthy delivery, suitable for conveying information or guiding listeners.",
    recorded: false },
  { key: "strict-sect-elder-male", archetype: "Strict Sect Elder", gender: 'male', age: 'elder', ageRange: "60-80",
    roles: ["Ancient Sorcerer","Wise Monk/Grandmaster","Sect Leader","Stern Mentor","Imperial Guard Captain"],
    description: "A deep, resonant male voice with a slightly gravelly texture and a slow, deliberate delivery, conveying stern authority, gravitas, and ancient wisdom." },
  { key: "bright-protagonist-male", archetype: "Diligent Researcher", gender: 'male', age: 'adult', ageRange: "28-38",
    roles: ["Junior Engineer","Energetic Explorer","Strategic Analyst","Apprentice Mage","Focused Protagonist"],
    description: "The voice is clear, articulate, and possesses a steady, mid-range pitch with a smooth, bright texture. The delivery is composed and focused, conveying a sense of intelligence, diligence, and calm competence." },
  { key: "bright-protagonist-female", archetype: "Encouraging mentor", gender: 'female', age: 'adult', ageRange: "25-35",
    roles: ["Wise young leader","Spiritual guide","Noble heroine","Kind healer","Pure-hearted noble"],
    description: "A clear, articulate, and warm female voice with a medium-high pitch and an encouraging, somewhat formal delivery, conveying wisdom and calm resolve." },
  { key: "dark-protagonist-female", archetype: "Disciplined Operative", gender: 'female', age: 'adult', ageRange: "30-45",
    roles: ["Ruthless Assassin","Strong Women","Cold-hearted Swordswoman","Jade Beauty","Calculated Antagonist"],
    description: "A smooth, low-mid pitched female voice with a highly controlled and deliberate delivery. The tone is firm, calm, and resolute, conveying a sense of unwavering discipline and authority. Articulation is precise and clear, with a steady, measured pace." },
  { key: "dark-protagonist-male", archetype: "Stoic Protagonist", gender: 'male', age: 'adult', ageRange: "28-45",
    roles: ["Seasoned Warrior","Philosophical Narrator","Cold-hearted Protagonist","Calculated Antagonist","Dark Fantasy MC"],
    description: "A deep, resonant male voice with a smooth yet grounded texture. The delivery is deliberate and controlled, conveying a sense of unwavering resolve and introspection. It possesses a slightly melancholic yet strong undertone, with clear articulation and a measured pace that lends gravity to each word." },
  { key: "demonic-warrior-male", archetype: "demonic warrior", gender: 'male', age: 'unknown', ageRange: "Unknown",
    roles: ["dark lord","evil entity","Dark Arts","intimidating warlord","Demon General"],
    description: "A deep, guttural, and gravelly voice with a menacing, commanding tone. The delivery is slow, deliberate, and theatrical, imbued with a powerful, sneering disdain and occasional heavy breathing, conveying immense power and a sadistic temperament." },
  { key: "jiangshi-unisex", archetype: "Ancient Jiangshi", gender: 'unisex', age: 'unknown', ageRange: "Unknown",
    roles: ["Ancient Golem","Ghoul","Ominous Spirit","Zombie","Cursed Puppet"],
    description: "A profoundly deep, resonant, and slow-spoken voice with a dry, almost gravelly texture, conveying an ancient, reanimated, and slightly ominous presence. The delivery is deliberate and effortful, suggesting a stiff or unnatural speaker." },
  { key: "young-cat-girl-female", archetype: "Energetic Young Cat Girl", gender: 'female', age: 'young', ageRange: "12-18",
    roles: ["Cute Beast Girl","Energetic Explorer","Fox Spirit","Enthusiastic Apprentice","Curious Companion"],
    description: "A high-pitched, energetic, and expressive female voice with a clear, bright tone and a hint of playful mischief. It carries a youthful enthusiasm, capable of conveying excitement, curiosity, and a touch of mock sternness with an animated delivery." },
  { key: "old-demonic-cultivator-male", archetype: "Aged Demonic Cultivator", gender: 'male', age: 'elder', ageRange: "60-90",
    roles: ["Dark Lord","Ancient Lich","Grizzled Pirate Captain","Sinister Wise Man","Orc Chieftain"],
    description: "A very deep, gravelly male voice with a pronounced, theatrical rasp. The delivery is slow, deliberate, and resonating, conveying an ancient, menacing, and powerful presence." },
];

export const castVoice = (key: string | undefined): VoiceCastMember | undefined =>
  key ? SEIHOUSE_VOICE_CAST.find(member => member.key === key) : undefined;

/** The voices a character may be given automatically: recorded, and not kept for one kind of being. */
export const CHARACTER_VOICE_CAST: readonly VoiceCastMember[] = SEIHOUSE_VOICE_CAST.filter(member => member.recorded !== false && !member.fixed);

/** FNV-1a: the same seed always lands on the same voice. */
const hash = (seed: string) => {
  let value = 0x811c9dc5;
  for (const character of seed) value = Math.imul(value ^ character.codePointAt(0)!, 0x01000193) >>> 0;
  return value;
};

/**
 * A character's first voice, chosen by code when they first speak, so every
 * speaker sounds like someone before anyone picks: one of the given gender
 * when it is known, a protagonist's voice for the main character, and one no
 * other character of the story has while any is left. The same seed (the
 * character's Codex entry id) always gives the same voice. The reader can
 * change it on the character's Codex card.
 */
export function chooseCastVoice({ seed, gender, mainCharacter = false, taken = [] }: {
  seed: string;
  gender?: Exclude<VoiceCastGender, 'unisex'>;
  mainCharacter?: boolean;
  /** Voices other characters of the story already have. */
  taken?: readonly string[];
}): string {
  const ofGender = gender ? CHARACTER_VOICE_CAST.filter(member => member.gender === gender) : CHARACTER_VOICE_CAST.filter(member => member.gender !== 'unisex');
  const suited = mainCharacter ? ofGender.filter(member => member.key.includes('protagonist')) : ofGender;
  const pool = suited.length ? suited : ofGender;
  const free = pool.filter(member => !taken.includes(member.key));
  const choices = free.length ? free : pool;
  return choices[hash(seed) % choices.length].key;
}

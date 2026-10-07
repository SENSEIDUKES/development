export type VoiceGender = "male" | "female";
export type VoiceAccent = "american" | "british" | "hindi" | "spanish";
export type VoiceAge = "child" | "young" | "middle" | "older";

export type VoiceCategory =
  | "narrator"
  | "main_character"
  | "friend"
  | "love_interest"
  | "romance"
  | "sect_leader"
  | "clan_head"
  | "father"
  | "teacher"
  | "mentor"
  | "mother"
  | "villain"
  | "rival"
  | "face_slap"
  | "princess"
  | "queen"
  | "evil_queen"
  | "merchant"
  | "younger_sister"
  | "little_girl"
  | "old_man"
  | "fallback";

export type KokoroVoicePreset = {
  id: string;
  provider: "kokoro";
  providerVoiceId: string;
  displayName: string;
  language: "en" | "es";
  accent: VoiceAccent;
  gender: VoiceGender;
  age: VoiceAge;
  categories: VoiceCategory[];
  description: string;
  priority?: number;
};

export const KOKORO_VOICE_PRESETS: KokoroVoicePreset[] = [
  {
    id: "en_male_older_authority_1",
    provider: "kokoro",
    providerVoiceId: "am_michael",
    displayName: "Iron Sect Patriarch",
    language: "en",
    accent: "american",
    gender: "male",
    age: "older",
    categories: ["sect_leader", "clan_head", "father", "teacher"],
    description: "Older authority male for sect leaders, clan heads, fathers, and hard authority figures.",
    priority: 90,
  },
  {
    id: "en_male_young_friend_1",
    provider: "kokoro",
    providerVoiceId: "am_fenrir",
    displayName: "Loyal Young Disciple",
    language: "en",
    accent: "american",
    gender: "male",
    age: "young",
    categories: ["friend", "fallback"],
    description: "Youthful male for loyal companions and main-character friends.",
    priority: 70,
  },
  {
    id: "en_male_young_mc_1",
    provider: "kokoro",
    providerVoiceId: "am_puck",
    displayName: "Wandering Main Disciple",
    language: "en",
    accent: "american",
    gender: "male",
    age: "young",
    categories: ["main_character"],
    description: "Youthful male lead voice for main characters and energetic protagonists.",
    priority: 95,
  },
  {
    id: "en_male_middle_villain_1",
    provider: "kokoro",
    providerVoiceId: "am_onyx",
    displayName: "Black-Iron Villain",
    language: "en",
    accent: "american",
    gender: "male",
    age: "middle",
    categories: ["villain"],
    description: "Middle-aged male villain voice for overseers, cruel soldiers, and demonic authority figures.",
    priority: 95,
  },
  {
    id: "en_male_young_faceslap_1",
    provider: "kokoro",
    providerVoiceId: "am_adam",
    displayName: "Arrogant Young Master",
    language: "en",
    accent: "american",
    gender: "male",
    age: "young",
    categories: ["face_slap", "rival"],
    description: "Cocky young male for face-slap targets and arrogant young masters.",
    priority: 80,
  },
  {
    id: "en_male_young_faceslap_2",
    provider: "kokoro",
    providerVoiceId: "am_echo",
    displayName: "Echoing Sect Brat",
    language: "en",
    accent: "american",
    gender: "male",
    age: "young",
    categories: ["face_slap", "rival"],
    description: "Second cocky young male for rotating face-slap targets and smug disciples.",
    priority: 75,
  },
  {
    id: "en_female_young_friend_1",
    provider: "kokoro",
    providerVoiceId: "af_jessica",
    displayName: "Bright Lotus Friend",
    language: "en",
    accent: "american",
    gender: "female",
    age: "young",
    categories: ["friend", "love_interest", "fallback"],
    description: "Youthful female companion voice for friends and light romantic roles.",
    priority: 75,
  },
  {
    id: "en_female_young_romance_1",
    provider: "kokoro",
    providerVoiceId: "af_heart",
    displayName: "Heart Lotus Voice",
    language: "en",
    accent: "american",
    gender: "female",
    age: "young",
    categories: ["main_character", "romance", "love_interest"],
    description: "Warm youthful female voice for romance leads and main female characters.",
    priority: 95,
  },
  {
    id: "en_female_middle_teacher_1",
    provider: "kokoro",
    providerVoiceId: "af_kore",
    displayName: "Crimson Matriarch",
    language: "en",
    accent: "american",
    gender: "female",
    age: "middle",
    categories: ["mother", "teacher", "mentor"],
    description: "Middle-aged female authority voice for mothers, teachers, and mature mentors.",
    priority: 85,
  },
  {
    id: "en_female_young_faceslap_1",
    provider: "kokoro",
    providerVoiceId: "af_aoede",
    displayName: "Jade Thorn Heiress",
    language: "en",
    accent: "american",
    gender: "female",
    age: "young",
    categories: ["face_slap", "rival"],
    description: "Young female face-slap voice for jealous rivals and arrogant heiresses.",
    priority: 80,
  },
  {
    id: "en_male_middle_mentor_2",
    provider: "kokoro",
    providerVoiceId: "bm_daniel",
    displayName: "Cloud-Road Mentor",
    language: "en",
    accent: "british",
    gender: "male",
    age: "middle",
    categories: ["teacher", "mentor", "friend"],
    description: "Middle-aged mentor voice for teachers, older brothers, and guides.",
    priority: 85,
  },
  {
    id: "en_male_older_narrator_1",
    provider: "kokoro",
    providerVoiceId: "bm_lewis",
    displayName: "Elder Tome Narrator",
    language: "en",
    accent: "british",
    gender: "male",
    age: "older",
    categories: ["narrator", "fallback"],
    description: "Main third-person narrator voice.",
    priority: 100,
  },
  {
    id: "en_male_young_rival_1",
    provider: "kokoro",
    providerVoiceId: "bm_fable",
    displayName: "Fable-Tongued Rival",
    language: "en",
    accent: "british",
    gender: "male",
    age: "young",
    categories: ["rival", "face_slap"],
    description: "Young male rival voice for clever rivals and dramatic challengers.",
    priority: 80,
  },
  {
    id: "en_female_young_royal_1",
    provider: "kokoro",
    providerVoiceId: "bf_emma",
    displayName: "Moonlit Princess",
    language: "en",
    accent: "british",
    gender: "female",
    age: "young",
    categories: ["princess", "queen", "love_interest"],
    description: "Elegant female voice for princesses, young queens, noblewomen, and refined love interests.",
    priority: 80,
  },
  {
    id: "en_female_older_evilqueen_1",
    provider: "kokoro",
    providerVoiceId: "bf_alice",
    displayName: "Bitter Sect Queen",
    language: "en",
    accent: "british",
    gender: "female",
    age: "older",
    categories: ["evil_queen", "queen", "face_slap", "villain"],
    description: "Older female antagonist voice for bitter sect wives, evil queens, and face-slap matriarchs.",
    priority: 85,
  },
  {
    id: "en_female_young_expressive_special_1",
    provider: "kokoro",
    providerVoiceId: "hf_alpha",
    displayName: "Little Spirit Sister",
    language: "en",
    accent: "hindi",
    gender: "female",
    age: "child",
    categories: ["younger_sister", "little_girl", "friend"],
    description: "Expressive young specialty voice for younger sisters, little girls, and innocent side characters.",
    priority: 65,
  },
  {
    id: "en_male_middle_merchant_special_1",
    provider: "kokoro",
    providerVoiceId: "hm_psi",
    displayName: "Laughing Market Uncle",
    language: "en",
    accent: "hindi",
    gender: "male",
    age: "middle",
    categories: ["merchant", "teacher", "friend"],
    description: "Specialty middle-aged male voice for merchants, comic teachers, and colorful side characters.",
    priority: 65,
  },
  {
    id: "es_male_young_1",
    provider: "kokoro",
    providerVoiceId: "em_alex",
    displayName: "Joven Discípulo",
    language: "es",
    accent: "spanish",
    gender: "male",
    age: "young",
    categories: ["main_character", "friend", "fallback"],
    description: "Spanish young male voice.",
    priority: 80,
  },
  {
    id: "es_male_old_1",
    provider: "kokoro",
    providerVoiceId: "em_santa",
    displayName: "Anciano Maestro",
    language: "es",
    accent: "spanish",
    gender: "male",
    age: "older",
    categories: ["old_man", "sect_leader", "teacher", "mentor", "narrator"],
    description: "Spanish older male voice for elders, masters, and narration fallback.",
    priority: 85,
  },
  {
    id: "es_female_young_1",
    provider: "kokoro",
    providerVoiceId: "ef_dora",
    displayName: "Voz de Loto",
    language: "es",
    accent: "spanish",
    gender: "female",
    age: "young",
    categories: ["main_character", "friend", "love_interest", "fallback"],
    description: "Spanish young female voice.",
    priority: 80,
  },
];

export const KOKORO_VOICE_PRESET_BY_ID = Object.fromEntries(
  KOKORO_VOICE_PRESETS.map((preset) => [preset.id, preset])
);

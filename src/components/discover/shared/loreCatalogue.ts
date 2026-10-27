/** SEIHouse's genre reference. These are editorial identities, never story Codex records. */
export const LORE_CATEGORIES = ['realms', 'qi', 'crafts', 'beasts', 'culture', 'weapons'] as const;
export type LoreCategory = typeof LORE_CATEGORIES[number];

export interface LoreTerm {
  id: string;
  category: LoreCategory;
  name: string;
  script: string;
  pronunciation: string;
  originalLanguage: 'zh-CN' | 'ko' | 'en';
  aliases: readonly string[];
  /** Related concepts are links, not aliases: sharing a translation does not make terms identical. */
  related: readonly string[];
  dictionary: string;
}

const DICTIONARY_TERMS: Record<string, string> = {
  jianghu: '江湖', murim: '무림', face: '面子', 'courting-death': '找死', 'frog-in-well': '井底之蛙', qilin: '麒麟', fenghuang: '鳳凰',
};
const term = (id: string, category: LoreCategory, name: string, script: string, pronunciation: string,
  aliases: string[], related: string[], dictionary = '', originalLanguage: LoreTerm['originalLanguage'] = 'zh-CN'): LoreTerm =>
  ({ id, category, name, script, pronunciation, aliases, related, dictionary: DICTIONARY_TERMS[id] ?? dictionary, originalLanguage });

/** No universal realm ladder is implied. Each novel decides its order and powers. */
export const LORE_TERMS: readonly LoreTerm[] = [
  term('qi-refining', 'realms', 'Qi Refining', '炼气', 'liàn qì', ['煉氣', 'Lianqi', 'Qi Refinement', 'Qi Condensation', 'Qi Gathering'], ['qi', 'foundation-establishment']),
  term('foundation-establishment', 'realms', 'Foundation Establishment', '筑基', 'zhù jī', ['築基', 'Zhuji', 'Foundation Building', 'Building the Foundation'], ['qi-refining', 'golden-core']),
  term('golden-core', 'realms', 'Golden Core', '金丹', 'jīn dān', ['Jindan', 'Golden Elixir', 'Core Formation', 'Core Condensation'], ['foundation-establishment', 'nascent-soul', 'alchemy']),
  term('nascent-soul', 'realms', 'Nascent Soul', '元婴', 'yuán yīng', ['元嬰', 'Yuanying', 'Yuan Ying', 'Origin Infant', 'Primordial Infant', 'Nascent Spirit', 'Nguyên Anh'], ['golden-core', 'ascension']),
  term('heavenly-tribulation', 'realms', 'Heavenly Tribulation', '天劫', 'tiān jié', ['Tianjie', 'Heaven Tribulation', 'Celestial Tribulation', 'Lightning Tribulation'], ['ascension', 'qi-refining']),
  term('ascension', 'realms', 'Ascension', '飞升', 'fēi shēng', ['飛升', 'Feisheng', 'Immortal Ascension', 'Ascending to Immortality'], ['heavenly-tribulation', 'nascent-soul']),
  term('qi', 'qi', 'Qi', '气', 'qì', ['氣', 'Chi', 'Ch’i', 'Ki', 'Vital Energy', 'Spiritual Energy', 'Khí'], ['dantian', 'meridians', 'internal-energy']),
  term('dantian', 'qi', 'Dantian', '丹田', 'dān tián', ['Dan Tian', 'Elixir Field', 'Cinnabar Field', 'Energy Center', '단전', 'Danjeon', 'Đan điền'], ['qi', 'meridians']),
  term('meridians', 'qi', 'Meridians', '经脉', 'jīng mài', ['經脈', 'Jingmai', 'Energy Channels', 'Qi Channels', 'Kinh mạch'], ['qi', 'dantian', 'qi-deviation']),
  term('spiritual-root', 'qi', 'Spiritual Root', '灵根', 'líng gēn', ['靈根', 'Linggen', 'Spirit Root', 'Spiritual Roots', 'Linh căn'], ['qi-refining', 'qi']),
  term('internal-energy', 'qi', 'Internal Energy', '내공', 'naegong', ['內功', '내력', 'Naegong', 'Nae Gong', 'Inner Power', 'Neigong', '内功'], ['qi', 'murim'], '내공', 'ko'),
  term('qi-deviation', 'qi', 'Qi Deviation', '走火入魔', 'zǒu huǒ rù mó', ['Zouhuorumo', 'Cultivation Deviation', 'Cultivation Backlash', 'Qigong Deviation'], ['meridians', 'internal-energy']),
  term('alchemy', 'crafts', 'Alchemy', '炼丹', 'liàn dān', ['煉丹', 'Liandan', 'Pill Refining', 'Pill Concoction', 'Elixir Refining'], ['spirit-pill', 'golden-core']),
  term('spirit-pill', 'crafts', 'Spirit Pill', '丹药', 'dān yào', ['丹藥', 'Danyao', 'Medicinal Pill', 'Cultivation Pill', 'Elixir Pill'], ['alchemy', 'qi']),
  term('formation', 'crafts', 'Formation', '阵法', 'zhèn fǎ', ['陣法', 'Zhenfa', 'Array', 'Spell Formation', 'Magic Array'], ['talisman', 'spiritual-treasure']),
  term('talisman', 'crafts', 'Talisman', '符箓', 'fú lù', ['符籙', 'Fulu', 'Charm', 'Spell Talisman', 'Paper Talisman'], ['formation', 'alchemy']),
  term('dragon', 'beasts', 'Chinese Dragon', '龙', 'lóng', ['龍', 'Long', 'Loong', 'Lung', 'Eastern Dragon'], ['qilin', 'fenghuang']),
  term('qilin', 'beasts', 'Qilin', '麒麟', 'qí lín', ['Kylin', 'Kirin', 'Chinese Unicorn'], ['dragon', 'fenghuang']),
  term('fenghuang', 'beasts', 'Fenghuang', '凤凰', 'fèng huáng', ['鳳凰', 'Feng Huang', 'Chinese Phoenix', 'Phoenix'], ['qilin', 'dragon']),
  term('nine-tailed-fox', 'beasts', 'Nine-tailed Fox', '九尾狐', 'jiǔ wěi hú', ['Jiuweihu', 'Nine Tailed Fox', 'Nine-tail Fox'], ['yao', 'fenghuang']),
  term('yao', 'beasts', 'Yao', '妖', 'yāo', ['Yaoguai', '妖怪', 'Demon Beast', 'Monster Spirit', 'Demonic Creature'], ['nine-tailed-fox', 'qi']),
  term('dao', 'culture', 'Dao', '道', 'dào', ['Tao', 'The Way', 'Great Dao', 'Great Way'], ['xianxia', 'qi']),
  term('jianghu', 'culture', 'Jianghu', '江湖', 'jiāng hú', ['Jiang Hu', 'Rivers and Lakes', 'Martial World'], ['murim', 'wuxia']),
  term('murim', 'culture', 'Murim', '무림', 'murim', ['武林', 'Mu Rim', 'Martial Forest', 'Wulin', 'Martial Arts Community'], ['jianghu', 'internal-energy'], '무림', 'ko'),
  term('face', 'culture', 'Face', '面子', 'miàn zi', ['Mianzi', 'Saving Face', 'Losing Face', 'Giving Face'], ['jianghu', 'courting-death']),
  term('courting-death', 'culture', 'Courting Death', '找死', 'zhǎo sǐ', ['Zhaosi', 'Seeking Death', 'Looking for Death', 'You Are Courting Death'], ['face', 'frog-in-well']),
  term('frog-in-well', 'culture', 'Frog in a Well', '井底之蛙', 'jǐng dǐ zhī wā', ['Jingdizhiwa', 'Frog at the Bottom of a Well', 'Well Frog'], ['courting-death', 'jianghu']),
  term('xianxia', 'culture', 'Xianxia', '仙侠', 'xiān xiá', ['仙俠', 'Xian Xia', 'Immortal Heroes', 'Immortal Hero Fantasy'], ['wuxia', 'xuanhuan', 'ascension']),
  term('wuxia', 'culture', 'Wuxia', '武侠', 'wǔ xiá', ['武俠', 'Wu Xia', 'Martial Heroes', 'Martial Hero Fiction'], ['jianghu', 'xianxia', 'murim']),
  term('xuanhuan', 'culture', 'Xuanhuan', '玄幻', 'xuán huàn', ['Xuan Huan', 'Mysterious Fantasy', 'Chinese Fantasy'], ['xianxia', 'wuxia']),
  term('progression-fantasy', 'culture', 'Progression Fantasy', 'Progression fantasy', 'prəˈɡrɛʃən ˈfæntəsi', ['Power Progression', 'Cultivation Fantasy'], ['xianxia', 'qi-refining'], '', 'en'),
  term('jian', 'weapons', 'Jian', '剑', 'jiàn', ['劍', 'Straight Sword', 'Double-edged Sword'], ['dao-saber', 'flying-sword']),
  term('dao-saber', 'weapons', 'Dao (Saber)', '刀', 'dāo', ['Saber', 'Sabre', 'Broadsword', 'Single-edged Sword'], ['jian', 'dao']),
  term('flying-sword', 'weapons', 'Flying Sword', '飞剑', 'fēi jiàn', ['飛劍', 'Feijian', 'Immortal Flying Sword'], ['jian', 'spiritual-treasure']),
  term('spiritual-treasure', 'weapons', 'Spiritual Treasure', '法宝', 'fǎ bǎo', ['法寶', 'Fabao', 'Magic Treasure', 'Magical Treasure', 'Dharma Treasure', 'Magic Artifact'], ['flying-sword', 'storage-ring']),
  term('storage-ring', 'weapons', 'Storage Ring', '储物戒', 'chǔ wù jiè', ['儲物戒', 'Chuwujie', 'Spatial Ring', 'Space Ring', 'Interspatial Ring', 'Dimensional Ring'], ['spiritual-treasure', 'formation']),
];

export const findLoreTerm = (id: string) => LORE_TERMS.find(entry => entry.id === id);
export const isLoreCategory = (value: unknown): value is LoreCategory => LORE_CATEGORIES.includes(value as LoreCategory);

/** Strip tones and spacing, retain all scripts. NFKD also handles full-width input and decomposed Hangul. */
export const normalizeLoreSearch = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export interface LoreTranslation { name: string; meaning: string }
export type LoreTranslations = Readonly<Record<string, LoreTranslation>>;

/** Exact names/aliases first. Short queries must not match incidental prose across the entire directory. */
export function searchLore(query: string, category?: LoreCategory, translations?: LoreTranslations) {
  const key = normalizeLoreSearch(query);
  return LORE_TERMS.flatMap(entry => {
    if (category && entry.category !== category) return [];
    const names = [entry.name, entry.script, entry.pronunciation, ...entry.aliases, translations?.[entry.id]?.name ?? ''];
    const normalized = names.map(normalizeLoreSearch);
    const exact = key && normalized.some(name => name === key);
    const matches = !key || exact || normalized.some(name => name.includes(key));
    return matches ? [{ entry, rank: exact ? 0 : 1 }] : [];
  }).sort((a, b) => a.rank - b.rank || a.entry.name.localeCompare(b.entry.name, 'en')).map(result => result.entry);
}

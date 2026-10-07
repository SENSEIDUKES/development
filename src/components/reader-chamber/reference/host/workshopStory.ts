/**
 * The Workshop's sample story for the production Reader snapshot.
 *
 * Written in production's own data shapes (`Story`, `ChapterContent`,
 * `LoreGlossary` from the copied `types.ts`), so every surface of the copied
 * Reader runs on data it already understands. As in production, the story
 * carries chapter scaffolds and the chapter bodies live separately, loaded
 * through `storyStorage.getChapterContent`. Images are Workshop files under
 * /public; nothing here is anyone's real story.
 *
 * The six chapters each exercise a different part of the Reader:
 *  1. Structured blocks: reveals, a World Card, a breakthrough and an
 *     appraisal System panel, sound tags, music and atmosphere cues, soft
 *     continuity notes and the Context Inspector manifest.
 *  2. A creature World Card, a quest panel, a Fate Result card and the
 *     chapter's stats change line.
 *  3. Dialogue with speakers, warning and karmic-bond panels, and the replay
 *     note production's continuity guard writes.
 *  4. A legacy prose chapter (no blocks) with bracketed system lines and hard
 *     continuity warnings.
 *  5. A sealed death-flag chapter, which turns the chamber menacing.
 *  6. An unwritten chapter.
 */
import type {
  Bookmark,
  ChapterContent,
  Character,
  ContextManifest,
  LoreGlossary,
  Story,
  StoryBlock,
} from '../light-novels/src/types';

export const WORKSHOP_STORY_ID = 'story-5f0c6a2e-9b1d-4c3a-8e7f-2a6b9c1d4e80';
const STORY_UUID = '5f0c6a2e-9b1d-4c3a-8e7f-2a6b9c1d4e80';

export const WORKSHOP_ARC_TITLE = 'Volume I: The Ember Oath';

const id = {
  liWei: '7c1e2b3a-4d5f-4a6b-8c7d-9e0f1a2b3c4d',
  meiLin: '8d2f3c4b-5e6a-4b7c-9d8e-0f1a2b3c4d5e',
  elderKang: '9e3a4d5c-6f7b-4c8d-8e9f-1a2b3c4d5e6f',
  fox: 'a04b5e6d-7a8c-4d9e-9f0a-2b3c4d5e6f70',
  sect: 'b15c6f7e-8b9d-4e0f-8a1b-3c4d5e6f7081',
  pavilion: 'c26d7a8f-9c0e-4f1a-9b2c-4d5e6f708192',
  gate: 'd37e8b9a-0d1f-4a2b-8c3d-5e6f708192a3',
  valley: 'e48f9cab-1e2a-4b3c-9d4e-6f708192a3b4',
  ring: 'f59a0dbc-2f3b-4c4d-8e5f-708192a3b4c5',
  sword: '06ab1ecd-3a4c-4d5e-9f6a-8192a3b4c5d6',
  emberOath: '17bc2fde-4b5d-4e6f-8a7b-92a3b4c5d6e7',
};

/** Production's editorial manifestation signals, as its metadata pass writes them. */
const CENTRAL = { narrativeWeight: 'central', namedStatus: true, recurrence: true, plotRelevance: true, futureRelevance: true } as const;
const MAJOR = { narrativeWeight: 'major', namedStatus: true, recurrence: true, plotRelevance: true } as const;
const SUPPORTING = { narrativeWeight: 'supporting', namedStatus: true, recurrence: true } as const;

const at = (daysAgo: number, hour = 21) => {
  const date = new Date(Date.UTC(2026, 8, 30 - daysAgo, hour, 0, 0));
  return date.toISOString();
};

const characters: Character[] = [
  {
    id: id.liWei,
    persistenceId: id.liWei,
    name: 'Li Wei',
    aliases: ['the Ember Oathbearer'],
    role: 'Protagonist · Outer Disciple',
    description: 'A disgraced outer disciple of the Ninth Meridian Sect who swore the forbidden Oath of Embers to reopen his sealed meridian.',
    relationshipToMC: 'protagonist',
    status: 'alive',
    powerLevel: 'Qi Condensation — Layer 9',
    faction: 'Ninth Meridian Sect',
    abilities: ['Ember Oath Technique', 'Ninth Meridian Sight'],
    imageUrl: '/card-workshop/test-images/ye_chen_portrait.png',
    signatureQuote: 'If the gate will not open, I will become the key.',
    firstAppeared: 1,
    lastMajorInvolvement: 5,
    manifestationImportance: CENTRAL,
  },
  {
    id: id.meiLin,
    persistenceId: id.meiLin,
    name: 'Mei Lin',
    role: 'Sword of the Outer Court',
    description: 'A blunt swordswoman who guards the outer court and keeps choosing Li Wei over the sect’s orders.',
    relationshipToMC: 'friend',
    status: 'alive',
    powerLevel: 'Qi Condensation — Layer 7',
    faction: 'Ninth Meridian Sect',
    imageUrl: '/card-workshop/test-images/lyra_meadowlight_portrait.png',
    signatureQuote: 'If you mean to die tonight, at least die facing the right direction.',
    firstAppeared: 1,
    lastMajorInvolvement: 3,
    manifestationImportance: MAJOR,
  },
  {
    id: id.elderKang,
    persistenceId: id.elderKang,
    name: 'Elder Kang',
    role: 'Discipline Hall Elder',
    description: 'The elder who sealed Li Wei’s meridian and now hunts the oath that undid his work.',
    relationshipToMC: 'enemy',
    status: 'alive',
    powerLevel: 'Foundation Establishment — Peak',
    faction: 'Ashen Pavilion',
    // No portrait yet: his reveal card offers production's Manifest button.
    signatureQuote: 'A sealed door is a mercy. You have refused mercy.',
    firstAppeared: 1,
    lastMajorInvolvement: 5,
    manifestationImportance: { ...MAJOR, emotionalSignificance: true, powerSignificance: true },
  },
  {
    id: id.fox,
    persistenceId: id.fox,
    name: 'Vermilion Debt Fox',
    role: 'Spirit Beast',
    description: 'A fox spirit that keeps every debt it is owed in the embers of its tails.',
    relationshipToMC: 'unknown',
    status: 'alive',
    isBeast: true,
    beastProfile: { size: 'medium', bodyType: 'spirit', element: 'fire', movement: 'teleporting', intelligence: 'cunning', threatTier: 'elite', signatureSound: 'screech' },
    imageUrl: '/familiars/nine-tailed-fox/neutral.png',
    firstAppeared: 2,
    manifestationImportance: SUPPORTING,
  },
];

const memory: Story['memory'] = {
  powerSystem: 'Qi Condensation (nine layers) → Foundation Establishment → Core Formation. Oaths sworn at a meridian gate trade a permanent cost for a sealed path.',
  currentPowerStage: 'Qi Condensation — Layer 9',
  worldRules: [
    'An oath sworn at a meridian gate cannot be withdrawn, only paid.',
    'Sealed meridians answer only to the hand that sealed them, or to an oath.',
  ],
  characters,
  unresolvedPlotThreads: [
    { id: 'thread-ember-toll', description: 'The Oath of Embers will demand its toll before the Ninth Door opens.', status: 'active', originChapter: 1 },
    { id: 'thread-fox-debt', description: 'Li Wei owes the Vermilion Debt Fox one life, to be named later.', status: 'active', originChapter: 2 },
  ],
  resolvedPlotThreads: [
    { id: 'thread-sealed-meridian', description: 'Li Wei’s sealed meridian is reopened.', status: 'resolved', originChapter: 1 },
  ],
  factions: [
    { id: id.sect, persistenceId: id.sect, name: 'Ninth Meridian Sect', description: 'A declining righteous sect built around a gate no one has opened in three hundred years.', alignment: 'Righteous', headquarters: 'Collapsed Gate of the Ninth Meridian', status: 'Fractured' },
    { id: id.pavilion, persistenceId: id.pavilion, name: 'Ashen Pavilion', description: 'The Discipline Hall’s inner circle, who keep the sect’s seals and its secrets.', alignment: 'Mysterious', status: 'Active' },
  ],
  locations: [
    { id: id.gate, persistenceId: id.gate, name: 'Collapsed Gate of the Ninth Meridian', description: 'A broken stone gate that weeps rust-red rain whenever an oath is sworn beneath it.', realm: 'Mortal Realm', safetyLevel: 'Dangerous', imageUrl: '/manifest-backdrops/immortal-land-3.jpg', manifestationImportance: MAJOR },
    { id: id.valley, persistenceId: id.valley, name: 'Ember Valley', description: 'A valley of warm ash where spirit beasts come to collect what they are owed.', realm: 'Mortal Realm', safetyLevel: 'Lethal', imageUrl: '/manifest-backdrops/immortal-land-5.jpg' },
  ],
  artifacts: [
    { id: id.ring, persistenceId: id.ring, name: 'The Azure Ring', description: 'A ring that chimes awake when a debt is about to be called in.', tier: 'Earth', currentOwner: 'Li Wei', condition: 'intact', manifestationImportance: SUPPORTING },
    { id: id.sword, persistenceId: id.sword, name: 'The Ashen Sword', description: 'Mei Lin’s sword, cracked along the spine since the night of the oath.', tier: 'Mortal', currentOwner: 'Mei Lin', condition: 'damaged', lastStateChapter: 5 },
  ],
  abilities: [
    { id: id.emberOath, name: 'Ember Oath Technique', description: 'Burns a sliver of lifespan to force Qi through a sealed meridian.', source: 'The Oath of Embers', acquiredChapter: 1, cost: 'One year of lifespan per use', masteryLevel: 'Minor Mastery', canonStatus: 'confirmed', progression: [{ chapter: 2, fromMastery: 'Initiate', toMastery: 'Minor Mastery', note: 'breakthrough during the fox’s trial' }] },
    'Ninth Meridian Sight',
  ],
};

const paragraph = (blockId: string, text: string, metadata?: StoryBlock['metadata']): StoryBlock => ({
  id: blockId,
  type: 'paragraph',
  text,
  ...(metadata ? { metadata } : {}),
});

const contextManifest: ContextManifest = {
  version: 1,
  engine: 'v2',
  route: 'generate-chapter-stream',
  generatedAt: at(9, 20),
  chapterNumber: 1,
  totalEstimatedTokens: 18420,
  providerInputEstimatedTokens: 21310,
  memoryAndHistoryBudgetTokens: 12000,
  memoryAndHistoryEstimatedTokens: 9875,
  memoryAndHistoryBudgetExceeded: false,
  providerInputTruncated: false,
  sections: [
    { key: 'pinnedRules', label: 'Pinned world rules', estimatedTokens: 410, includedItemCount: 2, availableItemCount: 2, includedItems: ['Oaths cannot be withdrawn', 'Sealed meridians'], omittedItems: [], truncated: false },
    { key: 'premise', label: 'Chapter premise', estimatedTokens: 120, includedItemCount: 1, availableItemCount: 1, includedItems: ['Li Wei swears the Oath of Embers'], omittedItems: [], truncated: false },
    { key: 'entityCards', label: 'Entity cards', estimatedTokens: 2650, includedItemCount: 3, availableItemCount: 4, includedItems: ['Li Wei', 'Mei Lin', 'Elder Kang'], omittedItems: ['Vermilion Debt Fox'], truncated: false, omissionReason: 'relevance_or_cap' },
    { key: 'threads', label: 'Open threads', estimatedTokens: 340, includedItemCount: 1, availableItemCount: 1, includedItems: ['The Oath of Embers will demand its toll'], omittedItems: [], truncated: false },
  ],
};

/** Chapter bodies, stored apart from the story exactly as production stores them. */
export function createWorkshopChapterContents(): ChapterContent[] {
  const chapterOne: StoryBlock[] = [
    paragraph('c1-b1', 'The night Li Wei swore the Oath of Embers, the Collapsed Gate of the Ninth Meridian wept rust-red rain. He pressed his palm to the cold stone and felt the meridian answer: a slow, ancient turning, like a key deciding at last to fit its lock.', {
      sceneType: 'ruined_gate', environment: ['rain', 'night', 'ruins'], atmosphereCategory: 'rain', emotion: 'resolve', intensity: 5, tension: 4,
      entities: [{ name: 'Li Wei', type: 'character', mention: 'reveal' }],
      music: { mood: 'mystical', region: 'chinese', intensity: 4 },
    }),
    { id: 'c1-b2', type: 'paragraph', text: '', worldCard: { id: 'card-mei-lin', entityType: 'character', entityName: 'Mei Lin', displayTitle: 'Mei Lin · Sword of the Outer Court', imageUrl: '/card-workshop/test-images/lyra_meadowlight_portrait.png', quote: 'If you mean to die tonight, at least die facing the right direction.', audioText: 'If you mean to die tonight, at least die facing the right direction.', audioType: 'tts_line', codexEntryId: id.meiLin, rarity: 'Rare' } },
    paragraph('c1-b3', 'Mei Lin stepped out of the rain with the Ashen Sword already drawn. "The Discipline Hall will feel that," she said. "Every elder within a hundred li just felt that." [SFX: Blade Drawn]', { emotion: 'tension', intensity: 6, tension: 7, speakerName: 'Mei Lin', speakerRole: 'friend', mode: 'dialogue' }),
    paragraph('c1-b4', 'Qi flooded the twelve standard channels and found them too narrow. Something in his dantian cracked, widened, and caught fire. [SFX: Breakthrough]', { intensity: 9, danger: 3, emotion: 'triumph', music: { mood: 'triumph', region: 'chinese', intensity: 7 } }),
    { id: 'c1-b5', type: 'system', text: '[The Heavenly Dao acknowledges your ascension. The Ninth Meridian has marked you.]', system: { kind: 'level_up', promptType: 'breakthrough', title: 'Breakthrough Achieved', rows: [{ label: 'Realm', value: 'Qi Condensation — Layer 9' }, { label: 'Lifespan', value: '+20 years' }, { label: 'Meridian Affinity', value: 'Ember (Awakened)' }], rarity: 'Legendary' }, metadata: { intensity: 9, danger: 3 } },
    paragraph('c1-b6', 'He laughed then, a raw and disbelieving sound, and the rain stopped mid-air. For three breaths the whole valley held still, every drop suspended like a bead of glass, each one holding a small burning copy of his hand.', { emotion: 'awe', intensity: 7, mysticism: 8 }),
    paragraph('c1-b7', 'The drops fell all at once when Elder Kang arrived. He did not land so much as stop being somewhere else.', {
      emotion: 'dread', intensity: 7, tension: 9, danger: 7,
      entities: [{ name: 'Elder Kang', type: 'character', mention: 'reveal' }],
      music: { mood: 'tension', region: 'chinese', intensity: 6 },
    }),
    { id: 'c1-b8', type: 'system', text: '[Appraisal complete. Do not engage.]', system: { kind: 'appraisal', promptType: 'enemy_scan', title: 'Appraisal: Elder Kang', rows: [{ label: 'Realm', value: 'Foundation Establishment — Peak' }, { label: 'Affiliation', value: 'Ashen Pavilion' }, { label: 'Threat', value: 'Lethal' }] } },
    paragraph('c1-b9', '"A sealed door is a mercy," Elder Kang said. "You have refused mercy." He looked at the gate, then at the boy, as if deciding which of them to break first. The Azure Ring chimed awake on Li Wei’s finger.', { emotion: 'dread', tension: 9, speakerName: 'Elder Kang', speakerRole: 'enemy', mode: 'dialogue' }),
  ];

  const chapterTwo: StoryBlock[] = [
    paragraph('c2-b1', 'Ember Valley was warm in the way a hearth is warm an hour after the fire dies. Li Wei walked it barefoot, because the ash told him where the paths were.', {
      sceneType: 'ash_valley', environment: ['ash', 'dusk', 'valley'], atmosphereCategory: 'wind', emotion: 'unease', intensity: 4, tension: 5,
      entities: [{ name: 'Ember Valley', type: 'location', mention: 'reveal' }],
      music: { mood: 'travel', region: 'chinese', intensity: 3 },
    }),
    { id: 'c2-b2', type: 'paragraph', text: '', worldCard: { id: 'card-fox', entityType: 'creature', entityName: 'Vermilion Debt Fox', displayTitle: 'Vermilion Debt Fox · Keeper of Embers', imageUrl: '/familiars/nine-tailed-fox/neutral.png', audioType: 'screech', sound: { element: 'fire', size: 'medium', threatTier: 'elite' }, codexEntryId: id.fox, rarity: 'Epic' } },
    paragraph('c2-b3', 'The fox sat on a stone that had not been there a moment ago. Seven of its tails were ash. The eighth burned. [SFX: Beast Growl]', {
      emotion: 'fear', intensity: 7, danger: 6,
      beastEvent: { type: 'reveal', profile: { size: 'medium', bodyType: 'spirit', element: 'fire', threatTier: 'elite', signatureSound: 'screech' } },
    }),
    { id: 'c2-b4', type: 'system', text: '[A debt has been named.]', system: { kind: 'quest', promptType: 'quest_update', title: 'Quest: Repay the Fox’s Debt', rows: [{ label: 'Objective', value: 'Survive the fox’s trial of three questions' }, { label: 'Reward', value: 'The fox’s favor' }, { label: 'Failure', value: 'One year of lifespan per wrong answer' }] } },
    paragraph('c2-b5', 'He answered the first question truthfully and the second one cleverly. The third question had no answer, so he drew on the oath instead, and the ember in his chest roared up to meet the fox’s burning tail. [SFX: Sword Clash]', { emotion: 'defiance', intensity: 9, danger: 8, music: { mood: 'duel', region: 'chinese', intensity: 8 } }),
    { id: 'c2-b6', type: 'system', text: '[FATE SCARRED: Li Wei paid the fox’s toll with his own lifespan.]', system: { kind: 'fate_result', promptType: 'fate_event', title: 'Fate Judgment', fateResult: { outcome: 'FATE SCARRED', timelineScar: 'Li Wei will never again hear the Azure Ring chime for anyone but himself.', permanentCosts: ['−3 years of lifespan', 'The fox may call in one life at any time'], newStoryState: 'Li Wei carries the fox’s debt into the sect.', newActiveStats: ['Karmic Debt: 1', 'Ember Oath Technique: Minor Mastery'] } } },
    paragraph('c2-b7', 'The fox bowed, which was worse than any threat. "I will collect," it said, "when you have something worth taking."', { emotion: 'unease', tension: 6, speakerName: 'Vermilion Debt Fox', mode: 'dialogue' }),
  ];

  const chapterThree: StoryBlock[] = [
    paragraph('c3-b1', 'The Discipline Hall smelled of cold incense and old judgments. Li Wei knelt where a hundred disgraced disciples had knelt before him and kept his eyes on the floor.', {
      sceneType: 'tribunal', environment: ['hall', 'incense', 'morning'], atmosphereCategory: 'crowd', emotion: 'tension', intensity: 5, tension: 8,
      music: { mood: 'tension', region: 'chinese', intensity: 5 },
    }),
    paragraph('c3-b2', '"You swore a forbidden oath beneath a sect gate," Elder Kang said. "Tell this hall why you should keep your cultivation."', { speakerName: 'Elder Kang', speakerRole: 'enemy', mode: 'dialogue', tension: 9 }),
    paragraph('c3-b3', '"Because the gate answered me," Li Wei said, "and it has not answered you in thirty years."', { speakerName: 'Li Wei', speakerRole: 'protagonist', mode: 'dialogue', emotion: 'defiance', intensity: 7 }),
    { id: 'c3-b4', type: 'system', text: '[Your standing in the sect has fallen.]', system: { kind: 'status', promptType: 'warning', title: 'Sect Standing Reduced', rows: [{ label: 'Standing', value: 'Outer Disciple → On Probation' }, { label: 'Monthly Pills', value: 'Revoked' }] } },
    paragraph('c3-b5', 'The hall erupted. When it quieted, Mei Lin was standing beside him, which she had no right to do, with her cracked sword laid flat across both palms.', { emotion: 'hope', intensity: 6 }),
    { id: 'c3-b6', type: 'system', text: '[Mei Lin now considers you someone she can trust.]', system: { kind: 'status', promptType: 'karmic_bond', title: 'Karmic Bond Formed', rows: [{ label: 'Bond', value: 'Mei Lin' }, { label: 'Affinity', value: '+25' }] } },
    paragraph('c3-b7', '"Then let the gate judge him," she said. "If it answers him a second time, the sect has its hope back. If it does not, I will carry his sword to the Pavilion myself."', { speakerName: 'Mei Lin', speakerRole: 'friend', mode: 'dialogue', emotion: 'resolve' }),
  ];

  const chapterFourProse = [
    'They gave him the Ledger of Ash to copy as punishment: every oath ever sworn at the gate, and what each one had cost.',
    '[SYSTEM: Hidden record discovered — The First Oath]',
    'Halfway down the third scroll he found his own name, in a hand three hundred years old.',
    'He read it four times. It did not change. Someone had sworn the Oath of Embers on his behalf before he was born, and the cost column beside his name was blank.',
    '[SYSTEM: Quest updated — Find who wrote the First Oath]',
    'He copied the line exactly, ink and all, and hid the copy inside his sleeve.',
  ].join('\n\n');

  const chapterFive: StoryBlock[] = [
    paragraph('c5-b1', 'The gate opened at midnight, and it was not a door. It was a wound, and the light that came out of it was the color of a dying ember.', {
      sceneType: 'gate_opening', environment: ['night', 'ruins', 'storm'], atmosphereCategory: 'combat', emotion: 'dread', intensity: 9, tension: 10, danger: 9,
      music: { mood: 'tribulation', region: 'chinese', intensity: 9 },
    }),
    { id: 'c5-b2', type: 'system', text: '[DEATH FLAG RAISED: The toll of the Oath of Embers has come due.]', system: { kind: 'status', promptType: 'death_event', title: 'Death Flag Raised', rows: [{ label: 'Toll', value: 'One life' }, { label: 'Deadline', value: 'Before dawn' }], rarity: 'Mythic' } },
    paragraph('c5-b3', 'Elder Kang struck first. The blow found the oath-mark on Li Wei’s chest and drove a mortal wound through it, and for a moment his heart stops, and the world is very quiet.', { emotion: 'grief', intensity: 10, danger: 10 }),
    { id: 'c5-b4', type: 'system', text: '[Your meridians are turning black.]', system: { kind: 'status', promptType: 'corruption', title: 'Corruption Spreading', rows: [{ label: 'Corruption', value: '41%' }, { label: 'Source', value: 'The Ninth Door' }] } },
    paragraph('c5-b5', 'It was Mei Lin who paid. The Ashen Sword broke the way the fox had promised a debt would break: all at once, and in the hand that held it.', { emotion: 'grief', intensity: 9, danger: 9 }),
  ];

  const base = { storyId: WORKSHOP_STORY_ID, syncStatus: 'local' as const };
  return [
    { ...base, chapterNumber: 1, generatedContent: chapterOne.map((block) => block.text).filter(Boolean).join('\n\n'), blocks: chapterOne, summary: 'Li Wei swears the Oath of Embers beneath the Collapsed Gate, breaks through to the ninth layer of Qi Condensation, and draws the attention of Elder Kang.', cuePayload: { sceneType: 'ruined_gate', environment: ['rain', 'night'], atmosphereCategory: 'rain', emotion: 'resolve', intensity: 6, tension: 5, danger: 4, music: { mood: 'mystical', region: 'chinese', intensity: 4 } }, contextManifest },
    { ...base, chapterNumber: 2, generatedContent: chapterTwo.map((block) => block.text).filter(Boolean).join('\n\n'), blocks: chapterTwo, summary: 'In Ember Valley the Vermilion Debt Fox puts Li Wei through a trial; he pays its toll with three years of lifespan and leaves owing it a life.', statsChangeMessage: '+1 Karmic Debt · Ember Oath Technique reached Minor Mastery · −3 years of lifespan', cuePayload: { sceneType: 'ash_valley', atmosphereCategory: 'wind', emotion: 'unease', intensity: 6, danger: 6, music: { mood: 'travel', region: 'chinese', intensity: 3 } } },
    { ...base, chapterNumber: 3, generatedContent: chapterThree.map((block) => block.text).filter(Boolean).join('\n\n'), blocks: chapterThree, summary: 'The Discipline Hall puts Li Wei on probation; Mei Lin stands beside him and demands that the gate itself judge him.', cuePayload: { sceneType: 'tribunal', atmosphereCategory: 'crowd', emotion: 'tension', intensity: 5, tension: 8 } },
    { ...base, chapterNumber: 4, generatedContent: chapterFourProse, summary: 'Copying the Ledger of Ash, Li Wei finds his own name beside an oath sworn three hundred years before his birth.' },
    { ...base, chapterNumber: 5, generatedContent: chapterFive.map((block) => block.text).filter(Boolean).join('\n\n'), blocks: chapterFive, summary: 'The gate opens, the oath’s toll comes due, and Mei Lin’s sword breaks to pay it.', cuePayload: { sceneType: 'gate_opening', atmosphereCategory: 'combat', emotion: 'grief', intensity: 10, tension: 10, danger: 9.6, music: { mood: 'tribulation', region: 'chinese', intensity: 9 } } },
  ];
}

const bookmarks: Bookmark[] = [
  { id: 'bookmark-oath', chapterNumber: 1, paragraphIndex: 0, paragraphExcerpt: 'The night Li Wei swore the Oath of Embers, the Collapsed Gate of the Ninth Meridian wept rust-red rain.', note: 'The oath comes due soon. Watch for the ember toll.', createdAt: at(6) },
  { id: 'bookmark-fox', chapterNumber: 2, paragraphIndex: 2, paragraphExcerpt: 'The fox sat on a stone that had not been there a moment ago.', createdAt: at(4) },
];

/** The story document, carrying scaffolds only, as production's Story graph does. */
export function createWorkshopStory(options: { lastReadAt?: string } = {}): Story {
  return {
    id: WORKSHOP_STORY_ID,
    persistenceId: STORY_UUID,
    persistenceHydration: 'full',
    title: 'Ashes of the Ninth Meridian',
    genre: 'Cultivation / System',
    mcName: 'Li Wei',
    customPremise: 'A disgraced disciple swears a forbidden oath to reopen his sealed meridian, and the oath begins collecting its debts.',
    createdAt: at(12),
    updatedAt: at(1),
    memory,
    currentChapterNumber: 5,
    imageUrl: '/manifest-backdrops/immortal-land-2.jpg',
    readerPreferences: {
      fontSize: 'base',
      fontFamily: 'serif',
      lineHeight: 'relaxed',
      paragraphSpacing: 'normal',
      themeOverride: 'void',
    },
    bookmarks,
    relationships: [
      { id: 'rel-li-mei', sourceCharId: id.liWei, sourceCharName: 'Li Wei', targetCharId: id.meiLin, targetCharName: 'Mei Lin', affinity: 65, threat: -10, description: 'Stood beside him in the Discipline Hall.', updatedAt: at(3) },
      { id: 'rel-li-kang', sourceCharId: id.liWei, sourceCharName: 'Li Wei', targetCharId: id.elderKang, targetCharName: 'Elder Kang', affinity: -80, threat: 90, description: 'Sealed his meridian; now hunts his oath.', updatedAt: at(1) },
    ],
    karmaNodes: [
      { id: 'karma-fox', sourceId: id.liWei, sourceName: 'Li Wei', targetId: id.fox, targetName: 'Vermilion Debt Fox', description: 'Owes the fox one life, to be named later.', severity: 'Major', type: 'Debt', status: 'active', createdAt: at(4) },
      { id: 'karma-oath', sourceId: id.liWei, sourceName: 'Li Wei', targetId: id.gate, targetName: 'Collapsed Gate of the Ninth Meridian', description: 'The Oath of Embers binds him to the Ninth Door.', severity: 'Cosmic', type: 'Destiny', status: 'active', createdAt: at(9) },
    ],
    blueprint: {
      title: 'Ashes of the Ninth Meridian',
      logline: 'A disgraced disciple swears a forbidden oath, and the oath begins collecting.',
      worldOverview: 'A declining sect built around a gate no one has opened in three hundred years.',
      startingLocation: 'Collapsed Gate of the Ninth Meridian',
      societyStructure: 'Outer court, inner court, Discipline Hall, Ashen Pavilion.',
      powerSystemOutline: memory.powerSystem,
      mcProfile: 'Li Wei, a sealed outer disciple with nothing left to lose.',
      majorFactions: ['Ninth Meridian Sect', 'Ashen Pavilion'],
      initialCharacters: ['Li Wei', 'Mei Lin', 'Elder Kang'],
      majorMysteries: ['Who swore the First Oath in Li Wei’s name?'],
      firstArcPromise: 'The gate will open, and it will cost someone everything.',
      tropeRules: 'Every power has a price that is paid on the page.',
      styleBible: 'Close third person, past tense, restrained imagery.',
      destinedEnding: 'Li Wei closes the Ninth Door from the inside.',
      estimatedArcs: 10,
      unresolvedPlotThreads: ['The First Oath', 'The fox’s debt'],
    },
    readingStats: { totalReadingTimeMs: (4 * 60 + 12) * 60 * 1000, arcReadingTimeMs: { 0: (4 * 60 + 12) * 60 * 1000 } },
    lastReadChapter: 1,
    lastReadAt: options.lastReadAt ?? new Date().toISOString(),
    arcs: [
      {
        persistenceId: '2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d',
        title: WORKSHOP_ARC_TITLE,
        isCompleted: false,
        summary: 'Li Wei swears the Oath of Embers and learns what it costs.',
        chapters: [
          { number: 1, title: 'The Oath of Embers', premise: 'Li Wei swears the Oath of Embers beneath the Collapsed Gate.', status: 'read', hasContent: true, summary: 'Li Wei swears the Oath of Embers beneath the Collapsed Gate, breaks through to the ninth layer of Qi Condensation, and draws the attention of Elder Kang.', continuitySoftNotes: ['The Oath of Embers is named before it is explained; consider one earlier line about what an oath costs.', 'Mei Lin reaches the gate faster than the outer court’s distance allows.'], contractReport: { objectiveFulfilled: true, evidence: 'He pressed his palm to the cold stone and felt the meridian answer.', openingMatched: true } },
          { number: 2, title: 'Debts of the Vermilion Fox', premise: 'The Vermilion Debt Fox names the price of the oath.', status: 'read', hasContent: true, summary: 'In Ember Valley the Vermilion Debt Fox puts Li Wei through a trial; he pays its toll with three years of lifespan and leaves owing it a life.' },
          { number: 3, title: 'The Elder’s Verdict', premise: 'The Discipline Hall judges Li Wei.', status: 'unread', hasContent: true, summary: 'The Discipline Hall puts Li Wei on probation; Mei Lin stands beside him and demands that the gate itself judge him.', continuitySoftNotes: ['Replay of a completed Chapter 1 event detected: "breakthrough — Li Wei → Qi Condensation Layer 9" is re-narrated as happening again in the present scene. This already happened and must only be referenced, never replayed.'] },
          { number: 4, title: 'Ledger of Ash', premise: 'Li Wei finds his own name in a three-hundred-year-old ledger.', status: 'unread', hasContent: true, summary: 'Copying the Ledger of Ash, Li Wei finds his own name beside an oath sworn three hundred years before his birth.', hasContinuityFaults: true, continuityWarnings: ['Elder Kang is recorded as having left for the Pavilion in Chapter 3 but supervises the copying here.', 'The Azure Ring is said to be silent, but it chimed in Chapter 1 and the fox’s judgment kept it.'] },
          { number: 5, title: 'Where the Ember Dies', premise: 'The gate opens and the toll comes due.', status: 'unread', hasContent: true, isSealed: true, sealedAt: Date.parse(at(1)), summary: 'The gate opens, the oath’s toll comes due, and Mei Lin’s sword breaks to pay it.' },
          { number: 6, title: 'The Ninth Door', premise: 'Li Wei steps through the Ninth Door to find who swore the First Oath.', status: 'unlocked', hasContent: false },
        ],
      },
    ],
  };
}

export const WORKSHOP_GLOSSARY: LoreGlossary[] = [
  { id: 'gloss-oath', novel_id: WORKSHOP_STORY_ID, source_text: 'Oath of Embers', target_text: '余烬之誓', target_lang: 'zh-CN' },
  { id: 'gloss-gate', novel_id: WORKSHOP_STORY_ID, source_text: 'Ninth Meridian', target_text: '第九经脉', target_lang: 'zh-CN' },
  { id: 'gloss-fox', novel_id: WORKSHOP_STORY_ID, source_text: 'Vermilion Debt Fox', target_text: 'Zorro Bermellón de las Deudas', target_lang: 'es' },
];

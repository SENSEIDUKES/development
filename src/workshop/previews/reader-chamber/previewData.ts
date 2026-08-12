import type {
  Bookmark,
  GeneratedImage,
  ReaderChapter,
  ReaderPreferences,
  StoryWorld,
} from '../../../components/reader-chamber/shared/types';
export const MOCK_READER_FALLBACK_LABEL = 'Mock fallback · No generated batch supplied · Four-chapter preview story only';

export const MOCK_STORY_ID = 'workshop-story-emberfall';
const CODEX_PREVIEW_IMAGE = '/story-seed/library-auth-backdrop.jpg';

const createCodexPreviewImage = (
  id: string,
  entityId: string,
  entityType: GeneratedImage['entityType'],
  label: string,
  chapterNumber?: number,
): GeneratedImage => ({
  id,
  assetId: `workshop-${id}`,
  entityId,
  entityType,
  imageUrl: CODEX_PREVIEW_IMAGE,
  chapterNumber,
  label,
  promptUsed: `Workshop-local visual memory for ${label}.`,
  createdAt: `2026-07-${String(20 + (chapterNumber ?? 0)).padStart(2, '0')}T12:00:00.000Z`,
  isCurrent: true,
});

export const mockReaderPreferences: ReaderPreferences = {
  fontSize: 'lg',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  paragraphSpacing: 'normal',
  themeOverride: 'void',
};

/**
 * One mock StoryWorld with four chapters covering the chamber's meaningful
 * visual states:
 *  1. Rich structured-blocks chapter (system blocks, a Fate Result card, a
 *     World Card, a Context Inspector manifest, soft continuity notes).
 *  2. Long legacy `generatedContent` prose chapter with a hard continuity
 *     divergence banner and a legacy [bracket] system line.
 *  3. Sealed chapter that is also a death/critical scene (menacing shading).
 *  4. Empty chapter with no content ("Unmanifested Segment").
 */
export function createMockChapters(): ReaderChapter[] {
  return [
    {
      number: 1,
      title: 'The Oath of Embers',
      premise: 'Li Wei swears the Oath of Embers and touches the first thread of the Ninth Meridian.',
      status: 'read',
      hasContent: true,
      summary:
        'Li Wei swears the Oath of Embers beneath the collapsed gate, breaks through to the ninth layer of Qi Condensation, and the Heavenly System records a fate scar that will follow him for the rest of the arc.',
      continuitySoftNotes: [
        'The Oath of Embers is referenced before it is formally named; consider a one-line earlier mention.',
        'Mei Lin arrives at the gate slightly faster than the travel time established last chapter.',
      ],
      cuePayload: {
        sceneType: 'ruined_gate',
        emotion: 'resolve',
        intensity: 6,
        tension: 5,
        danger: 4,
      },
      blocks: [
        {
          id: 'ch1-b1',
          type: 'paragraph',
          text: 'The night Li Wei swore the Oath of Embers, the collapsed gate of the Ninth Meridian wept rust-red rain. He pressed his palm to the cold stone and felt the meridian answer — a slow, ancient turning, like a key deciding at last to fit its lock.',
        },
        {
          id: 'ch1-b2',
          type: 'paragraph',
          text: 'Qi flooded the twelve standard channels and found them too narrow. Something in his dantian cracked, widened, and caught fire. [SFX: Breakthrough]',
          metadata: { intensity: 9, danger: 3, emotion: 'triumph' },
        },
        {
          id: 'ch1-b3',
          type: 'system',
          text: '[The Heavenly Dao acknowledges your ascension. The Ninth Meridian has marked you.]',
          system: {
            kind: 'level_up',
            promptType: 'breakthrough',
            title: 'Breakthrough Achieved',
            rows: [
              { label: 'Realm', value: 'Qi Condensation — Layer 9' },
              { label: 'Lifespan', value: '+20 years' },
              { label: 'Meridian Affinity', value: 'Ember (Awakened)' },
            ],
            rarity: 'Legendary',
          },
          metadata: { intensity: 9, danger: 3 },
        },
        {
          id: 'ch1-b4',
          type: 'paragraph',
          text: 'He laughed then — a raw, disbelieving sound — and the rain stopped mid-air. For three breaths the whole valley held still, every drop suspended like a bead of glass, reflecting a thousand tiny versions of his burning hand.',
        },
        {
          id: 'ch1-b5',
          type: 'system',
          text: '',
          system: {
            kind: 'fate_result',
            title: 'Fate Result',
            fateResult: {
              outcome: 'FATE SCARRED',
              timelineScar:
                'The Ninth Meridian now knows Li Wei by name. Every future ascension will demand an ember toll.',
              permanentCosts: [
                'The Oath of Embers cannot be renounced — only fulfilled.',
                'Cultivation deviation risk permanently raised by one grade.',
              ],
              newStoryState: 'Marked by the Ninth Meridian',
              newActiveStats: ['Ember Toll (Passive)', 'Meridian Resonance'],
              genreShift: 'Cultivation → Fate Survival',
            },
          },
        },
        {
          id: 'ch1-b6',
          type: 'paragraph',
          text: '“You pay the toll either way,” said a woman’s voice from the far side of the gate. “The only choice the Dao ever offers is whether you pay it kneeling.”',
        },
        {
          id: 'ch1-b7',
          type: 'worldCard',
          text: '',
          worldCard: {
            entityType: 'character',
            entityName: 'Mei Lin',
            displayTitle: 'Mei Lin, the Ashen Sword Saint',
            quote: 'The ninth stance is not a technique. It is a promise you make to your own grave.',
            audioText: 'The ninth stance is not a technique. It is a promise you make to your own grave.',
            audioType: 'tts_line',
          },
        },
        {
          id: 'ch1-b8',
          type: 'paragraph',
          text: 'Li Wei rose, ash falling from his shoulders like a mantle being shed. Beyond the gate, the first stair of the Ninth Meridian lit from within, and the night drew a long, expectant breath.',
        },
      ],
      contextManifest: {
        version: 1,
        engine: 'v2',
        route: 'generate-chapter',
        generatedAt: '2026-07-30T18:12:44.000Z',
        chapterNumber: 1,
        totalEstimatedTokens: 6420,
        providerInputEstimatedTokens: 9110,
        memoryAndHistoryBudgetTokens: 4000,
        memoryAndHistoryEstimatedTokens: 2690,
        memoryAndHistoryBudgetExceeded: false,
        providerInputTruncated: false,
        sections: [
          {
            key: 'pinnedRules',
            label: 'Pinned Rules',
            estimatedTokens: 320,
            includedItemCount: 3,
            availableItemCount: 3,
            includedItems: ['System voice guide', 'Fate Survival genre contract', 'MC power ceiling'],
            omittedItems: [],
            truncated: false,
          },
          {
            key: 'entityCards',
            label: 'Entity Cards',
            estimatedTokens: 1480,
            includedItemCount: 5,
            availableItemCount: 9,
            includedItems: ['Li Wei', 'Mei Lin', 'Ninth Meridian', 'Oath of Embers', 'Ashen Sword'],
            demotedItems: ['Elder Kang'],
            omittedItems: ['Dusthaven Warden', 'Silk Matriarch', 'The Pale Audience'],
            omissionReason: 'relevance_or_cap',
            truncated: false,
          },
          {
            key: 'recentChapters',
            label: 'Recent Chapters',
            estimatedTokens: 3600,
            includedItemCount: 2,
            availableItemCount: 2,
            includedItems: ['Prologue (full)', 'Chapter 0 summary'],
            omittedItems: [],
            protectedOverflowTokens: 240,
            truncated: false,
          },
          {
            key: 'rag',
            label: 'RAG Lore',
            estimatedTokens: 1020,
            includedItemCount: 4,
            availableItemCount: 12,
            includedItems: ['Meridian toll lore', 'Ember oaths', 'Ashen Saint legend', 'Gate geography'],
            omittedItems: ['Old war treaties', 'Sect roster'],
            omissionReason: 'token_budget',
            truncated: false,
          },
        ],
      },
    },
    {
      number: 2,
      title: 'Rust-Red Rain',
      premise: 'The toll comes due faster than Li Wei expected, and the valley itself begins to argue with him.',
      status: 'unread',
      hasContent: true,
      summary:
        'The ember toll comes due. Li Wei argues with the valley, bargains with a dead man, and learns the first rule of the Ninth Meridian: every gift is a debt wearing a smile.',
      hasContinuityFaults: true,
      continuityWarnings: [
        'Elder Kang is recorded as deceased in the Codex (Chapter 0) but speaks three lines of dialogue in this chapter.',
        'The Ashen Sword is described as “unbroken” here; the Codex records it shattered in the Prologue.',
      ],
      generatedContent: [
        'The rain came back at dawn, and it brought the smell of a forge that had been burning for a thousand years. Li Wei sat cross-legged on the first stair and counted his heartbeats, because the alternative was counting his regrets, and there were far more of those.',
        'Below him, the valley floor had rearranged itself in the night. Where yesterday there had been a switchback path, there was now a sheer drop into mist, and where the mist parted he could see the roofs of Dusthaven — closer than they had any right to be, as if the town had crept uphill while nobody was watching.',
        '“You’re brooding,” said Elder Kang. “It’s unbecoming of a Layer 9 cultivator.”',
        'Li Wei did not startle. He had felt the old man’s presence three breaths ago — a dry, papery weight against the meridian’s hum. “You’re dead,” he said. “I watched them burn your body at the Scar.”',
        '“You watched them burn a body,” Elder Kang agreed, lowering himself onto the stair with the creak of old bamboo. “The Ninth Meridian keeps sloppy accounts. It is the one virtue of the place.”',
        '[SYSTEM: Karmic Consequence recorded — speaking with the unmoored dead. Toll adjusted: -3 years. Remaining lifespan recalculating…]',
        'Three years. The number settled onto Li Wei’s shoulders like a yoke. He thought of the Oath, of the ember that now lived behind his ribs, of Mei Lin’s voice saying the only choice is whether you pay kneeling. “Then teach me to pay standing,” he said.',
        'Elder Kang smiled, and for an instant his face was almost young. “The ninth stance,” he said, “is not a stance at all. It is the moment you stop asking the sword to forgive you. Mei Lin will tell you it is a promise. Promises are just debts. Are you seeing the pattern yet, boy?”',
        'They trained until the rain burned itself out. The dead man’s corrections were merciless and exact, and by dusk Li Wei’s arms trembled so badly he could not lift the practice blade, and by dusk he also understood — with the clarity of a bone finally set — that the toll was never going to stop coming, and that this, precisely this, was the thing the Oath had been trying to buy him: the right to keep paying.',
        'When the last light failed, Elder Kang rose and walked downhill into the mist, toward a town that had moved in the night. “Tomorrow,” the dead man said over his shoulder, “bring the sword. The real one. The broken one.” And the mist closed over him like water over a stone.',
      ].join('\n\n'),
    },
    {
      number: 3,
      title: 'The Death of the Ninth Elder',
      premise: 'A death flag ripens over Dusthaven, and the price of defying it is named.',
      status: 'read',
      hasContent: true,
      isSealed: true,
      sealedAt: 1753814400000,
      summary:
        'A death flag ripens over the valley. The Ninth Elder dies as the Codex foretold, and Li Wei’s first defiance of fate leaves a scar that the Heavenly System records in red.',
      cuePayload: {
        emotion: 'grief',
        intensity: 9.5,
        tension: 9,
        danger: 9.8,
      },
      blocks: [
        {
          id: 'ch3-b1',
          type: 'paragraph',
          text: 'The bell of Dusthaven tolled thirteen times, and on the thirteenth stroke every flame in the valley bowed toward the Ninth Meridian, as if the fire itself were kneeling to witness a death foretold.',
        },
        {
          id: 'ch3-b2',
          type: 'system',
          text: '[A thread of fate has reached its terminus. The record cannot be unwritten.]',
          system: {
            kind: 'status',
            promptType: 'corruption',
            title: 'Death Flag Fulfilled',
            rows: [
              { label: 'Thread', value: 'The Ninth Elder' },
              { label: 'Prophecy', value: 'Fulfilled at dusk' },
              { label: 'Defiance Cost', value: 'One ember of the Oath' },
            ],
            rarity: 'Mythic',
          },
          metadata: { danger: 9.8, intensity: 9.5, emotion: 'grief' },
        },
        {
          id: 'ch3-b3',
          type: 'paragraph',
          text: 'Li Wei did not kneel. He stood in the rust-red rain with the broken sword in his hands and felt the Oath burn down one ember — one irreplaceable year of light — to buy a single heartbeat of defiance. It was not enough. It was never going to be enough. He spent it anyway.',
        },
        {
          id: 'ch3-b4',
          type: 'paragraph',
          text: 'Afterward, the silence had a texture, like ash settling over a pyre. Mei Lin found him still standing there at moonrise and said nothing at all, which from the Ashen Sword Saint was the deepest eulogy the dead could hope for.',
        },
      ],
    },
    {
      number: 4,
      title: 'The Stair of a Thousand Debts',
      premise:
        'Li Wei climbs the Stair of a Thousand Debts and learns what the Ninth Meridian truly is — and what it has been collecting from every cultivator who ever swore the Oath of Embers.',
      status: 'unlocked',
      hasContent: false,
    },
  ];
}

export function createMockBookmarks(): Bookmark[] {
  return [
    {
      id: 'bm-ember-oath',
      chapterNumber: 1,
      paragraphIndex: 0,
      paragraphExcerpt: 'The night Li Wei swore the Oath of Embers, the collapsed gate of the Ninth Meridian wept rust-red rain...',
      note: 'The oath comes due in the doom deadline chapter — watch for the ember toll.',
      createdAt: '2026-07-28T21:14:03.000Z',
    },
    {
      id: 'bm-dead-man',
      chapterNumber: 2,
      paragraphIndex: 3,
      paragraphExcerpt: 'Li Wei did not startle. He had felt the old man’s presence three breaths ago...',
      note: 'Elder Kang speaks while recorded as deceased — the Continuity Guard flagged this.',
      createdAt: '2026-07-29T08:41:37.000Z',
    },
  ];
}

export function createMockStory(): StoryWorld {
  const chapters = createMockChapters().map(chapter => (
    chapter.number <= 3
      ? {
          ...chapter,
          imageHistory: [createCodexPreviewImage(
            `chapter-${chapter.number}-memory`,
            `chapter-${chapter.number}`,
            'chapterHero',
            chapter.title,
            chapter.number,
          )],
        }
      : chapter
  ));
  return {
    id: MOCK_STORY_ID,
    title: 'Ashes of the Ninth Meridian',
    genre: 'Fate Survival',
    mcName: 'Li Wei',
    customPremise:
      'A debt-marked cultivator climbs the Ninth Meridian to out-pay a fate the Heavenly System has already written.',
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-30T18:12:44.000Z',
    memory: {
      currentPowerStage: 'Qi Condensation — Layer 9',
      powerSystem: 'Body Tempering -> Qi Condensation -> Core Formation -> Nascent Soul',
      worldRules: [
        'Every act of fate defiance consumes an ember from the Oath.',
        'The Ninth Meridian may collect debts but cannot erase a witnessed promise.',
      ],
      memoryWarnings: [
        'Elder Kang is recorded as deceased but continues to manifest as a spectral mentor.',
      ],
      characters: [
        {
          id: 'c1',
          name: 'Li Wei',
          role: 'Protagonist (Disgraced Disciple)',
          status: 'alive',
          powerLevel: 'Qi Condensation — Layer 9',
          relationshipToMC: 'Self',
          description: 'A debt-marked cultivator carrying the Oath of Embers and marked by the Ninth Meridian.',
          aliases: ['Ember-Bearer'],
          faction: 'Ninth Meridian Sect',
          firstAppeared: 1,
          signatureQuote: 'I will pay standing.',
          imageUrl: CODEX_PREVIEW_IMAGE,
          imageHistory: [createCodexPreviewImage('li-wei-portrait', 'c1', 'character', 'Li Wei', 1)],
          abilities: [
            {
              id: 'ability-ember-step',
              name: 'Ember Step',
              description: 'Converts a sliver of oath-fire into one impossible stride.',
              acquiredChapter: 1,
              masteryLevel: 'Initiate',
              canonStatus: 'confirmed',
            },
          ],
        },
        {
          id: 'c2',
          name: 'Mei Lin',
          role: 'Ashen Sword Saint',
          status: 'alive',
          powerLevel: 'Core Formation — Peak',
          relationshipToMC: 'Unwilling Ally & Guardian',
          description: 'Master of the Ashen Sword Technique. Guarded the collapsed gate when Li Wei broke through.',
          faction: 'Ashen Sword Pavilion',
          firstAppeared: 1,
          signatureQuote: 'A promise is only a blade held by its edge.',
          imageUrl: CODEX_PREVIEW_IMAGE,
          imageHistory: [createCodexPreviewImage('mei-lin-portrait', 'c2', 'character', 'Mei Lin', 1)],
          evolutionReady: true,
          evolutionReason: 'Witnessed the Meridian breakthrough',
        },
        {
          id: 'c3',
          name: 'Elder Kang',
          role: 'Former Sect Elder',
          status: 'deceased',
          powerLevel: 'Nascent Soul (Deceased)',
          relationshipToMC: 'Deceased Mentor',
          description: 'Recorded as deceased in Chapter 0, though spectral echoes remain.',
          firstAppeared: 0,
          relevanceState: 'dormant',
          provenance: { isUserPinned: true, sourceChapterNumber: 0 },
          signatureQuote: 'The dead keep better ledgers than Heaven.',
        },
        {
          id: 'c4',
          name: 'Vermilion Debt Fox',
          role: 'Dormant Spirit Beast',
          status: 'unknown',
          powerLevel: 'Earth Spirit — Veiled',
          relationshipToMC: 'Unknown',
          description: 'A fox-shaped debt omen last seen beneath the collapsed gate.',
          isBeast: true,
          firstAppeared: 1,
          relevanceState: 'dormant',
          provenance: { isUserPinned: false, sourceChapterNumber: 1 },
        },
      ],
      factions: [
        {
          id: 'f1',
          name: 'Ninth Meridian Sect',
          alignment: 'Neutral / Mysterious',
          description: 'An ancient sect overseeing the collapsed gates and ember oaths.',
          headquarters: 'Ninth Meridian Inner Stair',
          status: 'Fractured',
          imageUrl: CODEX_PREVIEW_IMAGE,
          imageHistory: [createCodexPreviewImage('ninth-meridian-sect', 'f1', 'faction', 'Ninth Meridian Sect', 1)],
        },
        {
          id: 'f2',
          name: 'Ashen Sword Pavilion',
          alignment: 'Righteous',
          description: 'High-tier sword cultivators allied with Mei Lin.',
          headquarters: 'Ashen Sword Pavilion',
          status: 'Active',
        },
      ],
      locations: [
        {
          id: 'l1',
          name: 'Collapsed Gate of the Ninth Meridian',
          safetyLevel: 'Dangerous',
          description: 'Site of Li Wei’s breakthrough where rust-red rain falls.',
          realm: 'Mortal Realm',
          firstAppeared: 1,
          imageUrl: CODEX_PREVIEW_IMAGE,
          imageHistory: [createCodexPreviewImage('collapsed-gate', 'l1', 'location', 'Collapsed Gate', 1)],
        },
        {
          id: 'l2',
          name: 'Stair of a Thousand Debts',
          safetyLevel: 'Lethal',
          description: 'The steep ascent required to reach the inner sanctuaries.',
          realm: 'Ninth Meridian Domain',
          firstAppeared: 3,
        },
      ],
      artifacts: [
        {
          id: 'a1',
          name: 'The Azure Ring',
          tier: 'Heavenly',
          condition: 'intact',
          description: 'Ancient artifact discovered in Elder Kang’s sealed tomb.',
          currentOwner: 'Li Wei',
          firstAppeared: 2,
          imageUrl: CODEX_PREVIEW_IMAGE,
          imageHistory: [createCodexPreviewImage('azure-ring', 'a1', 'artifact', 'The Azure Ring', 2)],
        },
      ],
      abilities: [
        {
          id: 'ability-oath-embers',
          name: 'Oath of Embers',
          description: 'Burns lifespan to resist a recorded fate.',
          source: 'Ninth Meridian',
          acquiredChapter: 1,
          masteryLevel: 'Bound',
          canonStatus: 'confirmed',
          progression: [{ chapter: 3, fromMastery: 'Kindled', toMastery: 'Bound', note: 'Spent one ember against a death flag.' }],
        },
      ],
      unresolvedPlotThreads: [
        {
          id: 'thread-meridian-ledger',
          description: 'What the Ninth Meridian has been collecting from every cultivator swearing the Ember Oath.',
          status: 'active',
          originChapter: 1,
        },
        {
          id: 'thread-kang-echo',
          description: 'Why spectral echoes of Elder Kang still appear after his recorded death.',
          status: 'active',
          originChapter: 2,
        },
      ],
      resolvedPlotThreads: [
        {
          id: 'thread-broken-sword',
          description: 'Who shattered the Ashen Sword before Li Wei inherited it.',
          status: 'resolved',
          originChapter: 0,
        },
      ],
    },
    arcs: [
      {
        title: 'Arc I — The Fallen Star',
        chapters,
        isCompleted: false,
      },
    ],
    currentChapterNumber: 4,
    intake: { genrePath: 'xianxia cultivation fate-survival' },
    hardcoreFateMode: false,
    imageUrl: CODEX_PREVIEW_IMAGE,
    imageHistory: [createCodexPreviewImage('story-cover', MOCK_STORY_ID, 'cover', 'Ashes of the Ninth Meridian')],
    relationships: [
      {
        id: 'relationship-li-mei',
        sourceCharId: 'c1',
        sourceCharName: 'Li Wei',
        targetCharId: 'c2',
        targetCharName: 'Mei Lin',
        affinity: 42,
        threat: 12,
        description: 'A reluctant alliance tempered by the Oath of Embers.',
        updatedAt: '2026-07-29T12:00:00.000Z',
      },
      {
        id: 'relationship-li-kang',
        sourceCharId: 'c1',
        sourceCharName: 'Li Wei',
        targetCharId: 'c3',
        targetCharName: 'Elder Kang',
        affinity: 70,
        description: 'A mentorship persisting beyond Elder Kang’s recorded death.',
        updatedAt: '2026-07-29T12:00:00.000Z',
      },
    ],
    karmaNodes: [
      {
        id: 'karma-ember-debt',
        sourceId: 'c1',
        sourceName: 'Li Wei',
        targetId: 'f1',
        targetName: 'Ninth Meridian Sect',
        description: 'The Oath binds every act of defiance to the Meridian ledger.',
        severity: 'Cosmic',
        type: 'Debt',
        status: 'active',
        createdAt: '2026-07-20T12:00:00.000Z',
      },
    ],
    readerPreferences: { ...mockReaderPreferences, highlightStyle: 'full' },
    bookmarks: createMockBookmarks(),
    assignedRevealBackdrops: {},
  };
}

export const ARC_TITLE = 'Arc I — The Fallen Star';
export const CURRENT_POWER_STAGE = 'Qi Condensation — Layer 9';

/** Explicit no-generated-batch fallback used only by the standalone preview. */
export function createMockReaderFallback() {
  return {
    kind: 'mock-fallback' as const,
    label: MOCK_READER_FALLBACK_LABEL,
    story: createMockStory(),
  };
}

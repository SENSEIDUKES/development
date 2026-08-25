import type { CardPreset } from '../../../components/card-workshop/shared/types';
import type { CodexTerm } from '@seihouse/sen/reader-codex';
import type { SystemPromptExpandedData } from '@seihouse/sen/reader-chamber';

const durableVisualImportance = {
  namedStatus: true,
  narrativeWeight: 'major' as const,
  recurrence: true,
  plotRelevance: true,
};

const BREAKTHROUGH_EXPANDED: SystemPromptExpandedData = {
  subject: {
    name: 'Yun Che',
    role: 'MC (You)',
  },
  sections: [
    {
      heading: 'Power Rankings',
      value: 'Foundation Establishment — Stage 4',
      progress: { value: 37, max: 100, label: '37/100' },
    },
    {
      heading: 'Karma Bond',
      detail: 'Yun Che’s successful breakthrough has angered Elder Han.',
      progress: { value: -75, min: -100, max: 100, label: '−75/100' },
      status: { label: 'Danger', tone: 'danger' },
      tone: 'danger',
    },
    {
      heading: 'Lore',
      detail: 'Foundation Establishment Stage 4 stabilizes the cultivator’s mortal meridians and extends natural lifespan by one century.',
    },
    {
      heading: 'Warning',
      detail: 'The tribulation signature can be tracked for seven days by cultivators above Yun Che’s current realm.',
      status: { label: 'Spirit Trace', tone: 'warning' },
      tone: 'warning',
    },
    {
      heading: 'Narrative Consequences',
      items: [
        'Elder Han will move openly against Yun Che.',
        'Nearby sects may investigate the tribulation site.',
      ],
    },
  ],
};

const BROKEN_PROMISE_EXPANDED: SystemPromptExpandedData = {
  subject: {
    name: 'Magistrate Jinhai',
    role: 'Rain Court Magistrate',
  },
  sections: [
    {
      heading: 'Reputation',
      value: 'Rain Court Standing — Disgraced',
      progress: { value: -64, min: -100, max: 100, label: '−64/100' },
      status: { label: 'Falling', tone: 'warning' },
      tone: 'warning',
    },
    {
      heading: 'Karma Bond',
      detail: 'Magistrate Jinhai’s broken oath has severed the Riverside Sect’s remaining trust.',
      progress: { value: -92, min: -100, max: 100, label: '−92/100' },
      status: { label: 'Danger', tone: 'danger' },
      tone: 'danger',
    },
    {
      heading: 'Lore',
      detail: 'Rain Court promises are witnessed by the Nine Cauldrons Oath Seal and entered into the public karmic record.',
    },
    {
      heading: 'Warning',
      detail: 'A second sworn breach will strip Magistrate Jinhai of the court’s spiritual protection.',
      status: { label: 'Oath Fracture', tone: 'warning' },
      tone: 'warning',
    },
    {
      heading: 'Narrative Consequences',
      items: [
        'Magistrate Jinhai loses access to Riverside Sect testimony.',
        'The Riverside Sect may demand judgment before the next court assembly.',
      ],
    },
  ],
};

const TARGET_SCAN_EXPANDED: SystemPromptExpandedData = {
  subject: {
    name: 'Elder Kaelen',
    role: 'Hostile Elder',
  },
  sections: [
    {
      heading: 'Power Rankings',
      value: 'Foundation Establishment — Stage 7',
      progress: { value: 82, max: 100, label: '82/100' },
    },
    {
      heading: 'Combat Profile',
      value: 'Spear Arts · Lightning Affinity',
      detail: 'Weakness: spiritual defense drops briefly after his third chained thrust.',
      status: { label: 'Moderate Threat', tone: 'warning' },
      tone: 'warning',
    },
    {
      heading: 'Karma Bond',
      detail: 'Elder Kaelen suspects Yun Che is concealing his true cultivation stage.',
      progress: { value: -48, min: -100, max: 100, label: '−48/100' },
      status: { label: 'Watchful', tone: 'warning' },
      tone: 'warning',
    },
    {
      heading: 'Lore',
      detail: 'Elder Kaelen is the Seventh Spear of the Northern Foundation Hall and favors direct suppression over negotiation.',
    },
    {
      heading: 'Warning',
      detail: 'Elder Kaelen detected the edge of Yun Che’s spiritual scan.',
      status: { label: 'Exposed', tone: 'danger' },
      tone: 'danger',
    },
    {
      heading: 'Narrative Consequences',
      items: [
        'Elder Kaelen will prepare a countermeasure before the next encounter.',
        'Yun Che can exploit the opening after the third chained thrust.',
      ],
    },
  ],
};

export const CARD_PRESETS: CardPreset[] = [
  {
    id: 'preset-human-character',
    title: 'Human Portrait',
    subtitle: 'Rin the First Witness',
    kind: 'codex-card',
    description: 'A human Portrait resolved from first-reveal metadata through the visual Codex path.',
    explanation: {
      componentName: 'CodexCard',
      sourceFile: 'src/components/reader-chamber/development/CodexCard.tsx',
      currentTrigger: 'metadata.entities character reveal resolves to an application-owned Human Portrait',
      entityOrEventType: 'character (human individual)',
      codexDestination: 'ReaderCodex > Portraits (Human Section)',
      capabilities: { hasImage: true, hasManifestAction: true, hasAudio: false, hasCodexLink: true, hasQuoteOrProse: true },
      architecturalNotes: 'The Reader uses stored Codex media and never accepts a model-generated Codex ID or image URL. Any inline World Cue remains a separate prose action beside the Codex link.',
    },
    codexReveal: {
      // The on-card eyebrow shows the same production label every Codex
      // character card uses ('character' → "CHARACTER"), regardless of
      // Human/Non-Human portraitKind. The preset id, category, and
      // portraitKind still carry the Human/Non-Human distinction for
      // routing and generation.
      type: 'character',
      entry: {
        id: 'codex-char-rin',
        name: 'Rin',
        description: 'A disgraced oath-reader who can see where sacred vows fray in the atmospheric rain.',
        portraitKind: 'human',
        imageUrl: '/card-workshop/test-images/ye_chen_portrait.png',
        manifestationImportance: durableVisualImportance,
      },
    },
  },
  {
    id: 'preset-nonhuman-individual',
    title: 'Non-Human Portrait',
    subtitle: 'Lei the Thunder Drake Companion',
    kind: 'codex-card',
    description: 'A persistent named non-human individual resolved as a Portrait, not a species image.',
    explanation: {
      componentName: 'CodexCard',
      sourceFile: 'src/components/reader-chamber/development/CodexCard.tsx',
      currentTrigger: 'metadata.entities character reveal resolves to a Portrait with portraitKind: "non-human"',
      entityOrEventType: 'character (important non-human individual)',
      codexDestination: 'ReaderCodex > Portraits (Non-Human Section) + Bestiary link',
      capabilities: { hasImage: true, hasManifestAction: true, hasAudio: false, hasCodexLink: true, hasQuoteOrProse: true },
      architecturalNotes: 'Named, bonded, intelligent, or recurring individuals are character-owned Portraits. Their species remains informational, and inline World Cues stay independent from the card.',
    },
    codexReveal: {
      // See the Human preset above: the eyebrow reads "CHARACTER" like real
      // Reader cards, while portraitKind keeps the Non-Human routing intact.
      type: 'character',
      entry: {
        id: 'codex-char-lei',
        name: 'Lei',
        description: 'A young thunder dragon whose scales hold living arcs of celestial lightning.',
        portraitKind: 'non-human',
        speciesName: 'Thunder Dragons',
        imageUrl: '/card-workshop/test-images/lyra_meadowlight_portrait.png',
        manifestationImportance: durableVisualImportance,
      },
    },
  },
  {
    id: 'preset-artifact-relic',
    title: 'Artifact',
    subtitle: 'Nine Cauldrons Oath Seal',
    kind: 'codex-card',
    description: 'A visually presented Artifact resolved through the Codex reveal path.',
    explanation: {
      componentName: 'CodexCard',
      sourceFile: 'src/components/reader-chamber/development/CodexCard.tsx',
      currentTrigger: 'metadata.entities artifact reveal resolves to the stored Artifact entry',
      entityOrEventType: 'artifact',
      codexDestination: 'ReaderCodex > Artifacts',
      capabilities: { hasImage: true, hasManifestAction: true, hasAudio: false, hasCodexLink: true, hasQuoteOrProse: true },
      architecturalNotes: 'Existing artwork displays from the Codex; an eligible missing image retains the existing Manifest action. A World Cue may sit beside this name in prose without becoming part of the card.',
    },
    codexReveal: {
      type: 'Artifact',
      entry: {
        id: 'codex-art-oath-seal',
        name: 'Nine Cauldrons Oath Seal',
        description: 'Forged during the Second Era to enforce non-aggression treaties between mortal dynasties.',
        imageUrl: '/card-workshop/test-images/elder_kaelen_portrait.png',
        manifestationImportance: durableVisualImportance,
      },
    },
  },
  {
    id: 'preset-location',
    title: 'Location',
    subtitle: 'Rain Court Grand Pavilion',
    kind: 'codex-card',
    description: 'A visually presented Location resolved through the Codex reveal path.',
    explanation: {
      componentName: 'CodexCard',
      sourceFile: 'src/components/reader-chamber/development/CodexCard.tsx',
      currentTrigger: 'metadata.entities location reveal resolves to the stored Location entry',
      entityOrEventType: 'location',
      codexDestination: 'ReaderCodex > Locations',
      capabilities: { hasImage: true, hasManifestAction: true, hasAudio: false, hasCodexLink: true, hasQuoteOrProse: true },
      architecturalNotes: 'The card displays application-owned Codex artwork or the existing Manifest state. Its Codex action stays separate from any adjacent World Cue glyph.',
    },
    codexReveal: {
      type: 'Location',
      entry: {
        id: 'codex-loc-rain-court',
        name: 'Rain Court Grand Pavilion',
        description: 'The ancient administrative center where false vows trigger celestial thunder.',
        imageUrl: '/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg',
        manifestationImportance: durableVisualImportance,
      },
    },
  },
  {
    id: 'preset-faction',
    title: 'Faction',
    subtitle: 'The Riverside Sect',
    kind: 'codex-card',
    description: 'A visually presented Faction resolved through the Codex reveal path.',
    explanation: {
      componentName: 'CodexCard',
      sourceFile: 'src/components/reader-chamber/development/CodexCard.tsx',
      currentTrigger: 'metadata.entities faction reveal resolves to the stored Faction entry',
      entityOrEventType: 'faction',
      codexDestination: 'ReaderCodex > Factions',
      capabilities: { hasImage: true, hasManifestAction: true, hasAudio: false, hasCodexLink: true, hasQuoteOrProse: true },
      architecturalNotes: 'Factions share the Codex reveal path with Artifacts and Locations. Their crest artwork is application-owned, and an eligible missing image keeps the Manifest action.',
    },
    codexReveal: {
      type: 'Faction',
      entry: {
        id: 'codex-fac-riverside-sect',
        name: 'Riverside Sect',
        description: 'An upriver cultivation sect that keeps the Rain Court honest by witnessing every oath sworn before the Nine Cauldrons.',
        imageUrl: '/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg',
        manifestationImportance: durableVisualImportance,
      },
    },
  },
  {
    id: 'preset-system-prompt',
    title: 'System Prompt',
    subtitle: 'In-World Celestial Library Notification',
    kind: 'system-block',
    description: 'Regular System Prompts use one explicit presentation family: Narrative Notification, LitRPG/Mechanical Display, or World Notice. The default Narrative Notification is the existing dark smoky event-tinted System window, with a direct event title, semantic classification, concise rows, optional badge, prioritized outcomes, and collapsed TTS prose; its celestial action opens the existing Codex-shaped event report above the reader. The Mechanical Display retains the existing holographic row panel. World Notice is a static, diegetic document surface for a single notice or a divided board.',
    explanation: {
      componentName: 'SystemBlock',
      sourceFile: 'src/components/reader-chamber/development/SystemBlock.tsx',
      currentTrigger: 'Structured block.system (kind: "system_prompt")',
      entityOrEventType: 'system (system_prompt)',
      codexDestination: 'ReaderCodex > Power Rankings / Ability Ledger / Karma',
      capabilities: { hasImage: false, hasManifestAction: false, hasAudio: false, hasCodexLink: true, hasQuoteOrProse: true },
      architecturalNotes: 'Regular System Prompt presentation is explicit: Narrative Notification preserves the compact/expanded event card, LitRPG/Mechanical Display preserves the holographic rows panel, and World Notice is one static diegetic document renderer for a single notice or a divided board. promptType only carries semantic meaning and color across those layouts. A World Notice accepts a direct document title, optional flavor, and one or more plain-text entries with optional labeled details; it has no controls, links, hovercards, or narration ownership. Narrative expanded data opens after an explicit tap as a viewport-locked overlay event report while the compact card and reader position stay untouched. Legacy saved regular prompts preserve their prior row-shape fallback.',
    },
    systemContent: '[ A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before. ]',
    systemEvent: {
      kind: 'system_prompt',
      presentation: 'narrative',
      promptType: 'breakthrough',
      title: 'Cultivation Breakthrough',
      flavor: 'Mortal Tribulation Surpassed',
      expanded: BREAKTHROUGH_EXPANDED,
      rows: [
        { label: 'New Realm', value: 'Foundation Establishment', trend: 'up' },
        { label: 'Meridian State', value: 'Widened', trend: 'up' },
      ],
      changes: [
        { direction: 'gain', label: 'Realm Ascended' },
        { direction: 'gain', label: 'Lifespan 100' },
        { direction: 'loss', label: 'Presence Exposed', tone: 'warning' },
      ],
    },
  },
  {
    id: 'preset-fate-system-prompt',
    title: 'Fate System Prompt',
    subtitle: 'FATE SCARRED — The Price of Defiance',
    kind: 'fate-result',
    description: 'Fate Survival destiny outcome card with irreversible narrative consequences and permanent costs.',
    explanation: {
      componentName: 'FateResultCard (inside SystemBlock)',
      sourceFile: 'src/components/reader-chamber/development/FateResultCard.tsx',
      currentTrigger: 'Structured block.system (kind: "fate_system_prompt")',
      entityOrEventType: 'fate_system_prompt',
      codexDestination: 'ReaderCodex > Fate & Destiny Sovereign',
      capabilities: { hasImage: false, hasManifestAction: false, hasAudio: false, hasCodexLink: true, hasQuoteOrProse: true },
      architecturalNotes: 'Fate Survival contract strictly requiring a valid fateResult payload.',
    },
    systemContent: '[ FATE SCARRED: Rin shattered the Magistrate\'s Blood Oath at great personal cost ]',
    systemEvent: {
      kind: 'fate_system_prompt',
      title: 'Destiny Divergence Manifested',
      fateResult: {
        outcome: 'FATE SCARRED',
        timelineScar: 'Left arm spiritual meridians permanently sealed against celestial Qi.',
        permanentCosts: [
          'Cannot channel direct lightning or thunderstorm arts without severe backlash.',
          'Disabled off-hand spellcasting',
          'Rain sight limited to right eye',
        ],
        newStoryState: 'First false oath exposed before the Rain Court',
        newActiveStats: ['Willpower +25', 'Left Arm Flow: 0%', 'Karmic Weight: Heavy'],
      },
    },
  },
  {
    id: 'preset-manifestation-image',
    title: 'Manifestation Image',
    subtitle: 'Chapter 1 Crux Visual Memory',
    kind: 'manifestation-image',
    referenceOnly: true,
    description: 'Legacy chapter-level artwork retained only for the locked production Reference pane.',
    explanation: {
      componentName: 'ManifestationImage',
      sourceFile: 'src/components/reader-chamber/reference/ManifestationImage.tsx',
      currentTrigger: 'Legacy Reference snapshot only',
      entityOrEventType: 'chapter_crux_image (not an active entity card)',
      codexDestination: 'Legacy Reference snapshot only',
      capabilities: { hasImage: true, hasManifestAction: false, hasAudio: false, hasCodexLink: false, hasQuoteOrProse: true },
      architecturalNotes: 'Chapter Visual Memories are removed from the active Reader and Development Workshop.',
    },
    manifestationImage: {
      url: '/card-workshop/test-images/sergeant_anya_petrova_portrait.png',
      caption: 'The Rain Court Stands in Silence as the Broken Oath Is Revealed',
      chapterNumber: 1,
      quote: '"Your oath has a seam, Magistrate."',
    },
  },
];

/** Active Workshop presets exclude legacy production-reference snapshots. */
export const ACTIVE_CARD_PRESETS = CARD_PRESETS.filter(preset => !preset.referenceOnly);

/** Named character entries used to prove System Prompt prose reuses Codex identity colors and links. */
export const SYSTEM_PROMPT_CHARACTER_TERMS: CodexTerm[] = [
  {
    term: 'Yun Che',
    type: 'character',
    isCanonicalName: true,
    entry: {
      id: 'card-workshop-system-yun-che',
      name: 'Yun Che',
      role: 'Main character',
      status: 'alive',
      relationshipToMC: 'self',
      description: 'A cultivator who survived the mortal tribulation and entered Foundation Establishment.',
      portraitKind: 'human',
    },
  },
  {
    term: 'Elder Han',
    type: 'character',
    isCanonicalName: true,
    entry: {
      id: 'card-workshop-system-elder-han',
      name: 'Elder Han',
      role: 'Sect elder',
      status: 'alive',
      relationshipToMC: 'hostile enemy',
      description: 'A sect elder angered by Yun Che’s advancing cultivation and growing influence.',
      portraitKind: 'human',
    },
  },
  {
    term: 'Magistrate Jinhai',
    type: 'character',
    isCanonicalName: true,
    entry: {
      id: 'card-workshop-system-magistrate-jinhai',
      name: 'Magistrate Jinhai',
      role: 'Rain Court magistrate',
      status: 'alive',
      relationshipToMC: 'hostile official',
      description: 'An oathbound magistrate whose standing depends on the Rain Court accepting his word.',
      portraitKind: 'human',
    },
  },
  {
    term: 'Elder Kaelen',
    type: 'character',
    isCanonicalName: true,
    entry: {
      id: 'card-workshop-system-elder-kaelen',
      name: 'Elder Kaelen',
      role: 'Sect enforcer',
      status: 'alive',
      relationshipToMC: 'hostile enemy',
      description: 'A Foundation Establishment elder whose guarded stance marks him as an immediate threat.',
      portraitKind: 'human',
    },
  },
];

export const SYSTEM_PROMPT_PRESET_EXAMPLES = {
  breakthrough: {
    systemContent: '[ A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before. ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      presentation: 'narrative' as const,
      promptType: 'breakthrough' as const,
      title: 'Cultivation Breakthrough',
      flavor: 'Mortal Tribulation Surpassed',
      expanded: BREAKTHROUGH_EXPANDED,
      rows: [
        { label: 'New Realm', value: 'Foundation Establishment', trend: 'up' as const },
        { label: 'Meridian State', value: 'Widened', trend: 'up' as const },
      ],
      changes: [
        { direction: 'gain' as const, label: 'Realm Ascended' },
        { direction: 'gain' as const, label: 'Lifespan 100' },
        { direction: 'loss' as const, label: 'Presence Exposed', tone: 'warning' as const },
      ],
    },
  },
  'broken-promise': {
    systemContent: '[ A solemn interface surfaced before Magistrate Jinhai, its gilt script cold as the rain outside. ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      presentation: 'narrative' as const,
      promptType: 'choice_consequence' as const,
      title: 'Karmic Consequence',
      flavor: 'Oath Before the Rain Court Broken',
      expanded: BROKEN_PROMISE_EXPANDED,
      rows: [
        { label: 'Celestial Record', value: 'Sealed', trend: 'down' as const },
        { label: 'Witnesses', value: 'Twelve Elder Seats' },
      ],
      changes: [
        { direction: 'loss' as const, label: 'Karma 15' },
        { direction: 'loss' as const, label: 'Title Stripped' },
        { direction: 'gain' as const, label: 'Sect Enmity', tone: 'negative' as const },
      ],
    },
  },
  'target-scan': {
    systemContent: '[ A crimson interface unfolded beside Elder Kaelen, taking his measure in silence. Threat assessment: moderate. ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      presentation: 'narrative' as const,
      promptType: 'enemy_scan' as const,
      title: 'Hostile Target Scan',
      flavor: 'Elder Kaelen Assessment',
      expanded: TARGET_SCAN_EXPANDED,
      badge: {
        label: 'Threat Assessment',
        value: 'Moderate',
      },
      rows: [
        { label: 'Cultivation', value: 'Foundation Establishment, Stage 7' },
        { label: 'Stance', value: 'Guarded' },
      ],
      changes: [
        { direction: 'gain' as const, label: 'Intel Gained' },
        { direction: 'gain' as const, label: 'Weakness Found' },
        { direction: 'loss' as const, label: 'Detection Risk: High' },
      ],
    },
  },
  structured: {
    systemContent: '[ SYSTEM NOTIFICATION: Meridian Resonance 84% — Minor Bottleneck Cleared ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      presentation: 'mechanical' as const,
      promptType: 'progression' as const,
      title: 'STATUS // YUN CHE',
      flavor: 'Meridian Adept · Foundation Realm',
      status: {
        level: '24',
        bars: [
          { label: 'HP', value: 780, max: 780, display: '780 / 780', tone: 'health' as const },
          { label: 'QI', value: 1420, max: 1500, display: '1,420 / 1,500', tone: 'spirit' as const },
          { label: 'EXP', value: 62, max: 100, display: '62%', tone: 'progress' as const },
        ],
        stats: [
          { label: 'STR', value: '38' },
          { label: 'VIT', value: '44', delta: 3 },
          { label: 'AGI', value: '31', delta: -2 },
          { label: 'INT', value: '27' },
          { label: 'WIS', value: '35' },
          { label: 'LUCK', value: '12' },
        ],
        effects: [
          { name: 'Rain Attunement', detail: 'Qi Recovery', value: '+12/min', tone: 'positive' as const },
        ],
        abilities: [
          { name: 'Soul Seam Sight', detail: 'Range 30 paces' },
        ],
      },
    },
  },
  'guild-bounty': {
    systemContent: '[ A weathered guild notice is pinned beneath the lantern outside the east gate. ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      presentation: 'world_notice' as const,
      promptType: 'reward' as const,
      title: 'GUILD BOUNTY',
      flavor: 'West Gate Guild - East District Dispatch',
      worldNotice: {
        entries: [
          {
            title: 'BLACKTHORN WOLF PACK',
            body: 'Cull the pack preying on caravans along the Rain Road. Proof of the alpha is required.',
            details: [
              { label: 'Reward', value: '42 silver marks' },
              { label: 'Last seen', value: 'Old mill crossing' },
              { label: 'Issuer', value: 'West Gate Guild' },
            ],
          },
        ],
      },
    },
  },
  'mission-board': {
    systemContent: '[ The guild hall wall is crowded with fresh notices, each sealed by a different hand. ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      presentation: 'world_notice' as const,
      promptType: 'quest_update' as const,
      title: 'MISSION BRIEF',
      flavor: 'Rain Court Guild Hall - Morning postings',
      worldNotice: {
        entries: [
          {
            title: 'WANTED NOTICE: ASHEN KNIFE',
            body: 'Bring the smuggler alive for questioning after the river-market fire.',
            details: [
              { label: 'Reward', value: '60 silver marks' },
              { label: 'Jurisdiction', value: 'River Ward' },
            ],
          },
          {
            title: 'ESCORT CONTRACT: SALT CARAVAN',
            body: 'Three wagons depart at dusk. Hostile scouts were seen beyond the north bridge.',
            details: [
              { label: 'Term', value: 'Two days' },
              { label: 'Reward', value: '1 spirit stone' },
            ],
          },
          {
            title: 'MISSION: SHRINE LANTERNS',
            body: 'Relight the abandoned boundary lanterns before the rain reaches the lower road.',
            details: [
              { label: 'Priority', value: 'Urgent' },
              { label: 'Issuer', value: 'Wardens Office' },
            ],
          },
        ],
      },
    },
  },
};

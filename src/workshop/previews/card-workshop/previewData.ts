import type { CardPreset } from '../../../components/card-workshop/shared/types';

export const CARD_PRESETS: CardPreset[] = [
  // 1. Human Character
  {
    id: 'preset-human-character',
    title: 'Human Character',
    subtitle: 'Rin the First Witness',
    kind: 'world-entity',
    description: 'A major human protagonist or NPC presented as a full World Card event.',
    explanation: {
      componentName: 'WorldEntityCard',
      sourceFile: 'src/components/reader-chamber/development/WorldEntityCard.tsx',
      currentTrigger: '[SFX: Witness Bell] tag or chapter metadata block.worldCard with entityType: "character"',
      entityOrEventType: 'character (human)',
      codexDestination: 'ReaderCodex > Portraits (Human Section)',
      capabilities: {
        hasImage: true,
        hasManifestAction: false,
        hasAudio: true,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Renders full entity artwork, title, subtitle/role, quotation, and audio trigger button.',
    },
    worldCard: {
      entityType: 'character',
      entityName: 'Rin',
      displayTitle: 'First Witness of the Broken Oath',
      quote: 'Your oath has a seam, Magistrate. And seams unravel when the rain falls.',
      imageUrl: '/card-workshop/human-portrait.svg',
      sound: {
        assetId: 'witness_bell',
      },
    },
    codexReveal: {
      type: 'Character',
      entry: {
        id: 'codex-char-rin',
        name: 'Rin',
        description: 'A disgraced oath-reader who can see where sacred vows fray in the atmospheric rain.',
        portraitKind: 'human',
        imageUrl: '/card-workshop/human-portrait.svg',
      },
    },
  },

  // 2. Important Non-Human Individual
  {
    id: 'preset-nonhuman-individual',
    title: 'Non-Human Individual',
    subtitle: 'Lei the Thunder Drake Companion',
    kind: 'world-entity',
    description: 'A persistent named non-human companion with an awakenable portrait linked to a species.',
    explanation: {
      componentName: 'WorldEntityCard / CodexRevealCard',
      sourceFile: 'src/components/reader-chamber/development/WorldEntityCard.tsx / CodexRevealCard.tsx',
      currentTrigger: 'Character reveal with portraitKind: "non-human" and speciesName: "Thunder Dragons"',
      entityOrEventType: 'character (non-human individual)',
      codexDestination: 'ReaderCodex > Portraits (Non-Human Section) + links to Bestiary',
      capabilities: {
        hasImage: true,
        hasManifestAction: true,
        hasAudio: true,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Supports the Awaken Portrait / Manifest button if an image has not yet been generated.',
    },
    worldCard: {
      entityType: 'creature',
      entityName: 'Lei',
      displayTitle: 'Young Storm Sovereign',
      quote: 'The sky does not ask the mountain for permission to strike.',
      imageUrl: '/card-workshop/creature-portrait.svg',
      sound: {
        assetId: 'thunder_growl',
      },
    },
    codexReveal: {
      type: 'Companion',
      entry: {
        id: 'codex-char-lei',
        name: 'Lei',
        description: 'A young thunder dragon whose scales hold living arcs of celestial lightning.',
        portraitKind: 'non-human',
        speciesName: 'Thunder Dragons',
        manifestationImportance: {
          namedStatus: true,
          narrativeWeight: 'major',
          recurrence: true,
          plotRelevance: true,
        },
      },
    },
  },

  // 3. Non-Human Portrait reveal (same Codex Reveal family as Bestiary)
  {
    id: 'preset-nonhuman-portrait-reveal',
    title: 'Non-Human Portrait Reveal',
    subtitle: 'Lei the Thunder Drake Companion',
    kind: 'codex-reveal',
    description: 'The inline Reader Codex Reveal path for an important named non-human individual.',
    explanation: {
      componentName: 'CodexRevealCard',
      sourceFile: 'src/components/reader-chamber/development/CodexRevealCard.tsx',
      currentTrigger: 'First-reveal metadata resolves a persistent named non-human Portrait entry',
      entityOrEventType: 'character (non-human individual)',
      codexDestination: 'ReaderCodex > Portraits (Non-Human Section)',
      capabilities: {
        hasImage: true,
        hasManifestAction: true,
        hasAudio: false,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Uses the same extracted inline reveal component as ReaderViewport; it is not a new card family.',
    },
    codexReveal: {
      type: 'Companion',
      entry: {
        id: 'codex-char-lei-reveal',
        name: 'Lei',
        description: 'A young thunder dragon whose scales hold living arcs of celestial lightning.',
        portraitKind: 'non-human',
        speciesName: 'Thunder Dragons',
        imageUrl: '/card-workshop/creature-portrait.svg',
        manifestationImportance: {
          namedStatus: true,
          narrativeWeight: 'major',
          recurrence: true,
          plotRelevance: true,
        },
      },
    },
  },

  // 4. Generic Creature Species (Bestiary Species Reveal)
  {
    id: 'preset-creature-species',
    title: 'Generic Creature Species',
    subtitle: 'Shadow Void Stalker',
    kind: 'codex-reveal',
    description: 'A wild beast or monster species record routed strictly to the Bestiary.',
    explanation: {
      componentName: 'CodexRevealCard',
      sourceFile: 'src/components/reader-chamber/development/CodexRevealCard.tsx',
      currentTrigger: 'Bestiary species introduction (creature without named individual status)',
      entityOrEventType: 'creature (species)',
      codexDestination: 'ReaderCodex > Bestiary',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Species entries show classification and threat notes without personal character portrait actions.',
    },
    worldCard: {
      entityType: 'creature',
      entityName: 'Shadow Void Stalker',
      displayTitle: 'Apex Abyss Beast',
      quote: 'It walks between breaths, leaving frost where blood once flowed.',
    },
    codexReveal: {
      type: 'Bestiary Species',
      entry: {
        id: 'codex-species-void-stalker',
        name: 'Shadow Void Stalker',
        description: 'Predatory hunters that phase through dim light and feast on unrefined spiritual energy.',
        manifestationImportance: {
          namedStatus: false,
          narrativeWeight: 'minor',
        },
      },
    },
  },

  // 4. Artifact or Relic
  {
    id: 'preset-artifact-relic',
    title: 'Artifact or Relic',
    subtitle: 'Nine Cauldrons Oath Seal',
    kind: 'world-entity',
    description: 'A divine weapon, ancient relic, or key story talisman.',
    explanation: {
      componentName: 'WorldEntityCard / CodexRevealCard',
      sourceFile: 'src/components/reader-chamber/development/WorldEntityCard.tsx',
      currentTrigger: 'Artifact revelation or relic discovery',
      entityOrEventType: 'artifact',
      codexDestination: 'ReaderCodex > Artifacts',
      capabilities: {
        hasImage: true,
        hasManifestAction: false,
        hasAudio: true,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Displays artifact tier, grade, binding requirements, and origin lore.',
    },
    worldCard: {
      entityType: 'artifact',
      entityName: 'Nine Cauldrons Oath Seal',
      displayTitle: 'Heaven-Grade Sovereign Talisman',
      quote: 'When stamped in jade, even the gods must honor the recorded covenant.',
      imageUrl: '/card-workshop/artifact-seal.svg',
    },
    codexReveal: {
      type: 'Artifact',
      entry: {
        id: 'codex-art-oath-seal',
        name: 'Nine Cauldrons Oath Seal',
        description: 'Forged during the Second Era to enforce non-aggression treaties between mortal dynasties.',
        imageUrl: '/card-workshop/artifact-seal.svg',
      },
    },
  },

  // 5. Location
  {
    id: 'preset-location',
    title: 'Location',
    subtitle: 'Rain Court Grand Pavilion',
    kind: 'world-entity',
    description: 'A sovereign palace, forbidden sect domain, or mysterious realm landmark.',
    explanation: {
      componentName: 'WorldEntityCard / CodexRevealCard',
      sourceFile: 'src/components/reader-chamber/development/WorldEntityCard.tsx',
      currentTrigger: 'New location discovery or major scene transition',
      entityOrEventType: 'location',
      codexDestination: 'ReaderCodex > Locations & Sects',
      capabilities: {
        hasImage: true,
        hasManifestAction: false,
        hasAudio: true,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Shows societal structure, sovereign ruler, and geographical atmospheric effects.',
    },
    worldCard: {
      entityType: 'location',
      entityName: 'Rain Court Grand Pavilion',
      displayTitle: 'Seat of Judicial Inscriptions',
      quote: 'Built over three thousand oath springs, every stone echoes with remembered truth.',
      imageUrl: '/card-workshop/rain-court.svg',
    },
    codexReveal: {
      type: 'Location',
      entry: {
        id: 'codex-loc-rain-court',
        name: 'Rain Court Grand Pavilion',
        description: 'The ancient administrative center where false vows trigger celestial thunder.',
        imageUrl: '/card-workshop/rain-court.svg',
      },
    },
  },

  // 6. Faction
  {
    id: 'preset-faction',
    title: 'Faction',
    subtitle: 'The Ninth House of Oaths',
    kind: 'world-entity',
    description: 'An ancient sect, martial alliance, or clandestine syndicate.',
    explanation: {
      componentName: 'WorldEntityCard',
      sourceFile: 'src/components/reader-chamber/development/WorldEntityCard.tsx',
      currentTrigger: 'Faction alignment introduction',
      entityOrEventType: 'faction',
      codexDestination: 'ReaderCodex > Locations & Sects',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Surfaces faction creed, hierarchy, and political standing with the MC.',
    },
    worldCard: {
      entityType: 'faction',
      entityName: 'The Ninth House of Oaths',
      displayTitle: 'Judicial Enforcement Syndicate',
      quote: 'A word spoken is an anchor cast into the river of fate.',
    },
  },

  // 7. System Status Panel
  {
    id: 'preset-system-status',
    title: 'System Status',
    subtitle: 'Cultivation Meridian Alignment',
    kind: 'system-block',
    description: 'A structured RPG status window showing stats, stage, and progression meters.',
    explanation: {
      componentName: 'SystemBlock',
      sourceFile: 'src/components/reader-chamber/development/SystemBlock.tsx',
      currentTrigger: 'Prose lines formatted with brackets or system packet status updates',
      entityOrEventType: 'system (status)',
      codexDestination: 'ReaderCodex > Power Rankings',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Renders glowing cyan borders with monospace tabular stat progression rows.',
    },
    systemContent: '[ SYSTEM NOTIFICATION: Meridian Resonance 84% — Minor Bottleneck Cleared ]',
    systemEvent: {
      kind: 'status',
      title: 'Meridian Status & Vitality Flow',
      rarity: 'First Witness Core Resonance',
      rows: [
        { label: 'Cultivation Stage', value: 'Foundation Establishment — Stage 4' },
        { label: 'Spiritual Qi Pool', value: '1,420 / 1,500 (+12/min in Rain)' },
        { label: 'Soul Seam Sight', value: 'Active (Radius: 30 paces)' },
        { label: 'Dao Alignment', value: 'Unbroken Celestial Truth' },
      ],
    },
  },

  // 8. Skill Acquisition
  {
    id: 'preset-skill-acquired',
    title: 'Skill Acquisition',
    subtitle: 'Cloud Steps & Seam Stride',
    kind: 'system-block',
    description: 'Instant notification when the protagonist unlocks or masters a martial technique.',
    explanation: {
      componentName: 'SystemBlock',
      sourceFile: 'src/components/reader-chamber/development/SystemBlock.tsx',
      currentTrigger: 'Skill master or inheritance unlock event',
      entityOrEventType: 'system (skill_acquired)',
      codexDestination: 'ReaderCodex > Power Rankings (Ability Ledger)',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Highlights skill grade, consumption cost, and active battle description.',
    },
    systemContent: '[ SKILL ACQUIRED: Seam Stride (Earth Grade — Initial Mastery) ]',
    systemEvent: {
      kind: 'skill_acquired',
      title: 'New Technique Comprehended',
      rarity: 'Earth Grade · Movement Dao',
      rows: [
        { label: 'Skill Name', value: 'Seam Stride' },
        { label: 'Grade', value: 'Earth Grade (Tier 2)' },
        { label: 'Cost', value: '35 Qi per stride' },
        { label: 'Effect', value: 'Phases along the shortest path between two observed vow lines.' },
      ],
    },
  },

  // 9. Level-Up / Breakthrough
  {
    id: 'preset-level-up',
    title: 'Level-Up / Breakthrough',
    subtitle: 'Core Formation Breakthrough',
    kind: 'system-block',
    description: 'Major narrative breakthrough with golden ascension borders and massive stat leaps.',
    explanation: {
      componentName: 'SystemBlock',
      sourceFile: 'src/components/reader-chamber/development/SystemBlock.tsx',
      currentTrigger: 'Realm ascension or breakthrough threshold reached',
      entityOrEventType: 'system (level_up)',
      codexDestination: 'ReaderCodex > Power Rankings',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Features golden glow highlights and triumphant milestone presentation.',
    },
    systemContent: '[ BREAKTHROUGH: Core Formation Stage 1 Reached — Longevity +150 Years ]',
    systemEvent: {
      kind: 'level_up',
      title: 'Ascension Milestone Achieved',
      rarity: 'Mortal Tribulation Surpassed',
      rows: [
        { label: 'Previous Realm', value: 'Foundation Establishment Peak' },
        { label: 'New Realm', value: 'Core Formation — Stage 1' },
        { label: 'Lifespan Extension', value: '+150 Solar Cycles' },
        { label: 'Divine Sense', value: 'Expanded to 500 Meters' },
      ],
    },
  },

  // 10. Quest & Appraisal
  {
    id: 'preset-quest-appraisal',
    title: 'Quest & Appraisal',
    subtitle: 'Trial of the Sovereign Seal',
    kind: 'system-block',
    description: 'System-mandated mission objectives with rewards and deadline conditions.',
    explanation: {
      componentName: 'SystemBlock',
      sourceFile: 'src/components/reader-chamber/development/SystemBlock.tsx',
      currentTrigger: 'Quest announcement or item appraisal prompt',
      entityOrEventType: 'system (quest / appraisal)',
      codexDestination: 'ReaderCodex > Karma Ledger & Threads',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Presents structured objectives, failure penalties, and success boons.',
    },
    systemContent: '[ QUEST ISSUED: Uncover the Magistrate\'s Forged Decree Before Dusk ]',
    systemEvent: {
      kind: 'quest',
      title: 'Mandatory Karmic Task',
      rarity: 'Time Limit: 4 Hours',
      rows: [
        { label: 'Primary Objective', value: 'Inspect the 7th Archive without tripping blood wards' },
        { label: 'Success Reward', value: 'Heavenly Oath Fragment x 1' },
        { label: 'Failure Penalty', value: 'Meridian Backlash (Loss of Stage 1 Qi)' },
      ],
    },
  },

  // 11. Fate Result Card (Rendered through real SystemBlock path)
  {
    id: 'preset-fate-result',
    title: 'Fate Result Card',
    subtitle: 'FATE SCARRED — The Price of Defiance',
    kind: 'fate-result',
    description: 'High-stakes collectible Destiny Outcome card with irreversible narrative consequences.',
    explanation: {
      componentName: 'FateResultCard (inside SystemBlock)',
      sourceFile: 'src/components/reader-chamber/development/FateResultCard.tsx',
      currentTrigger: 'Fate Survival decision resolution with system.fateResult data',
      entityOrEventType: 'fate_result',
      codexDestination: 'ReaderCodex > Fate & Destiny Sovereign',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: true,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Delegated seamlessly from SystemBlock whenever system.fateResult is present.',
    },
    systemContent: '[ FATE SCARRED: Rin shattered the Magistrate\'s Blood Oath at great personal cost ]',
    systemEvent: {
      kind: 'fate_result',
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
        newActiveStats: [
          'Willpower +25',
          'Left Arm Flow: 0%',
          'Karmic Weight: Heavy',
        ],
      },
    },
  },

  // 12. End-of-Chapter Manifestation Image (Chapter Visual)
  {
    id: 'preset-manifestation-image',
    title: 'Manifestation Image',
    subtitle: 'Chapter 1 Crux Visual Memory',
    kind: 'manifestation-image',
    description: 'Chapter-level heroic artwork summarizing the emotional climax of the episode.',
    explanation: {
      componentName: 'ManifestationImage',
      sourceFile: 'src/components/reader-chamber/development/ManifestationImage.tsx',
      currentTrigger: 'selectedChapter.assetManifest.heroImage at chapter conclusion',
      entityOrEventType: 'chapter_crux_image (not an entity card)',
      codexDestination: 'ReaderCodex > Visual Timeline Recaps',
      capabilities: {
        hasImage: true,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: false,
        hasQuoteOrProse: true,
      },
      architecturalNotes: 'Distinct from entity cards; represents chapter-wide visual memory and narrative payoff.',
    },
    manifestationImage: {
      url: '/card-workshop/chapter-memory.svg',
      caption: 'The Rain Court Stands in Silence as the Broken Oath Is Revealed',
      chapterNumber: 1,
      quote: '"Your oath has a seam, Magistrate."',
    },
  },

  // 13. Routing Under Review: World Card used for System Event
  {
    id: 'preset-review-system-worldcard',
    title: 'Routing Under Review: System as World Card',
    subtitle: 'System Notification routed through WorldCardEvent',
    kind: 'under-review-route',
    description: 'Example of current system prompt output routed as a WorldCardEvent rather than a SystemBlock.',
    explanation: {
      componentName: 'WorldEntityCard (System Routing)',
      sourceFile: 'src/components/reader-chamber/development/WorldEntityCard.tsx',
      currentTrigger: 'WorldCardEvent with entityType: "system"',
      entityOrEventType: 'system (routed as world card)',
      codexDestination: 'None / Ephemeral card display',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: false,
        hasQuoteOrProse: true,
      },
      architecturalNotes: '⚠️ CURRENT ROUTING UNDER REVIEW: Overlaps with SystemBlock. Kept visible for audit without modifying prompts.',
    },
    worldCard: {
      entityType: 'system',
      entityName: 'System Alert',
      displayTitle: 'Celestial Law Boundary Triggered',
      quote: 'Direct spiritual interference detected in mortal jurisdiction.',
    },
  },

  // 14. Routing Under Review: World Card used for Fate Event
  {
    id: 'preset-review-fate-worldcard',
    title: 'Routing Under Review: Fate as World Card',
    subtitle: 'Fate Event routed through WorldCardEvent',
    kind: 'under-review-route',
    description: 'Example of fate divergence output formatted as a simple World Card instead of a FateResultCard.',
    explanation: {
      componentName: 'WorldEntityCard (Fate Event Routing)',
      sourceFile: 'src/components/reader-chamber/development/WorldEntityCard.tsx',
      currentTrigger: 'WorldCardEvent with entityType: "fate_event"',
      entityOrEventType: 'fate_event (routed as world card)',
      codexDestination: 'None / Ephemeral card display',
      capabilities: {
        hasImage: false,
        hasManifestAction: false,
        hasAudio: false,
        hasCodexLink: false,
        hasQuoteOrProse: true,
      },
      architecturalNotes: '⚠️ CURRENT ROUTING UNDER REVIEW: Overlaps with FateResultCard / SystemBlock. Preserved for inspection.',
    },
    worldCard: {
      entityType: 'fate_event',
      entityName: 'Fate Divergence',
      displayTitle: 'The Unwoven River',
      quote: 'A thread of causality has snapped. The river will carve a new channel.',
    },
  },
];

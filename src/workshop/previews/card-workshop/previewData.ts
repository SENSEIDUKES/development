import type { CardPreset } from '../../../components/card-workshop/shared/types';

const durableVisualImportance = {
  namedStatus: true,
  narrativeWeight: 'major' as const,
  recurrence: true,
  plotRelevance: true,
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
      type: 'Human Portrait',
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
      type: 'Non-Human Portrait',
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
    id: 'preset-system-prompt',
    title: 'System Prompt',
    subtitle: 'In-World Celestial Library Notification',
    kind: 'system-block',
    description: 'Universal in-world System Prompt panel. Default output is a dramatic headline, one concise literary sentence, and one horizontal row of up to four signed consequences, with optional structured mechanical rows when a novel calls for them.',
    explanation: {
      componentName: 'SystemBlock',
      sourceFile: 'src/components/reader-chamber/development/SystemBlock.tsx',
      currentTrigger: 'Structured block.system (kind: "system_prompt")',
      entityOrEventType: 'system (system_prompt)',
      codexDestination: 'ReaderCodex > Power Rankings / Ability Ledger / Karma',
      capabilities: { hasImage: false, hasManifestAction: false, hasAudio: false, hasCodexLink: true, hasQuoteOrProse: true },
      architecturalNotes: 'Universal System Prompt contract supporting a dramatic headline, a concise literary message (the only text narration reads), a signed consequence row (structured, max four, priority order), and optional structured mechanical rows.',
    },
    systemContent: '[ Yun Che has successfully broken through into the Foundation Establishment realm. ]',
    systemEvent: {
      kind: 'system_prompt',
      promptType: 'breakthrough',
      title: 'Mortal Tribulation Surpassed',
      changes: [
        { direction: 'gain', label: 'Stage 4' },
        { direction: 'gain', label: '100 Lifespan' },
        { direction: 'loss', label: 'Easier to Detect' },
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

export const SYSTEM_PROMPT_PRESET_EXAMPLES = {
  breakthrough: {
    systemContent: '[ Yun Che has successfully broken through into the Foundation Establishment realm. ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      promptType: 'breakthrough' as const,
      title: 'Mortal Tribulation Surpassed',
      changes: [
        { direction: 'gain' as const, label: 'Stage 4' },
        { direction: 'gain' as const, label: '100 Lifespan' },
        { direction: 'loss' as const, label: 'Easier to Detect' },
      ],
    },
  },
  'broken-promise': {
    systemContent: '[ The Magistrate\'s sworn promise to the Riverside Sect lies broken. ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      promptType: 'choice_consequence' as const,
      title: 'Oath Before the Rain Court Broken',
      changes: [
        { direction: 'loss' as const, label: 'Reputation' },
        { direction: 'loss' as const, label: 'Karma Bond' },
        { direction: 'gain' as const, label: 'Sect Enmity' },
      ],
    },
  },
  'target-scan': {
    systemContent: '[ Elder Kaelen — Foundation Establishment, Stage 7. Threat assessment: moderate. ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      promptType: 'enemy_scan' as const,
      title: 'Hostile Target Scan Complete',
      changes: [
        { direction: 'gain' as const, label: 'Intel' },
        { direction: 'gain' as const, label: 'Weakness Identified' },
        { direction: 'loss' as const, label: 'Presence Exposed' },
      ],
    },
  },
  structured: {
    systemContent: '[ SYSTEM NOTIFICATION: Meridian Resonance 84% — Minor Bottleneck Cleared ]',
    systemEvent: {
      kind: 'system_prompt' as const,
      promptType: 'progression' as const,
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
};

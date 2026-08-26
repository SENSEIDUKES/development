/**
 * The packages DEV publishes, and the boundary each one is held to.
 *
 * `@seihouse/sen` is the portable expanded-narrative engine: an author or
 * company installs it inside their own application and supplies their own
 * writing, branding, storage, authentication, and generation method.
 * `@seihouse/library` is SEIHouse's first-party host application — the
 * branded implementation of SEN. Library may depend on SEN; SEN must never
 * depend on Library, and neither may reach the Workshop shell, its previews
 * and mocks, or `src/server/`.
 *
 * Every build, boundary, and smoke script reads these descriptors, so the
 * two packages stay verified the same way.
 */

/** Import paths no published package may reach, whichever lane it is in. */
const NEVER_PUBLISHED = [
  ['src/workshop/', 'Workshop shell or preview mock'],
  ['src/server/', 'server module'],
  ['src/components/card-workshop/', 'Workshop-only card workshop view'],
];

/** Source directories owned by the Library lane. */
export const LIBRARY_OWNED = [
  'src/components/closed-door-cultivation/',
  'src/components/relics/',
  'src/package/library/',
];

export const PACKAGE_TARGETS = {
  sen: {
    id: 'sen',
    name: '@seihouse/sen',
    sourceDirectory: 'src/package/sen',
    distDirectory: 'dist/sen',
    styleSheet: 'sen.css',
    /** Entries that carry no styling and must not import the stylesheet. */
    unstyledEntries: ['audio'],
    viteConfig: 'vite.package.config.ts',
    tsconfig: 'tsconfig.package.json',
    forbiddenBundleContents: [
      ...NEVER_PUBLISHED,
      ...LIBRARY_OWNED.map(path => [path, 'Library-owned surface']),
    ],
    /** Runtime assets the published components address from root paths. */
    assets: [
      'favicon.jpg',
      'icons/book-scroll.svg',
      'icons/cultivator.svg',
      'icons/sacred-tree.svg',
      'icons/shen-long-dragon.svg',
      'icons/thunder-cloud.svg',
      'icons/yin-yang.svg',
      'manifest-backdrops/immortal-land-1.jpg',
      'manifest-backdrops/immortal-land-2.jpg',
      'manifest-backdrops/immortal-land-3.jpg',
      'manifest-backdrops/immortal-land-4.jpg',
      'manifest-backdrops/immortal-land-5.jpg',
      'story-seed/library-auth-backdrop.jpg',
    ],
    /** Tarballs a smoke consumer must install before this one. */
    typeDependencies: [],
    smokeDependencies: [],
    /** Named exports the packed consumer must be able to import and bundle. */
    smokeExports: {
      '@seihouse/sen': ['LibraryPanel', 'SEN_PACKAGE_VERSION'],
      '@seihouse/sen/ui': ['LibraryPanel', 'ManifestButton', 'ParticleEffect'],
      '@seihouse/sen/color-codes': ['COLOR_CODES', 'getColorCodeValue', 'resolveCodexEntityColorCode'],
      '@seihouse/sen/cards': [
        'LibraryCard',
        'CodexCard',
        'CodexHovercard',
        'CharacterCard',
        'resolveCodexEntityAccent',
        'SystemBlock',
        'WorldNotice',
        'FateResultCard',
        'resolveSystemPromptRoute',
        'normalizeFateResultData',
        'normalizeSystemStatusScreen',
        'normalizeWorldNoticeData',
      ],
      '@seihouse/sen/reader-chamber': [
        'ReaderChamber',
        'ReaderViewport',
        'SystemBlock',
        'WorldNotice',
        'FateResultCard',
        'resolveSystemPromptRoute',
      ],
      '@seihouse/sen/reader-codex': ['ReaderCodex', 'CodexSheetOverlay'],
      '@seihouse/sen/manifestations': ['ManifestationChamber', 'ManifestationReveal'],
      '@seihouse/sen/audio': ['loadLibraryCues', 'resolveWorldCueIntent'],
      '@seihouse/sen/story-seed': ['CreationModal', 'createEmptyStorySeedInput', 'parseStorySeedJson'],
      '@seihouse/sen/chapter-generation': [
        'ChapterGenerationTestFlow',
        'adaptFinalizedStorySeedToChapterContracts',
        'runFiveChapterBatch',
      ],
      // The compatibility aliases kept for one version.
      '@seihouse/sen/library': ['LibraryPanel'],
      '@seihouse/sen/codex-cards': ['CodexCard'],
    },
    /** Public types the packed consumer must be able to resolve. */
    smokeTypes: `
      import type { CreationModalProps, StorySeedInput } from '@seihouse/sen/story-seed';
      import type { FiveChapterBatchState, ManifestChapterRequest } from '@seihouse/sen/chapter-generation';
      import type { ColorCodeId, ColorCodeDefinition } from '@seihouse/sen/color-codes';
      import type {
        CodexCardProps,
        FateResultCardProps,
        FateResultData,
        LibraryCardProps,
        SystemBlockProps,
        SystemEvent,
        SystemPromptExpandedData,
        SystemPromptPresentation,
        SystemPromptRoute,
        SystemPromptRoutePresentation,
        SystemStatusAbility,
        SystemStatusBar,
        SystemStatusEffect,
        SystemStatusScreen,
        SystemStatusStat,
        WorldNoticeData,
        WorldNoticeEntry,
        WorldNoticeProps,
      } from '@seihouse/sen/cards';
      import type {
        ReaderChapter,
      } from '@seihouse/sen/reader-chamber';
      declare const creation: CreationModalProps;
      declare const seed: StorySeedInput;
      declare const batch: FiveChapterBatchState;
      declare const request: ManifestChapterRequest;
      declare const colorCode: ColorCodeId;
      declare const colorCodeDefinition: ColorCodeDefinition;
      declare const codexCard: CodexCardProps;
      declare const card: LibraryCardProps;
      declare const fateResultCard: FateResultCardProps;
      declare const systemBlock: SystemBlockProps;
      declare const systemRoute: SystemPromptRoute;
      declare const systemRoutePresentation: SystemPromptRoutePresentation;
      declare const worldNotice: WorldNoticeProps;
      declare const fateResult: FateResultData;
      declare const systemEvent: SystemEvent;
      declare const systemPromptPresentation: SystemPromptPresentation;
      declare const systemPromptExpanded: SystemPromptExpandedData;
      declare const systemStatusAbility: SystemStatusAbility;
      declare const systemStatusBar: SystemStatusBar;
      declare const systemStatusEffect: SystemStatusEffect;
      declare const systemStatusScreen: SystemStatusScreen;
      declare const systemStatusStat: SystemStatusStat;
      declare const worldNoticeData: WorldNoticeData;
      declare const worldNoticeEntry: WorldNoticeEntry;
      declare const readerChapter: ReaderChapter;
      void [
        creation, seed, batch, request, colorCode, colorCodeDefinition, codexCard, card,
        fateResultCard, systemBlock, systemRoute, systemRoutePresentation, worldNotice,
        fateResult, systemEvent, systemPromptPresentation, systemPromptExpanded,
        systemStatusAbility, systemStatusBar, systemStatusEffect, systemStatusScreen, systemStatusStat,
        worldNoticeData, worldNoticeEntry, readerChapter,
      ];
    `,
  },

  library: {
    id: 'library',
    name: '@seihouse/library',
    sourceDirectory: 'src/package/library',
    distDirectory: 'dist/library',
    // Library adds no stylesheet of its own: its surfaces are Tailwind-only
    // and inherit the SEN treatments through `@seihouse/sen/styles.css`.
    styleSheet: 'library.css',
    unstyledEntries: ['index', 'cultivation', 'relics'],
    viteConfig: 'vite.library.config.ts',
    tsconfig: 'tsconfig.library.json',
    forbiddenBundleContents: NEVER_PUBLISHED,
    assets: [],
    /**
     * Library resolves `@seihouse/sen/*` to SEN's emitted declarations, so the
     * SEN package must be built first. `scripts/requirePackageTypes.mjs`
     * enforces this before `tsc` runs.
     */
    typeDependencies: ['sen'],
    smokeDependencies: ['sen'],
    smokeExports: {
      '@seihouse/library': ['LIBRARY_PACKAGE_VERSION', 'RelicCard', 'ClosedDoorCultivationModal'],
      '@seihouse/library/cultivation': ['ClosedDoorCultivationModal'],
      '@seihouse/library/relics': ['RelicCard', 'RelicModal', 'RelicReveal'],
    },
    smokeTypes: `
      import type { ClosedDoorCultivationModalProps } from '@seihouse/library/cultivation';
      import type { CosmicArtifact, RelicRevealProps } from '@seihouse/library/relics';
      declare const cultivation: ClosedDoorCultivationModalProps;
      declare const artifact: CosmicArtifact;
      declare const reveal: RelicRevealProps;
      void [cultivation, artifact, reveal];
    `,
  },
};

export const resolveTarget = id => {
  const target = PACKAGE_TARGETS[id];
  if (!target) {
    throw new Error(`Unknown package target "${id}" — expected one of ${Object.keys(PACKAGE_TARGETS).join(', ')}.`);
  }
  return target;
};

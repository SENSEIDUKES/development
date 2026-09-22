/** Build and packed-consumer expectations. Entries come from manifests. */
const NEVER_PUBLISHED = [
  ['src/workshop/', 'Workshop module'], ['src/server/', 'backend module'],
  ['src/host/', 'concrete host adapter'], ['src/test-utils/', 'test support'],
  ['workshop.reader.', 'Workshop storage'], ['IndexedDBHarnessGenerationRepository', 'concrete persistence'],
];
const common = id => ({
  id, name: '@seihouse/' + id, sourceDirectory: 'src/package/' + id, distDirectory: 'dist/' + id,
  styleSheet: id + '.css', viteConfig: id === 'sen' ? 'vite.package.config.ts' : 'vite.library.config.ts',
  tsconfig: id === 'sen' ? 'tsconfig.package.json' : 'tsconfig.library.json', assets: [],
});
export const PACKAGE_TARGETS = {
  sen: {
    ...common('sen'),
    unstyledEntries: ['index', 'audio', 'contracts', 'generation', 'reader-runtime', 'translation', 'arc-goals', 'harness-generation', 'presentation'],
    forbiddenBundleContents: [...NEVER_PUBLISHED, ['@seihouse/library', 'Library dependency'], ['celestialaudio.seihouse.org', 'first-party catalog'], ['library-auth-backdrop', 'Library auth artwork']],
    typeDependencies: [], smokeDependencies: [],
    smokeExports: {
      '@seihouse/sen': ['NarrativePresentationProvider', 'SEN_PACKAGE_VERSION'],
      '@seihouse/sen/presentation': ['NarrativeArtProvider', 'NarrativeTextBox', 'AmbientEffect'],
      '@seihouse/sen/contracts': ['DEFAULT_SEN_LANGUAGE_CODE'],
      '@seihouse/sen/color-codes': ['COLOR_CODES', 'getColorCodeValue', 'resolveCharacterRelationshipColorCode'],
      '@seihouse/sen/cards': ['CodexCard', 'CodexHovercard', 'CharacterCard', 'LocationCard', 'SystemBlock', 'WorldNotice', 'FateResultCard'],
      '@seihouse/sen/reader-chamber': ['ReaderChamber', 'ReaderViewport'],
      '@seihouse/sen/reader-codex': ['ReaderCodex', 'CodexSheetOverlay'],
      '@seihouse/sen/reader-runtime': ['ReaderRuntimeProvider'],
      '@seihouse/sen/translation': ['ReaderTranslationController', 'ReaderTranslationRuntimeProvider'],
      '@seihouse/sen/manifestations': ['ManifestationReveal'],
      '@seihouse/sen/motion-picture': ['MotionPicture'],
      '@seihouse/sen/audio': ['parseAudioCues', 'createMediaCatalog', 'resolveWorldCueIntent', 'NarrativeAudioProvider'],
      '@seihouse/sen/story-seed': ['StoryFoundationEditor', 'createEmptyStorySeedInput', 'parseStorySeedJson'],
      '@seihouse/sen/generation': ['acceptChapterMedia'],
      '@seihouse/sen/harness-generation': ['HarnessGenerationController', 'createHarnessSenStory'],
      '@seihouse/sen/arc-goals': ['ARC_LENGTH'],
    },
    smokeTypes: `
      import type { StoryWorld, StoryBlock, ReaderChapter, NarrativeUsagePort } from '@seihouse/sen/contracts';
      import type { ReaderRuntime } from '@seihouse/sen/reader-runtime';
      import type { StorySeedInput, StorySeedRepository } from '@seihouse/sen/story-seed';
      import type { HarnessStory, HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
      import type { ChapterContent } from '@seihouse/sen/generation';
      import type { FrozenNarrativeMedia, NarrativeAudioPlayback } from '@seihouse/sen/audio';
      interface PublisherAccount { publisherUserId: string; imprint: string }
      declare const account: PublisherAccount;
      declare const repository: StorySeedRepository;
      declare const customSeed: StorySeedInput;
      void repository.create(account.publisherUserId, customSeed, undefined, 'en');
      declare const block: NonNullable<ChapterContent['blocks']>[number];
      const readerBlock: NonNullable<ReaderChapter['blocks']>[number] = block;
      type All = [StoryWorld, StoryBlock, NarrativeUsagePort, ReaderRuntime, StorySeedInput, HarnessStory, HarnessGenerationModelAdapter, FrozenNarrativeMedia, NarrativeAudioPlayback, PublisherAccount];
      void readerBlock;
    `,
  },
  library: {
    ...common('library'),
    unstyledEntries: ['index', 'cultivation', 'energy', 'dao-pillar', 'media', 'presentation'],
    forbiddenBundleContents: NEVER_PUBLISHED,
    typeDependencies: ['sen'], smokeDependencies: ['sen'],
    smokeExports: {
      '@seihouse/library': ['LIBRARY_PACKAGE_VERSION'],
      '@seihouse/library/presentation': ['LibraryPresentationProvider'],
      '@seihouse/library/profile': ['LibraryProfile', 'UserProfileServicesProvider'],
      '@seihouse/library/energy': ['EnergyPanel', 'EnergyClientProvider', 'createHttpEnergyClient'],
      '@seihouse/library/familiar': ['Familiar', 'FamiliarSprite', 'FamiliarSelection', 'FamiliarCompanion', 'FamiliarRecall'],
      '@seihouse/library/cultivation': ['ClosedDoorCultivationModal', 'QiClientProvider', 'createHttpQiClient', 'getDaoRankData'],
      '@seihouse/library/dao-pillar': ['DaoPillarView', 'DaoPillarClientProvider'],
      '@seihouse/library/relics': ['RelicCard', 'RelicModal', 'RelicReveal', 'projectEarnedRelic'],
      '@seihouse/library/shell': ['LibraryNavigation', 'WorkspaceShell', 'WorkspaceHeader'],
      '@seihouse/library/home': ['LightNovelsHome', 'StoryDetailScreen'],
      '@seihouse/library/story-seed': ['CreationModal', 'StoryCreationProvider'],
      '@seihouse/library/generation': ['HarnessGenerationWorkspace'],
      '@seihouse/library/media': ['createLibraryMediaPort', 'validateMediaPack'],
      '@seihouse/library/manifestations': ['AILoadingVeil'],
    },
    smokeTypes: `
      import type { UserProfileServices } from '@seihouse/library/profile';
      import type { EnergyClient } from '@seihouse/library/energy';
      import type { FamiliarDefinition, FamiliarSelectionProps } from '@seihouse/library/familiar';
      import type { QiClient } from '@seihouse/library/cultivation';
      import type { EarnedRelicRecord, RelicsClient } from '@seihouse/library/relics';
      import type { HarnessGenerationWorkspaceProps } from '@seihouse/library/generation';
      type All = [UserProfileServices, EnergyClient, FamiliarDefinition, FamiliarSelectionProps, QiClient, EarnedRelicRecord, RelicsClient, HarnessGenerationWorkspaceProps];
    `,
  },
};
export const resolveTarget = id => {
  if (!PACKAGE_TARGETS[id]) throw new Error('Unknown package target: ' + id);
  return PACKAGE_TARGETS[id];
};

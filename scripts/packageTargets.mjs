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
      '@seihouse/sen/highlight-engine': ['HighlightEngine', 'usePassageSelection', 'normalizePassageSelection', 'replacePassage', 'createManualSoundCue', 'ManualCuePicker'],
      '@seihouse/sen': ['NarrativePresentationProvider', 'SEN_PACKAGE_VERSION'],
      '@seihouse/sen/presentation': ['NarrativeArtProvider', 'NarrativeTextBox', 'AmbientEffect'],
      '@seihouse/sen/contracts': ['DEFAULT_SEN_LANGUAGE_CODE'],
      '@seihouse/sen/color-codes': ['COLOR_CODES', 'getColorCodeValue', 'resolveCharacterRelationshipColorCode'],
      '@seihouse/sen/cards': ['CodexCard', 'CodexHovercard', 'CharacterCard', 'LocationCard', 'SystemBlock', 'WorldNotice', 'FateResultCard'],
      '@seihouse/sen/reader-chamber': ['ReaderChamber', 'ReaderViewport'],
      '@seihouse/sen/inline-audio': ['InlineAudio', 'InlineAudioControl', 'InlineAudioText', 'MixerCueControl', 'SOUND_CUE_ENERGY_VOLUME'],
      '@seihouse/sen/reader-codex': ['ReaderCodex', 'CodexSheetOverlay'],
      '@seihouse/sen/reader-runtime': ['ReaderRuntimeProvider', 'useReadAloud', 'buildReadAloudScript', 'findSpokenLines', 'chooseDefaultVoices', 'createWebSpeechEngine', 'storySoundtrack', 'StorySoundtrack', 'readSoundtrackChoice', 'writeSoundtrackChoice', 'piecesForMood'],
      '@seihouse/sen/translation': ['ReaderTranslationController', 'ReaderTranslationRuntimeProvider'],
      '@seihouse/sen/manifestations': ['ManifestationReveal'],
      '@seihouse/sen/motion-picture': ['MotionPicture'],
      '@seihouse/sen/audio': ['parseAudioCues', 'createMediaCatalog', 'placeSoundCues', 'NarrativeAudioProvider', 'soundtrackVocabulary'],
      '@seihouse/sen/story-seed': ['StoryFoundationEditor', 'createEmptyStorySeedInput', 'parseStorySeedJson', 'describeStoryLengthProblem'],
      '@seihouse/sen/generation': ['readMarks', 'SOUND_TAG_WORDS'],
      '@seihouse/sen/harness-generation': ['HarnessGenerationController', 'createHarnessSenStory', 'HarnessReaderSession', 'SEN_SPEAKERS_SKILL', 'SEN_FATE_SURVIVAL_PLANNING', 'SEN_SOUND_CUES_SKILL', 'SEN_SOUNDTRACK_SKILL', 'chapterSoundtrack', 'HARNESS_TAG_RULES', 'readChapterPlan', 'checkChapterPlan', 'derivePlanRecord', 'buildCodexSection', 'PLAN_EVENT_KINDS', 'deriveHoldings', 'deriveStoryCodex', 'StoryCodex', 'harnessFailedWrite', 'chapterTitleText', 'chapterRewriteGap', 'withoutLatestChapter', 'CHAPTER_REWRITE_NOTE_LIMIT'],
      '@seihouse/sen/arc-goals': ['ARC_LENGTH', 'STORY_LENGTH_ARCS'],
    },
    smokeTypes: `
      import type { PassageSelection, TextHighlightBlock, HighlightEngineProps } from '@seihouse/sen/highlight-engine';
      const passage: PassageSelection = { blockId: 'publisher-paragraph', selectedText: 'text', startOffset: 0, endOffset: 4 };
      const textBlock: TextHighlightBlock = { id: passage.blockId, text: 'text' };
      const highlightProps: HighlightEngineProps = { blocks: [textBlock], onBlocksChange: (blocks, edit) => { void blocks; void edit.operation; } };
      void highlightProps;
      import type { StoryWorld, StoryBlock, ReaderChapter, NarrativeUsagePort } from '@seihouse/sen/contracts';
      import type { ReaderRuntime, ReadAloudScript, ReadAloudVoicePicks, SpeakerAttachment } from '@seihouse/sen/reader-runtime';
      const picks: ReadAloudVoicePicks = { en: { narrator: ['Publisher Voice'] } };
      const script: ReadAloudScript = { version: 1, lines: [] };
      declare const speaker: SpeakerAttachment;
      void picks; void script; void speaker.payload.protagonist;
      import type { StorySeedInput, StorySeedRepository } from '@seihouse/sen/story-seed';
      import type { HarnessStory, HarnessGenerationModelAdapter, HarnessChapterPlanRequest, CodexEntry, ChapterPlan, HarnessChapterRewrite } from '@seihouse/sen/harness-generation';
      declare const planRequest: HarnessChapterPlanRequest;
      const rewriteRequest: HarnessChapterRewrite = { replacesChapterId: 'publisher-chapter', previous: { title: 'A Title' } };
      void planRequest.immediateChapterRequest.chapterNumber; void rewriteRequest;
      const entry: Pick<CodexEntry, 'kind' | 'name'> = { kind: 'thing', name: 'Publisher Relic' };
      const plan: ChapterPlan = {
        cast: [{ name: 'MC', kind: 'character' }, { name: entry.name, kind: 'thing' }],
        events: [{ kind: 'discovery', actor: { name: 'MC' }, targets: [{ name: entry.name }], presses: [], how: 'The hero finds the relic.', facts: [{ type: 'holding', who: { name: 'MC' }, change: 'gains', what: { name: entry.name } }] }],
        chapterFunction: 'progression',
      };
      void plan;
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
    unstyledEntries: ['index', 'cultivation', 'energy', 'dao-pillar', 'media', 'presentation', 'model-router-server'],
    forbiddenBundleContents: NEVER_PUBLISHED,
    typeDependencies: ['sen'], smokeDependencies: ['sen'],
    smokeExports: {
      '@seihouse/library': ['LIBRARY_PACKAGE_VERSION'],
      '@seihouse/library/presentation': ['LibraryPresentationProvider'],
      '@seihouse/library/profile': ['LibraryProfile', 'UserProfileServicesProvider', 'notYetBuiltNote'],
      '@seihouse/library/energy': ['EnergyPanel', 'EnergyClientProvider', 'createHttpEnergyClient'],
      '@seihouse/library/familiar': ['Familiar', 'FamiliarSprite', 'FamiliarSelection', 'FamiliarCompanion', 'FamiliarRecall', 'FamiliarTrainingPanel', 'FamiliarsClientProvider', 'createHttpFamiliarsClient', 'activeNameEffect', 'ElementalEffectPanel', 'FamiliarNameEffect'],
      '@seihouse/library/cultivation': ['ClosedDoorCultivationModal', 'QiClientProvider', 'createHttpQiClient', 'DaoXpClientProvider', 'createHttpDaoXpClient', 'getDaoRankData'],
      '@seihouse/library/dao-pillar': ['DaoPillarView', 'DaoPillarClientProvider'],
      '@seihouse/library/relics': ['RelicReveal', 'FateSurvivalRelicsPanel', 'RelicsClientProvider', 'createHttpRelicsClient'],
      '@seihouse/library/rewards': ['AchievementsPanel', 'MysteryScrollReveal', 'RewardRevealCard', 'AchievementsClientProvider', 'createHttpAchievementsClient', 'describeRewardGrants'],
      '@seihouse/library/shell': ['LibraryNavigation', 'LibraryDestinationsProvider', 'useLibraryBottomClearance', 'WorkspaceShell', 'WorkspaceHeader', 'HeaderSoundControl', 'useMenuMusic', 'readMenuMusic'],
      '@seihouse/library/home': ['LightNovelsHome', 'StoryDetailScreen'],
      '@seihouse/library/discover': ['Discover', 'releaseAge'],
      '@seihouse/library/world-card': ['WorldCard', 'WorldCardInfo'],
      '@seihouse/library/story-seed': ['CreationModal', 'StoryCreationProvider', 'harnessStoryStartFromSeed'],
      '@seihouse/library/generation': ['HarnessGenerationWorkspace'],
      '@seihouse/library/media': ['createLibraryMediaPort', 'validateMediaPack'],
      '@seihouse/library/manifestations': ['GenerationOverlay', 'CompactGenerationOverlay', 'StatusMessage', 'ProgressIndicator', 'AmbientEffects', 'ProgressLabel', 'AILoadingVeil'],
      '@seihouse/library/stories': ['useLibraryStories', 'StoryPages', 'harnessStoryDisplay', 'storyHomeWorlds', 'LIBRARY_READ_ALOUD_VOICES', 'StorySettings', 'CreateStorySettings', 'useStorySettingsDraft', 'applyStorySettingsDraft', 'storyCoverRequest'],
    },
    smokeTypes: `
      import type { UserProfileFeature, UserProfileNotYetBuilt, UserProfileServices } from '@seihouse/library/profile';
      import type { EnergyClient } from '@seihouse/library/energy';
      import type { FamiliarDefinition, FamiliarSelectionProps } from '@seihouse/library/familiar';
      import type { QiClient } from '@seihouse/library/cultivation';
      import type { FateSurvivalRelicView, RelicsClient } from '@seihouse/library/relics';
      import type { AchievementsClient, MysteryScrollView, RewardGrant } from '@seihouse/library/rewards';
      import type { FamiliarsClient, FamiliarTrainingSnapshot } from '@seihouse/library/familiar';
      import type { DaoXpClient } from '@seihouse/library/cultivation';
      import type { HarnessGenerationWorkspaceProps } from '@seihouse/library/generation';
      import type { LibraryStories, LibraryStoriesOptions, StoryPagesProps, StoryCoverRequest, StoryCoverService, StorySettingsDraft } from '@seihouse/library/stories';
      import type { ModelRouterConfig, TextGenerationRequest, SpeechGenerationRequest, ImageGenerationRequest, GenerationResult } from '@seihouse/library/model-router-server';
      type All = [UserProfileServices, UserProfileFeature, UserProfileNotYetBuilt, EnergyClient, FamiliarDefinition, FamiliarSelectionProps, QiClient, DaoXpClient, FateSurvivalRelicView, RelicsClient, AchievementsClient, MysteryScrollView, RewardGrant, FamiliarsClient, FamiliarTrainingSnapshot, HarnessGenerationWorkspaceProps, LibraryStories, LibraryStoriesOptions, StoryPagesProps, StoryCoverRequest, StoryCoverService, StorySettingsDraft, ModelRouterConfig, TextGenerationRequest, SpeechGenerationRequest, ImageGenerationRequest, GenerationResult];
    `,
  },
};
export const resolveTarget = id => {
  if (!PACKAGE_TARGETS[id]) throw new Error('Unknown package target: ' + id);
  return PACKAGE_TARGETS[id];
};

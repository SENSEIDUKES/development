import {
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SetStateAction,
} from 'react';
import './story-seed.css';
import { motion } from 'motion/react';
import type { WorldBlueprint } from '../shared/types';
import { generateUUID } from '../shared/id';
import {
  AGENTS,
  LOCAL_ONLY_MODE,
  selectIsGenerating,
  useAppStore,
} from '../shared/stubs';
import {
  createStorySeed,
  importStorySeeds,
  LOCAL_WORKSHOP_STORY_SEED_OWNER_ID,
  updateStorySeed,
  type StorySeedArtifact,
  type StorySeedRecord,
} from '../shared/storySeedRepository';
import {
  applyInferredStoryTags,
  buildBlueprintGenerationPayload,
  buildInitialStoryGenerationPayload,
  createBlueprintDraftFromSeed,
  createEmptyStorySeedInput,
  normalizeStorySeedInput,
  normalizeWorldBlueprint,
  validateStorySeedDraft,
  validateStorySeedInput,
  type BlueprintGenerationPayload,
  type InitialStoryGenerationPayload,
  type StorySeedInput,
} from '../shared/storySeedSchema';
import { createStoryAdministrativeMetadata } from '../shared/storyAdministrativeMetadata';
import StoryAuthGate, { STORY_AUTH_DISSOLVE_MS } from './StoryAuthGate';

// Creation workspace
import {
  missingRequiredSections,
  REQUIRED_STORY_SECTIONS,
  type SeedSectionId,
} from './seedSections';
import type { SeedUpdate } from './seedState';
import { StorySeedSelector } from './StorySeedSelector';
import { OriginWorkspace } from './workspaces/OriginWorkspace';
import { ArcWorkspace } from './workspaces/ArcWorkspace';
import { WorldIdentityWorkspace } from './workspaces/WorldIdentityWorkspace';
import { CharactersWorkspace } from './workspaces/CharactersWorkspace';
import { FactionsWorkspace } from './workspaces/FactionsWorkspace';
import { AbilitiesWorkspace } from './workspaces/AbilitiesWorkspace';
import { PowerSystemWorkspace } from './workspaces/PowerSystemWorkspace';

import { LibraryPanel, ManifestButton } from '../../library';
import { DeferredStorySeedView } from './DeferredStorySeedView';
import { StorySeedHeader } from './StorySeedHeader';
import { StorySeedMobileNavigation } from './StorySeedMobileNavigation';
import { useStoryBankRecords } from './useStoryBankRecords';
import { downloadStorySeed, downloadStorySeedCollection } from '../shared/storySeedSerialization';

interface CreationModalProps {
  onStartStory: (payload: InitialStoryGenerationPayload) => Promise<void>;
  onGenerateBlueprint: (payload: BlueprintGenerationPayload) => Promise<WorldBlueprint>;
  isGenerating: boolean;
  error: string | null;
}

/** Existing one-story generation default; Chapter Generation Pass 1 does not use it. */
const INITIAL_CHAPTER_COUNT = 10;

const useLatestCallback = <Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  return useCallback((...args: Args) => callbackRef.current(...args), []);
};

const loadStorySeedSecondary = () => import('./StorySeedSecondary');
const preloadStorySeedSecondary = () => {
  void loadStorySeedSecondary().catch(() => undefined);
};
const BlueprintReview = lazy(() => loadStorySeedSecondary().then(module => ({
  default: module.BlueprintReview,
})));
const ImportPanel = lazy(() => loadStorySeedSecondary().then(module => ({
  default: module.ImportPanel,
})));
const StoryBank = lazy(() => loadStorySeedSecondary().then(module => ({
  default: module.StoryBank,
})));
const StorySeedHelpMenu = lazy(() => loadStorySeedSecondary().then(module => ({
  default: module.StorySeedHelpMenu,
})));

const mapCreationFailure = (failure: 'blueprint' | 'story', error?: unknown): string => {
  const message = error instanceof Error ? error.message.trim() : '';
  if (failure === 'blueprint' && message) return message;
  return failure === 'blueprint'
    ? 'The World Blueprint could not be generated. Please try again.'
    : 'The story could not be started. Please try again.';
};

interface StorySeedWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: (update: SeedUpdate) => void;
}

const STORY_SEED_WORKSPACES: Record<SeedSectionId, ComponentType<StorySeedWorkspaceProps>> = {
  origin: OriginWorkspace,
  arc: ArcWorkspace,
  'world-identity': WorldIdentityWorkspace,
  characters: CharactersWorkspace,
  factions: FactionsWorkspace,
  abilities: AbilitiesWorkspace,
  'power-system': PowerSystemWorkspace,
};

export default function CreationModal({ onStartStory, onGenerateBlueprint, isGenerating: isGeneratingProp, error }: CreationModalProps) {
  const storeIsGenerating = useAppStore(selectIsGenerating);
  const activeAgentId = useAppStore(state => state.activeAgentId);
  const currentUser = useAppStore(state => state.currentUser);
  const seedOwnerId = currentUser?.uid
    || (LOCAL_ONLY_MODE ? LOCAL_WORKSHOP_STORY_SEED_OWNER_ID : null);
  const equippedRelicTitle = useAppStore(state => {
    const storyMaker = state.routingConfig.storyMaker;
    return typeof storyMaker?.equippedRelicTitle === 'string'
      ? storyMaker.equippedRelicTitle
      : null;
  });
  // Stories manifested from a banked seed drive the Story Bank's "Novel
  // Manifested" card state (stories link back to their seed by `sourceSeedId`).
  const libraryStories = useAppStore(state => state.stories);
  const manifestedSeedIds = useMemo(() => new Set(
    libraryStories
      .map(story => story.sourceSeedId)
      .filter((id): id is string => Boolean(id)),
  ), [libraryStories]);
  const isGenerating = isGeneratingProp || storeIsGenerating;
  const [stage, setStage] = useState<'intake' | 'blueprint'>('intake');
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [blueprint, setBlueprint] = useState<WorldBlueprint | null>(null);
  const [currentSeed, setCurrentSeed] = useState<StorySeedRecord | null>(null);
  const [storyBankRequestedOwnerId, setStoryBankRequestedOwnerId] = useState<string | null>(null);
  const {
    records: savedSeeds,
    setRecords: setSavedSeeds,
    isLoading: isLoadingSeeds,
    loadError: seedLoadError,
    reload: reloadSavedSeeds,
  } = useStoryBankRecords(seedOwnerId, storyBankRequestedOwnerId === seedOwnerId);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [authDissolving, setAuthDissolving] = useState(false);
  const wasAuthRef = useRef(false);
  const previousSeedOwnerIdRef = useRef<string | null>(seedOwnerId);
  const seedOwnerIdRef = useRef<string | null>(seedOwnerId);
  const currentSeedRef = useRef<StorySeedRecord | null>(null);
  const persistRequestIdRef = useRef(0);
  seedOwnerIdRef.current = seedOwnerId;

  // Creation workspace state
  const [activeSection, setActiveSection] = useState<SeedSectionId>('origin');
  // Story Bank is a real view of the page — the permanent home for saved
  // seeds and their Blueprints — toggled from the bottom navigation's Story
  // Bank tab (mobile) and the header's Story Bank button (desktop).
  const [showStoryBank, setShowStoryBank] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const savedFeedbackTimer = useRef<number | null>(null);
  // The `?` Help menu — one clean home for section guidance, opened from the
  // bottom navigation on mobile and the header Help button on desktop.
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpRequested, setHelpRequested] = useState(false);

  // The workspace edits the canonical Story Seed directly — there is no
  // separate flat view model between the form and the contract any more.
  const [seed, setSeed] = useState<StorySeedInput>(createEmptyStorySeedInput);

  const setActiveSeed = useCallback((record: StorySeedRecord | null) => {
    currentSeedRef.current = record;
    setCurrentSeed(record);
  }, []);

  useEffect(() => {
    const ownerChanged = previousSeedOwnerIdRef.current !== seedOwnerId;
    previousSeedOwnerIdRef.current = seedOwnerId;
    if (ownerChanged) {
      setActiveSeed(null);
      setSeed(createEmptyStorySeedInput());
      setBlueprint(null);
      setSeedError(null);
    }
    if (!seedOwnerId) {
      setActiveSeed(null);
    }
  }, [seedOwnerId, setActiveSeed]);

  // Always a functional update, so rapid successive edits (e.g. toggling two
  // tags in one task) can never lose a write to a stale render closure.
  const updateSeed = useCallback((update: SeedUpdate) => setSeed(update), []);
  const updateBlueprint = useCallback((update: SetStateAction<WorldBlueprint>) => {
    setBlueprint(current => {
      if (!current) return current;
      return typeof update === 'function' ? update(current) : update;
    });
  }, []);

  // Post-auth visual transition: once a gated guest signs in, keep the gate
  // mounted for STORY_AUTH_DISSOLVE_MS so StoryAuthGate's shell can dissolve
  // over the still-visible backdrop before the intake is revealed.
  useEffect(() => {
    if (LOCAL_ONLY_MODE) return;
    if (!currentUser) {
      wasAuthRef.current = true;
      return;
    }
    if (!wasAuthRef.current) return;
    wasAuthRef.current = false;
    setAuthDissolving(true);
    const timer = setTimeout(() => setAuthDissolving(false), STORY_AUTH_DISSOLVE_MS);
    return () => clearTimeout(timer);
  }, [currentUser]);

  useEffect(() => () => {
    if (savedFeedbackTimer.current) window.clearTimeout(savedFeedbackTimer.current);
  }, []);

  const rememberSeed = (record: StorySeedRecord, makeCurrent = true) => {
    if (makeCurrent) setActiveSeed(record);
    setSavedSeeds(previous => [record, ...previous.filter(item => item.id !== record.id)]);
  };

  const blueprintContextForRecord = (record?: StorySeedRecord) => ({
    creator: currentUser?.displayName,
    createdAt: record?.createdAt,
    updatedAt: record?.updatedAt,
  });

  const persistSeed = async (
    payload: StorySeedInput,
    blueprintArtifact?: WorldBlueprint,
  ): Promise<StorySeedRecord | null> => {
    if (!seedOwnerId) throw new Error('Sign in to save this story seed to your account.');
    const ownerAtStart = seedOwnerId;
    const activeRecord = currentSeedRef.current;
    const requestId = ++persistRequestIdRef.current;
    const saved = activeRecord && activeRecord.userId === ownerAtStart
      ? await updateStorySeed(ownerAtStart, activeRecord, payload, blueprintArtifact)
      : await createStorySeed(seedOwnerId, payload, blueprintArtifact);
    const currentRecord = currentSeedRef.current;
    const stillActive = requestId === persistRequestIdRef.current
      && seedOwnerIdRef.current === ownerAtStart
      && (activeRecord ? currentRecord?.id === activeRecord.id : currentRecord === null);
    rememberSeed(saved, stillActive);
    if (saved.blueprint && stillActive) {
      // Persistence can be remote. Merge only trusted record metadata into
      // the latest state so edits made while this request was in flight are
      // never replaced by the older saved snapshot.
      setBlueprint(current => current ? {
        ...current,
        blueprintVersion: current.blueprintVersion || saved.blueprint?.blueprintVersion || 'v1.0',
        ...(currentUser?.displayName ? { creator: currentUser.displayName } : {}),
        createdAt: current.createdAt || saved.createdAt,
        updatedAt: saved.updatedAt,
      } : current);
    }
    return saved;
  };

  /**
   * Draft saving deliberately uses draft validation only: an incomplete seed
   * is exactly what a draft is for. Premise, Genre, Style, and Story Tags may
   * all be empty and the current progress is still preserved.
   */
  const handleSaveDraft = async () => {
    const seedInput = seed;
    const validation = validateStorySeedDraft(seedInput);
    if (!validation.valid) {
      setSeedError(validation.errors.join(' '));
      return;
    }
    try {
      const blueprintArtifact = blueprint
        ? normalizeWorldBlueprint(blueprint, seedInput, { creator: currentUser?.displayName })
        : undefined;
      const saved = await persistSeed(seedInput, blueprintArtifact);
      if (!saved) return;
      setSeedError(null);
      setSavedFeedback(true);
      if (savedFeedbackTimer.current) window.clearTimeout(savedFeedbackTimer.current);
      savedFeedbackTimer.current = window.setTimeout(() => setSavedFeedback(false), 2500);
    } catch (draftError) {
      console.error('Failed to save story seed draft:', draftError);
      setSeedError('The draft could not be saved. Please try again.');
    }
  };

  const handleImport = async (artifacts: StorySeedArtifact[]) => {
    if (artifacts.length === 0) return;
    const imported = seedOwnerId ? await importStorySeeds(seedOwnerId, artifacts) : [];
    if (imported.length > 0) {
      const importedIds = new Set(imported.map(record => record.id));
      setSavedSeeds(previous => [
        ...imported,
        ...previous.filter(record => !importedIds.has(record.id)),
      ]);
      setActiveSeed(imported[0]);
    } else {
      setActiveSeed(null);
    }
    const selectedArtifact = imported[0] || artifacts[0];
    const selected = normalizeStorySeedInput(selectedArtifact.seed);
    setSeed(selected);
    setBlueprint(selectedArtifact.blueprint
      ? normalizeWorldBlueprint(
          selectedArtifact.blueprint,
          selected,
          imported[0]
            ? blueprintContextForRecord(imported[0])
            : { creator: currentUser?.displayName },
        )
      : createBlueprintDraftFromSeed(selected, { creator: currentUser?.displayName }));
    setStage('blueprint');
    setShowImportPanel(false);
    setShowStoryBank(false);
    setSeedError(null);
  };

  /** Make a banked record the active seed and project its Blueprint draft. */
  const loadSeedIntoWorkspace = (record: StorySeedRecord) => {
    const selected = normalizeStorySeedInput(record.seed);
    setActiveSeed(record);
    setSeed(selected);
    setBlueprint(record.blueprint
      ? normalizeWorldBlueprint(record.blueprint, selected, blueprintContextForRecord(record))
      : createBlueprintDraftFromSeed(selected, { creator: currentUser?.displayName }));
    setSeedError(null);
  };

  /**
   * Story Bank: load the seed back into Story Seed and resume its pipeline at
   * the Blueprint dossier — the stage where a banked seed continues toward
   * manifestation. The card's Blueprint action shares this landing: the
   * dossier is where a Blueprint is viewed and edited.
   */
  const handleUseSeed = (record: StorySeedRecord) => {
    preloadStorySeedSecondary();
    loadSeedIntoWorkspace(record);
    setStage('blueprint');
    setShowStoryBank(false);
  };

  /** Story Bank: open the seed itself for editing in the intake workspace. */
  const handleEditSeed = (record: StorySeedRecord) => {
    loadSeedIntoWorkspace(record);
    setStage('intake');
    setActiveSection('origin');
    setShowStoryBank(false);
  };

  /**
   * All four required Story inputs must be present to generate. Story Tags
   * never block a creator, though: an empty set is inferred from Premise,
   * Genre, and Style, written back into the workspace so the creator sees it,
   * and saved with the seed.
   */
  const handleGenerateBlueprintClick = async () => {
    if (isGenerating || selectIsGenerating(useAppStore.getState())) return;
    // Story Tags are filled by inference first, so only Style, Genre, and
    // Premise can ever leave the seed short of generation readiness.
    const seedInput = applyInferredStoryTags(normalizeStorySeedInput(seed));
    const validation = validateStorySeedInput(seedInput);
    if (!validation.valid) {
      setSeedError(validation.errors.join(' '));
      return;
    }
    // Write the inferred tags back so the creator sees exactly what is saved.
    if (seed.story.required.storyTags.length === 0) setSeed(seedInput);
    try {
      // Blueprint review code downloads while the provider is generating, so
      // the dossier is ready when the response arrives without burdening the
      // initial Story Seed route.
      preloadStorySeedSecondary();
      const generated = await onGenerateBlueprint(buildBlueprintGenerationPayload(seedInput));
      const bp = normalizeWorldBlueprint(generated, seedInput, {
        creator: currentUser?.displayName,
        preserveSourceMetadata: false,
      });
      setBlueprint(bp);
      setStage('blueprint');
      try {
        await persistSeed(seedInput, bp);
        setSeedError(null);
      } catch (seedSaveError) {
        console.error('Failed to save generated story seed:', seedSaveError);
        setSeedError('The blueprint was generated, but its account seed was not saved. Retry before starting the story.');
      }
    } catch (generationError) {
      console.error('Failed to generate World Blueprint:', generationError);
      setSeedError(mapCreationFailure('blueprint', generationError));
    }
  };

  /**
   * The shared start-story path: the Blueprint review's Manifest Story button
   * and each Story Bank card's Manifest Novel action both run through it, so a
   * novel always starts from a validated seed, a cleaned Blueprint, and a
   * persisted source seed record.
   */
  const startStoryFromSeed = async (
    seedInput: StorySeedInput,
    blueprintArtifact: WorldBlueprint,
    record: StorySeedRecord | null,
  ) => {
    const validation = validateStorySeedInput(seedInput);
    if (!validation.valid) {
      setSeedError(validation.errors.join(' '));
      return;
    }

    let cleanBlueprint: WorldBlueprint;
    try {
      const normalizedBlueprint = normalizeWorldBlueprint(blueprintArtifact, seedInput, {
        ...blueprintContextForRecord(record || undefined),
      });
      cleanBlueprint = {
        ...normalizedBlueprint,
        mcProfile: normalizedBlueprint.mainCharacter?.backgroundProfile || normalizedBlueprint.mcProfile,
        majorFactions: normalizedBlueprint.majorFactions.map(f => f.trim()).filter(Boolean),
        initialCharacters: normalizedBlueprint.initialCharacters.map(f => f.trim()).filter(Boolean),
        majorMysteries: normalizedBlueprint.majorMysteries.map(f => f.trim()).filter(Boolean),
        unresolvedPlotThreads: normalizedBlueprint.unresolvedPlotThreads.map(f => f.trim()).filter(Boolean),
      };
    } catch (blueprintError) {
      console.error('Failed to prepare World Blueprint:', blueprintError);
      setSeedError('The story was not started because its World Blueprint is invalid. Refine it and try again.');
      return;
    }

    let savedSeed: StorySeedRecord | null;
    try {
      savedSeed = await persistSeed(seedInput, cleanBlueprint);
      if (!LOCAL_ONLY_MODE && !savedSeed) {
        setSeedError('The story was not started because its source seed could not be saved to your account.');
        return;
      }
    } catch (seedSaveError) {
      console.error('Failed to persist source story seed:', seedSaveError);
      setSeedError('The story was not started because its source seed could not be saved to your account.');
      return;
    }

    const sourceSeedId = savedSeed?.id || record?.id || `local-seed-${generateUUID()}`;
    const administrative = createStoryAdministrativeMetadata({
      storyId: `story-${generateUUID()}`,
      creatorId: currentUser?.uid || LOCAL_WORKSHOP_STORY_SEED_OWNER_ID,
      sourceSeedId,
      originalLanguage: 'en',
    });
    setSeedError(null);
    try {
      await onStartStory(buildInitialStoryGenerationPayload(
        seedInput,
        administrative,
        cleanBlueprint,
        INITIAL_CHAPTER_COUNT,
      ));
    } catch (storyStartError) {
      console.error('Failed to start story:', storyStartError);
      setSeedError(mapCreationFailure('story'));
    }
  };

  const handleStartStoryClick = async () => {
    if (isGenerating || selectIsGenerating(useAppStore.getState())) return;
    if (!blueprint) return;
    const seedInput = applyInferredStoryTags(normalizeStorySeedInput(seed));
    await startStoryFromSeed(seedInput, blueprint, currentSeed);
  };

  /**
   * Story Bank: manifest the novel straight from a card. The banked record
   * becomes the active seed first so persistence updates it instead of
   * creating a duplicate. A seed whose required inputs no longer validate
   * (edited after its Blueprint was generated) returns to the intake
   * workspace with the validation errors instead of starting.
   */
  const handleManifestSeed = async (record: StorySeedRecord) => {
    if (isGenerating || selectIsGenerating(useAppStore.getState())) return;
    if (!record.blueprint) return;
    const seedInput = applyInferredStoryTags(normalizeStorySeedInput(record.seed));
    loadSeedIntoWorkspace(record);
    setShowStoryBank(false);
    const validation = validateStorySeedInput(seedInput);
    if (!validation.valid) {
      setStage('intake');
      setSeedError(validation.errors.join(' '));
      return;
    }
    await startStoryFromSeed(seedInput, record.blueprint, record);
  };

  const handleExportCurrentSeed = () => {
    const payload = normalizeStorySeedInput(seed);
    const blueprintArtifact = blueprint
      ? normalizeWorldBlueprint(
          blueprint,
          payload,
          blueprintContextForRecord(currentSeed || undefined),
        )
      : undefined;
    // Start sharing immediately so iOS Safari retains the user gesture needed
    // to present Save to Files. Persistence can finish independently.
    setSeedError(null);
    void downloadStorySeed(payload, blueprintArtifact).catch(downloadError => {
      console.error('Failed to export story seed:', downloadError);
      setSeedError('The seed could not be exported. Please try again.');
    });
    void persistSeed(payload, blueprintArtifact).catch(seedSaveError => {
      console.error('Failed to save seed while exporting:', seedSaveError);
      setSeedError('The seed was exported, but its account copy could not be saved.');
    });
  };

  const handleExportSavedSeed = (record: StorySeedRecord) => {
    const blueprintArtifact = record.blueprint
      ? normalizeWorldBlueprint(record.blueprint, record.seed, blueprintContextForRecord(record))
      : undefined;
    void downloadStorySeed(record.seed, blueprintArtifact).catch(downloadError => {
      console.error('Failed to export saved story seed:', downloadError);
      setSeedError('The seed could not be exported. Please try again.');
    });
  };

  const handleExportAllSeeds = () => {
    void downloadStorySeedCollection(savedSeeds.map(record => ({
      seed: record.seed,
      ...(record.blueprint ? {
        blueprint: normalizeWorldBlueprint(
          record.blueprint,
          record.seed,
          blueprintContextForRecord(record),
        ),
      } : {}),
    }))).catch(downloadError => {
      console.error('Failed to export account story seeds:', downloadError);
      setSeedError('Your seeds could not be exported. Please try again.');
    });
  };

  const toggleStoryBank = useCallback(() => {
    if (showStoryBank) {
      setShowImportPanel(false);
    } else {
      setStoryBankRequestedOwnerId(seedOwnerId);
      preloadStorySeedSecondary();
    }
    setShowStoryBank(open => !open);
  }, [seedOwnerId, showStoryBank]);

  const openHelp = useCallback(() => {
    setHelpRequested(true);
    preloadStorySeedSecondary();
    setHelpOpen(true);
  }, []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const selectMobileSection = useCallback((id: SeedSectionId) => {
    setActiveSection(id);
    setShowStoryBank(false);
  }, []);
  const requestSaveDraft = useLatestCallback(handleSaveDraft);
  const requestStartStory = useLatestCallback(handleStartStoryClick);
  const requestExportCurrentSeed = useLatestCallback(handleExportCurrentSeed);

  if ((!currentUser || authDissolving) && !LOCAL_ONLY_MODE) {
    return <StoryAuthGate />;
  }

  if (stage === 'blueprint' && blueprint) {
    return (
      <>
        {(seedError || error) && (
          <div className="mx-auto mb-5 max-w-4xl rounded border border-red-900 bg-red-950/30 p-3 text-center font-sans text-xs text-red-200" role="alert">
            {seedError || error}
          </div>
        )}
        <DeferredStorySeedView label="World Blueprint">
          <BlueprintReview
            blueprint={blueprint}
            setBlueprint={updateBlueprint}
            seed={seed}
            updateSeed={updateSeed}
            onBack={() => setStage('intake')}
            onStartStory={requestStartStory}
            onExportSeed={requestExportCurrentSeed}
            isGenerating={isGenerating}
          />
        </DeferredStorySeedView>
      </>
    );
  }

  const missing = missingRequiredSections(seed);
  const requiredComplete = REQUIRED_STORY_SECTIONS.length - missing.length;
  const canGenerate = missing.length === 0 && !isGenerating;
  const ActiveWorkspace = STORY_SEED_WORKSPACES[activeSection];

  return (
    // `pb-24` clears the sticky Manifest strip at the end of scroll; on mobile
    // the in-flow bottom navigation occupies that space instead.
    <div className="mx-auto max-w-7xl pb-24 max-lg:pb-0" id="creation-portal-root">
      {/* Header — wraps on narrow screens so the action buttons drop to a
          second row instead of overflowing the viewport. */}
      <StorySeedHeader
        seed={seed}
        updateSeed={updateSeed}
        isGenerating={isGenerating}
        savedFeedback={savedFeedback}
        showStoryBank={showStoryBank}
        onSaveDraft={requestSaveDraft}
        onToggleStoryBank={toggleStoryBank}
        onOpenHelp={openHelp}
        onStoryBankIntent={preloadStorySeedSecondary}
        onHelpIntent={preloadStorySeedSecondary}
      />

      {showStoryBank && (
        <DeferredStorySeedView label="Story Bank">
          <StoryBank
            seeds={savedSeeds}
            isLoading={isLoadingSeeds}
            loadError={seedLoadError}
            onRetryLoad={reloadSavedSeeds}
            manifestedSeedIds={manifestedSeedIds}
            isGenerating={isGenerating}
            onToggleImport={() => setShowImportPanel(open => !open)}
            importPanel={(
              <ImportPanel
                show={showImportPanel}
                onClose={() => setShowImportPanel(false)}
                onImport={handleImport}
              />
            )}
            onExportAll={handleExportAllSeeds}
            onEditSeed={handleEditSeed}
            onOpenBlueprint={handleUseSeed}
            onUseSeed={handleUseSeed}
            onExportSeed={handleExportSavedSeed}
            onManifest={handleManifestSeed}
          />
        </DeferredStorySeedView>
      )}

      {(seedError || error) && (
        <div className="mt-6 rounded border border-red-900 bg-red-950/30 p-3 text-center font-sans text-xs text-red-200" role="alert">
          {seedError || error}
        </div>
      )}

      {/* Two-panel creation workspace — shelled in the Celestial Library
          glass panel; the action bar below is its footer strip. The Story
          Bank view replaces it while the bank is open. */}
      {!showStoryBank && (
      <LibraryPanel padding="none" className="mt-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-neutral-900/70 lg:block">
          <StorySeedSelector
            seed={seed}
            activeSection={activeSection}
            equippedTitle={equippedRelicTitle}
            onSelect={setActiveSection}
          />
        </aside>

        <div className="relative min-w-0">
          {/* Restrained celestial ambience the glass fields float over —
              gradients only, no blur, so mobile scrolling stays cheap. */}
          <div aria-hidden="true" className="seed-workspace-ambience" />
          <main className="relative p-4 sm:p-8">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <ActiveWorkspace seed={seed} updateSeed={updateSeed} />
            </motion.div>
          </main>

          {/* Action bar — required tracking + Manifest as the single primary
              action, rendered as the panel's footer strip (luminous top
              divider, translucent blur). Section navigation lives in the
              bottom navigation on mobile and the sidebar on desktop. On
              mobile the strip rests in flow at the panel bottom (sticky is
              off) so it always stays clear of the bottom navigation. */}
          <LibraryPanel variant="footer" padding="none" className="sticky max-lg:static z-30 px-4 py-3.5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
                <div className="flex shrink-0 items-center gap-2" aria-label={`${requiredComplete} of ${REQUIRED_STORY_SECTIONS.length} required Story inputs complete`}>
                  {REQUIRED_STORY_SECTIONS.map(section => {
                    const filled = section.isFilled(seed);
                    return (
                      <span
                        key={section.id}
                        title={`${section.label}: ${filled ? 'complete' : 'missing'}`}
                        className={`h-2 w-2 rounded-full ${
                          filled
                            ? 'bg-portal shadow-[0_0_6px_rgba(4,172,255,0.65)]'
                            : 'border border-human/70 bg-human/10'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="truncate font-sc text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                  {missing.length > 0 ? (
                    <>
                      Missing required:{' '}
                      <span className="text-human/80">{missing.map(section => section.label).join(', ')}</span>
                    </>
                  ) : (
                    'All required Story inputs complete'
                  )}
                </p>
              </div>
              <p className="flex-1 font-sc text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 sm:hidden">
                {requiredComplete}/{REQUIRED_STORY_SECTIONS.length} required
              </p>

              <ManifestButton
                size="lg"
                onClick={handleGenerateBlueprintClick}
                disabled={!canGenerate}
                loading={isGenerating}
                // While VERSA drafts, its mark replaces the generic spinner.
                loadingIndicator={activeAgentId === 'versa' ? (
                  <img src={AGENTS.VERSA.logoUrl} className="h-5 w-5 shrink-0 animate-pulse object-contain" alt="" aria-hidden="true" />
                ) : undefined}
                title={missing.length > 0 ? `Missing required: ${missing.map(section => section.label).join(', ')}` : 'Manifest the World Blueprint'}
                className="shrink-0"
              >
                {isGenerating ? (
                  <span>{activeAgentId === 'versa' ? 'VERSA is drafting...' : 'Manifesting...'}</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">Manifest World Blueprint</span>
                    <span className="sm:hidden">Manifest</span>
                  </>
                )}
              </ManifestButton>
            </div>
          </LibraryPanel>
        </div>
      </LibraryPanel>
      )}

      {!showStoryBank && (
        <p className="mt-4 text-center font-sans text-[11px] leading-relaxed text-neutral-600">
          Every empty field will be intelligently extrapolated using Chinese light-novel logic.
          A World Blueprint is generated for your review before the story begins.
        </p>
      )}

      {/* Mobile section drawer — the Library navigation shell focused purely
          on Story/World section navigation (no profile header; profile
          access lives in the bottom navigation's Profile tab). */}
      <StorySeedMobileNavigation
        seed={seed}
        updateSeed={updateSeed}
        activeSection={activeSection}
        equippedTitle={equippedRelicTitle}
        showStoryBank={showStoryBank}
        helpOpen={helpOpen}
        isGenerating={isGenerating}
        savedFeedback={savedFeedback}
        onSelectSection={selectMobileSection}
        onToggleStoryBank={toggleStoryBank}
        onOpenHelp={openHelp}
        onSaveDraft={requestSaveDraft}
      />

      {/* Story Seed Help — the `?` guidance menu shared by the mobile bottom
          navigation and the desktop header button. */}
      {helpRequested && (
        <DeferredStorySeedView label="Story Seed Help" variant="modal">
          <StorySeedHelpMenu
            open={helpOpen}
            onClose={closeHelp}
            page="story-seed"
            title="Story Seed Help"
          />
        </DeferredStorySeedView>
      )}
    </div>
  );
}

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Download } from 'lucide-react';
import { type WorldBlueprint, type WorldBlueprintMainCharacter } from '@seihouse/sen/story-seed';
import { STORY_TAG_LIMIT, type StorySeedInput, type StorySeedStoryRequired } from '@seihouse/sen/story-seed';
import { useStoryCreationRuntime, useStoryCreationStore } from '../../../library/story-seed/runtime';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel, CreationButton as ManifestButton } from '@seihouse/sen/presentation';
import { patchStoryRequired, patchWorldIdentity, type UpdateSeed } from './seedState';
import { BlueprintCollectionSections } from './blueprint/BlueprintCollectionSections';
import { LibraryManifestingIcon as SENManifestingIcon } from '@seihouse/library-ui';
import {
  BlueprintHeaderSection,
  BlueprintNotesSection,
  BlueprintMainCharacterSection,
  BlueprintOriginSection,
  BlueprintWorldSettingSection,
} from './blueprint/BlueprintReviewSections';
import { ArcWorkspace } from './workspaces/ArcWorkspace';
import { normalizeWorldBlueprint } from '@seihouse/sen/story-seed';
import { createBlueprintMarkdown } from './blueprint/createBlueprintMarkdown';
import { SEN_LANGUAGES, normalizeSenLanguageCode, type SenLanguageCode } from '@seihouse/sen/contracts';

interface BlueprintReviewProps {
  blueprint: WorldBlueprint;
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  onBack: () => void;
  onStartStory: () => void;
  onExportSeed: () => void;
  isGenerating: boolean;
  /** Permanent story identity, chosen before the story is manifested. */
  originalLanguage: SenLanguageCode;
  onOriginalLanguageChange: (language: SenLanguageCode) => void;
}

export const BlueprintReview = ({
  blueprint,
  setBlueprint,
  seed,
  updateSeed,
  onBack,
  onStartStory,
  onExportSeed,
  isGenerating,
  originalLanguage,
  onOriginalLanguageChange,
}: BlueprintReviewProps) => {
  const runtime = useStoryCreationRuntime();
  const activeAgentId = useStoryCreationStore(state => state.activeAgentId);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [tagLimitError, setTagLimitError] = useState<string | null>(null);
  const copiedTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);
  const origin = seed.story.required;
  const storyTagCount = useMemo(
    () => new Set(origin.storyTags.map(tag => tag.trim()).filter(Boolean)).size,
    [origin.storyTags],
  );
  const mainCharacter = useMemo<WorldBlueprintMainCharacter>(() => ({
    name: blueprint.mainCharacter?.name || '',
    age: blueprint.mainCharacter?.age || '',
    personality: blueprint.mainCharacter?.personality || '',
    appearance: blueprint.mainCharacter?.appearance || '',
    backgroundProfile: blueprint.mainCharacter?.backgroundProfile || blueprint.mcProfile || '',
  }), [
    blueprint.mainCharacter?.age,
    blueprint.mainCharacter?.appearance,
    blueprint.mainCharacter?.backgroundProfile,
    blueprint.mainCharacter?.name,
    blueprint.mainCharacter?.personality,
    blueprint.mcProfile,
  ]);
  const reviewSeed: StorySeedInput = {
    ...seed,
    world: { ...seed.world, optional: { ...seed.world.optional,
      worldFoundations: { ...seed.world.optional.worldFoundations, destinedEnding: blueprint.destinedEnding },
    } },
    story: { ...seed.story, optional: { ...seed.story.optional,
      activeArcGoal: seed.story.optional.activeArcGoal ?? blueprint.arcPlan?.goals[0],
    } },
  };
  const copyPayloadRef = useRef({ blueprint, origin, mainCharacter });

  useEffect(() => {
    copyPayloadRef.current = { blueprint, origin, mainCharacter };
  }, [blueprint, mainCharacter, origin]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const updateOrigin = useCallback((patch: Partial<StorySeedStoryRequired>) => {
    updateSeed(patchStoryRequired(patch));
    setBlueprint(current => ({
      ...current,
      originSnapshot: { ...origin, ...current.originSnapshot, ...patch },
    }));
  }, [origin, setBlueprint, updateSeed]);

  const updateTitle = useCallback((title: string) => {
    updateSeed(patchWorldIdentity({ title }));
    setBlueprint(current => ({ ...current, title }));
  }, [setBlueprint, updateSeed]);

  const updateStoryTags = useCallback((value: string) => {
    const storyTags = value.split(/\r?\n|,/);
    const uniqueTagCount = new Set(storyTags.map(tag => tag.trim()).filter(Boolean)).size;
    setTagLimitError(uniqueTagCount > STORY_TAG_LIMIT
      ? `Story Tags cannot exceed ${STORY_TAG_LIMIT}.`
      : null);
    updateOrigin({ storyTags });
  }, [updateOrigin]);

  const updateMainCharacter = useCallback((patch: Partial<WorldBlueprintMainCharacter>) => {
    setBlueprint(current => {
      const currentMainCharacter: WorldBlueprintMainCharacter = {
        name: current.mainCharacter?.name || '',
        age: current.mainCharacter?.age || '',
        personality: current.mainCharacter?.personality || '',
        appearance: current.mainCharacter?.appearance || '',
        backgroundProfile: current.mainCharacter?.backgroundProfile || current.mcProfile || '',
      };
      const nextMainCharacter = { ...currentMainCharacter, ...patch };
      return {
        ...current,
        mainCharacter: nextMainCharacter,
        // Keep the established combined field synchronized for existing
        // initial-story generation consumers.
        mcProfile: nextMainCharacter.backgroundProfile,
      };
    });
  }, [setBlueprint]);

  const handleCopyBlueprint = useCallback(async () => {
    const { blueprint: currentBlueprint, origin: currentOrigin, mainCharacter: currentMainCharacter } = copyPayloadRef.current;
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;

    const showCopyError = () => {
      if (!isMountedRef.current) return;
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
      setCopied(false);
      setCopyError('The Blueprint could not be copied. Please try again.');
    };

    if (!clipboard || typeof clipboard.writeText !== 'function') {
      showCopyError();
      return;
    }

    try {
      await clipboard.writeText(
        createBlueprintMarkdown(currentBlueprint, currentOrigin, currentMainCharacter),
      );
      if (!isMountedRef.current) return;
      setCopyError(null);
      setCopied(true);
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => {
        copiedTimerRef.current = null;
        setCopied(false);
      }, 2000);
    } catch {
      showCopyError();
    }
  }, []);

  return (
    // The dossier speaks the Seed workspace dialect of the Library glass
    // language: `seed-workspace-shell` brings the parchment-gold / soft-purple
    // field polish, the ambience layer stays gradient-only behind the panels.
    <div className="story-seed-development-surface seed-workspace-shell relative mx-auto max-w-4xl pb-20" id="creation-portal-root">
      <div aria-hidden="true" className="seed-workspace-ambience" />

      <div className="relative space-y-6">
        {/* 1 · Blueprint Header — the dossier cover: editable story title and
              every available artifact metadata chip. */}
        <BlueprintHeaderSection
          blueprintVersion={blueprint.blueprintVersion}
          title={blueprint.title}
          creator={blueprint.creator}
          status={blueprint.status}
          createdAt={blueprint.createdAt}
          updatedAt={blueprint.updatedAt}
          onTitleChange={updateTitle}
        />

        {/* 2 · Origin Snapshot — the creator-authored seed values; edits here
              keep updating the canonical Story Seed used for generation. */}
        <BlueprintOriginSection
          origin={origin}
          storyTagCount={storyTagCount}
          tagLimitError={tagLimitError}
          onUpdateOrigin={updateOrigin}
          onUpdateStoryTags={updateStoryTags}
        />

        {/* 3 · Main Character — the protagonist the blueprint builds around. */}
        <BlueprintMainCharacterSection
          mainCharacter={mainCharacter}
          onUpdateMainCharacter={updateMainCharacter}
        />

        {/* 4 · World Setting — overview leads as a key field; the remaining
              pillars follow in a scannable order. */}
        <BlueprintWorldSettingSection
          worldOverview={blueprint.worldOverview}
          startingLocation={blueprint.startingLocation}
          societyStructure={blueprint.societyStructure}
          powerSystemOutline={blueprint.powerSystemOutline}
          setBlueprint={setBlueprint}
        />

        <ArcWorkspace seed={reviewSeed} updateSeed={update => {
          const next = update(reviewSeed);
          updateSeed(() => next);
          setBlueprint(current => normalizeWorldBlueprint({ ...current,
            destinedEnding: next.world.optional.worldFoundations.destinedEnding,
            arcPlan: undefined,
          }, next));
        }} />

        {!blueprint.arcPlan && <p className="text-sm text-neutral-300">Add an Active Arc Goal, or refine the seed and generate a Blueprint suggestion, before beginning the story.</p>}

        <BlueprintNotesSection styleBible={blueprint.styleBible} estimatedArcs={blueprint.estimatedArcs} setBlueprint={setBlueprint} />

        <BlueprintCollectionSections
          survivalEnabled={seed.story.optional.fateSurvival.enabled}
          initialCharacters={blueprint.initialCharacters}
          majorFactions={blueprint.majorFactions}
          majorMysteries={blueprint.majorMysteries}
          unresolvedPlotThreads={blueprint.unresolvedPlotThreads}
          setBlueprint={setBlueprint}
        />

        {/* Dossier footer — refine / manifest / copy / export actions. */}
        <LibraryPanel padding="sm" className="sm:p-5">
          <div className="flex flex-col items-stretch gap-4 xl:flex-row xl:items-center xl:justify-between">
            <LibraryButton
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={onBack}
              disabled={isGenerating}
              className="self-center xl:self-auto"
            >
              Refine Details
            </LibraryButton>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              {/* Original Language is permanent story identity: it is chosen
                  once here and frozen onto the story when it manifests. */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="story-original-language"
                  className="font-sc text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400"
                >
                  Original Language
                </label>
                <select
                  id="story-original-language"
                  value={originalLanguage}
                  disabled={isGenerating}
                  onChange={event => onOriginalLanguageChange(normalizeSenLanguageCode(event.target.value))}
                  className="h-11 min-w-44 rounded border border-neutral-800 bg-black px-2 font-sans text-[11px] text-signal outline-none transition-all hover:border-portal/50 focus:border-portal disabled:opacity-50"
                >
                  {SEN_LANGUAGES.map(language => (
                    <option key={language.code} value={language.code}>{language.label}</option>
                  ))}
                </select>
                <p className="max-w-44 font-sans text-[10px] leading-snug text-neutral-500">
                  The language this story is written in. It cannot be changed later.
                </p>
              </div>

              <ManifestButton
                size="lg"
                fullWidth
                icon={SENManifestingIcon}
                className="sm:w-auto"
                onClick={onStartStory}
                disabled={!blueprint.arcPlan || blueprint.arcPlan.goals.length !== 1}
                loading={isGenerating}
                loadingIndicator={activeAgentId === 'versa' ? (
                  <img src={runtime.authorMarkUrl} className="size-5 animate-pulse object-contain" alt="" aria-hidden="true" />
                ) : undefined}
                iconRight={!isGenerating ? <ArrowRight size={16} /> : undefined}
              >
                {isGenerating
                  ? (activeAgentId === 'versa' ? 'VERSA is writing...' : 'Manifesting...')
                  : 'Manifest Story'}
              </ManifestButton>

              <div className="flex flex-col items-stretch gap-1 sm:items-center">
                <LibraryButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  className="sm:w-auto"
                  icon={copied ? Check : Copy}
                  onClick={handleCopyBlueprint}
                  aria-describedby={copyError ? 'blueprint-copy-error' : undefined}
                >
                  {copied ? 'Copied Blueprint' : 'Copy Blueprint'}
                </LibraryButton>
                <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {copied ? 'Blueprint copied.' : copyError ? 'Could not copy Blueprint.' : ''}
                </span>
                {copyError && (
                  <p
                    id="blueprint-copy-error"
                    className="max-w-52 text-center font-sans text-[11px] leading-snug text-red-300"
                  >
                    {copyError}
                  </p>
                )}
              </div>

              <LibraryButton
                variant="ghost"
                size="lg"
                fullWidth
                className="sm:w-auto"
                icon={Download}
                onClick={onExportSeed}
              >
                Export Seed + Blueprint
              </LibraryButton>
            </div>
          </div>
        </LibraryPanel>
      </div>
    </div>
  );
};

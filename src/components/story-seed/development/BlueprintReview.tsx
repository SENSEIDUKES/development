import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Copy, Download, Languages, Settings2 } from 'lucide-react';
import { describeBlueprintArcPlanProblem, reviewWorldFactDetail, type WorldBlueprint, type WorldBlueprintMainCharacter, type WorldFactDetailField } from '@seihouse/sen/story-seed';
import { STORY_TAG_LIMIT, type StorySeedInput, type StorySeedStoryRequired, type StorySeedWorldIdentity } from '@seihouse/sen/story-seed';
import { useStoryCreationRuntime, useStoryCreationStore } from '../../../library/story-seed/runtime';
import { NarrativeButton as LibraryButton, CreationButton as ManifestButton } from '@seihouse/sen/presentation';
import { patchStoryRequired, patchWorldIdentity, type UpdateSeed } from './seedState';
import { LibraryManifestingIcon as SENManifestingIcon } from '@seihouse/library-ui';
import {
  BlueprintHeaderSection,
  BlueprintNotesSection,
  BlueprintOriginSection,
  BlueprintWorldSettingSection,
} from './blueprint/BlueprintReviewSections';
import { ArcWorkspace } from './workspaces/ArcWorkspace';
import { BlueprintArcGoalsSection } from './blueprint/BlueprintArcGoalsSection';
import { createBlueprintMarkdown } from './blueprint/createBlueprintMarkdown';
import { BlueprintSectionHeading } from './blueprint/BlueprintDossierPrimitives';
import { BlueprintTabs, blueprintPanelId, blueprintTabId, type BlueprintTabId } from './blueprint/BlueprintTabs';
import { CastScreen } from './blueprint/CastScreen';
import { WorldCardGrid } from './blueprint/WorldCardGrid';
import { StatTable } from './blueprint/StatRows';
import './creator/creator.css';
import { PinnedFooter } from './creator/PinnedFooter';
import './blueprint/blueprint.css';
import { getSenLanguageLabel, normalizeChapterWritingStyle, type SenLanguageCode } from '@seihouse/sen/contracts';

interface BlueprintReviewProps {
  blueprint: WorldBlueprint;
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  onBack: () => void;
  onStartStory: () => void;
  onExportSeed: () => void;
  isGenerating: boolean;
  /** Replaces the whole Blueprint with a fresh one for a story of the chosen length. */
  onRegenerateBlueprint?: (arcCount: number) => Promise<void>;
  /** The seed's Story Language, chosen in Story Seed Settings and confirmed here before Manifest. */
  originalLanguage: SenLanguageCode;
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
  onRegenerateBlueprint,
  originalLanguage,
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
  // Every value the Seed owns is displayed and edited on the Seed itself; the
  // Blueprint mirrors it (CreationModal) and keeps only its own prose fields.
  const identity = seed.world.optional.worldIdentity;
  const mainCharacter = useMemo<WorldBlueprintMainCharacter>(() => ({
    name: blueprint.mainCharacter?.name || '',
    age: blueprint.mainCharacter?.age || '',
    personality: blueprint.mainCharacter?.personality || '',
    appearance: blueprint.mainCharacter?.appearance || '',
    backgroundProfile: blueprint.mainCharacter?.backgroundProfile || blueprint.mcProfile || '',
  }), [blueprint.mainCharacter, blueprint.mcProfile]);
  const copyPayloadRef = useRef({ blueprint, origin, mainCharacter });
  const arcProblem = describeBlueprintArcPlanProblem(blueprint);
  // A regeneration owns the busy state, so the Manifest button never claims
  // to be manifesting while the Blueprint is being replaced.
  const [regenerating, setRegenerating] = useState(false);
  const regenerate = useCallback(async (arcCount: number) => {
    if (!onRegenerateBlueprint) return;
    setRegenerating(true);
    try {
      await onRegenerateBlueprint(arcCount);
    } finally {
      if (isMountedRef.current) setRegenerating(false);
    }
  }, [onRegenerateBlueprint]);

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
  }, [updateSeed]);

  const updateTitle = useCallback((title: string) => {
    updateSeed(patchWorldIdentity({ title }));
  }, [updateSeed]);

  const updateStoryTags = useCallback((value: string) => {
    const storyTags = value.split(/\r?\n|,/);
    const uniqueTagCount = new Set(storyTags.map(tag => tag.trim()).filter(Boolean)).size;
    setTagLimitError(uniqueTagCount > STORY_TAG_LIMIT
      ? `Story Tags cannot exceed ${STORY_TAG_LIMIT}.`
      : null);
    updateOrigin({ storyTags });
  }, [updateOrigin]);

  const updateWorldIdentity = useCallback((patch: Partial<StorySeedWorldIdentity>) => {
    updateSeed(patchWorldIdentity(patch));
  }, [updateSeed]);

  const updateBackgroundProfile = useCallback((backgroundProfile: string) => {
    setBlueprint(current => ({
      ...current,
      mainCharacter: { ...(current.mainCharacter ?? mainCharacter), backgroundProfile },
      mcProfile: backgroundProfile,
    }));
  }, [mainCharacter, setBlueprint]);

  const updatePowerSystemOutline = useCallback((powerSystemOutline: string) => {
    setBlueprint(current => ({ ...current, powerSystemOutline }));
  }, [setBlueprint]);

  const updateWorldFactDetail = useCallback((field: WorldFactDetailField, value: string, fact: string) => {
    setBlueprint(current => reviewWorldFactDetail(current, field, value, fact));
  }, [setBlueprint]);
  const worldFactDetails = useMemo(() => ({
    worldOverviewDetail: blueprint.worldOverviewDetail,
    worldOverviewDetailBasis: blueprint.worldOverviewDetailBasis,
    startingLocationDetail: blueprint.startingLocationDetail,
    startingLocationDetailBasis: blueprint.startingLocationDetailBasis,
    societyStructureDetail: blueprint.societyStructureDetail,
    societyStructureDetailBasis: blueprint.societyStructureDetailBasis,
  }), [
    blueprint.worldOverviewDetail, blueprint.worldOverviewDetailBasis,
    blueprint.startingLocationDetail, blueprint.startingLocationDetailBasis,
    blueprint.societyStructureDetail, blueprint.societyStructureDetailBasis,
  ]);

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

  // The four pages share one scroller; a new page opens at its top.
  const [tab, setTab] = useState<BlueprintTabId>('story');
  const rootRef = useRef<HTMLDivElement>(null);
  const selectTab = useCallback((next: BlueprintTabId) => {
    setTab(next);
    const root = rootRef.current;
    const scroller = root?.closest('.workspace-shell-main');
    if (root && scroller && typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top: Math.max(0, root.offsetTop - 8) });
    }
  }, []);
  const panel = (id: BlueprintTabId) => ({
    id: blueprintPanelId(id), role: 'tabpanel' as const, 'aria-labelledby': blueprintTabId(id),
    hidden: tab !== id, className: 'bp-panel',
  });
  const createLabel = isGenerating && !regenerating ? 'Creating...' : 'Create Story';

  return (
    // The dossier speaks the Seed workspace dialect of the Library glass
    // language: `seed-field-scope` brings the parchment-gold / soft-purple
    // field polish, the ambience layer stays gradient-only behind the panels.
    // Its four pages stay mounted (only the open one shows), so every field
    // keeps its place and id whichever page is open.
    <div ref={rootRef} className="story-seed-development-surface seed-field-scope bp-dossier relative mx-auto max-w-5xl" id="creation-portal-root">
      <div aria-hidden="true" className="seed-workspace-ambience" />
      <BlueprintTabs tab={tab} onSelect={selectTab} />

      <div className="relative">
        <div {...panel('story')}>
          {/* The dossier cover: the story's title and its record. */}
          <BlueprintHeaderSection
            blueprintVersion={blueprint.blueprintVersion}
            title={identity.title ?? ''}
            creator={blueprint.creator}
            status={blueprint.status}
            createdAt={blueprint.createdAt}
            updatedAt={blueprint.updatedAt}
            onTitleChange={updateTitle}
          />

          {/* Origin Snapshot: the creator-authored seed values; edits here
              keep updating the canonical Story Seed used for generation. */}
          <BlueprintOriginSection
            origin={origin}
            storyTagCount={storyTagCount}
            tagLimitError={tagLimitError}
            onUpdateOrigin={updateOrigin}
            onUpdateStoryTags={updateStoryTags}
          />

          <BlueprintNotesSection styleBible={blueprint.styleBible} setBlueprint={setBlueprint} />

          {/* The Story Settings this novel starts with, confirmed before
              Create. They are edited in Story Seed Settings. */}
          <section className="bp-section" aria-labelledby="blueprint-story-settings-heading" data-testid="blueprint-story-settings">
            <BlueprintSectionHeading id="blueprint-story-settings-heading" icon={Settings2} title="Story Settings"
              tagline="Change these in Settings from Refine Details. The language can’t be changed once the novel begins." />
            <StatTable label="Story settings" rows={[
              { id: 'language', label: 'Story Language', icon: Languages,
                value: <span data-testid="blueprint-story-language" data-language={originalLanguage}>{getSenLanguageLabel(originalLanguage)}</span> },
              { id: 'reading-mode', label: 'Reading Mode', icon: BookOpen,
                value: <span data-testid="blueprint-reading-mode">{normalizeChapterWritingStyle(seed.story.optional.chapterWritingStyle)}</span> },
            ]} />
          </section>

          {/* Keep or share the Blueprint: equal buttons, side by side. */}
          <section className="bp-section" aria-labelledby="blueprint-more-heading">
            <BlueprintSectionHeading id="blueprint-more-heading" icon={Download} title="Keep a Copy" />
            <div className="bp-more">
              <LibraryButton
                variant="secondary"
                size="md"
                fullWidth
                icon={copied ? Check : Copy}
                onClick={handleCopyBlueprint}
                aria-describedby={copyError ? 'blueprint-copy-error' : undefined}
              >
                {copied ? 'Copied Blueprint' : 'Copy Blueprint'}
              </LibraryButton>
              <LibraryButton variant="secondary" size="md" fullWidth icon={Download} onClick={onExportSeed}>
                Export Seed + Blueprint
              </LibraryButton>
            </div>
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {copied ? 'Blueprint copied.' : copyError ? 'Could not copy Blueprint.' : ''}
            </span>
            {copyError && (
              <p id="blueprint-copy-error" className="mt-2 font-sans text-[11px] leading-snug text-red-300">{copyError}</p>
            )}
          </section>
        </div>

        <div {...panel('cast')}>
          {/* The cast, as a Star Rail character screen: the Seed's own
              characters plus the Blueprint's background prose. */}
          <CastScreen
            seed={seed}
            updateSeed={updateSeed}
            backgroundProfile={mainCharacter.backgroundProfile}
            onBackgroundProfileChange={updateBackgroundProfile}
          />
        </div>

        <div {...panel('world')}>
          {/* World Setting: the Seed's world identity, abilities, and power
              system, plus the Blueprint's power outline prose. */}
          <BlueprintWorldSettingSection
            seed={seed}
            updateSeed={updateSeed}
            worldType={identity.worldType ?? ''}
            startingLocation={identity.startingLocation ?? ''}
            societyStructure={identity.societyStructure ?? ''}
            powerSystemOutline={blueprint.powerSystemOutline}
            onUpdateWorldIdentity={updateWorldIdentity}
            onPowerSystemOutlineChange={updatePowerSystemOutline}
            worldFactDetails={worldFactDetails}
            onWorldFactDetailChange={updateWorldFactDetail}
          />
          <WorldCardGrid seed={seed} updateSeed={updateSeed} />
        </div>

        <div {...panel('arcs')}>
          <BlueprintArcGoalsSection
            arcPlans={blueprint.arcPlans}
            estimatedArcs={blueprint.estimatedArcs}
            arcOneScope={blueprint.arcOneScope}
            destinedEnding={seed.world.optional.worldFoundations.destinedEnding}
            problem={arcProblem}
            setBlueprint={setBlueprint}
            updateSeed={updateSeed}
            regenerating={regenerating}
            generating={isGenerating}
            onRegenerate={onRegenerateBlueprint ? regenerate : undefined}
          />
          <ArcWorkspace seed={seed} updateSeed={updateSeed} showActiveArcGoal={false} showStoryLength={false} />
        </div>
      </div>

      {/* Pinned like the Seed creator's footer: back to the Seed, or create
          the story. Equal cells, so neither button changes size with its label. */}
      <PinnedFooter data-blueprint-footer>
        <div className="seed-creator-footer-inner">
          <div className="seed-creator-footer-cell">
            <LibraryButton variant="ghost" size="md" fullWidth icon={ArrowLeft} onClick={onBack} disabled={isGenerating}>
              Refine Details
            </LibraryButton>
          </div>
          <div className="seed-creator-footer-progress" />
          <div className="seed-creator-footer-cell">
            <ManifestButton
              size="md"
              fullWidth
              icon={SENManifestingIcon}
              onClick={onStartStory}
              disabled={Boolean(arcProblem) || regenerating}
              loading={isGenerating && !regenerating}
              loadingIndicator={activeAgentId === 'versa' ? (
                <img src={runtime.authorMarkUrl} className="size-5 animate-pulse object-contain" alt="" aria-hidden="true" />
              ) : undefined}
              aria-label={arcProblem ? `${createLabel} — fix the arc plan in Arcs first` : undefined}
              title={arcProblem ? 'Fix the arc plan in Arcs first' : undefined}
              iconRight={!isGenerating ? <ArrowRight size={16} /> : undefined}
            >
              {createLabel}
            </ManifestButton>
          </div>
        </div>
      </PinnedFooter>
    </div>
  );
};

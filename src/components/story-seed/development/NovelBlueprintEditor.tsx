import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { Hourglass, RotateCcw, Save } from 'lucide-react';
import {
  mirrorSeedIntoBlueprint,
  normalizeStorySeedInput,
  reconcileStorySeedBlueprint,
  reviewWorldFactDetail,
  type StorySeedInput,
  type WorldBlueprint,
} from '@seihouse/sen/story-seed';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';
import { patchWorldIdentity, type SeedUpdate } from './seedState';
import { BlueprintSectionHeading } from './blueprint/BlueprintDossierPrimitives';
import { BlueprintCollectionSections } from './blueprint/BlueprintCollectionSections';
import {
  BlueprintHeaderSection,
  BlueprintMainCharacterSection,
  BlueprintNotesSection,
  BlueprintWorldSettingSection,
} from './blueprint/BlueprintReviewSections';

/** A novel's own saved copy of the Story Seed and World Blueprint it began from. */
export interface NovelBlueprintSnapshot {
  seed: StorySeedInput;
  blueprint: WorldBlueprint;
}

export interface NovelBlueprintEditorProps {
  snapshot: NovelBlueprintSnapshot;
  /** The novel's fixed destination, shown but never edited here. */
  destinedEnding?: string;
  busy?: boolean;
  onSave: (next: NovelBlueprintSnapshot) => Promise<void>;
}

/**
 * The novel's World Blueprint, reopened after the story began. It reuses the
 * Blueprint review's own sections, Seed <-> Blueprint mirroring and
 * validation; saving hands the edited pair back to the host, which records it
 * as a new Foundation revision so future chapters receive it and committed
 * chapters keep the revision they were written against.
 *
 * Values fixed once a novel begins are not offered here: the Destined Ending
 * (its destination), the arc count, the Origin (premise, genre, storytelling
 * tradition, tags) and the story's original language. Arc Goals are edited
 * beside this editor under the novel's mode rules.
 */
export function NovelBlueprintEditor({ snapshot, destinedEnding, busy = false, onSave }: NovelBlueprintEditorProps) {
  const initial = useMemo(() => reconcileStorySeedBlueprint(snapshot.seed, snapshot.blueprint), [snapshot]);
  const [seed, setSeed] = useState<StorySeedInput>(initial.seed);
  const [blueprint, setBlueprintState] = useState<WorldBlueprint>(initial.blueprint);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const initialKey = useMemo(() => JSON.stringify(initial), [initial]);
  useEffect(() => {
    setSeed(initial.seed);
    setBlueprintState(initial.blueprint);
    setError('');
  }, [initial]);

  const updateSeed = useCallback((update: SeedUpdate) => { setSeed(update); setSaved(false); }, []);
  const setBlueprint = useCallback((update: SetStateAction<WorldBlueprint>) => { setBlueprintState(update); setSaved(false); }, []);
  // The same rule as the creation review: the Seed owns every value it has a
  // field for, and the Blueprint mirrors it at once.
  useEffect(() => {
    setBlueprintState(current => {
      try { return mirrorSeedIntoBlueprint(current, normalizeStorySeedInput(seed)); }
      catch { return current; }
    });
  }, [seed]);

  const dirty = JSON.stringify({ seed, blueprint }) !== initialKey;
  const identity = seed.world.optional.worldIdentity;
  const mainCharacterBackground = blueprint.mainCharacter?.backgroundProfile || blueprint.mcProfile || '';
  const save = async () => {
    setSaving(true); setError('');
    try {
      const reconciled = reconcileStorySeedBlueprint(seed, blueprint);
      await onSave(reconciled);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The Blueprint could not be saved.');
    } finally { setSaving(false); }
  };
  const disabled = busy || saving;

  return (
    <div className="story-seed-development-surface seed-workspace-shell relative space-y-6" data-testid="novel-blueprint-editor">
      <BlueprintHeaderSection
        blueprintVersion={blueprint.blueprintVersion}
        title={identity.title ?? ''}
        creator={blueprint.creator}
        status={blueprint.status}
        createdAt={blueprint.createdAt}
        updatedAt={blueprint.updatedAt}
        onTitleChange={title => updateSeed(patchWorldIdentity({ title }))}
      />
      <LibraryPanel as="section" aria-labelledby="novel-blueprint-ending-heading" padding="md">
        <BlueprintSectionHeading id="novel-blueprint-ending-heading" icon={Hourglass} title="Destined Ending"
          tagline="The novel's fixed destination. Every arc's plan is a route toward it, so it is not edited here." />
        <p className="mt-4 text-sm leading-relaxed text-neutral-200" data-testid="novel-blueprint-destined-ending">
          {destinedEnding?.trim() || 'Not set yet. It is established before the first chapter.'}
        </p>
        {blueprint.arcPlans?.length ? (
          <p className="mt-2 text-xs text-neutral-400" data-testid="novel-blueprint-arc-count">
            Planned length · {blueprint.arcPlans.length} {blueprint.arcPlans.length === 1 ? 'arc' : 'arcs'}, set when the novel began.
          </p>
        ) : null}
      </LibraryPanel>
      <BlueprintMainCharacterSection
        seed={seed}
        updateSeed={updateSeed}
        backgroundProfile={mainCharacterBackground}
        onBackgroundProfileChange={backgroundProfile => setBlueprint(current => ({
          ...current,
          mainCharacter: { ...(current.mainCharacter ?? { name: '', age: '', personality: '', appearance: '', backgroundProfile: '' }), backgroundProfile },
          mcProfile: backgroundProfile,
        }))}
      />
      <BlueprintWorldSettingSection
        seed={seed}
        updateSeed={updateSeed}
        worldType={identity.worldType ?? ''}
        startingLocation={identity.startingLocation ?? ''}
        societyStructure={identity.societyStructure ?? ''}
        powerSystemOutline={blueprint.powerSystemOutline}
        onUpdateWorldIdentity={patch => updateSeed(patchWorldIdentity(patch))}
        onPowerSystemOutlineChange={powerSystemOutline => setBlueprint(current => ({ ...current, powerSystemOutline }))}
        worldFactDetails={{
          worldOverviewDetail: blueprint.worldOverviewDetail,
          worldOverviewDetailBasis: blueprint.worldOverviewDetailBasis,
          startingLocationDetail: blueprint.startingLocationDetail,
          startingLocationDetailBasis: blueprint.startingLocationDetailBasis,
          societyStructureDetail: blueprint.societyStructureDetail,
          societyStructureDetailBasis: blueprint.societyStructureDetailBasis,
        }}
        onWorldFactDetailChange={(field, value, fact) => setBlueprint(current => reviewWorldFactDetail(current, field, value, fact))}
      />
      <BlueprintNotesSection styleBible={blueprint.styleBible} setBlueprint={setBlueprint} />
      <BlueprintCollectionSections
        seed={seed}
        updateSeed={updateSeed}
      />
      <LibraryPanel padding="sm" className="sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs leading-relaxed text-neutral-400">
            Saving records a new Foundation revision for this novel. Future chapters use it; chapters already written keep the Blueprint they were written with.
          </p>
          <div className="flex flex-wrap gap-2">
            <LibraryButton type="button" variant="ghost" size="sm" icon={RotateCcw} disabled={disabled || !dirty}
              onClick={() => { setSeed(initial.seed); setBlueprintState(initial.blueprint); setError(''); }}>
              Discard changes
            </LibraryButton>
            <LibraryButton type="button" size="sm" icon={Save} disabled={disabled || !dirty} loading={saving} onClick={() => void save()}>
              Save Blueprint
            </LibraryButton>
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        <p role="status" className="mt-2 text-xs text-emerald-200">{saved && !dirty ? 'Blueprint saved. The next chapter uses it.' : ''}</p>
      </LibraryPanel>
    </div>
  );
}

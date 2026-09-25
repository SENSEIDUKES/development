import { memo, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Map as RoadmapIcon, Plus, RefreshCw } from 'lucide-react';
import { ARC_LENGTH, ArcPlanView, MAX_ROADMAP_ARCS, arcsCanBeAddedBeforeFinal, type ArcPlan } from '@seihouse/sen/arc-goals';
import { type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { BlueprintSectionHeading } from './BlueprintDossierPrimitives';
import { type UpdateSeed } from '../seedState';

/** A roadmap change that asks the Blueprint model for new plans. */
export type BlueprintArcAction = 'add' | 'regenerate';

interface BlueprintArcRoadmapSectionProps {
  arcPlans?: ArcPlan[];
  estimatedArcs: number;
  destinedEnding?: string;
  /** Why the roadmap cannot begin a story yet, if it cannot. */
  problem?: string;
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
  updateSeed: UpdateSeed;
  /** The arc action in progress, if one is. */
  arcAction?: BlueprintArcAction | null;
  /** Any generation is running, here or elsewhere in Story Seed. */
  generating?: boolean;
  /** Plans only the arcs being added, keeping every saved arc. Absent when the host cannot. */
  onAddArcs?: (arcCount: number) => Promise<void>;
  /** Replaces the whole Blueprint with one planned at the chosen arc count. */
  onRegenerate?: (arcCount: number) => Promise<void>;
}

const arcsLabel = (count: number) => `${count} ${count === 1 ? 'arc' : 'arcs'}`;

/**
 * The Blueprint's arc roadmap: every arc's saved goal plan, reviewed and
 * edited before the story begins. Each plan uses the shared Arc Goal editor
 * and validation. Arc 1's first goal is the Seed's Active Arc Goal, so an edit
 * to it is written through to the Seed.
 *
 * The arc count is chosen here too. A longer roadmap can be reached two ways:
 * plan only the new arcs, which go in before the final arc so the route still
 * ends at the Destined Ending, or regenerate the whole Blueprint at that count.
 * A shorter one is only reached by regenerating, since removing arcs would
 * break the route.
 */
export const BlueprintArcRoadmapSection = memo(({
  arcPlans = [], estimatedArcs, destinedEnding, problem, setBlueprint, updateSeed,
  arcAction = null, generating = false, onAddArcs, onRegenerate,
}: BlueprintArcRoadmapSectionProps) => {
  const [countText, setCountText] = useState(String(estimatedArcs));
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [actionError, setActionError] = useState('');
  // A new roadmap (added arcs or a fresh Blueprint) resets the chosen count.
  useEffect(() => {
    setCountText(String(estimatedArcs));
    setConfirmingRegenerate(false);
  }, [estimatedArcs]);

  const busy = Boolean(arcAction) || generating;
  const chosen = Number(countText);
  const countValid = countText.trim() !== '' && Number.isInteger(chosen) && chosen >= 1 && chosen <= MAX_ROADMAP_ARCS;
  const adding = countValid ? chosen - estimatedArcs : 0;
  const canInsert = !problem && arcsCanBeAddedBeforeFinal(arcPlans);
  const addUnavailable = !onAddArcs
    ? 'Adding arcs is not available here; regenerate the Blueprint instead.'
    : problem
      ? 'Arcs can be added once every arc has a saved plan; regenerate the Blueprint first.'
      : !canInsert
        ? 'This roadmap plans the whole story as one arc, which is both its opening and its final arc, so there is no place to add arcs without re-planning it. Regenerate the Blueprint to plan more arcs.'
        : undefined;

  const run = async (action: BlueprintArcAction) => {
    const handler = action === 'add' ? onAddArcs : onRegenerate;
    if (!handler || !countValid) return;
    setActionError('');
    setConfirmingRegenerate(false);
    try {
      await handler(chosen);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The arcs could not be planned. Nothing was changed; please retry.');
    }
  };

  const savePlan = (edited: ArcPlan) => {
    setBlueprint(current => ({
      ...current,
      arcPlans: (current.arcPlans ?? []).map(plan => plan.arcNumber === edited.arcNumber ? edited : plan),
    }));
    if (edited.arcNumber === 1) {
      const opening = edited.goals[0];
      updateSeed((current: StorySeedInput) => ({ ...current, story: { ...current.story, optional: {
        ...current.story.optional, activeArcGoal: { id: opening.id, text: opening.text, chapters: ARC_LENGTH },
      } } }));
    }
  };

  return (
    <LibraryPanel as="section" aria-labelledby="blueprint-roadmap-heading" padding="md" data-testid="blueprint-arc-roadmap">
      <BlueprintSectionHeading
        id="blueprint-roadmap-heading"
        icon={RoadmapIcon}
        title="Arc Roadmap"
        tagline={`${arcsLabel(estimatedArcs)} of ${ARC_LENGTH} chapters, planned as one route to the Destined Ending. Review and edit every arc before the story begins.`}
      />
      {destinedEnding?.trim() && (
        <p className="mt-4 text-sm text-neutral-300"><span className="font-sc text-[10px] uppercase tracking-[0.16em] text-[#DDC58A]">Destination · </span>{destinedEnding}</p>
      )}

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4" data-testid="blueprint-arc-count">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28">
            <LibraryTextBox
              id="blueprint-arc-count-input"
              label="Arc count"
              type="number"
              size="compact"
              min={1}
              max={MAX_ROADMAP_ARCS}
              step={1}
              inputMode="numeric"
              value={countText}
              disabled={busy}
              invalid={!countValid}
              onChange={value => { setCountText(value); setActionError(''); setConfirmingRegenerate(false); }}
            />
          </div>
          {countValid && adding > 0 && (
            <LibraryButton type="button" size="sm" icon={Plus} disabled={busy || Boolean(addUnavailable)}
              loading={arcAction === 'add'} onClick={() => void run('add')}>
              {arcAction === 'add' ? 'Planning new arcs…' : `Add ${arcsLabel(adding)}`}
            </LibraryButton>
          )}
          {onRegenerate && (
            <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCw} disabled={busy || !countValid}
              loading={arcAction === 'regenerate'} aria-expanded={confirmingRegenerate}
              onClick={() => { setActionError(''); setConfirmingRegenerate(true); }}>
              {arcAction === 'regenerate'
                ? 'Regenerating…'
                : countValid && chosen !== estimatedArcs ? `Regenerate with ${arcsLabel(chosen)}` : 'Regenerate whole Blueprint'}
            </LibraryButton>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-400" data-testid="blueprint-arc-count-help">
          {!countValid
            ? `Choose a whole number of arcs from 1 to ${MAX_ROADMAP_ARCS}.`
            : adding > 0
              ? addUnavailable ?? `Add ${arcsLabel(adding)} plans only the new arcs. They go in before your final arc, so the story still reaches the Destined Ending in its last arc, and every arc you have keeps its goals.`
              : adding < 0
                ? `Planning fewer arcs means regenerating the whole Blueprint, so the shorter route still reaches the Destined Ending.`
                : `Raise the count to add arcs, or regenerate the whole Blueprint.`}
        </p>
        {confirmingRegenerate && (
          <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-950/20 p-3" data-testid="blueprint-regenerate-confirm">
            <p className="text-sm leading-relaxed text-amber-100">
              Replace this Blueprint with a fresh one planned at {arcsLabel(chosen)}? Every arc&apos;s goals and your edits to the Blueprint&apos;s own notes are replaced. Your Story Seed, including the Destined Ending and the opening goal, stays as it is.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LibraryButton type="button" size="sm" variant="danger" icon={RefreshCw} onClick={() => void run('regenerate')}>
                Replace Blueprint
              </LibraryButton>
              <LibraryButton type="button" size="sm" variant="ghost" onClick={() => setConfirmingRegenerate(false)}>
                Keep this Blueprint
              </LibraryButton>
            </div>
          </div>
        )}
        {actionError && <p role="alert" className="mt-3 text-sm text-red-300" data-testid="blueprint-arc-action-error">{actionError}</p>}
      </div>

      {problem && <p className="mt-4 text-sm text-amber-200" data-testid="blueprint-roadmap-problem">{problem}</p>}
      <div className="mt-2">
        {arcPlans.map(plan => (
          <ArcPlanView key={`${plan.arcNumber}-${plan.goals.map(goal => goal.id).join('|')}`} plan={plan} onEdit={busy ? undefined : savePlan}
            title={`Arc ${plan.arcNumber}${plan.arcNumber === estimatedArcs ? ' · final arc, reaches the Destined Ending' : ''} · ${plan.goals.length} ${plan.goals.length === 1 ? 'goal' : 'goals'}`}
            editLabel={`Edit Arc ${plan.arcNumber} goals`} />
        ))}
      </div>
    </LibraryPanel>
  );
});
BlueprintArcRoadmapSection.displayName = 'BlueprintArcRoadmapSection';

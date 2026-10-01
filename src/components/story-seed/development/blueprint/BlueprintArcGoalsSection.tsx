import { memo, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Map as RoadmapIcon, RefreshCw } from 'lucide-react';
import { ARC_LENGTH, ArcPlanView, MAX_ROADMAP_ARCS, type ArcPlan } from '@seihouse/sen/arc-goals';
import { type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { BlueprintSectionHeading } from './BlueprintDossierPrimitives';
import { type UpdateSeed } from '../seedState';

interface BlueprintArcGoalsSectionProps {
  arcPlans?: ArcPlan[];
  estimatedArcs: number;
  /** What Arc 1 was planned as; absent, what the length says. */
  arcOneScope?: WorldBlueprint['arcOneScope'];
  destinedEnding?: string;
  /** Why the Blueprint cannot begin a story yet, if it cannot. */
  problem?: string;
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
  updateSeed: UpdateSeed;
  /** A whole-Blueprint regeneration is running from here. */
  regenerating?: boolean;
  /** Any generation is running, here or elsewhere in Story Seed. */
  generating?: boolean;
  /** Replaces the whole Blueprint with one for a story of the chosen length. */
  onRegenerate?: (arcCount: number) => Promise<void>;
}

const arcsLabel = (count: number) => `${count} ${count === 1 ? 'arc' : 'arcs'}`;

/**
 * The Blueprint's goal section: Arc 1's goals, the only arc a Blueprint plans
 * and the only one the reader sees, and the story's length. Every later arc is
 * planned when the reader begins it, and this same section reappears in the
 * Reader for its review. The hidden look-ahead is never shown.
 *
 * The length is the Seed's Story Length, so saving it here writes the Seed and
 * the Blueprint follows. It saves without a model call, except across the
 * one-arc line: a one-arc story's Arc 1 is the whole story and ends at the
 * Destined Ending, so changing to or from one arc re-plans Arc 1 by
 * regenerating the Blueprint. A length changed across that line on the ARC
 * page is offered the same regeneration here.
 */
export const BlueprintArcGoalsSection = memo(({
  arcPlans = [], estimatedArcs, arcOneScope, destinedEnding, problem, setBlueprint, updateSeed,
  regenerating = false, generating = false, onRegenerate,
}: BlueprintArcGoalsSectionProps) => {
  const [countText, setCountText] = useState(String(estimatedArcs));
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [actionError, setActionError] = useState('');
  // A saved length or a fresh Blueprint resets the chosen length.
  useEffect(() => {
    setCountText(String(estimatedArcs));
    setConfirmingRegenerate(false);
  }, [estimatedArcs]);

  const busy = regenerating || generating;
  const chosen = Number(countText);
  const countValid = countText.trim() !== '' && Number.isInteger(chosen) && chosen >= 1 && chosen <= MAX_ROADMAP_ARCS;
  const changed = countValid && chosen !== estimatedArcs;
  const arcOne = arcPlans[0];
  // Arc 1 is planned differently when it is the whole story.
  const plannedWhole = arcOneScope ? arcOneScope === 'whole-story' : estimatedArcs === 1;
  const crossesOneArc = countValid && (chosen === 1) !== plannedWhole;
  // The length already set no longer fits Arc 1 (changed on the ARC page).
  const replanNeeded = Boolean(arcOne) && !changed && crossesOneArc;

  const saveLength = () => {
    if (!changed || crossesOneArc) return;
    // The Seed owns the length; the Blueprint mirrors it and trims its look-ahead.
    updateSeed((current: StorySeedInput) => ({ ...current, story: { ...current.story, optional: { ...current.story.optional, arcCount: chosen } } }));
  };
  const regenerate = async () => {
    if (!onRegenerate || !countValid) return;
    setActionError('');
    setConfirmingRegenerate(false);
    try {
      await onRegenerate(chosen);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The Blueprint could not be regenerated. Nothing was changed; please retry.');
    }
  };

  const savePlan = (edited: ArcPlan) => {
    setBlueprint(current => ({ ...current, arcPlans: [edited] }));
    const opening = edited.goals[0];
    updateSeed((current: StorySeedInput) => ({ ...current, story: { ...current.story, optional: {
      ...current.story.optional, activeArcGoal: { id: opening.id, text: opening.text, chapters: ARC_LENGTH },
    } } }));
  };

  return (
    <LibraryPanel as="section" aria-labelledby="blueprint-arc-goals-heading" padding="md" data-testid="blueprint-arc-goals">
      <BlueprintSectionHeading
        id="blueprint-arc-goals-heading"
        icon={RoadmapIcon}
        title="Arc Goals"
        tagline={`Arc 1 of ${arcsLabel(estimatedArcs)} of ${ARC_LENGTH} chapters. Each later arc is planned when it begins, from where the story is, and its goals appear for your review before its first chapter.`}
      />
      {destinedEnding?.trim() && (
        <p className="mt-4 text-sm text-neutral-300"><span className="font-sc text-[10px] uppercase tracking-[0.16em] text-[#DDC58A]">Destination · </span>{destinedEnding}</p>
      )}

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4" data-testid="blueprint-story-length">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <LibraryTextBox
              id="blueprint-arc-count-input"
              label="Story length (arcs)"
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
          {changed && !crossesOneArc && (
            <LibraryButton type="button" size="sm" disabled={busy} onClick={saveLength}>
              Save length
            </LibraryButton>
          )}
          {onRegenerate && (
            <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCw} disabled={busy || !countValid}
              loading={regenerating} aria-expanded={confirmingRegenerate}
              onClick={() => { setActionError(''); setConfirmingRegenerate(true); }}>
              {regenerating
                ? 'Regenerating…'
                : changed || replanNeeded ? `Regenerate with ${arcsLabel(chosen)}` : 'Regenerate whole Blueprint'}
            </LibraryButton>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-400" data-testid="blueprint-arc-count-help">
          {!countValid
            ? `Choose a whole number of arcs from 1 to ${MAX_ROADMAP_ARCS}.`
            : replanNeeded
              ? `Arc 1 was planned for a different length. Regenerate to plan Arc 1 for ${arcsLabel(chosen)}, or change the length back.`
              : crossesOneArc
                ? plannedWhole
                  ? `Arc 1 was planned as the whole story, ending at the Destined Ending. A ${arcsLabel(chosen)} story needs Arc 1 re-planned as its opening: regenerate the Blueprint.`
                  : 'A one-arc story\'s Arc 1 is the whole story and ends at the Destined Ending, so Arc 1 is re-planned: regenerate the Blueprint.'
                : changed
                  ? `Saving the length changes no goals. Arc ${chosen}, the final arc, will arrive at the Destined Ending.`
                  : 'Change the length to make the story longer or shorter, or regenerate the whole Blueprint.'}
        </p>
        {confirmingRegenerate && (
          <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-950/20 p-3" data-testid="blueprint-regenerate-confirm">
            <p className="text-sm leading-relaxed text-amber-100">
              Replace this Blueprint with a fresh one for {arcsLabel(chosen)}? Arc 1&apos;s goals and your edits to the Blueprint&apos;s own notes are replaced. Your Story Seed, including the Destined Ending and the opening goal, stays as it is.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LibraryButton type="button" size="sm" variant="danger" icon={RefreshCw} onClick={() => void regenerate()}>
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

      {problem && <p className="mt-4 text-sm text-amber-200" data-testid="blueprint-arc-problem">{problem}</p>}
      {arcOne && (
        <div className="mt-2">
          <ArcPlanView key={arcOne.goals.map(goal => goal.id).join('|')} plan={arcOne} onEdit={busy ? undefined : savePlan} defaultOpen
            title={`Arc 1${plannedWhole ? ' · the whole story, reaches the Destined Ending' : ''} · ${arcOne.goals.length} ${arcOne.goals.length === 1 ? 'goal' : 'goals'}`}
            editLabel="Edit Arc 1 goals" />
        </div>
      )}
    </LibraryPanel>
  );
});
BlueprintArcGoalsSection.displayName = 'BlueprintArcGoalsSection';

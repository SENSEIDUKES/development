import { memo, type Dispatch, type SetStateAction } from 'react';
import { Map as RoadmapIcon } from 'lucide-react';
import { ARC_LENGTH, ArcPlanView, type ArcPlan } from '@seihouse/sen/arc-goals';
import { type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';
import { BlueprintSectionHeading } from './BlueprintDossierPrimitives';
import { type UpdateSeed } from '../seedState';

interface BlueprintArcRoadmapSectionProps {
  arcPlans?: ArcPlan[];
  estimatedArcs: number;
  destinedEnding?: string;
  /** Why the roadmap cannot begin a story yet, if it cannot. */
  problem?: string;
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
  updateSeed: UpdateSeed;
}

/**
 * The Blueprint's arc roadmap: every arc's saved goal plan, reviewed and
 * edited before the story begins. Each plan uses the shared Arc Goal editor
 * and validation. Arc 1's first goal is the Seed's Active Arc Goal, so an edit
 * to it is written through to the Seed.
 */
export const BlueprintArcRoadmapSection = memo(({
  arcPlans = [], estimatedArcs, destinedEnding, problem, setBlueprint, updateSeed,
}: BlueprintArcRoadmapSectionProps) => {
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
        tagline={`${estimatedArcs} ${estimatedArcs === 1 ? 'arc' : 'arcs'} of ${ARC_LENGTH} chapters, planned as one route to the Destined Ending. Review and edit every arc before the story begins.`}
      />
      {destinedEnding?.trim() && (
        <p className="mt-4 text-sm text-neutral-300"><span className="font-sc text-[10px] uppercase tracking-[0.16em] text-[#DDC58A]">Destination · </span>{destinedEnding}</p>
      )}
      {problem && <p className="mt-4 text-sm text-amber-200" data-testid="blueprint-roadmap-problem">{problem}</p>}
      <div className="mt-2">
        {arcPlans.map(plan => (
          <ArcPlanView key={`${plan.arcNumber}-${plan.goals.map(goal => goal.id).join('|')}`} plan={plan} onEdit={savePlan}
            title={`Arc ${plan.arcNumber}${plan.arcNumber === estimatedArcs ? ' · final arc, reaches the Destined Ending' : ''} · ${plan.goals.length} ${plan.goals.length === 1 ? 'goal' : 'goals'}`}
            editLabel={`Edit Arc ${plan.arcNumber} goals`} />
        ))}
      </div>
    </LibraryPanel>
  );
});
BlueprintArcRoadmapSection.displayName = 'BlueprintArcRoadmapSection';

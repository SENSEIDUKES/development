import '../../components/story-seed/development/story-seed.css';
import { useMemo, useState } from 'react';
import { CheckCircle2, Lock, Map as RoadmapIcon } from 'lucide-react';
import { ARC_LENGTH, ArcPlanView, type ArcPlan } from '@seihouse/sen/arc-goals';
import { arcGoalEditState, harnessArcPlan, harnessStoryMode } from '@seihouse/sen/harness-generation';
import type { HarnessStory, StoryFoundationInput, StoryFoundationRevision } from '@seihouse/sen/harness-generation';
import type { StorySeedInput, WorldBlueprint } from '@seihouse/sen/story-seed';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';
import { NovelBlueprintEditor, type NovelBlueprintSnapshot } from '../../components/story-seed/development/NovelBlueprintEditor';
import { createHarnessFoundationFromStorySeed } from '../story-seed/harnessFoundation';

const statusCopy = (state: ReturnType<typeof arcGoalEditState>) => {
  if (state.status === 'completed') return 'Completed';
  if (state.review === 'locked') return 'Locked';
  if (state.review === 'pending') return 'Awaiting your review';
  if (state.review === 'edited' || state.review === 'accepted') return 'Set · locks when generation begins';
  return state.status === 'active' ? 'Active' : 'Upcoming';
};

/**
 * Builds the next Foundation revision from an edited Blueprint through the same
 * Story Seed mapping story creation uses. Values fixed once a novel begins
 * (its destination, arc count and the creation-only initial direction) are
 * carried from the current Foundation, never from the edit.
 */
export const foundationFromNovelBlueprint = (
  current: StoryFoundationInput,
  next: NovelBlueprintSnapshot,
  story: HarnessStory,
): StoryFoundationInput => {
  const source = current.sourceSnapshot;
  const blueprint: WorldBlueprint = {
    ...next.blueprint,
    // The roadmap's authority is the story's saved plans; keep the Blueprint copy in step with them.
    ...(current.plannedArcCount ? { arcPlans: Array.from({ length: current.plannedArcCount }, (_, index) => harnessArcPlan(story, index + 1)).filter((plan): plan is ArcPlan => Boolean(plan)) } : {}),
    updatedAt: new Date().toISOString(),
  };
  const mapped = createHarnessFoundationFromStorySeed({
    id: source?.sourceId ?? story.id,
    userId: '',
    title: story.title,
    createdAt: story.createdAt,
    updatedAt: blueprint.updatedAt!,
    schemaVersion: source?.schemaVersion ?? 1,
    originalLanguage: story.originalLanguage,
    seed: next.seed,
    blueprint,
  } as Parameters<typeof createHarnessFoundationFromStorySeed>[0]);
  const { arcRoadmap: _roadmap, initialArcPlan: _initialPlan, initialHardPins: _pins, plannedArcCount: _count, destinedEnding: _ending, ...editable } = mapped;
  return {
    ...editable,
    ...(current.destinedEnding ? { destinedEnding: current.destinedEnding } : {}),
    ...(current.plannedArcCount ? { plannedArcCount: current.plannedArcCount } : {}),
    // Fate Pressure and Survival are story settings, not Blueprint fields.
    ...(current.fatePressure ? { fatePressure: current.fatePressure } : {}),
    ...(current.fateSurvival ? { fateSurvival: { ...current.fateSurvival,
      majorMysteries: mapped.fateSurvival?.majorMysteries ?? current.fateSurvival.majorMysteries,
      unresolvedPlotThreads: mapped.fateSurvival?.unresolvedPlotThreads ?? current.fateSurvival.unresolvedPlotThreads } } : {}),
  };
};

/**
 * The novel's Blueprint: its Arc Goals under the novel's mode rules and its
 * saved World Blueprint, both on the novel's own Library page.
 */
export function NovelBlueprintTab({ story, foundation, busy, onEditArcGoals, onAcceptArcGoals, onSaveFoundation }: {
  story: HarnessStory;
  foundation?: StoryFoundationRevision;
  busy: boolean;
  onEditArcGoals: (plan: ArcPlan) => Promise<void>;
  onAcceptArcGoals: (arcNumber: number) => Promise<void>;
  onSaveFoundation: (input: StoryFoundationInput) => Promise<void>;
}) {
  const [acceptError, setAcceptError] = useState('');
  const input = foundation?.input;
  const mode = harnessStoryMode(input);
  const knownArcs = Math.max(input?.plannedArcCount ?? 0, ...(story.arcPlans ?? []).map(revision => revision.plan.arcNumber));
  const arcNumbers = Array.from({ length: knownArcs }, (_, index) => index + 1);
  // One snapshot per Foundation revision, so re-rendering the page never
  // resets unsaved edits; a saved revision reopens the editor on its result.
  const snapshot = useMemo(() => input?.sourceSnapshot?.kind === 'story-seed' && input.sourceSnapshot.blueprint
    ? { seed: input.sourceSnapshot.seed as StorySeedInput, blueprint: input.sourceSnapshot.blueprint as WorldBlueprint }
    : undefined,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [foundation?.id]);
  const visibility = story.visibility ?? 'private';

  return (
    <div className="space-y-5" data-testid="novel-blueprint">
      <LibraryPanel as="section" padding="md" aria-labelledby="novel-arc-goals-title">
        <div className="flex items-center gap-2">
          <RoadmapIcon size={18} className="text-cyan-200" aria-hidden="true" />
          <h2 id="novel-arc-goals-title" className="font-display text-xl text-white">Arc Goals</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400" data-testid="novel-arc-goal-rules">
          {mode === 'survival'
            ? 'Fate Survival: each arc’s goals are set once, immediately before that arc begins. Edit them once or accept them as written; they lock when the arc’s first chapter is generated.'
            : visibility === 'private'
              ? 'Regular Reader: while this novel is private you may edit the active and upcoming arcs. An edit shapes future chapters; chapters already written keep the goals they were written against.'
              : 'Regular Reader: this novel is no longer private, so its Arc Goals are fixed.'}
        </p>
        {input?.destinedEnding && <p className="mt-3 text-sm text-neutral-300"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Destination · </span>{input.destinedEnding}</p>}
        {!arcNumbers.length && <p className="mt-4 text-sm text-neutral-500">No Arc Plan is saved yet. It is created before the first chapter.</p>}
        {acceptError && <p role="alert" className="mt-3 text-sm text-human">{acceptError}</p>}
        <ol className="mt-4 space-y-3">
          {arcNumbers.map(arcNumber => {
            const plan = harnessArcPlan(story, arcNumber);
            const state = arcGoalEditState(story, input, arcNumber);
            return (
              <li key={arcNumber} className="rounded-xl border border-white/10 bg-black/20 p-3" data-testid={`novel-arc-${arcNumber}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">Arc {arcNumber}{input?.plannedArcCount === arcNumber ? ' · final arc' : ''} · Chapters {(arcNumber - 1) * ARC_LENGTH + 1}–{arcNumber * ARC_LENGTH}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-300">
                    {state.status === 'completed' ? <CheckCircle2 size={11} aria-hidden="true" /> : state.review === 'locked' ? <Lock size={11} aria-hidden="true" /> : null}
                    {statusCopy(state)}
                  </span>
                </div>
                {plan ? (
                  <ArcPlanView key={`${arcNumber}-${story.arcPlans?.length ?? 0}`} plan={plan} defaultOpen={state.status === 'active'}
                    title={`${plan.goals.length} ${plan.goals.length === 1 ? 'goal' : 'goals'}`}
                    lockedGoalIds={state.lockedGoalIds}
                    editLabel={mode === 'survival' ? `Edit Arc ${arcNumber} goals (one time)` : `Edit Arc ${arcNumber} goals`}
                    editNotice={mode === 'survival' ? `This is Arc ${arcNumber}'s one-time edit. After you save, its goals are set and lock when its first chapter is generated.` : undefined}
                    onEdit={state.editable && !busy ? onEditArcGoals : undefined} />
                ) : <p className="mt-2 text-xs text-neutral-500">No saved plan.</p>}
                {state.canAccept && (
                  <LibraryButton type="button" size="sm" variant="secondary" disabled={busy} onClick={() => {
                    setAcceptError('');
                    onAcceptArcGoals(arcNumber).catch(error => setAcceptError(error instanceof Error ? error.message : 'The plan could not be accepted.'));
                  }}>
                    Accept Arc {arcNumber} goals as written
                  </LibraryButton>
                )}
                {!state.editable && state.reason && state.status !== 'completed' && <p className="mt-1 text-xs text-neutral-500">{state.reason}</p>}
              </li>
            );
          })}
        </ol>
      </LibraryPanel>

      {snapshot && input ? (
        <NovelBlueprintEditor
          snapshot={snapshot}
          destinedEnding={input.destinedEnding}
          busy={busy}
          onSave={next => onSaveFoundation(foundationFromNovelBlueprint(input, next, story))}
        />
      ) : (
        <LibraryPanel padding="md">
          <p className="text-sm text-neutral-400">This novel was started from a premise without a World Blueprint, so there is no Blueprint to edit. Its Foundation stays editable on the Novel tab.</p>
        </LibraryPanel>
      )}
    </div>
  );
}

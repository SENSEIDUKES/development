import '../../components/story-seed/development/story-seed.css';
import { useMemo, useState } from 'react';
import { CheckCircle2, Lock, Map as RoadmapIcon } from 'lucide-react';
import { ARC_LENGTH, ArcPlanView, type ArcPlan } from '@seihouse/sen/arc-goals';
import type { HarnessNextArcStep } from '@seihouse/sen/harness-generation';
import { arcGoalEditState, harnessArcPlan, harnessStoryMode } from '@seihouse/sen/harness-generation';
import type { HarnessStory, StoryFoundationInput, StoryFoundationRevision } from '@seihouse/sen/harness-generation';
import type { StorySeedInput, WorldBlueprint } from '@seihouse/sen/story-seed';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';
import { NovelBlueprintEditor, type NovelBlueprintSnapshot } from '../../components/story-seed/development/NovelBlueprintEditor';
import { foundationFromNovelBlueprint } from '../story-seed/novelBlueprintFoundation';

const statusCopy = (state: ReturnType<typeof arcGoalEditState>) => {
  if (state.status === 'completed') return 'Completed';
  if (state.review === 'locked') return 'Locked';
  if (state.review === 'pending') return 'Awaiting your review';
  if (state.review === 'edited' || state.review === 'accepted') return state.mode === 'survival' ? 'Set · locks when generation begins' : 'Reviewed';
  return state.status === 'active' ? 'Active' : 'Upcoming';
};

export { foundationFromNovelBlueprint };

/**
 * The novel's Blueprint: its Arc Goals under the novel's mode rules and its
 * saved World Blueprint, both on the novel's own Library page.
 */
export function NovelBlueprintTab({ story, foundation, busy, arcStep, onPlanArc, showLookahead = false, onEditArcGoals, onAcceptArcGoals, onSaveFoundation }: {
  story: HarnessStory;
  foundation?: StoryFoundationRevision;
  busy: boolean;
  /** What the next chapter waits on at the start of an arc, if anything. */
  arcStep?: HarnessNextArcStep;
  /** Plans the goals of the arc the next chapter begins. */
  onPlanArc?: () => Promise<void>;
  /** Shows the arc planner's hidden look-ahead (HARNESS internals only; readers never see it). */
  showLookahead?: boolean;
  onEditArcGoals: (plan: ArcPlan) => Promise<void>;
  onAcceptArcGoals: (arcNumber: number) => Promise<void>;
  onSaveFoundation: (input: StoryFoundationInput) => Promise<void>;
}) {
  const [acceptError, setAcceptError] = useState('');
  const input = foundation?.input;
  const mode = harnessStoryMode(input);
  // Only arcs already planned are listed; the rest are planned when each begins.
  const arcNumbers = [...new Set((story.arcPlans ?? []).map(revision => revision.plan.arcNumber))].sort((left, right) => left - right);
  const lastPlanned = arcNumbers.at(-1) ?? 0;
  const plannedLength = input?.plannedArcCount;
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
            ? 'Fate Survival: each arc’s goals are planned when it begins and set once, immediately before its first chapter. Edit them once or accept them as written; they lock when the arc’s first chapter is generated.'
            : visibility === 'private'
              ? `Regular Reader: ${plannedLength ? 'each arc’s goals are planned when it begins and reviewed before its first chapter. ' : ''}While this novel is private you may edit the active and upcoming arcs. An edit shapes future chapters; chapters already written keep the goals they were written against.`
              : `Regular Reader: this novel is no longer private, so its Arc Goals can only be accepted${plannedLength ? ' when each arc begins' : ''}, never edited.`}
        </p>
        {input?.destinedEnding && <p className="mt-3 text-sm text-neutral-300"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Destination · </span>{input.destinedEnding}</p>}
        {!arcNumbers.length && <p className="mt-4 text-sm text-neutral-500">No Arc Plan is saved yet. It is created before the first chapter.</p>}
        {arcStep?.kind === 'plan' && (
          <div className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-400/[0.06] p-3" data-testid="novel-arc-plan-step">
            <p className="text-sm font-semibold text-white">Arc {arcStep.arcNumber} begins with Chapter {story.head.nextChapterNumber}</p>
            <p className="mt-1 text-xs text-neutral-300">{arcStep.status === 'planning'
              ? `Arc ${arcStep.arcNumber}’s goals are being planned…`
              : arcStep.status === 'failed'
                ? `${arcStep.message} Plan it again.`
                : `Its goals are planned now, from where the story is, then shown here for your review.`}</p>
            {onPlanArc && arcStep.status !== 'planning' && (
              <LibraryButton type="button" size="sm" className="mt-3" disabled={busy} onClick={() => {
                setAcceptError('');
                onPlanArc().catch(error => setAcceptError(error instanceof Error ? error.message : 'The arc could not be planned.'));
              }}>
                {arcStep.status === 'failed' ? `Plan Arc ${arcStep.arcNumber} again` : `Plan Arc ${arcStep.arcNumber}`}
              </LibraryButton>
            )}
          </div>
        )}
        {acceptError && <p role="alert" className="mt-3 text-sm text-human">{acceptError}</p>}
        <ol className="mt-4 space-y-3">
          {arcNumbers.map(arcNumber => {
            const plan = harnessArcPlan(story, arcNumber);
            const state = arcGoalEditState(story, input, arcNumber);
            return (
              <li key={arcNumber} className="rounded-xl border border-white/10 bg-black/20 p-3" data-testid={`novel-arc-${arcNumber}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">Arc {arcNumber}{plannedLength === arcNumber ? ' · final arc' : ''} · Chapters {(arcNumber - 1) * ARC_LENGTH + 1}–{arcNumber * ARC_LENGTH}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-300">
                    {state.status === 'completed' ? <CheckCircle2 size={11} aria-hidden="true" /> : state.review === 'locked' ? <Lock size={11} aria-hidden="true" /> : null}
                    {statusCopy(state)}
                  </span>
                </div>
                {plan ? (
                  <ArcPlanView key={`${arcNumber}-${story.arcPlans?.length ?? 0}`} plan={plan} defaultOpen={state.status === 'active'}
                    title={`${plan.goals.length} ${plan.goals.length === 1 ? 'goal' : 'goals'}`}
                    lockedGoalIds={state.lockedGoalIds} missedGoalIds={state.missedGoalIds}
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
        {plannedLength && plannedLength > lastPlanned && (
          <p className="mt-3 text-xs text-neutral-400" data-testid="novel-arc-unplanned">
            {plannedLength - lastPlanned === 1 ? `Arc ${plannedLength} is planned when it begins` : `Arcs ${lastPlanned + 1}–${plannedLength} are planned when each begins`}, from where the story is. Arc {plannedLength} is the final arc.
          </p>
        )}
        {showLookahead && (
          <div className="mt-3 rounded-xl border border-dashed border-white/15 p-3" data-testid="novel-arc-lookahead">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Planner look-ahead · hidden from readers</p>
            {story.arcLookahead?.length
              ? <ul className="mt-2 space-y-1 text-xs text-neutral-300">{story.arcLookahead.map(entry => <li key={entry.arcNumber}>Arc {entry.arcNumber}: {entry.direction}</li>)}</ul>
              : <p className="mt-2 text-xs text-neutral-500">None. The next planning writes a fresh one.</p>}
          </div>
        )}
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

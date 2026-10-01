import { useEffect, useRef, useState } from 'react';
import { ArcPlanView } from '../../arc-goals/development/ArcPlanView';
import { ARC_LENGTH, createArcChapterPosition, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import type { HarnessWorkspaceState } from '../../../narrative/generation';
import type { HarnessGenerationController } from '../shared/controller';
import { arcGoalEditState, harnessArcPlan, harnessStoryMode, nextArcStep } from '../shared/arcState';
import { FateDestinedEnding } from './FatePanel';

const button = 'min-h-11 rounded-full border px-4 text-sm disabled:cursor-not-allowed disabled:opacity-45';
const primaryButton = `${button} border-cyan-300/50 bg-cyan-400/15 font-semibold text-cyan-50 hover:bg-cyan-400/25`;
const quietButton = `${button} border-white/15 text-neutral-200 hover:border-white/30`;

/**
 * The World Blueprint's goal section, reappearing in the Reader when a new arc
 * begins. Opening it plans the arc's goals from where the story is (when they
 * are not planned yet); the reader then reviews them, accepting them as
 * written or editing them (in Fate Survival, once), before the arc's first
 * chapter. Regular Reader mode then writes that chapter; Fate Survival asks
 * for its direction first. Planning is a host action, since the host owns the
 * model.
 */
export function BlueprintArcPage({ state, storyId, controller, onBack, onPlanArc, onContinue }: {
  state: HarnessWorkspaceState;
  storyId: string;
  controller: HarnessGenerationController;
  /** Back to reading. */
  onBack: () => void;
  /** Plans the arc's goals with the host's model. Absent when the host cannot plan here. */
  onPlanArc?: () => Promise<void>;
  /** The arc is reviewed: write its first chapter (Regular Reader) or direct it (Fate Survival). */
  onContinue: () => void;
}) {
  const story = state.stories.find(entry => entry.id === storyId);
  const foundation = story ? state.foundations.find(entry => entry.id === story.activeFoundationRevisionId)?.input : undefined;
  const step = nextArcStep(state, storyId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const plan = async () => {
    if (!onPlanArc) return;
    setBusy(true); setError('');
    try { await onPlanArc(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The arc could not be planned.'); }
    finally { setBusy(false); }
  };
  // Opening the page at an unplanned arc plans it once; a failure waits for the reader.
  const planned = useRef(false);
  const needsPlan = step?.kind === 'plan' && step.status === 'needed';
  useEffect(() => {
    if (!needsPlan || planned.current || !onPlanArc) return;
    planned.current = true;
    void plan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsPlan, onPlanArc]);

  if (!story) return <p role="alert" className="p-4 text-sm text-amber-200">This story is no longer available.</p>;
  const nextChapter = story.head.nextChapterNumber;
  const arcNumber = createArcChapterPosition(nextChapter).arcNumber;
  const mode = harnessStoryMode(foundation);
  const arcPlan = harnessArcPlan(story, arcNumber);
  const edit = arcGoalEditState(story, foundation, arcNumber);
  const finalArc = foundation?.plannedArcCount === arcNumber;
  const planning = busy || (step?.kind === 'plan' && step.status === 'planning');
  const failure = error || (step?.kind === 'plan' && step.status === 'failed' ? step.message ?? '' : '');
  const continueLabel = mode === 'survival' ? `Direct Chapter ${nextChapter}` : `Write Chapter ${nextChapter}`;

  const accept = async () => {
    setBusy(true); setError('');
    try {
      if (edit.canAccept) await controller.acceptArcGoals(storyId, arcNumber);
      onContinue();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The goals could not be accepted.'); }
    finally { setBusy(false); }
  };
  const saveEdit = async (next: ArcPlan) => { await controller.editArcGoals(storyId, next); };

  return (
    <section className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-3 py-4 sm:px-4" aria-labelledby="blueprint-arc-title" data-testid="blueprint-arc-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">World Blueprint · {story.title}</p>
          <h2 id="blueprint-arc-title" className="mt-1 font-display text-2xl text-white">
            Arc {arcNumber}{foundation?.plannedArcCount ? ` of ${foundation.plannedArcCount}` : ''}{finalArc ? ' · the final arc' : ''}
          </h2>
        </div>
        <button type="button" onClick={onBack} className={quietButton}>Back to reading</button>
      </div>
      <p className="text-sm leading-relaxed text-neutral-300">
        Chapter {nextChapter} begins Arc {arcNumber}. Its goals are planned from where the story is now, continuing toward the Destined Ending.
        {finalArc ? ' This is the final arc: its last goal is the story reaching its Destined Ending.' : ''}
      </p>

      <FateDestinedEnding foundation={foundation} />

      <div className="rounded-xl border border-cyan-300/20 bg-black/25 p-4" data-testid="blueprint-arc-goals">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Arc {arcNumber} goals · {ARC_LENGTH} chapters</p>
        {arcPlan ? (
          <ArcPlanView key={`${arcNumber}-${story.arcPlans?.length ?? 0}`} plan={arcPlan} defaultOpen
            title={`${arcPlan.goals.length} ${arcPlan.goals.length === 1 ? 'goal' : 'goals'}`}
            lockedGoalIds={edit.lockedGoalIds} missedGoalIds={edit.missedGoalIds}
            editLabel={mode === 'survival' ? `Edit Arc ${arcNumber} goals (one time)` : `Edit Arc ${arcNumber} goals`}
            editNotice={mode === 'survival' ? `This is Arc ${arcNumber}'s one-time edit. After you save, its goals are set and lock when its first chapter is generated.` : undefined}
            onEdit={edit.editable && !busy ? saveEdit : undefined} />
        ) : planning ? (
          <p role="status" className="mt-3 text-sm text-cyan-100" data-testid="blueprint-arc-planning">Planning Arc {arcNumber}’s goals from where the story is…</p>
        ) : failure ? (
          <div className="mt-3 space-y-3">
            <p role="alert" className="text-sm text-amber-200">{failure}</p>
            {onPlanArc && <button type="button" className={primaryButton} onClick={() => void plan()}>Plan Arc {arcNumber} again</button>}
          </div>
        ) : onPlanArc ? (
          <button type="button" className={`${primaryButton} mt-3`} onClick={() => void plan()}>Plan Arc {arcNumber}</button>
        ) : (
          <p className="mt-3 text-sm text-neutral-400">Arc {arcNumber}’s goals can’t be planned here yet.</p>
        )}
        {arcPlan && !edit.editable && edit.reason && edit.review !== 'pending' && <p className="mt-1 text-xs text-neutral-500">{edit.reason}</p>}
      </div>

      {arcPlan && error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
      {arcPlan && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primaryButton} disabled={busy} onClick={() => void accept()}>
            {edit.canAccept ? `Accept and ${mode === 'survival' ? 'direct' : 'write'} Chapter ${nextChapter}` : continueLabel}
          </button>
          {edit.canAccept && <p className="text-xs text-neutral-400">{mode === 'survival'
            ? 'Accept the goals as written, or edit them once. They lock when the chapter is generated.'
            : 'Accept the goals as written, or edit them first.'}</p>}
        </div>
      )}
    </section>
  );
}

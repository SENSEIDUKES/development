import { useEffect, useState, type ReactNode } from 'react';
import { ArcPlanView } from '../../arc-goals/development/ArcPlanView';
import { ARC_LENGTH } from '../../arc-goals/shared/arcGoals';
import { CHAPTER_FUNCTIONS, type ChapterFunction } from '../../../narrative/storyDirection';
import {
  CHAPTER_DIRECTION_TEXT_LIMIT,
  type ChapterDirectionChoice,
  type HarnessChapter,
  type HarnessChapterPath,
  type HarnessStory,
  type HarnessStoryMode,
  type StoryFoundationInput,
} from '../../../narrative/generation';
import { arcGoalEditState, harnessArcContext, harnessStoryMode } from '../shared/arcState';
import { pendingChapterDirection } from '../shared/chapterDirection';

/** Reader-facing names for Rhythm's three chapter functions. */
export const CHAPTER_FUNCTION_LABELS: Record<ChapterFunction, string> = {
  progression: 'Progression',
  worldBuilding: 'World Building',
  conflict: 'Conflict',
};

export const FATE_MODE_LABELS: Record<HarnessStoryMode, string> = {
  regular: 'Regular Reader',
  survival: 'Fate Survival',
};

/** One line describing how a chapter's path was decided. */
export function describeChapterPath(path: HarnessChapterPath | ChapterDirectionChoice): string {
  if (path.kind === 'reader') return `Your direction: ${path.text}`;
  const label = CHAPTER_FUNCTION_LABELS[path.chapterFunction];
  const idea = path.suggestion ? ` — ${path.suggestion}` : '';
  return path.kind === 'automatic' ? `Fate chose ${label}${idea}` : `You chose ${label}${idea}`;
}

const panel = 'rounded-xl border border-white/10 bg-black/25 p-4';
const eyebrow = 'font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500';
const button = 'min-h-11 rounded-full border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45';
const primaryButton = `${button} border-cyan-300/50 bg-cyan-400/15 text-cyan-50 hover:bg-cyan-400/25`;
const quietButton = `${button} border-white/15 text-neutral-200 hover:border-white/30`;

/**
 * The story's active Arc Goal, read from the one Arc Goal authority
 * (`harnessArcContext`), with the deadline rule of the story's Fate mode.
 */
export function FateArcGoalCard({ story, foundation, generatedThrough, actions }: {
  story: HarnessStory;
  foundation?: StoryFoundationInput;
  generatedThrough: number;
  /** Host actions, such as opening the novel's Blueprint to edit goals. */
  actions?: ReactNode;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const mode = harnessStoryMode(foundation);
  const context = foundation ? harnessArcContext(story, foundation, story.head.nextChapterNumber) : undefined;
  if (!context) {
    return (
      <div className={`${panel} border-dashed`} data-testid="fate-arc-goal">
        <p className={eyebrow}>Active Arc Goal</p>
        <p className="mt-2 text-sm text-neutral-300">{foundation?.plannedArcCount
          ? `All ${foundation.plannedArcCount} planned arcs are written.`
          : `No Arc Plan exists yet. The Arc planner creates it before Chapter ${story.head.nextChapterNumber} is written.`}</p>
        {actions}
      </div>
    );
  }
  const goalIndex = context.plan.goals.findIndex(goal => goal.id === context.activeGoal.id) + 1;
  const remaining = context.completionDeadline - story.head.nextChapterNumber;
  const status = context.completionConfirmed
    ? 'Achieved, with a passage from the story as evidence'
    : mode === 'survival'
      ? remaining > 0 ? `${remaining} ${remaining === 1 ? 'chapter' : 'chapters'} left to reach it`
        : 'Its deadline is the next chapter. If it is not reached there, it is missed and the story moves on without it.'
      : remaining > 0 ? `${remaining} ${remaining === 1 ? 'chapter' : 'chapters'} left before the deadline`
        : remaining === 0 ? 'Due in the next chapter: it cannot be saved until the goal is achieved'
          : 'Overdue: the next chapter cannot be saved until the goal is achieved';
  const lastResolution = (story.goalCompletions ?? []).at(-1);
  const editState = arcGoalEditState(story, foundation, context.plan.arcNumber);
  return (
    <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/[0.07] p-4" data-testid="fate-arc-goal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/60">Active Arc Goal · Arc {context.arcNumber}{context.finalArc ? ' · final arc' : ''}</p>
          <p className="mt-1 text-sm font-semibold text-white">Goal {goalIndex} of {context.plan.goals.length}{context.finalGoal ? ' · the Destined Ending' : ''}</p>
          <p className="mt-2 break-words text-base leading-relaxed text-neutral-100">{context.activeGoal.text}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${context.completionConfirmed ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : remaining <= 0 ? 'border-amber-300/40 bg-amber-400/10 text-amber-100' : 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100'}`}>
          Deadline · Chapter {context.completionDeadline}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-neutral-400 sm:grid-cols-3">
        <div><dt className={eyebrow}>Allocated chapters</dt><dd className="mt-1 text-neutral-200">{context.activeGoal.startChapter}–{context.activeGoal.endChapter} · {context.activeGoal.chapters} of {ARC_LENGTH}</dd></div>
        <div><dt className={eyebrow}>Next chapter</dt><dd className="mt-1 text-neutral-200">Chapter {story.head.nextChapterNumber} · {context.display}</dd></div>
        <div><dt className={eyebrow}>Status</dt><dd className="mt-1 text-neutral-200" data-testid="fate-arc-goal-status">{status}</dd></div>
      </dl>
      {lastResolution?.outcome === 'missed' && (
        <p className="mt-3 text-xs text-amber-200" data-testid="fate-missed-goal">Missed in Chapter {lastResolution.chapterNumber}: {lastResolution.goalText ?? 'the previous goal'}.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={quietButton} onClick={() => setPlanOpen(open => !open)}>
          {planOpen ? 'Hide the arc\'s goals' : 'Show the arc\'s goals'}
        </button>
        {actions}
      </div>
      {planOpen && <ArcPlanView key={`${context.plan.arcNumber}-${story.arcPlans?.length ?? 0}`} defaultOpen plan={context.plan}
        activeGoalId={context.activeGoal.id} generatedThrough={generatedThrough}
        lockedGoalIds={editState.lockedGoalIds} missedGoalIds={editState.missedGoalIds} />}
    </div>
  );
}

type PathOption = 'fate' | ChapterFunction | 'reader';

/**
 * The next chapter's path. Regular Reader mode: leave it to fate (Rhythm's
 * automatic pick), choose one of the writer's three next-chapter ideas, or
 * write your own direction. Fate Survival: only your own direction, every
 * chapter. The choice directs that one chapter and is used up when it is saved.
 */
export function FatePathChooser({ story, foundation, chapters, busy = false, onChoose }: {
  story: HarnessStory;
  foundation?: StoryFoundationInput;
  chapters: HarnessChapter[];
  busy?: boolean;
  onChoose: (choice: ChapterDirectionChoice | null) => Promise<void>;
}) {
  const mode = harnessStoryMode(foundation);
  const pending = pendingChapterDirection(story);
  const recommendation = mode === 'regular' ? story.rhythmRecommendation : undefined;
  const ideasChapter = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber).reverse().find(chapter => chapter.rhythm?.nextChapterSuggestions);
  const ideas = ideasChapter?.rhythm?.nextChapterSuggestions ?? {};
  const savedOption: PathOption = !pending ? 'fate' : pending.choice.kind === 'reader' ? 'reader' : pending.choice.chapterFunction;
  const savedText = pending?.choice.kind === 'reader' ? pending.choice.text : '';
  const [option, setOption] = useState<PathOption>(mode === 'survival' ? 'reader' : savedOption);
  const [text, setText] = useState(savedText);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // A commit consumes the choice and a new chapter opens: start from what is saved.
  useEffect(() => {
    setOption(mode === 'survival' ? 'reader' : savedOption);
    setText(savedText);
    setError('');
  }, [story.id, story.head.nextChapterNumber, pending?.id, mode, savedOption, savedText]);

  const chapterNumber = story.head.nextChapterNumber;
  const choice = (): ChapterDirectionChoice | null => option === 'fate' ? null
    : option === 'reader' ? { kind: 'reader', text }
      : { kind: 'chapter-function', chapterFunction: option, ...(ideas[option] ? { suggestion: ideas[option] } : {}) };
  const unchanged = option === savedOption && (option !== 'reader' || text.trim() === savedText);
  const save = async (next: ChapterDirectionChoice | null) => {
    setSaving(true); setError('');
    try { await onChoose(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The direction could not be saved.'); }
    finally { setSaving(false); }
  };
  const disabled = busy || saving;
  const radio = (value: PathOption, title: string, body: ReactNode, badge?: string) => (
    <label key={value} className={`flex min-h-11 cursor-pointer gap-3 rounded-lg border p-3 text-sm ${option === value ? 'border-cyan-300/50 bg-cyan-400/[0.08]' : 'border-white/10 hover:border-white/25'}`}>
      <input type="radio" name={`fate-path-${story.id}`} value={value} checked={option === value} disabled={disabled}
        onChange={() => setOption(value)} className="mt-1 shrink-0" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-white">{title}{badge && <span className="rounded-full border border-cyan-300/30 px-2 py-0.5 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-cyan-100">{badge}</span>}</span>
        <span className="mt-1 block break-words text-xs leading-relaxed text-neutral-300">{body}</span>
      </span>
    </label>
  );

  return (
    <section className={panel} aria-labelledby={`fate-path-title-${story.id}`} data-testid="fate-path-chooser">
      <p className={eyebrow}>{FATE_MODE_LABELS[mode]}</p>
      <h3 id={`fate-path-title-${story.id}`} className="mt-1 text-base font-semibold text-white">Chapter {chapterNumber}’s path</h3>
      <p className="mt-1 text-xs leading-relaxed text-neutral-400">
        {mode === 'survival'
          ? 'You direct every chapter. Fate offers no paths here: the writer follows your direction and the story answers honestly, so success is never guaranteed.'
          : 'Leave the path to fate, or take it yourself. Your choice directs this one chapter and is used up once the chapter is saved.'}
      </p>
      <p className="mt-3 text-xs text-neutral-300" data-testid="fate-path-current">
        {pending ? `Set for Chapter ${chapterNumber}: ${describeChapterPath(pending.choice)}`
          : mode === 'survival' ? `Chapter ${chapterNumber} has no direction yet. It cannot be written until you give one.`
            : `Chapter ${chapterNumber} follows fate unless you choose otherwise.`}
      </p>
      <fieldset className="mt-3 space-y-2" disabled={disabled}>
        <legend className="sr-only">Chapter {chapterNumber}’s path</legend>
        {mode === 'regular' && radio('fate', 'Let fate decide',
          recommendation
            ? <>{CHAPTER_FUNCTION_LABELS[recommendation.recommendedFunction]}{ideas[recommendation.recommendedFunction] ? ` — ${ideas[recommendation.recommendedFunction]}` : ''}. <span className="text-neutral-500">{recommendation.reason}</span></>
            : 'Fate Pressure picks the next chapter’s function from the story’s recent rhythm.',
          'Rhythm')}
        {mode === 'regular' && CHAPTER_FUNCTIONS.map(type => radio(type, CHAPTER_FUNCTION_LABELS[type],
          ideas[type] ?? 'No idea saved for this function yet; the writer chooses how to serve it.',
          recommendation?.recommendedFunction === type ? 'Fate’s pick' : undefined))}
        {mode === 'regular' ? radio('reader', 'Your own direction', 'Tell the story what happens next, in your words.')
          : null}
        {option === 'reader' && (
          <div className="space-y-1">
            <label htmlFor={`fate-direction-${story.id}`} className="block text-xs text-neutral-300">Your direction for Chapter {chapterNumber}</label>
            <textarea id={`fate-direction-${story.id}`} value={text} maxLength={CHAPTER_DIRECTION_TEXT_LIMIT}
              onChange={event => setText(event.target.value)} disabled={disabled}
              placeholder={mode === 'survival' ? 'What your protagonist does next, in your own words.' : 'What should happen next, in your own words.'}
              className="min-h-24 w-full rounded-lg border border-white/15 bg-black/35 p-3 text-sm text-white" />
            <p className="text-right font-mono text-[10px] text-neutral-500">{text.length}/{CHAPTER_DIRECTION_TEXT_LIMIT}</p>
          </div>
        )}
      </fieldset>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={primaryButton} disabled={disabled || unchanged || (option === 'reader' && !text.trim())}
          onClick={() => void save(choice())}>
          {option === 'fate' ? 'Leave it to fate' : `Set Chapter ${chapterNumber}’s path`}
        </button>
        {pending && mode === 'survival' && (
          <button type="button" className={quietButton} disabled={disabled} onClick={() => void save(null)}>Clear direction</button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-amber-200">{error}</p>}
    </section>
  );
}

/** How the story ended, when it has. */
export function FateConclusion({ story }: { story: HarnessStory }) {
  const ended = story.conclusion;
  if (!ended) return null;
  const reached = ended.outcome === 'destined-ending-reached';
  return (
    <div role="status" data-testid="fate-conclusion" className={`rounded-xl border p-4 ${reached ? 'border-emerald-300/40 bg-emerald-400/10' : 'border-amber-300/40 bg-amber-400/10'}`}>
      <p className="text-sm font-semibold text-white">{reached ? 'The Destined Ending was reached' : 'Fate failed'}</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-200">
        {reached ? `The story reached its Destined Ending in Chapter ${ended.chapterNumber}.`
          : ended.reason === 'final-goal-missed' ? `The final goal was missed in Chapter ${ended.chapterNumber}, so the Destined Ending was never reached.`
            : `In Chapter ${ended.chapterNumber}, the story made its Destined Ending impossible.`}
        {' '}No further chapter is written.
      </p>
      {ended.evidence && <blockquote className="mt-2 border-l-2 border-white/20 pl-3 text-xs italic text-neutral-300">{ended.evidence}</blockquote>}
    </div>
  );
}

/** The Destined Ending with its mode's promise. */
export function FateDestinedEnding({ foundation }: { foundation?: StoryFoundationInput }) {
  const mode = harnessStoryMode(foundation);
  return (
    <div className={panel} data-testid="fate-destined-ending">
      <p className={eyebrow}>Destined Ending</p>
      <p className="mt-2 break-words text-sm leading-relaxed text-neutral-100">{foundation?.destinedEnding?.trim() || 'Not set yet. It is established before the first chapter.'}</p>
      <p className="mt-2 text-xs text-neutral-400">{mode === 'survival'
        ? 'Not guaranteed. Your choices decide whether the story reaches it; it can fail, even by death.'
        : 'Guaranteed. The story reaches it in the final goal of its final arc.'}</p>
    </div>
  );
}

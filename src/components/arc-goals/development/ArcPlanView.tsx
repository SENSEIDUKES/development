import { useState } from 'react';
import { ARC_LENGTH, arcGoalSegments, editArcPlan, type ArcPlan } from '../shared/arcGoals';

export function ArcPlanView({ plan, activeGoalId, generatedThrough = 0, onEdit, defaultOpen = false, lockedGoalIds = [], editNotice, editLabel = 'Edit arc goals', title }: {
  plan: ArcPlan; activeGoalId?: string; generatedThrough?: number; onEdit?: (plan: ArcPlan) => Promise<void> | void;
  /** Opens the complete plan immediately, for a host surface that summons it from a summary. */
  defaultOpen?: boolean;
  /** Completed goals stay exactly as written: their text, allocation and position cannot change. */
  lockedGoalIds?: readonly string[];
  /** Host rule shown while editing, such as a one-time edit before an arc begins. */
  editNotice?: string;
  editLabel?: string;
  /** Replaces the default summary line. */
  title?: string;
}) {
  const [draft, setDraft] = useState<ArcPlan>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const locked = new Set(lockedGoalIds);
  const save = async () => {
    if (!draft || !onEdit) return;
    setSaving(true); setError('');
    try { await onEdit(editArcPlan(plan, draft)); setDraft(undefined); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The arc plan could not be saved.'); }
    finally { setSaving(false); }
  };
  return <details open={defaultOpen || undefined} className="my-3 rounded-xl border border-neutral-800 p-4 text-sm text-neutral-300 break-words">
    <summary className="cursor-pointer">{title ?? `Arc ${plan.arcNumber} · ${ARC_LENGTH} chapters · Goals`}</summary>
    <ol className="mt-3 space-y-3">
      {arcGoalSegments(plan).map(goal => <li key={goal.id}>
        <span>{goal.text}</span>{goal.id === activeGoalId && <span className="ml-2 text-xs text-cyan-200">Active</span>}
        {locked.has(goal.id) && <span className="ml-2 text-xs text-emerald-200">Completed</span>}
        <p className="text-xs text-neutral-500">Chapters {goal.startChapter}–{goal.endChapter} · {goal.chapters} chapters</p>
      </li>)}
    </ol>
    {onEdit && !draft && <button className="mt-3 min-h-11 underline" onClick={() => { setDraft(structuredClone(plan)); setError(''); }}>{editLabel}</button>}
    {draft && <div className="mt-3 space-y-3">
      {editNotice && <p className="text-amber-200">{editNotice}</p>}
      {generatedThrough > 0 && <p className="text-amber-200">Changing the active plan may create unexpected pacing or continuity consequences. Generated chapters remain historical canon.</p>}
      {draft.goals.map((goal, index) => {
        const goalLocked = locked.has(goal.id);
        const previousLocked = index > 0 && locked.has(draft.goals[index - 1].id);
        return <fieldset key={goal.id} disabled={saving || goalLocked} className="grid min-w-0 gap-2 rounded border border-neutral-800 p-2">
          <label>Goal {index + 1}{goalLocked ? ' (completed)' : ''}<input className="block min-h-11 w-full bg-neutral-950 p-2" value={goal.text} onChange={event => setDraft({ ...draft, goals: draft.goals.map(item => item.id === goal.id ? { ...item, text: event.target.value } : item) })} /></label>
          <label>Chapters<input type="number" min={1} max={ARC_LENGTH} className="ml-2 min-h-11 w-20 bg-neutral-950 p-2" value={goal.chapters} onChange={event => setDraft({ ...draft, goals: draft.goals.map(item => item.id === goal.id ? { ...item, chapters: Number(event.target.value) } : item) })} /></label>
          {index > 0 && !goalLocked && !previousLocked && <button className="min-h-11 underline" onClick={() => { const goals = [...draft.goals]; [goals[index - 1], goals[index]] = [goals[index], goals[index - 1]]; setDraft({ ...draft, goals }); }}>Move goal {index + 1} earlier</button>}
        </fieldset>;
      })}
      <p>{draft.goals.reduce((sum, goal) => sum + goal.chapters, 0)} / {ARC_LENGTH} chapters allocated</p>
      {error && <p role="alert">{error}</p>}
      <button disabled={saving} className="mr-4 min-h-11 underline" onClick={() => void save()}>Save goals</button>
      <button disabled={saving} className="min-h-11" onClick={() => setDraft(undefined)}>Cancel</button>
    </div>}
  </details>;
}

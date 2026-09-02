import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Download,
  FileText,
  ListTree,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import {
  LibraryButton,
  LibraryPanel,
  LibraryTextArea,
  LibraryTextBox,
  ManifestButton,
} from '@seihouse/sen/ui';
import {
  HarnessGenerationController,
  exportHarnessStory,
} from '../shared/controller';
import { findFoundationRevision, findStory } from '../shared/foundation';
import { buildCanonicalStoryView } from '../shared/canonicalState';
import { DEFAULT_HARNESS_CONTEXT_POLICY } from '../shared/context';
import { HarnessGenerationHttpClient } from '../shared/httpClient';
import {
  IndexedDbHarnessGenerationRepository,
  type HarnessGenerationRepository,
} from '../shared/repository';
import type {
  HarnessGenerationAttempt,
  HarnessGenerationModelAdapter,
  HarnessGenerationServerInfo,
  HarnessCorrectionKind,
  HarnessSemanticEvent,
  HarnessStory,
  HarnessWorkspaceState,
  StoryFoundationInput,
} from '../shared/types';

export interface HarnessGenerationWorkspaceProps {
  /** Injection points keep the live UI testable without a provider or browser database. */
  repository?: HarnessGenerationRepository;
  modelAdapter?: HarnessGenerationModelAdapter;
}

const emptyFoundation = (): StoryFoundationInput => ({ premise: '' });

const stageLabel: Record<HarnessGenerationAttempt['stage'], string> = {
  request_started: 'Request started',
  provider_outcome_unknown: 'Provider outcome unknown',
  raw_received: 'Raw response saved',
  prose_accepted: 'Prose accepted',
  events_preserved: 'Events preserved',
  accepted_not_durable: 'Needs local persistence retry',
  committed: 'Committed',
  generation_failed: 'Generation failed',
  abandoned: 'Superseded by an explicit retry',
};

const formatDate = (value: string | undefined) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

const latestAttemptForStory = (state: HarnessWorkspaceState, storyId: string) => state.attempts
  .filter(attempt => attempt.storyId === storyId)
  .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];

const storyChapters = (state: HarnessWorkspaceState, storyId: string) => state.chapters
  .filter(chapter => chapter.storyId === storyId)
  .sort((left, right) => left.chapterNumber - right.chapterNumber);

const storyEvents = (state: HarnessWorkspaceState, storyId: string) => state.events
  .filter(event => event.storyId === storyId)
  .sort((left, right) => left.chapterNumber - right.chapterNumber);

const field = (
  input: StoryFoundationInput,
  key: keyof StoryFoundationInput,
  value: string,
): StoryFoundationInput => ({ ...input, [key]: value });

function FoundationEditor({
  form,
  story,
  busy,
  error,
  onChange,
  onSubmit,
}: {
  form: StoryFoundationInput;
  story?: HarnessStory;
  busy: boolean;
  error?: string;
  onChange: (next: StoryFoundationInput) => void;
  onSubmit: () => void;
}) {
  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-foundation-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">Permanent author canon</p>
          <h2 id="harness-foundation-title" className="mt-1 font-display text-xl text-white">Story Foundation</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
            Premise is the only requirement. Every generation freezes the active revision before the provider is called.
          </p>
        </div>
        {story && <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] text-cyan-100">Revision saved</span>}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <LibraryTextBox
          id="harness-foundation-title-input"
          label="Title"
          value={form.title ?? ''}
          onChange={value => onChange(field(form, 'title', value))}
          helpText="Optional. The premise supplies a local title when left blank."
          disabled={busy}
        />
        <LibraryTextBox
          id="harness-foundation-genre-input"
          label="Genre"
          value={form.genre ?? ''}
          onChange={value => onChange(field(form, 'genre', value))}
          disabled={busy}
        />
      </div>

      <div className="mt-4">
        <LibraryTextArea
          id="harness-foundation-premise"
          label="Premise"
          required
          value={form.premise}
          onChange={value => onChange(field(form, 'premise', value))}
          helpText="The smallest permanent statement needed to begin a durable Harness story."
          error={error}
          rows={4}
          disabled={busy}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <LibraryTextArea
          id="harness-foundation-instructions"
          label="Permanent instructions"
          value={form.permanentInstructions ?? ''}
          onChange={value => onChange(field(form, 'permanentInstructions', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-tone"
          label="Tone and style"
          value={form.toneStyle ?? ''}
          onChange={value => onChange(field(form, 'toneStyle', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-opening"
          label="Opening situation"
          value={form.openingSituation ?? ''}
          onChange={value => onChange(field(form, 'openingSituation', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-direction"
          label="Intended direction"
          value={form.intendedDirection ?? ''}
          onChange={value => onChange(field(form, 'intendedDirection', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-canon"
          label="Declared canon"
          value={form.declaredCanon ?? ''}
          onChange={value => onChange(field(form, 'declaredCanon', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-characters"
          label="Characters"
          value={form.characters ?? ''}
          onChange={value => onChange(field(form, 'characters', value))}
          rows={4}
          disabled={busy}
        />
      </div>

      <div className="mt-4">
        <LibraryTextArea
          id="harness-foundation-world-facts"
          label="World facts"
          value={form.worldFacts ?? ''}
          onChange={value => onChange(field(form, 'worldFacts', value))}
          rows={4}
          disabled={busy}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <ManifestButton
          type="button"
          onClick={onSubmit}
          loading={busy}
          icon={story ? CheckCircle2 : Sparkles}
        >
          {story ? 'Save Foundation Revision' : 'Create Harness Story'}
        </ManifestButton>
      </div>
    </LibraryPanel>
  );
}

function AttemptStatus({
  attempt,
  onRetryStage,
  onRetryModel,
  busy,
}: {
  attempt?: HarnessGenerationAttempt;
  onRetryStage: () => void;
  onRetryModel: () => void;
  busy: boolean;
}) {
  if (!attempt) {
    return (
      <LibraryPanel variant="callout" padding="sm">
        <p className="text-sm text-neutral-300">No chapter has been requested yet.</p>
      </LibraryPanel>
    );
  }
  const canResume = ['raw_received', 'prose_accepted', 'events_preserved'].includes(attempt.stage)
    || (attempt.stage === 'accepted_not_durable' && Boolean(attempt.recoveryStage));
  const canRetryModel = ['generation_failed', 'provider_outcome_unknown'].includes(attempt.stage);
  return (
    <LibraryPanel variant="callout" padding="sm" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/55">Current attempt</p>
          <p className="mt-1 text-sm font-semibold text-white">Chapter {attempt.chapterNumber} · {stageLabel[attempt.stage]}</p>
          <p className="mt-1 text-xs text-neutral-400">Started {formatDate(attempt.startedAt)}</p>
          {attempt.failure && <p className="mt-2 max-w-2xl text-xs leading-relaxed text-human">{attempt.failure.message}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {canResume && (
            <LibraryButton type="button" size="sm" icon={RefreshCcw} onClick={onRetryStage} loading={busy}>
              Resume checkpoint
            </LibraryButton>
          )}
          {canRetryModel && (
            <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={onRetryModel} loading={busy}>
              {attempt.stage === 'provider_outcome_unknown' ? 'Explicitly retry model' : 'Retry model request'}
            </LibraryButton>
          )}
        </div>
      </div>
    </LibraryPanel>
  );
}

function SemanticEventList({ events }: { events: HarnessSemanticEvent[] }) {
  if (!events.length) return <p className="text-sm text-neutral-400">No semantic events were supplied for committed chapters.</p>;
  return (
    <ol className="space-y-3">
      {events.map(event => (
        <li key={event.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm leading-relaxed text-neutral-100">{event.description}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/55">
            Chapter {event.chapterNumber} · {event.category ?? 'general narrative event'}
          </p>
          {event.subjects?.length ? <p className="mt-1 text-xs text-neutral-400">Subjects: {event.subjects.join(', ')}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function Diagnostics({ attempt }: { attempt?: HarnessGenerationAttempt }) {
  if (!attempt) return null;
  const usage = attempt.providerReceipt?.usage;
  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-diagnostics-title">
      <div className="flex items-center gap-2">
        <ListTree size={17} className="text-cyan-200" aria-hidden="true" />
        <h2 id="harness-diagnostics-title" className="font-display text-lg text-white">Diagnostics</h2>
      </div>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="font-mono uppercase tracking-[0.14em] text-neutral-500">Provider</p>
          <p className="mt-1 text-neutral-200">{attempt.providerReceipt ? `${attempt.providerReceipt.provider} · ${attempt.providerReceipt.model}` : 'No provider receipt yet'}</p>
          {attempt.providerReceipt?.durationMs !== undefined && <p className="mt-1 text-neutral-400">{attempt.providerReceipt.durationMs} ms</p>}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="font-mono uppercase tracking-[0.14em] text-neutral-500">Usage</p>
          <p className="mt-1 text-neutral-200">
            {usage ? `${usage.source} · ${usage.totalTokens ?? '—'} total tokens` : 'Unavailable'}
          </p>
          {usage?.inputTokens !== undefined && <p className="mt-1 text-neutral-400">{usage.inputTokens} input · {usage.outputTokens ?? '—'} output</p>}
        </div>
      </div>
      {attempt.warnings.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold-accent">Warnings and recoveries</p>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed text-neutral-300">
            {attempt.warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>• {warning.message}</li>)}
          </ul>
        </div>
      )}
      {attempt.rejectedEvents?.length ? (
        <div className="mt-4 rounded-xl border border-human/25 bg-human-brand/10 p-3 text-xs text-neutral-300">
          <p className="font-medium text-human">Rejected optional events</p>
          <ul className="mt-2 space-y-1">
            {attempt.rejectedEvents.map(event => <li key={`${event.index}-${event.reason}`}>Event {event.index + 1}: {event.reason}</li>)}
          </ul>
        </div>
      ) : null}
      <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-xs font-medium text-neutral-200">Frozen context snapshot</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-400">{JSON.stringify(attempt.contextSnapshot, null, 2)}</pre>
      </details>
      {attempt.rawProviderResponse && (
        <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <summary className="cursor-pointer text-xs font-medium text-neutral-200">Raw provider response</summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-400">{attempt.rawProviderResponse}</pre>
        </details>
      )}
    </LibraryPanel>
  );
}

function HarnessInspection({
  state,
  story,
  attempt,
  busy,
  onReplay,
  onCorrection,
  onPolicy,
}: {
  state: HarnessWorkspaceState;
  story: HarnessStory;
  attempt?: HarnessGenerationAttempt;
  busy: boolean;
  onReplay: () => void;
  onCorrection: (input: {
    kind: HarnessCorrectionKind;
    reason: string;
    targetRecordIds?: string[];
    referenceLabel?: string;
    resolvedRecordId?: string;
    replacement?: { kind: 'narrative-event'; evidence: string; facts: { description: string } };
  }) => void;
  onPolicy: (recentChapterCount: number, maxEstimatedTokens: number, includeMinorEvents: boolean) => void;
}) {
  const view = buildCanonicalStoryView(state, story.id);
  const receipts = state.capabilityReceipts.filter(receipt => receipt.storyId === story.id && receipt.status !== 'superseded');
  const projections = state.projections.filter(projection => projection.storyId === story.id);
  const [correctionKind, setCorrectionKind] = useState<HarnessCorrectionKind>('resolve-entity');
  const [correctionReason, setCorrectionReason] = useState('');
  const [targetRecordId, setTargetRecordId] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const [resolvedRecordId, setResolvedRecordId] = useState('');
  const [replacementEvidence, setReplacementEvidence] = useState('');
  const policy = story.contextPolicy ?? DEFAULT_HARNESS_CONTEXT_POLICY;
  const [recentCount, setRecentCount] = useState(String(policy.recentChapterCount));
  const [tokenBudget, setTokenBudget] = useState(String(policy.maxEstimatedTokens));
  const [includeMinor, setIncludeMinor] = useState(policy.includeMinorEvents);

  useEffect(() => {
    setRecentCount(String(policy.recentChapterCount));
    setTokenBudget(String(policy.maxEstimatedTokens));
    setIncludeMinor(policy.includeMinorEvents);
    setCorrectionReason('');
    setTargetRecordId('');
    setReferenceLabel('');
    setResolvedRecordId('');
    setReplacementEvidence('');
  }, [story.id, policy.recentChapterCount, policy.maxEstimatedTokens, policy.includeMinorEvents]);

  const groups = [
    ['Characters', view.characters], ['Relationships', view.relationships], ['Locations and world', view.locations],
    ['Factions', view.factions], ['Plot threads', view.threads], ['Mysteries', view.mysteries],
    ['Timeline', view.timeline], ['Artifacts', view.artifacts], ['Progression', view.progression],
    ['General fallback events', view.narrativeEvents],
  ] as const;

  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-state-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/55">Deterministic story harness</p>
          <h2 id="harness-state-title" className="mt-1 font-display text-xl text-white">Canonical state and projections</h2>
        </div>
        <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={onReplay} loading={busy}>Replay committed events</LibraryButton>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">These records are replayable views over committed evidence. They never replace chapter prose or original events.</p>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {groups.map(([label, records]) => (
          <details key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <summary className="cursor-pointer text-sm font-medium text-neutral-200">{label} <span className="text-neutral-500">({records.length})</span></summary>
            {records.length ? <ul className="mt-3 space-y-2 text-xs text-neutral-300">{records.map(record => (
              <li key={record.id} className="rounded-lg border border-white/5 p-2">
                <span className="font-medium text-white">{record.label ?? String(record.facts.description ?? record.kind)}</span>
                <span className="ml-2 text-neutral-500">{record.confidence}</span>
                <p className="mt-1 text-neutral-400">{record.evidence}</p>
              </li>
            ))}</ul> : <p className="mt-3 text-xs text-neutral-500">No committed evidence in this view.</p>}
          </details>
        ))}
      </div>

      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Capability receipts and replay status ({receipts.length})</summary>
        <ul className="mt-3 space-y-2 text-xs text-neutral-300">{receipts.map(receipt => (
          <li key={receipt.id}>{receipt.capabilityId} {receipt.capabilityVersion} · {receipt.status} · replay {receipt.replayCount}
            {receipt.warnings.map(warning => <p key={warning} className="mt-1 text-gold-accent">{warning}</p>)}
          </li>
        ))}</ul>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Unresolved references and conflicts ({view.unresolvedReferences.length + view.conflicts.length})</summary>
        <ul className="mt-3 space-y-2 text-xs text-neutral-300">
          {view.unresolvedReferences.map((reference, index) => <li key={`${reference.label}-${index}`}>{reference.label}: {reference.reason}</li>)}
          {view.conflicts.map(record => <li key={record.id}>{record.label ?? record.id}: conflicting canonical evidence</li>)}
        </ul>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Codex candidates and System intents ({projections.length})</summary>
        <ul className="mt-3 space-y-2 text-xs text-neutral-300">{projections.map(item => (
          <li key={item.id}><span className="text-white">{item.kind}</span> · {item.status} — {item.explanation}</li>
        ))}</ul>
      </details>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Selected next-chapter context</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-neutral-400">Recent chapters<input className="mt-1 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-white" type="number" min="1" value={recentCount} onChange={event => setRecentCount(event.target.value)} /></label>
          <label className="text-xs text-neutral-400">Estimated token budget<input className="mt-1 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-white" type="number" min="1" value={tokenBudget} onChange={event => setTokenBudget(event.target.value)} /></label>
          <label className="flex items-end gap-2 pb-2 text-xs text-neutral-400"><input type="checkbox" checked={includeMinor} onChange={event => setIncludeMinor(event.target.checked)} /> Include minor events</label>
        </div>
        <div className="mt-3"><LibraryButton type="button" size="sm" onClick={() => onPolicy(Number(recentCount), Number(tokenBudget), includeMinor)} disabled={busy}>Save visible policy</LibraryButton></div>
        {attempt?.contextSnapshot.selectionAudit && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><p className="font-mono text-[10px] uppercase text-cyan-200/60">Included</p><ul className="mt-2 space-y-1 text-xs text-neutral-400">{attempt.contextSnapshot.selectionAudit.included.map(item => <li key={item.id}>{item.label} · {item.estimatedTokens} tokens · {item.reason}</li>)}</ul></div>
          <div><p className="font-mono text-[10px] uppercase text-neutral-500">Omitted</p><ul className="mt-2 space-y-1 text-xs text-neutral-500">{attempt.contextSnapshot.selectionAudit.omitted.map(item => <li key={item.id}>{item.label} · {item.reason}</li>)}</ul></div>
        </div>}
      </details>

      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">Author corrections ({view.corrections.length})</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select className="min-w-0 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" value={correctionKind} onChange={event => setCorrectionKind(event.target.value as HarnessCorrectionKind)}>
            <option value="resolve-entity">Resolve ambiguous entity</option><option value="correct-fact">Correct fact</option><option value="mark-incorrect">Mark incorrect</option><option value="add-missing-fact">Add missing fact</option><option value="supersede-interpretation">Supersede interpretation</option>
          </select>
          <select className="min-w-0 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" value={targetRecordId} onChange={event => setTargetRecordId(event.target.value)}><option value="">No target record</option>{view.records.map(record => <option key={record.id} value={record.id}>{record.label ?? record.kind}</option>)}</select>
          {correctionKind === 'resolve-entity' && <><input className="min-w-0 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" placeholder="Ambiguous label" value={referenceLabel} onChange={event => setReferenceLabel(event.target.value)} /><select className="min-w-0 w-full rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white" value={resolvedRecordId} onChange={event => setResolvedRecordId(event.target.value)}><option value="">Choose resolved character</option>{view.characters.map(record => <option key={record.id} value={record.id}>{record.label}</option>)}</select></>}
          {['correct-fact', 'add-missing-fact', 'supersede-interpretation'].includes(correctionKind) && <textarea className="min-h-20 rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white sm:col-span-2" placeholder="Explicit replacement fact or evidence" value={replacementEvidence} onChange={event => setReplacementEvidence(event.target.value)} />}
          <textarea className="min-h-20 rounded-lg border border-white/15 bg-black/35 p-2 text-sm text-white sm:col-span-2" placeholder="Reason for correction" value={correctionReason} onChange={event => setCorrectionReason(event.target.value)} />
        </div>
        <div className="mt-3"><LibraryButton type="button" size="sm" onClick={() => onCorrection({
          kind: correctionKind, reason: correctionReason, ...(targetRecordId ? { targetRecordIds: [targetRecordId] } : {}),
          ...(referenceLabel ? { referenceLabel } : {}), ...(resolvedRecordId ? { resolvedRecordId } : {}),
          ...(replacementEvidence ? { replacement: { kind: 'narrative-event', evidence: replacementEvidence, facts: { description: replacementEvidence } } } : {}),
        })} disabled={busy}>Append correction</LibraryButton></div>
      </details>
    </LibraryPanel>
  );
}

export function HarnessGenerationWorkspace({ repository: injectedRepository, modelAdapter: injectedAdapter }: HarnessGenerationWorkspaceProps) {
  const repository = useMemo(
    () => injectedRepository ?? new IndexedDbHarnessGenerationRepository(),
    [injectedRepository],
  );
  const modelAdapter = useMemo(
    () => injectedAdapter ?? new HarnessGenerationHttpClient(),
    [injectedAdapter],
  );
  const controller = useMemo(
    () => new HarnessGenerationController({ repository, modelAdapter }),
    [repository, modelAdapter],
  );
  const [state, setState] = useState<HarnessWorkspaceState>();
  const [serverInfo, setServerInfo] = useState<HarnessGenerationServerInfo>();
  const [selectedStoryId, setSelectedStoryId] = useState<string>();
  const [foundationForm, setFoundationForm] = useState<StoryFoundationInput>(emptyFoundation);
  const [model, setModel] = useState('');
  const [batchCount, setBatchCount] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [foundationError, setFoundationError] = useState<string>();

  useEffect(() => {
    let active = true;
    const unsubscribe = controller.subscribe(snapshot => {
      if (active) setState(snapshot);
    });
    void controller.hydrate()
      .catch(error => active && setMessage(error instanceof Error ? error.message : 'Harness Generation could not open local storage.'));
    void modelAdapter.getServerInfo()
      .then(info => {
        if (!active) return;
        setServerInfo(info);
        setModel(current => current || info.defaultModel);
      })
      .catch(error => active && setMessage(error instanceof Error ? error.message : 'Harness Generation could not load provider configuration.'));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [controller, modelAdapter]);

  const selectedStory = state && selectedStoryId ? findStory(state, selectedStoryId) : undefined;
  const selectedFoundation = state && selectedStory
    ? findFoundationRevision(state, selectedStory.activeFoundationRevisionId)
    : undefined;
  const chapters = state && selectedStory ? storyChapters(state, selectedStory.id) : [];
  const events = state && selectedStory ? storyEvents(state, selectedStory.id) : [];
  const attempt = state && selectedStory ? latestAttemptForStory(state, selectedStory.id) : undefined;
  const batch = state && selectedStory ? state.batches
    .filter(entry => entry.storyId === selectedStory.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] : undefined;
  const visibleEvents = [
    ...events,
    ...(attempt && attempt.stage !== 'committed' ? attempt.preservedEvents ?? [] : []),
  ];

  useEffect(() => {
    if (!state) return;
    if (selectedStoryId && state.stories.some(story => story.id === selectedStoryId)) return;
    setSelectedStoryId(state.stories[0]?.id);
  }, [state, selectedStoryId]);

  useEffect(() => {
    setFoundationForm(selectedFoundation?.input ?? emptyFoundation());
    setFoundationError(undefined);
  }, [selectedFoundation?.id]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(undefined);
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Harness Generation could not complete that action.');
    } finally {
      setBusy(false);
    }
  };

  const saveFoundation = () => {
    setFoundationError(undefined);
    void run(async () => {
      try {
        if (selectedStory) {
          await controller.saveFoundationRevision(selectedStory.id, foundationForm);
        } else {
          const created = await controller.createStory(foundationForm);
          setSelectedStoryId(created.id);
        }
      } catch (error) {
        const next = error instanceof Error ? error.message : 'The Story Foundation could not be saved.';
        setFoundationError(next);
        throw error;
      }
    });
  };

  const generate = () => {
    if (!selectedStory) {
      setMessage('Create or open a Harness story before generating a chapter.');
      return;
    }
    void run(() => controller.generateNextChapter(selectedStory.id, model));
  };

  const retryStage = () => {
    if (!attempt) return;
    void run(() => controller.retryAppropriateStage(attempt.id));
  };

  const retryModel = () => {
    if (!attempt) return;
    void run(() => controller.retryModelRequest(attempt.id));
  };

  const replay = () => selectedStory && void run(() => controller.replayStory(selectedStory.id));
  const savePolicy = (recentChapterCount: number, maxEstimatedTokens: number, includeMinorEvents: boolean) => {
    if (!selectedStory) return;
    void run(() => controller.setContextPolicy(selectedStory.id, { recentChapterCount, maxEstimatedTokens, includeMinorEvents }));
  };
  const addCorrection = (input: Parameters<typeof controller.addCorrection>[1]) => {
    if (!selectedStory) return;
    void run(() => controller.addCorrection(selectedStory.id, input));
  };
  const startBatch = () => {
    if (!selectedStory) return;
    void run(() => controller.startBatch(selectedStory.id, model, Number(batchCount)));
  };
  const pauseBatch = () => {
    if (!batch) return;
    setMessage(undefined);
    void controller.requestBatchPause(batch.id).catch(error => setMessage(error instanceof Error ? error.message : 'The batch could not be paused.'));
  };
  const resumeBatch = () => batch && void run(() => controller.resumeBatch(batch.id));
  const retryBatch = () => batch && void run(() => controller.retryBatchChapter(batch.id));

  const download = () => {
    if (!state || !selectedStory) return;
    try {
      const archive = exportHarnessStory(state, selectedStory.id);
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${selectedStory.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'harness-story'}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Harness story export failed.');
    }
  };

  const generationAvailable = Boolean(selectedStory && serverInfo?.configured && model && !busy);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6" data-testid="harness-generation-workspace">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">Deterministic story harness · Phase 3</p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">Harness Generation</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
            One model call writes each chapter. Deterministic capabilities preserve canon, continuity, provenance, and recoverable projections around the committed prose.
          </p>
        </div>
        {selectedStory && (
          <LibraryButton type="button" variant="ghost" icon={Download} onClick={download} disabled={busy}>
            Export local story
          </LibraryButton>
        )}
      </header>

      {message && (
        <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-human/35 bg-human-brand/10 px-4 py-3 text-sm leading-relaxed text-human">
          <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {!state ? (
        <LibraryPanel className="flex min-h-64 items-center justify-center gap-3" padding="lg">
          <LoaderCircle className="animate-spin text-cyan-200 motion-reduce:animate-none" aria-hidden="true" />
          <span className="text-sm text-neutral-300">Opening feature-owned local story storage…</span>
        </LibraryPanel>
      ) : (
        <div className="min-w-0 grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-4">
            <LibraryPanel as="section" padding="sm" aria-label="Harness stories">
              <div className="flex items-center justify-between gap-2 px-1 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Local stories</p>
                  <p className="mt-1 text-sm text-neutral-300">{state.stories.length} durable {state.stories.length === 1 ? 'story' : 'stories'}</p>
                </div>
                <LibraryButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  icon={Plus}
                  aria-label="Create a new Harness story"
                  onClick={() => {
                    setSelectedStoryId(undefined);
                    setFoundationForm(emptyFoundation());
                    setFoundationError(undefined);
                    setMessage(undefined);
                  }}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                {state.stories.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs leading-relaxed text-neutral-500">Create a premise-first story. It stays in this browser’s Harness Generation storage.</p>
                ) : state.stories.map(story => {
                  const selected = story.id === selectedStoryId;
                  return (
                    <button
                      key={story.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedStoryId(story.id)}
                      className={`min-w-0 max-w-full w-full rounded-xl border px-3 py-3 text-left transition-colors ${selected ? 'border-cyan-300/35 bg-cyan-400/10 text-white' : 'border-white/10 bg-black/10 text-neutral-300 hover:border-white/25 hover:bg-white/[0.04]'}`}
                    >
                      <span className="block truncate text-sm font-medium">{story.title}</span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">Next: Chapter {story.head.nextChapterNumber}</span>
                    </button>
                  );
                })}
              </div>
            </LibraryPanel>
            {selectedStory && <AttemptStatus attempt={attempt} busy={busy} onRetryStage={retryStage} onRetryModel={retryModel} />}
          </aside>

          <div className="min-w-0 space-y-5">
            <FoundationEditor
              form={foundationForm}
              story={selectedStory}
              busy={busy}
              error={foundationError}
              onChange={setFoundationForm}
              onSubmit={saveFoundation}
            />

            {selectedStory && (
              <LibraryPanel as="section" padding="md" aria-labelledby="harness-generate-title">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/55">One-call generation</p>
                    <h2 id="harness-generate-title" className="mt-1 font-display text-xl text-white">Generate Chapter {selectedStory.head.nextChapterNumber}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
                      The provider receives the frozen Foundation revision and the visible, audited selection of committed prose, corrections, and canonical evidence.
                    </p>
                  </div>
                  <div className="min-w-52">
                    <label className="block font-sc text-xs uppercase tracking-widest text-neutral-400" htmlFor="harness-generation-model">Provider model</label>
                    <select
                      id="harness-generation-model"
                      className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-cyan-300/60"
                      value={model}
                      onChange={event => setModel(event.target.value)}
                      disabled={busy || !serverInfo?.models.length}
                    >
                      {(serverInfo?.models ?? []).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                    {serverInfo ? (
                      <p className={`mt-2 text-xs ${serverInfo.configured ? 'text-neutral-500' : 'text-human'}`}>
                        {serverInfo.configured ? 'Server-side provider configured.' : 'Server-side Gemini key is not configured.'}
                      </p>
                    ) : <p className="mt-2 text-xs text-neutral-500">Checking provider configuration…</p>}
                  </div>
                </div>
                <div className="mt-5">
                  <ManifestButton
                    type="button"
                    icon={WandSparkles}
                    onClick={generate}
                    disabled={!generationAvailable}
                    loading={busy}
                  >
                    Generate Next Chapter
                  </ManifestButton>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-48 text-xs text-neutral-400" htmlFor="harness-batch-count">Sequential batch chapter count
                      <input id="harness-batch-count" type="number" min="1" placeholder="Choose a count" value={batchCount} onChange={event => setBatchCount(event.target.value)} disabled={busy}
                        className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-white" />
                    </label>
                    <LibraryButton type="button" size="sm" icon={Play} onClick={startBatch} disabled={!generationAvailable || !batchCount}>Start sequential batch</LibraryButton>
                    {batch?.status === 'running' || batch?.status === 'pause_requested' ? <LibraryButton type="button" size="sm" variant="secondary" icon={Pause} onClick={pauseBatch} disabled={batch.status === 'pause_requested'}>Pause after active call</LibraryButton> : null}
                    {batch?.status === 'paused' && <LibraryButton type="button" size="sm" icon={Play} onClick={resumeBatch} loading={busy}>Resume batch</LibraryButton>}
                    {batch && ['failed', 'provider_outcome_unknown'].includes(batch.status) && <LibraryButton type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={retryBatch} loading={busy}>{batch.status === 'provider_outcome_unknown' ? 'Explicitly retry unknown call' : 'Retry failed batch chapter'}</LibraryButton>}
                  </div>
                  {batch && <p className="mt-3 text-xs text-neutral-400">Batch {batch.status.replace(/_/g, ' ')} · {batch.completedChapterIds.length}/{batch.requestedChapterCount} committed · usage: {batch.usage.reportedCalls} reported, {batch.usage.estimatedCalls} estimated, {batch.usage.unavailableCalls} unavailable calls</p>}
                  {batch?.failure && <p className="mt-2 text-xs text-human">{batch.failure}</p>}
                </div>
              </LibraryPanel>
            )}

            {selectedStory && chapters.length > 0 && (
              <LibraryPanel as="section" padding="md" aria-labelledby="harness-chapters-title">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-cyan-200" aria-hidden="true" />
                  <h2 id="harness-chapters-title" className="font-display text-xl text-white">Committed chapters</h2>
                </div>
                <div className="mt-5 space-y-5">
                  {chapters.map(chapter => (
                    <article key={chapter.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200/55">Chapter {chapter.chapterNumber} · {chapter.responseMode === 'plain-prose-recovery' ? 'plain prose recovery' : 'structured response'}</p>
                      <h3 className="mt-2 font-display text-xl text-white">{chapter.title}</h3>
                      {chapter.plan && (
                        <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-neutral-300">
                          <summary className="cursor-pointer">Optional plan</summary>
                          <pre className="mt-2 whitespace-pre-wrap text-neutral-400">{typeof chapter.plan === 'string' ? chapter.plan : JSON.stringify(chapter.plan, null, 2)}</pre>
                        </details>
                      )}
                      <div className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-neutral-100">{chapter.prose}</div>
                    </article>
                  ))}
                </div>
              </LibraryPanel>
            )}

            {selectedStory && (
              <LibraryPanel as="section" padding="md" aria-labelledby="harness-events-title">
                <div className="flex items-center gap-2">
                  <FileText size={17} className="text-cyan-200" aria-hidden="true" />
                  <h2 id="harness-events-title" className="font-display text-lg text-white">Semantic event ledger</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  Every accepted description remains append-only evidence. Specific deterministic capabilities may interpret it, while unfamiliar or insufficient events remain available through the general narrative fallback.
                </p>
                <div className="mt-4"><SemanticEventList events={visibleEvents} /></div>
              </LibraryPanel>
            )}

            {selectedStory && <HarnessInspection
              state={state}
              story={selectedStory}
              attempt={attempt}
              busy={busy}
              onReplay={replay}
              onCorrection={addCorrection}
              onPolicy={savePolicy}
            />}

            {selectedStory && <Diagnostics attempt={attempt} />}
          </div>
        </div>
      )}
    </main>
  );
}

export default HarnessGenerationWorkspace;

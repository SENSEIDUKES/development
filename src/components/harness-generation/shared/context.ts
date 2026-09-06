import { buildCanonicalStoryView } from './canonicalState';
import { verifyHarnessEventEvidence } from './responseAcceptance';
import { cloneHarnessValue, defaultHarnessRuntime, type HarnessRuntime } from './ids';
import type {
  HarnessCanonicalRecord,
  HarnessCanonicalContext,
  HarnessContextAuditItem,
  HarnessContextChapter,
  HarnessContextSelectionPolicy,
  HarnessContextSnapshot,
  HarnessStory,
  HarnessWorkspaceState,
  StoryFoundationRevision,
} from './types';

export const DEFAULT_HARNESS_CONTEXT_POLICY: HarnessContextSelectionPolicy = {
  recentChapterCount: 3,
  maxEstimatedTokens: 24_000,
  includeMinorEvents: false,
};

const estimateTokens = (value: unknown) => Math.max(1, Math.ceil(JSON.stringify(value).length / 4));

const chapterContext = (state: HarnessWorkspaceState, chapterId: string): HarnessContextChapter | undefined => {
  const chapter = state.chapters.find(candidate => candidate.id === chapterId);
  if (!chapter) return undefined;
  const eventsById = new Map(state.events.map(event => [event.id, event]));
  return {
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    prose: chapter.prose,
    events: chapter.eventIds.flatMap(eventId => {
      const event = eventsById.get(eventId);
      return event ? [{
        id: event.id,
        description: event.description,
        evidenceVerified: verifyHarnessEventEvidence(event, chapter.prose).evidenceVerified,
        ...(event.category ? { category: event.category } : {}),
        ...(event.subjects ? { subjects: [...event.subjects] } : {}),
        ...(event.subjectKinds ? { subjectKinds: { ...event.subjectKinds } } : {}),
        ...(event.significance ? { significance: event.significance } : {}),
        ...(event.evidence ? { evidence: event.evidence } : {}),
        ...(event.requestedEffects ? { requestedEffects: [...event.requestedEffects] } : {}),
        ...(event.facts ? { facts: { ...event.facts } } : {}),
      }] : [];
    }),
  };
};

const recordPriority = (record: HarnessCanonicalRecord) => {
  if (record.kind === 'plot-thread' && record.facts.state === 'open') return 1;
  if (record.kind === 'mystery' && record.facts.knowledgeState !== 'revealed') return 2;
  if (['character', 'relationship', 'location-world'].includes(record.kind)) return 3;
  if (['faction', 'artifact', 'progression'].includes(record.kind)) return 4;
  return 5;
};

const auditItem = (
  id: string,
  sourceKind: HarnessContextAuditItem['sourceKind'],
  sourceRecordIds: string[],
  label: string,
  reason: string,
  value: unknown,
): HarnessContextAuditItem => ({ id, sourceKind, sourceRecordIds, label, reason, estimatedTokens: estimateTokens(value) });

/** Selects only persisted evidence and records every inclusion and omission. */
export const compileHarnessContext = (
  state: HarnessWorkspaceState,
  story: HarnessStory,
  foundationRevision: StoryFoundationRevision,
  attemptId: string,
  runtime: HarnessRuntime = defaultHarnessRuntime,
): HarnessContextSnapshot => {
  const policy = cloneHarnessValue(story.contextPolicy ?? DEFAULT_HARNESS_CONTEXT_POLICY);
  const included: HarnessContextAuditItem[] = [];
  const omitted: HarnessContextAuditItem[] = [];
  let remaining = policy.maxEstimatedTokens;

  const foundationItem = auditItem(`ctx-foundation-${foundationRevision.id}`, 'foundation', [foundationRevision.id],
    `Story Foundation revision ${foundationRevision.revision}`, 'The selected permanent Foundation revision is always included.', foundationRevision.input);
  included.push(foundationItem);
  remaining -= foundationItem.estimatedTokens;
  if (remaining < 0) foundationItem.reason += ` Foundation alone exceeds the soft selection budget by ${-remaining} estimated tokens; it was not truncated.`;

  // Reserve author intent before prose or derived records can consume the budget.
  // Reverse append order also makes equal timestamps deterministic (latest wins).
  const corrections = state.corrections.filter(correction => correction.storyId === story.id)
    .reverse().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const selectedCorrections: HarnessCanonicalContext['corrections'] = [];
  const referent = (id: string) => {
    const record = state.canonicalRecords.find(candidate => candidate.id === id && candidate.storyId === story.id);
    if (!record) return [];
    const { kind, label, evidence, facts } = record;
    return [{ id, kind, label, evidence, facts }];
  };
  for (const correction of corrections) {
    const value = {
      ...correction,
      targetEvidence: correction.targetRecordIds.flatMap(referent),
      ...(correction.resolvedRecordId ? { resolvedEntity: referent(correction.resolvedRecordId)[0] } : {}),
    };
    const item = auditItem(`ctx-correction-${correction.id}`, 'correction', [correction.id, ...correction.targetRecordIds],
      `Author correction: ${correction.kind}`, 'Selected newest first, before chapter prose and canonical records; includes available target evidence.', value);
    if (item.estimatedTokens <= remaining) {
      selectedCorrections.push(value);
      included.push(item);
      remaining -= item.estimatedTokens;
    } else omitted.push({ ...item, reason: `Author correction omitted: needs ${item.estimatedTokens} estimated tokens, ${Math.max(0, remaining)} remain after Foundation and newer corrections.` });
  }

  const allChapters = state.chapters.filter(chapter => chapter.storyId === story.id)
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
  const recentIds = new Set(allChapters.slice(-policy.recentChapterCount).map(chapter => chapter.id));
  const committedChapters: HarnessContextChapter[] = [];
  for (const chapter of [...allChapters].reverse()) {
    const context = chapterContext(state, chapter.id)!;
    const item = auditItem(`ctx-chapter-${chapter.id}`, 'chapter-prose', [chapter.id, ...chapter.eventIds],
      `Chapter ${chapter.chapterNumber}: ${chapter.title}`,
      recentIds.has(chapter.id) ? `Selected newest first within the recent-chapter window (${policy.recentChapterCount}), before derived records.` : `Omitted outside the recent-chapter window (${policy.recentChapterCount}).`, context);
    if (!recentIds.has(chapter.id)) omitted.push(item);
    else if (item.estimatedTokens <= remaining) {
      committedChapters.push(context);
      included.push(item);
      remaining -= item.estimatedTokens;
    } else omitted.push({ ...item, reason: `Chapter omitted: needs ${item.estimatedTokens} estimated tokens, ${Math.max(0, remaining)} remain after Foundation, author corrections, and newer chapters. Prose was not truncated.` });
  }
  // Allocate newest first, but read the retained prose in narrative order.
  committedChapters.sort((left, right) => left.chapterNumber - right.chapterNumber);

  const view = buildCanonicalStoryView(state, story.id);
  const selectedRecords: HarnessCanonicalRecord[] = [];
  const records = [...view.records].sort((left, right) => recordPriority(left) - recordPriority(right) || left.createdAt.localeCompare(right.createdAt));
  for (const record of records) {
    const minor = record.sourceEventId ? state.events.find(event => event.id === record.sourceEventId)?.significance === 'minor' : false;
    const item = auditItem(`ctx-record-${record.id}`, 'canonical-record', [record.id, ...(record.sourceEventId ? [record.sourceEventId] : [])],
      `${record.kind}: ${record.label ?? record.facts.description ?? record.id}`,
      minor && !policy.includeMinorEvents ? 'Omitted because the visible policy excludes minor events.' : 'Included as active, explicitly evidenced canonical state.', record);
    if (minor && !policy.includeMinorEvents) omitted.push(item);
    else if (item.estimatedTokens <= remaining) {
      selectedRecords.push(record);
      included.push(item);
      remaining -= item.estimatedTokens;
    } else omitted.push({ ...item, reason: 'Omitted because the visible context token budget was exhausted.' });
  }

  const handoff = selectedRecords.filter(record =>
    (record.kind === 'plot-thread' && record.facts.state === 'open')
    || (record.kind === 'mystery' && record.facts.knowledgeState !== 'revealed')
    || record.kind === 'narrative-event')
    .slice(-12)
    .map(record => ({ description: String(record.facts.description ?? record.evidence), sourceRecordIds: [record.id, ...(record.sourceEventId ? [record.sourceEventId] : [])] }));
  if (handoff.length) {
    const item = auditItem(`ctx-handoff-${attemptId}`, 'derived-handoff', handoff.flatMap(entry => entry.sourceRecordIds),
      'Deterministic chapter handoff', 'Derived only from selected open threads, mysteries, and narrative events.', handoff);
    if (item.estimatedTokens <= remaining) {
      included.push(item);
      remaining -= item.estimatedTokens;
    } else {
      omitted.push({ ...item, reason: 'Omitted because the visible context token budget was exhausted.' });
      handoff.splice(0, handoff.length);
    }
  }

  return {
    id: runtime.createId('hctx'),
    storyId: story.id,
    attemptId,
    foundationRevision: cloneHarnessValue(foundationRevision),
    storyHead: cloneHarnessValue(story.head),
    chapterNumber: story.head.nextChapterNumber,
    createdAt: runtime.now(),
    committedChapters,
    contextVersion: 2,
    selectionPolicy: policy,
    canonicalContext: { corrections: cloneHarnessValue(selectedCorrections), records: cloneHarnessValue(selectedRecords), handoff },
    selectionAudit: { included, omitted, totalEstimatedTokens: included.reduce((sum, item) => sum + item.estimatedTokens, 0) },
  };
};

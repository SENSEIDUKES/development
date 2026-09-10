import { buildCanonicalStoryView } from './canonicalState';
import { buildHarnessMechanicalContinuity } from './mechanicalContinuity';
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
        ...(event.details ? { details: cloneHarnessValue(event.details) } : {}),
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

  // Never silently discard author authority, even under an unusually small budget.
  const steering = cloneHarnessValue(story.steering ?? []);
  for (const direction of steering) {
    const item = auditItem(`ctx-${direction.id}`, 'correction', [direction.id], 'Author direction',
      'Persistent author direction takes precedence over proposed plans; only explicit history revisions change past facts.', direction);
    included.push(item);
    remaining -= item.estimatedTokens;
  }
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
    // Corrections are authoritative, not optional retrieval candidates. Skipping a
    // long new correction and fitting a shorter old one reverses author intent.
    selectedCorrections.push(value);
    included.push(item);
    remaining -= item.estimatedTokens;
    if (remaining < 0) item.reason += ` Protected author correction exceeds the soft selection budget by ${-remaining} estimated tokens; optional history is omitted first.`;
  }

  const allChapters = state.chapters.filter(chapter => chapter.storyId === story.id)
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
  const latestChapterId = story.head.lastCommittedChapterId ?? allChapters.at(-1)?.id;
  if (latestChapterId && !allChapters.some(chapter => chapter.id === latestChapterId)) {
    throw new Error('The latest committed chapter is missing. Restore its saved context before continuing; the harness will not substitute an older chapter.');
  }
  const recentIds = new Set(allChapters.slice(-policy.recentChapterCount).map(chapter => chapter.id));
  const chaptersById = new Map(allChapters.map(chapter => [chapter.id, chapter]));
  const committedEvents = state.events.filter(event => event.storyId === story.id && event.chapterId && chaptersById.has(event.chapterId))
    .map(event => verifyHarnessEventEvidence(event, chaptersById.get(event.chapterId!)!.prose))
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
  const mechanicalContinuity = buildHarnessMechanicalContinuity(committedEvents);
  for (const observation of mechanicalContinuity) {
    const item = auditItem(`ctx-mechanics-${observation.sourceId}`, 'canonical-record',
      [observation.sourceId, ...observation.subsequentDevelopments.map(event => event.sourceId)],
      `${observation.subject}: ${observation.name}`, 'Preserve quantified observations and later transfers or spending before optional prose.', observation);
    included.push(item); remaining -= item.estimatedTokens;
  }
  const committedChapters: HarnessContextChapter[] = [];
  for (const chapter of [...allChapters].reverse()) {
    const context = chapterContext(state, chapter.id)!;
    const item = auditItem(`ctx-chapter-${chapter.id}`, 'chapter-prose', [chapter.id, ...chapter.eventIds],
      `Chapter ${chapter.chapterNumber}: ${chapter.title}`,
      recentIds.has(chapter.id) ? `Selected newest first within the recent-chapter window (${policy.recentChapterCount}), before derived records.` : `Omitted outside the recent-chapter window (${policy.recentChapterCount}).`, context);
    const immediateContinuation = chapter.id === latestChapterId;
    if (!recentIds.has(chapter.id) && !immediateContinuation) omitted.push(item);
    else if (immediateContinuation || item.estimatedTokens <= remaining) {
      committedChapters.push(context);
      included.push(item);
      remaining -= item.estimatedTokens;
      if (immediateContinuation) {
        item.reason = 'Protected immediate continuation: the latest committed chapter is always included intact.';
        if (remaining < 0) item.reason += ` Mandatory context exceeds the soft selection budget by ${-remaining} estimated tokens; optional history is omitted first.`;
      }
    } else omitted.push({ ...item, reason: `Chapter omitted: needs ${item.estimatedTokens} estimated tokens, ${Math.max(0, remaining)} remain after Foundation, author corrections, and newer chapters. Prose was not truncated.` });
  }
  // Allocate newest first, but read the retained prose in narrative order.
  committedChapters.sort((left, right) => left.chapterNumber - right.chapterNumber);

  const developments: NonNullable<HarnessContextSnapshot['developments']> = [];
  // Reserve half the remaining budget for compact developments, after recent prose.
  // Latest subject/category observations come first; older consequences stay searchable.
  let memoryBudget = Math.max(0, Math.floor(remaining / 2));
  const keys = new Set<string>();
  const recentFirst = [...committedEvents].reverse();
  const current = recentFirst.filter(event => {
    const key = event.details?.mechanics
      ? `mechanics:${event.details.mechanics.subject}:${event.details.mechanics.name}`
      : `${event.category ?? 'event'}:${[...(event.subjects ?? [event.id])].sort().join('|')}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
  const currentSet = new Set(current);
  const ordered = [...current, ...recentFirst.filter(event => !currentSet.has(event))];
  for (const event of ordered) {
    const value = { chapterNumber: event.chapterNumber, sourceId: event.id, description: event.description, evidence: event.evidence, evidenceVerified: event.evidenceVerified,
      ...(event.details ? { details: cloneHarnessValue(event.details) } : {}) };
    const item = auditItem(`ctx-development-${event.id}`, 'canonical-record', [event.id],
      `Development in Chapter ${event.chapterNumber}`, 'Committed event evidence survives optional processing failures.', value);
    if (item.estimatedTokens <= memoryBudget) {
      developments.push(value); included.push(item);
      memoryBudget -= item.estimatedTokens; remaining -= item.estimatedTokens;
    } else omitted.push({ ...item, reason: 'Omitted from compact memory; original chapter and event remain available for targeted lookup.' });
  }
  developments.sort((a, b) => a.chapterNumber - b.chapterNumber);

  // At most three excerpts, matched against explicit names/direction, not another model loop.
  const terms = Array.from(new Set((steering.slice(-1)[0]?.direction ?? '').toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []))
    .filter(term => !['with', 'that', 'this', 'from', 'have', 'into', 'should', 'chapter', 'story'].includes(term));
  const lookups: NonNullable<HarnessContextSnapshot['lookups']> = [];
  const candidates = allChapters.filter(chapter => !recentIds.has(chapter.id)).map(chapter => {
    const haystack = terms.length ? chapter.prose.toLowerCase() : '';
    return { chapter, haystack, score: terms.filter(term => haystack.includes(term)).length };
  }).filter(item => item.score > 0 || !item.chapter.eventIds.length)
    .sort((a, b) => b.score - a.score || b.chapter.chapterNumber - a.chapter.chapterNumber).slice(0, 3);
  for (const { chapter, haystack } of candidates) {
    const match = terms.map(term => haystack.indexOf(term)).find(index => index >= 0) ?? 0;
    const value = { chapterNumber: chapter.chapterNumber, sourceId: chapter.id,
      excerpt: chapter.prose.slice(Math.max(0, match - 200), Math.max(0, match - 200) + 1600) };
    const item = auditItem(`ctx-lookup-${chapter.id}`, 'chapter-prose', [chapter.id], `Lookup: Chapter ${chapter.chapterNumber}`,
      'Bounded original evidence lookup for current direction or a chapter awaiting event repair.', value);
    if (item.estimatedTokens <= remaining) { lookups.push(value); included.push(item); remaining -= item.estimatedTokens; }
    else omitted.push({ ...item, reason: 'Lookup omitted because the context budget was exhausted.' });
  }
  const view = buildCanonicalStoryView(state, story.id);
  const currentThreadIds = new Set(view.currentThreads.map(record => record.id));
  const selectedRecords: HarnessCanonicalRecord[] = [];
  const chapterNumbers = new Map(allChapters.map(chapter => [chapter.id, chapter.chapterNumber]));
  const records = [...view.records].sort((left, right) => recordPriority(left) - recordPriority(right)
    || (chapterNumbers.get(right.chapterId ?? '') ?? Infinity) - (chapterNumbers.get(left.chapterId ?? '') ?? Infinity));
  for (const record of records) {
    const minor = record.sourceEventId ? state.events.find(event => event.id === record.sourceEventId)?.significance === 'minor' : false;
    const item = auditItem(`ctx-record-${record.id}`, 'canonical-record', [record.id, ...(record.sourceEventId ? [record.sourceEventId] : [])],
      `${record.kind}: ${record.label ?? record.facts.description ?? record.id}`,
      minor && !policy.includeMinorEvents ? 'Omitted because the visible policy excludes minor events.' : 'Included as active, explicitly evidenced canonical state.', record);
    if (record.kind === 'plot-thread' && !currentThreadIds.has(record.id)) {
      omitted.push({ ...item, reason: 'Historical or unsupported thread state: only the latest supported status enters continuation; the original record remains in story history.' });
    } else if (minor && !policy.includeMinorEvents) omitted.push(item);
    else if (item.estimatedTokens <= remaining) {
      selectedRecords.push(record);
      included.push(item);
      remaining -= item.estimatedTokens;
    } else omitted.push({ ...item, reason: 'Omitted because the visible context token budget was exhausted.' });
  }

  const handoff = selectedRecords.filter(record => record.confidence === 'resolved' && (
    (record.kind === 'plot-thread' && currentThreadIds.has(record.id) && record.facts.state === 'open')
    || (record.kind === 'mystery' && record.facts.knowledgeState !== 'revealed')
    || record.kind === 'narrative-event'))
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
    steering,
    developments,
    lookups,
    mechanicalContinuity,
    contextVersion: 2,
    selectionPolicy: policy,
    canonicalContext: { corrections: cloneHarnessValue(selectedCorrections), records: cloneHarnessValue(selectedRecords), handoff },
    selectionAudit: { included, omitted, totalEstimatedTokens: included.reduce((sum, item) => sum + item.estimatedTokens, 0) },
  };
};

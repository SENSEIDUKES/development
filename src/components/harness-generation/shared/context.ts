import { buildCanonicalStoryView } from './canonicalState';
import { buildHarnessMechanicalContinuity } from './mechanicalContinuity';
import { cloneHarnessValue, defaultHarnessRuntime, type HarnessRuntime } from './ids';
import type {
  HarnessCanonicalRecord,
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
        ...(event.category ? { category: event.category } : {}),
        ...(event.subjects ? { subjects: [...event.subjects] } : {}),
        ...(event.significance ? { significance: event.significance } : {}),
        ...(event.evidence ? { evidence: event.evidence } : {}),
        ...(event.requestedEffects ? { requestedEffects: [...event.requestedEffects] } : {}),
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
  const corrections = state.corrections.filter(correction => correction.storyId === story.id);
  for (const direction of steering) {
    const item = auditItem(`ctx-${direction.id}`, 'correction', [direction.id], 'Author direction',
      'Persistent author direction takes precedence over proposed plans; only explicit history revisions change past facts.', direction);
    included.push(item);
    remaining -= item.estimatedTokens;
  }
  const selectedCorrections = cloneHarnessValue(corrections);
  for (const correction of corrections) {
    const item = auditItem(`ctx-correction-${correction.id}`, 'correction', [correction.id, ...correction.targetRecordIds],
      `Author correction: ${correction.kind}`, 'Author corrections are mandatory authority, ahead of the optional context budget.', correction);
    included.push(item);
    remaining -= item.estimatedTokens;
  }

  const foundationItem = auditItem(`ctx-foundation-${foundationRevision.id}`, 'foundation', [foundationRevision.id],
    `Story Foundation revision ${foundationRevision.revision}`, 'The selected permanent Foundation revision is always included.', foundationRevision.input);
  included.push(foundationItem);
  remaining -= foundationItem.estimatedTokens;

  const allChapters = state.chapters.filter(chapter => chapter.storyId === story.id)
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
  const recentIds = new Set(allChapters.slice(-policy.recentChapterCount).map(chapter => chapter.id));
  const chapterIds = new Set(allChapters.map(chapter => chapter.id));
  const committedEvents = state.events.filter(event => event.storyId === story.id && event.chapterId && chapterIds.has(event.chapterId))
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
  const mechanicalContinuity = buildHarnessMechanicalContinuity(committedEvents);
  for (const observation of mechanicalContinuity) {
    const item = auditItem(`ctx-mechanics-${observation.sourceId}`, 'canonical-record',
      [observation.sourceId, ...observation.subsequentDevelopments.map(event => event.sourceId)],
      `${observation.subject}: ${observation.name}`, 'Preserve quantified observations and later transfers or spending before optional prose.', observation);
    included.push(item); remaining -= item.estimatedTokens;
  }
  const developments: NonNullable<HarnessContextSnapshot['developments']> = [];
  // Reserve half the available budget for compact developments, before full prose.
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
  const ordered = [...current, ...recentFirst.filter(event => !current.includes(event))];
  for (const event of ordered) {
    const value = { chapterNumber: event.chapterNumber, sourceId: event.id, description: event.description,
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
  const candidates = allChapters.filter(chapter => !recentIds.has(chapter.id)).map(chapter => ({
    chapter, score: terms.filter(term => chapter.prose.toLowerCase().includes(term)).length,
  })).filter(item => item.score > 0 || !item.chapter.eventIds.length)
    .sort((a, b) => b.score - a.score || b.chapter.chapterNumber - a.chapter.chapterNumber).slice(0, 3);
  for (const { chapter } of candidates) {
    const match = terms.map(term => chapter.prose.toLowerCase().indexOf(term)).find(index => index >= 0) ?? 0;
    const value = { chapterNumber: chapter.chapterNumber, sourceId: chapter.id,
      excerpt: chapter.prose.slice(Math.max(0, match - 200), Math.max(0, match - 200) + 1600) };
    const item = auditItem(`ctx-lookup-${chapter.id}`, 'chapter-prose', [chapter.id], `Lookup: Chapter ${chapter.chapterNumber}`,
      'Bounded original evidence lookup for current direction or a chapter awaiting event repair.', value);
    if (item.estimatedTokens <= remaining) { lookups.push(value); included.push(item); remaining -= item.estimatedTokens; }
    else omitted.push({ ...item, reason: 'Lookup omitted because the context budget was exhausted.' });
  }
  const committedChapters: HarnessContextChapter[] = [];
  for (const chapter of allChapters) {
    const context = chapterContext(state, chapter.id)!;
    const item = auditItem(`ctx-chapter-${chapter.id}`, 'chapter-prose', [chapter.id, ...chapter.eventIds],
      `Chapter ${chapter.chapterNumber}: ${chapter.title}`,
      recentIds.has(chapter.id) ? `Included by the recent-chapter window (${policy.recentChapterCount}).` : `Omitted outside the recent-chapter window (${policy.recentChapterCount}).`, context);
    if (!recentIds.has(chapter.id)) omitted.push(item);
    else if (item.estimatedTokens <= remaining) {
      committedChapters.push(context);
      included.push(item);
      remaining -= item.estimatedTokens;
    } else omitted.push({ ...item, reason: 'Omitted because the visible context token budget was exhausted.' });
  }

  const view = buildCanonicalStoryView(state, story.id);
  const selectedRecords: HarnessCanonicalRecord[] = [];
  const chapterNumbers = new Map(allChapters.map(chapter => [chapter.id, chapter.chapterNumber]));
  const records = [...view.records].sort((left, right) => recordPriority(left) - recordPriority(right)
    || (chapterNumbers.get(right.chapterId ?? '') ?? Infinity) - (chapterNumbers.get(left.chapterId ?? '') ?? Infinity));
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

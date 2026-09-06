import { cloneHarnessValue, defaultHarnessRuntime, stableHarnessId, type HarnessRuntime } from './ids';
import type {
  HarnessAuthorCorrection,
  HarnessCanonicalRecord,
  HarnessCanonicalStoryView,
  HarnessCorrectionKind,
  HarnessWorkspaceState,
} from './types';

const activeRecordsForStory = (state: HarnessWorkspaceState, storyId: string) => {
  const committedChapterIds = new Set(state.chapters.filter(chapter => chapter.storyId === storyId).map(chapter => chapter.id));
  return state.canonicalRecords.filter(record =>
    record.storyId === storyId
    && !record.supersededAt
    && (record.sourceCorrectionId || record.sourceFoundationRevisionId || (record.chapterId && committedChapterIds.has(record.chapterId))),
  );
};

const currentThreadRecords = (state: HarnessWorkspaceState, records: HarnessCanonicalRecord[]) => {
  const chapters = new Map(state.chapters.map(chapter => [chapter.id, chapter]));
  const corrections = new Map(state.corrections.map((correction, index) => [correction.id, index]));
  const position = (record: HarnessCanonicalRecord) => {
    const chapter = record.chapterId ? chapters.get(record.chapterId) : undefined;
    return [
      record.sourceCorrectionId ? 1 : 0,
      record.sourceCorrectionId ? corrections.get(record.sourceCorrectionId) ?? -1 : chapter?.chapterNumber ?? -1,
      chapter?.eventIds.indexOf(record.sourceEventId ?? '') ?? -1,
    ];
  };
  const latest = new Map<string, HarnessCanonicalRecord>();
  const entityIdsByLabel = new Map<string, Set<string>>();
  for (const record of records.filter(record => record.kind === 'plot-thread' && record.confidence === 'resolved')) {
    if (!record.entityId || !record.label?.trim()) continue;
    const label = record.label.trim().toLowerCase();
    const ids = entityIdsByLabel.get(label) ?? new Set<string>();
    ids.add(record.entityId);
    entityIdsByLabel.set(label, ids);
  }
  // Processing/recovery timestamps are not story order. Replaying an early chapter
  // must not reopen a thread that a later chapter resolved. Author corrections win.
  const ordered = records.filter(record => record.kind === 'plot-thread' && record.confidence === 'resolved'
    && (record.facts.state === 'open' || record.facts.state === 'resolved'))
    .sort((left, right) => {
      const a = position(left);
      const b = position(right);
      return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    });
  for (const record of ordered) {
    const label = record.label?.trim().toLowerCase();
    const matchingIds = label ? entityIdsByLabel.get(label) : undefined;
    // Older saves have no entityId. Bridge an exact label only when unambiguous.
    const entityId = record.entityId ?? (matchingIds?.size === 1 ? [...matchingIds][0] : undefined);
    const key = entityId ? `entity:${entityId}` : label ? `label:${label}` : `record:${record.id}`;
    latest.set(key, record);
  }
  return [...latest.values()];
};

export const buildCanonicalStoryView = (
  state: HarnessWorkspaceState,
  storyId: string,
): HarnessCanonicalStoryView => {
  const records = activeRecordsForStory(state, storyId);
  const receipts = state.capabilityReceipts.filter(receipt => receipt.storyId === storyId && receipt.status !== 'superseded');
  const unresolvedReferences = receipts.flatMap(receipt => receipt.unresolvedReferences);
  const byKind = (kind: HarnessCanonicalRecord['kind']) => records.filter(record => record.kind === kind);
  return {
    storyId,
    records,
    characters: byKind('character'),
    relationships: byKind('relationship'),
    locations: byKind('location-world'),
    factions: byKind('faction'),
    threads: byKind('plot-thread'),
    currentThreads: currentThreadRecords(state, records),
    mysteries: byKind('mystery'),
    timeline: byKind('timeline-event'),
    artifacts: byKind('artifact'),
    progression: byKind('progression'),
    narrativeEvents: byKind('narrative-event'),
    unresolvedReferences,
    conflicts: records.filter(record => record.confidence === 'conflicted'),
    corrections: state.corrections.filter(correction => correction.storyId === storyId),
  };
};

export interface AppendHarnessCorrectionInput {
  kind: HarnessCorrectionKind;
  reason: string;
  targetRecordIds?: string[];
  sourceEventId?: string;
  referenceLabel?: string;
  resolvedRecordId?: string;
  acceptedAlias?: string;
  replacement?: HarnessAuthorCorrection['replacement'];
}

export const appendHarnessCorrection = (
  state: HarnessWorkspaceState,
  storyId: string,
  input: AppendHarnessCorrectionInput,
  runtime: HarnessRuntime = defaultHarnessRuntime,
) => {
  const reason = input.reason.trim();
  if (!reason) throw new Error('Explain why this correction is canonical.');
  const targetRecordIds = Array.from(new Set(input.targetRecordIds ?? []));
  if (input.kind === 'resolve-entity' && (!input.referenceLabel?.trim() || !input.resolvedRecordId)) {
    throw new Error('Resolving an entity requires its ambiguous label and the chosen existing record.');
  }
  if (['correct-fact', 'mark-incorrect', 'supersede-interpretation'].includes(input.kind) && !targetRecordIds.length) {
    throw new Error('This correction must name at least one canonical record to supersede.');
  }
  if (['correct-fact', 'add-missing-fact', 'supersede-interpretation'].includes(input.kind) && !input.replacement) {
    throw new Error('This correction requires explicit replacement evidence.');
  }
  const now = runtime.now();
  const correction: HarnessAuthorCorrection = {
    id: runtime.createId('hcorr'),
    storyId,
    kind: input.kind,
    reason,
    createdAt: now,
    targetRecordIds,
    ...(input.sourceEventId ? { sourceEventId: input.sourceEventId } : {}),
    ...(input.referenceLabel?.trim() ? { referenceLabel: input.referenceLabel.trim() } : {}),
    ...(input.resolvedRecordId ? { resolvedRecordId: input.resolvedRecordId } : {}),
    ...(input.acceptedAlias?.trim() ? { acceptedAlias: input.acceptedAlias.trim() } : {}),
    ...(input.replacement ? { replacement: cloneHarnessValue(input.replacement) } : {}),
  };
  const candidate = cloneHarnessValue(state);
  candidate.corrections.push(correction);

  let replacementRecord: HarnessCanonicalRecord | undefined;
  if (input.replacement) {
    replacementRecord = {
      id: stableHarnessId('hcan', correction.id, 'author-correction'),
      storyId,
      sourceCorrectionId: correction.id,
      ...(input.sourceEventId ? { sourceEventId: input.sourceEventId } : {}),
      entityId: candidate.canonicalRecords.find(record => targetRecordIds.includes(record.id))?.entityId,
      capabilityId: 'author-correction',
      capabilityVersion: '1.0.0',
      kind: input.replacement.kind,
      evidence: input.replacement.evidence,
      confidence: 'resolved',
      ...(input.replacement.label ? { label: input.replacement.label } : {}),
      facts: cloneHarnessValue(input.replacement.facts),
      createdAt: now,
      warnings: [],
    };
    candidate.canonicalRecords.push(replacementRecord);
  }

  for (const record of candidate.canonicalRecords) {
    if (!targetRecordIds.includes(record.id) || record.supersededAt) continue;
    record.supersededAt = now;
    record.supersededByCorrectionId = correction.id;
    if (replacementRecord) record.supersededByRecordId = replacementRecord.id;
  }
  return { state: candidate, correction, replacementRecord };
};

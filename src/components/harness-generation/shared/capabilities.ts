import { stableHarnessId } from './ids';
import type {
  HarnessAuthorCorrection,
  HarnessCanonicalRecord,
  HarnessCapabilityId,
  HarnessCapabilityReceipt,
  HarnessEntityReference,
  HarnessProjectionRecord,
  HarnessSemanticEvent,
  HarnessUnresolvedReference,
  HarnessWorkspaceState,
} from './types';

export const HARNESS_PROJECTOR_VERSION = '1.0.0';

export interface HarnessCapabilityResult {
  records: HarnessCanonicalRecord[];
  projections: HarnessProjectionRecord[];
  receipt: HarnessCapabilityReceipt;
}

export interface HarnessCapabilityContext {
  state: HarnessWorkspaceState;
  event: HarnessSemanticEvent;
  now: string;
  /** Explicit caller-selected active entities; never inferred by fuzzy matching. */
  activeRecordIds?: string[];
}

export interface HarnessCapabilityHandler {
  id: HarnessCapabilityId;
  version: string;
  canHandle(event: HarnessSemanticEvent): boolean;
  process(context: HarnessCapabilityContext): Omit<HarnessCapabilityResult, 'receipt'> & {
    warnings?: string[];
    unresolvedReferences?: HarnessUnresolvedReference[];
  };
}

export type HarnessProjectionBuilder = (
  event: HarnessSemanticEvent,
  records: HarnessCanonicalRecord[],
  now: string,
) => HarnessProjectionRecord[];

const categoryTokens = (event: HarnessSemanticEvent) => (event.category ?? '')
  .toLocaleLowerCase()
  .split(/[,+/|]/)
  .map(value => value.trim().replace(/[ _]+/g, '-'))
  .filter(Boolean);

const hasCategory = (event: HarnessSemanticEvent, aliases: string[]) =>
  categoryTokens(event).some(token => aliases.includes(token));

const cleanSubjects = (event: HarnessSemanticEvent) => Array.from(new Set(
  (event.subjects ?? []).map(subject => subject.trim()).filter(Boolean),
));

const correctionAliases = (corrections: HarnessAuthorCorrection[]) => {
  const aliases = new Map<string, string>();
  for (const correction of corrections) {
    if (correction.acceptedAlias && correction.resolvedRecordId) {
      aliases.set(correction.acceptedAlias.toLocaleLowerCase(), correction.resolvedRecordId);
    }
    if (correction.kind === 'resolve-entity' && correction.referenceLabel && correction.resolvedRecordId) {
      aliases.set(correction.referenceLabel.toLocaleLowerCase(), correction.resolvedRecordId);
    }
  }
  return aliases;
};

export const resolveHarnessEntity = (
  label: string,
  state: HarnessWorkspaceState,
  storyId: string,
  additionalRecords: HarnessCanonicalRecord[] = [],
  activeRecordIds: string[] = [],
): HarnessEntityReference => {
  const characters = [...state.canonicalRecords, ...additionalRecords].filter(record =>
    record.storyId === storyId && record.kind === 'character' && !record.supersededAt,
  );
  const exact = characters.filter(record => record.label?.toLocaleLowerCase() === label.toLocaleLowerCase());
  if (exact.length === 1) return { label, resolution: 'exact', resolvedRecordId: exact[0].id };
  if (exact.length > 1) return { label, resolution: 'conflicted', candidateRecordIds: exact.map(record => record.id) };
  const aliasId = correctionAliases(state.corrections).get(label.toLocaleLowerCase());
  if (aliasId && characters.some(record => record.id === aliasId)) {
    return { label, resolution: 'alias', resolvedRecordId: aliasId };
  }
  const active = characters.filter(record => activeRecordIds.includes(record.id));
  if (active.length === 1) return { label, resolution: 'active-context', resolvedRecordId: active[0].id };
  return { label, resolution: 'unresolved' };
};

const canonicalRecord = (
  event: HarnessSemanticEvent,
  capabilityId: HarnessCapabilityId,
  capabilityVersion: string,
  index: number,
  kind: HarnessCanonicalRecord['kind'],
  now: string,
  options: {
    label?: string;
    references?: HarnessEntityReference[];
    facts?: HarnessCanonicalRecord['facts'];
    warnings?: string[];
  } = {},
): HarnessCanonicalRecord => {
  const unresolved = options.references?.some(reference => reference.resolution === 'unresolved') || Boolean(options.warnings?.length);
  const conflicted = options.references?.some(reference => reference.resolution === 'conflicted');
  return {
    id: stableHarnessId('hcan', event.id, capabilityId, capabilityVersion, kind, index),
    storyId: event.storyId,
    chapterId: event.chapterId,
    sourceEventId: event.id,
    capabilityId,
    capabilityVersion,
    kind,
    evidence: event.evidence ?? event.description,
    confidence: conflicted ? 'conflicted' : unresolved ? 'unresolved' : 'resolved',
    ...(options.label ? { label: options.label } : {}),
    ...(options.references?.length ? { references: options.references } : {}),
    facts: { description: event.description, ...options.facts },
    createdAt: now,
    warnings: options.warnings ?? [],
  };
};

const projection = (
  event: HarnessSemanticEvent,
  record: HarnessCanonicalRecord,
  kind: HarnessProjectionRecord['kind'],
  status: HarnessProjectionRecord['status'],
  explanation: string,
  now: string,
): HarnessProjectionRecord => ({
  id: stableHarnessId('hproj', event.id, record.id, kind, HARNESS_PROJECTOR_VERSION),
  storyId: event.storyId,
  chapterId: event.chapterId,
  sourceEventId: event.id,
  sourceCanonicalRecordIds: [record.id],
  kind,
  status,
  ...(record.label ? { label: record.label } : {}),
  description: event.description,
  explanation,
  createdAt: now,
  projectorVersion: HARNESS_PROJECTOR_VERSION,
  warnings: [],
});

export const buildHarnessProjectionIntents: HarnessProjectionBuilder = (
  event: HarnessSemanticEvent,
  records: HarnessCanonicalRecord[],
  now: string,
): HarnessProjectionRecord[] => {
  const result: HarnessProjectionRecord[] = [];
  for (const record of records) {
    result.push(projection(
      event,
      record,
      'narrative-notification',
      'ready',
      'Narrative Notification is the default internal intent for an explicitly preserved story change.',
      now,
    ));
    if (['character', 'location-world', 'faction', 'mystery', 'artifact'].includes(record.kind)) {
      result.push(projection(event, record, 'codex-candidate', record.confidence === 'resolved' ? 'ready' : 'unresolved',
        record.confidence === 'resolved'
          ? 'Explicit semantic evidence supports an internal Codex candidate.'
          : 'The evidence is preserved, but identity must be resolved before a Codex candidate can be finalized.', now));
    }
    if (record.kind === 'progression') {
      result.push(projection(event, record, 'mechanical-display', 'ready',
        'The event explicitly describes an ability or progression change; no quantities or rules were invented.', now));
    }
    if (record.kind === 'location-world' && (event.significance === 'major' || hasCategory(event, ['world-notice', 'world-change']))) {
      result.push(projection(event, record, 'world-notice', 'ready',
        'The event is explicitly world-level or marked as a major world change.', now));
    }
  }

  const requested = new Set((event.requestedEffects ?? []).map(value => value.toLocaleLowerCase().replace(/[ _]+/g, '-')));
  const source = records[0];
  if (source && (hasCategory(event, ['fate-outcome']) || requested.has('fate'))) {
    result.push(projection(event, source, 'fate', hasCategory(event, ['fate-outcome']) ? 'ready' : 'unresolved',
      hasCategory(event, ['fate-outcome'])
        ? 'The accepted event explicitly identifies a Fate outcome.'
        : 'Fate was requested, but no explicit accepted Fate outcome is available.', now));
  }
  if (source && (requested.has('badge') || requested.has('consequence'))) {
    result.push(projection(event, source, 'consequence-badge', 'unresolved',
      'No approved consequence or badge rule is configured; the request remains unresolved.', now));
  }
  if (source && requested.has('color-code')) {
    result.push(projection(event, source, 'color-code', 'unresolved',
      'No approved Harness Color Code mapping is configured; no color was invented.', now));
  }
  return result;
};

const makeHandler = (
  id: HarnessCapabilityId,
  aliases: string[],
  process: (context: HarnessCapabilityContext) => HarnessCanonicalRecord[],
): HarnessCapabilityHandler => ({
  id,
  version: '1.0.0',
  canHandle: event => hasCategory(event, aliases),
  process: context => {
    const records = process(context);
    const unresolvedReferences = records.flatMap(record => (record.references ?? [])
      .filter(reference => ['unresolved', 'conflicted'].includes(reference.resolution))
      .map(reference => ({
        label: reference.label,
        reason: reference.resolution === 'conflicted'
          ? 'More than one exact candidate exists; the harness did not choose.'
          : 'No exact name or accepted alias resolved this reference.',
        ...(reference.candidateRecordIds ? { candidateRecordIds: reference.candidateRecordIds } : {}),
      })));
    return { records, projections: [], unresolvedReferences };
  },
});

const subjectsAsRecords = (
  context: HarnessCapabilityContext,
  capabilityId: HarnessCapabilityId,
  kind: HarnessCanonicalRecord['kind'],
) => {
  const version = '1.0.0';
  const subjects = cleanSubjects(context.event);
  if (!subjects.length) {
    return [canonicalRecord(context.event, capabilityId, version, 0, kind, context.now, {
      warnings: ['The event had no explicit subject, so its identity remains unresolved.'],
    })];
  }
  return subjects.map((subject, index) => canonicalRecord(context.event, capabilityId, version, index, kind, context.now, { label: subject }));
};

export const defaultHarnessCapabilityHandlers: HarnessCapabilityHandler[] = [
  makeHandler('characters', ['character', 'characters', 'character-development'], context =>
    subjectsAsRecords(context, 'characters', 'character')),
  makeHandler('relationships', ['relationship', 'relationships'], context => {
    const subjects = cleanSubjects(context.event);
    const references = subjects.map(subject => resolveHarnessEntity(subject, context.state, context.event.storyId, [], context.activeRecordIds));
    return [canonicalRecord(context.event, 'relationships', '1.0.0', 0, 'relationship', context.now, {
      label: subjects.length >= 2 ? `${subjects[0]} ↔ ${subjects[1]}` : undefined,
      references,
      warnings: subjects.length < 2 ? ['A relationship requires at least two explicit subjects; the event remains unresolved.'] : [],
    })];
  }),
  makeHandler('locations-world', ['location', 'locations', 'world', 'world-change', 'world-notice'], context =>
    subjectsAsRecords(context, 'locations-world', 'location-world')),
  makeHandler('factions', ['faction', 'factions'], context => subjectsAsRecords(context, 'factions', 'faction')),
  makeHandler('plot-threads', ['plot', 'plot-thread', 'thread'], context =>
    subjectsAsRecords(context, 'plot-threads', 'plot-thread').map(record => ({
      ...record,
      facts: { ...record.facts, state: /\b(resolved|closed|concluded)\b/i.test(context.event.description) ? 'resolved' : 'open' },
    }))),
  makeHandler('mysteries', ['mystery', 'clue', 'revelation'], context =>
    subjectsAsRecords(context, 'mysteries', 'mystery').map(record => ({
      ...record,
      facts: {
        ...record.facts,
        knowledgeState: hasCategory(context.event, ['revelation']) ? 'revealed' : hasCategory(context.event, ['clue']) ? 'clue' : 'unknown',
      },
    }))),
  makeHandler('timeline', ['timeline', 'timeline-event'], context =>
    [canonicalRecord(context.event, 'timeline', '1.0.0', 0, 'timeline-event', context.now)]),
  makeHandler('artifacts', ['artifact', 'artifacts', 'relic', 'item'], context =>
    subjectsAsRecords(context, 'artifacts', 'artifact')),
  makeHandler('progression', ['ability', 'abilities', 'progression'], context => {
    const subjects = cleanSubjects(context.event);
    const references = subjects.map(subject => resolveHarnessEntity(subject, context.state, context.event.storyId, [], context.activeRecordIds));
    return [canonicalRecord(context.event, 'progression', '1.0.0', 0, 'progression', context.now, { references })];
  }),
];

const generalHandler = makeHandler('general-narrative-event', [], context =>
  [canonicalRecord(context.event, 'general-narrative-event', '1.0.0', 0, 'narrative-event', context.now)]);

export class HarnessCapabilityRegistry {
  constructor(
    private readonly handlers: HarnessCapabilityHandler[] = defaultHarnessCapabilityHandlers,
    private readonly projectionBuilder: HarnessProjectionBuilder = buildHarnessProjectionIntents,
  ) {}

  processEvent(context: HarnessCapabilityContext): HarnessCapabilityResult[] {
    let routed = this.handlers.filter(handler => handler.canHandle(context.event));
    // An explicit relationship supports both the named characters and their relationship.
    if (routed.some(handler => handler.id === 'relationships') && cleanSubjects(context.event).length >= 2) {
      const character = this.handlers.find(handler => handler.id === 'characters');
      if (character && !routed.includes(character)) routed = [character, ...routed];
    }
    if (!routed.length) routed = [generalHandler];

    const results: HarnessCapabilityResult[] = [];
    let workingState = context.state;
    for (const handler of routed) {
      const receiptId = stableHarnessId('hcr', context.event.id, handler.id, handler.version);
      const prior = context.state.capabilityReceipts.find(receipt => receipt.id === receiptId);
      try {
        const output = handler.process({ ...context, state: workingState });
        let projections = output.projections;
        const warnings = [...(output.warnings ?? [])];
        try {
          projections = [...projections, ...this.projectionBuilder(context.event, output.records, context.now)];
        } catch (error) {
          warnings.push(`Projection construction failed in isolation: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
        const unresolved = output.unresolvedReferences ?? [];
        const receipt: HarnessCapabilityReceipt = {
          id: receiptId,
          storyId: context.event.storyId,
          chapterId: context.event.chapterId,
          sourceEventId: context.event.id,
          capabilityId: handler.id,
          capabilityVersion: handler.version,
          status: unresolved.length ? 'unresolved' : 'succeeded',
          canonicalRecordIds: output.records.map(record => record.id),
          projectionIntentIds: projections.map(intent => intent.id),
          warnings,
          unresolvedReferences: unresolved,
          processedAt: context.now,
          replayCount: (prior?.replayCount ?? -1) + 1,
        };
        results.push({ records: output.records, projections, receipt });
        workingState = { ...workingState, canonicalRecords: [...workingState.canonicalRecords, ...output.records] };
      } catch (error) {
        results.push({
          records: [],
          projections: [],
          receipt: {
            id: receiptId,
            storyId: context.event.storyId,
            chapterId: context.event.chapterId,
            sourceEventId: context.event.id,
            capabilityId: handler.id,
            capabilityVersion: handler.version,
            status: 'failed',
            canonicalRecordIds: [],
            projectionIntentIds: [],
            warnings: ['The capability failed in isolation; the source event and chapter remain unchanged.'],
            unresolvedReferences: [],
            processedAt: context.now,
            replayCount: (prior?.replayCount ?? -1) + 1,
            failure: error instanceof Error ? error.message : 'Capability processing failed.',
          },
        });
      }
    }
    if (!results.some(result => result.receipt.status === 'succeeded')) {
      const fallback = generalHandler;
      if (!results.some(result => result.receipt.capabilityId === fallback.id)) {
        const output = fallback.process({ ...context, state: workingState });
        let projections = output.projections;
        const warnings = ['Specific interpretation was insufficient or failed; the original meaning remains available through the general narrative fallback.'];
        try {
          projections = [...projections, ...this.projectionBuilder(context.event, output.records, context.now)];
        } catch (error) {
          warnings.push(`Projection construction failed in isolation: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
        const prior = context.state.capabilityReceipts.find(receipt =>
          receipt.sourceEventId === context.event.id
          && receipt.capabilityId === fallback.id
          && receipt.capabilityVersion === fallback.version,
        );
        results.push({
          records: output.records,
          projections,
          receipt: {
            id: stableHarnessId('hcr', context.event.id, fallback.id, fallback.version),
            storyId: context.event.storyId,
            chapterId: context.event.chapterId,
            sourceEventId: context.event.id,
            capabilityId: fallback.id,
            capabilityVersion: fallback.version,
            status: 'succeeded',
            canonicalRecordIds: output.records.map(record => record.id),
            projectionIntentIds: projections.map(intent => intent.id),
            warnings,
            unresolvedReferences: [],
            processedAt: context.now,
            replayCount: (prior?.replayCount ?? -1) + 1,
          },
        });
      }
    }
    return results;
  }
}

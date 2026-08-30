import { chapterTitleFallback, defaultHarnessRuntime, type HarnessRuntime } from './ids';
import type {
  HarnessAcceptedChapterDraft,
  HarnessModelPlan,
  HarnessRejectedEventDiagnostic,
  HarnessSemanticEvent,
  HarnessWarning,
} from './types';

type ParsedResponse = {
  accepted: true;
  draft: HarnessAcceptedChapterDraft;
  rawEvents: unknown[];
  warnings: HarnessWarning[];
} | {
  accepted: false;
  reason: string;
  warnings: HarnessWarning[];
};

export interface SemanticEventPreservationInput {
  storyId: string;
  attemptId: string;
  chapterNumber: number;
  createdAt: string;
}

export interface SemanticEventPreservationResult {
  events: HarnessSemanticEvent[];
  rejected: HarnessRejectedEventDiagnostic[];
  warnings: HarnessWarning[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const stringList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const values = value.map(nonEmptyString).filter((entry): entry is string => Boolean(entry));
  return values.length ? values : undefined;
};

const jsonCandidate = (raw: string): string[] => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();
  return [trimmed, fenced].filter((candidate): candidate is string => Boolean(candidate));
};

const parseJsonObject = (raw: string): Record<string, unknown> | undefined => {
  for (const candidate of jsonCandidate(raw)) {
    try {
      const parsed = JSON.parse(candidate);
      if (isRecord(parsed)) return parsed;
    } catch {
      // A plain-prose recovery is deliberately evaluated below.
    }
  }
  return undefined;
};

const looksLikeRefusal = (value: string) =>
  /^(?:i(?:'m| am)?\s+(?:sorry[,;:]?\s*)?(?:unable|not able)|i cannot|i can't|this request|content policy|safety policy)/i
    .test(value.trim());

const looseJsonString = (value: string): string => {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
};

const recoverPlainProse = (raw: string): string | undefined => {
  const trimmed = raw.trim();
  const embeddedProse = trimmed.match(/"prose"\s*:\s*"((?:\\.|[^"\\])*)/s)?.[1];
  const candidate = embeddedProse === undefined
    ? trimmed.replace(/^```(?:text|markdown)?\s*/i, '').replace(/\s*```$/, '').trim()
    : looseJsonString(embeddedProse).trim();
  if (!candidate || looksLikeRefusal(candidate)) return undefined;
  // An invalid JSON envelope without a recoverable prose field is not prose.
  if ((candidate.startsWith('{') || candidate.startsWith('[')) && embeddedProse === undefined) return undefined;
  return /[\p{L}\p{N}]/u.test(candidate) ? candidate : undefined;
};

const appendIgnoredIdentityWarning = (
  source: Record<string, unknown>,
  warnings: HarnessWarning[],
) => {
  const ignored = [
    'id', 'storyId', 'runId', 'attemptId', 'chapterId', 'blockId', 'eventId',
    'chapterNumber', 'chapterIndex', 'continuation', 'provider', 'model',
  ].filter(key => source[key] !== undefined);
  if (ignored.length) {
    warnings.push({
      code: 'ignored_model_identity',
      message: `The harness ignored model-supplied ${ignored.join(', ')}; identity and ordering are application-owned.`,
    });
  }
};

const parsePlan = (value: unknown, warnings: HarnessWarning[]): HarnessModelPlan | undefined => {
  const prosePlan = nonEmptyString(value);
  if (prosePlan) return prosePlan;
  if (isRecord(value)) {
    const intent = nonEmptyString(value.intent);
    const beats = stringList(value.beats);
    if (intent || beats) return { ...(intent ? { intent } : {}), ...(beats ? { beats } : {}) };
  }
  if (value !== undefined && value !== null) {
    warnings.push({
      code: 'invalid_plan_omitted',
      message: 'The optional creative plan could not be read and was omitted.',
    });
  }
  return undefined;
};

const parseRawEvents = (value: unknown, warnings: HarnessWarning[]): unknown[] => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value;
  const description = nonEmptyString(value);
  if (description) return [description];
  warnings.push({
    code: 'invalid_events_omitted',
    message: 'The optional event collection was not an event list and was omitted.',
  });
  return [];
};

export const acceptHarnessModelResponse = (raw: string, chapterNumber: number): ParsedResponse => {
  const warnings: HarnessWarning[] = [];
  const parsed = parseJsonObject(raw);
  if (parsed) {
    appendIgnoredIdentityWarning(parsed, warnings);
    const prose = nonEmptyString(parsed.prose);
    if (!prose || looksLikeRefusal(prose)) {
      return {
        accepted: false,
        reason: 'The provider response did not contain usable chapter prose.',
        warnings,
      };
    }
    const title = nonEmptyString(parsed.title);
    if (!title) {
      warnings.push({
        code: 'missing_title',
        message: `The provider omitted a chapter title; the harness assigned ${chapterTitleFallback(chapterNumber)}.`,
      });
    }
    const plan = parsePlan(parsed.plan, warnings);
    return {
      accepted: true,
      draft: {
        prose,
        title: title ?? chapterTitleFallback(chapterNumber),
        titleSource: title ? 'model' : 'harness-fallback',
        ...(plan ? { plan } : {}),
        responseMode: 'json',
      },
      rawEvents: parseRawEvents(parsed.events, warnings),
      warnings,
    };
  }

  const prose = recoverPlainProse(raw);
  if (!prose) {
    return {
      accepted: false,
      reason: 'The provider response could not be recovered as usable chapter prose.',
      warnings,
    };
  }
  warnings.push(
    {
      code: 'plain_prose_recovery',
      message: 'The response was not valid JSON, so the harness preserved its readable prose and omitted optional structure.',
    },
    {
      code: 'missing_title',
      message: `The provider response had no usable title; the harness assigned ${chapterTitleFallback(chapterNumber)}.`,
    },
  );
  return {
    accepted: true,
    draft: {
      prose,
      title: chapterTitleFallback(chapterNumber),
      titleSource: 'harness-fallback',
      responseMode: 'plain-prose-recovery',
    },
    rawEvents: [],
    warnings,
  };
};

const rawKind = (value: unknown): HarnessRejectedEventDiagnostic['rawKind'] => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'boolean': return 'boolean';
    case 'number': return 'number';
    case 'object': return 'object';
    case 'string': return 'string';
    default: return 'unknown';
  }
};

const eventFieldWarning = (field: string): HarnessWarning => ({
  code: 'optional_event_field_omitted',
  message: `An optional event ${field} value was malformed and was omitted without affecting the chapter.`,
});

/** Preserve any meaningful description in the lossless general source lane.
 * Deterministic capabilities consume these records only after chapter commit. */
export const preserveSemanticEvents = (
  rawEvents: unknown[],
  input: SemanticEventPreservationInput,
  runtime: HarnessRuntime = defaultHarnessRuntime,
): SemanticEventPreservationResult => {
  const events: HarnessSemanticEvent[] = [];
  const rejected: HarnessRejectedEventDiagnostic[] = [];
  const warnings: HarnessWarning[] = [];

  rawEvents.forEach((raw, index) => {
    const stringDescription = nonEmptyString(raw);
    const source = isRecord(raw) ? raw : undefined;
    const description = stringDescription ?? nonEmptyString(source?.description);
    if (!description) {
      rejected.push({
        index,
        rawKind: rawKind(raw),
        reason: 'An event needs a nonempty description before it can be preserved.',
      });
      warnings.push({
        code: 'optional_event_rejected',
        message: `Optional event ${index + 1} had no usable description and was not preserved.`,
      });
      return;
    }

    const category = nonEmptyString(source?.category);
    const subjects = stringList(source?.subjects);
    const significance = source?.significance === 'minor' || source?.significance === 'major'
      ? source.significance
      : undefined;
    const evidence = nonEmptyString(source?.evidence);
    const requestedEffects = stringList(source?.requestedEffects);
    if (source) {
      if (source.category !== undefined && !category) warnings.push(eventFieldWarning('category'));
      if (source.subjects !== undefined && !subjects) warnings.push(eventFieldWarning('subjects'));
      if (source.significance !== undefined && !significance) warnings.push(eventFieldWarning('significance'));
      if (source.evidence !== undefined && !evidence) warnings.push(eventFieldWarning('evidence'));
      if (source.requestedEffects !== undefined && !requestedEffects) warnings.push(eventFieldWarning('requested effects'));
    }

    events.push({
      id: runtime.createId('hev'),
      storyId: input.storyId,
      attemptId: input.attemptId,
      chapterNumber: input.chapterNumber,
      createdAt: input.createdAt,
      description,
      ...(category ? { category } : {}),
      ...(subjects ? { subjects } : {}),
      ...(significance ? { significance } : {}),
      ...(evidence ? { evidence } : {}),
      ...(requestedEffects ? { requestedEffects } : {}),
      capability: 'general-narrative-event',
    });
  });

  return { events, rejected, warnings };
};

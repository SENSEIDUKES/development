import { chapterTitleFallback, defaultHarnessRuntime, stableHarnessId, type HarnessRuntime } from './ids';
import { acceptChapterMedia } from '../../../narrative/acceptedChapterMedia';
import type { MediaCatalog } from '../../../audio/media';
import { isCompleteSystemEvent, normalizeManifestResponse } from '../../../narrative/manifestNormalizer';
import {
  applyHarnessChapterSignals,
  readHarnessChapterSignals,
  type HarnessCastMember,
} from './chapterSignals';
import {
  harnessChapterBody,
  harnessChapterBodyWarnings,
  normalizeHarnessParagraphs,
  splitHarnessProseParagraphs,
  type HarnessChapterBody,
} from './chapterBody';
import { HARNESS_MEMORY_CATEGORIES } from '../../../narrative/generation';
import type { HarnessAcceptedChapterDraft, HarnessModelPlan, HarnessRejectedEventDiagnostic, HarnessSemanticEvent, HarnessWarning, HarnessEventDetails, HarnessCanonicalKind } from '../../../narrative/generation';

type ParsedResponse = {
  accepted: true;
  draft: HarnessAcceptedChapterDraft;
  /** Chapter memory comes from the separate extraction call; the chapter reply carries none. */
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
  prose?: string;
  /** A separate saved extraction must never reuse writer event IDs. */
  eventNamespace?: string;
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

/**
 * Reads a memory extraction reply. A readable extraction that reports no
 * developments is a legitimate result — a chapter can establish no new memory —
 * so it returns an empty list. Only a reply carrying no extraction at all
 * (neither the grouped memory object nor an event list) is unreadable.
 */
export const readHarnessMemoryEvents = (raw: string): unknown[] => {
  const parsed = parseJsonObject(raw);
  const extraction = parsed ? memoryExtraction(parsed) : undefined;
  if (!extraction) {
    throw new Error('Memory recovery returned no event list. Saved prose is unchanged.');
  }
  return extraction;
};

const memoryExtraction = (parsed: Record<string, unknown>): unknown[] | undefined => {
  if (!isRecord(parsed.memory)) return Array.isArray(parsed.events) ? parsed.events : undefined;
  const result: unknown[] = [];
  for (const [bucket, category] of Object.entries(HARNESS_MEMORY_CATEGORIES)) {
    const entries = parsed.memory[bucket];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) { result.push(entries); continue; }
    for (const entry of entries) result.push(isRecord(entry) ? { ...entry, category } : entry);
  }
  return result;
};

export interface HarnessResponseAcceptanceOptions {
  /** The equipped Media Loadout catalog used to resolve soundscapes and Sound Cues. */
  mediaCatalog?: MediaCatalog;
  /** Foundation cast; HARNESS assigns dialogue speaker roles from it. */
  cast?: readonly HarnessCastMember[];
}

/**
 * Reads the authoritative chapter body. `paragraphs` is the model-authored
 * body and the only field the response schema requests. A reply that carries
 * readable prose without it is still recovered rather than lost.
 */
const acceptedChapterBody = (
  parsed: Record<string, unknown>,
  warnings: HarnessWarning[],
): HarnessChapterBody | undefined => {
  const paragraphs = normalizeHarnessParagraphs(parsed.paragraphs);
  if (paragraphs) {
    if (parsed.prose !== undefined) {
      warnings.push({
        code: 'competing_prose_ignored',
        message: 'The harness ignored a prose field because the paragraphs array is the authoritative chapter body.',
      });
    }
    return harnessChapterBody(paragraphs);
  }
  const prose = nonEmptyString(parsed.prose);
  if (!prose) return undefined;
  warnings.push({
    code: 'chapter_body_recovered',
    message: 'The provider returned chapter prose without the requested paragraphs array; the harness recovered its paragraphs from the blank lines in that prose.',
  });
  return harnessChapterBody(splitHarnessProseParagraphs(prose));
};

/**
 * The accepted paragraphs are the chapter. The HARNESS builds canonical SEN
 * blocks from them, matches every accepted signal to its exact prose anchor,
 * builds the detailed SEN structures, and resolves media through the equipped
 * Media Loadout. Any failure here removes optional structure, never readable
 * prose.
 */
const acceptedProseChapter = (
  parsed: Record<string, unknown>,
  paragraphs: readonly string[],
  chapterNumber: number,
  warnings: HarnessWarning[],
  options: HarnessResponseAcceptanceOptions,
): Pick<HarnessAcceptedChapterDraft, 'blocks' | 'audioMoments' | 'soundscapes'> | undefined => {
  const signals = readHarnessChapterSignals(parsed);
  warnings.push(...signals.warnings);
  try {
    const applied = applyHarnessChapterSignals(paragraphs, signals.signals, options.cast ?? []);
    warnings.push(...applied.warnings);
    const normalized = normalizeManifestResponse(JSON.stringify({ blocks: applied.blocks }), chapterNumber);
    const blocks = normalized.blocks.map(block => {
      if (!block.system || isCompleteSystemEvent(block.system)) return block;
      warnings.push({
        code: 'optional_chapter_structure_omitted',
        message: 'Removed an incomplete System Panel while retaining its readable block text.',
      });
      const { system: _system, ...proseBlock } = block;
      return proseBlock;
    });
    const media = acceptChapterMedia(blocks, options.mediaCatalog);
    for (const warning of normalized.diagnostics.warnings) {
      // Chapter scale is a HARNESS measurement against the HARNESS target and
      // is reported once as `chapter_scale_below_target`; the SEN normalizer's
      // own floor would only repeat it against a different number.
      if (warning.code === 'under-minimum-word-count') continue;
      warnings.push({
        code: warning.code === 'optional-field-removed'
          ? 'optional_chapter_structure_omitted'
          : 'chapter_block_normalized',
        message: warning.message,
      });
    }
    for (const issue of media.issues) {
      warnings.push({
        code: 'optional_chapter_structure_omitted',
        message: `Removed an unresolved optional Sound Cue: ${issue.message}`,
      });
    }
    return {
      blocks: media.blocks,
      ...(media.audioMoments.length > 0 ? { audioMoments: media.audioMoments } : {}),
      ...(media.soundscapes.length > 0 ? { soundscapes: media.soundscapes } : {}),
    };
  } catch (error) {
    warnings.push({
      code: 'optional_chapter_structure_omitted',
      message: `The chapter signals could not be applied; the readable prose is kept without optional structure (${error instanceof Error ? error.message : 'invalid signals'}).`,
    });
    return undefined;
  }
};

export const verifyHarnessEventEvidence = (event: HarnessSemanticEvent, prose: string): HarnessSemanticEvent => {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  const quote = event.evidence ? normalize(event.evidence) : '';
  // Literal quantities, deadlines and ranks must be present in the cited passage.
  // Other semantic descriptions remain model interpretations with inspectable evidence.
  const factsSupported = Object.entries(event.facts ?? {}).every(([key, value]) =>
    (!/^(?:deadline|timeLimit|energy(?:Reserves)?|rank|level|amount|count|quantity|duration|age|version)$/i.test(key)
      && !/\d|\b(?:tier|hours?|days?|weeks?)\b/i.test(value))
    || quote.toLowerCase().includes(normalize(value).toLowerCase()));
  return { ...event, evidenceVerified: Boolean(quote && normalize(prose).includes(quote) && factsSupported) };
};

export const acceptHarnessModelResponse = (
  raw: string,
  chapterNumber: number,
  options: HarnessResponseAcceptanceOptions = {},
): ParsedResponse => {
  const warnings: HarnessWarning[] = [];
  const parsed = parseJsonObject(raw);
  if (parsed) {
    appendIgnoredIdentityWarning(parsed, warnings);
    // The model paragraphs are the authoritative chapter. The HARNESS keeps
    // every paragraph's text exactly as written, derives the readable prose
    // from them, and builds one ordered SEN block per paragraph.
    const body = acceptedChapterBody(parsed, warnings);
    if (!body || looksLikeRefusal(body.prose)) {
      return {
        accepted: false,
        reason: 'The provider response did not contain a usable chapter body.',
        warnings,
      };
    }
    if (parsed.blocks !== undefined) {
      warnings.push({
        code: 'competing_prose_ignored',
        message: 'The harness ignored a blocks field because the paragraphs array is the authoritative chapter body.',
      });
    }
    warnings.push(...harnessChapterBodyWarnings(body.metrics));
    const structured = acceptedProseChapter(parsed, body.paragraphs, chapterNumber, warnings, options);
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
        paragraphs: body.paragraphs,
        prose: body.prose,
        metrics: body.metrics,
        ...(structured?.blocks ? { blocks: structured.blocks } : {}),
        ...(structured?.audioMoments ? { audioMoments: structured.audioMoments } : {}),
        ...(structured?.soundscapes ? { soundscapes: structured.soundscapes } : {}),
        title: title ?? chapterTitleFallback(chapterNumber),
        titleSource: title ? 'model' : 'harness-fallback',
        ...(plan ? { plan } : {}),
        responseMode: 'json',
      },
      rawEvents: [],
      warnings,
    };
  }

  const recovered = recoverPlainProse(raw);
  if (!recovered) {
    return {
      accepted: false,
      reason: 'The provider response could not be recovered as usable chapter prose.',
      warnings,
    };
  }
  const body = harnessChapterBody(splitHarnessProseParagraphs(recovered));
  warnings.push(
    {
      code: 'plain_prose_recovery',
      message: 'The response was not valid JSON, so the harness preserved its readable prose and omitted optional structure.',
    },
    {
      code: 'missing_title',
      message: `The provider response had no usable title; the harness assigned ${chapterTitleFallback(chapterNumber)}.`,
    },
    ...harnessChapterBodyWarnings(body.metrics),
  );
  return {
    accepted: true,
    draft: {
      paragraphs: body.paragraphs,
      prose: body.prose,
      metrics: body.metrics,
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

const smallNumberWords = (value: string): string | undefined => {
  if (!/^(?:0|[1-9]\d?)$/.test(value)) return undefined;
  const number = Number(value);
  const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  if (number < 20) return small[number];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  return `${tens[Math.floor(number / 10)]}${number % 10 ? `[- ]${small[number % 10]}` : ''}`;
};

const parseDetails = (value: unknown, warnings: HarnessWarning[]): HarnessEventDetails | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) { warnings.push(eventFieldWarning('details')); return undefined; }
  const details: HarnessEventDetails = {};
  const character = value.character;
  if (isRecord(character) && nonEmptyString(character.name)) {
    details.character = {
      name: nonEmptyString(character.name)!,
      ...(nonEmptyString(character.role) ? { role: nonEmptyString(character.role) } : {}),
      ...(nonEmptyString(character.relationshipToMC) ? { relationshipToMC: nonEmptyString(character.relationshipToMC) } : {}),
      ...(typeof character.isMainCharacter === 'boolean' ? { isMainCharacter: character.isMainCharacter } : {}),
    };
  } else if (character !== undefined) warnings.push(eventFieldWarning('character'));
  const speech = value.speech;
  if (isRecord(speech) && nonEmptyString(speech.speaker) && nonEmptyString(speech.quote)) {
    details.speech = { speaker: nonEmptyString(speech.speaker)!, quote: nonEmptyString(speech.quote)! };
  } else if (speech !== undefined) warnings.push(eventFieldWarning('speech'));
  const mechanics = value.mechanics;
  const exactValue = isRecord(mechanics) && (typeof mechanics.value === 'string'
    ? nonEmptyString(mechanics.value)
    : typeof mechanics.value === 'number' && Number.isFinite(mechanics.value) ? String(mechanics.value) : undefined);
  if (isRecord(mechanics) && nonEmptyString(mechanics.subject) && nonEmptyString(mechanics.name) && exactValue) {
    details.mechanics = {
      subject: nonEmptyString(mechanics.subject)!, name: nonEmptyString(mechanics.name)!, value: exactValue,
      ...(nonEmptyString(mechanics.unit) ? { unit: nonEmptyString(mechanics.unit) } : {}),
    };
  } else if (mechanics !== undefined) warnings.push(eventFieldWarning('mechanics'));
  return Object.keys(details).length ? details : undefined;
};

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
    // Tolerate the provider placing semantic details at the event root. The
    // original raw checkpoint remains unchanged and replay can recover these.
    const details = parseDetails(source?.details ?? (source && ['character', 'speech', 'mechanics'].some(key => source[key] !== undefined) ? source : undefined), warnings);
    const fallbackDescription = details?.character ? `${details.character.name}: ${details.character.role ?? 'character'}${details.character.relationshipToMC ? `; relationship to main character: ${details.character.relationshipToMC}` : ''}.`
      : details?.mechanics ? `${details.mechanics.subject}: ${details.mechanics.name} = ${details.mechanics.value}${details.mechanics.unit ? ` ${details.mechanics.unit}` : ''}.`
      : details?.speech ? `${details.speech.speaker} says: ${details.speech.quote}` : undefined;
    const description = stringDescription ?? nonEmptyString(source?.description) ?? fallbackDescription;
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
    const typedSubjects = Array.isArray(source?.subjects) ? source.subjects.filter(isRecord)
      .filter(subject => nonEmptyString(subject.name) && ['character', 'location-world', 'faction', 'artifact', 'plot-thread', 'mystery', 'timeline-event'].includes(String(subject.kind))) : [];
    const subjects = typedSubjects.length ? typedSubjects.map(subject => String(subject.name).trim()) : stringList(source?.subjects);
    const subjectKinds = typedSubjects.length ? Object.fromEntries(typedSubjects.map(subject => [String(subject.name).trim(), subject.kind as HarnessCanonicalKind])) : undefined;
    const significance = source?.significance === 'minor' || source?.significance === 'major'
      ? source.significance
      : undefined;
    const evidence = nonEmptyString(source?.evidence);
    const requestedEffects = stringList(source?.requestedEffects);
    if (details && input.prose !== undefined) {
      const prose = input.prose;
      if (details.character && !prose.includes(details.character.name)) {
        delete details.character; warnings.push(eventFieldWarning('character absent from prose'));
      }
      if (details.speech && (!prose.includes(details.speech.quote) || !prose.includes(details.speech.speaker))) {
        delete details.speech; warnings.push(eventFieldWarning('speech absent from prose'));
      }
      if (details.mechanics) {
        const escapedValue = details.mechanics.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const words = smallNumberWords(details.mechanics.value);
        const numberInProse = new RegExp(`(?<![\\p{L}\\p{N}.])${escapedValue}(?![\\p{L}\\p{N}]|\\.\\d)`, 'u').test(prose)
          || Boolean(words && new RegExp(`\\b${words}\\b`, 'i').test(prose));
        if (!prose.includes(details.mechanics.subject) || !numberInProse) {
          delete details.mechanics; warnings.push(eventFieldWarning('mechanical value absent from prose'));
        }
      }
    }
    const facts = isRecord(source?.facts) ? Object.fromEntries(Object.entries(source.facts)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim()))) : undefined;
    if (source) {
      if (source.category !== undefined && !category) warnings.push(eventFieldWarning('category'));
      if (source.subjects !== undefined && (!subjects || (Array.isArray(source.subjects) && subjects.length !== source.subjects.length))) warnings.push(eventFieldWarning('subjects'));
      if (source.significance !== undefined && !significance) warnings.push(eventFieldWarning('significance'));
      if (source.evidence !== undefined && !evidence) warnings.push(eventFieldWarning('evidence'));
      if (source.requestedEffects !== undefined && !requestedEffects) warnings.push(eventFieldWarning('requested effects'));
      if (source.facts !== undefined && (!facts || (isRecord(source.facts) && Object.keys(facts).length !== Object.keys(source.facts).length))) warnings.push(eventFieldWarning('facts'));
    }

    events.push({
      id: stableHarnessId('hev', input.storyId, input.eventNamespace ?? input.attemptId, index),
      storyId: input.storyId,
      attemptId: input.attemptId,
      chapterNumber: input.chapterNumber,
      createdAt: input.createdAt,
      description,
      ...(category ? { category } : {}),
      ...(subjects ? { subjects } : {}),
      ...(subjectKinds ? { subjectKinds } : {}),
      ...(significance ? { significance } : {}),
      ...(evidence ? { evidence } : {}),
      ...(requestedEffects ? { requestedEffects } : {}),
      ...(details && Object.keys(details).length ? { details } : {}),
      ...(facts ? { facts } : {}),
      capability: 'general-narrative-event',
    });
  });

  return { events, rejected, warnings };
};

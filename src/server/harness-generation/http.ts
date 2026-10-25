import { CHAPTER_REWRITE_NOTE_LIMIT, HARNESS_MAX_CHAPTER_PARAGRAPHS, HOLDINGS_FIXER_CASE_LIMIT, LOOK_DECLARED_CHARACTERS, LOOK_PASSAGE_CHARACTERS, LOOK_SUBJECT_LIMIT, type HarnessArcRequest, type HarnessGenerationRequest, type HarnessGenerationResponse, type HarnessHoldingsFixRequest, type HarnessLookRequest, type HarnessTagRequest } from '@seihouse/sen/harness-generation';
import { validateSoundWords } from '@seihouse/sen/audio';
import {
  harnessGenerationServerInfo,
  resolveHarnessGenerationConfig,
  type HarnessGenerationEnvironment,
} from './config';
import { isMissingKeyMessage } from '../model-router/catalog';
import {
  executeHarnessGeneration,
  HarnessGenerationExecutionError,
  type HarnessProviderFactory,
} from './execute';
import { executeHoldingsFix } from './holdingsFixer';
import { executeLookDescription } from './lookDescriber';
import { TAG_NAME_CHARACTERS, TAG_PARAGRAPH_CHARACTERS, TAG_PARAGRAPH_LIMIT, TAG_SUBJECT_LIMIT, executeHarnessTagging } from './tagger';

export interface HarnessGenerationHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface HarnessGenerationHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface HarnessGenerationHttpDependencies {
  environment: HarnessGenerationEnvironment;
  providerFactory?: HarnessProviderFactory;
  onError?: (error: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const requestError = (message: string): HarnessGenerationHttpResponse => ({
  status: 400,
  body: { error: message },
  headers: { 'Cache-Control': 'no-store' },
});

const requireFoundation = (foundation: unknown) => {
  if (!isRecord(foundation) || !isRecord(foundation.input)) {
    throw new Error('Harness Generation needs a frozen Story Foundation revision.');
  }
  if (typeof foundation.input.premise !== 'string' || !foundation.input.premise.trim()) {
    throw new Error('A Story Foundation premise is required.');
  }
};

/** The compact packet must carry its Current Story Information section with a premise. */
const requirePacket = (packet: unknown) => {
  if (!isRecord(packet) || !isRecord(packet.currentStory) || !isRecord(packet.canonicalState) || !Array.isArray(packet.previouslyOn)
    || !isRecord(packet.storyDirection) || !Number.isInteger(packet.chapterNumber) || Number(packet.chapterNumber) < 1) {
    throw new Error('Harness Generation needs a compact Story Information Packet.');
  }
  if (typeof packet.currentStory.premise !== 'string' || !packet.currentStory.premise.trim()) {
    throw new Error('A Story Foundation premise is required.');
  }
};

/** The longest text one fixer case may carry anywhere: a sentence, a problem, a record line. */
const FIX_CASE_TEXT_LIMIT = 2_000;
const FIX_ANSWERS = new Set(['record', 'prose', 'fine', 'major']);

/** A Holdings fixer request: a few small cases, each within its limits. */
const parseHoldingsFix = (parsed: Record<string, unknown>): HarnessHoldingsFixRequest => {
  const shortText = (value: unknown) => typeof value === 'string' && value.length <= FIX_CASE_TEXT_LIMIT;
  const texts = (value: unknown, required = false) => value === undefined ? !required
    : Array.isArray(value) && value.length <= 12 && value.every(shortText) && (!required || value.length > 0);
  const cases = parsed.cases;
  const valid = [parsed.storyId, parsed.chapterId, parsed.model, parsed.language].every(value => typeof value === 'string' && value.trim())
    && Number.isInteger(parsed.chapterNumber) && Number(parsed.chapterNumber) >= 1
    && (parsed.mainCharacter === undefined || shortText(parsed.mainCharacter))
    && (parsed.direction === undefined || (typeof parsed.direction === 'string' && parsed.direction.length <= CHAPTER_REWRITE_NOTE_LIMIT))
    && Array.isArray(cases) && cases.length >= 1 && cases.length <= HOLDINGS_FIXER_CASE_LIMIT
    && cases.every(entry => isRecord(entry) && typeof entry.id === 'string' && texts(entry.problems, true)
      && Array.isArray(entry.answers) && entry.answers.length > 0 && entry.answers.every(answer => FIX_ANSWERS.has(answer as string))
      && (entry.passage === undefined || (isRecord(entry.passage) && shortText(entry.passage.sentence)
        && (entry.passage.before === undefined || shortText(entry.passage.before)) && (entry.passage.after === undefined || shortText(entry.passage.after))))
      && (entry.tags === undefined || shortText(entry.tags)) && texts(entry.record)
      && (entry.mentions === undefined || (Array.isArray(entry.mentions) && entry.mentions.length <= 3
        && entry.mentions.every(mention => isRecord(mention) && typeof mention.id === 'string' && shortText(mention.sentence)))));
  if (!valid) throw new Error(`A Holdings fixer request needs its chapter, model and language, and 1 to ${HOLDINGS_FIXER_CASE_LIMIT} small cases.`);
  return parsed as unknown as HarnessHoldingsFixRequest;
};

/** The longest name, change of look or earlier look one look subject may carry. */
const LOOK_TEXT_LIMIT = 400;
const LOOK_ENTITIES = new Set(['character', 'thing']);
const LOOK_EVENTS = new Set(['appears', 'look']);

/** A look step request: a few subjects, each a passage within its limits. */
const parseLookRequest = (parsed: Record<string, unknown>): HarnessLookRequest => {
  const within = (value: unknown, limit: number) => typeof value === 'string' && value.length <= limit;
  const optional = (value: unknown, limit: number) => value === undefined || within(value, limit);
  const subjects = parsed.subjects;
  const valid = [parsed.storyId, parsed.chapterId, parsed.model, parsed.language].every(value => typeof value === 'string' && value.trim())
    && Number.isInteger(parsed.chapterNumber) && Number(parsed.chapterNumber) >= 1
    && Array.isArray(subjects) && subjects.length >= 1 && subjects.length <= LOOK_SUBJECT_LIMIT
    && subjects.every(entry => isRecord(entry) && typeof entry.id === 'string' && within(entry.name, LOOK_TEXT_LIMIT) && Boolean((entry.name as string).trim())
      && LOOK_ENTITIES.has(entry.entity as string) && LOOK_EVENTS.has(entry.event as string)
      && optional(entry.change, LOOK_TEXT_LIMIT)
      // A passage cut to its limit ends with an ellipsis.
      && within(entry.passage, LOOK_PASSAGE_CHARACTERS + 1) && Boolean((entry.passage as string).trim())
      && optional(entry.declared, LOOK_DECLARED_CHARACTERS + 1)
      && (entry.previous === undefined || (isRecord(entry.previous) && within(entry.previous.summary, LOOK_TEXT_LIMIT) && isRecord(entry.previous.traits)
        && Object.values(entry.previous.traits).every(value => within(value, LOOK_TEXT_LIMIT)))));
  if (!valid) throw new Error(`A look request needs its chapter, model and language, and 1 to ${LOOK_SUBJECT_LIMIT} subjects, each with its passage.`);
  return parsed as unknown as HarnessLookRequest;
};

/**
 * A tagging request: the chapter's own paragraphs and the names the tagger may
 * use. Nothing here describes how the story got here, so there is nothing of
 * the packet to validate.
 */
const TAG_SUBJECT_KINDS = new Set(['character', 'thing', 'ability']);

const parseTagRequest = (parsed: Record<string, unknown>): HarnessTagRequest => {
  const within = (value: unknown, limit: number) => typeof value === 'string' && value.length <= limit;
  const paragraphs = parsed.paragraphs;
  const subjects = parsed.subjects;
  const valid = [parsed.storyId, parsed.chapterId, parsed.model, parsed.language].every(value => typeof value === 'string' && value.trim())
    && Number.isInteger(parsed.chapterNumber) && Number(parsed.chapterNumber) >= 1
    && Array.isArray(paragraphs) && paragraphs.length >= 1 && paragraphs.length <= TAG_PARAGRAPH_LIMIT
    && paragraphs.every(paragraph => within(paragraph, TAG_PARAGRAPH_CHARACTERS))
    && Array.isArray(subjects) && subjects.length <= TAG_SUBJECT_LIMIT
    && subjects.every(subject => isRecord(subject) && within(subject.name, TAG_NAME_CHARACTERS) && Boolean((subject.name as string).trim())
      && TAG_SUBJECT_KINDS.has(subject.kind as string)
      && (subject.aliases === undefined || (Array.isArray(subject.aliases) && subject.aliases.every(alias => within(alias, TAG_NAME_CHARACTERS)))));
  if (!valid) throw new Error(`A tagging request needs its chapter, model and language, 1 to ${TAG_PARAGRAPH_LIMIT} paragraphs, and at most ${TAG_SUBJECT_LIMIT} named subjects.`);
  return parsed as unknown as HarnessTagRequest;
};

const parseRequest = (body: unknown): HarnessGenerationRequest | HarnessArcRequest | HarnessHoldingsFixRequest | HarnessLookRequest | HarnessTagRequest => {
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  if (!isRecord(parsed)) throw new Error('The Harness Generation request must be a JSON object.');
  if (parsed.operation === 'fix-holdings') return parseHoldingsFix(parsed);
  if (parsed.operation === 'describe-looks') return parseLookRequest(parsed);
  if (parsed.operation === 'tag-chapter') return parseTagRequest(parsed);
  if (parsed.operation === 'plan-arc') {
    if (!isRecord(parsed.storyInformation) || !isRecord(parsed.storyInformation.storyHead) || typeof parsed.model !== 'string'
      || typeof parsed.storyId !== 'string') throw new Error('Arc operations require a frozen Story Information Packet.');
    requirePacket(parsed.storyInformation);
    // The planner's own context: which arc, within what length, after which arcs, with what look-ahead.
    const planning = parsed.planning;
    if (!isRecord(planning) || !Number.isInteger(planning.arcNumber) || Number(planning.arcNumber) < 1
      || typeof planning.finalArc !== 'boolean' || !Array.isArray(planning.previousArcs) || !Array.isArray(planning.lookahead)
      || (planning.plannedArcCount !== undefined && (!Number.isInteger(planning.plannedArcCount) || Number(planning.plannedArcCount) < 1))) {
      throw new Error('Arc planning requires its planning context: the arc, the earlier arcs and the look-ahead.');
    }
    return parsed as unknown as HarnessArcRequest;
  }
  if (parsed.operation !== undefined) throw new Error('Unknown Harness Generation operation.');
  // The Generation Model Call carries two separated inputs plus the immediate request.
  if (!isRecord(parsed.capaPrompt) || typeof parsed.capaPrompt.text !== 'string' || !parsed.capaPrompt.text.trim()) {
    throw new Error('Harness Generation requires an assembled CAPA Prompt.');
  }
  // The sound words travel with the CAPA Prompt the writer reads, so they are
  // checked against the same limits a Sound Cue pack is held to before any call.
  if (parsed.capaPrompt.soundVocabulary !== undefined) {
    parsed.capaPrompt.soundVocabulary = validateSoundWords(parsed.capaPrompt.soundVocabulary);
  }
  if (!isRecord(parsed.storyInformation) || !isRecord(parsed.storyInformation.arc)) {
    throw new Error('Harness Generation needs a compact Story Information Packet with an authoritative Arc Plan.');
  }
  requirePacket(parsed.storyInformation);
  if (!isRecord(parsed.missionReminder) || typeof parsed.missionReminder.text !== 'string' || !parsed.missionReminder.text.trim()) {
    throw new Error('Harness Generation requires the frozen Mission Reminder.');
  }
  if (typeof parsed.storyId !== 'string' || typeof parsed.attemptId !== 'string') {
    throw new Error('Harness Generation needs story and attempt identities.');
  }
  const immediate = parsed.immediateChapterRequest;
  if (!isRecord(immediate) || !Number.isInteger(immediate.chapterNumber) || Number(immediate.chapterNumber) < 1) {
    throw new Error('Harness Generation needs an Immediate Chapter Request with a valid harness-owned chapter number.');
  }
  // The paragraph count becomes the schema's exact array length, so only a sane whole number passes.
  const paragraphs = isRecord(immediate.chapterScale) ? immediate.chapterScale.paragraphs : undefined;
  if (paragraphs !== undefined && (!Number.isInteger(paragraphs) || Number(paragraphs) < 1 || Number(paragraphs) > HARNESS_MAX_CHAPTER_PARAGRAPHS)) {
    throw new Error(`The chapter paragraph count must be a whole number from 1 to ${HARNESS_MAX_CHAPTER_PARAGRAPHS}.`);
  }
  // A rewrite names the chapter it replaces and shows its title; the reader's note stays within its limit.
  const rewrite = immediate.rewrite;
  if (rewrite !== undefined) {
    const previous = isRecord(rewrite) ? rewrite.previous : undefined;
    if (!isRecord(rewrite) || typeof rewrite.replacesChapterId !== 'string' || !rewrite.replacesChapterId.trim()
      || !isRecord(previous) || typeof previous.title !== 'string' || (previous.recap !== undefined && typeof previous.recap !== 'string')
      || (rewrite.note !== undefined && (typeof rewrite.note !== 'string' || !rewrite.note.trim() || rewrite.note.length > CHAPTER_REWRITE_NOTE_LIMIT))) {
      throw new Error(`A chapter rewrite needs the chapter it replaces with its title, and a note of at most ${CHAPTER_REWRITE_NOTE_LIMIT.toLocaleString()} characters.`);
    }
  }
  if (typeof parsed.model !== 'string') throw new Error('Choose a configured Harness Generation model.');
  return parsed as unknown as HarnessGenerationRequest;
};

/** A provider's answer that it refused the key: wrong, out of plan, or out of credit. */
const rejectedKey = (message: string) => /\b(?:HTTP |status:? ?)?40[13]\b|api key not valid|invalid api key|unauthori[sz]ed|insufficient (?:credit|quota|balance)/i.test(message);
const rejectedStatus = (message: string) => {
  const code = message.match(/\b(40[13])\b/)?.[1];
  return code ? ` (HTTP ${code})` : '';
};

const configurationMessage = (message: string) =>
  isMissingKeyMessage(message) || message.includes('HARNESS_GENERATION_MODELS');

export const handleHarnessGenerationHttp = async (
  request: HarnessGenerationHttpRequest,
  dependencies: HarnessGenerationHttpDependencies,
): Promise<HarnessGenerationHttpResponse> => {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method === 'GET') {
    try {
      return {
        status: 200,
        body: harnessGenerationServerInfo(dependencies.environment),
        headers: { 'Cache-Control': 'no-store' },
      };
    } catch (error) {
      dependencies.onError?.(error);
      return {
        status: 500,
        body: { error: 'Harness Generation model configuration is invalid.' },
        headers: { 'Cache-Control': 'no-store' },
      };
    }
  }
  if (method !== 'POST') {
    return {
      status: 405,
      body: { error: 'Method not allowed.' },
      headers: { Allow: 'GET, POST' },
    };
  }

  let parsed: HarnessGenerationRequest | HarnessArcRequest | HarnessHoldingsFixRequest | HarnessLookRequest | HarnessTagRequest;
  try {
    parsed = parseRequest(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Harness Generation request.';
    return requestError(message === 'Unexpected end of JSON input' ? 'The Harness Generation request body is empty.' : message);
  }

  try {
    const config = resolveHarnessGenerationConfig(dependencies.environment);
    const reasoningLevel = (parsed as { reasoningLevel?: unknown }).reasoningLevel;
    // The Holdings fixer and the look step think as little as the model allows, whatever the reader chose for chapters.
    const operation = 'operation' in parsed ? parsed.operation : undefined;
    const result = operation === 'fix-holdings'
      ? await executeHoldingsFix(parsed as HarnessHoldingsFixRequest, config, dependencies.providerFactory)
      : operation === 'describe-looks'
        ? await executeLookDescription(parsed as HarnessLookRequest, config, dependencies.providerFactory)
        : operation === 'tag-chapter'
          ? await executeHarnessTagging(parsed as HarnessTagRequest, config, dependencies.providerFactory)
          : await executeHarnessGeneration(parsed as HarnessGenerationRequest | HarnessArcRequest, config, dependencies.providerFactory, reasoningLevel);
    return {
      status: 200,
      body: result satisfies HarnessGenerationResponse,
      headers: { 'Cache-Control': 'no-store' },
    };
  } catch (error) {
    dependencies.onError?.(error);
    const message = error instanceof Error ? error.message : '';
    if (configurationMessage(message)) {
      return {
        status: 503,
        body: { error: message },
        headers: { 'Cache-Control': 'no-store' },
      };
    }
    if (
      message.includes('Choose a configured')
      || message.includes('is not configured for Harness Generation')
      || message.includes('requires an assembled CAPA Prompt')
      || message.includes('requires the frozen Mission Reminder')
    ) {
      return requestError(message);
    }
    // The one provider failure a reader can act on: the model was still writing at the deadline.
    const deadline = error instanceof HarnessGenerationExecutionError
      ? message.match(/exceeded the Harness Generation (\d+) second deadline/)?.[1] : undefined;
    if (deadline) {
      return {
        status: 502,
        body: { error: `The model was still writing after ${deadline} seconds, so it was stopped. Choose a lower reasoning level or a faster model in the Model Router. The prior committed story is unchanged.` },
        headers: { 'Cache-Control': 'no-store' },
      };
    }
    // A provider that refuses its key will refuse every retry: say so, so the reader fixes the key instead of retrying.
    if (error instanceof HarnessGenerationExecutionError && rejectedKey(message)) {
      const model = typeof (parsed as { model?: unknown }).model === 'string' ? (parsed as { model: string }).model : 'the chosen model';
      return {
        status: 502,
        body: { error: `The provider for ${model} rejected its key${rejectedStatus(message)}. Check that provider's key, plan and remaining credit in the server settings, or choose another model in the Model Router. The prior committed story is unchanged.` },
        headers: { 'Cache-Control': 'no-store' },
      };
    }
    if (error instanceof HarnessGenerationExecutionError) {
      return {
        status: 502,
        body: { error: 'The configured model could not complete the Harness chapter. The prior committed story is unchanged.' },
        headers: { 'Cache-Control': 'no-store' },
      };
    }
    return {
      status: 502,
      body: { error: 'Harness Generation could not complete this request. The prior committed story is unchanged.' },
      headers: { 'Cache-Control': 'no-store' },
    };
  }
};

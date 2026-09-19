/**
 * The Reader translation server route.
 *
 * It holds the provider key and nothing else: the frozen request arrives
 * already assembled, and the raw provider reply goes back untouched for the
 * client's shared validator to check against the canonical chapter. The route
 * deliberately does not inspect or repair translated content.
 *
 * Provider configuration is the Development server's single Gemini
 * configuration, shared with Harness Generation.
 */

import { READER_TRANSLATION_SCHEMA_VERSION, type ReaderTranslationRequest } from '@seihouse/sen/translation';
import { isSenLanguageCode } from '@seihouse/sen/contracts';
import {
  resolveHarnessGenerationConfig,
  type HarnessGenerationEnvironment,
} from '../harness-generation/config';
import {
  GeminiHarnessTextProvider,
  type HarnessTextModelProvider,
} from '../harness-generation/provider';
import { buildReaderTranslationPrompt } from './prompt';

export type ReaderTranslationProviderFactory = (
  input: { apiKey: string; model: string },
) => HarnessTextModelProvider;

export interface ReaderTranslationHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ReaderTranslationHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ReaderTranslationHttpDependencies {
  environment: HarnessGenerationEnvironment;
  providerFactory?: ReaderTranslationProviderFactory;
  onError?: (error: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const READER_TRANSLATION_REQUEST_LIMITS = {
  totalCharacters: 180_000,
  instructionsCharacters: 16_000,
  sourceCharacters: 120_000,
  sourceBlocks: 400,
  glossaryEntries: 200,
  glossaryCharacters: 40_000,
  identifierCharacters: 256,
  glossaryAliasesPerEntry: 20,
} as const;

const text = (value: unknown, label: string, maximum: number, allowEmpty = false): string => {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new Error(`${label} must be a nonempty string.`);
  }
  if (value.length > maximum) throw new Error(`${label} exceeds ${maximum.toLocaleString()} characters.`);
  return value;
};

const exactKeys = (value: Record<string, unknown>, allowed: readonly string[], label: string): void => {
  const unexpected = Object.keys(value).find(key => !allowed.includes(key));
  if (unexpected) throw new Error(`${label} contains an unsupported field: ${unexpected}.`);
};

const readerFacingTextLength = (value: unknown): number => {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + readerFacingTextLength(item), 0);
  if (isRecord(value)) return Object.values(value).reduce<number>((sum, item) => sum + readerFacingTextLength(item), 0);
  throw new Error('Reader-facing chapter values must contain strings only.');
};

const MAX_READER_FACING_LIST_ITEMS = 400;

const recordList = (value: unknown, label: string): Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.length > MAX_READER_FACING_LIST_ITEMS || !value.every(isRecord)) {
    throw new Error(`${label} must be a bounded list of objects.`);
  }
  return value;
};

const stringList = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.length > MAX_READER_FACING_LIST_ITEMS) {
    throw new Error(`${label} must be a bounded list of strings.`);
  }
  return value.map((item, index) => text(item, `${label} item ${index + 1}`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true));
};

const optionalText = (record: Record<string, unknown>, key: string, label: string): void => {
  if (record[key] !== undefined) text(record[key], `${label} ${key}`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
};

const validateLabelledValue = (value: Record<string, unknown>, label: string): void => {
  exactKeys(value, ['label', 'value'], label);
  text(value.label, `${label} label`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
  text(value.value, `${label} value`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
};

const validateReaderFacingSystem = (system: Record<string, unknown>, label: string): void => {
  exactKeys(system, ['title', 'flavor', 'rarity', 'rows', 'badge', 'changes', 'worldNotice', 'status', 'fate'], label);
  for (const key of ['title', 'flavor', 'rarity']) optionalText(system, key, label);
  if (system.rows !== undefined) recordList(system.rows, `${label} rows`)
    .forEach((row, index) => validateLabelledValue(row, `${label} row ${index + 1}`));
  if (system.badge !== undefined) {
    if (!isRecord(system.badge)) throw new Error(`${label} badge must be an object.`);
    validateLabelledValue(system.badge, `${label} badge`);
  }
  if (system.changes !== undefined) stringList(system.changes, `${label} changes`);
  if (system.worldNotice !== undefined) {
    if (!isRecord(system.worldNotice)) throw new Error(`${label} worldNotice must be an object.`);
    exactKeys(system.worldNotice, ['entries'], `${label} worldNotice`);
    recordList(system.worldNotice.entries, `${label} worldNotice entries`).forEach((entry, index) => {
      const entryLabel = `${label} worldNotice entry ${index + 1}`;
      exactKeys(entry, ['title', 'body', 'details'], entryLabel);
      text(entry.title, `${entryLabel} title`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
      optionalText(entry, 'body', entryLabel);
      if (entry.details !== undefined) recordList(entry.details, `${entryLabel} details`)
        .forEach((detail, detailIndex) => validateLabelledValue(detail, `${entryLabel} detail ${detailIndex + 1}`));
    });
  }
  if (system.status !== undefined) {
    if (!isRecord(system.status)) throw new Error(`${label} status must be an object.`);
    const status = system.status;
    exactKeys(status, ['level', 'bars', 'stats', 'effects', 'abilities'], `${label} status`);
    optionalText(status, 'level', `${label} status`);
    if (status.bars !== undefined) recordList(status.bars, `${label} status bars`).forEach((bar, index) => {
      const barLabel = `${label} status bar ${index + 1}`;
      exactKeys(bar, ['label', 'display'], barLabel);
      text(bar.label, `${barLabel} label`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
      optionalText(bar, 'display', barLabel);
    });
    if (status.stats !== undefined) recordList(status.stats, `${label} status stats`)
      .forEach((stat, index) => validateLabelledValue(stat, `${label} status stat ${index + 1}`));
    if (status.effects !== undefined) recordList(status.effects, `${label} status effects`).forEach((effect, index) => {
      const effectLabel = `${label} status effect ${index + 1}`;
      exactKeys(effect, ['name', 'detail', 'value'], effectLabel);
      text(effect.name, `${effectLabel} name`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
      optionalText(effect, 'detail', effectLabel);
      optionalText(effect, 'value', effectLabel);
    });
    if (status.abilities !== undefined) recordList(status.abilities, `${label} status abilities`).forEach((ability, index) => {
      const abilityLabel = `${label} status ability ${index + 1}`;
      exactKeys(ability, ['name', 'detail'], abilityLabel);
      text(ability.name, `${abilityLabel} name`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
      optionalText(ability, 'detail', abilityLabel);
    });
  }
  if (system.fate !== undefined) {
    if (!isRecord(system.fate)) throw new Error(`${label} fate must be an object.`);
    const fate = system.fate;
    exactKeys(fate, ['timelineScar', 'permanentCosts', 'newStoryState', 'newActiveStats', 'genreShift'], `${label} fate`);
    for (const key of ['timelineScar', 'newStoryState', 'genreShift']) optionalText(fate, key, `${label} fate`);
    if (fate.permanentCosts !== undefined) stringList(fate.permanentCosts, `${label} fate permanentCosts`);
    if (fate.newActiveStats !== undefined) stringList(fate.newActiveStats, `${label} fate newActiveStats`);
  }
};

const validateSource = (source: unknown): void => {
  if (!isRecord(source)) throw new Error('A translation request needs the frozen reader-facing chapter material.');
  exactKeys(source, ['title', 'blocks'], 'The reader-facing chapter');
  text(source.title, 'The reader-facing chapter title', READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
  if (!Array.isArray(source.blocks) || !source.blocks.length) {
    throw new Error('A translation request needs the frozen reader-facing chapter material.');
  }
  if (source.blocks.length > READER_TRANSLATION_REQUEST_LIMITS.sourceBlocks) {
    throw new Error(`A translation request may contain at most ${READER_TRANSLATION_REQUEST_LIMITS.sourceBlocks} reader-facing blocks.`);
  }
  const ids = new Set<string>();
  for (const [index, block] of source.blocks.entries()) {
    if (!isRecord(block)) throw new Error(`Reader-facing block ${index + 1} must be an object.`);
    exactKeys(block, ['id', 'text', 'system'], `Reader-facing block ${index + 1}`);
    const id = text(block.id, `Reader-facing block ${index + 1} id`, READER_TRANSLATION_REQUEST_LIMITS.identifierCharacters);
    if (ids.has(id)) throw new Error(`Reader-facing block id "${id}" appears more than once.`);
    ids.add(id);
    if (block.text !== undefined) text(block.text, `Reader-facing block ${index + 1} text`, READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters, true);
    if (block.system !== undefined) {
      if (!isRecord(block.system)) throw new Error(`Reader-facing block ${index + 1} system must be an object.`);
      validateReaderFacingSystem(block.system, `Reader-facing block ${index + 1} system`);
    }
    if (block.text === undefined && block.system === undefined) {
      throw new Error(`Reader-facing block ${index + 1} has no translatable values.`);
    }
  }
  if (readerFacingTextLength({ title: source.title, blocks: source.blocks.map(block => {
    const record = block as Record<string, unknown>;
    return { ...(record.text !== undefined ? { text: record.text } : {}), ...(record.system !== undefined ? { system: record.system } : {}) };
  }) }) > READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters) {
    throw new Error(`Reader-facing source text exceeds ${READER_TRANSLATION_REQUEST_LIMITS.sourceCharacters.toLocaleString()} characters.`);
  }
};

const validateGlossary = (glossary: unknown): void => {
  if (!Array.isArray(glossary)) throw new Error('A translation request carries a malformed glossary.');
  if (glossary.length > READER_TRANSLATION_REQUEST_LIMITS.glossaryEntries) {
    throw new Error(`A translation request may carry at most ${READER_TRANSLATION_REQUEST_LIMITS.glossaryEntries} glossary entries.`);
  }
  const seen = new Set<string>();
  for (const [index, entry] of glossary.entries()) {
    if (!isRecord(entry)) throw new Error(`Translation glossary entry ${index + 1} must be an object.`);
    exactKeys(entry, ['term', 'aliases', 'translation', 'note'], `Translation glossary entry ${index + 1}`);
    const term = text(entry.term, `Translation glossary entry ${index + 1} term`, 200);
    text(entry.translation, `Translation glossary entry ${index + 1} translation`, 200);
    const candidates = [term];
    if (entry.aliases !== undefined) {
      if (!Array.isArray(entry.aliases) || entry.aliases.length > READER_TRANSLATION_REQUEST_LIMITS.glossaryAliasesPerEntry) {
        throw new Error(`Translation glossary entry ${index + 1} has invalid aliases.`);
      }
      candidates.push(...entry.aliases.map((alias, aliasIndex) =>
        text(alias, `Translation glossary entry ${index + 1} alias ${aliasIndex + 1}`, 200)));
    }
    if (entry.note !== undefined) text(entry.note, `Translation glossary entry ${index + 1} note`, 200);
    for (const candidate of candidates) {
      const key = candidate.trim().toLowerCase();
      if (seen.has(key)) throw new Error(`Translation glossary term or alias "${candidate}" collides after normalization.`);
      seen.add(key);
    }
  }
  if (JSON.stringify(glossary).length > READER_TRANSLATION_REQUEST_LIMITS.glossaryCharacters) {
    throw new Error(`A translation request glossary exceeds ${READER_TRANSLATION_REQUEST_LIMITS.glossaryCharacters.toLocaleString()} characters.`);
  }
};

const noStore = { 'Cache-Control': 'no-store' } as const;

const requestError = (message: string): ReaderTranslationHttpResponse =>
  ({ status: 400, body: { error: message }, headers: { ...noStore } });

const parseRequest = (body: unknown): ReaderTranslationRequest => {
  if (typeof body === 'string' && body.length > READER_TRANSLATION_REQUEST_LIMITS.totalCharacters) {
    throw new Error(`The translation request exceeds ${READER_TRANSLATION_REQUEST_LIMITS.totalCharacters.toLocaleString()} characters.`);
  }
  const parsed: unknown = typeof body === 'string' ? JSON.parse(body) : body;
  if (!isRecord(parsed)) throw new Error('The translation request must be a JSON object.');
  const serialized = JSON.stringify(parsed);
  if (serialized.length > READER_TRANSLATION_REQUEST_LIMITS.totalCharacters) {
    throw new Error(`The translation request exceeds ${READER_TRANSLATION_REQUEST_LIMITS.totalCharacters.toLocaleString()} characters.`);
  }
  exactKeys(parsed, [
    'schemaVersion', 'storyId', 'chapterNumber', 'chapterId', 'sourceLanguage', 'targetLanguage',
    'sourceContentHash', 'skill', 'instructions', 'glossary', 'glossarySource', 'source', 'frozenAt',
  ], 'The translation request');
  if (parsed.schemaVersion !== READER_TRANSLATION_SCHEMA_VERSION) {
    throw new Error('The translation request uses an unsupported schema version.');
  }
  if (!isSenLanguageCode(parsed.targetLanguage) || !isSenLanguageCode(parsed.sourceLanguage)) {
    throw new Error('A translation request needs supported source and target languages.');
  }
  if (parsed.targetLanguage === parsed.sourceLanguage) {
    throw new Error('A chapter is never translated into its own original language.');
  }
  if (!isRecord(parsed.skill)) {
    throw new Error('A translation request needs an installed Translation skill and its instructions.');
  }
  exactKeys(parsed.skill, ['id', 'version', 'contentDigest', 'targetLanguage'], 'The selected Translation skill');
  text(parsed.skill.id, 'The selected Translation skill id', READER_TRANSLATION_REQUEST_LIMITS.identifierCharacters);
  text(parsed.skill.version, 'The selected Translation skill version', 100);
  text(parsed.skill.contentDigest, 'The selected Translation skill content digest', 256);
  text(parsed.instructions, 'Translation skill instructions', READER_TRANSLATION_REQUEST_LIMITS.instructionsCharacters);
  if (parsed.skill.targetLanguage !== parsed.targetLanguage) {
    throw new Error('The selected Translation skill does not declare the requested target language.');
  }
  validateSource(parsed.source);
  if (parsed.glossary !== undefined) validateGlossary(parsed.glossary);
  if (parsed.glossarySource !== undefined) {
    if (parsed.glossary === undefined || !isRecord(parsed.glossarySource)) {
      throw new Error('Glossary provenance requires selected glossary entries.');
    }
    exactKeys(parsed.glossarySource, ['path', 'sha256'], 'Glossary provenance');
    text(parsed.glossarySource.path, 'Glossary provenance path', 1_024);
    text(parsed.glossarySource.sha256, 'Glossary provenance digest', 256);
  }
  if (typeof parsed.storyId !== 'string' || !parsed.storyId.trim()
    || parsed.storyId.length > READER_TRANSLATION_REQUEST_LIMITS.identifierCharacters
    || !Number.isInteger(parsed.chapterNumber) || Number(parsed.chapterNumber) < 1) {
    throw new Error('A translation request needs its story and chapter identity.');
  }
  if (parsed.chapterId !== undefined) text(parsed.chapterId, 'The chapter id', READER_TRANSLATION_REQUEST_LIMITS.identifierCharacters);
  text(parsed.sourceContentHash, 'The source content hash', 256);
  text(parsed.frozenAt, 'The frozen request time', 100);
  return parsed as unknown as ReaderTranslationRequest;
};

export const handleReaderTranslationHttp = async (
  request: ReaderTranslationHttpRequest,
  dependencies: ReaderTranslationHttpDependencies,
): Promise<ReaderTranslationHttpResponse> => {
  if ((request.method?.toUpperCase() ?? 'GET') !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed.' }, headers: { Allow: 'POST' } };
  }

  let parsed: ReaderTranslationRequest;
  try {
    parsed = parseRequest(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid translation request.';
    return requestError(message === 'Unexpected end of JSON input'
      ? 'The translation request body is empty.'
      : message);
  }

  let config: ReturnType<typeof resolveHarnessGenerationConfig>;
  try {
    config = resolveHarnessGenerationConfig(dependencies.environment);
  } catch (error) {
    dependencies.onError?.(error);
    return { status: 503, body: { error: 'The translation model configuration is invalid.' }, headers: { ...noStore } };
  }
  if (!config.apiKey) {
    return {
      status: 503,
      body: { error: 'GEMINI_API_KEY is not configured on the Development server.' },
      headers: { ...noStore },
    };
  }

  const model = config.defaultModel;
  const provider = dependencies.providerFactory
    ? dependencies.providerFactory({ apiKey: config.apiKey, model })
    : new GeminiHarnessTextProvider(config.apiKey, model);

  try {
    const result = await provider.generate({
      ...buildReaderTranslationPrompt(parsed),
      // A translation restates existing prose; it must not invent variation.
      temperature: 0,
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: config.timeoutMs,
    });
    return {
      status: 200,
      body: { rawProviderResponse: result.rawProviderResponse, receipt: result.providerReceipt },
      headers: { ...noStore },
    };
  } catch (error) {
    dependencies.onError?.(error);
    return {
      status: 502,
      body: { error: 'The chapter could not be translated. The original chapter is unchanged.' },
      headers: { ...noStore },
    };
  }
};

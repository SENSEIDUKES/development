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

import type { ReaderTranslationRequest } from '../../components/reader-chamber/shared/translation/contract';
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

const noStore = { 'Cache-Control': 'no-store' } as const;

const requestError = (message: string): ReaderTranslationHttpResponse =>
  ({ status: 400, body: { error: message }, headers: { ...noStore } });

const parseRequest = (body: unknown): ReaderTranslationRequest => {
  const parsed: unknown = typeof body === 'string' ? JSON.parse(body) : body;
  if (!isRecord(parsed)) throw new Error('The translation request must be a JSON object.');
  if (typeof parsed.targetLanguage !== 'string' || typeof parsed.sourceLanguage !== 'string') {
    throw new Error('A translation request needs its source and target languages.');
  }
  if (parsed.targetLanguage === parsed.sourceLanguage) {
    throw new Error('A chapter is never translated into its own original language.');
  }
  if (!isRecord(parsed.skill) || typeof parsed.skill.id !== 'string'
    || typeof parsed.instructions !== 'string' || !parsed.instructions.trim()) {
    throw new Error('A translation request needs an installed Translation skill and its instructions.');
  }
  if (parsed.skill.targetLanguage !== parsed.targetLanguage) {
    throw new Error('The selected Translation skill does not declare the requested target language.');
  }
  const source = parsed.source;
  if (!isRecord(source) || typeof source.title !== 'string'
    || !Array.isArray(source.blocks) || !source.blocks.length) {
    throw new Error('A translation request needs the frozen reader-facing chapter material.');
  }
  if (typeof parsed.storyId !== 'string' || !Number.isInteger(parsed.chapterNumber)) {
    throw new Error('A translation request needs its story and chapter identity.');
  }
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

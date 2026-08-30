import type {
  HarnessGenerationRequest,
  HarnessGenerationResponse,
} from '../../components/harness-generation/shared/types';
import {
  harnessGenerationServerInfo,
  resolveHarnessGenerationConfig,
  type HarnessGenerationEnvironment,
} from './config';
import {
  executeHarnessGeneration,
  HarnessGenerationExecutionError,
  type HarnessProviderFactory,
} from './execute';

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

const parseRequest = (body: unknown): HarnessGenerationRequest => {
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  if (!isRecord(parsed)) throw new Error('The Harness Generation request must be a JSON object.');
  if (!isRecord(parsed.foundation) || !isRecord(parsed.foundation.input)) {
    throw new Error('Harness Generation needs a frozen Story Foundation revision.');
  }
  if (typeof parsed.foundation.input.premise !== 'string' || !parsed.foundation.input.premise.trim()) {
    throw new Error('A Story Foundation premise is required.');
  }
  if (!isRecord(parsed.context) || !Array.isArray(parsed.context.committedChapters)) {
    throw new Error('Harness Generation needs an auditable context snapshot.');
  }
  if (typeof parsed.storyId !== 'string' || typeof parsed.attemptId !== 'string') {
    throw new Error('Harness Generation needs story and attempt identities.');
  }
  if (!Number.isInteger(parsed.chapterNumber) || Number(parsed.chapterNumber) < 1) {
    throw new Error('Harness Generation needs a valid harness-owned chapter number.');
  }
  if (typeof parsed.model !== 'string') throw new Error('Choose a configured Harness Generation model.');
  return parsed as unknown as HarnessGenerationRequest;
};

const configurationMessage = (message: string) =>
  message.includes('GEMINI_API_KEY') || message.includes('HARNESS_GENERATION_MODELS');

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

  let parsed: HarnessGenerationRequest;
  try {
    parsed = parseRequest(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Harness Generation request.';
    return requestError(message === 'Unexpected end of JSON input' ? 'The Harness Generation request body is empty.' : message);
  }

  try {
    const config = resolveHarnessGenerationConfig(dependencies.environment);
    const result = await executeHarnessGeneration(parsed, config, dependencies.providerFactory);
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
    if (message.includes('Choose a configured') || message.includes('is not configured for Harness Generation')) {
      return requestError(message);
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

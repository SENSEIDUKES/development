import type {
  HarnessGenerationModelAdapter,
  HarnessGenerationRequest,
  HarnessGenerationResponse,
  HarnessGenerationServerInfo,
} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const responseError = async (response: Response) => {
  try {
    const body = await response.json();
    if (isRecord(body) && typeof body.error === 'string') return body.error;
  } catch {
    // Keep the status fallback below.
  }
  return `Harness Generation request failed (${response.status}).`;
};

const parseServerInfo = (value: unknown): HarnessGenerationServerInfo => {
  if (!isRecord(value) || value.provider !== 'gemini' || typeof value.configured !== 'boolean'
    || !Array.isArray(value.models) || typeof value.defaultModel !== 'string') {
    throw new Error('Harness Generation returned an invalid model configuration.');
  }
  return value as unknown as HarnessGenerationServerInfo;
};

const parseGenerationResponse = (value: unknown): HarnessGenerationResponse => {
  if (!isRecord(value) || typeof value.rawProviderResponse !== 'string' || !isRecord(value.providerReceipt)) {
    throw new Error('Harness Generation returned an invalid provider response.');
  }
  return value as unknown as HarnessGenerationResponse;
};

/** Browser-only adapter. The provider key remains on the new server route. */
export class HarnessGenerationHttpClient implements HarnessGenerationModelAdapter {
  constructor(private readonly endpoint = '/api/harness-generation') {}

  async getServerInfo(): Promise<HarnessGenerationServerInfo> {
    const response = await fetch(this.endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(await responseError(response));
    return parseServerInfo(await response.json());
  }

  async generate(request: HarnessGenerationRequest): Promise<HarnessGenerationResponse> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await responseError(response));
    return parseGenerationResponse(await response.json());
  }
}

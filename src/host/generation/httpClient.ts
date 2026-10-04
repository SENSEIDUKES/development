import { type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessGenerationResponse, type HarnessGenerationServerInfo, type HarnessMemoryRecoveryRequest, type HarnessArcRequest } from '@seihouse/sen/harness-generation';
import { readReasoningPreference } from './modelPreference';

const withReasoningLevel = <T extends { model: string }>(request: T): T & { reasoningLevel?: string } => {
  const reasoningLevel = typeof window === 'undefined' ? undefined : readReasoningPreference(request.model);
  return reasoningLevel ? { ...request, reasoningLevel } : request;
};

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
  if (!isRecord(value) || typeof value.provider !== 'string' || typeof value.configured !== 'boolean'
    || !Array.isArray(value.models) || typeof value.defaultModel !== 'string') {
    throw new Error('Harness Generation returned an invalid model configuration.');
  }
  return value as unknown as HarnessGenerationServerInfo;
};

const parseGenerationResponse = (value: unknown): HarnessGenerationResponse => {
  if (!isRecord(value) || typeof value.rawProviderResponse !== 'string' || !isRecord(value.providerReceipt)) {
    throw new Error('Harness Generation returned an invalid provider response.');
  }
  // The measurement is optional and only trusted when it is a complete record.
  const measurement = value.requestMeasurement;
  if (measurement !== undefined && (!isRecord(measurement) || typeof measurement.totalCharacters !== 'number' || !Array.isArray(measurement.sections))) {
    const { requestMeasurement: _invalid, ...rest } = value;
    return rest as unknown as HarnessGenerationResponse;
  }
  return value as unknown as HarnessGenerationResponse;
};

/**
 * A chapter request the server answered with an error. `status` is its HTTP
 * status, so a host can act on it (429: the visitor limit was reached; 401:
 * the access token was not accepted) without matching message text.
 */
export class HarnessGenerationRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'HarnessGenerationRequestError';
  }
}

/** Browser-only adapter. The provider key remains on the new server route. */
export class HarnessGenerationHttpClient implements HarnessGenerationModelAdapter {
  /**
   * `accessToken` reads the owner's Development access token when the host has
   * one; sent with each request, it lifts the visitor limit.
   */
  constructor(
    private readonly endpoint = '/api/harness-generation',
    private readonly accessToken?: () => string | undefined,
  ) {}

  async getServerInfo(): Promise<HarnessGenerationServerInfo> {
    const response = await fetch(this.endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new HarnessGenerationRequestError(await responseError(response), response.status);
    return parseServerInfo(await response.json());
  }

  async generate(request: HarnessGenerationRequest): Promise<HarnessGenerationResponse> {
    return this.post(request);
  }

  async arcOperation(request: HarnessArcRequest): Promise<HarnessGenerationResponse> { return this.post(request); }

  async recoverMemory(request: HarnessMemoryRecoveryRequest): Promise<HarnessGenerationResponse> {
    return this.post(request);
  }

  private async post(request: HarnessGenerationRequest | HarnessMemoryRecoveryRequest | HarnessArcRequest): Promise<HarnessGenerationResponse> {
    const token = this.accessToken?.()?.trim();
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // The Model Router's Advanced reasoning level for this model rides along;
      // the server checks it against the catalog.
      body: JSON.stringify(withReasoningLevel(request)),
    });
    if (!response.ok) throw new HarnessGenerationRequestError(await responseError(response), response.status);
    return parseGenerationResponse(await response.json());
  }
}

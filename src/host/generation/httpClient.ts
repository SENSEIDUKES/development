import { type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessGenerationResponse, type HarnessGenerationServerInfo, type HarnessMemoryRecoveryRequest, type HarnessArcRequest } from '@seihouse/sen/harness-generation';

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

/** Browser-only adapter. The provider key remains on the new server route. */
export class HarnessGenerationHttpClient implements HarnessGenerationModelAdapter {
  constructor(private readonly endpoint = '/api/harness-generation') {}

  async getServerInfo(): Promise<HarnessGenerationServerInfo> {
    const response = await fetch(this.endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(await responseError(response));
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

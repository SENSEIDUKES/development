import { type HarnessGenerationRequest, type HarnessGenerationResponse, type HarnessMemoryRecoveryRequest, type HarnessArcRequest } from '@seihouse/sen/harness-generation';
import {
  resolveConfiguredHarnessModel,
  type ResolvedHarnessGenerationConfig,
} from './config';
import { buildHarnessGenerationPrompt, buildHarnessMemoryRecoveryPrompt, buildHarnessArcPrompt } from './prompt';
import {
  GeminiHarnessTextProvider,
  type HarnessTextModelProvider,
} from './provider';

export type HarnessProviderFactory = (input: { apiKey: string; model: string }) => HarnessTextModelProvider;

export class HarnessGenerationExecutionError extends Error {
  constructor(cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'Unknown provider error';
    super(message);
    this.name = 'HarnessGenerationExecutionError';
  }
}

export const executeHarnessGeneration = async (
  request: HarnessGenerationRequest | HarnessMemoryRecoveryRequest | HarnessArcRequest,
  config: ResolvedHarnessGenerationConfig,
  providerFactory?: HarnessProviderFactory,
): Promise<HarnessGenerationResponse> => {
  const model = resolveConfiguredHarnessModel(request.model, config);
  if (!config.apiKey) throw new Error('GEMINI_API_KEY is not configured on the Development server.');
  const provider = providerFactory
    ? providerFactory({ apiKey: config.apiKey, model })
    : new GeminiHarnessTextProvider(config.apiKey, model);
  const chapter = 'operation' in request ? undefined : buildHarnessGenerationPrompt(request);
  const prompt = chapter ?? ('operation' in request && request.operation === 'recover-memory'
    ? buildHarnessMemoryRecoveryPrompt(request as HarnessMemoryRecoveryRequest)
    : buildHarnessArcPrompt(request as HarnessArcRequest));
  try {
    const result = await provider.generate({
      systemInstruction: prompt.systemInstruction,
      userPrompt: prompt.userPrompt,
      responseJsonSchema: prompt.responseJsonSchema,
      temperature: 'operation' in request ? 0 : config.temperature,
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: config.timeoutMs,
    });
    // The measurement is taken from the exact strings the provider received.
    return chapter ? { ...result, requestMeasurement: chapter.measurement } : result;
  } catch (error) {
    throw new HarnessGenerationExecutionError(error);
  }
};

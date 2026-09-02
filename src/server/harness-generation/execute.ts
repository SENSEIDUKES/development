import type {
  HarnessGenerationRequest,
  HarnessGenerationResponse,
} from '../../components/harness-generation/shared/types';
import {
  resolveConfiguredHarnessModel,
  type ResolvedHarnessGenerationConfig,
} from './config';
import { buildHarnessGenerationPrompt } from './prompt';
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
  request: HarnessGenerationRequest,
  config: ResolvedHarnessGenerationConfig,
  providerFactory?: HarnessProviderFactory,
): Promise<HarnessGenerationResponse> => {
  const model = resolveConfiguredHarnessModel(request.model, config);
  if (!config.apiKey) throw new Error('GEMINI_API_KEY is not configured on the Development server.');
  const provider = providerFactory
    ? providerFactory({ apiKey: config.apiKey, model })
    : new GeminiHarnessTextProvider(config.apiKey, model);
  const prompt = buildHarnessGenerationPrompt(request);
  try {
    return await provider.generate({
      ...prompt,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: config.timeoutMs,
    });
  } catch (error) {
    throw new HarnessGenerationExecutionError(error);
  }
};

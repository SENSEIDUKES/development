import type { HarnessProviderReceipt } from '@seihouse/sen/harness-generation';
import { createModelRouter, type ReasoningLevel } from '@seihouse/library/model-router-server';
import { requireTextModelKey, textModelProvider } from '../model-router/catalog';
import type { ResolvedHarnessGenerationConfig } from './config';

export interface HarnessTextGenerationRequest {
  systemInstruction: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  responseJsonSchema?: unknown;
  reasoningLevel?: ReasoningLevel;
}
export interface HarnessTextGenerationResult {
  rawProviderResponse: string;
  providerReceipt: HarnessProviderReceipt;
}
export interface HarnessTextModelProvider {
  readonly provider: 'gemini' | 'openrouter';
  readonly model: string;
  generate(request: HarnessTextGenerationRequest): Promise<HarnessTextGenerationResult>;
}

const estimateTokens = (value: string) => Math.max(1, Math.ceil(value.trim().length / 4));

class RoutedHarnessTextProvider implements HarnessTextModelProvider {
  readonly provider: 'gemini' | 'openrouter';
  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly reasoningEffort?: string,
  ) {
    const provider = textModelProvider(model);
    if (!provider) throw new Error(`Model '${model}' cannot generate text.`);
    this.provider = provider;
  }
  async generate(request: HarnessTextGenerationRequest): Promise<HarnessTextGenerationResult> {
    const startedAt = Date.now();
    try {
      const router = createModelRouter({
        credentials: { [this.provider]: this.apiKey },
        openRouterAttribution: { referer: 'https://dev.seaportal.world', title: 'SEIHouse Development' },
      });
      const result = await router.generate({
        capability: 'text', model: this.model, systemInstruction: request.systemInstruction,
        userPrompt: request.userPrompt, temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens, timeoutMs: request.timeoutMs,
        responseFormat: 'json', responseJsonSchema: request.responseJsonSchema,
        reasoningLevel: request.reasoningLevel ?? (this.reasoningEffort as ReasoningLevel | undefined),
      });
      if (result.capability !== 'text') throw new Error('Unexpected speech result.');
      const inputTokens = result.usage?.inputTokens ?? estimateTokens(`${request.systemInstruction}\n\n${request.userPrompt}`);
      const outputTokens = result.usage?.outputTokens ?? estimateTokens(result.text);
      return {
        rawProviderResponse: result.text,
        providerReceipt: {
          provider: this.provider, model: this.model, generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          usage: {
            source: result.usage ? 'reported' : 'estimated',
            inputTokens, outputTokens,
            totalTokens: result.usage?.totalTokens ?? inputTokens + outputTokens,
          },
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error';
      if (message.includes('exceeded the') && message.includes('second deadline')) {
        throw new Error(`The provider exceeded the Harness Generation ${Math.ceil(request.timeoutMs / 1000)} second deadline.`);
      }
      throw new Error(`${this.provider === 'gemini' ? 'Gemini' : 'OpenRouter'} Harness Generation failed: ${message}`);
    }
  }
}

export class GeminiHarnessTextProvider extends RoutedHarnessTextProvider {
  constructor(apiKey: string, model: string) { super(apiKey, model); }
}
export class OpenRouterHarnessTextProvider extends RoutedHarnessTextProvider {
  constructor(apiKey: string, model: string, reasoningEffort?: string) { super(apiKey, model, reasoningEffort); }
}

export const createHarnessTextProvider = (
  model: string,
  config: Pick<ResolvedHarnessGenerationConfig, 'keys' | 'reasoningEffort'>,
): HarnessTextModelProvider => {
  const apiKey = requireTextModelKey(model, config.keys);
  return textModelProvider(model) === 'openrouter'
    ? new OpenRouterHarnessTextProvider(apiKey, model, config.reasoningEffort)
    : new GeminiHarnessTextProvider(apiKey, model);
};

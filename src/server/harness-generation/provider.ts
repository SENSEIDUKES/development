import { GoogleGenAI } from '@google/genai';
import { type HarnessProviderReceipt } from '@seihouse/sen/harness-generation';
import { geminiHarnessModelId, type ResolvedHarnessGenerationConfig } from './config';
import { requireTextModelKey, textModelProvider } from '../model-router/catalog';
import { generateOpenRouterText } from '../model-router/openRouter';

export interface HarnessTextGenerationRequest {
  systemInstruction: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  responseJsonSchema?: unknown;
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

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

const estimateTokens = (value: string) => Math.max(1, Math.ceil(value.trim().length / 4));

export class GeminiHarnessTextProvider implements HarnessTextModelProvider {
  readonly provider = 'gemini' as const;
  readonly model: string;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(request: HarnessTextGenerationRequest): Promise<HarnessTextGenerationResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.client.models.generateContent({
        model: geminiHarnessModelId(this.model),
        contents: request.userPrompt,
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          responseMimeType: 'application/json',
          ...(request.responseJsonSchema ? { responseJsonSchema: request.responseJsonSchema } : {}),
          abortSignal: controller.signal,
        },
      });
      // Keep the provider text intact for the client's first durable raw
      // checkpoint. Acceptance may trim for usability, but diagnostics should
      // retain exactly what the provider returned.
      const rawProviderResponse = response.text ?? '';
      if (!rawProviderResponse.trim()) throw new Error('The configured model returned an empty response.');
      const metadata = response.usageMetadata as GeminiUsageMetadata | undefined;
      const reported = Number.isFinite(metadata?.promptTokenCount)
        && Number.isFinite(metadata?.candidatesTokenCount);
      const inputTokens = reported
        ? metadata!.promptTokenCount!
        : estimateTokens(`${request.systemInstruction}\n\n${request.userPrompt}`);
      const outputTokens = reported
        ? metadata!.candidatesTokenCount!
        : estimateTokens(rawProviderResponse);
      const totalTokens = reported && Number.isFinite(metadata?.totalTokenCount)
        ? metadata!.totalTokenCount!
        : inputTokens + outputTokens;
      return {
        rawProviderResponse,
        providerReceipt: {
          provider: this.provider,
          model: this.model,
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          usage: {
            source: reported ? 'reported' : 'estimated',
            inputTokens,
            outputTokens,
            totalTokens,
          },
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error';
      if (controller.signal.aborted) {
        throw new Error(`The provider exceeded the Harness Generation ${Math.ceil(request.timeoutMs / 1000)} second deadline.`);
      }
      throw new Error(`Gemini Harness Generation failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class OpenRouterHarnessTextProvider implements HarnessTextModelProvider {
  readonly provider = 'openrouter' as const;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly reasoningEffort?: string,
  ) {}

  async generate(request: HarnessTextGenerationRequest): Promise<HarnessTextGenerationResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const result = await generateOpenRouterText({
        apiKey: this.apiKey,
        model: this.model,
        systemInstruction: request.systemInstruction,
        userPrompt: request.userPrompt,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        responseFormat: 'json',
        responseJsonSchema: request.responseJsonSchema,
        abortSignal: controller.signal,
        reasoningEffort: this.reasoningEffort,
      });
      const inputTokens = result.usage?.inputTokens ?? estimateTokens(`${request.systemInstruction}\n\n${request.userPrompt}`);
      const outputTokens = result.usage?.outputTokens ?? estimateTokens(result.text);
      return {
        rawProviderResponse: result.text,
        providerReceipt: {
          provider: this.provider,
          model: this.model,
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          usage: {
            source: result.usage ? 'reported' : 'estimated',
            inputTokens,
            outputTokens,
            totalTokens: result.usage?.totalTokens ?? inputTokens + outputTokens,
          },
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error';
      if (controller.signal.aborted) {
        throw new Error(`The provider exceeded the Harness Generation ${Math.ceil(request.timeoutMs / 1000)} second deadline.`);
      }
      throw new Error(`OpenRouter Harness Generation failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Route a configured Harness model to its provider through the Model Router. */
export const createHarnessTextProvider = (
  model: string,
  config: Pick<ResolvedHarnessGenerationConfig, 'keys' | 'reasoningEffort'>,
): HarnessTextModelProvider => {
  const apiKey = requireTextModelKey(model, config.keys);
  return textModelProvider(model) === 'openrouter'
    ? new OpenRouterHarnessTextProvider(apiKey, model, config.reasoningEffort)
    : new GeminiHarnessTextProvider(apiKey, model);
};

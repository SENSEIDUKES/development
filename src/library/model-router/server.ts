import { GoogleGenAI } from '@google/genai';
import { geminiThinkingConfig } from './geminiThinking';
import { generateOpenRouterText } from './openRouter';
import {
  providerModelName,
  resolveReasoningLevel,
  textModelProvider,
  type ReasoningLevel,
} from './catalog';

export type { ModelCapability, ReasoningLevel } from './catalog';
export { CHAPTER_MODELS, IMAGE_MODELS, TTS_MODELS, AUDIO_MODELS, VIDEO_MODELS, THREE_D_MODELS, REASONING_LEVELS } from './catalog';
export { DEFAULT_CHAPTER_MODEL, DEFAULT_TTS_MODEL, MODEL_PROVIDERS, providerKey, providerModelName, resolveChapterModelRoute, resolveReasoningLevel, textModelProvider, textModelLabel, requireTextModelKey, missingKeyMessage, isMissingKeyMessage } from './catalog';
export type { ModelEnvironment, ModelProviderId, ModelStage, ModelReasoning, RoutedModel, ChapterModelRoute } from './catalog';
export { generateOpenRouterText } from './openRouter';
export type { OpenRouterTextRequest, OpenRouterTextResult } from './openRouter';
export { geminiThinkingConfig } from './geminiThinking';

export interface ModelRouterConfig {
  credentials: { gemini?: string; openrouter?: string; elevenlabs?: string };
  openRouterAttribution?: { referer?: string; title?: string };
  fetch?: typeof fetch;
  createGeminiClient?: (apiKey: string) => Pick<GoogleGenAI, 'models'>;
}

export interface TextGenerationRequest {
  capability: 'text';
  model: string;
  systemInstruction: string;
  userPrompt: string;
  /** Custom sampling for non-Gemini models only; Gemini uses provider defaults. */
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  responseFormat?: 'json' | 'text';
  responseJsonSchema?: unknown;
  reasoningLevel?: ReasoningLevel;
}

export interface SpeechGenerationRequest {
  capability: 'tts';
  model: string;
  text: string;
  voiceId: string;
  timeoutMs: number;
}

export type GenerationRequest = TextGenerationRequest | SpeechGenerationRequest;
export interface TokenUsage { inputTokens: number; outputTokens: number; totalTokens: number }
export type GenerationResult =
  | { capability: 'text'; provider: 'gemini' | 'openrouter'; model: string; text: string; usage?: TokenUsage }
  | { capability: 'tts'; provider: 'elevenlabs'; model: string; bytes: Uint8Array; mimeType: 'audio/mpeg' };

export class ModelRouterError extends Error {
  constructor(readonly code: 'unsupported-capability' | 'invalid-model' | 'missing-credential' | 'timeout' | 'output-limit' | 'provider-error', message: string) {
    super(message);
    this.name = 'ModelRouterError';
  }
}

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const isSpeechModel = (model: string) => /^[a-z0-9][a-z0-9._-]{1,79}$/iu.test(model);
const detail = (error: unknown) => error instanceof Error ? error.message : 'Unknown provider error';
const requireCredential = (value: string | undefined, name: string) => {
  if (!value?.trim()) throw new ModelRouterError('missing-credential', `${name} is not configured on the server.`);
  return value.trim();
};
const withTimeout = async <T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await run(controller.signal); }
  catch (error) {
    if (controller.signal.aborted) throw new ModelRouterError('timeout', `The provider exceeded the ${Math.ceil(timeoutMs / 1000)} second deadline.`);
    throw error;
  } finally { clearTimeout(timeout); }
};

export function createModelRouter(config: ModelRouterConfig) {
  const fetchImpl = config.fetch ?? fetch;
  const generate = async (request: GenerationRequest): Promise<GenerationResult> => {
    if (request.capability === 'text') {
      const provider = textModelProvider(request.model);
      if (!provider) throw new ModelRouterError('invalid-model', `Model '${request.model}' cannot generate text.`);
      const key = requireCredential(config.credentials[provider], provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENROUTER_API_KEY');
      if (provider === 'openrouter') {
        try {
          const result = await generateOpenRouterText({
            apiKey: key, model: request.model, systemInstruction: request.systemInstruction,
            userPrompt: request.userPrompt, temperature: request.temperature,
            maxOutputTokens: request.maxOutputTokens, responseFormat: request.responseFormat ?? 'text',
            responseJsonSchema: request.responseJsonSchema, timeoutMs: request.timeoutMs,
            reasoningEffort: request.reasoningLevel, attribution: config.openRouterAttribution,
            fetchImpl,
          });
          return { capability: 'text', provider, model: request.model, text: result.text, usage: result.usage };
        } catch (error) {
          const message = detail(error);
          if (message.includes('output token limit')) throw new ModelRouterError('output-limit', message);
          if ((error as Error)?.name === 'AbortError') throw new ModelRouterError('timeout', `The provider exceeded the ${Math.ceil(request.timeoutMs / 1000)} second deadline.`);
          throw new ModelRouterError('provider-error', message);
        }
      }
      try {
        return await withTimeout(request.timeoutMs, async signal => {
          const client = config.createGeminiClient?.(key) ?? new GoogleGenAI({ apiKey: key });
          const response = await client.models.generateContent({
            model: providerModelName(request.model), contents: request.userPrompt,
            config: {
              systemInstruction: request.systemInstruction,
              maxOutputTokens: request.maxOutputTokens,
              ...(request.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
              ...(request.responseJsonSchema ? { responseJsonSchema: request.responseJsonSchema } : {}),
              ...geminiThinkingConfig(resolveReasoningLevel(`google/${providerModelName(request.model)}`, request.reasoningLevel)),
              abortSignal: signal,
            },
          });
          if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
            throw new ModelRouterError('output-limit', 'Gemini stopped at the output token limit before the reply was complete.');
          }
          const text = response.text ?? '';
          if (!text.trim()) throw new ModelRouterError('provider-error', 'The configured model returned an empty response.');
          const usage = response.usageMetadata;
          return {
            capability: 'text' as const, provider, model: request.model, text,
            ...(Number.isFinite(usage?.promptTokenCount) && Number.isFinite(usage?.candidatesTokenCount) ? {
              usage: {
                inputTokens: usage!.promptTokenCount!, outputTokens: usage!.candidatesTokenCount!,
                totalTokens: Number.isFinite(usage!.totalTokenCount)
                  ? usage!.totalTokenCount!
                  : usage!.promptTokenCount! + usage!.candidatesTokenCount!,
              },
            } : {}),
          };
        });
      } catch (error) {
        if (error instanceof ModelRouterError) throw error;
        throw new ModelRouterError('provider-error', detail(error));
      }
    }
    if (request.capability === 'tts') {
      if (!isSpeechModel(request.model)) throw new ModelRouterError('invalid-model', `Model '${request.model}' cannot synthesize speech.`);
      const key = requireCredential(config.credentials.elevenlabs, 'ELEVENLABS_API_KEY');
      try {
        return await withTimeout(request.timeoutMs, async signal => {
          const endpoint = new URL(`/v1/text-to-speech/${encodeURIComponent(request.voiceId)}`, 'https://api.elevenlabs.io');
          endpoint.searchParams.set('output_format', 'mp3_44100_128');
          const response = await fetchImpl(endpoint, {
            method: 'POST', headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': key },
            body: JSON.stringify({ text: request.text, model_id: request.model }), signal,
          });
          if (!response.ok) throw new ModelRouterError('provider-error', `Voice provider returned HTTP ${response.status}.`);
          const length = Number(response.headers.get('content-length'));
          if (Number.isFinite(length) && length > MAX_AUDIO_BYTES) throw new ModelRouterError('provider-error', 'Voice provider returned an oversized artifact.');
          const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
          if (contentType && !contentType.startsWith('audio/')) throw new ModelRouterError('provider-error', 'Voice provider returned a non-audio response.');
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (!bytes.byteLength || bytes.byteLength > MAX_AUDIO_BYTES) throw new ModelRouterError('provider-error', 'Voice provider returned an invalid audio artifact.');
          return { capability: 'tts' as const, provider: 'elevenlabs' as const, model: request.model, bytes, mimeType: 'audio/mpeg' as const };
        });
      } catch (error) {
        if (error instanceof ModelRouterError) throw error;
        throw new ModelRouterError('provider-error', detail(error));
      }
    }
    throw new ModelRouterError('unsupported-capability', `Capability '${(request as { capability: string }).capability}' has no provider implementation.`);
  };
  return { generate };
}

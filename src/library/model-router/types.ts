import type { GoogleGenAI } from '@google/genai';
import type { ReasoningLevel } from './catalog';

export interface ModelRouterConfig {
  /** Explicit host opt-in; also requires a development runtime, never a deployment. */
  localDevelopment?: boolean;
  credentials: { gemini?: string; openrouter?: string; elevenlabs?: string; minimax?: string };
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

export interface ImageGenerationRequest {
  capability: 'image';
  /** An id from the Router's image list (`IMAGE_MODELS`). */
  model: string;
  prompt: string;
  /** The image's shape, such as `2:3` for a cover. */
  aspectRatio?: string;
  /** Images the model works from, such as a reader's photo (base64, as `data`). */
  referenceImages?: ImageInput[];
  timeoutMs: number;
}

export interface ImageInput { data: string; mimeType: string }

export interface VideoGenerationRequest {
  capability: 'video';
  model: string;
  prompt: string;
  /** Public URL or a provider-supported image data URL. Required for image-only models. */
  firstFrame?: string;
  durationSeconds?: number;
  resolution?: '480P' | '720P' | '768P' | '1080P' | '2K';
  aspectRatio?: string;
  /** Deadline for task submission, not for the asynchronous render. */
  timeoutMs: number;
}
export interface VideoTaskRequest { model: string; taskId: string; timeoutMs: number }
export interface VideoTaskResult {
  capability: 'video'; provider: 'minimax'; model: string; taskId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  /** Temporary provider download URL. The host owns durable storage. */
  url?: string;
}
export type GenerationRequest = TextGenerationRequest | SpeechGenerationRequest | ImageGenerationRequest | VideoGenerationRequest;
export interface TokenUsage { inputTokens: number; outputTokens: number; totalTokens: number }
export type GenerationResult =
  | { capability: 'text'; provider: 'gemini' | 'openrouter' | 'lmstudio' | 'minimax'; model: string; text: string; usage?: TokenUsage }
  | { capability: 'tts'; provider: 'elevenlabs'; model: string; bytes: Uint8Array; mimeType: 'audio/mpeg' }
  /** `data` is the image's bytes in base64, as the providers return them. */
  | { capability: 'image'; provider: 'gemini' | 'openrouter' | 'minimax'; model: string; data: string; mimeType: string }
  | VideoTaskResult;


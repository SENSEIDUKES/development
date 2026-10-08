import { createModelRouter, DEFAULT_IMAGE_MODEL, IMAGE_MODELS, ModelRouterError } from '@seihouse/library/model-router-server';
import { MODEL_PROVIDERS, providerKey, type ModelEnvironment } from '../model-router/catalog';
import { hasValidBearerToken } from '../shared/bearerToken';
import { developmentAccessToken } from '../shared/publicGenerationGuard';
import { parseAttachedImage } from '../shared/imageAttachments';
import { IMAGE_LAB_ASPECT_RATIOS, IMAGE_LAB_ATTACHMENT_LIMIT, IMAGE_LAB_PROMPT_LIMIT, IMAGE_LAB_TIMEOUT_MS } from './limits';

export interface ImageLabHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ImageLabHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ImageLabHttpDependencies {
  environment: ModelEnvironment;
  /** Tests supply the provider; the server uses the Model Router. */
  generate?: ReturnType<typeof createModelRouter>['generate'];
  onError?: (error: unknown) => void;
  /** One line per image: which model made it and how long it took. Never the prompt. */
  onAnswer?: (answer: { model: string; durationMs: number }) => void;
}

export { IMAGE_LAB_ASPECT_RATIOS, IMAGE_LAB_PROMPT_LIMIT, IMAGE_LAB_TIMEOUT_MS };

const errorResponse = (status: number, error: string): ImageLabHttpResponse => ({
  status, body: { error }, headers: { 'Cache-Control': 'no-store' },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * The Workshop's Image Lab: one image from a prompt the owner writes, to try
 * and refine image prompts. Any prompt can be sent, so only the owner's
 * Development access token may use it. The image model is the Router's (Nano
 * Banana 2 Lite when none is chosen); the reply is the image in base64, kept by
 * nobody.
 */
export async function handleImageLabHttp(request: ImageLabHttpRequest, dependencies: ImageLabHttpDependencies): Promise<ImageLabHttpResponse> {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'POST') return { ...errorResponse(405, 'Method not allowed.'), headers: { Allow: 'POST', 'Cache-Control': 'no-store' } };
  const token = developmentAccessToken(dependencies.environment);
  if (!token) return errorResponse(503, 'STORY_SEED_BLUEPRINT_ACCESS_TOKEN is not configured on the Development server.');
  if (!hasValidBearerToken(request, token)) return errorResponse(401, 'The Image Lab needs the development access token.');

  let parsed: unknown;
  try { parsed = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; }
  catch { return errorResponse(400, 'Invalid JSON request.'); }
  if (!isRecord(parsed) || typeof parsed.prompt !== 'string' || !parsed.prompt.trim()) return errorResponse(400, 'Write a prompt first.');
  const prompt = parsed.prompt.trim();
  if (prompt.length > IMAGE_LAB_PROMPT_LIMIT) return errorResponse(400, `A prompt may be up to ${IMAGE_LAB_PROMPT_LIMIT.toLocaleString('en')} characters.`);
  if (parsed.model !== undefined && typeof parsed.model !== 'string') return errorResponse(400, 'Choose an image model from the Model Router.');
  const aspectRatio = parsed.aspectRatio ?? '1:1';
  if (!IMAGE_LAB_ASPECT_RATIOS.includes(aspectRatio as never)) return errorResponse(400, `Choose a shape: ${IMAGE_LAB_ASPECT_RATIOS.join(', ')}.`);

  const attached = parsed.images ?? [];
  if (!Array.isArray(attached) || attached.length > IMAGE_LAB_ATTACHMENT_LIMIT) return errorResponse(400, `Attach up to ${IMAGE_LAB_ATTACHMENT_LIMIT} image.`);
  const referenceImages: Array<{ data: string; mimeType: string }> = [];
  for (const value of attached) {
    const read = parseAttachedImage(value);
    if ('error' in read) return errorResponse(read.tooLarge ? 413 : 400, read.error);
    referenceImages.push(read.image);
  }

  const model = (parsed.model as string | undefined) || DEFAULT_IMAGE_MODEL;
  const option = IMAGE_MODELS.find(item => item.id === model);
  if (!option || (option.provider !== 'gemini' && option.provider !== 'openrouter')) return errorResponse(400, `Model '${model}' cannot make images.`);
  const key = providerKey(dependencies.environment, option.provider);
  if (!key) return errorResponse(503, `${MODEL_PROVIDERS[option.provider].keyVariable} is not configured on the Development server.`);

  const generate = dependencies.generate ?? createModelRouter({ credentials: { [option.provider]: key } }).generate;
  const started = Date.now();
  try {
    const result = await generate({ capability: 'image', model, prompt, aspectRatio: aspectRatio as string, ...(referenceImages.length ? { referenceImages } : {}), timeoutMs: IMAGE_LAB_TIMEOUT_MS });
    if (result.capability !== 'image') throw new ModelRouterError('provider-error', 'The configured model returned no image.');
    const durationMs = Date.now() - started;
    dependencies.onAnswer?.({ model, durationMs });
    return { status: 200, body: { image: result.data, mimeType: result.mimeType, model, durationMs }, headers: { 'Cache-Control': 'no-store' } };
  } catch (error) {
    dependencies.onError?.(error);
    if (error instanceof ModelRouterError && error.code === 'timeout') {
      return errorResponse(502, `The image was still being made after ${Math.ceil(IMAGE_LAB_TIMEOUT_MS / 1000)} seconds, so it was stopped.`);
    }
    // The provider's own words (a refusal, for instance) help refine the prompt; they never carry the key.
    const detail = error instanceof Error ? error.message : 'Unknown failure';
    return errorResponse(502, `The image could not be made: ${detail}`);
  }
}

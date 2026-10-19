import { CHAPTER_MODELS, IMAGE_MODELS, VIDEO_MODELS, providerModelName, resolveReasoningLevel } from './catalog';
import { ModelRouterError } from './error';
import type { ImageGenerationRequest, TextGenerationRequest, VideoGenerationRequest, VideoTaskRequest, VideoTaskResult } from './types';

const ORIGIN = 'https://api.minimax.io';
interface Json {
  error?: unknown;
  base_resp?: { status_code?: number };
  choices?: Array<{ finish_reason?: string; error?: unknown; message?: { content?: unknown; refusal?: unknown } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  data?: { image_base64?: unknown[] };
  task_id?: unknown;
  task?: { model?: string; status?: string; content?: { url?: unknown } };
  status?: string;
  file_id?: unknown;
  file?: { download_url?: unknown };
}

/** Fixed provider origin; no provider error text or credentials are echoed. */
async function call(path: string, key: string, signal: AbortSignal, fetchImpl: typeof fetch, body?: object): Promise<Json> {
  let response: Response;
  try {
    response = await fetchImpl(`${ORIGIN}${path}`, {
      method: body ? 'POST' : 'GET', signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ModelRouterError('provider-error', 'Could not reach MiniMax.');
  }
  if (!response.ok) {
    // Only MiniMax's numeric error code is kept from the body (2013 is invalid parameters).
    const failed = await response.json().catch(() => undefined) as { base_resp?: { status_code?: unknown }; error?: { code?: unknown } } | undefined;
    const code = [failed?.base_resp?.status_code, failed?.error?.code].find(value => /^\d{1,6}$/.test(String(value ?? '')));
    throw new ModelRouterError('provider-error', `MiniMax returned HTTP ${response.status}${code !== undefined ? ` (code ${code})` : ''}. Check the key, model name, plan access and remaining quota.`);
  }
  let result: Json;
  try { result = await response.json(); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new ModelRouterError('provider-error', 'MiniMax returned an unreadable response.');
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new ModelRouterError('provider-error', 'MiniMax returned an invalid response.');
  if (result.error || (result.base_resp?.status_code !== undefined && result.base_resp.status_code !== 0)) {
    const code = Number.isInteger(result.base_resp?.status_code) ? ` (code ${result.base_resp!.status_code})` : '';
    throw new ModelRouterError('provider-error', `MiniMax rejected the request${code}. Check the key, plan access, input and remaining quota.`);
  }
  return result;
}

export async function generateMiniMaxText(request: TextGenerationRequest, key: string, signal: AbortSignal, fetchImpl: typeof fetch) {
  const model = providerModelName(request.model);
  if (!CHAPTER_MODELS.some(option => option.id === request.model && option.provider === 'minimax')) throw new ModelRouterError('invalid-model', 'Choose a MiniMax writer model from the Router.');
  // MiniMax does not document response_format/json_schema. Keep the host's
  // schema in the instructions; the existing host validator still decides validity.
  const instruction = request.responseFormat === 'json'
    ? `${request.systemInstruction}\nReturn only the JSON answer, without Markdown fences.${request.responseJsonSchema ? `\nThe answer must match this JSON schema: ${JSON.stringify(request.responseJsonSchema)}` : ''}`
    : request.systemInstruction;
  const reasoning = resolveReasoningLevel(request.model, request.reasoningLevel);
  const result = await call('/v1/chat/completions', key, signal, fetchImpl, {
    model, messages: [{ role: 'system', content: instruction }, { role: 'user', content: request.userPrompt }],
    temperature: request.temperature, max_completion_tokens: request.maxOutputTokens + 16_384,
    reasoning_split: true, stream: false,
    ...(reasoning ? { reasoning_effort: reasoning } : {}),
  });
  const choice = result.choices?.[0];
  if (choice?.finish_reason === 'length') throw new ModelRouterError('output-limit', 'MiniMax stopped at the output token limit before the reply was complete.');
  if (choice?.error || choice?.message?.refusal) throw new ModelRouterError('provider-error', 'MiniMax did not return an answer.');
  const text = choice?.message?.content;
  if (typeof text !== 'string' || !text.trim() || /^\s*<think>/i.test(text)) throw new ModelRouterError('provider-error', 'MiniMax returned no separate text answer.');
  const usage = result.usage;
  return { text, ...(Number.isFinite(usage?.prompt_tokens) && Number.isFinite(usage?.completion_tokens) ? { usage: {
    inputTokens: usage!.prompt_tokens!, outputTokens: usage!.completion_tokens!,
    totalTokens: Number.isFinite(usage!.total_tokens) ? usage!.total_tokens! : usage!.prompt_tokens! + usage!.completion_tokens!,
  } } : {}) };
}

export async function generateMiniMaxImage(request: ImageGenerationRequest, key: string, signal: AbortSignal, fetchImpl: typeof fetch) {
  if (!IMAGE_MODELS.some(option => option.id === request.model && option.provider === 'minimax')) throw new ModelRouterError('invalid-model', 'Choose a MiniMax image model from the Router.');
  if (!request.prompt.trim() || request.prompt.length > 1500) throw new ModelRouterError('invalid-model', 'MiniMax image prompts must contain 1–1,500 characters. Shorten the prompt and try again.');
  if (request.aspectRatio && !['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9'].includes(request.aspectRatio)) throw new ModelRouterError('invalid-model', 'MiniMax does not support this image aspect ratio.');
  if (request.model === 'minimax/image-01-live' && !request.referenceImages?.length) throw new ModelRouterError('invalid-model', 'MiniMax Image 01 Live requires a portrait reference. Choose Image 01 for text-only images.');
  if (request.referenceImages?.some(image => !['image/png', 'image/jpeg'].includes(image.mimeType) || !image.data
    || image.data.length >= 14 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
    || Buffer.from(image.data, 'base64').byteLength >= 10 * 1024 * 1024)) throw new ModelRouterError('invalid-model', 'MiniMax portrait references must be PNG or JPEG images under 10 MB.');
  const result = await call('/v1/image_generation', key, signal, fetchImpl, {
    model: providerModelName(request.model), prompt: request.prompt, response_format: 'base64', n: 1,
    ...(request.aspectRatio ? { aspect_ratio: request.aspectRatio } : {}),
    ...(request.referenceImages?.length ? { subject_reference: request.referenceImages.map(image => ({ type: 'character', image_file: `data:${image.mimeType};base64,${image.data}` })) } : {}),
  });
  const data = result.data?.image_base64?.[0];
  if (typeof data !== 'string' || !data || data.length > 10 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new ModelRouterError('provider-error', 'MiniMax returned no valid image.');
  // The API returns raw base64 without a MIME field. Identify the actual bytes.
  const bytes = Buffer.from(data, 'base64');
  const mimeType = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : undefined;
  if (!mimeType) throw new ModelRouterError('provider-error', 'MiniMax returned an unsupported image format.');
  return { data, mimeType };
}

const videoModel = (model: string) => {
  if (!VIDEO_MODELS.some(option => option.id === model && option.provider === 'minimax')) throw new ModelRouterError('invalid-model', 'Choose a MiniMax video model from the Router.');
  return providerModelName(model);
};
const httpsUrl = (value: unknown): string => {
  try { if (typeof value === 'string' && new URL(value).protocol === 'https:') return value; } catch { /* invalid provider output */ }
  throw new ModelRouterError('provider-error', 'MiniMax returned no valid video download URL.');
};

/** Submit once and return the task ID. Hosts query it without resubmitting or charging again. */
export async function createMiniMaxVideoTask(request: VideoGenerationRequest, key: string, signal: AbortSignal, fetchImpl: typeof fetch): Promise<VideoTaskResult> {
  const model = videoModel(request.model);
  const v2 = model === 'MiniMax-H3' || model === 'MiniMax-H3-Max';
  if (!request.prompt.trim() || request.prompt.length > (v2 ? 7000 : 2000)) throw new ModelRouterError('invalid-model', `MiniMax video prompts must contain 1–${v2 ? '7,000' : '2,000'} characters.`);
  const duration = request.durationSeconds ?? 6;
  const resolution = request.resolution ?? (v2 || model.startsWith('MiniMax-Hailuo') ? '768P' : '720P');
  let body: object;
  if (v2) {
    if (!Number.isInteger(duration) || duration < (model === 'MiniMax-H3-Max' ? 5 : 4) || duration > 15
      || !(model === 'MiniMax-H3-Max' ? ['480P', '768P'] : ['768P', '2K']).includes(resolution)) throw new ModelRouterError('invalid-model', 'This H3 model does not support the requested duration or resolution.');
    if (request.aspectRatio && !['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'].includes(request.aspectRatio)) throw new ModelRouterError('invalid-model', 'H3 does not support this video aspect ratio.');
    body = { model, content: [{ type: 'text', text: request.prompt }, ...(request.firstFrame ? [{ type: 'image_url', image_url: { url: request.firstFrame }, role: 'first_frame' }] : [])], duration, resolution, ratio: request.firstFrame ? 'adaptive' : request.aspectRatio ?? '16:9' };
  } else {
    const imageOnly = model.startsWith('I2V-') || model.endsWith('-Fast') || model === 'S2V-01';
    if (imageOnly && !request.firstFrame) throw new ModelRouterError('invalid-model', 'This MiniMax video model requires a reference image.');
    if (model.startsWith('T2V-') && request.firstFrame) throw new ModelRouterError('invalid-model', 'This MiniMax video model accepts text only.');
    if (request.aspectRatio) throw new ModelRouterError('invalid-model', 'Only H3 models accept an explicit video aspect ratio.');
    const hailuo = model.startsWith('MiniMax-Hailuo');
    if (![6, ...(hailuo ? [10] : [])].includes(duration) || !(hailuo ? ['768P', '1080P'] : ['720P']).includes(resolution) || (duration === 10 && resolution === '1080P')) throw new ModelRouterError('invalid-model', 'This MiniMax video model does not support the requested duration or resolution.');
    body = { model, prompt: request.prompt, ...(model === 'S2V-01' ? { subject_reference: [{ type: 'character', image: [request.firstFrame] }] } : { duration, resolution, ...(request.firstFrame ? { first_frame_image: request.firstFrame } : {}) }) };
  }
  const result = await call(v2 ? '/v2/video_generation' : '/v1/video_generation', key, signal, fetchImpl, body);
  if (typeof result.task_id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(result.task_id)) throw new ModelRouterError('provider-error', 'MiniMax returned no video task ID.');
  return { capability: 'video', provider: 'minimax', model: request.model, taskId: result.task_id, status: 'queued' };
}

export async function queryMiniMaxVideoTask(request: VideoTaskRequest, key: string, signal: AbortSignal, fetchImpl: typeof fetch): Promise<VideoTaskResult> {
  const model = videoModel(request.model);
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(request.taskId)) throw new ModelRouterError('invalid-model', 'Provide the MiniMax video task ID.');
  const v2 = model === 'MiniMax-H3' || model === 'MiniMax-H3-Max';
  const result = await call(v2 ? `/v2/query/video_generation/${encodeURIComponent(request.taskId)}` : `/v1/query/video_generation?task_id=${encodeURIComponent(request.taskId)}`, key, signal, fetchImpl);
  const task = v2 ? result.task : result;
  const states: Record<string, VideoTaskResult['status']> = { queued: 'queued', running: 'running', succeeded: 'succeeded', failed: 'failed', cancelled: 'cancelled', Preparing: 'queued', Queueing: 'queued', Processing: 'running', Success: 'succeeded', Fail: 'failed' };
  if (v2 && result.task?.model && result.task.model !== model) throw new ModelRouterError('provider-error', 'The MiniMax task belongs to a different video model.');
  const status = task?.status && Object.hasOwn(states, task.status) ? states[task.status] : undefined;
  if (!status) throw new ModelRouterError('provider-error', 'MiniMax returned an unknown video task state.');
  const common = { capability: 'video' as const, provider: 'minimax' as const, model: request.model, taskId: request.taskId, status };
  if (status !== 'succeeded') return common;
  if (v2) return { ...common, url: httpsUrl(result.task?.content?.url) };
  if (typeof result.file_id !== 'string' || !/^\d+$/.test(result.file_id)) throw new ModelRouterError('provider-error', 'MiniMax returned no video file ID.');
  const file = await call(`/v1/files/retrieve?file_id=${encodeURIComponent(result.file_id)}`, key, signal, fetchImpl);
  return { ...common, url: httpsUrl(file.file?.download_url) };
}

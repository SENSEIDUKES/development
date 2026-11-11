import { providerModelName, resolveReasoningLevel } from './catalog';
import { ModelRouterError } from './error';
import type { ImageGenerationRequest, TextGenerationRequest, TokenUsage } from './types';

/** Keep credentials and provider response bodies out of errors sent to the host. */
async function call(path: string, key: string, init: RequestInit, fetchImpl: typeof fetch): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(`https://api.openai.com/v1/${path}`, {
      ...init, headers: { ...init.headers, Authorization: `Bearer ${key}` },
    });
  } catch {
    throw new ModelRouterError('provider-error', 'Could not reach OpenAI.');
  }
  if (!response.ok) throw new ModelRouterError('provider-error', `OpenAI returned HTTP ${response.status}. Check the key, model access and remaining credit.`);
  return response;
}

/** Responses supports the current writing models, including Responses-only Pro models. */
export async function generateOpenAIText(
  request: TextGenerationRequest, key: string, signal: AbortSignal, fetchImpl: typeof fetch,
): Promise<{ text: string; usage?: TokenUsage }> {
  const effort = resolveReasoningLevel(request.model, request.reasoningLevel);
  // Keep the complete host schema, including open objects and exact paragraph counts.
  // These are not all supported by strict Structured Outputs. Host validation remains authoritative.
  const instructions = request.responseFormat === 'json'
    ? `${request.systemInstruction}\nReturn only JSON, without Markdown fences.${request.responseJsonSchema ? `\nThe answer must match this JSON schema: ${JSON.stringify(request.responseJsonSchema)}` : ''}`
    : request.systemInstruction;
  const response = await call('responses', key, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: providerModelName(request.model), instructions, input: request.userPrompt,
      max_output_tokens: request.maxOutputTokens, store: false,
      ...(effort ? { reasoning: { effort } } : {}),
      // Custom sampling is rejected by reasoning models; use provider defaults.
    }),
  }, fetchImpl);
  const body = await response.json() as {
    status?: string; incomplete_details?: { reason?: string };
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  };
  if (body.status === 'incomplete' && body.incomplete_details?.reason === 'max_output_tokens') {
    throw new ModelRouterError('output-limit', 'OpenAI stopped at the output token limit before the reply was complete.');
  }
  if (body.status !== 'completed') throw new ModelRouterError('provider-error', 'OpenAI did not complete the response.');
  const content = (body.output ?? []).filter(item => item.type === 'message').flatMap(item => item.content ?? []);
  if (content.some(part => part.type === 'refusal')) throw new ModelRouterError('provider-error', 'OpenAI declined this request.');
  const text = content.filter(part => part.type === 'output_text').map(part => part.text ?? '').join('');
  if (!text.trim()) throw new ModelRouterError('provider-error', 'OpenAI returned an empty response.');
  const usage = body.usage;
  return { text, ...(Number.isFinite(usage?.input_tokens) && Number.isFinite(usage?.output_tokens) ? {
    usage: { inputTokens: usage!.input_tokens!, outputTokens: usage!.output_tokens!,
      totalTokens: Number.isFinite(usage!.total_tokens) ? usage!.total_tokens! : usage!.input_tokens! + usage!.output_tokens! },
  } : {}) };
}

/** One image, through the existing cover/portrait storage path. References use the edits endpoint. */
export async function generateOpenAIImage(
  request: ImageGenerationRequest, key: string, signal: AbortSignal, fetchImpl: typeof fetch,
): Promise<{ data: string; mimeType: string }> {
  const ratio = request.aspectRatio ?? '1:1';
  const match = /^(\d+):(\d+)$/.exec(ratio);
  if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0) throw new ModelRouterError('invalid-model', 'Choose a valid image aspect ratio.');
  const size = Number(match[1]) === Number(match[2]) ? '1024x1024' : Number(match[1]) > Number(match[2]) ? '1536x1024' : '1024x1536';
  const fields = { model: providerModelName(request.model), prompt: request.prompt, size, output_format: 'png', quality: 'medium' };
  const references = request.referenceImages ?? [];
  if (references.length > 16) throw new ModelRouterError('invalid-model', 'OpenAI accepts at most 16 reference images.');
  let body: BodyInit;
  let headers: Record<string, string> = {};
  if (references.length) {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.set(name, value);
    for (const [index, image] of references.entries()) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType) || !image.data || image.data.length > 10 * 1024 * 1024
        || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)) throw new ModelRouterError('invalid-model', 'Provide a PNG, JPEG or WebP reference image under 7.5 MB.');
      let bytes: Uint8Array<ArrayBuffer>;
      try { bytes = Uint8Array.from(atob(image.data), char => char.charCodeAt(0)); }
      catch { throw new ModelRouterError('invalid-model', 'Provide a valid base64 reference image.'); }
      form.append('image[]', new Blob([bytes], { type: image.mimeType }), `reference-${index}.${image.mimeType.split('/')[1]}`);
    }
    body = form;
  } else {
    headers = { 'Content-Type': 'application/json' };
    body = JSON.stringify({ ...fields, n: 1 });
  }
  const response = await call(references.length ? 'images/edits' : 'images/generations', key, { method: 'POST', signal, headers, body }, fetchImpl);
  const result = await response.json() as { data?: Array<{ b64_json?: string }> };
  const data = result.data?.[0]?.b64_json;
  if (!data || data.length > 10 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new ModelRouterError('provider-error', 'OpenAI returned an invalid or oversized image.');
  }
  return { data, mimeType: 'image/png' };
}

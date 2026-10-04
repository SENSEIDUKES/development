import { CHAPTER_MODELS, providerModelName } from './catalog';

const OPENROUTER_CHAT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Reasoning models (GPT-6 Luna, for example) spend hidden reasoning tokens from
 * the same completion budget as the visible reply. This headroom keeps a full
 * response from being cut off by its own thinking.
 */
const REASONING_HEADROOM_TOKENS = 16_384;

export interface OpenRouterTextRequest {
  apiKey: string;
  /** Router model id (`openrouter/openai/gpt-6-luna`) or a bare OpenRouter model name. */
  model: string;
  systemInstruction: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  responseFormat: 'json' | 'text';
  responseJsonSchema?: unknown;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  /** Optional reasoning effort for models that support it (`low`, `medium`, `high`). */
  reasoningEffort?: string;
  attribution?: { referer?: string; title?: string };
  fetchImpl?: typeof fetch;
}

export interface OpenRouterTextResult {
  text: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

interface OpenRouterChatChoice {
  message?: { content?: string | null; reasoning?: string | null; refusal?: string | null };
  finish_reason?: string | null;
  native_finish_reason?: string | null;
  /** A provider failure OpenRouter reports inside an otherwise successful reply. */
  error?: { message?: string; code?: number | string };
}

interface OpenRouterChatResponse {
  /** The provider OpenRouter routed this call to. */
  provider?: string;
  choices?: OpenRouterChatChoice[];
  usage?: {
    prompt_tokens?: number; completion_tokens?: number; total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string; code?: number | string };
}

/**
 * Why a reply came back with no answer, from what the reply itself says:
 * the provider OpenRouter chose, how it finished, and where its tokens went.
 * It never repeats the reply's own words, a refusal's or a provider error's
 * text included (they can quote the story): only their kind and size.
 */
const emptyReplyMessage = (body: OpenRouterChatResponse | undefined, choice: OpenRouterChatChoice | undefined): string => {
  const reasoning = choice?.message?.reasoning?.trim() ?? '';
  const facts = [
    body?.provider ? `provider ${body.provider}` : undefined,
    `finish ${choice?.native_finish_reason || choice?.finish_reason || 'none'}`,
    Number.isFinite(body?.usage?.completion_tokens) ? `${body!.usage!.completion_tokens} output tokens` : undefined,
    Number.isFinite(body?.usage?.completion_tokens_details?.reasoning_tokens)
      ? `${body!.usage!.completion_tokens_details!.reasoning_tokens} of them reasoning` : undefined,
    reasoning ? `${reasoning.length} characters of reasoning${reasoning.startsWith('{') ? ' that begin like the JSON answer' : ''}` : 'no reasoning text',
  ].filter(Boolean).join(', ');
  if (choice?.error) {
    const code = typeof choice.error.code === 'number' ? ` with code ${choice.error.code}` : '';
    return `The provider failed during the reply${code} (${facts}).`;
  }
  if (choice?.message?.refusal?.trim()) return `The model refused to answer (${facts}).`;
  return `The configured model returned an empty response (${facts}).`;
};

/** The catalog's OpenRouter entry for a router id or a bare OpenRouter name. */
const catalogEntry = (model: string) => {
  const sent = providerModelName(model);
  return CHAPTER_MODELS.find(option => option.provider === 'openrouter' && providerModelName(option.id) === sent);
};

const responseFormat = (request: OpenRouterTextRequest) => {
  if (request.responseFormat !== 'json') return undefined;
  // Non-strict: the Harness schemas are written for Gemini and mark most
  // fields optional, which OpenAI strict mode rejects.
  return request.responseJsonSchema
    ? { type: 'json_schema', json_schema: { name: 'response', strict: false, schema: request.responseJsonSchema } }
    : { type: 'json_object' };
};

/** One chat-completion call through OpenRouter. The key never leaves the server. */
export async function generateOpenRouterText(request: OpenRouterTextRequest): Promise<OpenRouterTextResult> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  request.abortSignal?.addEventListener('abort', forwardAbort, { once: true });
  const timeout = request.timeoutMs ? setTimeout(forwardAbort, request.timeoutMs) : undefined;
  try {
    const format = responseFormat(request);
    const response = await (request.fetchImpl ?? fetch)(OPENROUTER_CHAT_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json',
        ...(request.attribution?.referer ? { 'HTTP-Referer': request.attribution.referer } : {}),
        ...(request.attribution?.title ? { 'X-Title': request.attribution.title } : {}),
      },
      body: JSON.stringify({
        model: providerModelName(request.model),
        messages: [
          { role: 'system', content: request.systemInstruction },
          { role: 'user', content: request.userPrompt },
        ],
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens + REASONING_HEADROOM_TOKENS,
        ...(format ? { response_format: format } : {}),
        ...(request.reasoningEffort ? { reasoning: { effort: request.reasoningEffort } } : {}),
        ...(catalogEntry(request.model)?.fastestProvider ? { provider: { sort: 'throughput' } } : {}),
      }),
    });
    // OpenRouter answers 200 at once and holds the reply open while the model
    // writes, so a deadline that passes mid-reply lands here, never at fetch.
    // It is a timeout, not an empty reply.
    let body: OpenRouterChatResponse | undefined;
    try {
      body = await response.json() as OpenRouterChatResponse;
    } catch (error) {
      const aborted = controller.signal.aborted && (error === controller.signal.reason || (error as Error | undefined)?.name === 'AbortError');
      if (aborted) throw Object.assign(new Error('The OpenRouter reply did not finish before the deadline.'), { name: 'AbortError' });
      if (response.ok) throw new Error(`OpenRouter's reply could not be read: ${error instanceof Error ? error.message : 'unknown error'}.`);
    }
    if (!response.ok || body?.error) {
      const detail = body?.error?.message ?? response.statusText;
      throw new Error(`OpenRouter ${response.status}: ${detail}`);
    }
    const choice = body?.choices?.[0];
    const text = choice?.message?.content ?? '';
    if (choice?.finish_reason === 'length') {
      throw new Error('OpenRouter stopped at the output token limit before the reply was complete.');
    }
    if (!text.trim()) throw new Error(emptyReplyMessage(body, choice));
    const usage = body?.usage;
    const reported = Number.isFinite(usage?.prompt_tokens) && Number.isFinite(usage?.completion_tokens);
    return {
      text,
      ...(reported ? {
        usage: {
          inputTokens: usage!.prompt_tokens!,
          outputTokens: usage!.completion_tokens!,
          totalTokens: usage!.total_tokens ?? usage!.prompt_tokens! + usage!.completion_tokens!,
        },
      } : {}),
    };
  } finally {
    if (timeout) clearTimeout(timeout);
    request.abortSignal?.removeEventListener('abort', forwardAbort);
  }
}

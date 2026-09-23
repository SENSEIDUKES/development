import { providerModelName } from './catalog';

const OPENROUTER_CHAT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Reasoning models (GPT-6 Luna, for example) spend hidden reasoning tokens from
 * the same completion budget as the visible reply. This headroom keeps a full
 * chapter from being cut off by its own thinking.
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
}

export interface OpenRouterTextResult {
  text: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string; code?: number | string };
}

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
    const response = await fetch(OPENROUTER_CHAT_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dev.seaportal.world',
        'X-Title': 'SEIHouse Development',
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
      }),
    });
    const body = await response.json().catch(() => undefined) as OpenRouterChatResponse | undefined;
    if (!response.ok || body?.error) {
      const detail = body?.error?.message ?? response.statusText;
      throw new Error(`OpenRouter ${response.status}: ${detail}`);
    }
    const choice = body?.choices?.[0];
    const text = choice?.message?.content ?? '';
    if (choice?.finish_reason === 'length') {
      throw new Error('OpenRouter stopped at the output token limit before the reply was complete.');
    }
    if (!text.trim()) throw new Error('The configured model returned an empty response.');
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

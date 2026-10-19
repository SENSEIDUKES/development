import Anthropic from '@anthropic-ai/sdk';
import { CHAPTER_MODELS, providerModelName, resolveReasoningLevel } from './catalog';
import { ModelRouterError } from './error';
import type { TextGenerationRequest, TokenUsage } from './types';

/** The most a Claude reply may hold; thinking counts toward it. */
const MAX_TOKENS = 128_000;
/** Room for thinking beside the answer. Low effort keeps it short. */
const THINKING_ROOM = 16_384;
/**
 * Server-side fallback reruns a policy decline on Anthropic's recommended model in
 * the same call. Haiku 5.5 has no fallback, so it is not sent there.
 */
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-1']);
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/** Safe text for an SDK error: status and, for a bad request, the API's reason. Never the key. */
const failure = (error: unknown): ModelRouterError => {
  if (error instanceof Anthropic.APIConnectionError) return new ModelRouterError('provider-error', 'Could not reach Anthropic.');
  if (error instanceof Anthropic.APIError) {
    const reason = error instanceof Anthropic.BadRequestError ? `: ${error.message.slice(0, 300)}` : '';
    return new ModelRouterError('provider-error', `Anthropic returned HTTP ${error.status}${reason}. Check the key, model access and remaining credit.`);
  }
  return new ModelRouterError('provider-error', 'Anthropic did not return an answer.');
};

/**
 * One Claude call through the official SDK, streamed so a full chapter never
 * meets the SDK's non-streaming limit. Claude takes no custom sampling, so the
 * request's temperature is not sent. Thinking is always on; the Router's
 * reasoning level is sent as `output_config.effort`.
 */
export async function generateAnthropicText(
  request: TextGenerationRequest,
  client: Pick<Anthropic, 'beta'>,
  signal: AbortSignal,
): Promise<{ text: string; usage?: TokenUsage }> {
  if (!CHAPTER_MODELS.some(option => option.id === request.model && option.provider === 'anthropic')) {
    throw new ModelRouterError('invalid-model', 'Choose a Claude model from the Router.');
  }
  const model = providerModelName(request.model);
  // The Harness schemas use constraints (exact paragraph counts, open objects)
  // that Claude's strict JSON outputs refuse, so the schema goes in the
  // instructions and the host's validator stays authoritative, as for MiniMax.
  const system = request.responseFormat === 'json'
    ? `${request.systemInstruction}\nReturn only the JSON answer, without Markdown fences.${request.responseJsonSchema ? `\nThe answer must match this JSON schema: ${JSON.stringify(request.responseJsonSchema)}` : ''}`
    : request.systemInstruction;
  const level = resolveReasoningLevel(request.model, request.reasoningLevel);
  const effort = level && EFFORTS.has(level) ? level as Effort : undefined;
  const fallback = FALLBACK_MODELS.has(model);
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await client.beta.messages.stream({
      model,
      max_tokens: Math.min(MAX_TOKENS, request.maxOutputTokens + THINKING_ROOM),
      system,
      messages: [{ role: 'user', content: request.userPrompt }],
      ...(effort ? { output_config: { effort } } : {}),
      ...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    }, { signal }).finalMessage();
  } catch (error) {
    if (signal.aborted) throw error;
    throw failure(error);
  }
  if (message.stop_reason === 'refusal') {
    const category = message.stop_details?.category;
    throw new ModelRouterError('provider-error', `Claude declined this request${category ? ` (${category})` : ''}.`);
  }
  if (message.stop_reason === 'max_tokens') {
    throw new ModelRouterError('output-limit', 'Claude stopped at the output token limit before the reply was complete.');
  }
  // After a mid-reply fallback the partial and its continuation are both text blocks, in order.
  const text = message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('');
  if (!text.trim()) throw new ModelRouterError('provider-error', 'Claude returned no text answer.');
  const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = message.usage;
  const inputTokens = input_tokens + (cache_creation_input_tokens ?? 0) + (cache_read_input_tokens ?? 0);
  return { text, usage: { inputTokens, outputTokens: output_tokens, totalTokens: inputTokens + output_tokens } };
}

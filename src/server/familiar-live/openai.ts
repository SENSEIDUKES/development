/**
 * The Familiar's live talk on OpenAI GPT-Live. GPT-Live holds the spoken
 * conversation; a Responses model behind it (the delegated model) runs the
 * Familiar's functions. The browser's WebRTC offer comes here, and this server
 * exchanges it with OpenAI for the answer, so the API key never leaves it.
 */
import type { FamiliarLiveBrief } from '@seihouse/library/familiar';
import { familiarLiveActions, familiarLiveCharacter } from './prompt';

const LIVE_SESSIONS_URL = 'https://api.openai.com/v1/live/sessions';
/** A built-in voice the owner chose in the playground (2026-11-01); `FAMILIAR_LIVE_OPENAI_VOICE` changes it. */
const DEFAULT_VOICE = 'ballad';
/** Small and quick, and in OpenAI's free daily tokens when sharing is on; `FAMILIAR_LIVE_OPENAI_BACKEND` changes it. */
const DEFAULT_BACKEND = 'gpt-5.4-mini';
const SESSION_TIMEOUT_MS = 20_000;

/** The Familiar's functions, for the delegated Responses model. */
export function openAiLiveTools(brief: FamiliarLiveBrief) {
  return [
    ...(brief.topics.length ? [{
      type: 'function' as const,
      name: 'show_topic',
      description: 'Shows one of this page\'s topics on the reader\'s screen.',
      parameters: { type: 'object', properties: { topic_id: { type: 'string', enum: brief.topics.map(topic => topic.id) } }, required: ['topic_id'], additionalProperties: false },
    }] : []),
    ...(brief.actions.length ? [{
      type: 'function' as const,
      name: 'propose_action',
      description: 'Shows a change on the reader\'s screen for them to confirm. Changes nothing by itself.',
      parameters: {
        type: 'object',
        properties: {
          action_id: { type: 'string', enum: brief.actions.map(action => action.id) },
          input: { type: 'string', description: 'The reader\'s own words, for actions that need them; otherwise empty.' },
        },
        required: ['action_id'],
        additionalProperties: false,
      },
    }, {
      type: 'function' as const,
      name: 'answer_proposal',
      description: 'Answers the change shown on screen, only as the reader clearly said.',
      parameters: { type: 'object', properties: { answer: { type: 'string', enum: ['confirm', 'cancel', 'hear'] } }, required: ['answer'], additionalProperties: false },
    }] : []),
  ];
}

/**
 * The session: GPT-Live speaks as the Familiar and answers from its facts; it
 * hands the backend anything that shows or changes something on the page.
 */
export function openAiLiveSession(brief: FamiliarLiveBrief, options: { model: string; voice: string; backend: string }) {
  const tools = openAiLiveTools(brief);
  return {
    model: options.model,
    instructions: [
      ...familiarLiveCharacter(brief),
      tools.length
        ? 'Answer questions about the app yourself, from the facts above. When the reader wants a topic shown on their screen, or wants to change something on this page, delegate to the backend: it shows topics and puts changes on the screen for the reader to confirm. Tell the reader what the backend did, and never say a change is made before they confirm it.'
        : 'Answer questions about the app yourself, from the facts above. Nothing on this page can be changed by voice; if asked, say so kindly.',
    ].join('\n\n'),
    audio: { output: { voice: options.voice } },
    delegation: {
      type: 'responses' as const,
      responses: {
        model: options.backend,
        instructions: [
          `You are the backend for ${brief.familiar.name}, the reader's Familiar in Expanded Novels, on: ${brief.place}. Do only what the reader asked, through your functions, and return one short sentence the Familiar can say.`,
          familiarLiveActions(brief),
        ].join('\n\n'),
        tools,
        tool_choice: tools.length ? 'auto' : 'none',
        parallel_tool_calls: false,
        reasoning: { effort: 'low' },
      },
    },
  };
}

export interface OpenAiLiveResult { ok: true; body: { session: { id: string }; transport: { type: string; sdp: string } } }
export interface OpenAiLiveFailure { ok: false; status: number; detail: string }

/** Exchanges the browser's offer for OpenAI's answer, starting the conversation. */
export async function startOpenAiLive(
  input: { apiKey: string; brief: FamiliarLiveBrief; sdp: string; environment: Record<string, string | undefined>; model: string },
  request: typeof fetch = fetch,
): Promise<OpenAiLiveResult | OpenAiLiveFailure> {
  const session = openAiLiveSession(input.brief, {
    model: input.model,
    voice: input.environment.FAMILIAR_LIVE_OPENAI_VOICE?.trim() || DEFAULT_VOICE,
    backend: input.environment.FAMILIAR_LIVE_OPENAI_BACKEND?.trim() || DEFAULT_BACKEND,
  });
  const response = await request(LIVE_SESSIONS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, transport: { type: 'webrtc', sdp: input.sdp } }),
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string; code?: string } };
      if (parsed.error?.message) detail = `${parsed.error.code ? `${parsed.error.code}: ` : ''}${parsed.error.message}`;
    } catch { /* plain text */ }
    return { ok: false, status: response.status, detail: detail.replaceAll(input.apiKey, '[key]').slice(0, 300) };
  }
  const body = JSON.parse(text) as OpenAiLiveResult['body'];
  if (!body?.transport?.sdp) return { ok: false, status: 502, detail: 'OpenAI returned no connection answer.' };
  return { ok: true, body };
}

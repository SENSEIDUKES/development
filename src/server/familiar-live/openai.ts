/**
 * The Familiar's live talk on OpenAI GPT-Live. GPT-Live holds the spoken
 * conversation; a Responses model behind it (the delegated model) runs the
 * Familiar's functions. The browser's WebRTC offer comes here, and this server
 * exchanges it with OpenAI for the answer, so the API key never leaves it.
 */
import type { FamiliarLiveBrief } from '@seihouse/library/familiar';
import { familiarLiveActions, familiarLiveCharacter, familiarLiveDocsIndex } from './prompt';

const LIVE_SESSIONS_URL = 'https://api.openai.com/v1/live/sessions';
/** A built-in voice the owner chose in the playground (2026-11-01); `FAMILIAR_LIVE_OPENAI_VOICE` changes it. */
const DEFAULT_VOICE = 'ballad';
/** Small and quick, and in OpenAI's free daily tokens when sharing is on; `FAMILIAR_LIVE_OPENAI_BACKEND` changes it. */
const DEFAULT_BACKEND = 'gpt-5.4-mini';
const SESSION_TIMEOUT_MS = 20_000;

/** The Familiar's functions, for the delegated Responses model. */
export function openAiLiveTools(brief: FamiliarLiveBrief) {
  return [
    ...(brief.docs.length ? [{
      type: 'function' as const,
      name: 'look_up',
      description: 'Reads what the docs, or the record of the story the reader is in, say about something. Answers with the entries themselves, or with nothing when they do not cover it.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'The name the topic has in the list of docs, in that list\'s own language — not the reader\'s wording.' } },
        required: ['query'],
        additionalProperties: false,
      },
    }] : []),
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
        ? 'Answer from the facts above when they already cover the question. Everything else goes to the backend: it reads the docs for you, shows topics on their screen, and puts changes there for the reader to confirm. Send it any question the page\'s topics do not answer rather than guessing, say what it found in your own words, and never say a change is made before they confirm it.'
        : 'Answer questions about the app yourself, from the facts above. Nothing on this page can be changed by voice; if asked, say so kindly.',
    ].join('\n\n'),
    audio: { output: { voice: options.voice } },
    delegation: {
      type: 'responses' as const,
      responses: {
        model: options.backend,
        instructions: [
          `You are the backend for ${brief.familiar.name}, the reader's Familiar in NovelExpanded, on: ${brief.place}. Do only what the reader asked, through your functions, and return one short sentence the Familiar can say.`,
          // The voice repeats what comes back as documented fact, so the grounding rule has to hold here too:
          // nothing stops this model answering from its own memory and the Familiar speaking it as the docs.
          ...(brief.docs.length
            ? ['Answer a question about the app, or about the story the reader is in, only from what look_up returns. Never answer one from your own knowledge, and when look_up finds nothing, say that the docs and the story\'s record do not cover it instead of filling the gap.',
              // This model is the one that calls look_up, and a typed message reaches it without
              // passing the voice at all, so it needs the names itself. Without them it is told to
              // choose from a list it cannot see, and has to guess at the catalog's own wording.
              `The docs you can look up, by name:\n${familiarLiveDocsIndex(brief)}`]
            : []),
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

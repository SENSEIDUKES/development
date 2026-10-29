/**
 * The Familiar's live talk: the server mints a short-lived, single-use Gemini
 * Live token locked to the model, the Familiar's voice and its instructions,
 * built here from what the reader's page explains and does. The browser then
 * talks to Gemini directly; the API key never leaves the server. GET reports
 * whether live talk is configured, so the app can keep the device voice.
 */
import { GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai';
import type { FamiliarLiveBrief } from '@seihouse/library/familiar';
import { providerKey, providerModelName } from '../model-router/catalog';
import { liveModel } from '../model-router/status';
import { FAMILIAR_LIVE_SESSION_MS } from './limits';
import { docsCategories } from '../../workshop/docs/catalog';

export interface FamiliarLiveHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface FamiliarLiveHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/** The part of the Gemini client this route uses: minting tokens. */
export interface LiveTokenMinter {
  create(params: { config: Parameters<GoogleGenAI['authTokens']['create']>[0]['config'] }): Promise<{ name?: string }>;
}

export interface FamiliarLiveHttpDependencies {
  environment: Record<string, string | undefined>;
  tokens?: (apiKey: string) => LiveTokenMinter;
  now?: () => number;
  onError?: (error: unknown) => void;
}

/** Gemini's prebuilt voice for every Familiar until each has its own. */
const DEFAULT_VOICE = 'Puck';
/** A new conversation must open within this long of the token. */
const OPEN_WITHIN_MS = 60_000;

const noStore = { 'Cache-Control': 'no-store' } as const;
const reply = (status: number, body: unknown): FamiliarLiveHttpResponse => ({ status, body, headers: { ...noStore } });

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, field: string, max: number, required = true): string => {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > max) throw new Error(`${field} must be text of at most ${max} characters.`);
  return value.trim();
};
const ID = /^[\w-]{1,60}$/;
const id = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error(`${field} is not a valid id.`);
  return value;
};

/** Reads the brief strictly: only these fields, bounded, so a request cannot become a general-purpose prompt. */
export function parseFamiliarLiveBrief(value: unknown): FamiliarLiveBrief {
  const body = isRecord(value) && isRecord(value.brief) ? value.brief : undefined;
  if (!body) throw new Error('A live talk request needs a brief.');
  const familiar = isRecord(body.familiar) ? body.familiar : {};
  const language = text(body.language, 'language', 20);
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(language)) throw new Error('language is not a language tag.');
  if (!Array.isArray(body.topics) || body.topics.length > 20) throw new Error('topics must be a list of at most 20.');
  if (!Array.isArray(body.actions) || body.actions.length > 12) throw new Error('actions must be a list of at most 12.');
  return {
    familiar: { name: text(familiar.name, 'familiar.name', 60), description: text(familiar.description, 'familiar.description', 400, false) },
    place: text(body.place, 'place', 80),
    language,
    topics: body.topics.map((topic: unknown, index) => {
      if (!isRecord(topic)) throw new Error(`topics[${index}] is not a topic.`);
      return { id: id(topic.id, `topics[${index}].id`), label: text(topic.label, `topics[${index}].label`, 60), explanation: text(topic.explanation, `topics[${index}].explanation`, 800) };
    }),
    actions: body.actions.map((action: unknown, index) => {
      if (!isRecord(action)) throw new Error(`actions[${index}] is not an action.`);
      const detail = text(action.detail, `actions[${index}].detail`, 200, false);
      const input = isRecord(action.input) ? action.input : undefined;
      const maxLength = input?.maxLength;
      if (input && (typeof maxLength !== 'number' || !Number.isInteger(maxLength) || maxLength < 1 || maxLength > 2_000)) throw new Error(`actions[${index}].input.maxLength must be 1–2000.`);
      return {
        id: id(action.id, `actions[${index}].id`),
        label: text(action.label, `actions[${index}].label`, 60),
        ...(detail ? { detail } : {}),
        ...(input ? { input: { label: text(input.label, `actions[${index}].input.label`, 60), maxLength: maxLength as number } } : {}),
      };
    }),
  };
}

/**
 * The NovelExpanded Docs (`src/workshop/docs/catalog.ts`): the product's own
 * explanations, the Familiar's facts beyond the page. Only explained topics.
 */
export const familiarLiveDocs = (): string => docsCategories
  .flatMap(category => category.topics.filter(topic => topic.definition)
    .map(topic => `- ${topic.title} (${category.title}): ${topic.definition}${topic.howItFits ? ` ${topic.howItFits}` : ''}`))
  .join('\n');

/** Who the Familiar is and what it may say and do: its only facts are the page's topics and the NovelExpanded Docs. */
export function familiarLiveInstruction(brief: FamiliarLiveBrief): string {
  const docs = familiarLiveDocs();
  const { familiar, topics, actions } = brief;
  return [
    `You are ${familiar.name}, the reader's Familiar: a small spirit companion who lives in the Celestial Library, the reading app Expanded Novels.${familiar.description ? ` ${familiar.description}` : ''}`,
    `You talk with the reader out loud, like a friend beside them: warm, quick and natural. Keep answers to two or three short sentences unless they ask for more. Speak the reader's language (${brief.language}).`,
    `The reader is on: ${brief.place}.`,
    'Your only facts about the app are this page\'s topics and the NovelExpanded Docs below. Never invent features, prices or rules beyond them, and say plainly when you do not know. The docs are written by the people who build the app: explain them to a reader in plain words, and never talk about code, packages, the Workshop or development.',
    topics.length
      ? ['This page\'s topics:',
        ...topics.map(topic => `- ${topic.label} (${topic.id}): ${topic.explanation}`),
        'When showing a topic would help, call show_topic so it appears on their screen.'].join('\n')
      : 'This page has no topics of its own.',
    ...(docs ? [`The NovelExpanded Docs:\n${docs}`] : []),
    actions.length
      ? ['What you can do here, only through propose_action:',
        ...actions.map(action => `- ${action.id}: ${action.label}${action.detail ? `. ${action.detail}` : ''}${action.input ? `. Needs their words for "${action.input.label}", at most ${action.input.maxLength} characters, in input.` : ''}`),
        'propose_action never changes anything: it shows the change on the reader\'s screen to confirm. Never say you did something before it is confirmed.',
        'Call answer_proposal with confirm only when the reader clearly tells you to confirm or go ahead; with cancel when they decline; with hear when they want to hear it first.'].join('\n')
      : 'You cannot change anything on this page. If asked to, say so kindly.',
  ].join('\n\n');
}

const declarations = (brief: FamiliarLiveBrief) => [
  ...(brief.topics.length ? [{
    name: 'show_topic',
    description: 'Shows one of this place\'s topics on the reader\'s screen.',
    parameters: { type: 'OBJECT', properties: { topic_id: { type: 'STRING', enum: brief.topics.map(topic => topic.id) } }, required: ['topic_id'] },
  }] : []),
  ...(brief.actions.length ? [{
    name: 'propose_action',
    description: 'Shows a change on the reader\'s screen for them to confirm. Changes nothing by itself.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action_id: { type: 'STRING', enum: brief.actions.map(action => action.id) },
        input: { type: 'STRING', description: 'The reader\'s own words, for actions that need them; otherwise empty.' },
      },
      required: ['action_id'],
    },
  }, {
    name: 'answer_proposal',
    description: 'Answers the change shown on screen, only as the reader clearly said.',
    parameters: { type: 'OBJECT', properties: { answer: { type: 'STRING', enum: ['confirm', 'cancel', 'hear'] } }, required: ['answer'] },
  }] : []),
];

/**
 * The conversation's whole setup. The token locks it, so the browser cannot
 * change the model, voice, instructions or tools; the browser sends the same
 * setup when it opens the conversation.
 */
export function familiarLiveSetup(brief: FamiliarLiveBrief, model: string, voice: string) {
  const functionDeclarations = declarations(brief);
  const config = {
    responseModalities: [Modality.AUDIO],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    systemInstruction: { parts: [{ text: familiarLiveInstruction(brief) }] },
    ...(functionDeclarations.length ? { tools: [{ functionDeclarations }] } : {}),
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
  const { responseModalities, speechConfig, ...rest } = config;
  return {
    config: config as LiveConnectConfig,
    setup: { model: `models/${model}`, generationConfig: { responseModalities, speechConfig }, ...rest },
  };
}

export const handleFamiliarLiveHttp = async (
  request: FamiliarLiveHttpRequest,
  dependencies: FamiliarLiveHttpDependencies,
): Promise<FamiliarLiveHttpResponse> => {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'GET' && method !== 'POST') return { ...reply(405, { error: 'Method not allowed.' }), headers: { ...noStore, Allow: 'GET, POST' } };
  const apiKey = providerKey(dependencies.environment, 'gemini');
  if (method === 'GET') return reply(200, { configured: Boolean(apiKey) });
  if (!apiKey) return reply(503, { error: 'Live talk is not configured on this server.', code: 'unavailable' });

  let brief: FamiliarLiveBrief;
  try {
    brief = parseFamiliarLiveBrief(typeof request.body === 'string' ? JSON.parse(request.body) : request.body);
  } catch (error) {
    return reply(400, { error: error instanceof Error ? error.message : 'Invalid live talk request.' });
  }
  const model = providerModelName(liveModel(dependencies.environment));
  const voice = dependencies.environment.FAMILIAR_LIVE_VOICE?.trim() || DEFAULT_VOICE;
  const { config, setup } = familiarLiveSetup(brief, model, voice);
  const now = dependencies.now?.() ?? Date.now();
  const expiresAt = new Date(now + FAMILIAR_LIVE_SESSION_MS).toISOString();
  try {
    const tokens = dependencies.tokens?.(apiKey) ?? new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } }).authTokens;
    const token = await tokens.create({ config: {
      uses: 1,
      expireTime: expiresAt,
      newSessionExpireTime: new Date(now + OPEN_WITHIN_MS).toISOString(),
      // Locks the whole setup. Gemini refuses the field list the SDK writes for `lockAdditionalFields`.
      liveConnectConstraints: { model, config },
      httpOptions: { apiVersion: 'v1alpha' },
    } });
    if (!token.name) throw new Error('Gemini returned no token.');
    return reply(200, { token: token.name, setup, expiresAt });
  } catch (error) {
    dependencies.onError?.(error);
    return reply(502, { error: 'Your Familiar could not start talking. Try again.' });
  }
};

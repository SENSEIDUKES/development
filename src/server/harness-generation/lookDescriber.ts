import { CHARACTER_LOOK_TRAITS, THING_LOOK_TRAITS, type HarnessGenerationResponse, type HarnessLookRequest, type HarnessLookSubject } from '@seihouse/sen/harness-generation';
import { resolveConfiguredHarnessModel, type ResolvedHarnessGenerationConfig } from './config';
import { createHarnessTextProvider } from './provider';
import { HarnessGenerationExecutionError, type HarnessProviderFactory } from './execute';
import { lowestReasoningLevel, requireTextModelKey } from '../model-router/catalog';

/**
 * The look step's call: after a chapter commits, one short request with the
 * chapter's own model, at the least reasoning it accepts, writes down the look
 * of each character and thing the chapter tagged, from the passages that show
 * them. It reads passages, not the chapter, so it costs a small fraction of
 * the chapter itself. A look says what someone or something looks like, never
 * how to show it, so every medium (a portrait, a comic panel, a film) can use it.
 */

/** What the look step reads before the subjects. */
export const LOOK_DESCRIBER_INSTRUCTIONS = [
  'You write down how the characters and things of a novel look, so every later chapter and every picture of them keeps the same look. Each subject below is one character or thing from one chapter: the passage that shows it, and what is already known. Answer every subject.',
  'WHAT TO WRITE. Only what the passage, or the author\'s notes on a character, states can be seen: never invent a detail, and leave out a trait nothing states. For a first appearance, the passage and the author\'s notes together; where they differ, the passage wins, and conflict says how in one short sentence. For a change of look, start from the look before and change only what the passage changes; write the whole new look, not only the change.',
  `TRAITS. A character: ${CHARACTER_LOOK_TRAITS.join(', ')} (marks: scars, tattoos, wounds; gear: what they carry or wear that matters to their look). A thing: ${THING_LOOK_TRAITS.join(', ')}. Each trait in a few words.`,
  'summary: one line of at most 25 words, the first thing an artist needs to draw them.',
  'Write what they look like, never how to show them: no camera, framing, pose, lighting, mood or art style. Personality, history and power are not looks unless the passage shows them (glowing eyes, an aura that can be seen). Write in the story\'s language.',
].join('\n');

const text = { type: 'string' } as const;
const traitProperties = Object.fromEntries([...new Set([...CHARACTER_LOOK_TRAITS, ...THING_LOOK_TRAITS])].map(trait => [trait, text]));

/** One entry per subject. Non-strict, like every HARNESS schema: only id and summary are required. */
export const LOOK_DESCRIBER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    looks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: text,
          summary: { type: 'string', description: 'One line, at most 25 words.' },
          traits: { type: 'object', properties: traitProperties },
          conflict: { type: 'string', description: 'Only where the passage contradicts the author\'s notes: how, in one short sentence.' },
        },
        required: ['id', 'summary'],
      },
    },
  },
  required: ['looks'],
} as const;

/** How long the look step may take, at most: the reader is waiting for the chapter. */
export const LOOK_DESCRIBER_TIMEOUT_MS = 60_000;
/** Room for every subject's short look and a little thinking. */
export const LOOK_DESCRIBER_MAX_OUTPUT_TOKENS = 8_192;

const presentSubject = (subject: HarnessLookSubject) => [
  `SUBJECT ${subject.id} · ${subject.name} · a ${subject.entity} · ${subject.event === 'appears' ? 'first appearance' : `change of look: ${subject.change ?? 'not named'}`}`,
  `Passage: ${subject.passage}`,
  ...(subject.declared ? [`The author's notes: ${subject.declared}`] : []),
  ...(subject.previous ? [
    `Look before: ${subject.previous.summary}`,
    ...Object.entries(subject.previous.traits).map(([trait, value]) => `- ${trait}: ${value}`),
  ] : []),
].join('\n');

/** The look step's prompt: its instructions, then the chapter's subjects and nothing else. */
export const buildLookDescriberPrompt = (request: HarnessLookRequest) => ({
  systemInstruction: LOOK_DESCRIBER_INSTRUCTIONS,
  userPrompt: [
    `CHAPTER ${request.chapterNumber} · Language: ${request.language}`,
    ...request.subjects.map(presentSubject),
    'Return only the JSON object, with one entry in looks for every subject, by its id.',
  ].join('\n\n'),
  responseJsonSchema: LOOK_DESCRIBER_RESPONSE_SCHEMA,
});

export const executeLookDescription = async (
  request: HarnessLookRequest,
  config: ResolvedHarnessGenerationConfig,
  providerFactory?: HarnessProviderFactory,
): Promise<HarnessGenerationResponse> => {
  const model = resolveConfiguredHarnessModel(request.model, config);
  const apiKey = requireTextModelKey(model, config.keys);
  const provider = providerFactory ? providerFactory({ apiKey, model }) : createHarnessTextProvider(model, config);
  const prompt = buildLookDescriberPrompt(request);
  try {
    return await provider.generate({
      systemInstruction: prompt.systemInstruction,
      userPrompt: prompt.userPrompt,
      responseJsonSchema: prompt.responseJsonSchema,
      reasoningLevel: lowestReasoningLevel(model),
      temperature: 0,
      maxOutputTokens: Math.min(config.maxOutputTokens, LOOK_DESCRIBER_MAX_OUTPUT_TOKENS),
      timeoutMs: Math.min(config.timeoutMs, LOOK_DESCRIBER_TIMEOUT_MS),
    });
  } catch (error) {
    throw new HarnessGenerationExecutionError(error);
  }
};

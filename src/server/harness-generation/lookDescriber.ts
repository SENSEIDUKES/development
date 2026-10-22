import { CHARACTER_LOOK_TRAITS, THING_LOOK_TRAITS, type HarnessGenerationResponse, type HarnessLookRequest, type HarnessLookSubject } from '@seihouse/sen/harness-generation';
import { resolveConfiguredHarnessModel, type ResolvedHarnessGenerationConfig } from './config';
import { createHarnessTextProvider } from './provider';
import { HarnessGenerationExecutionError, type HarnessProviderFactory } from './execute';
import { lowestReasoningLevel, requireTextModelKey } from '../model-router/catalog';

/**
 * Writing a look, on demand (SENSEI, 2026-10-17; after each chapter before
 * then): when a picture, a comic or a game first asks for a character's or
 * thing's look, one short request with the model of the story's latest
 * chapter, at the least reasoning it accepts, writes it from every passage that
 * shows it (the writer's own words, kept by code). It reads those passages
 * only, never a chapter, and runs once until a new tag changes the look. A
 * look says what someone or something looks like, never how to show it, so
 * every medium (a portrait, a comic panel, a game) can use it.
 */

/** What the look step reads before the subjects. */
export const LOOK_DESCRIBER_INSTRUCTIONS = [
  'You write down how a character or thing of a novel looks: the core record every picture, comic and game made from the story draws it from. The subject below is one character or thing: every passage that shows it, in story order, and the author\'s notes on a character. Answer it.',
  'WHAT TO WRITE. Only what the passages, or the author\'s notes on a character, state can be seen: never invent a detail, and leave out a trait nothing states. The passages are the writer\'s own words and may also tell what others do: keep only how the subject looks. Where a passage and the author\'s notes differ, the passage wins, and conflict says how in one short sentence. Where a later passage changes the look, it wins: write the whole look as it stands after the last passage, not only the change.',
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

/** How long writing a look may take, at most: the reader is waiting for the picture. */
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

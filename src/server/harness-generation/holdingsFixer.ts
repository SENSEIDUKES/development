import type { HarnessGenerationResponse, HarnessHoldingsFixCase, HarnessHoldingsFixRequest } from '@seihouse/sen/harness-generation';
import { resolveConfiguredHarnessModel, type ResolvedHarnessGenerationConfig } from './config';
import { createHarnessTextProvider } from './provider';
import { HarnessGenerationExecutionError, type HarnessProviderFactory } from './execute';
import { lowestReasoningLevel, requireTextModelKey } from '../model-router/catalog';

/**
 * The Holdings fixer's call: after a chapter commits, one short request with
 * the chapter's own model, at the least reasoning it accepts, answers the
 * small cases the HARNESS found in the chapter's holdings. It reads cases, not
 * the chapter, so it costs a small fraction of the chapter itself.
 */

/** What the fixer reads before the cases. */
export const HOLDINGS_FIXER_INSTRUCTIONS = [
  'You keep a novel\'s holdings record true: what its characters have, use and know. Checks found small problems in one chapter. Each case below is one of them, never the whole chapter. Answer every case.',
  'TAGS. A tag sits on the sentence that shows a change: [[verb: Holder | Name]], with a count, a level or a reason after the name when it matters: [[lost: MC | Spirit Pill | 1 | used up]]. MC is the main character. Things: has, gained, lost, equipped, unequipped. Abilities: knows, learning, learned, improved (with the new level), sealed, unsealed. A new rank: [[rank: Holder | Rank]]. Use the exact name the record already gives a thing or ability.',
  'ANSWERS. Give one of the answers the case allows:',
  '- record: the prose is right and the record is wrong. In tags, write every tag the sentence should carry, or leave it empty when it should carry none. For a closing-list case, write the tag to add in tags and the id of the sentence it goes on in sentence. For two names, record means they are the same thing.',
  '- prose: the record is right and the sentence is wrong. In replacement, write that one sentence again in the story\'s language, changing as few words as you can; in tags, the tags it should carry.',
  '- fine: nothing needs changing. For two names, fine means they are different things.',
  '- major: the chapter contradicts the story more than one sentence or tag can fix. Nothing changes.',
  'Prefer record to prose. Never undo a change the reader\'s direction asked for. In reason, say why in one short sentence.',
].join('\n');

const text = { type: 'string' } as const;

/** One entry per case. Non-strict, like every HARNESS schema: only case, outcome and reason are required. */
export const HOLDINGS_FIXER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          case: text,
          outcome: { type: 'string', enum: ['record', 'prose', 'fine', 'major'] },
          tags: { type: 'string', description: 'record or prose: every tag the sentence should carry. Empty for none.' },
          sentence: { type: 'string', description: 'record on a closing-list case: the id of the sentence the tag goes on.' },
          replacement: { type: 'string', description: 'prose: the one corrected sentence.' },
          reason: text,
        },
        required: ['case', 'outcome', 'reason'],
      },
    },
  },
  required: ['fixes'],
} as const;

/** How long the fixer may take, at most: the reader is waiting for the chapter. */
export const HOLDINGS_FIXER_TIMEOUT_MS = 60_000;
/** Room for every case's short answer and a little thinking. */
export const HOLDINGS_FIXER_MAX_OUTPUT_TOKENS = 8_192;

const presentCase = (fix: HarnessHoldingsFixCase) => [
  `CASE ${fix.id} · answers: ${fix.answers.join(', ')}`,
  'Problems:',
  ...fix.problems.map(problem => `- ${problem}`),
  ...(fix.passage ? [
    ...(fix.passage.before ? [`Sentence before: ${fix.passage.before}`] : []),
    `Sentence: ${fix.passage.sentence}`,
    ...(fix.passage.after ? [`Sentence after: ${fix.passage.after}`] : []),
  ] : []),
  ...(fix.tags !== undefined ? [`Tags on the sentence: ${fix.tags || 'none'}`] : []),
  ...(fix.mentions?.length ? ['Sentences that name it:', ...fix.mentions.map(mention => `- ${mention.id}: ${mention.sentence}`)] : []),
  ...(fix.record?.length ? ['Record:', ...fix.record.map(line => `- ${line}`)] : []),
].join('\n');

/** The fixer's prompt: its instructions, then the chapter's cases and nothing else. */
export const buildHoldingsFixerPrompt = (request: HarnessHoldingsFixRequest) => ({
  systemInstruction: HOLDINGS_FIXER_INSTRUCTIONS,
  userPrompt: [
    [
      `CHAPTER ${request.chapterNumber} · Language: ${request.language}${request.mainCharacter ? ` · Main character: ${request.mainCharacter} (MC in tags)` : ''}`,
      ...(request.direction ? [`READER'S DIRECTION FOR THIS CHAPTER: ${request.direction}`] : []),
    ].join('\n'),
    ...request.cases.map(presentCase),
    'Return only the JSON object, with one entry in fixes for every case.',
  ].join('\n\n'),
  responseJsonSchema: HOLDINGS_FIXER_RESPONSE_SCHEMA,
});

export const executeHoldingsFix = async (
  request: HarnessHoldingsFixRequest,
  config: ResolvedHarnessGenerationConfig,
  providerFactory?: HarnessProviderFactory,
): Promise<HarnessGenerationResponse> => {
  const model = resolveConfiguredHarnessModel(request.model, config);
  const apiKey = requireTextModelKey(model, config.keys);
  const provider = providerFactory ? providerFactory({ apiKey, model }) : createHarnessTextProvider(model, config);
  const prompt = buildHoldingsFixerPrompt(request);
  try {
    return await provider.generate({
      systemInstruction: prompt.systemInstruction,
      userPrompt: prompt.userPrompt,
      responseJsonSchema: prompt.responseJsonSchema,
      reasoningLevel: lowestReasoningLevel(model),
      temperature: 0,
      maxOutputTokens: Math.min(config.maxOutputTokens, HOLDINGS_FIXER_MAX_OUTPUT_TOKENS),
      timeoutMs: Math.min(config.timeoutMs, HOLDINGS_FIXER_TIMEOUT_MS),
    });
  } catch (error) {
    throw new HarnessGenerationExecutionError(error);
  }
};

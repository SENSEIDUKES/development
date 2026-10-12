import {
  HARNESS_TAG_RULES, SEN_HOLDINGS_INSTRUCTIONS, SEN_SPEAKERS_INSTRUCTIONS,
  type HarnessChapterRereadRequest, type HarnessGenerationResponse,
} from '@seihouse/sen/harness-generation';
import { resolveConfiguredHarnessModel, type ResolvedHarnessGenerationConfig } from './config';
import { createHarnessTextProvider } from './provider';
import { HarnessGenerationExecutionError, type HarnessProviderFactory } from './execute';
import { lowestReasoningLevel, requireTextModelKey } from '../model-router/catalog';

/**
 * The reread's call: a chapter the reader changed in Create mode is read again
 * once, as the next chapter seals it. The model gets the chapter as the reader
 * left it and returns it word for word with the tags put back (the same tag
 * teaching the writer had), the main character's closing list and a fresh
 * recap. It writes no prose, at the least reasoning the model accepts.
 */

/** What the reread reads first: the job, then the tag teaching for the tags the chapter was written with. */
export const buildChapterRereadInstructions = (tags: HarnessChapterRereadRequest['tags']) => [
  'A reader has edited one chapter of their novel by hand. Read it again and put its tags back on the words they kept.',
  'Return every paragraph exactly as given, in the same order, word for word: add tags, and change, add or remove nothing else. Never join or split a paragraph.',
  'Then write the recap: two or three sentences on what happens in this chapter as it now reads.',
  ...(tags.speakers || tags.holdings ? [HARNESS_TAG_RULES] : []),
  ...(tags.speakers ? [SEN_SPEAKERS_INSTRUCTIONS] : []),
  ...(tags.holdings ? [SEN_HOLDINGS_INSTRUCTIONS] : []),
].join('\n\n');

/** The reply: the paragraphs with their tags, the recap and, with holdings, the closing list. */
export const chapterRereadResponseSchema = (request: Pick<HarnessChapterRereadRequest, 'paragraphs' | 'tags'>) => ({
  type: 'object',
  properties: {
    paragraphs: { type: 'array', items: { type: 'string' }, minItems: request.paragraphs.length, maxItems: request.paragraphs.length },
    recap: { type: 'string' },
    ...(request.tags.holdings ? { mainCharacterHoldings: { type: 'array', items: { type: 'string' } } } : {}),
  },
  required: ['paragraphs', 'recap', ...(request.tags.holdings ? ['mainCharacterHoldings'] : [])],
});

/** How long the reread may take: the reader is waiting for the next chapter. */
export const CHAPTER_REREAD_TIMEOUT_MS = 90_000;

export const buildChapterRereadPrompt = (request: HarnessChapterRereadRequest) => ({
  systemInstruction: buildChapterRereadInstructions(request.tags),
  userPrompt: [
    `CHAPTER ${request.chapterNumber} · Language: ${request.language}${request.mainCharacter ? ` · Main character: ${request.mainCharacter} (MC in tags)` : ''}`,
    `The chapter, as the reader left it, ${request.paragraphs.length} paragraphs:`,
    JSON.stringify(request.paragraphs),
    'Return only the JSON object.',
  ].join('\n\n'),
  responseJsonSchema: chapterRereadResponseSchema(request),
});

export const executeChapterReread = async (
  request: HarnessChapterRereadRequest,
  config: ResolvedHarnessGenerationConfig,
  providerFactory?: HarnessProviderFactory,
): Promise<HarnessGenerationResponse> => {
  const model = resolveConfiguredHarnessModel(request.model, config);
  const apiKey = requireTextModelKey(model, config.keys);
  const provider = providerFactory ? providerFactory({ apiKey, model }) : createHarnessTextProvider(model, config);
  const prompt = buildChapterRereadPrompt(request);
  try {
    return await provider.generate({
      systemInstruction: prompt.systemInstruction,
      userPrompt: prompt.userPrompt,
      responseJsonSchema: prompt.responseJsonSchema,
      reasoningLevel: lowestReasoningLevel(model),
      temperature: 0,
      // Room for the whole chapter again, with its tags.
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: Math.min(config.timeoutMs, CHAPTER_REREAD_TIMEOUT_MS),
    });
  } catch (error) {
    throw new HarnessGenerationExecutionError(error);
  }
};

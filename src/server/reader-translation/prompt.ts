import type { ReaderTranslationRequest } from '../../components/reader-chamber/shared/translation/contract';

/**
 * The machine-facing contract restated to the model. The client validator is
 * the enforcement; this is what makes compliance likely in the first place.
 */
const STRUCTURAL_RULES = [
  'Return one JSON object: { "title": string, "blocks": [ { "id": string, ... } ] }.',
  'Every block in the source must appear exactly once, addressed by its exact "id".',
  'Never invent, drop, merge, split, reorder, or reclassify a block.',
  'Copy every "id" through unchanged. Ids are identifiers, not text to translate.',
  'Reply with the same keys the source block used, and no others.',
  'Keep every list the same length, in the same order, as the source list.',
  'Never emit block types, JSON keys of your own, enum values, entity triggers,',
  'speaker identity keys, music, atmosphere or creature classifications, asset',
  'identifiers, URLs, audio routing, World Cue intents, tags, or technical metadata.',
  'Translate only the string values the source provides.',
].join('\n');

const glossarySection = (request: ReaderTranslationRequest): string => {
  if (!request.glossary?.length) return '';
  return [
    '',
    `TRANSLATION GLOSSARY REFERENCE (${request.targetLanguage}) — ${request.glossary.length} entries selected for this chapter`,
    'Use these renderings for the listed terms wherever they appear in reader-facing text.',
    ...request.glossary.map(entry => {
      const aliases = entry.aliases?.length ? ` [also: ${entry.aliases.join(', ')}]` : '';
      const note = entry.note ? ` — ${entry.note}` : '';
      return `- ${entry.term}${aliases} → ${entry.translation}${note}`;
    }),
  ].join('\n');
};

export interface ReaderTranslationPrompt {
  systemInstruction: string;
  userPrompt: string;
}

export const buildReaderTranslationPrompt = (
  request: ReaderTranslationRequest,
): ReaderTranslationPrompt => ({
  systemInstruction: [
    `You render an already-written chapter from ${request.sourceLanguage} into ${request.targetLanguage} for a reader.`,
    'The original chapter remains canonical and unchanged; you produce a display layer over it.',
    '',
    request.instructions.trim(),
    '',
    STRUCTURAL_RULES,
    glossarySection(request),
  ].filter(Boolean).join('\n'),
  userPrompt: [
    `Target language: ${request.targetLanguage}`,
    '',
    'READER-FACING CHAPTER MATERIAL (JSON):',
    JSON.stringify(request.source),
  ].join('\n'),
});

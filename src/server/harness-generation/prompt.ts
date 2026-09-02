import type { HarnessGenerationRequest } from '../../components/harness-generation/shared/types';

const presentFoundation = (request: HarnessGenerationRequest) => ({
  title: request.foundation.input.title,
  premise: request.foundation.input.premise,
  permanentInstructions: request.foundation.input.permanentInstructions,
  toneStyle: request.foundation.input.toneStyle,
  genre: request.foundation.input.genre,
  openingSituation: request.foundation.input.openingSituation,
  declaredCanon: request.foundation.input.declaredCanon,
  characters: request.foundation.input.characters,
  worldFacts: request.foundation.input.worldFacts,
  intendedDirection: request.foundation.input.intendedDirection,
});

/**
 * One creative call. The prompt deliberately excludes database identity,
 * numbering authority, Reader structures, and presentation contracts.
 */
export const buildHarnessGenerationPrompt = (request: HarnessGenerationRequest) => {
  const systemInstruction = [
    'You are an expert novelist writing the next complete chapter of an ongoing novel.',
    'The chapter prose is the primary deliverable. Write vivid, coherent, scene-driven prose that respects the supplied canon and prior chapter evidence.',
    'Return one JSON object only. Its required field is prose, a nonempty complete chapter. title and plan are optional. events is optional and, if used, contains short descriptions of meaningful changes.',
    'An event description may be brief. Do not invent ids, chapter numbers, ordering, persistence records, Codex records, cards, System Prompt payloads, Color Codes, Reader blocks, continuation tokens, provider metadata, or application schemas.',
    'Do not let event formatting displace the chapter itself. If uncertain about an event, omit it rather than fabricating precise mechanics.',
  ].join('\n\n');

  const userPrompt = [
    'AUTHOR STORY FOUNDATION',
    JSON.stringify(presentFoundation(request), null, 2),
    'COMMITTED STORY CONTEXT',
    JSON.stringify({
      currentStoryHead: {
        nextChapterNumber: request.context.storyHead.nextChapterNumber,
        hasCommittedChapter: Boolean(request.context.storyHead.lastCommittedChapterId),
      },
      priorChapters: request.context.committedChapters.map(chapter => ({
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        prose: chapter.prose,
        semanticEvents: chapter.events.map(event => ({
          description: event.description,
          ...(event.category ? { category: event.category } : {}),
          ...(event.subjects ? { subjects: event.subjects } : {}),
          ...(event.significance ? { significance: event.significance } : {}),
          ...(event.evidence ? { evidence: event.evidence } : {}),
          ...(event.requestedEffects ? { requestedEffects: event.requestedEffects } : {}),
        })),
      })),
      canonicalEvidence: request.context.canonicalContext?.records.map(record => ({
        kind: record.kind,
        label: record.label,
        evidence: record.evidence,
        confidence: record.confidence,
        facts: record.facts,
      })) ?? [],
      authorCorrections: request.context.canonicalContext?.corrections.map(correction => ({
        kind: correction.kind,
        reason: correction.reason,
        referenceLabel: correction.referenceLabel,
        replacement: correction.replacement,
      })) ?? [],
      deterministicHandoff: request.context.canonicalContext?.handoff ?? [],
    }, null, 2),
    'Write the next chapter now. Return only the requested JSON object.',
  ].join('\n\n');

  return { systemInstruction, userPrompt };
};

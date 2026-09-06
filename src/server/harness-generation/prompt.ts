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
  cast: request.foundation.input.cast,
  worldFacts: request.foundation.input.worldFacts,
  intendedDirection: request.foundation.input.intendedDirection,
  sourceSnapshot: request.foundation.input.sourceSnapshot,
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
    'Prepare only the context needed for this chapter, write it, and preserve its meaningful developments. No routine literary review, repeated critique, or mandatory full-novel plan is required.',
    'AUTHOR AUTHORITY: Apply persistent steering in order. The newest direction wins where directions conflict; unrelated earlier directions still apply. Future steering changes what happens next, not what already happened. Retain consequences of prior events unless a direction explicitly uses revise-history. Author corrections override the targeted interpretations.',
    'The Foundation, Blueprint, intendedDirection and any old plan are proposals wherever they concern future events. Adapt them to steering and committed developments. Never restore a planned enemy after the author makes them an ally. Past hostility may still have consequences without forcing renewed enmity.',
    'Preserve compact events for relationships, decisions, unresolved consequences, clues and exact mechanical changes. Include category, subjects and evidence when known. Later chapter evidence updates current state; older evidence explains history. Unresolved or conflicted interpretations are not established facts.',
    'Events may optionally carry semantic details: character {name, role, relationshipToMC, isMainCharacter}, speech {speaker, quote}, mechanics {subject, name, value, unit}. Only include details supported by this chapter. Use exact repeated names; distinguish a character role from relationship to the main character. Mark the main character only when established. Speech quote must be an exact unique substring of prose and speaker must be an established named character. Mechanical value is an exact absolute value (including zero), never an inferred delta; keep value and unit identical to the prose. Do not return application payloads.',
    'Every event needs a description. Put semantic objects INSIDE details, not at the event root. Example: {"description":"Mara has 16 sparks remaining.","category":"progression","subjects":["Mara"],"details":{"mechanics":{"subject":"Mara","name":"Sparks","value":"16","unit":"sparks"}}}. A mechanical subject names the owner, not the resource. Introduce each speaking character using a character event. Return current mechanical balances in events when prose changes them.',
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
        sourceId: record.id,
        sourceEventId: record.sourceEventId,
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
        targetRecordIds: correction.targetRecordIds,
        sourceEventId: correction.sourceEventId,
      })) ?? [],
      deterministicHandoff: request.context.canonicalContext?.handoff ?? [],
      persistentAuthorDirection: request.context.steering ?? [],
      committedDevelopments: request.context.developments ?? [],
      originalEvidenceLookups: request.context.lookups ?? [],
    }, null, 2),
    'AUTHOR DIRECTION FOR THE NEXT CHAPTER',
    request.context.steering?.length ? [
      'These are instructions to execute, not historical events or optional themes. Retain unrelated earlier directions; newest wins on conflict.',
      ...request.context.steering.map(direction => `${direction.mode === 'revise-history' ? 'EXPLICIT HISTORY REVISION' : 'FUTURE DIRECTION'} (effective Chapter ${direction.effectiveChapter}): ${direction.direction}`),
      `NEXT CHAPTER ASSIGNMENT: ${request.context.steering.at(-1)!.direction}`,
      'Make concrete progress on that assignment in this chapter; if already fulfilled, develop its consequences without repeating the completed action. If characters have moved away, show a plausible transition or new consequence that brings the requested action into the story. Do not repeat an old ending or departure in place of the requested action. Earlier prose remains historical evidence unless explicitly revised above.',
    ].join('\n') : 'Continue from committed developments and the Foundation.',
    'MECHANICAL CONTINUITY — DO NOT RESET RESOURCES',
    JSON.stringify(request.context.mechanicalContinuity ?? [], null, 2),
    'Each quantity above was observed in its source chapter. Subsequent transfers, spending, losses, or depletion take precedence over that old number. Never restore the Foundation opening balance, silently refill resources, or use an old owner after a transfer. If later evidence leaves the balance uncertain, establish it through the story before using it. Emit absolute balances for every affected owner when a transfer or depletion occurs, including zero. Preserve established names and units.',
    'Write the next chapter now. Return only the requested JSON object.',
  ].join('\n\n');

  return { systemInstruction, userPrompt };
};

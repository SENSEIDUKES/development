import { validateHardPinInputs } from '../../../narrative/storyDirection';
import { harnessArcContext, harnessStoryMode } from './arcState';
import { projectCanonicalState } from './canonicalProjection';
import { semanticReaderChanges } from './readerEdits';
import { GENERATION_PACKET_BUDGET, estimatePacketTokens } from './packetBudget';
import { cloneHarnessValue, defaultHarnessRuntime, type HarnessRuntime } from './ids';
import type { CurrentStoryProjection, HarnessStory, HarnessWorkspaceState, PacketSectionId, PacketSectionMeasurement, PreviouslyOnEntry, RhythmDirectionSection, StoryFoundationRevision, StoryInformationPacket } from '../../../narrative/generation';

const text = (value: string | undefined) => value?.trim() ? value.trim() : undefined;

/** The words of the reader's choice that should steer which canon is selected. */
const directionFocus = (direction: HarnessStory['nextChapterDirection']) =>
  !direction ? undefined : direction.choice.kind === 'reader' ? direction.choice.text : direction.choice.suggestion;

/**
 * Current Story Information: reads the active Foundation's stable domain
 * fields into one compact projection. The Story Seed snapshot, storage
 * identifiers, and generation diagnostics stay out of it.
 */
export const projectCurrentStory = (
  state: HarnessWorkspaceState,
  story: HarnessStory,
  foundation: StoryFoundationRevision,
): CurrentStoryProjection => {
  const input = foundation.input;
  const labels = new Map(state.canonicalRecords.filter(record => record.storyId === story.id).map(record => [record.id, record.label ?? record.facts.description ?? record.kind]));
  const corrections = state.corrections.filter(correction => correction.storyId === story.id)
    .reverse().sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .flatMap(correction => {
      // Reader edits without semantic meaning are presentation history, not canon.
      const semanticEdits = correction.readerEdit ? semanticReaderChanges(correction.readerEdit.changes) : undefined;
      if (correction.readerEdit && !semanticEdits?.length) return [];
      const targets = correction.targetRecordIds.map(id => String(labels.get(id) ?? id));
      return [{
        kind: correction.kind,
        reason: correction.reason,
        ...(targets.length ? { targets } : {}),
        ...(semanticEdits?.length ? { readerEdit: { chapterNumber: correction.readerEdit!.chapterNumber, changes: semanticEdits.map(change => ({
          path: change.path.map(part => typeof part === 'string' ? part : part.id).join('.'),
          ...(change.remove ? { remove: true as const } : { value: change.value }),
        })) } } : {}),
        ...(correction.referenceLabel ? { referenceLabel: correction.referenceLabel } : {}),
        ...(correction.acceptedAlias ? { acceptedAlias: correction.acceptedAlias } : {}),
        ...(correction.resolvedRecordId ? { resolvedEntity: String(labels.get(correction.resolvedRecordId) ?? correction.resolvedRecordId) } : {}),
        ...(correction.replacement ? { replacement: {
          kind: correction.replacement.kind,
          ...(correction.replacement.label ? { label: correction.replacement.label } : {}),
          facts: Object.fromEntries(Object.entries(correction.replacement.facts)
            .flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value.join(', ') : String(value)]])),
        } } : {}),
      }];
    });
  return {
    title: story.title,
    originalLanguage: story.originalLanguage,
    premise: input.premise,
    ...(text(input.genre) ? { genre: input.genre!.trim() } : {}),
    ...(text(input.toneStyle) ? { toneStyle: input.toneStyle!.trim() } : {}),
    ...(text(input.permanentInstructions) ? { permanentInstructions: input.permanentInstructions!.trim() } : {}),
    ...(text(input.openingSituation) ? { openingSetup: input.openingSituation!.trim() } : {}),
    ...(input.funSettings ? { funSettings: cloneHarnessValue(input.funSettings) } : {}),
    ...(text(input.intendedDirection) ? { intendedDirection: input.intendedDirection!.trim() } : {}),
    ...(text(input.declaredCanon) ? { declaredCanon: input.declaredCanon!.trim() } : {}),
    ...(text(input.characters) ? { characters: input.characters!.trim() } : {}),
    ...(text(input.worldFacts) ? { worldFacts: input.worldFacts!.trim() } : {}),
    ...(input.cast?.length ? { cast: cloneHarnessValue(input.cast) } : {}),
    ...(input.identities?.length ? { identities: cloneHarnessValue(input.identities) } : {}),
    corrections,
  };
};

const measure = (section: PacketSectionId, value: unknown): PacketSectionMeasurement => {
  const budget = GENERATION_PACKET_BUDGET.sections[section];
  const estimatedTokens = value === undefined ? 0 : estimatePacketTokens(value);
  return { section, estimatedTokens, ...('tokens' in budget ? { budgetTokens: budget.tokens } : {}), protected: budget.protected,
    overBudget: 'tokens' in budget ? estimatedTokens > budget.tokens : false };
};

/**
 * Compiles the Story Information Packet: distinct, compact sections built from
 * persisted story state, with every omission recorded in HARNESS diagnostics.
 * CAPA skills are assembled separately and never enter this packet; the
 * frozen Mission Reminder travels beside it on the request.
 */
export const compileStoryInformationPacket = (
  state: HarnessWorkspaceState,
  story: HarnessStory,
  foundationRevision: StoryFoundationRevision,
  attemptId: string,
  runtime: HarnessRuntime = defaultHarnessRuntime,
): StoryInformationPacket => {
  const chapters = state.chapters.filter(chapter => chapter.storyId === story.id)
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
  const latestChapterId = story.head.lastCommittedChapterId ?? chapters.at(-1)?.id;
  if (latestChapterId && !chapters.some(chapter => chapter.id === latestChapterId)) {
    throw new Error('The latest committed chapter is missing. Restore its saved context before continuing; the harness will not substitute an older chapter.');
  }
  const nextChapterNumber = story.head.nextChapterNumber;

  const fateMode = harnessStoryMode(foundationRevision.input);
  const currentStory = projectCurrentStory(state, story, foundationRevision);
  const storyDirection = {
    ...(text(foundationRevision.input.destinedEnding) ? { destinedEnding: foundationRevision.input.destinedEnding!.trim() } : {}),
    hardPins: validateHardPinInputs((story.hardPins ?? []).map(({ id, text }) => ({ id, text }))).map(pin => pin.text),
    fateMode,
  };
  // The reader's choice for this chapter travels in the Immediate Chapter
  // Request. Rhythm's automatic direction is sent only when there is none, and
  // never in Fate Survival, where the reader directs every chapter.
  const direction = story.nextChapterDirection?.forChapter === nextChapterNumber ? story.nextChapterDirection : undefined;
  const automaticPath = !direction && fateMode === 'regular';
  const arc = harnessArcContext(story, foundationRevision.input, nextChapterNumber);

  // Section 5 comes from the persisted recommendation only; nothing is recomputed here.
  const recommendation = automaticPath ? story.rhythmRecommendation : undefined;
  const latestSuggestions = [...chapters].reverse().find(chapter => chapter.rhythm?.nextChapterSuggestions)?.rhythm?.nextChapterSuggestions;
  const rhythm: RhythmDirectionSection | undefined = recommendation ? {
    fatePressure: recommendation.fatePressure,
    recentFunctions: recommendation.recentFunctions.map(entry => ({ chapterNumber: entry.chapterNumber, chapterFunction: entry.chapterFunction })),
    recommendedFunction: recommendation.recommendedFunction,
    reason: recommendation.reason,
    ...(latestSuggestions?.[recommendation.recommendedFunction] ? { suggestion: latestSuggestions[recommendation.recommendedFunction] } : {}),
  } : undefined;

  // Section 6: saved recaps only. A chapter without one is skipped, never replaced by prose.
  const omitted: StoryInformationPacket['diagnostics']['omitted'] = [];
  const withRecap = chapters.filter(chapter => chapter.recap?.text);
  const previouslyOn: PreviouslyOnEntry[] = withRecap.slice(-GENERATION_PACKET_BUDGET.previouslyOnCount)
    .map(chapter => ({ chapterNumber: chapter.chapterNumber, title: chapter.title, recap: chapter.recap!.text }));
  for (const chapter of withRecap.slice(0, Math.max(0, withRecap.length - GENERATION_PACKET_BUDGET.previouslyOnCount))) {
    omitted.push({ section: 'previouslyOn', label: `Chapter ${chapter.chapterNumber}: ${chapter.title}`, sourceRecordIds: [chapter.id],
      reason: `Older than the latest ${GENERATION_PACKET_BUDGET.previouslyOnCount} recaps; it remains saved with its chapter.` });
  }
  for (const chapter of chapters.filter(chapter => !chapter.recap?.text)) {
    omitted.push({ section: 'previouslyOn', label: `Chapter ${chapter.chapterNumber}: ${chapter.title}`, sourceRecordIds: [chapter.id],
      reason: 'No saved recap; full chapter prose is never substituted.' });
  }

  // Section 7: latest applicable canonical state, prioritized by the current arc, request, cast, and recent chapters.
  const activeChapterNumbers = chapters.slice(-GENERATION_PACKET_BUDGET.activeChapterWindow).map(chapter => chapter.chapterNumber);
  const canonical = projectCanonicalState({
    state, storyId: story.id,
    focusText: [arc?.activeGoal.text, directionFocus(direction), ...(story.hardPins ?? []).map(pin => pin.text), rhythm?.suggestion].filter(Boolean).join(' '),
    castNames: [...(foundationRevision.input.cast ?? []).map(member => member.name), ...(foundationRevision.input.identities ?? []).map(identity => identity.name)],
    activeChapterNumbers,
  });
  omitted.push(...canonical.omitted);

  const sections: PacketSectionMeasurement[] = [
    measure('currentStory', currentStory),
    measure('storyDirection', storyDirection),
    measure('arc', arc),
    measure('rhythm', rhythm),
    measure('previouslyOn', previouslyOn),
    measure('canonicalState', canonical.projection),
  ];

  return {
    id: runtime.createId('hctx'),
    storyId: story.id,
    attemptId,
    foundationRevisionId: foundationRevision.id,
    foundationRevision: foundationRevision.revision,
    storyHead: cloneHarnessValue(story.head),
    chapterNumber: nextChapterNumber,
    createdAt: runtime.now(),
    currentStory,
    storyDirection,
    ...(arc ? { arc } : {}),
    ...(rhythm ? { rhythm } : {}),
    previouslyOn,
    canonicalState: canonical.projection,
    diagnostics: {
      budgetSource: GENERATION_PACKET_BUDGET.source,
      sections,
      omitted,
      identityAmbiguities: canonical.identityAmbiguities,
      storage: {
        chapters: chapters.length,
        events: state.events.filter(event => event.storyId === story.id).length,
        canonicalRecords: state.canonicalRecords.filter(record => record.storyId === story.id).length,
        activeRecords: canonical.activeRecordCount,
        recaps: withRecap.length,
      },
    },
  };
};

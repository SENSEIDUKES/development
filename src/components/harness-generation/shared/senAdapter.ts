import { applyHarnessReaderChanges } from './readerEdits';
import { harnessArcContext, harnessArcPlan, harnessChapterArc } from './arcState';
import type { Character, StoryBlock, StoryMemory, StoryWorld } from '../../../narrative/story';
import { buildCanonicalStoryView } from './canonicalState';
import { cloneHarnessValue, stableHarnessId } from './ids';
import { harnessParagraphBlockId } from './chapterBody';
import { buildHarnessMechanicalContinuity } from './mechanicalContinuity';
import { verifyHarnessEventEvidence } from './responseAcceptance';
import type { HarnessCanonicalRecord, HarnessWorkspaceState } from '../../../narrative/generation';

const stringFact = (record: HarnessCanonicalRecord, key: string) =>
  typeof record.facts[key] === 'string' ? record.facts[key] as string : undefined;

/** A derived SEN view. Reading and repair never replace accepted Harness prose. */
const buildHarnessSenStory = (state: HarnessWorkspaceState, storyId: string, throughChapter: number, includeChapters: boolean): {
  story: StoryWorld; resolve: (name: string) => Character | undefined;
} => {
  const story = state.stories.find(candidate => candidate.id === storyId);
  if (!story) throw new Error('Choose a Harness story to read.');
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId && chapter.chapterNumber <= throughChapter)
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
  const historical = Number.isFinite(throughChapter);
  const foundationId = historical ? chapters.at(-1)?.foundationRevisionId ?? story.activeFoundationRevisionId : story.activeFoundationRevisionId;
  const foundation = state.foundations.find(candidate => candidate.id === foundationId);
  const chapterArc = (chapterNumber: number) => harnessChapterArc(story, foundation?.input, chapterNumber);
  const cutoff = historical ? chapters.at(-1)?.committedAt ?? story.createdAt : undefined;
  const corrections = state.corrections.filter(correction => correction.storyId === storyId && (!cutoff || correction.createdAt <= cutoff));
  const correctionIds = new Set(corrections.map(correction => correction.id));
  const visibleState = { ...state, chapters, corrections,
    canonicalRecords: state.canonicalRecords.filter(record =>
      (!record.sourceCorrectionId || correctionIds.has(record.sourceCorrectionId))
      && (!record.sourceFoundationRevisionId || record.sourceFoundationRevisionId === foundationId))
      .map(record => record.supersededByCorrectionId && !correctionIds.has(record.supersededByCorrectionId)
        ? { ...record, supersededAt: undefined, supersededByCorrectionId: undefined, supersededByRecordId: undefined } : record),
  };
  const records = buildCanonicalStoryView(visibleState, storyId).records;
  const position = new Map(chapters.map(chapter => [chapter.id, chapter.chapterNumber]));
  const recordPosition = (record: HarnessCanonicalRecord) => record.sourceFoundationRevisionId ? -1 : position.get(record.chapterId ?? '') ?? Infinity;
  records.sort((a, b) => recordPosition(a) - recordPosition(b));
  const characters = new Map<string, Character>();
  const names = new Map<string, string>();
  const ambiguous = new Set<string>();
  let mcName = '';
  for (const character of foundation?.input.cast ?? []) {
    const id = stableHarnessId('hentity', storyId, 'character', character.name.toLowerCase());
    names.set(character.name.toLowerCase(), id);
    characters.set(id, { id, name: character.name, role: character.role ?? 'Unknown',
      relationshipToMC: character.relationshipToMC ?? 'Unknown', status: 'unknown', description: '' });
    if (character.isMainCharacter) mcName = character.name;
  }
  for (const record of records.filter(record => record.kind === 'character' && record.confidence === 'resolved' && record.label)) {
    const name = record.label!;
    const id = record.entityId ?? stringFact(record, 'entityKey') ?? record.id;
    const key = name.toLowerCase();
    if (names.has(key) && names.get(key) !== id) ambiguous.add(key);
    names.set(key, id);
    for (const alias of record.aliases ?? []) {
      const aliasKey = alias.trim().toLowerCase();
      if (names.has(aliasKey) && names.get(aliasKey) !== id) ambiguous.add(aliasKey);
      names.set(aliasKey, id);
    }
    const prior = characters.get(id);
    const isMain = record.facts.isMainCharacter;
    if (isMain === true) mcName = name;
    if (isMain === false && mcName === name) mcName = '';
    characters.set(id, {
      ...prior, id, name, role: stringFact(record, 'role') ?? prior?.role ?? 'Unknown',
      relationshipToMC: stringFact(record, 'relationshipToMC') ?? prior?.relationshipToMC ?? 'Unknown',
      status: prior?.status ?? 'unknown', description: String(record.facts.description ?? record.evidence),
      firstAppeared: prior?.firstAppeared ?? position.get(record.chapterId ?? ''),
    });
  }
  for (const correction of corrections.filter(correction => correction.resolvedRecordId)) {
    const record = records.find(record => record.id === correction.resolvedRecordId);
    if (!record) continue;
    const id = record.entityId ?? stringFact(record, 'entityKey') ?? record.id;
    if (!characters.has(id)) continue;
    for (const alias of [correction.referenceLabel, correction.acceptedAlias].filter((alias): alias is string => Boolean(alias))) {
      names.set(alias.toLowerCase(), id); ambiguous.delete(alias.toLowerCase());
    }
  }
  const resolve = (name: string) => ambiguous.has(name.toLowerCase()) ? undefined : characters.get(names.get(name.toLowerCase()) ?? '');
  if (mcName && !resolve(mcName)) mcName = '';
  const memory: StoryMemory = { characters: [...characters.values()], locations: [], factions: [], artifacts: [], worldRules: [] };
  for (const [kind, target] of [['location-world', memory.locations!], ['faction', memory.factions!], ['artifact', memory.artifacts!]] as const) {
    const byName = new Map<string, { id: string; name: string; description: string; alignment: string }>();
    for (const record of records.filter(record => record.kind === kind && record.confidence === 'resolved' && record.label)) {
      byName.set(record.label!.toLowerCase(), {
        id: stableHarnessId('hentity', storyId, kind, record.label!.toLowerCase()), name: record.label!,
        description: String(record.facts.description ?? record.evidence), alignment: 'Unknown',
      });
    }
    target.push(...byName.values());
  }
  const mechanics = new Map<string, string>();
  const chaptersById = new Map(chapters.map(chapter => [chapter.id, chapter]));
  const quantitativeHistory = buildHarnessMechanicalContinuity(state.events
    .filter(event => event.storyId === storyId && event.chapterId && chaptersById.has(event.chapterId))
    .map(event => verifyHarnessEventEvidence(event, chaptersById.get(event.chapterId!)!.prose)));
  for (const record of records.filter(record => ['progression', 'artifact', 'location-world'].includes(record.kind) && record.confidence === 'resolved')) {
    const subject = stringFact(record, 'subject');
    const name = stringFact(record, 'name');
    const value = stringFact(record, 'value');
    if (!subject || !name || value === undefined) continue;
    const observation = quantitativeHistory.find(item => item.sourceId === record.sourceEventId);
    const latestObservation = quantitativeHistory.find(item => item.subject.toLowerCase() === subject.toLowerCase() && item.name.toLowerCase() === name.toLowerCase());
    const exactDisplay = [value, stringFact(record, 'unit')].filter(Boolean).join(' ');
    const display = latestObservation && latestObservation.sourceId !== record.sourceEventId
      ? `${exactDisplay} (historical; a later quantity awaits enhancement repair)`
      : observation?.subsequentDevelopments.length
      ? `${exactDisplay} (last quantified in Chapter ${observation.chapterNumber}; later: ${observation.subsequentDevelopments.map(event => event.description).join(' ')})`
      : exactDisplay;
    mechanics.set(`${subject}: ${name}`, display);
    const character = resolve(subject);
    if (character) {
      const abilityId = stableHarnessId('hmechanic', storyId, character.id, name.toLowerCase());
      character.abilities = [...(character.abilities ?? []).filter(ability => typeof ability === 'string' || ability.id !== abilityId),
        { id: abilityId, name, description: display }];
    }
  }
  memory.worldRules = [...mechanics].map(([name, value]) => `${name}: ${value}`);
  memory.memoryWarnings = [...ambiguous].map(name => `Ambiguous character identity: ${name}. Speech attribution is withheld.`);

  // Each paragraph is one narration block with its stable id; the chapter's
  // Sound Cues sit on those ids. Dialogue attribution returns when it is rebuilt.
  const readerChapters = (includeChapters ? chapters : []).map(chapter => ({
    persistenceId: chapter.id,
    number: chapter.chapterNumber,
    title: chapter.title,
    premise: '',
    status: 'unread' as const,
    hasContent: true,
    generatedContent: chapter.prose,
    blocks: chapter.paragraphs.map((text, index): StoryBlock => ({
      id: harnessParagraphBlockId(chapter.chapterNumber, index), type: 'narration', text,
    })),
    ...(chapter.soundCues?.length ? { soundCues: cloneHarnessValue(chapter.soundCues) } : {}),
  }));
  return { resolve, story: { id: story.id, title: story.title, genre: foundation?.input.genre ?? '', mcName,
    // Permanent story identity: every committed chapter above is canon in it.
    originalLanguage: story.originalLanguage,
    customPremise: foundation?.input.premise ?? '', createdAt: story.createdAt, updatedAt: story.updatedAt,
    // Chapters' arcs plus the arc the next chapter opens, when it has a saved plan.
    // Later arcs stay out of the Reader until they begin; the chapter
    // ending a broken route and chapters past a missed final goal stay in the arc they continue.
    memory, arcs: Array.from(new Set([...readerChapters.map(chapter => chapterArc(chapter.number)), ...((!historical && harnessArcPlan(story, chapterArc(story.head.nextChapterNumber))) ? [chapterArc(story.head.nextChapterNumber)] : [])])).sort((left, right) => left - right).map(arcNumber => {
      const arcChapters = readerChapters.filter(chapter => chapterArc(chapter.number) === arcNumber);
      const position = historical ? Math.min(throughChapter, arcChapters.at(-1)?.number ?? throughChapter) : story.head.nextChapterNumber;
      const goalContext = harnessArcContext(story, foundation?.input ?? { premise: '' }, position);
      return { title: 'Arc ' + arcNumber, chapters: arcChapters, isCompleted: false,
        goalContext: goalContext?.plan.arcNumber === arcNumber ? goalContext : undefined };
    }),
    currentChapterNumber: chapters.at(-1)?.chapterNumber ?? 1 } };
};

export const createHarnessSenStory = (state: HarnessWorkspaceState, storyId: string, throughChapter = Infinity): StoryWorld => {
  const story = buildHarnessSenStory(state, storyId, throughChapter, true).story;
  const changes = state.corrections.filter(item => item.storyId === storyId && item.readerEdit && item.readerEdit.chapterNumber <= throughChapter).flatMap(item => item.readerEdit!.changes);
  return applyHarnessReaderChanges(story, changes);
};

import type { Character, StoryBlock, StoryMemory, StoryWorld } from '../../reader-chamber/shared/types';
import { buildCanonicalStoryView } from './canonicalState';
import { stableHarnessId } from './ids';
import { buildHarnessMechanicalContinuity } from './mechanicalContinuity';
import { verifyHarnessEventEvidence } from './responseAcceptance';
import type { HarnessCanonicalRecord, HarnessWorkspaceState } from './types';

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

  const readerChapters = (includeChapters ? chapters : []).map(chapter => {
    // Resolve roles as of this chapter, so later changes do not rewrite dialogue attribution.
    const chapterView = historical && chapter.chapterNumber === chapters.at(-1)?.chapterNumber ? { story: { mcName }, resolve }
      : buildHarnessSenStory(state, storyId, chapter.chapterNumber, false);
    const events = state.events.filter(event => event.storyId === storyId && event.chapterId === chapter.id);
    const spans: Array<{ start: number; end: number; character: Character }> = [];
    for (const event of events) {
      const speech = event.details?.speech;
      if (!speech) continue;
      const character = chapterView.resolve(speech.speaker);
      const start = chapter.prose.indexOf(speech.quote);
      if (!character || start < 0 || chapter.prose.indexOf(speech.quote, start + 1) >= 0) continue;
      const end = start + speech.quote.length;
      if (spans.some(span => start < span.end && end > span.start)) continue;
      spans.push({ start, end, character });
    }
    spans.sort((a, b) => a.start - b.start);
    const blocks: StoryBlock[] = [];
    const addProse = (text: string, start: number, character?: Character) => {
      if (!text) return;
      blocks.push({ id: stableHarnessId('hblock', chapter.id, start), type: character ? 'dialogue' : 'narration', text,
        ...(character ? { metadata: { mode: 'dialogue', speakerName: character.name, speakerRole: character.name === chapterView.story.mcName ? 'main_character' : character.role,
          entities: [{ name: character.name, type: 'character', mention: 'reference' }] } } : {}) });
    };
    let offset = 0;
    for (const span of spans) {
      addProse(chapter.prose.slice(offset, span.start), offset);
      addProse(chapter.prose.slice(span.start, span.end), span.start, span.character);
      offset = span.end;
    }
    addProse(chapter.prose.slice(offset), offset);
    for (const event of events) {
      // Use successful canonical outputs only; replay makes failed enhancements appear.
      const supported = records.filter(record => record.sourceEventId === event.id && record.confidence === 'resolved');
      if (!supported.length) continue;
      const mechanical = supported.find(record => ['progression', 'artifact', 'location-world'].includes(record.kind) && stringFact(record, 'value') !== undefined);
      const value = mechanical && [stringFact(mechanical, 'value'), stringFact(mechanical, 'unit')].filter(Boolean).join(' ');
      blocks.push({ id: stableHarnessId('hblock', chapter.id, event.id), type: 'system', text: event.description,
        system: mechanical ? {
          kind: 'system_prompt', presentation: 'mechanical', promptType: 'progression',
          title: `${stringFact(mechanical, 'subject')}: ${stringFact(mechanical, 'name')}`,
          rows: [{ label: stringFact(mechanical, 'name')!, value: value! }],
          status: { stats: [{ label: stringFact(mechanical, 'name')!, value: value! }] },
        } : { kind: 'system_prompt', presentation: 'narrative', promptType: 'codex_update', title: 'Story development' },
      });
    }
    return { persistenceId: chapter.id, number: chapter.chapterNumber, title: chapter.title, premise: '',
      status: 'unread' as const, hasContent: true, generatedContent: chapter.prose, blocks };
  });
  return { resolve, story: { id: story.id, title: story.title, genre: foundation?.input.genre ?? '', mcName,
    customPremise: foundation?.input.premise ?? '', createdAt: story.createdAt, updatedAt: story.updatedAt,
    memory, arcs: [{ title: story.title, chapters: readerChapters, isCompleted: false }],
    currentChapterNumber: chapters.at(-1)?.chapterNumber ?? 1 } };
};

export const createHarnessSenStory = (state: HarnessWorkspaceState, storyId: string, throughChapter = Infinity): StoryWorld =>
  buildHarnessSenStory(state, storyId, throughChapter, true).story;

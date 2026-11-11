import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  appearancesSection,
  deriveAppearances,
  derivePlaces,
  deriveStoryCodex,
  notesOfTaggedChapter,
  placeAppearancesFromPlaces,
  placePlaces,
  readPlaceTag,
  resolvePlaces,
  type HarnessGenerationModelAdapter,
  type HarnessTagRequest,
} from '@seihouse/sen/harness-generation';
import type { WorldRecord } from '@seihouse/sen/contracts';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { presentAppearances } from '../../../server/harness-generation/prompt';
import { readMarks } from '../../../narrative/marks';
import type { CodexEntry } from '../../../narrative/holdings';
import type { PlaceAttachment } from '../../../narrative/places';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { acceptChapterTags } from './responseAcceptance';
import { createCodexEntryResolver } from './holdings';

/**
 * Place, the third information tag (SENSEI, 2026-11-04), built the way
 * Status is: the tagger tags the sentence where a character arrives
 * somewhere (`[[place: Shen Yuan | Summit Hall]]`), the HARNESS saves it on
 * that sentence, and where a character is now is the latest tag in story
 * order. The place is a Codex entry of its own, one card with the World
 * Blueprint's card of the same name, and steps onto the page with the
 * appearance tag or its first place tag.
 */

const tag = (text: string) => readMarks(text).wordTags[0];
const entry = (over: Partial<CodexEntry> & Pick<CodexEntry, 'id' | 'name' | 'kind'>): CodexEntry => ({
  storyId: 's', origin: { source: 'tag', chapterId: 'c1', chapterNumber: 1 }, createdAt: 'now', ...over,
});
const placeTag = (chapterNumber: number, blockId: string, text: string, who: { name: string; entryId?: string }, where: { name: string; entryId?: string }): PlaceAttachment => ({
  id: `place:${blockId}:0-${text.length}:0`, kind: 'place',
  anchor: { level: 'span', blockId, startOffset: 0, endOffset: text.length, selectedText: text },
  payload: { origin: 'harness', subject: who, place: where },
});

describe('reading place tags', () => {
  it('reads who and where, keeping the prose exactly as it was', () => {
    const reading = readMarks('[[place: Shen Yuan | Summit Hall]] Shen Yuan stepped into the Summit Hall.');
    expect(reading.text).toBe('Shen Yuan stepped into the Summit Hall.');
    expect(readPlaceTag(reading.wordTags[0])).toEqual({ ok: true, place: { subject: { name: 'Shen Yuan' }, place: { name: 'Summit Hall' } } });
    // Other spellings a tagger slips into read the same.
    expect(readPlaceTag(tag('[[Location: MC | Lower Stacks]] He went down.'))).toEqual({ ok: true, place: { subject: { name: 'MC' }, place: { name: 'Lower Stacks' } } });
  });

  it('sets aside a place tag that names no place, or tells what happens there instead', () => {
    expect(readMarks('[[place: Shen Yuan]] He went in.').wordTagIssues).toEqual([{ kind: 'incomplete', word: 'place' }]);
    expect(readPlaceTag(tag('[[place: Shen Yuan | the hall where the elders met to judge him for the theft]] He went in.'))).toMatchObject({ ok: false });
    // A name longer than a tagging request may carry would break every later request (review finding, CodeRabbit, 2026-11-04).
    expect(readPlaceTag(tag(`[[place: Shen Yuan | ${'Hall'.repeat(55)}]] He went in.`))).toMatchObject({ ok: false });
  });

  it('places each on the sentence its tag points at, and an unreadable one is flagged as a place, never as a holding', () => {
    const reading = readMarks('The bell rang. [[place: MC | Summit Hall]] Ye Chen climbed into the Summit Hall.');
    const placed = placePlaces({ paragraphs: [{ blockId: 'c1-p1', text: reading.text, wordTags: reading.wordTags }] });
    expect(placed.problems).toEqual([]);
    expect(placed.places[0]).toMatchObject({
      kind: 'place', anchor: { blockId: 'c1-p1', selectedText: 'Ye Chen climbed into the Summit Hall.' },
      payload: { origin: 'harness', subject: { name: 'MC' }, place: { name: 'Summit Hall' } },
    });
    const warnings: Parameters<typeof acceptChapterTags>[2] = [];
    const tags = acceptChapterTags(['[[place: MC | Summit Hall]] He climbed. [[place: Lin]] Lin ran.'], 1, warnings);
    expect(tags.paragraphs).toEqual(['He climbed. Lin ran.']);
    expect(tags.places.map(place => place.payload.place.name)).toEqual(['Summit Hall']);
    expect(warnings.map(warning => warning.code)).toEqual(['place_tags_incomplete']);
  });

  it('reads a place stepping onto the page with the appearance tag', () => {
    const tags = acceptChapterTags(['[[appears: Lower Stacks | place]] The Lower Stacks smelled of dust.'], 1, []);
    expect(tags.appearances?.[0].payload).toEqual({ origin: 'harness', event: 'appears', subject: { name: 'Lower Stacks' }, entity: 'place' });
  });
});

describe('where a character is now', () => {
  const at = (chapterNumber: number, blockId: string, where: string, placeEntryId?: string) => ({
    id: `c${chapterNumber}`, chapterNumber,
    places: [placeTag(chapterNumber, blockId, 'He went in.', { name: 'Shen Yuan', entryId: 'e-shen' }, { name: where, ...(placeEntryId ? { entryId: placeEntryId } : {}) })],
  });

  it('is the latest place tag in story order, named as its Codex entry is', () => {
    const now = derivePlaces([at(3, 'c3-p1', 'the summit hall', 'e-hall'), at(1, 'c1-p4', 'Lower Stacks')],
      [entry({ id: 'e-hall', name: 'Summit Hall', kind: 'place' })]);
    expect(now.get('e-shen')).toMatchObject({ place: 'Summit Hall', placeEntryId: 'e-hall', passage: { chapterNumber: 3 } });
  });

  it('reaches the writer beside each character, with the places already on the page', () => {
    const entries = [entry({ id: 'e-shen', name: 'Shen Yuan', kind: 'character' }), entry({ id: 'e-hall', name: 'Summit Hall', kind: 'place' })];
    const text = 'Shen Yuan stepped into the Summit Hall, a cold room of black pillars.';
    const chapters = [{
      id: 'c1', chapterNumber: 1, paragraphs: [text],
      appearances: [
        { id: 'a1', kind: 'appearance' as const, anchor: { level: 'span' as const, blockId: 'c1-p1', startOffset: 0, endOffset: text.length, selectedText: text },
          payload: { origin: 'harness' as const, event: 'appears' as const, subject: { name: 'Shen Yuan', entryId: 'e-shen' }, entity: 'character' as const } },
        { id: 'a2', kind: 'appearance' as const, anchor: { level: 'span' as const, blockId: 'c1-p1', startOffset: 0, endOffset: text.length, selectedText: text },
          payload: { origin: 'harness' as const, event: 'appears' as const, subject: { name: 'Summit Hall', entryId: 'e-hall' }, entity: 'place' as const } },
      ],
      places: [placeTag(1, 'c1-p1', text, { name: 'Shen Yuan', entryId: 'e-shen' }, { name: 'Summit Hall', entryId: 'e-hall' })],
    }];
    const section = appearancesSection(deriveAppearances({ entries, chapters }), undefined, entries, derivePlaces(chapters, entries));
    expect(section.entries.map(({ name, entity, place }) => ({ name, entity, place }))).toEqual([
      { name: 'Shen Yuan', entity: 'character', place: 'Summit Hall' },
      { name: 'Summit Hall', entity: 'place', place: undefined },
    ]);
    expect(presentAppearances({ entries: [{ name: 'Shen Yuan', entity: 'character', status: 'wounded', place: 'Summit Hall', look: 'a thin sweeper in grey' }] }))
      .toBe('- Shen Yuan (character, wounded, at Summit Hall): a thin sweeper in grey');
  });

  it('brings a place back into Appeared when someone returns to it, however many places came between (review finding, Codex, 2026-11-04)', () => {
    const names = Array.from({ length: 11 }, (_, index) => `Hall ${index + 1}`);
    const entries = names.map((name, index) => entry({ id: `e-${index + 1}`, name, kind: 'place' }));
    const chapters = names.map((name, index) => {
      const text = `He walked into ${name}.`;
      const place = { name, entryId: `e-${index + 1}` };
      return {
        id: `c${index + 1}`, chapterNumber: index + 1, paragraphs: [text],
        appearances: [{ id: `a${index + 1}`, kind: 'appearance' as const, anchor: { level: 'span' as const, blockId: `c${index + 1}-p1`, startOffset: 0, endOffset: text.length, selectedText: text },
          payload: { origin: 'harness' as const, event: 'appears' as const, subject: place, entity: 'place' as const } }],
        places: [placeTag(index + 1, `c${index + 1}-p1`, text, { name: 'MC', entryId: 'e-mc' }, place)],
      };
    });
    const back = 'He came back to Hall 1.';
    chapters.push({ id: 'c12', chapterNumber: 12, paragraphs: [back], appearances: [],
      places: [placeTag(12, 'c12-p1', back, { name: 'MC', entryId: 'e-mc' }, { name: 'Hall 1', entryId: 'e-1' })] });
    const shown = appearancesSection(deriveAppearances({ entries, chapters }), undefined, entries).entries.map(shownEntry => shownEntry.name);
    expect(shown).toHaveLength(10);
    expect(shown[0]).toBe('Hall 1');
    expect(shown).not.toContain('Hall 2');
  });

  it('never makes a character of a place tag whose "who" is a place the story has (review finding, CodeRabbit, 2026-11-04)', () => {
    const entries = [entry({ id: 'e-hall', name: 'Summit Hall', kind: 'place' })];
    const resolver = createCodexEntryResolver({ storyId: 's', chapter: { id: 'c2', chapterNumber: 2 }, entries, declared: [], createdAt: 'now', createId: () => 'new' });
    const odd = placeTag(2, 'c2-p1', 'The hall stood in the academy.', { name: 'Summit Hall' }, { name: 'Lingxu Academy' });
    expect(resolvePlaces([odd], resolver)).toEqual([]);
    expect(resolver.created).toEqual([]);
  });

  it('keeps the main character\'s place in Appeared however many others have one (review finding, CodeRabbit, 2026-11-04)', () => {
    const entries = [entry({ id: 'e-mc', name: 'Ye Chen', kind: 'character', mainCharacter: true }),
      ...Array.from({ length: 25 }, (_, index) => entry({ id: `e-${index}`, name: `Guard ${index}`, kind: 'character' }))];
    const chapters = [
      { id: 'c1', chapterNumber: 1, places: [placeTag(1, 'c1-p1', 'In.', { name: 'MC', entryId: 'e-mc' }, { name: 'Summit Hall' })] },
      { id: 'c2', chapterNumber: 2, places: Array.from({ length: 25 }, (_, index) => ({ ...placeTag(2, 'c2-p1', 'In.', { name: `Guard ${index}`, entryId: `e-${index}` }, { name: 'Gate' }), id: `p${index}` })) },
    ];
    const shown = appearancesSection(deriveAppearances({ entries, chapters }), undefined, entries, derivePlaces(chapters, entries)).entries;
    expect(shown[0]).toEqual({ name: 'Ye Chen', entity: 'character', mainCharacter: true, place: 'Summit Hall' });
    expect(shown).toHaveLength(21);
  });

  it('gives a place its appearance on its first place tag, once', () => {
    const entries = [entry({ id: 'e-hall', name: 'Summit Hall', kind: 'place' })];
    const tagged = placeTag(2, 'c2-p1', 'He climbed into the Summit Hall.', { name: 'MC', entryId: 'e-mc' }, { name: 'Summit Hall', entryId: 'e-hall' });
    const found = placeAppearancesFromPlaces({ chapter: { id: 'c2', chapterNumber: 2, appearances: [], places: [tagged, { ...tagged, id: 'p2' }] }, chapters: [], entries });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ anchor: tagged.anchor, payload: { event: 'appears', entity: 'place', subject: { name: 'Summit Hall', entryId: 'e-hall' } } });
    // Already on the page: no second appearance.
    expect(placeAppearancesFromPlaces({ chapter: { id: 'c2', chapterNumber: 2, appearances: found, places: [tagged] }, chapters: [], entries })).toEqual([]);
  });
});

describe('places in the Codex', () => {
  const world: WorldRecord = { cards: [
    { key: 'world:place:summit-hall', kind: 'place', name: 'Summit Hall', enteredInChapter: 0, slots: { appearance: 'a hall of black pillars', within: 'Lingxu Academy' } },
    { key: 'world:place:moon-well', kind: 'place', name: 'Moon Well', enteredInChapter: 0, slots: {} },
    { key: 'world:place:lower-stacks', kind: 'place', name: 'Lower Stacks', enteredInChapter: 0, slots: {} },
    { key: 'world:character:shen-yuan', kind: 'character', name: 'Shen Yuan', enteredInChapter: 0, slots: {} },
  ] };

  it('is one card with the Blueprint\'s place, opens when the story arrives, and says who is there now', () => {
    const entries = [entry({ id: 'e-shen', name: 'Shen Yuan', kind: 'character' }), entry({ id: 'e-hall', name: 'Summit Hall', kind: 'place' }), entry({ id: 'e-stacks', name: 'Lower Stacks', kind: 'place' })];
    const one = 'Shen Yuan stepped into the Summit Hall.';
    const two = 'He went down into the Lower Stacks.';
    const codex = deriveStoryCodex({ entries, world, chapters: [
      { id: 'c1', chapterNumber: 1, paragraphs: [one], places: [placeTag(1, 'c1-p1', one, { name: 'Shen Yuan', entryId: 'e-shen' }, { name: 'Summit Hall', entryId: 'e-hall' })] },
      { id: 'c2', chapterNumber: 2, paragraphs: [two], places: [placeTag(2, 'c2-p1', two, { name: 'Shen Yuan', entryId: 'e-shen' }, { name: 'Lower Stacks', entryId: 'e-stacks' })] },
    ] });
    // The Moon Well waits until the story reaches it; the hall is the Blueprint's own card.
    expect(codex.places.map(place => [place.key, place.name, place.here.map(who => who.name)])).toEqual([
      ['e-hall', 'Summit Hall', []],
      ['e-stacks', 'Lower Stacks', ['Shen Yuan']],
    ]);
    expect(codex.places[0]).toMatchObject({ firstSeen: { chapterNumber: 1, text: one }, atChapterZero: [{ value: 'a hall of black pillars' }, { value: 'Lingxu Academy' }] });
    expect(codex.characters.find(character => character.name === 'Shen Yuan')?.place).toEqual({
      text: 'Lower Stacks', passage: { chapterNumber: 2, blockId: 'c2-p1', text: two },
    });
  });

  it('lists a place the world has no card for under Minor, not Places (2026-11-11)', () => {
    const entries = [entry({ id: 'e-shen', name: 'Shen Yuan', kind: 'character' }), entry({ id: 'e-ridge', name: 'North Ridge', kind: 'place' })];
    const one = 'Shen Yuan climbed the North Ridge.';
    const codex = deriveStoryCodex({ entries, world, chapters: [
      { id: 'c1', chapterNumber: 1, paragraphs: [one], places: [placeTag(1, 'c1-p1', one, { name: 'Shen Yuan', entryId: 'e-shen' }, { name: 'North Ridge', entryId: 'e-ridge' })] },
    ] });
    expect(codex.places).toEqual([]);
    expect(codex.minor).toEqual([{ key: 'e-ridge', name: 'North Ridge', kind: 'place', introduced: { chapterNumber: 1, blockId: 'c1-p1', text: one }, chapters: [1], promotable: true }]);
    // Where the character is still reads on their own card.
    expect(codex.characters.find(character => character.name === 'Shen Yuan')?.place?.text).toBe('North Ridge');
  });
});

describe('place in the chapter flow', () => {
  const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-11-04T12:00:00.000Z', usage: { source: 'unavailable' as const } };
  const reply = (paragraphs: string[]) => writtenChapterReply(JSON.stringify({
    title: 'The Hall', paragraphs,
    arcCompletion: { goalId: 'arc-1', completed: false, evidence: '' }, recap: 'Ye Chen climbs.', chapterFunction: 'progression',
    nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The hall.', nextConflict: 'A rival.',
  }));
  const ONE = 'Ye Chen climbed the last stair into the Summit Hall, a cold room of black pillars.';
  const TWO = 'By dusk he had gone down into the Lower Stacks.';

  it('saves each place tag on its chapter, gives a new place its appearance, tells the tagger where everyone is, and shows it in the Codex', async () => {
    let ids = 0;
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
      rawProviderResponse: JSON.stringify({ notes: notesOfTaggedChapter(request.paragraphs.map(paragraph =>
        paragraph === ONE ? `[[place: MC | Summit Hall]] ${paragraph}`
          : paragraph === TWO ? `[[place: MC | Lower Stacks]] ${paragraph}` : paragraph)) }),
      providerReceipt: receipt,
    }));
    const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      runtime: { now: () => '2026-11-04T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` },
      modelAdapter: {
        getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
        generate,
        arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
        tagChapter,
      },
    });
    await controller.hydrate();
    const story = await controller.createStory({
      premise: 'Ye Chen survives the sect.', destinedEnding: 'Ye Chen leads the sect.',
      initialArcPlan: { arcNumber: 1, goals: [{ id: 'arc-1', text: 'Survive.', chapters: 30 }] },
      cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
    });
    for (const paragraph of [ONE, TWO]) {
      generate.mockResolvedValueOnce({ rawProviderResponse: reply([paragraph]), providerReceipt: receipt });
      await controller.generateNextChapter(story.id, 'fixture');
    }

    const state = controller.snapshot();
    const [first, second] = state.chapters;
    const hall = state.codexEntries.find(candidate => candidate.name === 'Summit Hall')!;
    const ye = state.codexEntries.find(candidate => candidate.mainCharacter)!;
    expect(hall.kind).toBe('place');
    expect(first.places?.[0].payload).toEqual({ origin: 'harness', subject: { name: 'MC', entryId: ye.id }, place: { name: 'Summit Hall', entryId: hall.id } });
    // The hall stepped onto the page on the sentence he arrived in, so it has a look to keep.
    expect(first.appearances?.find(appearance => appearance.payload.entity === 'place')).toMatchObject({
      anchor: { selectedText: ONE }, payload: { event: 'appears', subject: { entryId: hall.id } },
    });
    // The second chapter's tagger read where he was, and the story's places.
    const secondRequest = tagChapter.mock.calls[1][0];
    expect(secondRequest.subjects.find(subject => subject.name === 'Ye Chen')).toMatchObject({ place: 'Summit Hall' });
    expect(secondRequest.subjects.find(subject => subject.name === 'Summit Hall')).toEqual({ name: 'Summit Hall', kind: 'place' });
    const prompt = buildHarnessTagPrompt(secondRequest);
    expect(prompt.userPrompt).toContain('- Ye Chen (the main character) — at: Summit Hall');
    expect(prompt.userPrompt).toContain('PLACES:\n- Summit Hall');
    expect(prompt.systemInstruction).toContain('[[place: Name | Place]]');
    expect(prompt.systemInstruction).toContain('[[appears: Place | place]]');
    // The Codex card says where he is now; the places are cards of their own.
    const codex = deriveStoryCodex({ entries: state.codexEntries, chapters: state.chapters });
    expect(codex.characters.find(character => character.name === 'Ye Chen')?.place).toEqual({ text: 'Lower Stacks', passage: { chapterNumber: 2, blockId: 'c2-p1', text: TWO } });
    expect(codex.places.map(place => [place.name, place.here.map(who => who.name)])).toEqual([['Summit Hall', []], ['Lower Stacks', ['Ye Chen']]]);

    // Create mode keeps a place tag on its words, and an edit that drops it keeps the chapter's list, empty.
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs, places: second.places });
    expect(controller.snapshot().chapters[1].places).toEqual(second.places);
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs });
    expect(controller.snapshot().chapters[1].places).toEqual([]);

    // Rewriting the newest chapter: its tagger reads where he was from the chapters before it, never the one it replaces.
    generate.mockResolvedValueOnce({ rawProviderResponse: reply([TWO]), providerReceipt: receipt });
    await controller.rewriteLatestChapter(story.id, 'fixture', 'Again.');
    const rewriteRequest = tagChapter.mock.calls.at(-1)![0];
    expect(rewriteRequest.subjects.find(subject => subject.name === 'Ye Chen')).toMatchObject({ place: 'Summit Hall' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  appearancesSection,
  deriveAppearances,
  deriveStoryCodex,
  deriveTies,
  notesOfTaggedChapter,
  placeTies,
  TAG_SUBJECT_TIES,
  readTieTag,
  resolveTies,
  tagSubjectsOfStory,
  tiesOfEntry,
  type HarnessGenerationModelAdapter,
  type HarnessTagRequest,
} from '@seihouse/sen/harness-generation';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { presentAppearances } from '../../../server/harness-generation/prompt';
import { readMarks } from '../../../narrative/marks';
import type { CodexEntry } from '../../../narrative/holdings';
import type { TieAttachment } from '../../../narrative/ties';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { acceptChapterTags } from './responseAcceptance';
import { createCodexEntryResolver } from './holdings';

/**
 * Ties, the fourth information tag (SENSEI, 2026-11-08), built the way Status
 * is: the tagger tags the sentence where a tie between two characters forms
 * or changes (`[[tie: Lin Qingshan | Ning Hao | sworn enemies]]`), the HARNESS
 * saves it on that sentence, and how a pair stands now is the pair's latest
 * tag in story order, whichever of the two a tag names first.
 */

const tag = (text: string) => readMarks(text).wordTags[0];
const entry = (over: Partial<CodexEntry> & Pick<CodexEntry, 'id' | 'name' | 'kind'>): CodexEntry => ({
  storyId: 's', origin: { source: 'tag', chapterId: 'c1', chapterNumber: 1 }, createdAt: 'now', ...over,
});
const tieTag = (blockId: string, text: string, subject: { name: string; entryId?: string }, other: { name: string; entryId?: string }, tie: string): TieAttachment => ({
  id: `tie:${blockId}:0-${text.length}:0`, kind: 'tie',
  anchor: { level: 'span', blockId, startOffset: 0, endOffset: text.length, selectedText: text },
  payload: { origin: 'harness', subject, other, tie },
});

describe('reading tie tags', () => {
  it('reads the two names and how they stand, keeping the prose exactly as it was', () => {
    const reading = readMarks('[[tie: Lin Qingshan | Ning Hao | sworn enemies]] Lin spat at Ning Hao\'s feet.');
    expect(reading.text).toBe('Lin spat at Ning Hao\'s feet.');
    expect(readTieTag(reading.wordTags[0])).toEqual({ ok: true, tie: { subject: { name: 'Lin Qingshan' }, other: { name: 'Ning Hao' }, tie: 'sworn enemies' } });
    // Other spellings a tagger slips into read the same.
    expect(readTieTag(tag('[[Relationship: MC | Elder Qin | master and disciple]] He knelt.'))).toEqual({ ok: true, tie: { subject: { name: 'MC' }, other: { name: 'Elder Qin' }, tie: 'master and disciple' } });
  });

  it('sets aside a tie that says nothing about how they stand, tells what happened instead, or ties someone to themselves', () => {
    expect(readMarks('[[tie: Lin]] He went in.').wordTagIssues).toEqual([{ kind: 'incomplete', word: 'tie' }]);
    expect(readTieTag(tag('[[tie: Lin | Ning Hao]] He glared.'))).toMatchObject({ ok: false });
    expect(readTieTag(tag('[[tie: Lin | Ning Hao | they fought in the courtyard until the elders pulled them apart]] He glared.'))).toMatchObject({ ok: false });
    expect(readTieTag(tag('[[tie: Lin | lin | friends]] He smiled.'))).toMatchObject({ ok: false });
    // An empty part never closes up, which would read how they stand as a name (review finding, CodeRabbit, 2026-11-08).
    expect(readMarks('[[tie: Lin | | sworn enemies | since the betrayal]] He glared.')).toMatchObject({ wordTags: [], wordTagIssues: [{ kind: 'incomplete', word: 'tie' }] });
  });

  it('never puts a name back into the prose, wherever its note sits (review finding, CodeRabbit, 2026-11-08)', () => {
    const tags = acceptChapterTags(['They swore brotherhood and embraced [[tie: Lin | Ning Hao | sworn brothers]] warmly.'], 1, []);
    expect(tags.paragraphs).toEqual(['They swore brotherhood and embraced warmly.']);
    expect(tags.ties.map(tie => tie.payload.tie)).toEqual(['sworn brothers']);
  });

  it('places each on the sentence its tag points at, and an unreadable one is flagged as a tie, never as a holding', () => {
    const reading = readMarks('The bell rang. [[tie: MC | Elder Qin | master and disciple]] Ye Chen knelt before Elder Qin.');
    const placed = placeTies({ paragraphs: [{ blockId: 'c1-p1', text: reading.text, wordTags: reading.wordTags }] });
    expect(placed.problems).toEqual([]);
    expect(placed.ties[0]).toMatchObject({
      kind: 'tie', anchor: { blockId: 'c1-p1', selectedText: 'Ye Chen knelt before Elder Qin.' },
      payload: { origin: 'harness', subject: { name: 'MC' }, other: { name: 'Elder Qin' }, tie: 'master and disciple' },
    });
    const warnings: Parameters<typeof acceptChapterTags>[2] = [];
    const tags = acceptChapterTags(['[[tie: MC | Elder Qin | master and disciple]] He knelt. [[tie: Lin]] Lin ran.'], 1, warnings);
    expect(tags.paragraphs).toEqual(['He knelt. Lin ran.']);
    expect(tags.ties.map(tie => tie.payload.tie)).toEqual(['master and disciple']);
    expect(warnings.map(warning => warning.code)).toEqual(['tie_tags_incomplete']);
  });
});

describe('resolving a tie when its chapter commits', () => {
  it('names a character first, and a thing the story already has second, never a place or the same one twice', () => {
    const entries = [
      entry({ id: 'e-ye', name: 'Ye Chen', kind: 'character', mainCharacter: true }),
      entry({ id: 'e-sword', name: 'Crimson Sword', kind: 'thing' }),
      entry({ id: 'e-hall', name: 'Summit Hall', kind: 'place' }),
    ];
    const resolver = createCodexEntryResolver({ storyId: 's', chapter: { id: 'c1', chapterNumber: 1 }, entries, declared: [], createdAt: 'now', createId: () => 'e-new' });
    const resolved = resolveTies([
      tieTag('c1-p1', 'Chi Lian woke in the blade.', { name: 'Chi Lian' }, { name: 'Crimson Sword' }, 'bound spirit'),
      tieTag('c1-p2', 'He bowed to the hall.', { name: 'MC' }, { name: 'Summit Hall' }, 'devoted'),
      tieTag('c1-p3', 'He laughed.', { name: 'Ye Chen' }, { name: 'MC' }, 'himself'),
    ], resolver);
    expect(resolved.map(tie => [tie.payload.subject.entryId, tie.payload.other.entryId])).toEqual([['e-new', 'e-sword']]);
    expect(resolver.created.map(created => [created.name, created.kind])).toEqual([['Chi Lian', 'character']]);
  });

  it('makes a world thing not met yet a thing, never a character (review finding, CodeRabbit, 2026-11-08)', () => {
    const entries = [entry({ id: 'e-ye', name: 'Ye Chen', kind: 'character', mainCharacter: true })];
    const world = { cards: [{ key: 'world:thing:crimson-sword', kind: 'thing' as const, name: 'Crimson Sword', aliases: ['the red blade'], enteredInChapter: 0, slots: {} }] };
    let ids = 0;
    const resolver = createCodexEntryResolver({ storyId: 's', chapter: { id: 'c1', chapterNumber: 1 }, entries, declared: [], createdAt: 'now', createId: () => `e-new-${++ids}` });
    const resolved = resolveTies([
      tieTag('c1-p1', 'The red blade chose him.', { name: 'MC' }, { name: 'the red blade' }, 'bound'),
      tieTag('c1-p2', 'The sword hummed.', { name: 'Crimson Sword' }, { name: 'MC' }, 'bound'),
    ], resolver, world);
    expect(resolved.map(tie => tie.payload.other.entryId)).toEqual(['e-new-1']);
    expect(resolver.created.map(created => [created.name, created.kind])).toEqual([['Crimson Sword', 'thing']]);
  });

  it('never ties anyone to a world place, faction or ability not met yet (review finding, Codex, 2026-11-08)', () => {
    const entries = [entry({ id: 'e-ye', name: 'Ye Chen', kind: 'character', mainCharacter: true })];
    const card = (kind: 'place' | 'faction' | 'ability', name: string) => ({ key: `world:${kind}:${name}`, kind, name, enteredInChapter: 0, slots: {} });
    const world = { cards: [card('place', 'Summit Hall'), card('faction', 'Frost Sect Alliance'), card('ability', 'Snowfall Tail Art')] };
    const resolver = createCodexEntryResolver({ storyId: 's', chapter: { id: 'c1', chapterNumber: 1 }, entries, declared: [], createdAt: 'now', createId: () => 'e-new' });
    expect(resolveTies([
      tieTag('c1-p1', 'He bowed to the hall.', { name: 'MC' }, { name: 'Summit Hall' }, 'devoted'),
      tieTag('c1-p2', 'He took the sect oath.', { name: 'MC' }, { name: 'Frost Sect Alliance' }, 'sworn member'),
      tieTag('c1-p3', 'The sect claimed him.', { name: 'Frost Sect Alliance' }, { name: 'MC' }, 'master'),
      tieTag('c1-p4', 'The art answered.', { name: 'MC' }, { name: 'Snowfall Tail Art' }, 'mastered'),
    ], resolver, world)).toEqual([]);
    expect(resolver.created).toEqual([]);
  });

  it('never makes a character of an ability a tie names (review finding, Codex, 2026-11-08)', () => {
    const entries = [entry({ id: 'e-ye', name: 'Ye Chen', kind: 'character', mainCharacter: true }), entry({ id: 'e-fire', name: 'Fireball', kind: 'ability' })];
    const resolver = createCodexEntryResolver({ storyId: 's', chapter: { id: 'c1', chapterNumber: 1 }, entries, declared: [], createdAt: 'now', createId: () => 'e-new' });
    expect(resolveTies([tieTag('c1-p1', 'The flame answered him.', { name: 'Ye Chen' }, { name: 'Fireball' }, 'mastered')], resolver)).toEqual([]);
    expect(resolveTies([tieTag('c1-p1', 'The flame answered him.', { name: 'Fireball' }, { name: 'Ye Chen' }, 'mastered')], resolver)).toEqual([]);
    expect(resolver.created).toEqual([]);
  });
});

describe('how a pair stands now', () => {
  const entries = [
    entry({ id: 'e-lin', name: 'Lin Qingshan', kind: 'character' }),
    entry({ id: 'e-ning', name: 'Ning Hao', kind: 'character' }),
    entry({ id: 'e-fox', name: 'Little Frost', kind: 'character' }),
  ];
  const lin = { name: 'Lin Qingshan', entryId: 'e-lin' };
  const ning = { name: 'Ning Hao', entryId: 'e-ning' };
  const fox = { name: 'Little Frost', entryId: 'e-fox' };

  it('is the pair\'s latest tie in story order, whichever of the two a tag names first', () => {
    const now = deriveTies([
      { id: 'c3', chapterNumber: 3, ties: [tieTag('c3-p2', 'Ning Hao turned his back.', ning, lin, 'sworn enemies')] },
      { id: 'c1', chapterNumber: 1, ties: [tieTag('c1-p4', 'They shared a cup.', lin, ning, 'uneasy allies'), tieTag('c1-p9', 'The cub chose him.', lin, fox, 'bonded companion')] },
    ], entries);
    expect(now.size).toBe(2);
    expect(tiesOfEntry(now, entries[0]).map(tie => [tie.with, tie.tie, tie.passage.chapterNumber])).toEqual([
      ['Little Frost', 'bonded companion', 1], ['Ning Hao', 'sworn enemies', 3],
    ]);
    expect(tiesOfEntry(now, entries[1]).map(tie => [tie.with, tie.tie])).toEqual([['Lin Qingshan', 'sworn enemies']]);
  });

  it('keeps the pairs in the order the story last showed each, so the latest are the ones sent (review finding, CodeRabbit, 2026-11-08)', () => {
    const now = deriveTies([{ id: 'c1', chapterNumber: 1, ties: [
      tieTag('c1-p1', 'They met.', lin, ning, 'rivals'),
      tieTag('c1-p2', 'The cub chose him.', lin, fox, 'bonded companion'),
      tieTag('c1-p3', 'Ning Hao turned his back.', ning, lin, 'sworn enemies'),
    ] }], entries);
    expect(tiesOfEntry(now, entries[0]).map(tie => tie.with)).toEqual(['Little Frost', 'Ning Hao']);
  });

  it('reaches the tagger beside each character, the latest ones only, so a long story never outgrows the request', () => {
    const others = Array.from({ length: TAG_SUBJECT_TIES + 1 }, (_, index) => entry({ id: `e-${index}`, name: `Elder ${index}`, kind: 'character' }));
    const now = deriveTies(others.map((other, index) => ({
      id: `c${index + 1}`, chapterNumber: index + 1,
      ties: [tieTag(`c${index + 1}-p1`, 'They bowed.', lin, { name: other.name, entryId: other.id }, 'allies')],
    })), [entries[0], ...others]);
    const subject = tagSubjectsOfStory({ entries: [entries[0]], ties: now }).find(candidate => candidate.name === 'Lin Qingshan')!;
    expect(subject.ties).toHaveLength(TAG_SUBJECT_TIES);
    expect(subject.ties![0].with).toBe('Elder 1');
    expect(subject.ties!.at(-1)!.with).toBe(`Elder ${TAG_SUBJECT_TIES}`);
    // The writer reads the same latest ones (review finding, CodeRabbit, 2026-11-08).
    const section = appearancesSection(deriveAppearances({ entries: [entries[0]], chapters: [] }), undefined, [entries[0], ...others], undefined, now);
    const line = section.entries.find(candidate => candidate.name === 'Lin Qingshan')!.ties!;
    expect(line.split('; ')).toHaveLength(TAG_SUBJECT_TIES);
    expect(line.startsWith('Elder 1 (allies)')).toBe(true);
  });

  it('reaches the writer for two who never had an appears tag, so a tie tagged on its own is never forgotten (review finding, Codex, 2026-11-08)', () => {
    const chapters = [{ id: 'c1', chapterNumber: 1, paragraphs: ['They bowed.'], appearances: [], ties: [tieTag('c1-p1', 'They bowed.', lin, ning, 'sworn brothers')] }];
    const section = appearancesSection(deriveAppearances({ entries, chapters }), undefined, entries, undefined, deriveTies(chapters, entries));
    expect(section.entries.map(({ name, ties }) => [name, ties])).toEqual([
      ['Lin Qingshan', 'Ning Hao (sworn brothers)'], ['Ning Hao', 'Lin Qingshan (sworn brothers)'],
    ]);
  });

  it('reaches the writer beside each character, after the look', () => {
    const text = 'Lin Qingshan, a lean young hunter, met Ning Hao\'s eyes and did not bow.';
    const chapters = [{
      id: 'c1', chapterNumber: 1, paragraphs: [text],
      appearances: [{ id: 'a1', kind: 'appearance' as const, anchor: { level: 'span' as const, blockId: 'c1-p1', startOffset: 0, endOffset: text.length, selectedText: text },
        payload: { origin: 'harness' as const, event: 'appears' as const, subject: lin, entity: 'character' as const } }],
      ties: [tieTag('c1-p1', text, lin, ning, 'sworn enemies')],
    }];
    const section = appearancesSection(deriveAppearances({ entries, chapters }), undefined, entries, undefined, deriveTies(chapters, entries));
    expect(section.entries[0]).toMatchObject({ name: 'Lin Qingshan', ties: 'Ning Hao (sworn enemies)' });
    expect(presentAppearances({ entries: [{ name: 'Lin Qingshan', entity: 'character', look: 'a lean young hunter', ties: 'Ning Hao (sworn enemies)' }] }))
      .toBe('- Lin Qingshan (character): a lean young hunter · ties: Ning Hao (sworn enemies)');
  });
});

describe('ties in the chapter flow', () => {
  const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-11-08T12:00:00.000Z', usage: { source: 'unavailable' as const } };
  const reply = (paragraphs: string[]) => writtenChapterReply(JSON.stringify({
    title: 'The Oath', paragraphs,
    arcCompletion: { goalId: 'arc-1', completed: false, evidence: '' }, recap: 'Ye Chen kneels.', chapterFunction: 'progression',
    nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The sect.', nextConflict: 'A rival.',
  }));
  const ONE = 'Ye Chen knelt and touched his forehead to the floor before Elder Qin.';
  const TWO = 'When Elder Qin sold him to the Iron Hall, Ye Chen swore he would repay it in blood.';

  it('saves each tie on its chapter, tells the tagger how everyone stands, and shows it in the Codex', async () => {
    let ids = 0;
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
      rawProviderResponse: JSON.stringify({ notes: notesOfTaggedChapter(request.paragraphs.map(paragraph =>
        paragraph === ONE ? `[[appears: Elder Qin | character]] [[tie: MC | Elder Qin | master and disciple]] ${paragraph}`
          : paragraph === TWO ? `[[tie: Elder Qin | MC | sworn enemies]] ${paragraph}` : paragraph)) }),
      providerReceipt: receipt,
    }));
    const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      runtime: { now: () => '2026-11-08T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` },
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
    const ye = state.codexEntries.find(candidate => candidate.mainCharacter)!;
    const qin = state.codexEntries.find(candidate => candidate.name === 'Elder Qin')!;
    expect(first.ties?.[0].payload).toEqual({ origin: 'harness', subject: { name: 'MC', entryId: ye.id }, other: { name: 'Elder Qin', entryId: qin.id }, tie: 'master and disciple' });
    // The second chapter's tagger read how they stood, beside each name.
    const secondRequest = tagChapter.mock.calls[1][0];
    expect(secondRequest.subjects.find(subject => subject.name === 'Ye Chen')).toMatchObject({ ties: [{ with: 'Elder Qin', tie: 'master and disciple' }] });
    const prompt = buildHarnessTagPrompt(secondRequest);
    expect(prompt.userPrompt).toContain('- Ye Chen (the main character) — ties: Elder Qin (master and disciple)');
    expect(prompt.systemInstruction).toContain('[[tie: Name | Other | how they stand now]]');
    // The Codex card says how they stand now, with the sentence that showed it, for both of them.
    const codex = deriveStoryCodex({ entries: state.codexEntries, chapters: state.chapters });
    expect(codex.characters.find(character => character.name === 'Ye Chen')?.ties).toEqual([{ with: 'Elder Qin', text: 'sworn enemies', passage: { chapterNumber: 2, blockId: 'c2-p1', text: TWO } }]);
    expect(codex.characters.find(character => character.name === 'Elder Qin')?.ties?.map(tie => [tie.with, tie.text])).toEqual([['Ye Chen', 'sworn enemies']]);

    // Create mode keeps a tie on its words, and an edit that drops it keeps the chapter's list, empty.
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs, ties: second.ties });
    expect(controller.snapshot().chapters[1].ties).toEqual(second.ties);
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs });
    expect(controller.snapshot().chapters[1].ties).toEqual([]);

    // Rewriting the newest chapter: its tagger reads how they stood from the chapters before it, never the one it replaces.
    generate.mockResolvedValueOnce({ rawProviderResponse: reply([TWO]), providerReceipt: receipt });
    await controller.rewriteLatestChapter(story.id, 'fixture', 'Again.');
    const rewriteRequest = tagChapter.mock.calls.at(-1)![0];
    expect(rewriteRequest.subjects.find(subject => subject.name === 'Ye Chen')).toMatchObject({ ties: [{ with: 'Elder Qin', tie: 'master and disciple' }] });
  });
});

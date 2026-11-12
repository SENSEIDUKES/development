import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessGenerationModelAdapter,
  deriveStoryCodex,
  leftOutTagFlags,
  notesOfTaggedChapter,
  tagsOfCards,
  type HarnessTagRequest,
} from '@seihouse/sen/harness-generation';
import type { CodexEntry } from '../../../narrative/holdings';
import type { WorldRecord } from '../../../narrative/worldRecord';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { storyWorldRecord } from './foundation';
import { readChapterTagging, type TagNote } from './tagger';

/**
 * Minor figures (SENSEI, 2026-11-11: "the taggers are not inventing… they're
 * uncovering"; step 3b). In a story with a world, only a card carries a
 * holding, a condition, a place, a tie or a look. Anyone else keeps where they
 * appear and what they say, and a thing or place that is no card is named only
 * in a card character's own tag. What the tagger gives anyone else is left out
 * before any of its names becomes a Codex entry, and the Codex says so.
 */

const WORLD: WorldRecord = {
  cards: [
    { key: 'world:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, enteredInChapter: 0, slots: {} },
    { key: 'world:character:elder-qin', kind: 'character', name: 'Elder Qin', aliases: ['the gatekeeper'], enteredInChapter: 0, slots: { bio: 'the sect\'s one-armed gatekeeper' } },
    { key: 'world:thing:jade-token', kind: 'thing', name: 'Jade Token', enteredInChapter: 0, slots: {} },
    { key: 'world:place:rift-quarry', kind: 'place', name: 'Rift Quarry', enteredInChapter: 0, slots: {} },
  ],
};

const PARAGRAPHS = [
  'Ye Chen lifted the old blade from the rack.',
  'A stooped porter set down his crate by the door.',
  '“Mind the step,” the porter said.',
  'The porter pocketed a jade coin and limped off toward the Cold Gate.',
  'Elder Qin slid down the pillar and did not rise again.',
  'Ye Chen walked out into the Rift Quarry with the Jade Token in his fist.',
];

const entry = (name: string, kind: CodexEntry['kind'], more: Partial<CodexEntry> = {}): CodexEntry =>
  ({ id: `e-${name}`, storyId: 's1', kind, name, origin: { source: 'world' }, createdAt: '2026-11-11T00:00:00.000Z', ...more });
const ENTRIES: CodexEntry[] = [
  entry('Ye Chen', 'character', { mainCharacter: true, cardKey: 'world:character:ye-chen' }),
  entry('Elder Qin', 'character', { aliases: ['the gatekeeper'], cardKey: 'world:character:elder-qin' }),
  entry('Jade Token', 'thing', { cardKey: 'world:thing:jade-token' }),
  entry('Rift Quarry', 'place', { cardKey: 'world:place:rift-quarry' }),
  // Someone an earlier chapter met: no card, so a minor figure.
  entry('Neighbor', 'character', { origin: { source: 'tag', chapterId: 'c0', chapterNumber: 1 } }),
];
const DECLARED = [{ name: 'Ye Chen', mainCharacter: true as const }];

const note = (paragraph: number, tag: string): TagNote => ({ paragraph, words: PARAGRAPHS[paragraph - 1], tag });
const tagsOf = (notes: TagNote[]) => readChapterTagging({ raw: JSON.stringify({ notes }), sent: PARAGRAPHS, chapterNumber: 2, at: '2026-11-11T00:00:00.000Z' }).tags!;
const kept = (notes: TagNote[], ...world: [WorldRecord | undefined] | []) => tagsOfCards({ tags: tagsOf(notes), storyId: 's1', entries: ENTRIES, world: world.length ? world[0] : WORLD, declared: DECLARED });

describe('the tags only a card carries', () => {
  it('keeps what happens to a card, whoever and whatever else its tag names', () => {
    const result = kept([
      note(1, '[[gained: MC | Rusted Iron Sword]]'),
      note(4, '[[tie: MC | Porter | owes him a favour]]'),
      note(5, '[[status: the gatekeeper | dead]]'),
      note(5, '[[look: Elder Qin | grey and still]]'),
      note(6, '[[place: Ye Chen | Cold Gate]]'),
      note(6, '[[appears: Jade Token | thing]]'),
      note(6, '[[appears: Rift Quarry | place]]'),
    ]);
    expect(result.leftOut).toEqual([]);
    expect(result.holdingChanges).toHaveLength(1);
    expect(result.ties).toHaveLength(1);
    expect(result.statuses).toHaveLength(1);
    expect(result.places).toHaveLength(1);
    expect(result.appearances.map(appearance => appearance.payload.subject.name)).toEqual(['Elder Qin', 'Jade Token', 'Rift Quarry']);
  });

  it('keeps where a minor figure appears, and leaves out everything else the tagger gave them', () => {
    const result = kept([
      note(2, '[[appears: Porter | character]]'),
      note(4, '[[gained: Porter | Jade Coin]]'),
      note(4, '[[place: Porter | Cold Gate]]'),
      note(4, '[[status: Porter | lame]]'),
      note(4, '[[look: Porter | a limp]]'),
      note(4, '[[tie: Porter | Neighbor | brothers]]'),
      // Someone an earlier chapter met is no more a card than someone new.
      note(4, '[[rank: Neighbor | Foundation 2]]'),
    ]);
    expect(result.appearances.map(appearance => appearance.payload.subject.name)).toEqual(['Porter']);
    expect([result.holdingChanges, result.statuses, result.places, result.ties].map(list => list.length)).toEqual([0, 0, 0, 0]);
    expect(result.leftOut.map(left => [left.tag, left.name, left.why])).toEqual([
      ['[[gained: Porter | Jade Coin]]', 'Porter', 'minor-figure'],
      ['[[rank: Neighbor | Foundation 2]]', 'Neighbor', 'minor-figure'],
      ['[[look: Porter | a limp]]', 'Porter', 'minor-figure'],
      ['[[status: Porter | lame]]', 'Porter', 'minor-figure'],
      ['[[place: Porter | Cold Gate]]', 'Porter', 'minor-figure'],
      ['[[tie: Porter | Neighbor | brothers]]', 'Porter', 'minor-figure'],
    ]);
    expect(new Set(result.leftOut.map(left => left.blockId)).size).toBe(1);
  });

  it('gives a thing or place that is no card no appears tag of its own', () => {
    const result = kept([note(4, '[[appears: Cold Gate | place]]'), note(4, '[[appears: Jade Coin | thing]]')]);
    expect(result.appearances).toEqual([]);
    expect(result.leftOut.map(left => [left.tag, left.why])).toEqual([
      ['[[appears: Cold Gate | place]]', 'not-a-card'],
      ['[[appears: Jade Coin | thing]]', 'not-a-card'],
    ]);
  });

  it('keeps every tag of a story with no cards at all', () => {
    const notes = [note(4, '[[gained: Porter | Jade Coin]]'), note(4, '[[place: Porter | Cold Gate]]'), note(4, '[[appears: Cold Gate | place]]')];
    for (const world of [undefined, { cards: [] }]) {
      const result = kept(notes, world);
      expect(result.leftOut).toEqual([]);
      expect([result.holdingChanges.length, result.places.length, result.appearances.length]).toEqual([1, 1, 1]);
    }
  });

  it('says each tag it left out in plain words, in story order', () => {
    const flags = leftOutTagFlags([
      { id: 'c2', chapterNumber: 2, tagging: { status: 'tagged', at: '', leftOut: [{ id: 'a', tag: '[[appears: Cold Gate | place]]', blockId: 'b4', name: 'Cold Gate', why: 'not-a-card' }] } },
      { id: 'c1', chapterNumber: 1, tagging: { status: 'tagged', at: '', leftOut: [{ id: 'h', tag: '[[gained: Porter | Jade Coin]]', blockId: 'b2', name: 'Porter', why: 'minor-figure' }] } },
      { id: 'c3', chapterNumber: 3 },
    ]);
    expect(flags.map(flag => flag.message)).toEqual([
      'Chapter 1: ‘Porter’ is a minor figure, who keeps only where they appear and what they say. [[gained: Porter | Jade Coin]] is left out. Promote them to a card to keep tags like it.',
      'Chapter 2: ‘Cold Gate’ is not a card, so it steps onto the page only in a card character\'s own tag. [[appears: Cold Gate | place]] is left out.',
    ]);
    expect(flags[0]).toMatchObject({ kind: 'tag-left-out', chapterId: 'c1', chapterNumber: 1, recordId: 'h', blockId: 'b2', name: 'Porter' });
  });
});

describe('a chapter tagged in a story with a world', () => {
  const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 30 }] };
  const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-11-11T12:00:00.000Z', usage: { source: 'reported' as const, inputTokens: 420, outputTokens: 60 } };
  const reply = JSON.stringify({
    title: 'The Armory', paragraphs: PARAGRAPHS,
    arcCompletion: { goalId: 'arc-1-armory', completed: false, evidence: '' },
    recap: 'Ye Chen trains.', chapterFunction: 'progression',
    nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The armory\'s past.', nextConflict: 'A rival arrives.',
  });
  const TAGGED: Record<string, string> = {
    [PARAGRAPHS[0]]: `[[gained: MC | Rusted Iron Sword]] ${PARAGRAPHS[0]}`,
    [PARAGRAPHS[1]]: `[[appears: Porter | character]] ${PARAGRAPHS[1]}`,
    [PARAGRAPHS[2]]: `[[@Porter]] ${PARAGRAPHS[2]}`,
    [PARAGRAPHS[3]]: `[[gained: Porter | Jade Coin]] [[appears: Cold Gate | place]] [[status: Porter | lame]] [[place: Porter | Cold Gate]] ${PARAGRAPHS[3]}`,
    [PARAGRAPHS[4]]: `[[status: Elder Qin | dead]] ${PARAGRAPHS[4]}`,
    [PARAGRAPHS[5]]: `[[place: MC | Rift Quarry]] ${PARAGRAPHS[5]}`,
  };

  const written = async () => {
    let ids = 0;
    const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
      rawProviderResponse: JSON.stringify({ notes: notesOfTaggedChapter(request.paragraphs.map(paragraph => TAGGED[paragraph] ?? paragraph)) }),
      providerReceipt: receipt,
    }));
    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      runtime: { now: () => '2026-11-11T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` },
      modelAdapter: {
        getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
        generate,
        arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
        tagChapter,
      },
    });
    await controller.hydrate();
    const story = await controller.createStory({
      premise: 'Ye Chen survives the armory trial.', destinedEnding: 'Ye Chen masters the armory.', initialArcPlan: GOAL,
      cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
      worldAtChapterZero: WORLD,
    });
    generate.mockResolvedValueOnce({ rawProviderResponse: writtenChapterReply(reply), providerReceipt: receipt });
    await controller.generateNextChapter(story.id, 'fixture');
    return { controller, storyId: story.id, tagChapter };
  };

  const expectHeld = (controller: HarnessGenerationController, storyId: string) => {
    const state = controller.snapshot();
    const chapter = state.chapters.at(-1)!;
    const names = state.codexEntries.filter(entry => entry.storyId === storyId).map(entry => entry.name);
    // The porter is met and the sword is the main character's; what only the porter's own tags named never became an entry.
    expect(names).toEqual(expect.arrayContaining(['Ye Chen', 'Elder Qin', 'Porter', 'Rusted Iron Sword']));
    expect(names).not.toContain('Jade Coin');
    expect(names).not.toContain('Cold Gate');
    expect(chapter.holdingChanges?.map(change => change.payload.holder.name)).toEqual(['MC']);
    expect(chapter.statuses?.map(status => status.payload.subject.name)).toEqual(['Elder Qin']);
    expect(chapter.places?.map(place => place.payload.place.name)).toEqual(['Rift Quarry']);
    expect(chapter.speakers).toHaveLength(1);
    // The porter steps onto the page. So do the sword and the place, by the main character's own tags: a thing or
    // place with no card is named only there, and that sentence is what the Codex's Minor list shows it by.
    expect(chapter.appearances?.map(appearance => appearance.payload.subject.name)).toEqual(['Porter', 'Rusted Iron Sword', 'Rift Quarry']);
    expect(chapter.tagging?.leftOut?.map(left => left.tag)).toEqual([
      '[[gained: Porter | Jade Coin]]', '[[appears: Cold Gate | place]]', '[[status: Porter | lame]]', '[[place: Porter | Cold Gate]]',
    ]);
    const codex = deriveStoryCodex({ entries: state.codexEntries.filter(entry => entry.storyId === storyId), chapters: state.chapters, world: storyWorldRecord(state, storyId), mainCharacterName: 'Ye Chen' });
    expect(codex.checks.filter(check => check.kind === 'tag-left-out').map(check => check.name)).toEqual(['Porter', 'Cold Gate', 'Porter', 'Porter']);
    // A minor figure and a thing with no card are both still listed, and may be promoted.
    expect(codex.minor.map(minor => [minor.name, minor.promotable])).toEqual(expect.arrayContaining([['Porter', true], ['Rusted Iron Sword', true]]));
  };

  it('saves what the cards carry and lists the rest among the Codex\'s checks', async () => {
    const { controller, storyId, tagChapter } = await written();
    expectHeld(controller, storyId);
    // The tagger was handed the pool: each card marked, a card character with who they are.
    const subjects = tagChapter.mock.calls[0][0].subjects;
    expect(subjects.find(subject => subject.name === 'Elder Qin')).toMatchObject({ card: true, who: 'the sect\'s one-armed gatekeeper', aliases: ['the gatekeeper'] });
    expect(subjects.every(subject => subject.card)).toBe(true);
  });

  it('holds a chapter read again to the same rule', async () => {
    const { controller, storyId } = await written();
    await controller.retagChapter(storyId, controller.snapshot().chapters.at(-1)!.id);
    expectHeld(controller, storyId);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  conditionLabel,
  conditionsSection,
  deriveConditions,
  deriveStoryCodex,
  notesOfTaggedChapter,
  placeStatuses,
  readStatusTag,
  type HarnessGenerationModelAdapter,
  type HarnessTagRequest,
} from '@seihouse/sen/harness-generation';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { presentAppearances, presentConditions } from '../../../server/harness-generation/prompt';
import type { WorldRecord } from '../../../narrative/worldRecord';
import { HARNESS_GENERATION_SCHEMA_VERSION, type StoryInformationPacket } from '../../../narrative/generation';
import { createEmptyHarnessWorkspaceState, migrateHarnessWorkspaceState } from './repository';
import { readMarks } from '../../../narrative/marks';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { acceptChapterTags } from './responseAcceptance';

/**
 * Status, the second information tag (SENSEI, 2026-10-31), built the way
 * appearances are: the tagger tags the sentence where the prose begins a
 * lasting condition (`[[status: Elder Qin | dead]]`) or ends one
 * (`[[status: MC | poisoned | ended]]`, SENSEI, 2026-11-11), and the HARNESS
 * saves it on that sentence. What a character carries is their card's
 * conditions and the ones the page began, less the ones it ended. The tagger
 * and the writer are both told it, and the Codex card shows it.
 */

const tag = (text: string) => readMarks(text).wordTags[0];

describe('reading status tags', () => {
  it('reads who and how they are now, keeping the prose exactly as it was', () => {
    const reading = readMarks('[[status: Elder Qin | dead]] Elder Qin did not rise again.');
    expect(reading.text).toBe('Elder Qin did not rise again.');
    expect(readStatusTag(reading.wordTags[0])).toEqual({ ok: true, status: { subject: { name: 'Elder Qin' }, status: 'dead' } });
    // Other spellings a tagger slips into read the same.
    expect(readStatusTag(tag('[[Condition: MC | badly wounded]] He fell.'))).toEqual({ ok: true, status: { subject: { name: 'MC' }, status: 'badly wounded' } });
  });

  it('sets aside a status that says nothing, or tells what happened instead of how they are', () => {
    expect(readMarks('[[status: Elder Qin]] He fell.').wordTagIssues).toEqual([{ kind: 'incomplete', word: 'status' }]);
    const story = readStatusTag(tag('[[status: Elder Qin | struck down by the sect leader in the hall after a long duel]] He fell.'));
    expect(story).toMatchObject({ ok: false });
  });

  it('places each status on the sentence its tag points at, apart from the other tags beside it', () => {
    const reading = readMarks('The hall went quiet. [[gained: MC | Iron Key]] [[status: Elder Qin | dead]] Elder Qin did not rise again.');
    const placed = placeStatuses({ paragraphs: [{ blockId: 'c1-p0', text: reading.text, wordTags: reading.wordTags }] });
    expect(placed.problems).toEqual([]);
    expect(placed.statuses).toHaveLength(1);
    expect(placed.statuses[0]).toMatchObject({
      kind: 'status',
      anchor: { blockId: 'c1-p0', selectedText: 'Elder Qin did not rise again.' },
      payload: { origin: 'harness', subject: { name: 'Elder Qin' }, status: 'dead' },
    });
  });

  it('is read with the chapter\'s other tags, and an unreadable one is flagged as a status, never as a holding', () => {
    const warnings: Parameters<typeof acceptChapterTags>[2] = [];
    const tags = acceptChapterTags(['[[status: Elder Qin | dead]] Elder Qin fell. [[status: Lin]] Lin wept.'], 1, warnings);
    expect(tags.paragraphs).toEqual(['Elder Qin fell. Lin wept.']);
    expect(tags.statuses.map(status => status.payload.status)).toEqual(['dead']);
    expect(warnings.map(warning => warning.code)).toEqual(['status_tags_incomplete']);
  });
});

describe('what the page begins and ends', () => {
  const entries = [{ id: 'e-qin', storyId: 's', kind: 'character' as const, name: 'Elder Qin', origin: { source: 'foundation' as const }, createdAt: 'now' }];
  const tagAt = (chapterNumber: number, paragraph: number, status: string, ended = false, subject: { name: string; entryId?: string } = { name: 'Elder Qin', entryId: 'e-qin' }) => ({
    id: `status:c${chapterNumber}-p${paragraph}:0`, kind: 'status' as const,
    anchor: { level: 'span' as const, blockId: `c${chapterNumber}-p${paragraph}`, startOffset: 0, endOffset: 8, selectedText: 'He fell.' },
    payload: { origin: 'harness' as const, subject, status, ...(ended ? { ended: true as const } : {}) },
  });
  const chapter = (chapterNumber: number, ...statuses: ReturnType<typeof tagAt>[]) => ({ id: `c${chapterNumber}`, chapterNumber, statuses });
  const began = (chapterNumber: number, paragraph: number) => ({ chapterId: `c${chapterNumber}`, chapterNumber, recordId: `status:c${chapterNumber}-p${paragraph}:0`, blockId: `c${chapterNumber}-p${paragraph}`, text: 'He fell.' });

  it('reads a last part that says "ended" as the end of that condition', () => {
    expect(readStatusTag(tag('[[status: MC | poisoned | ended]] The poison left him.'))).toEqual({ ok: true, status: { subject: { name: 'MC' }, status: 'poisoned', ended: true } });
    expect(readStatusTag(tag('[[status: MC | poisoned | Ended]] The poison left him.'))).toMatchObject({ status: { status: 'poisoned', ended: true } });
    // Only as the last part, after the condition's name: a condition called "ended" is not an end.
    expect(readStatusTag(tag('[[status: MC | ended]] It was over.'))).toEqual({ ok: true, status: { subject: { name: 'MC' }, status: 'ended' } });
  });

  it('lets conditions stand side by side until the page ends each, whatever order the chapters are given in', () => {
    const state = deriveConditions({ entries, chapterNumber: 20, chapters: [
      chapter(3, tagAt(3, 1, 'shoulder injured')),
      chapter(1, tagAt(1, 4, 'wounded'), tagAt(1, 6, 'poisoned')),
      chapter(5, tagAt(5, 2, 'poisoned', true)),
    ] });
    expect(state.characters).toEqual([{ key: 'e-qin', name: 'Elder Qin', mainCharacter: false, conditions: [
      { name: 'wounded', endsIf: [], began: began(1, 4) },
      { name: 'shoulder injured', endsIf: [], began: began(3, 1) },
    ] }]);
    expect(state.flags).toEqual([]);
  });

  it('never carries one twice, and ends it whatever the tag\'s capitals', () => {
    const twice = [chapter(9, tagAt(9, 1, 'shoulder injured'), tagAt(9, 7, 'Shoulder injured'))];
    expect(deriveConditions({ entries, chapters: twice, chapterNumber: 10 }).characters[0].conditions).toEqual([{ name: 'shoulder injured', endsIf: [], began: began(9, 1) }]);
    expect(deriveConditions({ entries, chapters: [...twice, chapter(12, tagAt(12, 1, 'SHOULDER INJURED', true))], chapterNumber: 13 }).characters).toEqual([]);
  });

  it('ends a card\'s condition too, so a cure stops its course', () => {
    const world: WorldRecord = { cards: [{ key: 'world:character:elder-qin', kind: 'character', name: 'Elder Qin', enteredInChapter: 0,
      slots: { status: 'Old wall wound | aches in the cold > opens again > will not close | a stage every 2 chapters | ends if a healer closes it' } }] };
    const linked = [{ ...entries[0], cardKey: 'world:character:elder-qin' }];
    // The card's condition runs its course, and a tag that names it again does not begin a second one.
    const running = deriveConditions({ world, entries: linked, chapters: [chapter(2, tagAt(2, 1, 'old wall wound'))], chapterNumber: 4 });
    expect(running.characters).toEqual([{ key: 'e-qin', cardKey: 'world:character:elder-qin', name: 'Elder Qin', mainCharacter: false, conditions: [
      { name: 'Old wall wound', showing: 'opens again', stage: 2, stages: 3, movesIn: 1, then: 'next', endsIf: ['a healer closes it'] },
    ] }]);
    // The page ends it in Chapter 3: from then on it is gone, and it never reaches its last stage.
    const cured = deriveConditions({ world, entries: linked, chapters: [chapter(3, tagAt(3, 1, 'old wall wound', true))], chapterNumber: 9 });
    expect(cured).toEqual({ characters: [], flags: [] });
  });

  it('ends the condition a tag names exactly, never one that only shares its words', () => {
    const world: WorldRecord = { cards: [{ key: 'world:character:elder-qin', kind: 'character', name: 'Elder Qin', enteredInChapter: 0,
      slots: { status: 'Wound\nPoisoned wound\nOld wall wound | aches in the cold > opens again | a stage every 2 chapters' } }] };
    const linked = [{ ...entries[0], cardKey: 'world:character:elder-qin' }];
    const names = (chapters: ReturnType<typeof chapter>[], chapterNumber = 4) =>
      deriveConditions({ world, entries: linked, chapters, chapterNumber }).characters[0]?.conditions.map(condition => condition.name) ?? [];
    expect(names([chapter(2, tagAt(2, 1, 'Poisoned wound', true))])).toEqual(['Wound', 'Old wall wound']);
    expect(names([chapter(2, tagAt(2, 1, 'wound', true))])).toEqual(['Poisoned wound', 'Old wall wound']);
    // The name as the tagger's list shows it, with how it shows now, is that condition's name too.
    expect(names([chapter(3, tagAt(3, 1, 'Old wall wound (opens again)', true))])).toEqual(['Wound', 'Poisoned wound']);
  });

  it('ends a condition by the words the tagger\'s list shows it under, however long they are', () => {
    const world: WorldRecord = { cards: [{ key: 'world:character:elder-qin', kind: 'character', name: 'Elder Qin', enteredInChapter: 0,
      slots: { status: 'Frost-burned left hand | fingers numb to the second joint > skin blackened up to the wrist | a stage every 2 chapters' } }] };
    const linked = [{ ...entries[0], cardKey: 'world:character:elder-qin' }];
    // What the tagger is shown for it in Chapter 3, and returns in its end tag: more words than a beginning may have.
    const listed = conditionLabel(deriveConditions({ world, entries: linked, chapterNumber: 3 }).characters[0].conditions[0]);
    expect(listed).toBe('Frost-burned left hand (skin blackened up to the wrist)');
    const read = readStatusTag(tag(`[[status: Elder Qin | ${listed} | ended]] The frost left his hand at last.`));
    expect(read).toEqual({ ok: true, status: { subject: { name: 'Elder Qin' }, status: listed, ended: true } });
    const ended = { ...tagAt(3, 1, listed, true) };
    expect(deriveConditions({ world, entries: linked, chapters: [chapter(3, ended)], chapterNumber: 4 })).toEqual({ characters: [], flags: [] });
    // A beginning that long still tells what happened, and is set aside.
    expect(readStatusTag(tag(`[[status: Elder Qin | ${listed}]] The frost took his hand.`))).toMatchObject({ ok: false });
  });

  it('carries a condition whose name only contains another\'s as its own', () => {
    const state = deriveConditions({ entries, chapters: [chapter(1, tagAt(1, 1, 'Wound')), chapter(2, tagAt(2, 1, 'Poisoned wound'))], chapterNumber: 3 });
    expect(state.characters[0].conditions.map(condition => condition.name)).toEqual(['Wound', 'Poisoned wound']);
  });

  it('lets a card\'s condition take the place of the page\'s of the same name when the card enters, never both', () => {
    const world: WorldRecord = { cards: [{ key: 'world:character:elder-qin', kind: 'character', name: 'Elder Qin', enteredInChapter: 8, slots: { status: 'Poisoned' } }] };
    const linked = [{ ...entries[0], cardKey: 'world:character:elder-qin' }];
    const poisoned = [chapter(3, tagAt(3, 1, 'poisoned'), tagAt(3, 4, 'limping'))];
    const names = (chapterNumber: number, chapters = poisoned) => deriveConditions({ world, entries: linked, chapters, chapterNumber }).characters[0]?.conditions ?? [];
    expect(names(5)).toEqual([{ name: 'poisoned', endsIf: [], began: began(3, 1) }, { name: 'limping', endsIf: [], began: began(3, 4) }]);
    expect(names(8)).toEqual([{ name: 'Poisoned', endsIf: [] }, { name: 'limping', endsIf: [], began: began(3, 4) }]);
    // One cure ends the one condition.
    expect(names(12, [...poisoned, chapter(10, tagAt(10, 1, 'poisoned', true))])).toEqual([{ name: 'limping', endsIf: [], began: began(3, 4) }]);
  });

  it('never lets a tag from before a card entered end a condition that card states', () => {
    // Promoted in Chapter 8 and filled in with "Poisoned"; long before, the page had poisoned and cured them once already.
    const world: WorldRecord = { cards: [{ key: 'world:character:elder-qin', kind: 'character', name: 'Elder Qin', enteredInChapter: 8, slots: { status: 'Poisoned' } }] };
    const linked = [{ ...entries[0], cardKey: 'world:character:elder-qin' }];
    const earlier = [chapter(1, tagAt(1, 1, 'Poisoned')), chapter(2, tagAt(2, 1, 'Poisoned', true))];
    const at = (chapterNumber: number, chapters = earlier) => deriveConditions({ world, entries: linked, chapters, chapterNumber });
    // In Chapter 1 it is the page's condition, with its sentence; the cure in Chapter 2 ends that one.
    expect(at(1, [earlier[0]]).characters[0].conditions).toEqual([{ name: 'Poisoned', endsIf: [], began: began(1, 1) }]);
    expect(at(5)).toEqual({ characters: [], flags: [] });
    // From Chapter 8 the card's own stands, untouched by the old cure, until the page ends it again.
    expect(at(8).characters[0].conditions).toEqual([{ name: 'Poisoned', endsIf: [] }]);
    expect(at(12, [...earlier, chapter(10, tagAt(10, 1, 'poisoned', true))])).toEqual({ characters: [], flags: [] });
  });

  it('lists a condition too long to show whole by its name alone, so an end tag can still name it', () => {
    const name = 'Frost-burned left hand and forearm, from the night on the ridge';
    const stage = `skin blackened ${'and cracked '.repeat(12)}up to the elbow`;
    expect(`${name} (${stage})`.length).toBeGreaterThan(200);
    const world: WorldRecord = { cards: [{ key: 'world:character:elder-qin', kind: 'character', name: 'Elder Qin', enteredInChapter: 0, slots: { status: `${name} | ${stage}` } }] };
    const linked = [{ ...entries[0], cardKey: 'world:character:elder-qin' }];
    const listed = conditionLabel(deriveConditions({ world, entries: linked, chapterNumber: 3 }).characters[0].conditions[0]);
    expect(listed).toBe(name);
    expect(deriveConditions({ world, entries: linked, chapters: [chapter(3, tagAt(3, 1, listed, true))], chapterNumber: 4 })).toEqual({ characters: [], flags: [] });
  });

  it('keeps what a name in brackets tells apart, and lets a name that could be two conditions name neither', () => {
    const both = chapter(1, tagAt(1, 1, 'broken arm (left)'), tagAt(1, 2, 'broken arm (right)'));
    const after = (...more: ReturnType<typeof chapter>[]) => deriveConditions({ entries, chapters: [both, ...more], chapterNumber: 9 });
    expect(after().characters[0].conditions.map(condition => condition.name)).toEqual(['broken arm (left)', 'broken arm (right)']);
    expect(after(chapter(4, tagAt(4, 1, 'Broken arm (right)', true))).characters[0].conditions.map(condition => condition.name)).toEqual(['broken arm (left)']);
    // "broken arm" could be either: it ends neither, and the record says so.
    const unsure = after(chapter(4, tagAt(4, 1, 'broken arm', true)));
    expect(unsure.characters[0].conditions).toHaveLength(2);
    expect(unsure.flags.map(flag => flag.kind)).toEqual(['condition-not-carried']);
    // A near name that is near only one still finds it.
    const one = deriveConditions({ entries, chapters: [chapter(1, tagAt(1, 1, 'frost-burned hand')), chapter(2, tagAt(2, 1, 'frost-burned hands', true))], chapterNumber: 3 });
    expect(one).toEqual({ characters: [], flags: [] });
  });

  it('leaves out an end that ends nothing, and says so', () => {
    const state = deriveConditions({ entries, chapters: [chapter(4, tagAt(4, 2, 'poisoned', true))], chapterNumber: 5 });
    expect(state.characters).toEqual([]);
    expect(state.flags).toEqual([{
      kind: 'condition-not-carried', chapterId: 'c4', chapterNumber: 4, recordId: 'status:c4-p2:0', blockId: 'c4-p2', name: 'Elder Qin',
      message: 'Chapter 4: a tag says ‘poisoned’ ended for Elder Qin, but they carried no such condition. It is left out.',
    }]);
  });

  it('keeps what someone with no card and no entry carries, under the name the tag gave', () => {
    const state = deriveConditions({ entries, chapters: [chapter(7, tagAt(7, 3, 'fever', false, { name: 'the boy' }))], chapterNumber: 8 });
    expect(state.characters).toEqual([{ key: 'character:the boy', name: 'the boy', mainCharacter: false, conditions: [{ name: 'fever', endsIf: [], began: began(7, 3) }] }]);
  });

  it('reaches the writer in its Conditions section, for someone never tagged appearing, and no longer in Appeared', () => {
    const section = conditionsSection({ entries, chapters: [chapter(2, tagAt(2, 1, 'dead'))], chapterNumber: 3 })!;
    expect(section).toEqual({ characters: [{ name: 'Elder Qin', conditions: [{ name: 'dead', endsIf: [] }] }] });
    expect(presentConditions(section)).toBe('- Elder Qin: dead');
    expect(presentAppearances({ entries: [{ name: 'Elder Qin', entity: 'character', look: 'a stooped old man in grey' }] }))
      .toBe('- Elder Qin (character): a stooped old man in grey');
  });
});

describe('a story saved before the page began and ended conditions', () => {
  const old = (id: string, paragraph: number, name: string, entryId: string | undefined, status: string) => ({
    id, kind: 'status', anchor: { level: 'span', blockId: `c1-p${paragraph}`, startOffset: 0, endOffset: 8, selectedText: 'He fell.' },
    payload: { origin: 'harness', subject: { name, ...(entryId ? { entryId } : {}) }, status },
  });
  const stored = {
    ...createEmptyHarnessWorkspaceState(), schemaVersion: 48,
    stories: [{ id: 's' }],
    chapters: [
      // Saved out of story order, with its statuses out of reading order, as storage may hold them.
      { id: 'c2', storyId: 's', chapterNumber: 2, statuses: [
        { ...old('status:c2-p5:0', 5, 'Lin', 'e-lin', 'freed from the cavern'), anchor: { level: 'span', blockId: 'c2-p5', startOffset: 0, endOffset: 8, selectedText: 'He fell.' } },
        { ...old('status:c2-p2:0', 2, 'frost cub', undefined, 'wound treated'), anchor: { level: 'span', blockId: 'c2-p2', startOffset: 0, endOffset: 8, selectedText: 'He fell.' } },
      ] },
      { id: 'c1', storyId: 's', chapterNumber: 1, statuses: [
        old('status:c1-p3:0', 3, 'Lin', 'e-lin', 'frost-burned hand'), old('status:c1-p9:0', 9, 'Lin', 'e-lin', 'trapped'),
        old('status:c1-p4:0', 4, 'frost cub', undefined, 'injured'), old('status:c1-p6:0', 6, 'Frost Cub', undefined, 'injured'),
      ] },
      { id: 'other', storyId: 'another', chapterNumber: 1, statuses: [old('status:x', 1, 'Lin', 'e-lin', 'asleep')] },
    ],
  };

  it('is upgraded so each character still carries exactly their latest status, as they did', () => {
    const upgraded = migrateHarnessWorkspaceState(stored)!;
    expect(upgraded.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);
    const carried = deriveConditions({ chapters: upgraded.chapters.filter(chapter => chapter.storyId === 's'), chapterNumber: 3 });
    expect(carried.characters.map(character => [character.name, character.conditions.map(condition => condition.name)]))
      .toEqual([['Lin', ['freed from the cavern']], ['frost cub', ['wound treated']]]);
    expect(carried.flags).toEqual([]);
    // Where a later status replaced an earlier one, the earlier one ends there, on that sentence, just before it.
    const tags = (id: string) => upgraded.chapters.find(chapter => chapter.id === id)!.statuses!.map(status => [status.id, status.payload.status, status.payload.ended ?? false, status.anchor.blockId]);
    expect(tags('c1')).toEqual([
      ['status:c1-p3:0', 'frost-burned hand', false, 'c1-p3'],
      ['status:c1-p9:0:ended', 'frost-burned hand', true, 'c1-p9'], ['status:c1-p9:0', 'trapped', false, 'c1-p9'],
      ['status:c1-p4:0', 'injured', false, 'c1-p4'],
      // The same status said again replaces nothing.
      ['status:c1-p6:0', 'injured', false, 'c1-p6'],
    ]);
    expect(tags('c2')).toEqual([
      ['status:c2-p5:0:ended', 'trapped', true, 'c2-p5'], ['status:c2-p5:0', 'freed from the cavern', false, 'c2-p5'],
      ['status:c2-p2:0:ended', 'injured', true, 'c2-p2'], ['status:c2-p2:0', 'wound treated', false, 'c2-p2'],
    ]);
    // Another story's statuses are its own.
    expect(tags('other')).toEqual([['status:x', 'asleep', false, 'c1-p1']]);
  });

  it('ends a superseded status that differs only in what it says in brackets', () => {
    const arms = {
      ...createEmptyHarnessWorkspaceState(), schemaVersion: 48, stories: [{ id: 's' }],
      chapters: [{ id: 'c1', storyId: 's', chapterNumber: 1, statuses: [old('status:c1-p1:0', 1, 'Lin', 'e-lin', 'wounded (left arm)'), old('status:c1-p5:0', 5, 'Lin', 'e-lin', 'wounded (right arm)')] }],
    };
    const upgraded = migrateHarnessWorkspaceState(arms)!;
    expect(deriveConditions({ chapters: upgraded.chapters, chapterNumber: 2 }).characters[0].conditions.map(condition => condition.name)).toEqual(['wounded (right arm)']);
  });

  it('moves a status a frozen packet carried in Appeared to its Conditions, so a retried chapter is still told', () => {
    const frozen = {
      ...createEmptyHarnessWorkspaceState(), schemaVersion: 48,
      attempts: [
        { id: 'a1', storyInformation: {
          appearances: { entries: [{ name: 'Elder Qin', entity: 'character', status: 'dead', look: 'a stooped old man in grey' }, { name: 'Lin', entity: 'character', mainCharacter: true, status: 'wounded' }, { name: 'Iron Key', entity: 'thing' }] },
          conditions: { characters: [{ name: 'Lin', mainCharacter: true, conditions: [{ name: 'Frost-burned hand', showing: 'numb', endsIf: [] }] }] },
        } },
        { id: 'a2', storyInformation: { appearances: { entries: [{ name: 'Iron Key', entity: 'thing' }] } } },
      ],
    };
    const [first, second] = migrateHarnessWorkspaceState(frozen)!.attempts as unknown as Array<{ storyInformation: StoryInformationPacket }>;
    expect(first.storyInformation.appearances!.entries).toEqual([
      { name: 'Elder Qin', entity: 'character', look: 'a stooped old man in grey' }, { name: 'Lin', entity: 'character', mainCharacter: true }, { name: 'Iron Key', entity: 'thing' },
    ]);
    expect(presentConditions(first.storyInformation.conditions!)).toBe([
      '- Lin (main character): Frost-burned hand, numb', '- Lin (main character): wounded', '- Elder Qin: dead',
    ].join('\n'));
    // A packet with no status in it is left exactly as it was.
    expect(second).toEqual(frozen.attempts[1]);
  });
});

describe('a character met only by a status tag', () => {
  it('has a Codex card, first seen where the tag was, carrying that condition', () => {
    const entries = [{ id: 'e-guard', storyId: 's', kind: 'character' as const, name: 'Guard Captain Mo', origin: { source: 'tag' as const, chapterId: 'c1', chapterNumber: 1 }, createdAt: 'now' }];
    const text = 'Guard Captain Mo fell from the wall.';
    const codex = deriveStoryCodex({ entries, chapters: [{
      id: 'c1', chapterNumber: 1, paragraphs: [text],
      statuses: [{
        id: 'status:c1-p1:0', kind: 'status', anchor: { level: 'span', blockId: 'c1-p1', startOffset: 0, endOffset: text.length, selectedText: text },
        payload: { origin: 'harness', subject: { name: 'Guard Captain Mo', entryId: 'e-guard' }, status: 'dead' },
      }],
    }] });
    expect(codex.characters).toHaveLength(1);
    expect(codex.characters[0]).toMatchObject({
      key: 'e-guard', name: 'Guard Captain Mo',
      firstSeen: { chapterNumber: 1, blockId: 'c1-p1', text },
      conditions: [{ name: 'dead', passage: { chapterNumber: 1, blockId: 'c1-p1', text } }],
    });
  });
});

describe('status in the chapter flow', () => {
  const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-31T12:00:00.000Z', usage: { source: 'unavailable' as const } };
  const reply = (paragraphs: string[]) => writtenChapterReply(JSON.stringify({
    title: 'The Hall', paragraphs,
    arcCompletion: { goalId: 'arc-1', completed: false, evidence: '' }, recap: 'Ye Chen fights.', chapterFunction: 'progression',
    nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The hall.', nextConflict: 'A rival.',
  }));
  const ONE = 'Elder Qin took the blow meant for Ye Chen.';
  const TWO = 'Elder Qin did not rise again.';

  it('saves each status on its chapter, tells the tagger the status so far, and shows it on the Codex card', async () => {
    let ids = 0;
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
      rawProviderResponse: JSON.stringify({ notes: notesOfTaggedChapter(request.paragraphs.map(paragraph =>
        paragraph === ONE ? `[[appears: Elder Qin | character]] [[status: Elder Qin | wounded]] ${paragraph}`
          : paragraph === TWO ? `[[status: Elder Qin | dead]] ${paragraph}` : paragraph)) }),
      providerReceipt: receipt,
    }));
    const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      runtime: { now: () => '2026-10-31T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` },
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
    const qin = state.codexEntries.find(entry => entry.name === 'Elder Qin')!;
    expect(first.statuses?.[0].payload).toMatchObject({ subject: { name: 'Elder Qin', entryId: qin.id }, status: 'wounded' });
    expect(second.statuses?.[0].payload).toMatchObject({ subject: { entryId: qin.id }, status: 'dead' });
    // The second chapter's tagger read the status so far, beside the name.
    const secondRequest = tagChapter.mock.calls[1][0];
    expect(secondRequest.subjects.find(subject => subject.name === 'Elder Qin')).toMatchObject({ conditions: ['wounded'] });
    expect(buildHarnessTagPrompt(secondRequest).userPrompt).toContain('- Elder Qin — conditions: wounded');
    expect(buildHarnessTagPrompt(secondRequest).systemInstruction).toContain('[[status: Name | the condition]]');
    expect(buildHarnessTagPrompt(secondRequest).systemInstruction).toContain('[[status: Name | the condition, as listed | ended]]');
    // The Codex card lists what they carry, each with the sentence that began it.
    const codex = deriveStoryCodex({ entries: state.codexEntries, chapters: state.chapters });
    expect(codex.characters.find(character => character.name === 'Elder Qin')?.conditions).toEqual([
      { name: 'wounded', passage: { chapterNumber: 1, blockId: 'c1-p1', text: ONE } },
      { name: 'dead', passage: { chapterNumber: 2, blockId: 'c2-p1', text: TWO } },
    ]);

    // Create mode keeps a status on its words, and an edit that drops it keeps the chapter's list, empty.
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs, statuses: second.statuses });
    expect(controller.snapshot().chapters[1].statuses).toEqual(second.statuses);
    await controller.authorChapter(second.id, { paragraphs: second.paragraphs });
    expect(controller.snapshot().chapters[1].statuses).toEqual([]);
    await expect(controller.authorChapter(second.id, { paragraphs: ['Elder Qin rose again, unharmed.', ...second.paragraphs.slice(1)], statuses: second.statuses }))
      .rejects.toThrow(/must sit on its words/);

    // Rewriting the newest chapter: its tagger reads the status from the chapters before it, never the one it replaces.
    generate.mockResolvedValueOnce({ rawProviderResponse: reply([TWO]), providerReceipt: receipt });
    await controller.rewriteLatestChapter(story.id, 'fixture', 'Again.');
    const rewriteRequest = tagChapter.mock.calls.at(-1)![0];
    expect(rewriteRequest.subjects.find(subject => subject.name === 'Elder Qin')).toMatchObject({ conditions: ['wounded'] });
  });
});

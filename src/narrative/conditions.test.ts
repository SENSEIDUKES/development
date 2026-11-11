import { describe, expect, it } from 'vitest';
import { CONDITION_LIMIT, conditionAfter, readConditions, worldCardConditions } from './conditions';

/**
 * Conditions (SENSEI, 2026-11-11): each one is its own entry on the character,
 * written with its whole course at the start, and the chapter count runs it.
 * Nothing here asks a model anything.
 */

describe('Reading a card\'s conditions', () => {
  it('reads one condition a line: its name, its stages, its pace and what ends it', () => {
    expect(readConditions('Frost-burned hand | numb fingers > blackened skin > the hand is lost | a stage every 5 chapters | ends if a healer treats it; or the hand is cut away')).toEqual([{
      name: 'Frost-burned hand', stages: ['numb fingers', 'blackened skin', 'the hand is lost'], pace: 5, passes: false,
      endsIf: ['a healer treats it', 'the hand is cut away'],
    }]);
  });

  it('reads a name alone as a condition that does not change by itself', () => {
    expect(readConditions('Blind from birth')).toEqual([{ name: 'Blind from birth', stages: [], passes: false, endsIf: [] }]);
    expect(readConditions('Sealed meridians | ends if the seal is broken')).toEqual([{ name: 'Sealed meridians', stages: [], passes: false, endsIf: ['the seal is broken'] }]);
  });

  it('lets several stand side by side, one a line, and never the same one twice', () => {
    const read = readConditions('Broken arm | splinted > healing > gone | a stage every 3 chapters\n- Blind from birth\nbroken arm | again\n\n');
    expect(read.map(condition => condition.name)).toEqual(['Broken arm', 'Blind from birth']);
    // Stages that end in "gone" pass by themselves.
    expect(read[0]).toMatchObject({ stages: ['splinted', 'healing'], pace: 3, passes: true });
    expect(readConditions(Array.from({ length: 12 }, (_, index) => `Mark ${index + 1}`).join('\n'))).toHaveLength(CONDITION_LIMIT);
  });

  it('takes a card that says they are well as carrying nothing, and a one-word status saved before as a condition', () => {
    for (const well of ['Well', 'healthy', ' Fine. ', 'Unharmed', 'None', '']) expect(readConditions(well)).toEqual([]);
    expect(readConditions(undefined)).toEqual([]);
    expect(readConditions('Wounded')).toEqual([{ name: 'Wounded', stages: [], passes: false, endsIf: [] }]);
  });

  it('reads the parts in any order, and a pace with nothing to move through moves nothing', () => {
    expect(readConditions('Fever | ends when the herb is found | every 2 chapters | shivering > burning')).toEqual([
      { name: 'Fever', stages: ['shivering', 'burning'], pace: 2, passes: false, endsIf: ['the herb is found'] },
    ]);
    expect(readConditions('Cursed | a stage every 4 chapters')).toEqual([{ name: 'Cursed', stages: [], passes: false, endsIf: [] }]);
  });

  it('is only ever a character\'s: a thing\'s status is its own', () => {
    expect(worldCardConditions({ kind: 'character', slots: { status: 'Blind from birth' } })).toHaveLength(1);
    expect(worldCardConditions({ kind: 'thing', slots: { status: 'Damaged' } })).toEqual([]);
  });
});

describe('A condition\'s course', () => {
  const [hand] = readConditions('Frost-burned hand | numb > blackened > lost | a stage every 5 chapters | ends if treated');
  const [arm] = readConditions('Broken arm | splinted > healing > gone | a stage every 3 chapters');

  it('holds each stage for its pace, then moves on by itself', () => {
    expect(conditionAfter(hand, 0)).toEqual({ name: 'Frost-burned hand', showing: 'numb', stage: 1, stages: 3, movesIn: 5, then: 'next', endsIf: ['treated'] });
    expect(conditionAfter(hand, 4)).toMatchObject({ showing: 'numb', stage: 1, movesIn: 1 });
    expect(conditionAfter(hand, 5)).toMatchObject({ showing: 'blackened', stage: 2, movesIn: 5, then: 'next' });
    expect(conditionAfter(hand, 9)).toMatchObject({ showing: 'blackened', stage: 2, movesIn: 1 });
  });

  it('stays at its last stage for good, with nothing further to come', () => {
    for (const elapsed of [10, 14, 400]) {
      expect(conditionAfter(hand, elapsed)).toEqual({ name: 'Frost-burned hand', showing: 'lost', stage: 3, stages: 3, endsIf: ['treated'] });
    }
  });

  it('passes by itself after its last stage when its stages end in "gone"', () => {
    expect(conditionAfter(arm, 3)).toMatchObject({ showing: 'healing', stage: 2, stages: 2, movesIn: 3, then: 'passes' });
    expect(conditionAfter(arm, 5)).toMatchObject({ showing: 'healing', movesIn: 1, then: 'passes' });
    expect(conditionAfter(arm, 6)).toBeUndefined();
  });

  it('never moves a condition that has no stages or no pace', () => {
    const [blind, limp] = readConditions('Blind from birth\nLimp | drags the left leg > cannot walk');
    for (const elapsed of [0, 30, 300]) {
      expect(conditionAfter(blind, elapsed)).toEqual({ name: 'Blind from birth', endsIf: [] });
      expect(conditionAfter(limp, elapsed)).toEqual({ name: 'Limp', showing: 'drags the left leg', endsIf: [] });
    }
  });
});

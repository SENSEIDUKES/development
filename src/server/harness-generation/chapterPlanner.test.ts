import { describe, expect, it } from 'vitest';
import { arcGenerationContext } from '@seihouse/sen/arc-goals';
import type { HarnessChapterPlanRequest } from '@seihouse/sen/harness-generation';
import {
  CHAPTER_PLANNER_HEADINGS,
  buildChapterPlanResponseSchema,
  buildChapterPlannerPrompt,
  composeChapterPlannerInstruction,
  presentChapterToPlan,
  presentCodexEntry,
} from './chapterPlanner';

/** The planner's call (SENSEI, 2026-10-20): Fate, one call before each chapter, in the words SENSEI approved. */

const request = (overrides: Partial<HarnessChapterPlanRequest> = {}): HarnessChapterPlanRequest => ({
  operation: 'plan-chapter', storyId: 's', attemptId: 'a', model: 'fixture',
  storyInformation: {
    id: 'p', storyId: 's', attemptId: 'a', foundationRevisionId: 'f', foundationRevision: 1, storyHead: { nextChapterNumber: 4 }, chapterNumber: 4, createdAt: 'now',
    currentStory: { title: 'The Drowned Archive', originalLanguage: 'en', premise: 'An archivist races the rising river.', corrections: [] },
    storyDirection: { destinedEnding: 'Lin reopens the drowned archive.', hardPins: ['Elder Qin never betrays Lin.'], fateMode: 'regular' },
    arc: arcGenerationContext({ arcNumber: 1, goals: [{ id: 'arc-1-flood', text: 'Survive the first flood.', chapters: 30 }] }, 4, 'Lin reopens the drowned archive.'),
    previouslyOn: [{ chapterNumber: 3, title: 'The Flood', recap: 'Lin climbed above the water.' }],
    canonicalState: { characters: [], relationships: [], locations: [], factions: [], artifacts: [], abilities: [], resources: [] },
    codex: { entries: [{ name: 'Lin', kind: 'character', mainCharacter: true, inHand: ['Lantern'], lastOnPage: 3 }] },
    diagnostics: { budgetSource: 'test', sections: [], omitted: [], identityAmbiguities: [], storage: { chapters: 3, events: 0, canonicalRecords: 0, activeRecords: 0, recaps: 1 } },
  },
  immediateChapterRequest: { chapterNumber: 4, continuation: true, chapterScale: { minWords: 1_200, maxWords: 1_700 },
    direction: { id: 'd', forChapter: 4, choice: { kind: 'reader', text: 'Lin dives for the archive door.' }, chosenAt: 'now' } },
  ...overrides,
});

describe('The chapter planner', () => {
  it('lays its instruction out in its parts, its skills opening How to plan the chapter before the HARNESS\'s rules', () => {
    const instruction = composeChapterPlannerInstruction('CAPA SKILL [Pacing] — Patient Siege v1.0.0\nKeep the siege going.');
    expect(instruction.split('\n').filter(line => line.startsWith('# '))).toEqual([
      CHAPTER_PLANNER_HEADINGS.role, CHAPTER_PLANNER_HEADINGS.reading, CHAPTER_PLANNER_HEADINGS.planning, CHAPTER_PLANNER_HEADINGS.hardRules,
    ]);
    expect(instruction).toMatch(/^# ROLE AND MISSION\n\nYou are Fate for a serialized novel\./);
    expect(instruction).toContain('# HOW TO PLAN THE CHAPTER\n\nCAPA SKILL [Pacing] — Patient Siege v1.0.0\nKeep the siege going.\n\nCAST:');
    // Without skills, the HARNESS's rules open the part.
    expect(composeChapterPlannerInstruction()).toContain('# HOW TO PLAN THE CHAPTER\n\nCAST:');
  });

  it('reads the story information the writer used to, with the Codex in place of Holdings, then this chapter', () => {
    const prompt = buildChapterPlannerPrompt(request());
    expect(prompt.userPrompt.split('\n').filter(line => line.startsWith('# '))).toEqual([CHAPTER_PLANNER_HEADINGS.story, CHAPTER_PLANNER_HEADINGS.request]);
    const order = ['CURRENT STORY INFORMATION', 'DESTINED ENDING AND HARD PINS', 'ACTIVE ARC GOAL', 'PREVIOUSLY ON', 'CURRENT CANONICAL STATE', 'THE CODEX', '# THIS CHAPTER'];
    const at = order.map(marker => prompt.userPrompt.indexOf(marker));
    expect(at.every(index => index >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((left, right) => left - right));
    expect(prompt.userPrompt).toContain('Elder Qin never betrays Lin.');
    expect(prompt.userPrompt).toContain('- MC: Lin (main character) · in hand: Lantern · last on the page: Chapter 3');
    expect(prompt.userPrompt.endsWith('Chapter 4, chapter 4 of 30 in Arc 1.\nThe reader\'s direction for this chapter: Lin dives for the archive door.')).toBe(true);
    // Rhythm appears only when the reader left the path to the HARNESS; diagnostics never.
    expect(prompt.userPrompt).not.toContain('FATE PRESSURE RHYTHM DIRECTION');
    expect(prompt.userPrompt).not.toMatch(/diagnostics|budgetSource/);
    expect(prompt.measurement.sections.map(section => section.section)).toEqual(['currentStory', 'storyDirection', 'arc', 'previouslyOn', 'canonicalState', 'codex', 'immediateChapterRequest']);
    expect(() => buildChapterPlannerPrompt(request({ storyInformation: { ...request().storyInformation, arc: undefined } }))).toThrow('authoritative Arc Plan');
  });

  it('says where the chapter sits and whose direction it follows, and a rewrite\'s note only with one', () => {
    const base = request().immediateChapterRequest;
    expect(presentChapterToPlan({ ...base, direction: undefined }))
      .toBe('Chapter 4, chapter 4 of 30 in Arc 1.\nThe reader left this chapter\'s path to the HARNESS: follow the Fate Pressure Rhythm Direction.');
    expect(presentChapterToPlan({ ...base, direction: { id: 'd', forChapter: 4, choice: { kind: 'chapter-function', chapterFunction: 'worldBuilding', suggestion: 'The canals surface.' }, chosenAt: 'now' } }))
      .toContain('The reader chose this path: World Building, with this idea: The canals surface.');
    const rewrite = { replacesChapterId: 'c4', previous: { title: 'The Door', recap: 'Lin opened the door.' } };
    expect(presentChapterToPlan({ ...base, rewrite })).not.toContain('REWRITE');
    expect(presentChapterToPlan({ ...base, rewrite: { ...rewrite, note: 'Keep the door shut.' } }))
      .toContain('REWRITE: the reader asked for Chapter 4 again. The version they set aside: "The Door", Lin opened the door. Their note: Keep the door shut.');
  });

  it('asks for a plan of menus, and for the story\'s end only in Fate Survival', () => {
    const regular = buildChapterPlanResponseSchema();
    expect(regular.required).toEqual(['cast', 'events', 'arcGoalReached', 'chapterFunction']);
    expect(regular.properties).not.toHaveProperty('storyEnds');
    expect(regular.properties.events.items.required).toEqual(['kind', 'how', 'facts']);
    expect(regular.properties.events.items.properties.kind.enum).toEqual(['confrontation', 'discovery', 'revelation', 'gain', 'loss', 'bond', 'betrayal', 'training', 'journey', 'decision']);
    const survival = buildChapterPlanResponseSchema({ survival: true });
    expect(survival.required).toEqual(['cast', 'events', 'arcGoalReached', 'storyEnds', 'chapterFunction']);
    expect(buildChapterPlannerPrompt(request({ storyInformation: { ...request().storyInformation, storyDirection: { ...request().storyInformation.storyDirection, fateMode: 'survival' } } }))
      .responseJsonSchema.required).toContain('storyEnds');
  });

  it('gives each card of the Codex in one line, from who they are to when they were last on the page', () => {
    expect(presentCodexEntry({ name: 'Elder Qin', kind: 'character', fromStorySeed: true, notes: 'Keeper of the archive.' }))
      .toBe('- Elder Qin (from the Story Seed, not on the page yet) · notes: Keeper of the archive.');
    expect(presentCodexEntry({
      name: 'Kael Varn', kind: 'character', who: 'A ferryman.', gender: 'male', age: 'elder', look: { summary: 'A gaunt ferryman.', traits: {} },
      lookChanges: [{ change: 'a scarred hand', chapterNumber: 2 }], status: 'wounded (a cut arm)', rank: 'Boatmaster', carries: ['Bone Oar', 'Ferry Token ×2'],
      knows: ['Water Reading (Master)'], goals: ['pay the cult'], values: ['a debt is always paid'], owes: [{ to: 'Lin', what: 'passage back' }],
      owedBy: [{ by: 'the river cult', what: 'his wages' }], stances: [{ toward: 'Lin', said: 'hostile', acted: 'warm' }], lastOnPage: 3,
    })).toBe('- Kael Varn (A ferryman.) · male, elder · look: A gaunt ferryman.; since: a scarred hand (Chapter 2) · wounded (a cut arm) · rank: Boatmaster · carries: Bone Oar; Ferry Token ×2 · knows: Water Reading (Master) · goals: pay the cult · values: a debt is always paid · owes Lin: passage back · is owed by the river cult: his wages · toward Lin: said hostile, acted warm · last on the page: Chapter 3');
    expect(presentCodexEntry({ name: 'Bone Oar', kind: 'thing', who: 'The ferry\'s oar.', heldBy: 'Kael Varn' })).toBe('- Bone Oar (thing: The ferry\'s oar.) · held by Kael Varn');
  });
});

import { describe, expect, it } from 'vitest';
import type { ChapterPlan, PlanCastMember, PlanEvent, PlanFact } from '../../../narrative/chapterPlan';
import type { CodexEntry } from '../../../narrative/holdings';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import { deriveStoryCodex, pictureLook, type StoryCodexChapter } from './storyCodex';

/** The Codex is worked out from the committed chapters' plans and the words their characters speak (SENSEI, 2026-10-20). */

const MC: CodexEntry = { id: 'hcx_mc', storyId: 's', kind: 'character', name: 'Han Shuo', mainCharacter: true, origin: { source: 'foundation' }, createdAt: '' };
const SOVEREIGN: CodexEntry = { id: 'hcx_chi', storyId: 's', kind: 'character', name: 'Scarlet Sovereign Chi Lian', aliases: ['Chi Lian'], origin: { source: 'foundation' }, createdAt: '' };
const SWORD: CodexEntry = { id: 'hcx_sword', storyId: 's', kind: 'thing', name: 'Broken Broadsword', origin: { source: 'plan', chapterId: 'c1', chapterNumber: 1 }, createdAt: '' };

const speaker = (chapter: number, paragraph: number, text: string, words: string, name: string, protagonist = false): SpeakerAttachment => {
  const start = text.indexOf(words);
  const blockId = `c${chapter}-p${paragraph}`;
  return { id: `speaker:${blockId}:${start}`, kind: SPEAKER_KIND, anchor: { level: 'span', blockId, startOffset: start, endOffset: start + words.length, selectedText: words }, payload: { origin: 'harness', speaker: name, protagonist } } as SpeakerAttachment;
};
/** Someone or something on the page, resolved to its entry as a committed plan has it. */
const cast = (entry: CodexEntry, extra: Partial<PlanCastMember> = {}): PlanCastMember =>
  ({ name: entry.mainCharacter ? 'MC' : entry.name, entryId: entry.id, kind: entry.kind === 'thing' ? 'thing' : 'character', ...extra });
const ref = (entry: CodexEntry) => ({ name: entry.mainCharacter ? 'MC' : entry.name, entryId: entry.id });
const event = (how: string, facts: PlanFact[] = []): PlanEvent => ({ actor: ref(MC), targets: [], presses: [], how, facts });
const plan = (members: PlanCastMember[], events: PlanEvent[]): ChapterPlan => ({ cast: members, events });

const ONE = ['Ash fell.', 'Then he drew the blade. "Who dares?" the sword said.', 'Then "Quiet," Han Shuo said.'];
const TWO = ['Then the Sovereign laughed. "Fool," she said.', 'Then he set the blade down.'];
const chapters: StoryCodexChapter[] = [
  { id: 'c2', chapterNumber: 2, paragraphs: TWO, plan: plan([cast(MC), cast(SOVEREIGN)], [event('Han Shuo sets the broken blade down for good.', [{ type: 'holding', who: ref(MC), change: 'loses', what: ref(SWORD) }])]),
    speakers: [speaker(2, 1, TWO[0], '"Fool,"', 'Chi Lian')] },
  { id: 'c1', chapterNumber: 1, paragraphs: ONE, plan: plan([cast(MC), cast(SOVEREIGN, { who: 'A sword spirit bound to the broken blade.' })], [
    event('Han Shuo pulls the broken broadsword from the ash and draws it.', [{ type: 'holding', who: ref(MC), change: 'gains', what: ref(SWORD) }, { type: 'holding', who: ref(MC), change: 'equips', what: ref(SWORD) }]),
  ]), speakers: [speaker(1, 2, ONE[1], '"Who dares?"', 'Scarlet Sovereign Chi Lian'), speaker(1, 3, ONE[2], '"Quiet,"', 'MC', true)] },
];

describe('the Codex record', () => {
  it('meets characters by the plans that put them on the page and the words they speak, the main character first', () => {
    const codex = deriveStoryCodex({
      entries: [MC, SOVEREIGN, SWORD], chapters,
      declared: [{ name: 'Han Shuo', mainCharacter: true }, { name: 'Scarlet Sovereign Chi Lian', aliases: ['Chi Lian'] }, { name: 'Lin Qinghan' }],
    });
    // A declared character the plans have not reached stays out of the Codex.
    expect(codex.characters.map(character => character.name)).toEqual(['Han Shuo', 'Scarlet Sovereign Chi Lian']);
    const [mc, spirit] = codex.characters;
    // Met where a plan first cast them: their chapter, told by who they are or the chapter's first event.
    expect(mc.firstSeen).toEqual({ chapterNumber: 1, text: 'Han Shuo pulls the broken broadsword from the ash and draws it.' });
    expect(spirit.firstSeen).toEqual({ chapterNumber: 1, text: 'A sword spirit bound to the broken blade.' });
    expect(spirit).toMatchObject({ who: 'A sword spirit bound to the broken blade.', lastSeen: 2 });
    expect(mc.voice).toMatchObject({ lines: 1, chapters: [1], first: { chapterNumber: 1, blockId: 'c1-p3', text: '"Quiet,"' } });
    // Speech under a declared alias belongs to the same character.
    expect(spirit.voice).toMatchObject({ lines: 2, chapters: [1, 2], first: { text: '"Who dares?"' } });
  });

  it('gives no card to someone who only speaks: a crowd, a passing guard', () => {
    const text = 'Then "Kneel!" the crowd roared. "Halt," a guard said. "Quiet," Han Shuo said.';
    const codex = deriveStoryCodex({
      entries: [MC],
      chapters: [{ id: 'c1', chapterNumber: 1, paragraphs: [text], plan: plan([cast(MC)], [event('The crowd kneels.')]), speakers: [
        speaker(1, 1, text, '"Kneel!"', 'The Crowd'), speaker(1, 1, text, '"Halt,"', 'Guard'), speaker(1, 1, text, '"Quiet,"', 'MC', true),
      ] }],
    });
    expect(codex.characters.map(character => character.name)).toEqual(['Han Shuo']);
  });

  it('keeps sects and other factions out of the characters, declared or named as a body of people', () => {
    const text = 'Then the crowd roared. "Kneel!" the sect cried. "Run," the tribe said.';
    const codex = deriveStoryCodex({
      entries: [MC], declaredFactions: [{ name: 'Iron Crane Sect', aliases: ['the Crane'] }],
      chapters: [{ id: 'c1', chapterNumber: 1, paragraphs: [text], plan: plan([], [event('The sect demands obedience.')]), speakers: [
        speaker(1, 1, text, '"Kneel!"', 'the Crane'),
        speaker(1, 1, text, '"Run,"', 'Black Wolf Tribe'),
      ] }],
    });
    expect(codex.characters).toEqual([]);
    expect(codex.factions.map(faction => [faction.name, faction.voice.first.text])).toEqual([
      ['Iron Crane Sect', '"Kneel!"'],
      ['Black Wolf Tribe', '"Run,"'],
    ]);
  });

  it('follows each thing to whoever holds it now, keeping what happened to it after it was lost', () => {
    const codex = deriveStoryCodex({ entries: [MC, SOVEREIGN, SWORD], chapters });
    expect(codex.items).toHaveLength(1);
    const [sword] = codex.items;
    expect(sword).toMatchObject({ name: 'Broken Broadsword', firstSeen: { chapterNumber: 1, event: 1 } });
    expect(sword.holder).toBeUndefined();
    expect(sword.events.map(change => `${change.passage.chapterNumber} ${change.verb} ${change.holder}`)).toEqual(['1 gained Han Shuo', '1 equipped Han Shuo', '2 lost Han Shuo']);
  });

  it('keeps what the checks found in each chapter\'s plan, in story order, each with its chapter', () => {
    const codex = deriveStoryCodex({
      entries: [MC, SOVEREIGN, SWORD],
      chapters: chapters.map(chapter => chapter.id === 'c2'
        ? { ...chapter, planChecks: [{ event: 1, message: 'Event 1: Han Shuo loses ‘Jade Gourd’, which the record does not show them holding, so the fact was dropped.' }] }
        : { ...chapter, planChecks: [{ message: 'The plan returned no chapter function from the menu, so the rhythm history skips this chapter.' }] }),
    });
    expect(codex.checks.map(check => [check.chapterNumber, check.message])).toEqual([
      [1, 'Chapter 1: The plan returned no chapter function from the menu, so the rhythm history skips this chapter.'],
      [2, 'Chapter 2: Event 1: Han Shuo loses ‘Jade Gourd’, which the record does not show them holding, so the fact was dropped.'],
    ]);
  });

  it('meets whoever and whatever a plan cast, with the look it gave and every change since', () => {
    const ELDER: CodexEntry = { id: 'hcx_mo', storyId: 's', kind: 'character', name: 'Elder Mo Tieshan', aliases: ['Elder Mo'], origin: { source: 'foundation' }, createdAt: '' };
    const FURNACE: CodexEntry = { id: 'hcx_furnace', storyId: 's', kind: 'thing', name: 'Heavenly Furnace', origin: { source: 'plan', chapterId: 'c1', chapterNumber: 1 }, createdAt: '' };
    const text = 'Then "Work," Elder Mo said.';
    const codex = deriveStoryCodex({
      entries: [MC, ELDER, FURNACE],
      chapters: [
        { id: 'c1', chapterNumber: 1, paragraphs: ['Then the forge.', 'Then the elder.', 'Then the furnace.'], plan: plan([
          cast(ELDER, { who: 'The forge\'s master.', gender: 'male', age: 'elder', look: { summary: 'A broad old smith.', traits: { build: 'broad' } } }),
          cast(FURNACE, { look: { summary: 'A bronze furnace taller than a man.', traits: { material: 'bronze' } } }),
        ], [event('Elder Mo lights the Heavenly Furnace.')]) },
        { id: 'c2', chapterNumber: 2, paragraphs: [text, 'Then sparks flew.'], speakers: [speaker(2, 1, text, '"Work,"', 'Elder Mo')],
          plan: plan([cast(ELDER)], [event('A spark burns Elder Mo\'s sleeve.', [{ type: 'look', who: ref(ELDER), change: 'a burnt sleeve' }])]) },
      ],
    });
    expect(codex.characters.map(character => character.name)).toEqual(['Elder Mo Tieshan']);
    const [elder] = codex.characters;
    expect(elder).toMatchObject({ who: 'The forge\'s master.', gender: 'male', age: 'elder', firstSeen: { chapterNumber: 1, text: 'The forge\'s master.' } });
    // His words under his alias are his.
    expect(elder.voice).toMatchObject({ lines: 1, first: { text: '"Work,"' } });
    expect(elder.appearance).toEqual({
      first: { chapterNumber: 1, text: 'The forge\'s master.' },
      look: { summary: 'A broad old smith.', traits: { build: 'broad' }, passage: { chapterNumber: 1, text: 'The forge\'s master.' } },
      changes: [{ change: 'a burnt sleeve', passage: { chapterNumber: 2, event: 1, text: 'A spark burns Elder Mo\'s sleeve.' } }],
    });
    // The picture is made from the look with every change since.
    expect(pictureLook(elder.appearance)).toEqual({ summary: 'A broad old smith; since then: a burnt sleeve', traits: { build: 'broad' } });
    // A thing a plan cast joins the items, held by no one.
    expect(codex.items).toEqual([expect.objectContaining({ key: FURNACE.id, name: 'Heavenly Furnace', count: 0, events: [],
      appearance: expect.objectContaining({ look: expect.objectContaining({ summary: 'A bronze furnace taller than a man.' }) }) })]);
    expect(codex.items[0].holder).toBeUndefined();
    expect(codex.checks).toEqual([]);
  });

  it('keeps state, goals, values, commitments and stances from the plans, each with the event that made it', () => {
    const LIN: CodexEntry = { id: 'hcx_lin', storyId: 's', kind: 'character', name: 'Lin Qinghan', origin: { source: 'plan', chapterId: 'c1', chapterNumber: 1 }, createdAt: '' };
    const codex = deriveStoryCodex({
      entries: [MC, LIN],
      chapters: [
        { id: 'c1', chapterNumber: 1, paragraphs: ['Then.'], plan: plan([cast(MC), cast(LIN, { who: 'A healer of the river sect.' })], [
          event('Han Shuo is cut defending Lin, and swears to see her home.', [
            { type: 'status', who: ref(MC), state: 'wounded', how: 'a cut arm' },
            { type: 'goal', who: ref(MC), change: 'set', what: 'see Lin home' },
            { type: 'commitment', who: ref(MC), toWhom: ref(LIN), change: 'entered', what: 'safe passage home' },
            { type: 'value', who: ref(MC), stance: 'held', what: 'a debt is always paid' },
            { type: 'stance', who: ref(LIN), towardWhom: ref(MC), mode: 'said', polarity: 'hostile' },
            { type: 'stance', who: ref(LIN), towardWhom: ref(MC), mode: 'acted', polarity: 'warm' },
          ]),
        ]) },
        { id: 'c2', chapterNumber: 2, paragraphs: ['Then.'], plan: plan([cast(MC), cast(LIN)], [
          event('Lin heals him at her sect\'s gate.', [{ type: 'status', who: ref(MC), state: 'recovered' }, { type: 'goal', who: ref(MC), change: 'achieved', what: 'see Lin home' }]),
          event('Her sect lets him go.', [{ type: 'commitment', who: ref(MC), toWhom: ref(LIN), change: 'kept', what: 'safe passage home' }]),
        ]) },
      ],
    });
    const [mc, lin] = codex.characters;
    expect(mc.status).toBeUndefined();
    expect(mc.statusHistory.map(status => [status.label, status.passage.chapterNumber, status.passage.event])).toEqual([['wounded (a cut arm)', 1, 1], ['recovered', 2, 1]]);
    expect(mc.goals).toEqual([{ what: 'see Lin home', outcome: 'achieved', set: expect.objectContaining({ chapterNumber: 1 }), resolved: expect.objectContaining({ chapterNumber: 2, event: 1 }) }]);
    expect(mc.values).toEqual([{ what: 'a debt is always paid', stance: 'held', passage: expect.objectContaining({ chapterNumber: 1 }) }]);
    expect(mc.owes).toEqual([{ party: 'Lin Qinghan', what: 'safe passage home', outcome: 'kept', entered: expect.objectContaining({ chapterNumber: 1 }), resolved: expect.objectContaining({ chapterNumber: 2, event: 2 }) }]);
    expect(lin.owedBy).toEqual([expect.objectContaining({ party: 'Han Shuo', what: 'safe passage home', outcome: 'kept' })]);
    // Said and acted are kept apart: she speaks coldly of him and shields him.
    expect(lin.stances).toEqual([{ toward: 'Han Shuo', said: { polarity: 'hostile', passage: expect.objectContaining({ chapterNumber: 1 }) }, acted: { polarity: 'warm', passage: expect.objectContaining({ chapterNumber: 1 }) } }]);
  });

  it('settles only the commitment its words name: one never made leaves the others open', () => {
    const LIN: CodexEntry = { id: 'hcx_lin', storyId: 's', kind: 'character', name: 'Lin Qinghan', origin: { source: 'plan', chapterId: 'c1', chapterNumber: 1 }, createdAt: '' };
    const codex = deriveStoryCodex({
      entries: [MC, LIN],
      chapters: [
        { id: 'c1', chapterNumber: 1, paragraphs: ['Then.'], plan: plan([cast(MC), cast(LIN)], [
          event('Han Shuo swears to repay her gold.', [{ type: 'commitment', who: ref(MC), toWhom: ref(LIN), change: 'entered', what: 'repay the gold' }]),
        ]) },
        { id: 'c2', chapterNumber: 2, paragraphs: ['Then.'], plan: plan([cast(MC), cast(LIN)], [
          event('Han Shuo burns a letter he was asked to carry.', [{ type: 'commitment', who: ref(MC), toWhom: ref(LIN), change: 'broken', what: 'deliver the letter' }]),
        ]) },
      ],
    });
    const [mc] = codex.characters;
    expect(mc.owes).toEqual([
      { party: 'Lin Qinghan', what: 'repay the gold', entered: expect.objectContaining({ chapterNumber: 1 }) },
      { party: 'Lin Qinghan', what: 'deliver the letter', outcome: 'broken', resolved: expect.objectContaining({ chapterNumber: 2 }) },
    ]);
  });

  it('links the state someone is still in to the event that began it, never to the change that ended another', () => {
    const codex = deriveStoryCodex({
      entries: [MC],
      chapters: [
        { id: 'c1', chapterNumber: 1, paragraphs: ['Then.'], plan: plan([cast(MC)], [
          event('The tide wardens seize Han Shuo.', [{ type: 'status', who: ref(MC), state: 'captured' }]),
          event('They beat him in the cell.', [{ type: 'status', who: ref(MC), state: 'wounded' }]),
        ]) },
        { id: 'c2', chapterNumber: 2, paragraphs: ['Then.'], plan: plan([cast(MC)], [
          event('His wounds close in the dark.', [{ type: 'status', who: ref(MC), state: 'recovered' }]),
        ]) },
      ],
    });
    expect(codex.characters[0].status).toEqual({ label: 'captured', passage: { chapterNumber: 1, event: 1, text: 'The tide wardens seize Han Shuo.' } });
  });
});

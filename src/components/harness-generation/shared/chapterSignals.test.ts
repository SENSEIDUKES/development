import { describe, expect, it } from 'vitest';
import {
  applyHarnessChapterSignals,
  buildHarnessSystemPanel,
  readHarnessChapterSignals,
  splitHarnessProseParagraphs,
} from './chapterSignals';
import { acceptHarnessModelResponse } from './responseAcceptance';

const prose = [
  'Rain crossed the courtyard as Mara held her ground and the fox growled once.',
  '“Not today,” Mara said.',
  'The gate creaked. [Qi rose to twelve.] She breathed out.',
  'A notice hung on the gate: The sect closes at dusk.',
].join('\n\n');

describe('HARNESS compact chapter signals', () => {
  it('splits paragraphs at blank lines without rewriting the authoritative prose', () => {
    expect(splitHarnessProseParagraphs('One.\r\n\r\n\r\nTwo. \n \nThree.')).toEqual(['One.', 'Two.', 'Three.']);
    const accepted = acceptHarnessModelResponse(JSON.stringify({ prose: 'One. \n\nTwo.' }), 1);
    expect(accepted.accepted && accepted.draft.prose).toBe('One. \n\nTwo.');
    expect(accepted.accepted && accepted.draft.blocks?.map(block => block.text)).toEqual(['One.', 'Two.']);
  });

  it('reads every signal family independently and drops malformed items with warnings', () => {
    const { signals, warnings } = readHarnessChapterSignals({
      dialogue: [{ anchorText: '“Not today,”', speaker: 'Mara', delivery: 'whispered' }, { anchorText: 'x', speaker: '' }, { speaker: 'Nobody' }],
      manifestations: [{ anchorText: 'the fox', name: 'Debt Fox', type: 'creature', mention: 'reveal' }, { anchorText: 'the fox', name: 'Debt Fox', type: 'ghost', mention: 'reveal' }],
      systemPanels: [
        { anchorText: '[Qi rose to twelve.]', presentation: 'mechanical', title: 'Breakthrough', entries: [{ label: 'Qi', value: '12' }] },
        { anchorText: '[Qi rose to twelve.]', presentation: 'mechanical', title: 'No entries' },
        { anchorText: 'notice', presentation: 'fate', title: 'Fate', body: 'The oath scars the timeline.' },
        { anchorText: 'notice', presentation: 'sideways', title: 'Unknown' },
      ],
      soundscapes: [{ anchorText: 'Rain crossed', mood: 'tension', region: 'chinese', tags: ['rain', 'courtyard', 'rain'], intensity: 0.7 }, { anchorText: 'Rain', mood: 'tension', region: 'martian' }],
      soundCues: [{ anchorText: 'the fox growled', category: 'beasts', variation: 'growl', tags: ['tiger'] }, { anchorText: 'the fox growled', category: 'ghosts', variation: 'growl' }],
      creatureEvents: [{ anchorText: 'the fox growled', type: 'reveal', name: 'Debt Fox', size: 'large', signatureSound: 'growl' }, { anchorText: 'the fox', type: 'explode' }],
      memory: { characters: [] },
    });
    expect(signals.dialogue).toEqual([{ anchorText: '“Not today,”', speaker: 'Mara', delivery: 'whispered' }]);
    expect(signals.manifestations).toHaveLength(1);
    expect(signals.systemPanels.map(panel => panel.title)).toEqual(['Breakthrough']);
    expect(signals.soundscapes).toEqual([{ anchorText: 'Rain crossed', mood: 'tension', region: 'chinese', tags: ['rain', 'courtyard'], intensity: 0.7 }]);
    expect(signals.soundCues).toHaveLength(1);
    expect(signals.creatureEvents).toEqual([{ anchorText: 'the fox growled', type: 'reveal', name: 'Debt Fox', size: 'large', signatureSound: 'growl' }]);
    expect(warnings.map(warning => warning.message)).toEqual([
      'Omitted 2 malformed optional dialogue signals without affecting the chapter prose.',
      'Omitted 1 malformed optional manifestation signal without affecting the chapter prose.',
      'Omitted 3 malformed optional System Panel signals without affecting the chapter prose.',
      'Omitted 1 malformed optional soundscape signal without affecting the chapter prose.',
      'Omitted 1 malformed optional Sound Cue signal without affecting the chapter prose.',
      'Omitted 1 malformed optional creature event signal without affecting the chapter prose.',
    ]);
  });

  it('treats a non-list family as omitted and never touches the prose', () => {
    const { signals, warnings } = readHarnessChapterSignals({ dialogue: 'Mara speaks', soundscapes: { mood: 'calm' } });
    expect(signals.dialogue).toEqual([]);
    expect(signals.soundscapes).toEqual([]);
    expect(warnings).toHaveLength(2);
  });

  it('matches signals to exact prose anchors, assigns speaker roles from the cast, and splits a System Panel into its own block', () => {
    const { signals } = readHarnessChapterSignals({
      dialogue: [{ anchorText: '“Not today,” Mara said.', speaker: 'Mara', delivery: 'shouted' }, { anchorText: 'Never written', speaker: 'Mara' }],
      manifestations: [{ anchorText: 'Mara held her ground', name: 'Mara', type: 'character', mention: 'reveal' }],
      systemPanels: [{ anchorText: '[Qi rose to twelve.]', presentation: 'mechanical', title: 'Breakthrough Achieved', meaning: 'breakthrough', entries: [{ label: 'Qi', value: '12' }] }],
      soundscapes: [{ anchorText: 'Rain crossed the courtyard', mood: 'tension', region: 'chinese', tags: ['rain', 'courtyard'] }],
      soundCues: [{ anchorText: 'the fox growled', category: 'beasts', variation: 'growl', tags: ['tiger'], entityName: 'Debt Fox', entityType: 'creature' }],
      creatureEvents: [{ anchorText: 'the fox growled', type: 'reveal', name: 'Debt Fox', size: 'large', bodyType: 'mammal', signatureSound: 'growl' }],
    });
    const applied = applyHarnessChapterSignals(splitHarnessProseParagraphs(prose), signals, [{ name: 'Mara', role: 'Courier', isMainCharacter: true }]);
    expect(applied.blocks.map(block => block.text)).toEqual([
      'Rain crossed the courtyard as Mara held her ground and the fox growled once.',
      '“Not today,” Mara said.',
      'The gate creaked.',
      '[Qi rose to twelve.]',
      'She breathed out.',
      'A notice hung on the gate: The sect closes at dusk.',
    ]);
    expect(applied.blocks[0].metadata).toEqual({
      entities: [
        { name: 'Mara', type: 'character', mention: 'reveal' },
        { name: 'Debt Fox', type: 'creature', mention: 'reveal' },
      ],
      beastEvent: { type: 'reveal', profile: { size: 'large', bodyType: 'mammal', signatureSound: 'growl' } },
      music: { mood: 'tension', region: 'chinese' },
      atmosphereCategory: 'rain',
      atmosphereTags: ['rain', 'courtyard'],
      audioMoments: [{
        triggerPhrase: 'the fox growled', occurrenceIndex: 0, sourceCategory: 'beasts', variation: 'growl',
        semanticTags: ['tiger'], relatedEntity: { name: 'Debt Fox', type: 'creature' },
      }],
    });
    expect(applied.blocks[1]).toMatchObject({ type: 'dialogue', metadata: { mode: 'dialogue', speakerName: 'Mara', speakerRole: 'main_character', emotion: 'shouted' } });
    expect(applied.blocks[3].system).toEqual({
      kind: 'system_prompt', presentation: 'mechanical', promptType: 'breakthrough', title: 'Breakthrough Achieved',
      rows: [{ label: 'Qi', value: '12' }], status: { stats: [{ label: 'Qi', value: '12' }] },
    });
    expect(applied.warnings).toEqual([expect.objectContaining({ message: expect.stringContaining('"Never written" is not in the chapter prose') })]);
  });

  it('builds every System Panel presentation family inside HARNESS', () => {
    expect(buildHarnessSystemPanel({ anchorText: 'a', presentation: 'narrative', title: 'Scan', meaning: 'friendly_scan', body: 'A friend approaches.' })).toEqual({
      kind: 'system_prompt', presentation: 'narrative', promptType: 'friendly_scan', title: 'Scan', flavor: 'A friend approaches.',
    });
    expect(buildHarnessSystemPanel({ anchorText: 'a', presentation: 'world_notice', title: 'Sect Notice', body: 'The sect closes at dusk.', entries: [{ label: 'Posted by', value: 'Gatekeeper' }] })).toEqual({
      kind: 'system_prompt', presentation: 'world_notice', promptType: 'quest_update', title: 'Sect Notice',
      worldNotice: { entries: [{ title: 'Sect Notice', body: 'The sect closes at dusk.', details: [{ label: 'Posted by', value: 'Gatekeeper' }] }] },
    });
    expect(buildHarnessSystemPanel({ anchorText: 'a', presentation: 'fate', title: 'Fate Settles', outcome: 'FATE SCARRED', body: 'The oath leaves a scar.', entries: [{ label: 'Cost', value: 'Lost trust' }, { label: 'Realm', value: 'Unchanged' }] })).toEqual({
      kind: 'fate_system_prompt', title: 'Fate Settles', promptType: 'fate_event', rows: [{ label: 'Cost', value: 'Lost trust' }, { label: 'Realm', value: 'Unchanged' }],
      fateResult: { outcome: 'FATE SCARRED', timelineScar: 'The oath leaves a scar.', permanentCosts: ['Cost: Lost trust'] },
    });
  });

  it('accepts usable prose even when every optional signal is malformed or a competing blocks field is present', () => {
    const accepted = acceptHarnessModelResponse(JSON.stringify({
      prose, title: 'The Debt Fox',
      blocks: [{ type: 'paragraph', text: 'A competing body.' }],
      dialogue: 'not a list', systemPanels: [{ anchorText: 'nowhere', presentation: 'mechanical', title: 'Ghost' }],
      soundCues: [{ anchorText: 'the fox', category: 'beasts', variation: 'growl' }],
      arcCompletion: { goalId: 'g', completed: false, evidence: '' },
    }), 4);
    expect(accepted.accepted).toBe(true);
    if (!accepted.accepted) throw new Error(accepted.reason);
    expect(accepted.draft.prose).toBe(prose);
    expect(accepted.draft.blocks?.map(block => block.id)).toEqual(['c4-p1', 'c4-p2', 'c4-p3', 'c4-p4']);
    expect(accepted.draft.blocks?.every(block => !block.system && !block.metadata)).toBe(true);
    expect(accepted.draft.audioMoments).toBeUndefined();
    expect(accepted.rawEvents).toEqual([]);
    expect(accepted.warnings.map(warning => warning.code)).toEqual(expect.arrayContaining(['competing_prose_ignored', 'optional_chapter_structure_omitted']));
    expect(JSON.stringify(accepted.draft)).not.toContain('A competing body');
  });

  it('rejects a reply without prose instead of accepting signals alone', () => {
    const result = acceptHarnessModelResponse(JSON.stringify({ title: 'Empty', dialogue: [{ anchorText: 'x', speaker: 'Mara' }] }), 1);
    expect(result).toMatchObject({ accepted: false, reason: expect.stringContaining('usable chapter prose') });
  });
});

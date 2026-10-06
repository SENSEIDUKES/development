import { describe, expect, it } from 'vitest';
import { readMarks } from '../../../narrative/marks';
import { isStraySoundTag, settleStraySoundTags } from './soundTagRepair';

const read = (...paragraphs: string[]) => paragraphs.map(paragraph => readMarks(paragraph));
const wrapped = (reading: ReturnType<typeof readMarks>) => reading.sounds.map(tag => reading.text.slice(tag.start, tag.end));

describe('Stray sound tags', () => {
  it('leaves a tag around words inside a sentence alone', () => {
    for (const paragraph of [
      'Lu Xiao [[sound: blade drawn | drew his sword | high]] and waited.',
      '[[sound: beast growl | The beast growled]] from the dark.',
      '[[sound: thunder | Thunder rolled across the peaks.]]',
      'Far off, [[sound: thunder | thunder rolled]].',
      'He heard it: [[sound: horn | a horn blared]] across the terrace.',
    ]) {
      const [reading] = read(paragraph);
      expect(isStraySoundTag(reading.text, reading.sounds[0])).toBe(false);
      const settled = settleStraySoundTags([reading]);
      expect(settled.removed).toBe(0);
      expect(settled.readings[0]).toEqual(reading);
    }
  });

  it('drops a lone lower-case line and moves its sound onto the sentence that says it', () => {
    const settled = settleStraySoundTags(read(
      'Lu Xiao drove the pick into the wall. It scraped across the salt crystal and bit deep.',
      '[[sound: pick scrape | his pick scraped salt crystal | medium]]',
      'Bo watched him without a word.',
    ));
    expect(settled).toMatchObject({ removed: 1, moved: 1 });
    const [first, lone, last] = settled.readings;
    expect(lone.text).toBe('');
    expect(last.sounds).toEqual([]);
    expect(first.sounds).toHaveLength(1);
    expect(first.sounds[0]).toMatchObject({ sound: 'pick scrape', energy: 'medium' });
    expect(wrapped(first)).toEqual(['scraped across the salt crystal']);
  });

  it('removes words repeated between two sentences, keeping one space, and lands on the words they repeat', () => {
    const [settled] = settleStraySoundTags(read(
      'At noon the iron rail sounded the midday mark. Neither of them moved. [[sound: bell | the rail sounded the midday mark | low]] In the lamplight, Bo counted.',
    )).readings;
    expect(settled.text).toBe('At noon the iron rail sounded the midday mark. Neither of them moved. In the lamplight, Bo counted.');
    expect(wrapped(settled)).toEqual(['rail sounded the midday mark']);
  });

  it('with no words to echo, takes the sentence before, keeping the cue within its word limit', () => {
    const [settled] = settleStraySoundTags(read(
      'The cavern swallowed every lamp the miners had carried down that morning. [[sound: wind | a cold draft]]',
    )).readings;
    expect(settled.text).toBe('The cavern swallowed every lamp the miners had carried down that morning.');
    expect(wrapped(settled)).toEqual(['The cavern swallowed every lamp the miners had']);
  });

  it('keeps the tags around it in place when it removes words', () => {
    const [settled] = settleStraySoundTags(read(
      '[[@Bo]] “Down,” Bo hissed. [[sound: rockfall | stones fell from the roof | high]] [[gained: MC | Salt Lamp]]The roof gave way. “Run!”',
    )).readings;
    expect(settled.text).toBe('“Down,” Bo hissed. The roof gave way. “Run!”');
    expect(settled.speakers).toEqual([{ name: 'Bo', offset: 0 }]);
    expect(settled.wordTags[0].offset).toBe(settled.text.indexOf('The roof'));
    // Its one echo, "roof", is where the stones fell.
    expect(wrapped(settled)).toEqual(['roof']);
  });

  it('removes the full stop a tag left at the start of a paragraph', () => {
    const [settled] = settleStraySoundTags(read('[[gained: MC | Broodmother Core]]. Below his feet, the hive stirred.')).readings;
    expect(settled.text).toBe('Below his feet, the hive stirred.');
    expect(settled.wordTags[0].offset).toBe(0);
  });

  it('never moves a sound onto words another sound already holds, trying the next sentence instead', () => {
    const settled = settleStraySoundTags(read(
      'The caravan halted. [[sound: thunder | Thunder rolled]] over the pass.',
      '[[sound: wind | a cold gust]]',
    ));
    expect(settled).toMatchObject({ removed: 1, moved: 1 });
    const [first] = settled.readings;
    // The nearest sentence's first words hold the thunder already, so the wind takes the sentence before it.
    expect(first.sounds.map(tag => tag.sound)).toEqual(['wind', 'thunder']);
    expect(wrapped(first)).toEqual(['The caravan halted', 'Thunder rolled']);
  });

  it('looks past paragraphs left empty for the nearest prose', () => {
    const settled = settleStraySoundTags(read(
      'The gate groaned open. Dust fell.',
      '[[sound: wind | a cold gust]]',
      '[[sound: bell | a far bell]]',
      'Nobody moved.',
    ));
    expect(settled).toMatchObject({ removed: 2, moved: 2 });
    // Both look back past the emptied paragraphs: the first takes the nearest sentence, the second the one before it.
    expect(wrapped(settled.readings[0])).toEqual(['The gate groaned open', 'Dust fell']);
    expect(settled.readings[3].sounds).toEqual([]);
  });
});

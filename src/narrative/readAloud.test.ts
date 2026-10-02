import { describe, expect, it } from 'vitest';
import {
  DEFAULT_READ_ALOUD_PREFERENCES,
  READ_ALOUD_LIMITS,
  UNTAGGED_SPEECH_ROLE,
  boundSpeechRanges,
  buildReadAloudScript,
  chooseDefaultVoices,
  estimateSpeechMs,
  findStoredVoice,
  isNoveltyVoice,
  parseReadAloudPreferences,
  readAloudSentenceKey,
  readReadAloudPreferences,
  resolveReadAloudVoices,
  serializeReadAloudPreferences,
  voicesForLanguage,
  writeReadAloudPreferences,
  type ReadAloudVoice,
  type ReadAloudVoicePicks,
} from './readAloud';
import { SPEAKER_KIND, speakerAttachmentId, type SpeakerAttachment } from './speech';

const speaker = (blockId: string, text: string, words: string, name: string, protagonist: boolean): SpeakerAttachment => {
  const start = text.indexOf(words);
  return {
    id: speakerAttachmentId(blockId, start, start + words.length), kind: SPEAKER_KIND,
    anchor: { level: 'span', blockId, startOffset: start, endOffset: start + words.length, selectedText: words },
    payload: { origin: 'harness', speaker: name, protagonist },
  };
};

const script = (paragraphs: string[], options: { title?: string; language?: string; speakers?: SpeakerAttachment[] } = {}) =>
  buildReadAloudScript({
    chapterNumber: 3, title: options.title ?? 'Low Tide', language: options.language ?? 'en', speakers: options.speakers,
    paragraphs: paragraphs.map((text, index) => ({ id: `c3-p${index}`, text })),
  });

describe('buildReadAloudScript', () => {
  it('reads the title first: "Chapter N." in English, the title alone otherwise', () => {
    expect(script([]).lines).toEqual([{ key: 'title', sentence: { start: 0, end: 8 }, start: 0, end: 8, text: 'Chapter 3. Low Tide', role: 'narrator' }]);
    expect(script([], { title: '' }).lines[0].text).toBe('Chapter 3.');
    expect(script([], { language: 'ko', title: '썰물' }).lines[0].text).toBe('썰물');
    expect(script([], { language: 'ja', title: '' }).lines).toEqual([]);
  });

  it('switches voice mid-sentence: the speaker\'s line in their voice, the rest by the narrator, one sentence lit', () => {
    const text = '“Run!” he shouted, grabbing Mara’s arm.';
    const lines = script([text], { speakers: [speaker('c3-p0', text, '“Run!”', 'Lin Feng', true)] }).lines.slice(1);
    expect(lines.map(line => [line.text, line.role, line.speaker])).toEqual([
      ['“Run!”', 'protagonist', 'Lin Feng'],
      ['he shouted, grabbing Mara’s arm.', 'narrator', undefined],
    ]);
    expect(new Set(lines.map(readAloudSentenceKey)).size).toBe(1);
    expect(lines[0]).toMatchObject({ key: 'c3-p0:0-6', blockId: 'c3-p0', sentence: { start: 0, end: text.length } });
  });

  it('lights the engine\'s own sentences, so the highlight matches the page', () => {
    const text = '“Run!” Lin Feng shouted.';
    const lines = script([text], { speakers: [speaker('c3-p0', text, '“Run!”', 'Lin Feng', true)] }).lines.slice(1);
    expect(lines.map(line => [line.text, text.slice(line.sentence.start, line.sentence.end)])).toEqual([
      ['“Run!”', '“Run!”'],
      ['Lin Feng shouted.', 'Lin Feng shouted.'],
    ]);
  });

  it('keeps one voice for a quote that spans two sentences, while the light moves sentence by sentence', () => {
    const text = '“Stop. Don\'t move,” she said.';
    const lines = script([text], { speakers: [speaker('c3-p0', text, text.slice(0, 19), 'Junior Sister Han', false)] }).lines.slice(1);
    expect(lines.map(line => [line.text, line.role])).toEqual([
      ['“Stop.', 'side'],
      ['Don\'t move,”', 'side'],
      ['she said.', 'narrator'],
    ]);
    expect(lines[0].sentence).not.toEqual(lines[1].sentence);
    expect(lines[1].sentence).toEqual(lines[2].sentence);
  });

  it('gives a quote nobody was named for the untagged voice, and ignores a record whose words changed', () => {
    const text = '“Who goes there?” a voice called.';
    const stale = speaker('c3-p0', '“Who comes there?” a voice called.', '“Who comes there?”', 'Ye Chen', true);
    const lines = script([text], { speakers: [stale] }).lines.slice(1);
    expect(UNTAGGED_SPEECH_ROLE).toBe('side');
    expect(lines.map(line => [line.text, line.role])).toEqual([['“Who goes there?”', 'side'], ['a voice called.', 'narrator']]);
  });

  it('keeps every script, Thai and Korean included, and skips parts with nothing to hear', () => {
    const thai = script(['เขาวิ่งไปที่ประตู'], { language: 'th' }).lines.slice(1);
    const korean = script(['“달려!” 그가 외쳤다.'], { language: 'ko' }).lines.slice(1);
    expect(thai.map(line => line.text)).toEqual(['เขาวิ่งไปที่ประตู']);
    expect(korean.map(line => [line.text, line.role])).toEqual([['“달려!”', 'side'], ['그가 외쳤다.', 'narrator']]);
    expect(script(['“…”']).lines.slice(1)).toEqual([]);
  });

  it('cuts long sentences into lines within the limits whose offsets slice back exactly', () => {
    const clause = 'the tide rolled over the black stones of the old harbor wall';
    const long = `${Array.from({ length: 9 }, () => clause).join(', ')}.`;
    const japanese = '彼は長い間ずっと黙って海の向こうの灯りを見つめていたが誰も何も言わなかった'.repeat(6);
    for (const [text, language] of [[long, 'en'], [japanese, 'ja']] as const) {
      const lines = script([text], { language }).lines.slice(1);
      expect(lines.length).toBeGreaterThan(1);
      for (const line of lines) {
        expect(line.text).toBe(text.slice(line.start, line.end));
        expect(line.text.length).toBeLessThanOrEqual(READ_ALOUD_LIMITS.maxCharacters);
        expect(estimateSpeechMs(line.text)).toBeLessThanOrEqual(READ_ALOUD_LIMITS.maxEstimatedMs);
      }
      expect(lines.map(line => line.text).join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
    }
  });

  it('prefers clause punctuation, then spaces, as the place to cut', () => {
    const text = `${'a'.repeat(60)} ${'b'.repeat(60)}, ${'c'.repeat(60)} ${'d'.repeat(60)}`;
    const ranges = boundSpeechRanges(text, 0, text.length);
    expect(ranges.map(range => text.slice(range.start, range.end))).toEqual([
      `${'a'.repeat(60)} ${'b'.repeat(60)},`, `${'c'.repeat(60)} ${'d'.repeat(60)}`,
    ]);
  });
});

const voice = (name: string, lang: string, extra: Partial<ReadAloudVoice> = {}): ReadAloudVoice => ({ voiceURI: `uri:${name}`, name, lang, ...extra });
const APPLE = [voice('Samantha', 'en-US', { default: true }), voice('Bubbles', 'en-US'), voice('Daniel', 'en-GB'), voice('Rishi', 'en-IN'),
  voice('Karen', 'en-AU'), voice('Kyoko', 'ja-JP'), voice('Yuna', 'ko-KR')];
const PICKS: ReadAloudVoicePicks = { en: { narrator: ['Daniel'], protagonist: ['Rishi'], side: ['Samantha', 'Karen'] } };
const names = (choice: ReturnType<typeof chooseDefaultVoices>) => [choice.narrator?.name, choice.protagonist?.name, choice.side?.name];

describe('voices', () => {
  it('casts the host\'s picks: Daniel, Rishi and a female side voice on Apple devices', () => {
    expect(names(chooseDefaultVoices(APPLE, 'en', PICKS))).toEqual(['Daniel', 'Rishi', 'Samantha']);
  });

  it('keeps three voices distinct without picks, across regions, and never chooses a novelty voice', () => {
    const choice = chooseDefaultVoices(APPLE, 'en');
    expect(choice.narrator?.name).toBe('Samantha');
    expect(new Set(names(choice)).size).toBe(3);
    expect(names(choice)).not.toContain('Bubbles');
    expect(new Set([choice.narrator, choice.protagonist, choice.side].map(each => each?.lang)).size).toBe(3);
    expect(isNoveltyVoice(voice('Bubbles', 'en-US'))).toBe(true);
    expect(isNoveltyVoice(voice('Eddy (English (US))', 'en-US'))).toBe(true);
    expect(isNoveltyVoice(voice('Daniel', 'en-GB'))).toBe(false);
  });

  it('matches picks as whole words and prefers a Premium or natural variant', () => {
    const edge = [voice('Microsoft David - English (United States)', 'en-US'), voice('Microsoft Ryan Online (Natural) - English (United Kingdom)', 'en-GB'),
      voice('Danielle', 'en-US'), voice('Daniel', 'en-GB'), voice('Daniel (Premium)', 'en-GB')];
    expect(chooseDefaultVoices(edge, 'en', { en: { narrator: ['Daniel'] } }).narrator?.name).toBe('Daniel (Premium)');
    expect(chooseDefaultVoices(edge, 'en', { en: { narrator: ['Microsoft Ryan'] } }).narrator?.name).toContain('Ryan');
  });

  it('reads a story\'s language with its own voices, best language tag first', () => {
    expect(names(chooseDefaultVoices(APPLE, 'ja', PICKS))).toEqual(['Kyoko', 'Kyoko', 'Kyoko']);
    expect(chooseDefaultVoices(APPLE, 'th', PICKS)).toEqual({});
    const chinese = [voice('Sinji', 'zh-HK'), voice('Meijia', 'zh_TW'), voice('Tingting', 'zh-CN')];
    expect(voicesForLanguage(chinese, 'zh-TW').map(each => each.name)).toEqual(['Meijia', 'Sinji']);
    expect(voicesForLanguage([voice('Filipino', 'fil-PH'), voice('Indonesia', 'in-ID')], 'tl').map(each => each.name)).toEqual(['Filipino']);
    expect(voicesForLanguage([voice('Indonesia', 'in-ID')], 'id').map(each => each.name)).toEqual(['Indonesia']);
  });

  it('keeps a reader\'s own choice and casts the other roles around it', () => {
    const choice = chooseDefaultVoices(APPLE, 'en', PICKS, { narrator: APPLE[3] });
    expect(names(choice)).toEqual(['Rishi', 'Samantha', 'Karen']);
  });
});

describe('preferences', () => {
  const memory = () => {
    const values = new Map<string, string>();
    return { values, storage: { read: (key: string) => values.get(key) ?? null, write: (key: string, value: string) => { values.set(key, value); }, remove: (key: string) => { values.delete(key); } } };
  };

  it('round-trips speed and per-language voices, and rejects anything malformed', () => {
    const saved = { rate: 1.25, voices: { en: { narrator: { uri: 'uri:Daniel', name: 'Daniel', lang: 'en-GB' } } } };
    expect(parseReadAloudPreferences(serializeReadAloudPreferences(saved))).toEqual(saved);
    expect(parseReadAloudPreferences(null)).toBe(DEFAULT_READ_ALOUD_PREFERENCES);
    expect(parseReadAloudPreferences('{not json')).toBe(DEFAULT_READ_ALOUD_PREFERENCES);
    expect(parseReadAloudPreferences('{"v":2,"rate":1.5}')).toBe(DEFAULT_READ_ALOUD_PREFERENCES);
    expect(parseReadAloudPreferences('{"v":1,"rate":0.1}').rate).toBe(0.75);
    expect(parseReadAloudPreferences('{"v":1,"rate":9}').rate).toBe(2);
    expect(parseReadAloudPreferences('{"v":1,"rate":"fast"}').rate).toBe(1);
    expect(parseReadAloudPreferences(JSON.stringify({ v: 1, rate: 1, voices: { xx: { narrator: { uri: 'a', name: 'a', lang: 'en' } }, en: { narrator: { uri: 7 }, side: 'Daniel' } } })).voices).toEqual({});
  });

  it('reads and writes through the host port, and storage that fails is only advisory', () => {
    const { storage, values } = memory();
    writeReadAloudPreferences(storage, { rate: 1.5, voices: {} });
    expect(JSON.parse(values.get('read-aloud')!)).toEqual({ v: 1, rate: 1.5, voices: {} });
    expect(readReadAloudPreferences(storage).rate).toBe(1.5);
    const broken = { read: () => { throw new Error('denied'); }, write: () => { throw new Error('denied'); }, remove: () => undefined };
    expect(readReadAloudPreferences(broken)).toBe(DEFAULT_READ_ALOUD_PREFERENCES);
    expect(() => writeReadAloudPreferences(broken, DEFAULT_READ_ALOUD_PREFERENCES)).not.toThrow();
    expect(readReadAloudPreferences(undefined)).toBe(DEFAULT_READ_ALOUD_PREFERENCES);
  });

  it('finds a saved voice by its URI, or by name and language when the device renamed its URI', () => {
    const renamed = [voice('Daniel', 'en_GB', { voiceURI: 'com.apple.voice.enhanced.en-GB.Daniel' })];
    expect(findStoredVoice(renamed, { uri: 'com.apple.voice.compact.en-GB.Daniel', name: 'Daniel', lang: 'en-GB' })?.voiceURI)
      .toBe('com.apple.voice.enhanced.en-GB.Daniel');
    const choice = resolveReadAloudVoices(APPLE, 'en', { rate: 1, voices: { en: { side: { uri: 'uri:Karen', name: 'Karen', lang: 'en-AU' } } } }, PICKS);
    expect(names(choice)).toEqual(['Daniel', 'Rishi', 'Karen']);
  });
});

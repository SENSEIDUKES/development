import { describe, expect, it } from 'vitest';
import { findSpokenLines, isSpeakerOnText, SPEAKER_KIND, speakerAttachmentId, type SpeakerAttachment } from './speech';

const lines = (text: string) => findSpokenLines(text).map(line => text.slice(line.start, line.end));

describe('findSpokenLines', () => {
  it('finds curly, straight, Japanese and guillemet quotes, marks included', () => {
    expect(lines('“Run!” Lin Feng shouted. "They are coming," she said.')).toEqual(['“Run!”', '"They are coming,"']);
    expect(lines('「行くぞ」と彼は言った。')).toEqual(['「行くぞ」']);
    expect(lines('—No —dijo él. «Ven aquí», susurró.')).toEqual(['«Ven aquí»']);
  });

  it('reads only the outermost quote', () => {
    expect(lines('「彼は『待て』と言った」')).toEqual(['「彼は『待て』と言った」']);
    expect(lines('“He told me ‘wait’, then left,” she said.')).toEqual(['“He told me ‘wait’, then left,”']);
  });

  it('accepts mixed curly and straight pairs, which writers mix', () => {
    expect(lines('“Hold the gate," the captain said.')).toEqual(['“Hold the gate,"']);
    expect(lines('"Hold the gate,” the captain said.')).toEqual(['"Hold the gate,”']);
  });

  it('runs an unclosed quote to the end of the paragraph (one speech across paragraphs)', () => {
    expect(lines('He drew breath. “The first oath binds the blood,')).toEqual(['“The first oath binds the blood,']);
  });

  it('leaves apostrophes, single quotes and dash dialogue alone', () => {
    expect(lines('Wei\'s blade didn’t move. ‘Fine,’ he thought.')).toEqual([]);
    expect(lines('—Corre —gritó Lin.')).toEqual([]);
  });

  it('keeps quotes that span sentences whole', () => {
    expect(lines('“Stop. Don\'t move,” she said.')).toEqual(['“Stop. Don\'t move,”']);
  });
});

describe('speaker records', () => {
  const text = '“Ring the bells,” Ye Chen said.';
  const record = (overrides: Partial<SpeakerAttachment['anchor']> = {}): SpeakerAttachment => ({
    id: speakerAttachmentId('c1-p0', 0, 17), kind: SPEAKER_KIND,
    anchor: { level: 'span', blockId: 'c1-p0', startOffset: 0, endOffset: 17, selectedText: '“Ring the bells,”', ...overrides },
    payload: { origin: 'harness', speaker: 'Ye Chen', protagonist: true },
  });

  it('is on its text only while its words are unchanged', () => {
    expect(speakerAttachmentId('c1-p0', 0, 17)).toBe('speaker:c1-p0:0-17');
    expect(isSpeakerOnText(record(), 'c1-p0', text)).toBe(true);
    expect(isSpeakerOnText(record(), 'c1-p1', text)).toBe(false);
    expect(isSpeakerOnText(record(), 'c1-p0', '“Ring the gongs,” Ye Chen said.')).toBe(false);
    expect(isSpeakerOnText(record({ detached: true }), 'c1-p0', text)).toBe(false);
    expect(isSpeakerOnText({ ...record(), payload: { origin: 'harness', speaker: '  ', protagonist: false } }, 'c1-p0', text)).toBe(false);
  });
});

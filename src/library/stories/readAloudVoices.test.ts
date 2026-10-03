import { describe, expect, it } from 'vitest';
import { chooseDefaultVoices, type ReadAloudVoice } from '@seihouse/sen/reader-runtime';
import { LIBRARY_READ_ALOUD_VOICES } from './readAloudVoices';

const voice = (name: string, lang: string, extra: Partial<ReadAloudVoice> = {}): ReadAloudVoice =>
  ({ voiceURI: `uri:${name}`, name, lang, localService: true, ...extra });
const cast = (voices: ReadAloudVoice[]) => {
  const choice = chooseDefaultVoices(voices, 'en', LIBRARY_READ_ALOUD_VOICES);
  return [choice.narrator?.name, choice.protagonist?.name, choice.side?.name];
};
const online = { localService: false };

describe('SEIHouse\'s narration voices, production\'s cast', () => {
  it('on Chrome for Windows: Google US English narrates, Microsoft David and Zira speak, as production did', () => {
    expect(cast([
      voice('Microsoft David - English (United States)', 'en-US', { default: true }), voice('Microsoft Zira - English (United States)', 'en-US'),
      voice('Google US English', 'en-US', online), voice('Google UK English Female', 'en-GB', online), voice('Google UK English Male', 'en-GB', online),
    ])).toEqual(['Google US English', 'Microsoft David - English (United States)', 'Microsoft Zira - English (United States)']);
  });

  it('on Edge for Windows: the voices on the computer, never the online Natural voices that pause before each line', () => {
    expect(cast([
      voice('Microsoft David - English (United States)', 'en-US', { default: true }), voice('Microsoft Mark - English (United States)', 'en-US'),
      voice('Microsoft Zira - English (United States)', 'en-US'), voice('Microsoft Aria Online (Natural) - English (United States)', 'en-US', online),
      voice('Microsoft Ava Online (Natural) - English (United States)', 'en-US', online), voice('Microsoft Guy Online (Natural) - English (United States)', 'en-US', online),
    ])).toEqual(['Microsoft David - English (United States)', 'Microsoft Mark - English (United States)', 'Microsoft Zira - English (United States)']);
  });

  it('on Apple devices: Daniel, Rishi and Samantha, the standard voices before their Enhanced ones', () => {
    expect(cast([
      voice('Samantha (Enhanced)', 'en-US'), voice('Samantha', 'en-US', { default: true }), voice('Daniel (Enhanced)', 'en-GB'),
      voice('Daniel', 'en-GB'), voice('Rishi', 'en-IN'), voice('Karen', 'en-AU'),
    ])).toEqual(['Daniel', 'Rishi', 'Samantha']);
  });
});

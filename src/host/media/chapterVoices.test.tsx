// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterVoicePlan, ChapterVoiceService } from '@seihouse/library/stories';
import type { ChapterVoiceClient } from './chapterVoiceClient';
import { useChapterVoices } from './chapterVoices';
import { createMemoryStoryCoverStore } from './storyCovers';

/** Character voices on the device: each line kept as it is made, each character's voice kept for the story. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let service: ChapterVoiceService;
function Probe({ store, client }: { store: ReturnType<typeof createMemoryStoryCoverStore>; client: ChapterVoiceClient }) {
  service = useChapterVoices(store, client);
  return null;
}
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); };

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  let made = 0;
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => `blob:clip-${made += 1}`, revokeObjectURL: () => undefined }));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const plan: ChapterVoicePlan = {
  lines: [
    { key: 'c1-p1:0-10', text: '"Hello."', speaker: 'Mara', cardKey: 'mara' },
    { key: 'c1-p2:0-12', text: '"Go away."', speaker: 'The keeper', cardKey: 'keeper' },
  ],
  cast: [{ key: 'mara', gender: 'female' }, { key: 'keeper', gender: 'male' }],
  unvoiced: 0,
};

describe('character voices kept on the device', () => {
  it('voices only the lines without a clip, keeps each as it arrives, and keeps the cast', async () => {
    const store = createMemoryStoryCoverStore();
    const line = vi.fn<ChapterVoiceClient['line']>(async () => new Blob([new Uint8Array([1])], { type: 'audio/mpeg' }));
    const cast = vi.fn<ChapterVoiceClient['cast']>(async () => ({ mara: 'bright-heroine-female', keeper: 'old-grandmaster-male' }));
    const client: ChapterVoiceClient = { info: async () => ({ available: true, model: 'eleven_multilingual_v2' }), cast, line };
    await act(async () => { root.render(<Probe store={store} client={client} />); });
    await flush();
    expect(service.available).toBe(true);
    expect(service.model).toBe('eleven_multilingual_v2');
    expect(service.missing('story', 'chapter', plan.lines)).toHaveLength(2);

    // The second line fails: the first is kept, and only the second is asked for again.
    line.mockImplementationOnce(async () => new Blob([new Uint8Array([1])], { type: 'audio/mpeg' }))
      .mockImplementationOnce(async () => { throw new Error('The line could not be voiced right now.'); });
    const progress: number[] = [];
    await act(async () => { await expect(service.voice('story', 'chapter', plan, kept => progress.push(kept))).rejects.toThrow('could not be voiced'); });
    expect(progress).toEqual([1]);
    expect(service.voiced('story', 'chapter', plan.lines)).toBe(1);
    expect(line.mock.calls.map(call => call[0])).toEqual([
      { text: '"Hello."', voiceKey: 'bright-heroine-female' }, { text: '"Go away."', voiceKey: 'old-grandmaster-male' },
    ]);

    await act(async () => { await service.voice('story', 'chapter', plan); });
    expect(line).toHaveBeenCalledTimes(3);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(service.missing('story', 'chapter', plan.lines)).toEqual([]);

    // The Reader gets a clip only for the words that were voiced.
    expect(service.clip('story', 'chapter', { key: 'c1-p1:0-10', text: '"Hello."', speaker: 'Mara' })).toMatch(/^blob:clip-/);
    expect(service.clip('story', 'chapter', { key: 'c1-p1:0-10', text: '"Hello there."', speaker: 'Mara' })).toBeUndefined();
    expect(service.clip('story', 'other-chapter', { key: 'c1-p1:0-10', text: '"Hello."', speaker: 'Mara' })).toBeUndefined();
    // The same words given to another speaker (a chapter tagged again) are a line still to voice.
    expect(service.clip('story', 'chapter', { key: 'c1-p1:0-10', text: '"Hello."', speaker: 'The keeper' })).toBeUndefined();
    expect(service.missing('story', 'chapter', [{ ...plan.lines[0], speaker: 'The keeper', cardKey: 'keeper' }])).toHaveLength(1);

    // Another visit: the clips and the cast are still on the device, so nothing is made or cast again.
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => { root.render(<Probe store={store} client={client} />); });
    await flush();
    expect(service.missing('story', 'chapter', plan.lines)).toEqual([]);
    const later: ChapterVoicePlan = { ...plan, lines: [...plan.lines, { key: 'c2-p1:0-9', text: '"Again."', speaker: 'Mara', cardKey: 'mara' }] };
    await act(async () => { await service.voice('story', 'chapter-2', later); });
    expect(cast).toHaveBeenCalledTimes(1);
    expect(line.mock.calls.at(-1)![0]).toEqual({ text: '"Again."', voiceKey: 'bright-heroine-female' });
  });

  it('keeps a promoted minor figure in the voice they already speak with', async () => {
    const store = createMemoryStoryCoverStore();
    const line = vi.fn<ChapterVoiceClient['line']>(async () => new Blob([new Uint8Array([1])], { type: 'audio/mpeg' }));
    const cast = vi.fn<ChapterVoiceClient['cast']>(async characters => Object.fromEntries(characters.map(character => [character.key, 'old-grandmaster-male'])));
    const client: ChapterVoiceClient = { info: async () => ({ available: true }), cast, line };
    await act(async () => { root.render(<Probe store={store} client={client} />); });
    await flush();
    const asMinor: ChapterVoicePlan = {
      lines: [{ key: 'c1-p1:0-10', text: '"Go back."', speaker: 'the keeper', cardKey: 'minor:the keeper' }],
      cast: [{ key: 'minor:the keeper', name: 'the keeper', gender: 'man', age: 'old' }], unvoiced: 0,
    };
    await act(async () => { await service.voice('story', 'chapter-1', asMinor); });
    expect(cast).toHaveBeenCalledTimes(1);

    // Promoted: the same person now speaks by a card. They are not cast again, and the next line is in the same voice.
    const asCard: ChapterVoicePlan = {
      lines: [{ key: 'c2-p1:0-8', text: '"Wait."', speaker: 'Keeper', cardKey: 'world:character:keeper' }],
      // The card now goes by Keeper; the name they spoke under as a minor figure is among the names it answers to.
      cast: [{ key: 'world:character:keeper', name: 'Keeper', was: ['minor:keeper', 'minor:the keeper'] }], unvoiced: 0,
    };
    await act(async () => { await service.voice('story', 'chapter-2', asCard); });
    expect(cast).toHaveBeenCalledTimes(1);
    expect(line.mock.calls.at(-1)![0]).toEqual({ text: '"Wait."', voiceKey: 'old-grandmaster-male' });
    // The clip made while they were a minor figure still plays: it is kept by the line and its speaker.
    expect(service.clip('story', 'chapter-1', { key: 'c1-p1:0-10', text: '"Go back."', speaker: 'the keeper' })).toMatch(/^blob:clip-/);
  });
});

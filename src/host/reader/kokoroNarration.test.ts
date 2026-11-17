import { describe, expect, it } from 'vitest';
import type { ReadAloudLine } from '@seihouse/sen/reader-runtime';
import { createKokoroNarration, kokoroNarrationStatus, KOKORO_NARRATION_PREFERENCE_KEY, type KokoroLineRequest } from './kokoroNarration';

/** Kokoro from SEIHouse's voice server: each line made once and kept, asked for a few lines ahead. */

const line = (text: string, role: ReadAloudLine['role'] = 'narrator'): ReadAloudLine =>
  ({ key: text, blockId: 'c1-p1', sentence: { start: 0, end: 1 }, start: 0, end: 1, text, role });

const memory = () => {
  const kept = new Map<string, string>();
  return { read: (key: string) => kept.get(key) ?? null, write: (key: string, value: string) => { kept.set(key, value); }, remove: (key: string) => { kept.delete(key); }, kept };
};

/** A voice server that answers when told to. */
const server = () => {
  const asked: { text: string; voice: string; answer: (made?: boolean) => void; fail: (error: Error) => void }[] = [];
  const requestLine: KokoroLineRequest = ({ text, voice }) => new Promise((resolve, reject) => {
    asked.push({ text, voice, answer: (made = true) => resolve({ url: `https://voice.example/clip/${voice}/${text}`, made }), fail: reject });
  });
  return { asked, requestLine };
};
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Kokoro voices from the voice server', () => {
  it('is off until the reader turns it on, and is remembered', () => {
    const preferences = memory();
    const voice = server();
    const narration = createKokoroNarration({ preferences, requestLine: voice.requestLine });
    expect(narration.clip(line('The gate stood open.'), [])).toBeUndefined();
    expect(voice.asked).toEqual([]);
    narration.setOn(true);
    expect(preferences.kept.get(KOKORO_NARRATION_PREFERENCE_KEY)).toBe('on');
    expect(createKokoroNarration({ preferences, requestLine: voice.requestLine }).getState().on).toBe(true);
    narration.setOn(false);
    expect(preferences.kept.has(KOKORO_NARRATION_PREFERENCE_KEY)).toBe(false);
  });

  it('asks for the line being read first and two at a time, in each role\'s voice, and each line once', async () => {
    const voice = server();
    const narration = createKokoroNarration({ requestLine: voice.requestLine });
    narration.setOn(true);
    const first = narration.clip(line('One.'), [line('"Two."', 'protagonist'), line('"Three."', 'side')]);
    expect(voice.asked.map(({ text, voice: id }) => [text, id])).toEqual([['One.', 'bm_lewis'], ['"Two."', 'am_puck']]);
    voice.asked[0].answer(false);
    await expect(first).resolves.toBe('https://voice.example/clip/bm_lewis/One.');
    await settle();
    expect(voice.asked.map(({ text }) => text)).toEqual(['One.', '"Two."', '"Three."']);
    // Asked again, the same line is not asked of the server again.
    expect(narration.clip(line('One.'), [])).toBe('https://voice.example/clip/bm_lewis/One.');
    voice.asked[1].answer(true);
    await settle();
    expect(narration.getState()).toMatchObject({ kept: 1, made: 1 });
    expect(kokoroNarrationStatus(narration.getState(), true)).toBe('On. 2 lines so far: 1 already kept, 1 made for you.');
  });

  it('lets go of lines the reader skipped past', async () => {
    const voice = server();
    const narration = createKokoroNarration({ requestLine: voice.requestLine });
    narration.setOn(true);
    void narration.clip(line('One.'), [line('Two.'), line('Three.'), line('Four.')]);
    const skipped = narration.clip(line('Nine.'), []);
    // The two already asked cannot be called back; the two still waiting are let go, and the new line goes next.
    expect(voice.asked.map(({ text }) => text)).toEqual(['One.', 'Two.']);
    voice.asked[0].answer();
    await settle();
    expect(voice.asked.map(({ text }) => text)).toEqual(['One.', 'Two.', 'Nine.']);
    voice.asked[2].answer();
    await expect(skipped).resolves.toMatch(/Nine\.$/);
  });

  it('reads a failed line with the device, and stops asking after three failures in a row until switched on again', async () => {
    const voice = server();
    const narration = createKokoroNarration({ requestLine: voice.requestLine });
    narration.setOn(true);
    const failing = narration.clip(line('One.'), []);
    voice.asked[0].fail(new Error('down'));
    await expect(failing).resolves.toBeUndefined();
    for (const text of ['Two.', 'Three.']) {
      const next = narration.clip(line(text), []);
      voice.asked.at(-1)!.fail(new Error('The voice server answered 503.'));
      await next;
      await settle();
    }
    expect(narration.getState().problem).toBe('The voice server answered 503.');
    expect(narration.clip(line('Four.'), [])).toBeUndefined();
    expect(kokoroNarrationStatus(narration.getState(), true)).toContain('stopped answering');
    narration.setOn(false);
    narration.setOn(true);
    void narration.clip(line('Four.'), []);
    expect(voice.asked.at(-1)!.text).toBe('Four.');
  });

  it('hands every line to the device when switched off, even one the server is still making', async () => {
    const voice = server();
    const narration = createKokoroNarration({ requestLine: voice.requestLine });
    narration.setOn(true);
    const reading = narration.clip(line('One.'), [line('Two.'), line('Three.')]);
    const waiting = narration.clip(line('Three.'), []);
    narration.setOn(false);
    await expect(reading).resolves.toBeUndefined();
    await expect(waiting).resolves.toBeUndefined();
    // The server's late answer changes nothing.
    voice.asked[0].answer();
    await settle();
    expect(narration.getState()).toMatchObject({ made: 0, kept: 0 });
    narration.setOn(true);
    void narration.clip(line('One.'), []);
    expect(voice.asked.at(-1)!.text).toBe('One.');
  });

  it('says plainly where it stands', () => {
    expect(kokoroNarrationStatus({ on: false, made: 0, kept: 0 }, true)).toContain('made once on SEIHouse\'s voice server');
    expect(kokoroNarrationStatus({ on: true, made: 0, kept: 0 }, true)).toContain('Press Listen');
    expect(kokoroNarrationStatus({ on: true, made: 0, kept: 0 }, false)).toBe('Kokoro reads English. This story is read by your device\'s own voice.');
  });
});

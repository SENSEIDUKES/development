import { describe, expect, it, vi } from 'vitest';
import type { ReadAloudLine } from '@seihouse/sen/reader-runtime';
import { createDeviceNarration, deviceNarrationStatus, DEVICE_NARRATION_PREFERENCE_KEY, type KokoroWorkerLike } from './deviceNarration';
import type { KokoroWorkerMessage, KokoroWorkerRequest } from './kokoroWorker';

/** Narration made on the reader's device with Kokoro: downloaded once, then every line made here, free. */

const line = (text: string, role: ReadAloudLine['role'] = 'narrator'): ReadAloudLine =>
  ({ key: text, blockId: 'c1-p1', sentence: { start: 0, end: 1 }, start: 0, end: 1, text, role });

const fakeWorker = () => {
  const sent: KokoroWorkerRequest[] = [];
  const worker: KokoroWorkerLike = { postMessage: message => { sent.push(message); }, onmessage: null, onerror: null, terminate: () => undefined };
  const answer = (message: KokoroWorkerMessage) => worker.onmessage?.({ data: message });
  const spoken = () => {
    const asked = sent.filter((message): message is Extract<KokoroWorkerRequest, { type: 'speak' }> => message.type === 'speak').at(-1)!;
    answer({ type: 'spoken', id: asked.id, wav: new ArrayBuffer(4), audioSeconds: 3, tookMs: 1000 });
    return asked;
  };
  return { worker, sent, answer, spoken };
};
const memory = () => {
  const kept = new Map<string, string>();
  return { read: (key: string) => kept.get(key) ?? null, write: (key: string, value: string) => { kept.set(key, value); }, remove: (key: string) => { kept.delete(key); }, kept };
};
const narration = (preferences = memory()) => {
  const fake = fakeWorker();
  let made = 0;
  const revoked: string[] = [];
  const service = createDeviceNarration({ preferences, createWorker: () => fake.worker, hasGraphicsChip: async () => false, toUrl: () => `blob:kokoro-${made += 1}`, revokeUrl: url => { revoked.push(url); } });
  return { ...fake, service, preferences, revoked };
};

describe('narration made on the device', () => {
  it('is off until the reader turns it on, downloads once, and is remembered', () => {
    const { service, sent, answer, preferences } = narration();
    expect(service.getState()).toEqual({ on: false, model: 'idle' });
    // Off: Listen is given nothing, so the device's own voice reads, and nothing is downloaded.
    expect(service.clip(line('The gate stood open.'), [])).toBeUndefined();
    expect(sent).toEqual([]);

    service.setOn(true);
    expect(sent).toEqual([{ type: 'load' }]);
    expect(preferences.kept.get(DEVICE_NARRATION_PREFERENCE_KEY)).toBe('on');
    answer({ type: 'progress', loaded: 45, total: 90 });
    expect(service.getState()).toMatchObject({ model: 'loading', progress: 0.5 });
    // Still downloading: the device's own voice reads on.
    expect(service.clip(line('The gate stood open.'), [])).toBeUndefined();
    answer({ type: 'ready', device: 'wasm' });
    expect(service.getState()).toMatchObject({ model: 'ready', device: 'wasm' });

    service.setOn(false);
    expect(preferences.kept.has(DEVICE_NARRATION_PREFERENCE_KEY)).toBe(false);
    expect(service.clip(line('The gate stood open.'), [])).toBeUndefined();
  });

  it('makes the line being read first, the lines after it ahead, and each only once', async () => {
    const { service, sent, answer, spoken } = narration();
    service.setOn(true);
    answer({ type: 'ready', device: 'webgpu' });
    const first = service.clip(line('One.'), [line('"Two," he said.', 'protagonist'), line('Three.')]);
    expect(first).toBeInstanceOf(Promise);
    // One line at a time, each part of Listen in its own voice of the first Kokoro cast.
    expect(spoken()).toMatchObject({ text: 'One.', voice: 'bm_lewis' });
    await expect(first).resolves.toBe('blob:kokoro-1');
    expect(spoken()).toMatchObject({ text: '"Two," he said.', voice: 'am_puck' });
    // The reader reaches the second line: it is already made, so it plays at once.
    expect(service.clip(line('"Two," he said.', 'protagonist'), [line('Three.')])).toBe('blob:kokoro-2');
    spoken();
    expect(sent.filter(message => message.type === 'speak')).toHaveLength(3);
    // The same words in the same voice are never made twice.
    expect(service.clip(line('One.'), [])).toBe('blob:kokoro-1');
    expect(sent.filter(message => message.type === 'speak')).toHaveLength(3);
    // Three seconds of speech made in one second, three times.
    expect(service.getState().speed).toBe(3);
  });

  it('lets go of lines the reader skipped past, and reads a failed line with the device', async () => {
    const { service, sent, answer, spoken } = narration();
    service.setOn(true);
    answer({ type: 'ready', device: 'wasm' });
    void service.clip(line('One.'), [line('Two.'), line('Three.')]);
    // A skip to somewhere else: the lines still waiting are dropped, the new line goes next.
    const jumped = service.clip(line('Nine.'), []);
    spoken();
    expect(spoken()).toMatchObject({ text: 'Nine.' });
    await expect(jumped).resolves.toMatch(/^blob:/);
    expect(sent.filter(message => message.type === 'speak').map(message => 'text' in message && message.text)).toEqual(['One.', 'Nine.']);

    const failing = service.clip(line('Ten.'), []);
    const asked = sent.at(-1) as Extract<KokoroWorkerRequest, { type: 'speak' }>;
    answer({ type: 'unspoken', id: asked.id, message: 'out of memory' });
    await expect(failing).resolves.toBeUndefined();
  });

  it('loads on the first Listen when it was left on, and says plainly where it stands', () => {
    const preferences = memory();
    preferences.write(DEVICE_NARRATION_PREFERENCE_KEY, 'on');
    const { service, sent, answer } = narration(preferences);
    expect(service.getState()).toMatchObject({ on: true, model: 'idle' });
    expect(sent).toEqual([]);
    expect(service.clip(line('One.'), [])).toBeUndefined();
    expect(sent).toEqual([{ type: 'load' }]);

    expect(deviceNarrationStatus({ on: false, model: 'idle' }, true)).toBe('Free voices made on this device, in place of its robotic one. Downloads about 90 MB once.');
    expect(deviceNarrationStatus({ on: false, model: 'idle', graphicsChip: true }, true)).toContain('about 330 MB');
    expect(deviceNarrationStatus({ on: true, model: 'loading', progress: 0.42 }, true)).toBe('Downloading the voice: 42%. Your device\'s own voice reads until it is ready.');
    expect(deviceNarrationStatus({ on: true, model: 'ready', device: 'webgpu', speed: 3.26 }, true)).toBe('Ready, on its graphics chip. This device makes 3.3 seconds of speech a second.');
    expect(deviceNarrationStatus({ on: true, model: 'ready', device: 'wasm', speed: 0.3 }, true)).toBe('Ready, on its processor. This device makes 0.3 seconds of speech a second, slower than it is spoken, so lines will wait.');
    expect(deviceNarrationStatus({ on: true, model: 'ready', device: 'wasm' }, false)).toBe('Kokoro reads English. This story is read by your device\'s own voice.');
    answer({ type: 'failed', message: 'no memory' });
    expect(deviceNarrationStatus(service.getState(), true)).toBe('Kokoro could not start here, so your device\'s own voice reads on. no memory');
  });
});

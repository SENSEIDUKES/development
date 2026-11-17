/// <reference lib="webworker" />
import { KokoroTTS } from 'kokoro-js';

/**
 * Kokoro on this device, off the page's own thread: the model is downloaded
 * once (the browser keeps it), then each line is turned into audio here. The
 * page asks for one line at a time and gets back a WAV and how long it took.
 */

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

/**
 * How the voice runs here. A browser with a graphics chip it can use (WebGPU)
 * runs the full model on it, which is far faster and a larger download (about
 * 330 MB); any other runs the compressed model on the processor (about 90 MB).
 */
export type KokoroDevice = 'webgpu' | 'wasm';
const BUILDS: Readonly<Record<KokoroDevice, 'fp32' | 'q8'>> = { webgpu: 'fp32', wasm: 'q8' };

export type KokoroWorkerRequest =
  | { type: 'load'; device: KokoroDevice }
  | { type: 'speak'; id: number; text: string; voice: string };

export type KokoroWorkerMessage =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready'; device: KokoroDevice }
  | { type: 'failed'; message: string }
  | { type: 'spoken'; id: number; wav: ArrayBuffer; audioSeconds: number; tookMs: number }
  | { type: 'unspoken'; id: number; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (message: KokoroWorkerMessage, transfer: Transferable[] = []) => scope.postMessage(message, transfer);

const build = (device: KokoroDevice) => KokoroTTS.from_pretrained(MODEL, {
  dtype: BUILDS[device],
  device,
  progress_callback: progress => {
    // Only the model file is large enough to be worth showing.
    if (progress.status === 'progress' && progress.file.endsWith('.onnx')) post({ type: 'progress', loaded: progress.loaded, total: progress.total });
  },
});

let model: Promise<KokoroTTS> | undefined;
// The page chooses where the voice runs (it knows whether this is a phone) and says so with `load`.
let running: KokoroDevice = 'wasm';
const load = () => (model ??= build(running));

scope.onmessage = async ({ data }: MessageEvent<KokoroWorkerRequest>) => {
  if (data.type === 'load') {
    if (!model) running = data.device;
    try { await load(); post({ type: 'ready', device: running }); }
    catch (error) { model = undefined; post({ type: 'failed', message: error instanceof Error ? error.message : 'The voice could not be loaded.' }); }
    return;
  }
  try {
    const started = performance.now();
    const audio = await (await load()).generate(data.text, { voice: data.voice as never });
    const wav = audio.toWav();
    post({ type: 'spoken', id: data.id, wav, audioSeconds: audio.audio.length / audio.sampling_rate, tookMs: performance.now() - started }, [wav]);
  } catch (error) {
    post({ type: 'unspoken', id: data.id, message: error instanceof Error ? error.message : 'The line could not be voiced.' });
  }
};

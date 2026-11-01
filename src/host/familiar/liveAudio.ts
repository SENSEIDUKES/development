/**
 * The microphone and speaker for live talk over a WebSocket (Gemini Live,
 * ElevenLabs Realtime): the microphone in 16-bit mono pieces at the model's
 * rate, and the Familiar's 16-bit mono voice played back in order. Shared by
 * every WebSocket provider; WebRTC providers (GPT-Live) use the phone's own.
 */

/** The microphone is sent in pieces this long. */
const CHUNK_MS = 100;
/** Hands each microphone frame to the page, which sends it on. */
const CAPTURE_WORKLET = "class FamiliarCapture extends AudioWorkletProcessor{process(inputs){const channel=inputs[0]&&inputs[0][0];if(channel)this.port.postMessage(channel.slice(0));return true}}registerProcessor('familiar-capture',FamiliarCapture)";

/** The microphone's samples at its own rate, as 16-bit samples at `toRate`. */
export function downsample(samples: Float32Array, fromRate: number, toRate = 16_000): Int16Array {
  const ratio = fromRate / toRate;
  const length = Math.floor(samples.length / ratio);
  const out = new Int16Array(length);
  for (let index = 0; index < length; index++) {
    // The average of the samples this one stands for keeps it from aliasing.
    const start = Math.floor(index * ratio);
    const end = Math.max(start + 1, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let at = start; at < end; at++) sum += samples[at];
    const value = Math.max(-1, Math.min(1, sum / (end - start)));
    out[index] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  return out;
}

export function pcm16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

/** The model's audio (base64 16-bit little-endian) as samples to play. */
export function base64ToFloat32(data: string): Float32Array<ArrayBuffer> {
  const binary = atob(data);
  const view = new DataView(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) view.setUint8(index, binary.charCodeAt(index));
  const out = new Float32Array(Math.floor(binary.length / 2));
  for (let index = 0; index < out.length; index++) out[index] = view.getInt16(index * 2, true) / 0x8000;
  return out;
}

/** Plays the model's voice pieces one after another; `stop` cuts it off (the reader spoke over it). */
export function createPcmPlayer(audio: AudioContext, rate: number) {
  const playing = new Set<AudioBufferSourceNode>();
  let playhead = 0;
  return {
    play(data: string) {
      const samples = base64ToFloat32(data);
      if (!samples.length) return;
      const buffer = audio.createBuffer(1, samples.length, rate);
      buffer.copyToChannel(samples, 0);
      const node = audio.createBufferSource();
      node.buffer = buffer;
      node.connect(audio.destination);
      const at = Math.max(playhead, audio.currentTime);
      node.start(at);
      playhead = at + buffer.duration;
      playing.add(node);
      node.onended = () => playing.delete(node);
    },
    stop() {
      for (const node of playing) { try { node.stop(); } catch { /* already ended */ } }
      playing.clear();
      playhead = 0;
    },
  };
}

/** Makes the microphone worklet available; false where the browser cannot capture this way. */
export async function loadMicrophoneCapture(audio: AudioContext): Promise<boolean> {
  if (!audio.audioWorklet) return false;
  await audio.audioWorklet.addModule(URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'application/javascript' })));
  return true;
}

/** Sends the microphone on in base64 16-bit pieces at `toRate`. Returns the stop. */
export function captureMicrophone(audio: AudioContext, stream: MediaStream, toRate: number, send: (base64: string) => void): () => void {
  const microphone = audio.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(audio, 'familiar-capture');
  const silent = audio.createGain();
  silent.gain.value = 0;
  // Connected through silence, so every browser keeps the capture running.
  microphone.connect(node).connect(silent).connect(audio.destination);
  const needed = audio.sampleRate * CHUNK_MS / 1_000;
  let pending: Float32Array[] = [];
  let count = 0;
  node.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
    pending.push(data);
    count += data.length;
    if (count < needed) return;
    const all = new Float32Array(count);
    let at = 0;
    for (const piece of pending) { all.set(piece, at); at += piece.length; }
    pending = [];
    count = 0;
    send(pcm16ToBase64(downsample(all, audio.sampleRate, toRate)));
  };
  return () => {
    node.port.onmessage = null;
    node.disconnect();
    microphone.disconnect();
  };
}

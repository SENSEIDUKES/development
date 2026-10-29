import { useEffect, useState } from 'react';
import type { FamiliarLive, FamiliarLiveCall } from '@seihouse/library/familiar';
import { createSavedAccessToken } from '../generation/accessToken';

const ENDPOINT = '/api/familiar-live';
/** Gemini Live, opened with the single-use token the server minted. */
const LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
/** Gemini hears 16 kHz and speaks 24 kHz, 16-bit mono. */
const INPUT_RATE = 16_000;
const OUTPUT_RATE = 24_000;
/** The microphone is sent in pieces this long. */
const CHUNK_MS = 100;
/** The server's token stops working after ten minutes; the conversation ends then too. */
const SESSION_MS = 10 * 60 * 1_000;
/** A conversation that has not opened by then is given up. */
const CONNECT_MS = 15_000;
/** Hands each microphone frame to the page, which sends it on. */
const CAPTURE_WORKLET = "class FamiliarCapture extends AudioWorkletProcessor{process(inputs){const channel=inputs[0]&&inputs[0][0];if(channel)this.port.postMessage(channel.slice(0));return true}}registerProcessor('familiar-capture',FamiliarCapture)";

/** The microphone's samples at its own rate, as 16-bit samples at `toRate`. */
export function downsample(samples: Float32Array, fromRate: number, toRate = INPUT_RATE): Int16Array {
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

/** Gemini's audio (base64 16-bit little-endian) as samples to play. */
export function base64ToFloat32(data: string): Float32Array<ArrayBuffer> {
  const binary = atob(data);
  const view = new DataView(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) view.setUint8(index, binary.charCodeAt(index));
  const out = new Float32Array(Math.floor(binary.length / 2));
  for (let index = 0; index < out.length; index++) out[index] = view.getInt16(index * 2, true) / 0x8000;
  return out;
}

/** A tool call from the model, read strictly into what the screen understands. */
export function liveCall(name: unknown, args: unknown): FamiliarLiveCall | undefined {
  const value = args && typeof args === 'object' ? args as Record<string, unknown> : {};
  if (name === 'show_topic' && typeof value.topic_id === 'string') return { name, topicId: value.topic_id };
  if (name === 'propose_action' && typeof value.action_id === 'string') return { name, actionId: value.action_id, input: typeof value.input === 'string' ? value.input : '' };
  if (name === 'answer_proposal' && (value.answer === 'confirm' || value.answer === 'cancel' || value.answer === 'hear')) return { name, answer: value.answer };
  return undefined;
}

const errorText = (body: unknown, fallback: string) =>
  body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && body.error.trim() ? body.error : fallback;

interface LiveMessage {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: { functionCalls?: { id?: string; name?: string; args?: unknown }[] };
}

export interface FamiliarLiveDependencies {
  fetch?: typeof fetch;
  WebSocket?: typeof WebSocket;
  AudioContext?: typeof AudioContext;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  /** The owner's Development token lifts the visitor's daily count. */
  accessToken?: () => string | undefined;
}

/**
 * The Familiar's live talk on Gemini Live: the server mints a locked,
 * single-use token for this page (`/api/familiar-live`), then the browser
 * streams the microphone and plays the Familiar's voice until the reader
 * hangs up. Nothing is recorded or kept.
 */
export function createFamiliarGeminiLive(dependencies: FamiliarLiveDependencies = {}): FamiliarLive {
  const saved = createSavedAccessToken();
  return {
    start(brief, events) {
      const scope = globalThis as Partial<typeof globalThis> & { webkitAudioContext?: typeof AudioContext };
      const Context = dependencies.AudioContext ?? scope.AudioContext ?? scope.webkitAudioContext;
      const Socket = dependencies.WebSocket ?? scope.WebSocket;
      const devices = scope.navigator?.mediaDevices;
      const getUserMedia = dependencies.getUserMedia ?? (devices?.getUserMedia ? (constraints: MediaStreamConstraints) => devices.getUserMedia(constraints) : undefined);
      let over = false;
      if (!Context || !Socket || !getUserMedia) {
        queueMicrotask(() => { if (!over) events.ended('Live talk is not available in this browser.', true); });
        return { end() { over = true; } };
      }
      // Made during the reader's tap, so a phone lets it play.
      const audio = new Context();
      void audio.resume().catch(() => {});
      let socket: WebSocket | undefined;
      let stream: MediaStream | undefined;
      let capture: AudioWorkletNode | undefined;
      let source: MediaStreamAudioSourceNode | undefined;
      let opened = false;
      const playing = new Set<AudioBufferSourceNode>();
      let playhead = 0;
      let reader = '';
      let familiar = '';
      let turnOver = false;
      const stopPlayback = () => {
        for (const node of playing) { try { node.stop(); } catch { /* already ended */ } }
        playing.clear();
        playhead = 0;
      };
      const cleanup = () => {
        over = true;
        clearTimeout(limit);
        clearTimeout(connecting);
        stopPlayback();
        if (capture) capture.port.onmessage = null;
        capture?.disconnect();
        source?.disconnect();
        stream?.getTracks().forEach(track => track.stop());
        if (socket && socket.readyState <= 1) socket.close(1000);
        void audio.close().catch(() => {});
      };
      const finish = (problem?: string, unavailable = false) => {
        if (over) return;
        cleanup();
        events.ended(problem, unavailable);
      };
      const limit = setTimeout(() => finish('Your Familiar talked for ten minutes. Tap to talk again.'), SESSION_MS);
      const connecting = setTimeout(() => { if (!opened) finish('Your Familiar could not connect. Try again.'); }, CONNECT_MS);
      const send = (message: unknown) => { if (!over && socket?.readyState === 1) socket.send(JSON.stringify(message)); };
      const play = (data: string) => {
        const samples = base64ToFloat32(data);
        if (!samples.length) return;
        const buffer = audio.createBuffer(1, samples.length, OUTPUT_RATE);
        buffer.copyToChannel(samples, 0);
        const node = audio.createBufferSource();
        node.buffer = buffer;
        node.connect(audio.destination);
        const at = Math.max(playhead, audio.currentTime);
        node.start(at);
        playhead = at + buffer.duration;
        playing.add(node);
        node.onended = () => playing.delete(node);
      };
      const caption = (speaker: 'reader' | 'familiar', text: string) => {
        if (turnOver) {
          turnOver = false;
          reader = '';
          familiar = '';
          events.caption('reader', '');
          events.caption('familiar', '');
        }
        if (speaker === 'reader') events.caption('reader', reader = `${reader}${text}`);
        else events.caption('familiar', familiar = `${familiar}${text}`);
      };
      const answer = async (calls: NonNullable<LiveMessage['toolCall']>['functionCalls'] = []) => {
        for (const { id, name, args } of calls) {
          const call = liveCall(name, args);
          let result = 'That request is not available.';
          try { if (call) result = await events.call(call); } catch { result = 'That did not work.'; }
          send({ toolResponse: { functionResponses: [{ id, name, response: { result } }] } });
        }
      };
      const listen = () => {
        const microphone = audio.createMediaStreamSource(stream!);
        const node = new AudioWorkletNode(audio, 'familiar-capture');
        source = microphone;
        capture = node;
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
          send({ realtimeInput: { audio: { data: pcm16ToBase64(downsample(all, audio.sampleRate)), mimeType: `audio/pcm;rate=${INPUT_RATE}` } } });
        };
      };
      const receive = (message: LiveMessage) => {
        if (message.setupComplete && !opened) {
          opened = true;
          listen();
          events.connected();
        }
        const content = message.serverContent;
        if (content) {
          if (content.interrupted) stopPlayback();
          for (const part of content.modelTurn?.parts ?? []) {
            if (part.inlineData?.data && (part.inlineData.mimeType ?? 'audio/pcm').startsWith('audio/')) play(part.inlineData.data);
          }
          if (content.inputTranscription?.text) caption('reader', content.inputTranscription.text);
          if (content.outputTranscription?.text) caption('familiar', content.outputTranscription.text);
          if (content.turnComplete || content.interrupted) turnOver = true;
        }
        if (message.toolCall) void answer(message.toolCall.functionCalls);
      };
      void (async () => {
        try {
          const token = (dependencies.accessToken ?? (() => saved.current))()?.trim();
          const response = await (dependencies.fetch ?? fetch)(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ brief }),
          });
          const body: unknown = await response.json().catch(() => ({}));
          if (over) return;
          if (response.status === 429) { finish('Your Familiar has talked enough for today. It still listens the usual way.', true); return; }
          if (response.status === 503) { finish(undefined, true); return; }
          if (!response.ok) { finish(errorText(body, 'Your Familiar could not start talking. Try again.')); return; }
          const { token: liveToken, setup } = body as { token?: string; setup?: unknown };
          if (!liveToken || !setup) { finish('Your Familiar could not start talking. Try again.'); return; }
          try {
            stream = await getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
          } catch {
            finish('Allow the microphone to talk with your Familiar.');
            return;
          }
          if (over) { stream.getTracks().forEach(track => track.stop()); return; }
          if (!audio.audioWorklet) { finish('Live talk is not available in this browser.', true); return; }
          await audio.audioWorklet.addModule(URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'application/javascript' })));
          if (over) return;
          const live = new Socket(`${LIVE_URL}?access_token=${encodeURIComponent(liveToken)}`);
          socket = live;
          live.binaryType = 'arraybuffer';
          live.onopen = () => send({ setup });
          live.onmessage = ({ data }: MessageEvent<string | ArrayBuffer>) => {
            try { receive(JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)) as LiveMessage); } catch { /* not a message this reads */ }
          };
          live.onclose = (event: CloseEvent) => {
            if (event.reason) console.warn('[familiar-live] closed:', event.code, event.reason);
            finish(opened ? 'Your Familiar stopped talking.' : 'Your Familiar could not connect. Try again.');
          };
        } catch {
          finish('Your Familiar could not start talking. Try again.');
        }
      })();
      return { end: cleanup };
    },
  };
}

/** Whether the server can start live talk. Any failure reads as no, so the device voice stays. */
export async function familiarLiveConfigured(request: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await request(ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!response.ok) return false;
    const body = await response.json() as { configured?: unknown };
    return body.configured === true;
  } catch {
    return false;
  }
}

/** Live talk once the server says it can; until then (or without it), the device voice. */
export function useFamiliarGeminiLive(): FamiliarLive | undefined {
  const [live, setLive] = useState<FamiliarLive>();
  useEffect(() => {
    let current = true;
    void familiarLiveConfigured().then(configured => { if (current && configured) setLive(createFamiliarGeminiLive()); });
    return () => { current = false; };
  }, []);
  return live;
}

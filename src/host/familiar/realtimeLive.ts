import type { FamiliarLive } from '@seihouse/library/familiar';
import { createSavedAccessToken } from '../generation/accessToken';
import { openMicrophoneSession } from './audioSession';
import { describeFailure, liveCall } from './live';
import { captureMicrophone, createPcmPlayer, loadMicrophoneCapture } from './liveAudio';

const ENDPOINT = '/api/familiar-live';
/** ElevenLabs Realtime: OpenAI's Realtime protocol, opened with the client secret the server minted. */
export const ELEVENLABS_REALTIME_URL = 'wss://api.elevenlabs.io/v1/convai/realtime';
/** 16-bit mono at this rate both ways, unless the server says otherwise. */
const DEFAULT_RATE = 24_000;
/** The server's secret stops working after ten minutes; the conversation ends then too. */
const SESSION_MS = 10 * 60 * 1_000;
/** A conversation that has not opened by then is given up. */
const CONNECT_MS = 15_000;

interface RealtimeEvent {
  type?: string;
  delta?: string;
  transcript?: string;
  item?: { type?: string; call_id?: string; name?: string; arguments?: string };
  error?: { code?: string; message?: string };
}

export interface FamiliarRealtimeLiveDependencies {
  fetch?: typeof fetch;
  WebSocket?: typeof WebSocket;
  AudioContext?: typeof AudioContext;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  accessToken?: () => string | undefined;
  /** The reader's Router choice of live model; the server runs it when it can. */
  model?: string;
  /** The provider's Realtime WebSocket. */
  url?: string;
  /** The provider's name, for the reader's notes. */
  label?: string;
}

/**
 * The Familiar's live talk on a provider that speaks OpenAI's Realtime
 * protocol over a WebSocket (ElevenLabs Realtime): the server mints a client
 * secret locked to the Familiar's session (`/api/familiar-live`), then the
 * browser streams the microphone and plays the Familiar's voice until the
 * reader hangs up. Nothing is recorded or kept.
 */
export function createFamiliarRealtimeLive(dependencies: FamiliarRealtimeLiveDependencies = {}): FamiliarLive {
  const saved = createSavedAccessToken();
  const label = dependencies.label ?? 'ElevenLabs';
  return {
    start(brief, events, options = {}) {
      // Typed only: the Familiar answers aloud, and the microphone is never asked for.
      const microphone = options.microphone !== false;
      const scope = globalThis as Partial<typeof globalThis> & { webkitAudioContext?: typeof AudioContext };
      const Context = dependencies.AudioContext ?? scope.AudioContext ?? scope.webkitAudioContext;
      const Socket = dependencies.WebSocket ?? scope.WebSocket;
      const devices = scope.navigator?.mediaDevices;
      const getUserMedia = dependencies.getUserMedia ?? (devices?.getUserMedia ? (constraints: MediaStreamConstraints) => devices.getUserMedia(constraints) : undefined);
      let over = false;
      if (!Context || !Socket || (microphone && !getUserMedia)) {
        queueMicrotask(() => { if (!over) events.ended('Live talk is not available in this browser.', true); });
        return { end() { over = true; }, send() {} };
      }
      // Made during the reader's tap, so a phone lets it play.
      const audio = new Context();
      void audio.resume().catch(() => {});
      let socket: WebSocket | undefined;
      let stream: MediaStream | undefined;
      // Asked for during the tap too: a phone may refuse a microphone asked for later.
      let asking: Promise<MediaStream> | undefined;
      // On an iPhone, music's playback-only mode would refuse the microphone.
      const releaseSession = microphone ? openMicrophoneSession() : () => undefined;
      if (microphone) {
        try { asking = getUserMedia!({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); }
        catch (error) { asking = Promise.reject(error); }
        asking.then(given => { stream = given; if (over) given.getTracks().forEach(track => track.stop()); }, () => {});
      }
      let rate = DEFAULT_RATE;
      let player = createPcmPlayer(audio, rate);
      let stopCapture: (() => void) | undefined;
      let opened = false;
      let reader = '';
      let familiar = '';
      let lastSpeaker: 'reader' | 'familiar' | undefined;
      let readerHeardThisTurn = false;
      const answered = new Set<string>();
      const cleanup = () => {
        over = true;
        clearTimeout(limit);
        clearTimeout(connecting);
        player.stop();
        stopCapture?.();
        stream?.getTracks().forEach(track => track.stop());
        releaseSession();
        if (socket && socket.readyState <= 1) socket.close(1000);
        void audio.close().catch(() => {});
      };
      const finish = (problem?: string, unavailable = false) => {
        if (over) return;
        cleanup();
        events.ended(problem, unavailable);
      };
      /** Live talk could not start: the device voice listens instead, and the note says exactly why. */
      const fallBack = (why: unknown) => {
        console.warn('[familiar-live] could not start; the device voice listens instead.', why);
        finish(`Live talk could not start: ${describeFailure(why)}`, true);
      };
      const limit = setTimeout(() => finish('Your Familiar talked for ten minutes. Tap to talk again.'), SESSION_MS);
      const connecting = setTimeout(() => { if (!opened) fallBack(`no answer from ${label} in 15 seconds`); }, CONNECT_MS);
      const send = (message: unknown) => { if (!over && socket?.readyState === 1) socket.send(JSON.stringify(message)); };
      // Full duplex: the reader speaking after the Familiar starts new lines.
      const caption = (speaker: 'reader' | 'familiar', text: string, whole = false) => {
        if (speaker === 'reader' && lastSpeaker === 'familiar') {
          reader = '';
          familiar = '';
          events.caption('reader', '');
          events.caption('familiar', '');
        }
        lastSpeaker = speaker;
        if (speaker === 'reader') events.caption('reader', reader = whole ? text : reader + text);
        else events.caption('familiar', familiar += text);
      };
      /** A function the model called: run on the screen, its result returned, the model continued. */
      const answer = async (item: NonNullable<RealtimeEvent['item']>) => {
        if (!item.call_id || answered.has(item.call_id)) return;
        answered.add(item.call_id);
        let args: unknown = {};
        try { args = JSON.parse(item.arguments || '{}'); } catch { /* answered as unavailable */ }
        const call = liveCall(item.name, args);
        let result = 'That request is not available.';
        try { if (call) result = await events.call(call); } catch { result = 'That did not work.'; }
        send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ result }) } });
        send({ type: 'response.create' });
      };
      const receive = (event: RealtimeEvent) => {
        switch (event.type) {
          case 'session.created':
            if (opened) return;
            opened = true;
            clearTimeout(connecting);
            if (stream) stopCapture = captureMicrophone(audio, stream, rate, data => send({ type: 'input_audio_buffer.append', audio: data }));
            events.connected();
            return;
          case 'input_audio_buffer.speech_started':
            // The reader spoke over the Familiar: it stops at once.
            player.stop();
            readerHeardThisTurn = false;
            return;
          case 'conversation.item.input_audio_transcription.delta':
            if (event.delta) { readerHeardThisTurn = true; caption('reader', event.delta); }
            return;
          case 'conversation.item.input_audio_transcription.completed':
            if (event.transcript && !readerHeardThisTurn) caption('reader', event.transcript, true);
            readerHeardThisTurn = false;
            return;
          case 'response.output_audio.delta':
            if (event.delta) player.play(event.delta);
            return;
          case 'response.output_audio_transcript.delta':
            if (event.delta) caption('familiar', event.delta);
            return;
          case 'response.output_item.done':
            if (event.item?.type === 'function_call') void answer(event.item);
            return;
          case 'error': {
            const why = `${event.error?.code ? `${event.error.code}: ` : ''}${event.error?.message ?? 'unknown error'}`;
            if (!opened) fallBack(`${label} ${why}`);
            else events.notice?.(`Live talk: ${why}`);
            return;
          }
        }
      };
      void (async () => {
        try {
          const token = (dependencies.accessToken ?? (() => saved.current))()?.trim();
          const response = await (dependencies.fetch ?? fetch)(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ brief, ...(dependencies.model ? { model: dependencies.model } : {}) }),
          });
          const body = await response.json().catch(() => ({})) as { error?: string; detail?: string; secret?: string; rate?: number };
          if (over) return;
          if (response.status === 429) { finish('Your Familiar has talked enough for today. It still listens the usual way.', true); return; }
          if (response.status === 503) { finish(undefined, true); return; }
          if (!response.ok) { fallBack(`server ${response.status}, ${body.error ?? 'no reason given'}${body.detail ? ` (${body.detail})` : ''}`); return; }
          if (!body.secret) { fallBack('no client secret from the server'); return; }
          if (typeof body.rate === 'number' && body.rate > 0 && body.rate !== rate) { rate = body.rate; player = createPcmPlayer(audio, rate); }
          if (asking) {
            try {
              stream = await asking;
            } catch (error) {
              finish(`Allow the microphone to talk with your Familiar. (${describeFailure(error)})`);
              return;
            }
            if (over) return;
            if (!await loadMicrophoneCapture(audio)) { finish('Live talk is not available in this browser: it cannot capture the microphone.', true); return; }
            if (over) return;
          }
          // A browser cannot set headers on a WebSocket: the secret rides as a subprotocol, as OpenAI's own SDK sends it.
          const live = new Socket(dependencies.url ?? ELEVENLABS_REALTIME_URL, ['realtime', `openai-insecure-api-key.${body.secret}`]);
          socket = live;
          live.onmessage = ({ data }: MessageEvent<string>) => {
            try { receive(JSON.parse(data) as RealtimeEvent); } catch { /* not an event this reads */ }
          };
          live.onclose = (event: CloseEvent) => {
            if (event.reason) console.warn('[familiar-live] closed:', event.code, event.reason);
            if (opened) finish(`Your Familiar stopped talking.${event.code !== 1000 ? ` (${event.code}${event.reason ? `: ${event.reason}` : ''})` : ''}`);
            else fallBack(`${label} closed the connection, ${event.code}${event.reason ? `: ${event.reason}` : ''}`);
          };
        } catch (error) {
          fallBack(error);
        }
      })();
      return {
        end: cleanup,
        // Typed: a message for the model, which the Familiar then says.
        send: text => {
          if (!opened) return;
          send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
          send({ type: 'response.create' });
        },
      };
    },
  };
}

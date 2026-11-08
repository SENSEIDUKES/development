import type { FrontDeskLive } from '../core/controller';
import { closeDetail, createLiveEngine, type LiveEngineDependencies } from './liveEngine';
import { audioContextClass, openSpeaker } from './liveAudio';

/** ElevenLabs Realtime: OpenAI's Realtime protocol, opened with the client secret the server minted. */
export const ELEVENLABS_REALTIME_URL = 'wss://api.elevenlabs.io/v1/convai/realtime';
/** 16-bit mono at this rate both ways, unless the server says otherwise. */
const DEFAULT_RATE = 24_000;

interface RealtimeEvent {
  type?: string;
  item_id?: string;
  content_index?: number;
  delta?: string;
  transcript?: string;
  item?: { type?: string; call_id?: string; name?: string; arguments?: string };
  error?: { code?: string; message?: string };
}

export interface RealtimeLiveDependencies extends LiveEngineDependencies {
  WebSocket?: typeof WebSocket;
  AudioContext?: typeof AudioContext;
  /** The provider's Realtime WebSocket. */
  url?: string;
  /** The provider's name, for the reader's notes. */
  label?: string;
}

/**
 * The live engine's translator for any provider that speaks OpenAI's
 * Realtime protocol over a WebSocket (ElevenLabs Realtime): the server mints
 * a client secret locked to the Familiar's session (`/api/familiar-live`),
 * then the browser streams the microphone and plays the Familiar's voice
 * until the reader hangs up. Nothing is recorded or kept.
 */
export function createRealtimeLive(dependencies: RealtimeLiveDependencies = {}): FrontDeskLive {
  const label = dependencies.label ?? 'ElevenLabs';
  const Socket = () => dependencies.WebSocket ?? (globalThis as Partial<typeof globalThis>).WebSocket;
  return createLiveEngine({
    label,
    supported: () => Boolean(audioContextClass(dependencies.AudioContext) && Socket()),
    begin(conversation) {
      // Made during the reader's tap, so a phone lets it play.
      const speaker = openSpeaker(audioContextClass(dependencies.AudioContext)!, DEFAULT_RATE);
      let rate = DEFAULT_RATE;
      let socket: WebSocket | undefined;
      let stream: MediaStream | undefined;
      let readerHeardThisTurn = false;
      const answered = new Set<string>();
      /** The Familiar's reply being played: its item, and when its audio starts and ends on the audio clock. */
      let speaking: { itemId: string; contentIndex: number; start: number; end: number } | undefined;
      /** Replies the reader spoke over: audio still in flight for them is never played. */
      const cutOff = new Set<string>();
      const send = (message: unknown) => { if (!conversation.over && socket?.readyState === 1) socket.send(JSON.stringify(message)); };
      /**
       * The reader spoke over the Familiar: its voice stops, and the model is
       * told how much of the reply was heard, so it never assumes the rest was.
       */
      const interrupted = () => {
        const reply = speaking;
        speaking = undefined;
        if (reply) cutOff.add(reply.itemId);
        speaker.player.stop();
        if (!reply || speaker.audio.currentTime >= reply.end) return;
        const heardMs = Math.max(0, Math.floor((speaker.audio.currentTime - reply.start) * 1_000));
        send({ type: 'conversation.item.truncate', item_id: reply.itemId, content_index: reply.contentIndex, audio_end_ms: heardMs });
      };
      /** A function the model called: run on the screen, its result returned, the model continued. */
      const answer = async (item: NonNullable<RealtimeEvent['item']>) => {
        if (!item.call_id || answered.has(item.call_id)) return;
        answered.add(item.call_id);
        const result = await conversation.call(item.name, item.arguments);
        send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ result }) } });
        send({ type: 'response.create' });
      };
      const receive = (event: RealtimeEvent) => {
        switch (event.type) {
          case 'session.created':
            if (conversation.open) return;
            if (stream) speaker.listen(stream, rate, data => send({ type: 'input_audio_buffer.append', audio: data }));
            conversation.opened();
            return;
          case 'input_audio_buffer.speech_started':
            interrupted();
            readerHeardThisTurn = false;
            return;
          case 'conversation.item.input_audio_transcription.delta':
            if (event.delta) { readerHeardThisTurn = true; conversation.caption('reader', event.delta); }
            return;
          case 'conversation.item.input_audio_transcription.completed':
            if (event.transcript && !readerHeardThisTurn) conversation.caption('reader', event.transcript, true);
            readerHeardThisTurn = false;
            return;
          case 'response.output_audio.delta': {
            if (!event.delta || (event.item_id && cutOff.has(event.item_id))) return;
            const piece = speaker.player.play(event.delta);
            if (!piece || !event.item_id) return;
            if (speaking?.itemId === event.item_id) speaking.end = piece.at + piece.duration;
            else speaking = { itemId: event.item_id, contentIndex: event.content_index ?? 0, start: piece.at, end: piece.at + piece.duration };
            return;
          }
          case 'response.output_audio_transcript.delta':
            if (event.delta) conversation.caption('familiar', event.delta);
            return;
          case 'response.output_item.done':
            if (event.item?.type === 'function_call') void answer(event.item);
            return;
          case 'error':
            conversation.error(`${event.error?.code ? `${event.error.code}: ` : ''}${event.error?.message ?? 'unknown error'}`);
            return;
        }
      };
      return {
        async connect() {
          const body = await conversation.request();
          if (!body) return;
          if (typeof body.secret !== 'string' || !body.secret) { conversation.fallBack('no client secret from the server'); return; }
          if (typeof body.rate === 'number' && body.rate > 0) { rate = body.rate; speaker.setRate(rate); }
          stream = await conversation.stream();
          if (conversation.over) return;
          if (stream && !await speaker.ready()) { conversation.finish('Live talk is not available in this browser: it cannot capture the microphone.', true); return; }
          if (conversation.over) return;
          const Live = Socket()!;
          // A browser cannot set headers on a WebSocket: the secret rides as a subprotocol, as OpenAI's own SDK sends it.
          const live = new Live(dependencies.url ?? ELEVENLABS_REALTIME_URL, ['realtime', `openai-insecure-api-key.${body.secret}`]);
          socket = live;
          live.onmessage = ({ data }: MessageEvent<string>) => {
            try { receive(JSON.parse(data) as RealtimeEvent); } catch { /* not an event this reads */ }
          };
          live.onclose = (event: CloseEvent) => {
            if (event.reason) console.warn('[familiar-live] closed:', event.code, event.reason);
            conversation.lost(closeDetail(event), `${label} closed the connection, ${event.code}${event.reason ? `: ${event.reason}` : ''}`);
          };
        },
        // Typed: a message for the model, which the Familiar then says.
        send: text => {
          send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
          send({ type: 'response.create' });
        },
        close() {
          speaker.close();
          if (socket && socket.readyState <= 1) socket.close(1000);
        },
      };
    },
  }, dependencies);
}

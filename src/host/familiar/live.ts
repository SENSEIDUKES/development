import type { FamiliarLive } from '@seihouse/library/familiar';
import { closeDetail, createLiveEngine, type LiveEngineDependencies } from './liveEngine';
import { audioContextClass, openSpeaker } from './liveAudio';

export { base64ToFloat32, downsample, pcm16ToBase64 } from './liveAudio';
export { describeFailure, liveCall } from './liveEngine';

/** Gemini Live, opened with the single-use token the server minted. */
const LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
/** Gemini hears 16 kHz and speaks 24 kHz, 16-bit mono. */
const INPUT_RATE = 16_000;
const OUTPUT_RATE = 24_000;

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

export interface FamiliarLiveDependencies extends LiveEngineDependencies {
  WebSocket?: typeof WebSocket;
  AudioContext?: typeof AudioContext;
}

/**
 * The Familiar's live talk on Gemini Live: the server mints a locked,
 * single-use token for this page (`/api/familiar-live`), then the browser
 * streams the microphone and plays the Familiar's voice until the reader
 * hangs up. Nothing is recorded or kept. Gemini's translator for the live
 * engine (`liveEngine.ts`).
 */
export function createFamiliarGeminiLive(dependencies: FamiliarLiveDependencies = {}): FamiliarLive {
  const Socket = () => dependencies.WebSocket ?? (globalThis as Partial<typeof globalThis>).WebSocket;
  return createLiveEngine({
    label: 'Gemini',
    supported: () => Boolean(audioContextClass(dependencies.AudioContext) && Socket()),
    begin(conversation) {
      // Made during the reader's tap, so a phone lets it play.
      const speaker = openSpeaker(audioContextClass(dependencies.AudioContext)!, OUTPUT_RATE);
      let socket: WebSocket | undefined;
      let stream: MediaStream | undefined;
      const send = (message: unknown) => { if (!conversation.over && socket?.readyState === 1) socket.send(JSON.stringify(message)); };
      const answer = async (calls: NonNullable<LiveMessage['toolCall']>['functionCalls'] = []) => {
        for (const { id, name, args } of calls) {
          const result = await conversation.call(name, args);
          send({ toolResponse: { functionResponses: [{ id, name, response: { result } }] } });
        }
      };
      const receive = (message: LiveMessage) => {
        if (message.setupComplete && !conversation.open) {
          if (stream) speaker.listen(stream, INPUT_RATE, data => send({ realtimeInput: { audio: { data, mimeType: `audio/pcm;rate=${INPUT_RATE}` } } }));
          conversation.opened();
        }
        const content = message.serverContent;
        if (content) {
          if (content.interrupted) speaker.player.stop();
          for (const part of content.modelTurn?.parts ?? []) {
            if (part.inlineData?.data && (part.inlineData.mimeType ?? 'audio/pcm').startsWith('audio/')) speaker.player.play(part.inlineData.data);
          }
          if (content.inputTranscription?.text) conversation.caption('reader', content.inputTranscription.text);
          if (content.outputTranscription?.text) conversation.caption('familiar', content.outputTranscription.text);
          if (content.turnComplete || content.interrupted) conversation.turnOver();
        }
        if (message.toolCall) void answer(message.toolCall.functionCalls);
      };
      return {
        async connect() {
          const body = await conversation.request();
          if (!body) return;
          const { token, setup } = body as { token?: string; setup?: unknown };
          if (!token || !setup) { conversation.fallBack('no token'); return; }
          stream = await conversation.stream();
          if (conversation.over) return;
          if (stream && !await speaker.ready()) { conversation.finish('Live talk is not available in this browser: it cannot capture the microphone.', true); return; }
          if (conversation.over) return;
          const Live = Socket()!;
          const live = new Live(`${LIVE_URL}?access_token=${encodeURIComponent(token)}`);
          socket = live;
          live.binaryType = 'arraybuffer';
          live.onopen = () => send({ setup });
          live.onmessage = ({ data }: MessageEvent<string | ArrayBuffer>) => {
            try { receive(JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)) as LiveMessage); } catch { /* not a message this reads */ }
          };
          live.onclose = (event: CloseEvent) => {
            if (event.reason) console.warn('[familiar-live] closed:', event.code, event.reason);
            conversation.lost(closeDetail(event), `Gemini closed the connection, ${event.code}${event.reason ? `: ${event.reason}` : ''}`);
          };
        },
        send: text => send({ realtimeInput: { text } }),
        close() {
          speaker.close();
          if (socket && socket.readyState <= 1) socket.close(1000);
        },
      };
    },
  }, dependencies);
}

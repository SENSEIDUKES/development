import type { FrontDeskLive } from '../core/controller';
import { createLiveEngine, describeFailure, type LiveEngineDependencies } from './liveEngine';

/** OpenAI's name for the events channel. */
const EVENTS_CHANNEL = 'oai-events';
/** Gathering the connection's routes, the server and OpenAI together get this long. */
const CONNECT_MS = 25_000;
const GATHER_MS = 10_000;
/** After the reader hangs up, OpenAI's final event is awaited this long before closing anyway. */
const CLOSE_MS = 3_000;

interface LiveEvent {
  type?: string;
  delta?: string;
  reason?: string;
  error?: { code?: string; message?: string };
  event?: { type?: string; item?: { type?: string; call_id?: string; name?: string; arguments?: string } };
}

export interface OpenAiLiveDependencies extends LiveEngineDependencies {
  RTCPeerConnection?: typeof RTCPeerConnection;
  /** Where the Familiar's voice plays. */
  createAudio?: () => HTMLAudioElement;
}

/**
 * The live engine's translator for OpenAI GPT-Live, over WebRTC: the phone
 * itself captures the microphone and plays the voice, and a data channel
 * carries captions and the Familiar's function calls. The server exchanges
 * the connection offer with OpenAI (`/api/familiar-live`), keeping the key.
 * Nothing is recorded or kept.
 */
export function createOpenAiLive(dependencies: OpenAiLiveDependencies = {}): FrontDeskLive {
  const Peer = () => dependencies.RTCPeerConnection ?? (globalThis as Partial<typeof globalThis>).RTCPeerConnection;
  return createLiveEngine({
    label: 'OpenAI',
    connectMs: CONNECT_MS,
    supported: () => Boolean(Peer()),
    begin(conversation) {
      // Made during the tap, so a phone lets it play.
      const audio = dependencies.createAudio?.() ?? new Audio();
      audio.autoplay = true;
      audio.setAttribute?.('playsinline', '');
      const Connection = Peer()!;
      const peer = new Connection();
      const channel = peer.createDataChannel(EVENTS_CHANNEL);
      let closing: ReturnType<typeof setTimeout> | undefined;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(closing);
        try { channel.close(); } catch { /* already closed */ }
        try { peer.close(); } catch { /* already closed */ }
        audio.srcObject = null;
      };
      const send = (message: unknown) => { if (!conversation.over && channel.readyState === 'open') channel.send(JSON.stringify(message)); };
      /** A function the backend called: run on the screen, its result returned, the backend continued. */
      const answer = async (item: NonNullable<NonNullable<LiveEvent['event']>['item']>) => {
        const result = await conversation.call(item.name, item.arguments);
        send({ type: 'response.item.create', item: { type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ result }) } });
        send({ type: 'response.create' });
      };
      const receive = (event: LiveEvent) => {
        switch (event.type) {
          case 'session.started':
            conversation.opened();
            return;
          case 'session.input_transcript.delta':
            if (event.delta) conversation.caption('reader', event.delta);
            return;
          case 'session.output_transcript.delta':
            if (event.delta) conversation.caption('familiar', event.delta);
            return;
          case 'response.event':
            if (event.event?.type === 'response.output_item.done' && event.event.item?.type === 'function_call') void answer(event.event.item);
            return;
          case 'error':
            conversation.error(`${event.error?.code ? `${event.error.code}: ` : ''}${event.error?.message ?? 'unknown error'}`);
            return;
          case 'session.closed':
            // After a hang-up the conversation is already over; this is OpenAI's goodbye.
            if (conversation.over) { close(); return; }
            conversation.finish(event.reason && event.reason !== 'close_requested' ? `Your Familiar stopped talking. (${event.reason})` : undefined);
            return;
        }
      };
      channel.addEventListener('message', ({ data }: MessageEvent<string>) => {
        try { receive(JSON.parse(data) as LiveEvent); } catch { /* not an event this reads */ }
      });
      channel.addEventListener('close', () => {
        if (conversation.over) { close(); return; }
        conversation.lost('connection lost', 'the connection closed before it started');
      });
      peer.addEventListener('track', ({ track }: RTCTrackEvent) => {
        audio.srcObject = new MediaStream([track]);
        audio.play().catch(error => conversation.notice(`Your phone did not play your Familiar's voice: ${describeFailure(error)}`));
      });
      peer.addEventListener('connectionstatechange', () => {
        if (peer.connectionState === 'failed') conversation.lost('connection failed', 'the connection failed');
      });
      return {
        async connect() {
          const stream = await conversation.stream();
          if (conversation.over) return;
          if (stream) for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);
          // Typed only: the Familiar's voice comes in, nothing goes out.
          else peer.addTransceiver('audio', { direction: 'recvonly' });
          await peer.setLocalDescription(await peer.createOffer());
          await new Promise<void>(resolve => {
            if (peer.iceGatheringState === 'complete') { resolve(); return; }
            const done = () => { if (peer.iceGatheringState === 'complete') { clearTimeout(timeout); resolve(); } };
            const timeout = setTimeout(resolve, GATHER_MS);
            peer.addEventListener('icegatheringstatechange', done);
          });
          if (conversation.over) return;
          const body = await conversation.request({ sdp: peer.localDescription?.sdp });
          if (!body) return;
          const transport = body.transport as { sdp?: string } | undefined;
          if (!transport?.sdp) { conversation.fallBack('no connection answer from the server'); return; }
          await peer.setRemoteDescription({ type: 'answer', sdp: transport.sdp });
        },
        // Typed: a message for the backend, which the Familiar then says.
        send: text => {
          send({ type: 'response.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
          send({ type: 'response.create' });
        },
        close,
        // Hanging up: OpenAI finishes the conversation, then this end closes.
        hangUp() {
          if (channel.readyState !== 'open') return false;
          channel.send(JSON.stringify({ type: 'session.close' }));
          audio.srcObject = null;
          closing = setTimeout(close, CLOSE_MS);
          return true;
        },
      };
    },
  }, dependencies);
}

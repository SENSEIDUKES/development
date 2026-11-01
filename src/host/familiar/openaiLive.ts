import type { FamiliarLive } from '@seihouse/library/familiar';
import { createSavedAccessToken } from '../generation/accessToken';
import { describeFailure, liveCall } from './live';

const ENDPOINT = '/api/familiar-live';
/** OpenAI's name for the events channel. */
const EVENTS_CHANNEL = 'oai-events';
/** The server stops a conversation after ten minutes; this end does too. */
const SESSION_MS = 10 * 60 * 1_000;
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

export interface FamiliarOpenAiLiveDependencies {
  fetch?: typeof fetch;
  RTCPeerConnection?: typeof RTCPeerConnection;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  /** Where the Familiar's voice plays. */
  createAudio?: () => HTMLAudioElement;
  accessToken?: () => string | undefined;
  /** The reader's Router choice of live model; the server runs it when it can. */
  model?: string;
}

/**
 * The Familiar's live talk on OpenAI GPT-Live, over WebRTC: the phone itself
 * captures the microphone and plays the voice, and a data channel carries
 * captions and the Familiar's function calls. The server exchanges the
 * connection offer with OpenAI (`/api/familiar-live`), keeping the key.
 * Nothing is recorded or kept.
 */
export function createFamiliarOpenAiLive(dependencies: FamiliarOpenAiLiveDependencies = {}): FamiliarLive {
  const saved = createSavedAccessToken();
  return {
    start(brief, events, options = {}) {
      const microphone = options.microphone !== false;
      const scope = globalThis as Partial<typeof globalThis>;
      const Peer = dependencies.RTCPeerConnection ?? scope.RTCPeerConnection;
      const devices = scope.navigator?.mediaDevices;
      const getUserMedia = dependencies.getUserMedia ?? (devices?.getUserMedia ? (constraints: MediaStreamConstraints) => devices.getUserMedia(constraints) : undefined);
      let over = false;
      if (!Peer || (microphone && !getUserMedia)) {
        queueMicrotask(() => { if (!over) events.ended('Live talk is not available in this browser.', true); });
        return { end() { over = true; }, send() {} };
      }
      // Asked for during the tap: a phone may refuse a microphone asked for later.
      let stream: MediaStream | undefined;
      let asking: Promise<MediaStream> | undefined;
      if (microphone) {
        try { asking = getUserMedia!({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
        catch (error) { asking = Promise.reject(error); }
        asking.then(given => { stream = given; if (over) given.getTracks().forEach(track => track.stop()); }, () => {});
      }
      // Made during the tap too, so a phone lets it play.
      const audio = dependencies.createAudio?.() ?? new Audio();
      audio.autoplay = true;
      audio.setAttribute?.('playsinline', '');
      const peer = new Peer();
      const channel = peer.createDataChannel(EVENTS_CHANNEL);
      let opened = false;
      let closing: ReturnType<typeof setTimeout> | undefined;
      let reader = '';
      let familiar = '';
      let lastSpeaker: 'reader' | 'familiar' | undefined;
      const cleanup = () => {
        over = true;
        clearTimeout(limit);
        clearTimeout(connecting);
        clearTimeout(closing);
        stream?.getTracks().forEach(track => track.stop());
        try { channel.close(); } catch { /* already closed */ }
        try { peer.close(); } catch { /* already closed */ }
        audio.srcObject = null;
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
      const connecting = setTimeout(() => { if (!opened) fallBack('no answer from OpenAI in 25 seconds'); }, CONNECT_MS);
      const send = (message: unknown) => { if (!over && channel.readyState === 'open') channel.send(JSON.stringify(message)); };
      // Full duplex: a turn has no end event, so the reader speaking after the Familiar starts new lines.
      const caption = (speaker: 'reader' | 'familiar', text: string) => {
        if (speaker === 'reader' && lastSpeaker === 'familiar') {
          reader = '';
          familiar = '';
          events.caption('reader', '');
          events.caption('familiar', '');
        }
        lastSpeaker = speaker;
        if (speaker === 'reader') events.caption('reader', reader += text);
        else events.caption('familiar', familiar += text);
      };
      /** A function the backend called: run on the screen, its result returned, the backend continued. */
      const answer = async (item: NonNullable<NonNullable<LiveEvent['event']>['item']>) => {
        let args: unknown = {};
        try { args = JSON.parse(item.arguments || '{}'); } catch { /* answered as unavailable */ }
        const call = liveCall(item.name, args);
        let result = 'That request is not available.';
        try { if (call) result = await events.call(call); } catch { result = 'That did not work.'; }
        send({ type: 'response.item.create', item: { type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ result }) } });
        send({ type: 'response.create' });
      };
      const receive = (event: LiveEvent) => {
        switch (event.type) {
          case 'session.started':
            if (opened) return;
            opened = true;
            clearTimeout(connecting);
            events.connected();
            return;
          case 'session.input_transcript.delta':
            if (event.delta) caption('reader', event.delta);
            return;
          case 'session.output_transcript.delta':
            if (event.delta) caption('familiar', event.delta);
            return;
          case 'response.event':
            if (event.event?.type === 'response.output_item.done' && event.event.item?.type === 'function_call') void answer(event.event.item);
            return;
          case 'error': {
            const why = `${event.error?.code ? `${event.error.code}: ` : ''}${event.error?.message ?? 'unknown error'}`;
            if (!opened) fallBack(`OpenAI ${why}`);
            else events.notice?.(`Live talk: ${why}`);
            return;
          }
          case 'session.closed':
            finish(event.reason && event.reason !== 'close_requested' ? `Your Familiar stopped talking. (${event.reason})` : undefined);
            return;
        }
      };
      channel.addEventListener('message', ({ data }: MessageEvent<string>) => {
        try { receive(JSON.parse(data) as LiveEvent); } catch { /* not an event this reads */ }
      });
      channel.addEventListener('close', () => {
        if (opened) finish('Your Familiar stopped talking. (connection lost)');
        else fallBack('the connection closed before it started');
      });
      peer.addEventListener('track', ({ track }: RTCTrackEvent) => {
        audio.srcObject = new MediaStream([track]);
        audio.play().catch(error => events.notice?.(`Your phone did not play your Familiar's voice: ${describeFailure(error)}`));
      });
      peer.addEventListener('connectionstatechange', () => {
        if (peer.connectionState === 'failed') {
          if (opened) finish('Your Familiar stopped talking. (connection failed)');
          else fallBack('the connection failed');
        }
      });
      void (async () => {
        try {
          if (asking) {
            try {
              const given = await asking;
              for (const track of given.getAudioTracks()) peer.addTrack(track, given);
            } catch (error) {
              finish(`Allow the microphone to talk with your Familiar. (${describeFailure(error)})`);
              return;
            }
          } else {
            // Typed only: the Familiar's voice comes in, nothing goes out.
            peer.addTransceiver('audio', { direction: 'recvonly' });
          }
          if (over) return;
          await peer.setLocalDescription(await peer.createOffer());
          await new Promise<void>(resolve => {
            if (peer.iceGatheringState === 'complete') { resolve(); return; }
            const done = () => { if (peer.iceGatheringState === 'complete') { clearTimeout(timeout); resolve(); } };
            const timeout = setTimeout(resolve, GATHER_MS);
            peer.addEventListener('icegatheringstatechange', done);
          });
          if (over) return;
          const token = (dependencies.accessToken ?? (() => saved.current))()?.trim();
          const response = await (dependencies.fetch ?? fetch)(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ brief, sdp: peer.localDescription?.sdp, ...(dependencies.model ? { model: dependencies.model } : {}) }),
          });
          const body = await response.json().catch(() => ({})) as { error?: string; detail?: string; transport?: { sdp?: string } };
          if (over) return;
          if (response.status === 429) { finish('Your Familiar has talked enough for today. It still listens the usual way.', true); return; }
          if (response.status === 503) { finish(undefined, true); return; }
          if (!response.ok) { fallBack(`server ${response.status}, ${body.error ?? 'no reason given'}${body.detail ? ` (${body.detail})` : ''}`); return; }
          if (!body.transport?.sdp) { fallBack('no connection answer from the server'); return; }
          await peer.setRemoteDescription({ type: 'answer', sdp: body.transport.sdp });
        } catch (error) {
          fallBack(error);
        }
      })();
      return {
        // Hanging up: OpenAI finishes the conversation, then this end closes.
        end: () => {
          if (over) return;
          if (!opened || channel.readyState !== 'open') { cleanup(); return; }
          over = true;
          channel.send(JSON.stringify({ type: 'session.close' }));
          stream?.getTracks().forEach(track => track.stop());
          audio.srcObject = null;
          closing = setTimeout(cleanup, CLOSE_MS);
        },
        // Typed: a message for the backend, which the Familiar then says.
        send: text => {
          if (!opened) return;
          send({ type: 'response.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
          send({ type: 'response.create' });
        },
      };
    },
  };
}

import type { FamiliarLive, FamiliarLiveBrief, FamiliarLiveCall } from '@seihouse/library/familiar';
import { createSavedAccessToken } from '../generation/accessToken';
import { openMicrophoneSession } from './audioSession';

/**
 * The Familiar's live talk engine: one engine for every live model, each
 * provider plugged in as a small translator.
 *
 * The engine does everything a conversation needs the same way on every
 * model: asking for the microphone during the reader's tap (a phone refuses
 * it later), the phone's audio mode, the server request that keeps the
 * provider's key, the ten-minute limit and the connection deadline, captions,
 * the Familiar's functions on the screen, hanging up, and saying exactly why
 * a talk could not start (the device voice then listens instead).
 *
 * A translator only speaks its provider's language: how to connect, how to
 * read its events, how to send a typed message. Adding a model is a new
 * translator, never a new copy of the engine.
 */

const ENDPOINT = '/api/familiar-live';
/** The server's credential stops working after ten minutes; the conversation ends then too. */
const SESSION_MS = 10 * 60 * 1_000;
/** A conversation that has not opened by then is given up. */
const CONNECT_MS = 15_000;

/** A tool call from the model, read strictly into what the screen understands. */
export function liveCall(name: unknown, args: unknown): FamiliarLiveCall | undefined {
  const value = args && typeof args === 'object' ? args as Record<string, unknown> : {};
  if (name === 'look_up' && typeof value.query === 'string') return { name, query: value.query, ...(value.spoilers === true ? { spoilers: true as const } : {}) };
  if (name === 'show_topic' && typeof value.topic_id === 'string') return { name, topicId: value.topic_id };
  if (name === 'propose_action' && typeof value.action_id === 'string') return { name, actionId: value.action_id, input: typeof value.input === 'string' ? value.input : '' };
  if (name === 'answer_proposal' && (value.answer === 'confirm' || value.answer === 'cancel' || value.answer === 'hear')) return { name, answer: value.answer };
  return undefined;
}

/** What went wrong, in the words the phone or the server gave, short enough for a note. */
export function describeFailure(why: unknown): string {
  // A phone's microphone refusal is a DOMException, an Error in some browsers and not in others.
  const error = why && typeof why === 'object' && 'message' in why ? why as { name?: unknown; message?: unknown } : undefined;
  const name = typeof error?.name === 'string' && error.name !== 'Error' ? error.name : '';
  const text = error
    ? (name ? `${name}: ${String(error.message)}` : String(error.message))
    : typeof why === 'string' ? why : JSON.stringify(why);
  return (text || 'unknown').slice(0, 200);
}

/** What every translator's factory accepts. */
export interface LiveEngineDependencies {
  fetch?: typeof fetch;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  /** The owner's Development token lifts the visitor's daily count. */
  accessToken?: () => string | undefined;
  /** The reader's Router choice of live model; the server runs it when it can. */
  model?: string;
}

/** What the engine hands a translator for one conversation. */
export interface LiveConversation {
  readonly brief: FamiliarLiveBrief;
  /** False when the reader only types: the microphone is never asked for. */
  readonly microphone: boolean;
  /** The conversation is over (hung up, failed or timed out): stop work. */
  readonly over: boolean;
  /** The provider confirmed the conversation is open. */
  readonly open: boolean;
  /**
   * Asks the server to start the conversation, with whatever this provider
   * needs besides the brief. Undefined when the talk ended instead (refused,
   * spent for today, or no live talk on this server): the engine has said why.
   */
  request(extra?: Record<string, unknown>): Promise<Record<string, unknown> | undefined>;
  /**
   * The reader's microphone, once given. Undefined when typed only, or when
   * the reader refused it (then the talk has ended: check `over`).
   */
  stream(): Promise<MediaStream | undefined>;
  /** The provider confirmed the conversation: the reader hears it is live. */
  opened(): void;
  /** A caption piece; `whole` replaces the reader's line instead of adding to it. */
  caption(speaker: 'reader' | 'familiar', text: string, whole?: boolean): void;
  /** The turn ended: the next caption starts new lines. */
  turnOver(): void;
  /** Runs a function the model called on the screen; its result for the model. */
  call(name: unknown, args: unknown): Promise<string>;
  /** The provider reported an error: before the talk opens it cannot start; after, a note. */
  error(why: string): void;
  /** The connection ended by itself. `detail` says how; `before` is the reason when it never opened. */
  lost(detail: string | undefined, before: string): void;
  /** Live talk could not start: the device voice listens instead. */
  fallBack(why: unknown): void;
  /** Ends the conversation, with a note for the reader when there is one. */
  finish(problem?: string, unavailable?: boolean): void;
  notice(text: string): void;
}

/** One provider's side of a conversation. */
export interface LiveTranslatorSession {
  /** Connects, once the engine has started the conversation. */
  connect(): Promise<void>;
  /** A typed message for the model, which the Familiar then says. Sent only while open. */
  send(text: string): void;
  /** Releases everything this provider holds. Called once. */
  close(): void;
  /**
   * The reader hung up: a provider that finishes the conversation itself
   * starts that here and returns true, then calls `close` when done.
   */
  hangUp?(): boolean;
}

export interface LiveTranslator {
  /** The provider's name, for the reader's notes. */
  label: string;
  /** How long it may take to open, when longer than the usual 15 seconds. */
  connectMs?: number;
  /** Whether this browser can run it. */
  supported(): boolean;
  /** Called during the reader's tap, so what a phone only allows then is made then. */
  begin(conversation: LiveConversation): LiveTranslatorSession;
}

const errorText = (body: Record<string, unknown>, fallback: string) =>
  typeof body.error === 'string' && body.error.trim() ? body.error : fallback;

export function createLiveEngine(translator: LiveTranslator, dependencies: LiveEngineDependencies = {}): FamiliarLive {
  const saved = createSavedAccessToken();
  return {
    start(brief, events, options = {}) {
      const microphone = options.microphone !== false;
      const devices = (globalThis as Partial<typeof globalThis>).navigator?.mediaDevices;
      const getUserMedia = dependencies.getUserMedia ?? (devices?.getUserMedia ? (constraints: MediaStreamConstraints) => devices.getUserMedia(constraints) : undefined);
      let over = false;
      if (!translator.supported() || (microphone && !getUserMedia)) {
        queueMicrotask(() => { if (!over) events.ended('Live talk is not available in this browser.', true); });
        return { end() { over = true; }, send() {} };
      }
      let open = false;
      let stream: MediaStream | undefined;
      // Asked for during the tap: a phone may refuse a microphone asked for later.
      let asking: Promise<MediaStream> | undefined;
      // On an iPhone, music's playback-only mode would refuse the microphone.
      const releaseSession = microphone ? openMicrophoneSession() : () => undefined;
      if (microphone) {
        try { asking = getUserMedia!({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); }
        catch (error) { asking = Promise.reject(error); }
        asking.then(given => { stream = given; if (over) given.getTracks().forEach(track => track.stop()); }, () => {});
      }
      let session: LiveTranslatorSession | undefined;
      let closed = false;
      const release = () => {
        clearTimeout(limit);
        clearTimeout(connecting);
        stream?.getTracks().forEach(track => track.stop());
        releaseSession();
      };
      const cleanup = () => {
        over = true;
        release();
        if (!closed) { closed = true; session?.close(); }
      };
      const finish = (problem?: string, unavailable = false) => {
        if (over) return;
        cleanup();
        events.ended(problem, unavailable);
      };
      const fallBack = (why: unknown) => {
        console.warn('[familiar-live] could not start; the device voice listens instead.', why);
        finish(`Live talk could not start: ${describeFailure(why)}`, true);
      };
      const connectMs = translator.connectMs ?? CONNECT_MS;
      const limit = setTimeout(() => finish('Your Familiar talked for ten minutes. Tap to talk again.'), SESSION_MS);
      const connecting = setTimeout(() => { if (!open) fallBack(`no answer from ${translator.label} in ${connectMs / 1_000} seconds`); }, connectMs);

      // Captions. Full duplex: the reader speaking after the Familiar starts new lines, as does a finished turn.
      let reader = '';
      let familiar = '';
      let lastSpeaker: 'reader' | 'familiar' | undefined;
      let turnEnded = false;
      const caption = (speaker: 'reader' | 'familiar', text: string, whole = false) => {
        if (turnEnded || (speaker === 'reader' && lastSpeaker === 'familiar')) {
          turnEnded = false;
          reader = '';
          familiar = '';
          events.caption('reader', '');
          events.caption('familiar', '');
        }
        lastSpeaker = speaker;
        if (speaker === 'reader') events.caption('reader', reader = whole ? text : reader + text);
        else events.caption('familiar', familiar += text);
      };

      const conversation: LiveConversation = {
        brief,
        microphone,
        get over() { return over; },
        get open() { return open; },
        async request(extra = {}) {
          const token = (dependencies.accessToken ?? (() => saved.current))()?.trim();
          const response = await (dependencies.fetch ?? fetch)(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ brief, ...extra, ...(dependencies.model ? { model: dependencies.model } : {}) }),
          });
          const parsed: unknown = await response.json().catch(() => ({}));
          const body = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
          if (over) return undefined;
          if (response.status === 429) { finish('Your Familiar has talked enough for today. It still listens the usual way.', true); return undefined; }
          if (response.status === 503) { finish(undefined, true); return undefined; }
          if (!response.ok) {
            const detail = typeof body.detail === 'string' ? ` (${body.detail})` : '';
            fallBack(`server ${response.status}, ${errorText(body, 'no reason given')}${detail}`);
            return undefined;
          }
          return body;
        },
        async stream() {
          if (!asking) return undefined;
          try {
            stream = await asking;
          } catch (error) {
            finish(`Allow the microphone to talk with your Familiar. (${describeFailure(error)})`);
            return undefined;
          }
          return over ? undefined : stream;
        },
        opened() {
          if (open || over) return;
          open = true;
          clearTimeout(connecting);
          events.connected();
        },
        caption,
        turnOver() { turnEnded = true; },
        async call(name, args) {
          let parsed = args;
          if (typeof args === 'string') { try { parsed = JSON.parse(args || '{}'); } catch { parsed = {}; } }
          const request = liveCall(name, parsed);
          if (!request) return 'That request is not available.';
          try { return await events.call(request); } catch { return 'That did not work.'; }
        },
        error(why) {
          if (!open) fallBack(`${translator.label} ${why}`);
          else events.notice?.(`Live talk: ${why}`);
        },
        lost(detail, before) {
          if (open) finish(`Your Familiar stopped talking.${detail ? ` (${detail})` : ''}`);
          else fallBack(before);
        },
        fallBack,
        finish,
        notice: text => events.notice?.(text),
      };

      session = translator.begin(conversation);
      void session.connect().catch(fallBack);
      return {
        end: () => {
          if (over) return;
          if (open && session?.hangUp?.()) {
            // The provider finishes the conversation itself, then closes.
            over = true;
            release();
            return;
          }
          cleanup();
        },
        send: text => { if (open && !over) session?.send(text); },
      };
    },
  };
}

/** How a WebSocket provider's close reads in the reader's note. */
export const closeDetail = (event: CloseEvent): string | undefined =>
  event.code !== 1000 ? `${event.code}${event.reason ? `: ${event.reason}` : ''}` : undefined;

import type { ComponentType } from 'react';

/** A choice's picture in the Familiar's panel, so it reads at a glance. */
export type FamiliarIcon = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;

/** A screen supplies actions; the Familiar never owns a second copy of its data. */
export interface FamiliarHelperAction {
  id: string;
  label: string;
  icon?: FamiliarIcon;
  /** One short line under the label: what this choice would do. */
  detail?: string;
  phrases: readonly string[];
  input?: { label: string; maxLength: number };
  describe(input: string): string;
  /** Why the input cannot be applied as it stands, as a sentence to show or speak; nothing when it can. */
  check?(input: string): string | undefined;
  /**
   * Fixes what the proposal will apply when it is shown (the words a cue goes
   * on, say), so a change on screen during review cannot move it. Handed to
   * `preview` and `run` with the input.
   */
  prepare?(input: string): unknown;
  /** Plays what the proposal would add, so it can be heard before it is kept. */
  preview?(input: string, prepared?: unknown): void;
  success: string;
  run(input: string, prepared?: unknown): Promise<void>;
}

/** Something the Familiar explains where the reader is: choose or say its name to hear it. */
export interface FamiliarTopic {
  id: string;
  label: string;
  icon?: FamiliarIcon;
  phrases: readonly string[];
  explanation: string;
  /** A recorded reading of the explanation (the System voice); the device voice reads it otherwise. */
  audioUrl?: string;
  /** A short silent clip showing the feature, played in the panel. */
  videoUrl?: string;
}

/** The Familiar's two modes, everywhere: Explain never changes anything; Action confirms before it does. */
export type FamiliarMode = 'explain' | 'action';

/**
 * Where the reader is, and what the Familiar can explain and do there.
 * Change key when the place or its choices change, invalidating any proposal.
 */
export interface FamiliarHelperContext {
  key: string;
  title: string;
  /** Explain mode: what this place explains. */
  topics: readonly FamiliarTopic[];
  /** Action mode: what this place does, and how to ask for it. */
  actions: readonly FamiliarHelperAction[];
  hint: string;
  /** Release only the playback this interaction interrupted. False means do not resume. */
  interrupt?(): (resume: boolean) => void;
}

export interface FamiliarListening { stop(): void; cancel(): void }

/** Device speech is replaceable and independent of the screen's actions. */
export interface FamiliarVoice {
  readonly available: boolean;
  /**
   * Listens until `stop` (deliver what was heard) or `cancel`; a pause never
   * ends it, so the reader finishes speaking before the Familiar answers.
   */
  listen(language: string, result: (text: string) => void, failure: (message: string) => void): FamiliarListening;
  speak(text: string, language: string, done: () => void, failure: (message: string) => void): () => void;
  /** Plays a recorded line; a failure falls back to `speak`. */
  play?(url: string, done: () => void, failure: (message: string) => void): () => void;
}

/**
 * What a live conversation is told when it starts: who the Familiar is, where
 * the reader is, and what it can explain and do there. Its facts are the
 * place's own topics, so it never says what the help menu would not.
 */
export interface FamiliarLiveBrief {
  familiar: { name: string; description: string };
  place: string;
  language: string;
  topics: { id: string; label: string; explanation: string }[];
  actions: { id: string; label: string; detail?: string; input?: { label: string; maxLength: number } }[];
}

/** What the Familiar asks the screen for mid-conversation; the screen still confirms every change. */
export type FamiliarLiveCall =
  | { name: 'show_topic'; topicId: string }
  | { name: 'propose_action'; actionId: string; input: string }
  | { name: 'answer_proposal'; answer: 'confirm' | 'cancel' | 'hear' };

export interface FamiliarLiveEvents {
  connected(): void;
  /** The words of the current turn so far, as captions. */
  caption(speaker: 'reader' | 'familiar', text: string): void;
  /** Answered with a sentence the Familiar hears back. */
  call(call: FamiliarLiveCall): Promise<string>;
  /** `unavailable`: live talk cannot start here, so the device voice listens instead. */
  ended(problem?: string, unavailable?: boolean): void;
}

/** One live conversation: ended by the reader, or sent a typed message. */
export interface FamiliarLiveSession {
  end(): void;
  /** A typed message, answered like speech. Only once the conversation is connected. */
  send(text: string): void;
}

/** Live talk: the Familiar hears and answers in its own voice until the reader hangs up. Replaceable, like `FamiliarVoice`. */
export interface FamiliarLive {
  start(brief: FamiliarLiveBrief, events: FamiliarLiveEvents): FamiliarLiveSession;
}

export interface FamiliarHelperState {
  open: boolean;
  mode: FamiliarMode;
  phase: 'ready' | 'listening' | 'speaking' | 'review' | 'saving';
  context?: FamiliarHelperContext;
  /** The topic Explain is showing. */
  topicId?: string;
  proposal?: { actionId: string; input: string; summary: string; contextKey: string; prepared?: unknown };
  message: string;
  /** A live conversation under way: connecting, then on. */
  live?: { status: 'connecting' | 'on' };
  /** What was said with the Familiar this visit, oldest first, so the reader can read it back. Never saved. */
  chat: readonly FamiliarChatLine[];
  /** Typed while a conversation was connecting that never reached it: handed back to the reader to send again. */
  unsent?: string;
}

/** One line of the conversation: what the reader said, what the Familiar said, or what it did on screen. */
export interface FamiliarChatLine { speaker: 'reader' | 'familiar' | 'note'; text: string }

/** The conversation keeps this many lines; older ones drop off. */
const CHAT_LINES = 200;

const normalize = (text: string) => text.trim().toLocaleLowerCase('en-US').replace(/[.!?]+$/, '').trim();
const HEAR = new Set(['hear it', 'hear', 'play it', 'play', 'preview']);
const MODE_WORDS: Record<string, FamiliarMode> = { explain: 'explain', action: 'action', actions: 'action' };
const NOTHING: Record<FamiliarMode, string> = { explain: 'Nothing to explain here yet.', action: 'Nothing to do here yet.' };
/** How long a previewed sound plays before the microphone opens again. */
const PREVIEW_MS = 2_500;

/** Exact preset names, or a named input followed by its verbatim text. No intent inference. */
export function matchFamiliarCommand(actions: readonly FamiliarHelperAction[], text: string) {
  for (const action of actions) {
    for (const phrase of action.phrases) {
      if (!action.input && normalize(text) === normalize(phrase)) return { actionId: action.id, input: '' };
      if (action.input) {
        const trimmed = text.trim();
        const prefix = trimmed.slice(0, phrase.length);
        if (normalize(prefix) !== normalize(phrase)) continue;
        const rest = trimmed.slice(phrase.length);
        if (rest && !/^[\s:,.—-]/.test(rest)) continue;
        return { actionId: action.id, input: rest.replace(/^[\s:,.—-]+/, '').trim() };
      }
    }
  }
  return undefined;
}

/** Where a place registers: a page, or the app's own place under every page that registers none. */
export type FamiliarPlaceLevel = 'page' | 'base';
interface FamiliarPlace { owner: symbol; context: FamiliarHelperContext }

/** One short, cancellable interaction. Screens provide actions; adapters provide speech. */
export class FamiliarHelperController {
  private state: FamiliarHelperState = { open: false, mode: 'action', phase: 'ready', message: '', chat: [] };
  private listeners = new Set<() => void>();
  private places: Partial<Record<FamiliarPlaceLevel, FamiliarPlace>> = {};
  private get place() { return this.places.page ?? this.places.base; }
  private get context() { return this.place?.context; }
  private cancelVoice?: () => void;
  private listening?: FamiliarListening;
  private releasePlayback?: (resume: boolean) => void;
  private epoch = 0;
  private spoken = false;
  /** The live conversation under way, if any; its events count only while it is the current one. */
  private liveRun?: object;
  private liveSession?: FamiliarLiveSession;
  /** Typed while the conversation connects; sent once it is on. */
  private typedAhead: string[] = [];
  private identity = { name: 'Familiar', description: '' };
  /** The chat line each side is still saying in this turn. */
  private openTurn: Partial<Record<'reader' | 'familiar', number>> = {};

  constructor(readonly voice: FamiliarVoice, readonly language = 'en-US', readonly live?: FamiliarLive) {}
  /** Who the Familiar is, for live talk: the reader's equipped Familiar. */
  setIdentity(identity: { name: string; description: string }) { this.identity = identity; }
  /** The equipped Familiar's name, for the conversation. */
  get name() { return this.identity.name; }
  private addLine(line: FamiliarChatLine) {
    const chat = [...this.state.chat, line];
    const dropped = Math.max(0, chat.length - CHAT_LINES);
    for (const speaker of ['reader', 'familiar'] as const) {
      const index = this.openTurn[speaker];
      if (index !== undefined) this.openTurn[speaker] = index - dropped >= 0 ? index - dropped : undefined;
    }
    this.update({ chat: dropped ? chat.slice(dropped) : chat });
    return chat.length - 1 - dropped;
  }
  /** A side's words so far this turn; empty when its turn is over, so the next words start a new line. */
  private caption(speaker: 'reader' | 'familiar', text: string) {
    const index = this.openTurn[speaker];
    if (!text) { delete this.openTurn[speaker]; return; }
    if (index === undefined) { this.openTurn[speaker] = this.addLine({ speaker, text }); return; }
    this.update({ chat: this.state.chat.map((line, at) => at === index ? { speaker, text } : line) });
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<FamiliarHelperState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private silence() {
    this.epoch++;
    this.listening = undefined;
    const cancel = this.cancelVoice;
    this.cancelVoice = undefined;
    cancel?.();
  }
  private release(resume: boolean) {
    const release = this.releasePlayback;
    this.releasePlayback = undefined;
    release?.(resume);
  }
  /** Registration is scoped to the mounted screen, including when no helper UI is open. A page's place covers the app's. */
  setContext(owner: symbol, context: FamiliarHelperContext, level: FamiliarPlaceLevel = 'page') {
    const before = this.place;
    this.places[level] = { owner, context };
    this.moved(before);
  }
  clearContext(owner: symbol) {
    const before = this.place;
    for (const level of ['page', 'base'] as const) if (this.places[level]?.owner === owner) delete this.places[level];
    this.moved(before);
  }
  /** Moving to another place, or its choices changing, ends whatever was under way in the old one. */
  private moved(before?: FamiliarPlace) {
    const after = this.place;
    if (before?.owner === after?.owner && before?.context.key === after?.context.key) return;
    // A conversation knows the page it began on; the same page with new choices keeps it going.
    if (before?.owner !== after?.owner) this.hangUp();
    this.silence();
    this.release(false);
    this.update({ context: after?.context, proposal: undefined, topicId: undefined, phase: 'ready', message: this.state.open ? this.empty() : '' });
  }
  /** What a mode shows where it has nothing yet; empty where it has choices, which speak for themselves. */
  private empty(mode = this.state.mode) {
    const has = mode === 'action' ? this.context?.actions.length : this.context?.topics.length;
    return has ? '' : NOTHING[mode];
  }
  /** What to say in the current mode, here: the place's hint, its topics, or that it has none yet. */
  private hint(mode = this.state.mode) {
    if (mode === 'action') return this.context?.actions.length ? this.context.hint : NOTHING.action;
    const topics = this.context?.topics ?? [];
    return topics.length ? `Say ${topics.map(topic => topic.label).join(', ')}.` : NOTHING.explain;
  }
  /** Switches between Explain and Action, by touch or by saying the mode's name. */
  setMode = (mode: FamiliarMode) => {
    if (this.state.phase === 'saving') return;
    this.silence();
    this.update({ mode, proposal: undefined, topicId: undefined });
    // A voice session hears what it can say; on screen, the choices speak for themselves.
    if (this.spoken) this.respond(this.hint(mode), 'ready');
    else this.update({ phase: 'ready', message: this.empty(mode) });
  };
  /**
   * Explains a topic: shown in the panel and read aloud, in its recorded
   * voice where it has one (the device voice otherwise, or if the recording
   * cannot play). Explaining changes nothing, so there is nothing to confirm.
   */
  explain = (topicId: string) => {
    const topic = this.context?.topics.find(entry => entry.id === topicId);
    if (!topic || this.state.phase === 'saving') return;
    // In a live conversation the Familiar speaks for itself: the topic is only shown.
    if (this.liveRun) { this.update({ topicId, message: '' }); return; }
    this.silence();
    this.interrupt();
    this.update({ topicId, phase: 'speaking', message: '' });
    const epoch = this.epoch;
    const done = () => {
      if (epoch !== this.epoch) return;
      this.update({ phase: 'ready' });
      if (this.spoken) this.listen();
    };
    // One handle stops whichever voice is reading: the recording, or the device voice that took over from it.
    let stop: () => void = () => {};
    let readAloud = false;
    this.cancelVoice = () => stop();
    const speak = () => {
      readAloud = true;
      stop = this.voice.speak(topic.explanation, this.language, done, () => { if (epoch === this.epoch) this.update({ phase: 'ready' }); });
      if (epoch !== this.epoch) stop();
    };
    if (!topic.audioUrl || !this.voice.play) { speak(); return; }
    const cancelLine = this.voice.play(topic.audioUrl, done, () => { if (epoch === this.epoch) speak(); });
    // A recording that failed at once already handed over to the device voice; keep that one stoppable.
    if (readAloud) return;
    stop = cancelLine;
    if (epoch !== this.epoch) cancelLine();
  };
  /** Stops the Familiar mid-sentence; what it was showing stays. */
  quiet = () => {
    if (this.state.phase !== 'speaking') return;
    this.silence();
    this.update({ phase: this.state.proposal ? 'review' : 'ready' });
  };
  /** A user gesture opens a session; only voice sessions speak their confirmation. */
  open = (withVoice = false) => {
    // With live talk, a voice session is a conversation.
    const talk = () => { if (this.live) { if (!this.liveRun) this.talk(); } else this.listen(); };
    if (this.state.open) { if (withVoice) talk(); return; }
    this.spoken = withVoice && !this.live;
    this.update({ open: true, phase: 'ready', proposal: undefined, topicId: undefined, message: this.empty() });
    if (withVoice) talk();
  };
  private interrupt() {
    if (!this.releasePlayback) this.releasePlayback = this.context?.interrupt?.();
  }
  /**
   * Shows a message; a voice session also hears it, then `after` runs
   * (listening again, by default). A readback that fails runs `afterFailure`.
   */
  private respond(message: string, phase: 'ready' | 'review', after: () => void = this.listen, afterFailure?: () => void) {
    this.update({ phase, message });
    if (!this.spoken) return;
    this.update({ phase: 'speaking' });
    const epoch = this.epoch;
    const cancel = this.voice.speak(message, this.language,
      () => { if (epoch === this.epoch) { this.update({ phase }); after(); } },
      () => { if (epoch === this.epoch) { this.update({ phase, message }); afterFailure?.(); } });
    if (epoch === this.epoch) this.cancelVoice = cancel; else cancel();
  }
  close = () => {
    if (this.state.phase === 'saving') return;
    this.hangUp();
    this.silence();
    this.release(true);
    this.update({ open: false, proposal: undefined, phase: 'ready', message: '' });
  };
  /** Leaving the foreground ends microphone capture and never restarts hidden playback. */
  suspend = () => {
    this.hangUp();
    this.silence();
    this.release(false);
    this.update({ open: false, proposal: undefined, phase: 'ready', message: '' });
  };
  listen = () => {
    if (this.state.phase === 'saving') return;
    this.silence();
    if (!this.voice.available) {
      this.update({ phase: this.state.proposal ? 'review' : 'ready', message: 'Voice input is unavailable here. You can type or choose an action.' });
      return;
    }
    this.spoken = true;
    this.interrupt();
    this.update({ phase: 'listening', message: this.state.proposal ? 'Listening for Confirm or Cancel…' : 'Listening…' });
    const epoch = this.epoch;
    const listening = this.voice.listen(this.language,
      text => { if (epoch === this.epoch) this.submit(text); },
      message => { if (epoch === this.epoch) this.update({ phase: this.state.proposal ? 'review' : 'ready', message }); });
    if (epoch !== this.epoch) { listening.cancel(); return; }
    this.listening = listening;
    this.cancelVoice = listening.cancel;
  };
  /** The reader's second tap: they have finished speaking, so the Familiar answers what it heard. */
  doneTalking = () => {
    if (this.state.phase !== 'listening') return;
    this.listening?.stop();
  };
  submit = (text: string) => {
    if (!this.state.open || !this.context || this.state.phase === 'saving') return;
    this.silence();
    if (normalize(text) === 'cancel') { this.close(); return; }
    if (this.state.proposal) {
      if (normalize(text) === 'confirm') void this.confirm();
      else if (HEAR.has(normalize(text)) && this.proposedAction()?.preview) this.hear();
      else this.respond('Say Confirm or Cancel, or choose Change.', 'review');
      return;
    }
    const mode = MODE_WORDS[normalize(text)];
    if (mode) { this.setMode(mode); return; }
    if (this.state.mode === 'explain') {
      const topic = this.context.topics.find(entry => entry.phrases.some(phrase => normalize(phrase) === normalize(text)));
      if (topic) this.explain(topic.id);
      else this.respond(this.hint(), 'ready');
      return;
    }
    const match = matchFamiliarCommand(this.context.actions, text);
    const action = this.context.actions.find(entry => entry.id === match?.actionId);
    if (!match || !action) { this.respond(this.hint(), 'ready'); return; }
    const problem = this.propose(action, match.input);
    if (problem) { this.respond(problem, 'ready'); return; }
    const proposal = this.state.proposal!;
    if (this.spoken) {
      this.update({ phase: 'speaking' });
      const epoch = this.epoch;
      const choices = action.preview ? 'Say Confirm, Hear it, or Cancel.' : 'Say Confirm or Cancel.';
      const cancel = this.voice.speak(`${proposal.summary} ${choices}`, this.language,
        () => { if (epoch === this.epoch) this.listen(); },
        message => { if (epoch === this.epoch) this.update({ phase: 'review', message }); });
      if (epoch === this.epoch) this.cancelVoice = cancel; else cancel();
    }
  };
  /** Shows an action's change for review, or says why it cannot be applied as asked. */
  private propose(action: FamiliarHelperAction, input: string): string | undefined {
    if (action.input && (!input || input.length > action.input.maxLength)) return `${action.input.label}: enter 1–${action.input.maxLength} characters.`;
    const problem = action.check?.(input);
    if (problem) return problem;
    this.interrupt();
    const proposal = { actionId: action.id, input, summary: action.describe(input), contextKey: this.context!.key,
      ...(action.prepare ? { prepared: action.prepare(input) } : {}) };
    this.update({ proposal, phase: 'review', message: '' });
    return undefined;
  }
  private proposedAction() {
    const proposal = this.state.proposal;
    return proposal && proposal.contextKey === this.context?.key ? this.context.actions.find(entry => entry.id === proposal.actionId) : undefined;
  }
  /** Plays the proposal's preview; a voice session listens again for Confirm or Cancel once it has played. */
  hear = () => {
    const action = this.proposedAction();
    if (!action?.preview || this.state.phase === 'saving') return;
    this.silence();
    const { input, prepared } = this.state.proposal!;
    if (action.prepare) action.preview(input, prepared); else action.preview(input);
    this.update({ phase: 'review', message: '' });
    if (!this.spoken) return;
    const epoch = this.epoch;
    const timer = setTimeout(() => { if (epoch === this.epoch) this.listen(); }, PREVIEW_MS);
    this.cancelVoice = () => clearTimeout(timer);
  };
  change = () => {
    if (this.state.phase === 'saving') return;
    this.silence();
    this.update({ proposal: undefined, phase: 'ready', message: '' });
  };
  /** Switching to touch/typing stops the microphone and opts out of spoken readback. */
  useText = () => {
    if (this.state.phase === 'saving') return;
    this.silence();
    this.spoken = false;
    this.update({ phase: this.state.proposal ? 'review' : 'ready' });
  };
  confirm = async () => {
    const proposal = this.state.proposal;
    if (!proposal || this.state.phase === 'saving' || proposal.contextKey !== this.context?.key) return;
    const action = this.context.actions.find(entry => entry.id === proposal.actionId);
    if (!action) return;
    this.silence();
    const epoch = this.epoch;
    this.update({ phase: 'saving', message: '' });
    try {
      await (action.prepare ? action.run(proposal.input, proposal.prepared) : action.run(proposal.input));
      // A successful save may update the screen's context before this promise resolves.
      if (epoch !== this.epoch) return;
      this.update({ proposal: undefined });
      // A voice session hears that it was applied before playback resumes over it.
      this.respond(action.success, 'ready', () => this.release(true), () => this.release(true));
      // Story playback waits until a live conversation ends.
      if (!this.spoken && !this.liveRun) this.release(true);
    } catch (error) {
      if (epoch === this.epoch) this.update({ phase: 'review', message: error instanceof Error ? error.message : 'The action could not be applied. Try again.' });
    }
  };
  /**
   * Live talk: the Familiar hears and answers in its own voice until the
   * reader taps again (or it ends on its own). Where live talk cannot start,
   * the device voice listens instead.
   */
  talk = () => {
    if (this.liveRun) { this.hangUp(); return; }
    const context = this.context;
    if (!this.live || !context || this.state.phase === 'saving') { this.listen(); return; }
    this.silence();
    this.spoken = false;
    this.interrupt();
    const run = {};
    this.liveRun = run;
    const current = () => this.liveRun === run;
    this.openTurn = {};
    this.typedAhead = [];
    this.addLine({ speaker: 'note', text: `Talking on ${context.title}` });
    this.update({ live: { status: 'connecting' }, phase: this.state.proposal ? 'review' : 'ready', message: '' });
    const brief: FamiliarLiveBrief = {
      familiar: this.identity,
      place: context.title,
      language: this.language,
      topics: context.topics.map(({ id, label, explanation }) => ({ id, label, explanation })),
      actions: context.actions.map(({ id, label, detail, input }) => ({ id, label, ...(detail ? { detail } : {}), ...(input ? { input } : {}) })),
    };
    const session = this.live.start(brief, {
      connected: () => {
        if (!current() || !this.state.live) return;
        this.update({ live: { ...this.state.live, status: 'on' } });
        const typed = this.typedAhead;
        this.typedAhead = [];
        for (const text of typed) this.liveSession?.send(text);
      },
      caption: (speaker, text) => { if (current()) this.caption(speaker, text); },
      call: call => current() ? this.answerLive(call) : Promise.resolve('The conversation has ended.'),
      ended: (problem, unavailable) => {
        if (!current()) return;
        this.liveRun = undefined;
        this.liveSession = undefined;
        const unsent = this.typedAhead;
        this.typedAhead = [];
        this.update({ live: undefined, message: problem ?? '' });
        if (problem) this.addLine({ speaker: 'note', text: problem });
        // A typed message is never dropped: it comes back to send again, and the microphone stays off.
        if (unsent.length) {
          this.addLine({ speaker: 'note', text: 'Not sent: your Familiar could not connect.' });
          this.update({ unsent: unsent.join('\n') });
          this.release(true);
        } else if (unavailable) this.listen();
        else this.release(true);
      },
    });
    if (current()) this.liveSession = session; else session.end();
  };
  /**
   * A typed message to the Familiar, from the conversation view: sent into the
   * live conversation, which starts if none is under way.
   */
  say = (text: string) => {
    const message = text.trim();
    if (!message || !this.live) return;
    this.openTurn = {};
    if (!this.liveRun) this.talk();
    if (!this.liveRun) return;
    this.addLine({ speaker: 'reader', text: message });
    if (this.state.live?.status === 'on') this.liveSession?.send(message);
    else this.typedAhead.push(message);
  };
  /** The typed message that never reached the conversation, once, for the reader to send again. */
  takeUnsent = () => {
    const unsent = this.state.unsent;
    if (unsent !== undefined) this.update({ unsent: undefined });
    return unsent;
  };
  /** Ends the live conversation, if one is under way. */
  hangUp = () => {
    if (!this.liveRun) return;
    const session = this.liveSession;
    this.liveRun = undefined;
    this.liveSession = undefined;
    session?.end();
    this.update({ live: undefined });
    this.release(true);
  };
  /** What the Familiar asked of the screen mid-conversation, answered with what happened. */
  private async answerLive(call: FamiliarLiveCall): Promise<string> {
    const context = this.context;
    if (!context) return 'Nothing is open here.';
    if (call.name === 'show_topic') {
      const topic = context.topics.find(entry => entry.id === call.topicId);
      if (!topic) return 'That topic is not on this page.';
      if (!this.state.proposal) this.update({ mode: 'explain', topicId: topic.id, message: '' });
      this.addLine({ speaker: 'note', text: `Showed ${topic.label}` });
      return `Showing ${topic.label} on their screen.`;
    }
    if (call.name === 'propose_action') {
      if (this.state.phase === 'saving') return 'A change is still being saved.';
      const action = context.actions.find(entry => entry.id === call.actionId);
      if (!action) return 'That choice is not on this page.';
      const problem = this.propose(action, action.input ? call.input.trim() : '');
      if (problem) return problem;
      this.update({ mode: 'action', topicId: undefined });
      this.addLine({ speaker: 'note', text: `To confirm: ${this.state.proposal!.summary}` });
      return `On their screen to confirm: ${this.state.proposal!.summary}${action.preview ? ' They can hear it first.' : ''}`;
    }
    if (!this.state.proposal) return 'Nothing is waiting to be confirmed.';
    if (call.answer === 'cancel') { this.change(); this.addLine({ speaker: 'note', text: 'Cancelled' }); return 'Cancelled. Nothing changed.'; }
    if (call.answer === 'hear') { this.hear(); return 'Playing it for them now.'; }
    await this.confirm();
    const saved = !this.state.proposal;
    this.addLine({ speaker: 'note', text: saved ? this.state.message || 'Saved' : `Not saved: ${this.state.message}` });
    return saved ? `Done. ${this.state.message}`.trim() : `It could not be saved: ${this.state.message}`;
  }
}

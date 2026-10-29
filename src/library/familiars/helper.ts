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
  /** Plays what the proposal would add, so it can be heard before it is kept. */
  preview?(input: string): void;
  success: string;
  run(input: string): Promise<void>;
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

export interface FamiliarHelperState {
  open: boolean;
  mode: FamiliarMode;
  phase: 'ready' | 'listening' | 'speaking' | 'review' | 'saving';
  context?: FamiliarHelperContext;
  /** The topic Explain is showing. */
  topicId?: string;
  proposal?: { actionId: string; input: string; summary: string; contextKey: string };
  message: string;
}

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
  private state: FamiliarHelperState = { open: false, mode: 'action', phase: 'ready', message: '' };
  private listeners = new Set<() => void>();
  private places: Partial<Record<FamiliarPlaceLevel, FamiliarPlace>> = {};
  private get place() { return this.places.page ?? this.places.base; }
  private get context() { return this.place?.context; }
  private cancelVoice?: () => void;
  private listening?: FamiliarListening;
  private releasePlayback?: (resume: boolean) => void;
  private epoch = 0;
  private spoken = false;

  constructor(readonly voice: FamiliarVoice, readonly language = 'en-US') {}
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
    this.silence();
    this.interrupt();
    this.update({ topicId, phase: 'speaking', message: '' });
    const epoch = this.epoch;
    const done = () => {
      if (epoch !== this.epoch) return;
      this.update({ phase: 'ready' });
      if (this.spoken) this.listen();
    };
    const speak = () => {
      const cancel = this.voice.speak(topic.explanation, this.language, done, () => { if (epoch === this.epoch) this.update({ phase: 'ready' }); });
      if (epoch === this.epoch) this.cancelVoice = cancel; else cancel();
    };
    if (!topic.audioUrl || !this.voice.play) { speak(); return; }
    const cancel = this.voice.play(topic.audioUrl, done, () => { if (epoch === this.epoch) speak(); });
    if (epoch === this.epoch) this.cancelVoice = cancel; else cancel();
  };
  /** Stops the Familiar mid-sentence; what it was showing stays. */
  quiet = () => {
    if (this.state.phase !== 'speaking') return;
    this.silence();
    this.update({ phase: this.state.proposal ? 'review' : 'ready' });
  };
  /** A user gesture opens a session; only voice sessions speak their confirmation. */
  open = (withVoice = false) => {
    if (this.state.open) { if (withVoice) this.listen(); return; }
    this.spoken = withVoice;
    this.update({ open: true, phase: 'ready', proposal: undefined, topicId: undefined, message: this.empty() });
    if (withVoice) this.listen();
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
    this.silence();
    this.release(true);
    this.update({ open: false, proposal: undefined, phase: 'ready', message: '' });
  };
  /** Leaving the foreground ends microphone capture and never restarts hidden playback. */
  suspend = () => {
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
    if (action.input && (!match.input || match.input.length > action.input.maxLength)) {
      this.respond(`${action.input.label}: enter 1–${action.input.maxLength} characters.`, 'ready');
      return;
    }
    const problem = action.check?.(match.input);
    if (problem) { this.respond(problem, 'ready'); return; }
    this.interrupt();
    const proposal = { ...match, summary: action.describe(match.input), contextKey: this.context.key };
    this.update({ proposal, phase: 'review', message: '' });
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
  private proposedAction() {
    const proposal = this.state.proposal;
    return proposal && proposal.contextKey === this.context?.key ? this.context.actions.find(entry => entry.id === proposal.actionId) : undefined;
  }
  /** Plays the proposal's preview; a voice session listens again for Confirm or Cancel once it has played. */
  hear = () => {
    const action = this.proposedAction();
    if (!action?.preview || this.state.phase === 'saving') return;
    this.silence();
    action.preview(this.state.proposal!.input);
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
      await action.run(proposal.input);
      // A successful save may update the screen's context before this promise resolves.
      if (epoch !== this.epoch) return;
      this.update({ proposal: undefined });
      // A voice session hears that it was applied before playback resumes over it.
      this.respond(action.success, 'ready', () => this.release(true), () => this.release(true));
      if (!this.spoken) this.release(true);
    } catch (error) {
      if (epoch === this.epoch) this.update({ phase: 'review', message: error instanceof Error ? error.message : 'The action could not be applied. Try again.' });
    }
  };
}

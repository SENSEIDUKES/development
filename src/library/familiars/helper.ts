/** A screen supplies actions; the Familiar never owns a second copy of its data. */
export interface FamiliarHelperAction {
  id: string;
  label: string;
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

/** Change key when the target or available choices change, invalidating any proposal. */
export interface FamiliarHelperContext {
  key: string;
  title: string;
  hint: string;
  actions: readonly FamiliarHelperAction[];
  /** Release only the playback this interaction interrupted. False means do not resume. */
  interrupt?(): (resume: boolean) => void;
}

/** Device speech is replaceable and independent of the screen's actions. */
export interface FamiliarVoice {
  readonly available: boolean;
  listen(language: string, result: (text: string) => void, failure: (message: string) => void): () => void;
  speak(text: string, language: string, done: () => void, failure: (message: string) => void): () => void;
}

export interface FamiliarHelperState {
  open: boolean;
  phase: 'ready' | 'listening' | 'speaking' | 'review' | 'saving';
  context?: FamiliarHelperContext;
  proposal?: { actionId: string; input: string; summary: string; contextKey: string };
  message: string;
}

const normalize = (text: string) => text.trim().toLocaleLowerCase('en-US').replace(/[.!?]+$/, '').trim();
const HEAR = new Set(['hear it', 'hear', 'play it', 'play', 'preview']);
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

/** One short, cancellable interaction. Screens provide actions; adapters provide speech. */
export class FamiliarHelperController {
  private state: FamiliarHelperState = { open: false, phase: 'ready', message: '' };
  private listeners = new Set<() => void>();
  private owner?: symbol;
  private context?: FamiliarHelperContext;
  private cancelVoice?: () => void;
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
    const cancel = this.cancelVoice;
    this.cancelVoice = undefined;
    cancel?.();
  }
  private release(resume: boolean) {
    const release = this.releasePlayback;
    this.releasePlayback = undefined;
    release?.(resume);
  }
  /** Registration is scoped to the mounted screen, including when no helper UI is open. */
  setContext(owner: symbol, context: FamiliarHelperContext) {
    const changed = this.owner !== owner || this.context?.key !== context.key;
    this.owner = owner;
    this.context = context;
    if (!changed) return;
    this.silence();
    this.release(false);
    this.update({ context, proposal: undefined, phase: 'ready', message: this.state.open ? 'The available actions changed. Choose again.' : '' });
  }
  clearContext(owner: symbol) {
    if (this.owner !== owner) return;
    this.owner = undefined;
    this.context = undefined;
    this.silence();
    this.release(false);
    this.update({ context: undefined, proposal: undefined, phase: 'ready', message: 'No actions on this page yet.' });
  }
  /** A user gesture opens a session; only voice sessions speak their confirmation. */
  open = (withVoice = false) => {
    if (this.state.open) { if (withVoice) this.listen(); return; }
    this.spoken = withVoice;
    this.update({ open: true, phase: 'ready', proposal: undefined, message: this.context ? this.context.hint : 'No actions on this page yet.' });
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
    if (!this.context?.actions.length || this.state.phase === 'saving') return;
    this.silence();
    if (!this.voice.available) {
      this.update({ phase: this.state.proposal ? 'review' : 'ready', message: 'Voice input is unavailable here. You can type or choose an action.' });
      return;
    }
    this.spoken = true;
    this.interrupt();
    this.update({ phase: 'listening', message: this.state.proposal ? 'Listening for Confirm or Cancel…' : 'Listening…' });
    const epoch = this.epoch;
    const cancel = this.voice.listen(this.language,
      text => { if (epoch === this.epoch) this.submit(text); },
      message => { if (epoch === this.epoch) this.update({ phase: this.state.proposal ? 'review' : 'ready', message }); });
    if (epoch === this.epoch) this.cancelVoice = cancel; else cancel();
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
    const match = matchFamiliarCommand(this.context.actions, text);
    const action = this.context.actions.find(entry => entry.id === match?.actionId);
    if (!match || !action) { this.respond(this.context.hint, 'ready'); return; }
    if (action.input && (!match.input || match.input.length > action.input.maxLength)) {
      this.respond(`${action.input.label}: enter 1–${action.input.maxLength} characters.`, 'ready');
      return;
    }
    const problem = action.check?.(match.input);
    if (problem) { this.respond(problem, 'ready'); return; }
    this.interrupt();
    const proposal = { ...match, summary: action.describe(match.input), contextKey: this.context.key };
    this.update({ proposal, phase: 'review', message: 'Confirm to apply, or Cancel.' });
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
    this.update({ phase: 'review', message: 'Playing the sound. Confirm to keep it, or Cancel.' });
    if (!this.spoken) return;
    const epoch = this.epoch;
    const timer = setTimeout(() => { if (epoch === this.epoch) this.listen(); }, PREVIEW_MS);
    this.cancelVoice = () => clearTimeout(timer);
  };
  change = () => {
    if (this.state.phase === 'saving') return;
    this.silence();
    this.update({ proposal: undefined, phase: 'ready', message: this.context?.hint ?? '' });
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
    this.update({ phase: 'saving', message: 'Applying…' });
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

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, Keyboard, Lightbulb, Mic, RotateCcw, Square, Volume2, X, Zap } from 'lucide-react';
import { useOptionalNarrativeAudio, type NarrativeAudioPlayback } from '@seihouse/sen/audio';
import { FamiliarHelperController, type FamiliarHelperContext, type FamiliarPlaceLevel, type FamiliarVoice } from '../../../library/familiars/helper';

const Helper = createContext<FamiliarHelperController | null>(null);
const FocusReturn = createContext<RefObject<HTMLElement | null> | null>(null);
/** Hosts without the helper retain the Familiar's original two-action tray. */
export const useFamiliarHelperAvailable = () => Boolean(useContext(Helper));

/** A recorded line has this long to start before the device voice reads it instead. */
const LINE_START_MS = 8_000;

/**
 * Plays one recorded line on the host's shared player (the one the help menu
 * uses): done when it ends, a failure when it cannot start, so the device
 * voice can read the words instead.
 */
function playLine(currentPlayback: () => NarrativeAudioPlayback | null, url: string, done: () => void, failure: (message: string) => void) {
  const playback = currentPlayback();
  if (!playback) { failure('No player for recorded lines here.'); return () => {}; }
  const id = `familiar-line:${url}`;
  let started = false;
  let finished = false;
  const finish = (ended: boolean) => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    unsubscribe();
    if (ended) { done(); return; }
    // A line that never started (or failed) must not start later over the device voice reading it.
    currentPlayback()?.stop(id);
    failure('The recorded line could not play.');
  };
  const unsubscribe = playback.subscribe(event => {
    if (event.type === 'play' && event.trackId === id) started = true;
    else if (event.type === 'error' && (event.trackId === id || event.trackId === null)) finish(false);
    else if (started && (event.type === 'queue-end' || (event.type === 'track-change' && event.trackId !== id))) finish(true);
  });
  const timeout = setTimeout(() => { if (!started) finish(false); }, LINE_START_MS);
  playback.play({ id, source: url, title: 'Familiar', artist: 'Familiar' });
  return () => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    unsubscribe();
    // The player as it is now: the one captured at the start does not know its new track yet.
    currentPlayback()?.stop(id);
  };
}

/** One app-wide owner, independent of whether the Familiar is minimized or on a Reader page. */
export function FamiliarHelperProvider({ voice, language = 'en-US', bottomInset = 88, children }: { voice: FamiliarVoice; language?: string; bottomInset?: number; children: ReactNode }) {
  // Recorded lines play on the host's shared player, read when each line starts.
  const narrative = useOptionalNarrativeAudio();
  const narrativeRef = useRef(narrative);
  narrativeRef.current = narrative;
  const helper = useMemo(() => new FamiliarHelperController({
    available: voice.available,
    listen: (...args) => voice.listen(...args),
    speak: (...args) => voice.speak(...args),
    play: voice.play ?? ((url, done, failure) => playLine(() => narrativeRef.current, url, done, failure)),
  }, language), [voice, language]);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') helper.suspend(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); helper.suspend(); };
  }, [helper]);
  return <Helper.Provider value={helper}><FocusReturn.Provider value={returnFocus}>{children}<FamiliarHelperPanel helper={helper} bottomInset={Math.max(16, bottomInset)} /></FocusReturn.Provider></Helper.Provider>;
}

/**
 * Register only the mounted screen; later screens can supply unrelated actions
 * through the same port. The app registers its own place (`base`) under every
 * page; a page that registers covers it while mounted.
 */
export function useFamiliarHelperContext(context: FamiliarHelperContext, level: FamiliarPlaceLevel = 'page') {
  const helper = useContext(Helper);
  const owner = useRef(Symbol('familiar-screen'));
  useLayoutEffect(() => { helper?.setContext(owner.current, context, level); });
  useLayoutEffect(() => {
    const token = owner.current;
    return () => helper?.clearContext(token);
  }, [helper]);
}

/** The same action appears in the header tray and floating Familiar. */
export function FamiliarHelperAction({ onOpen, focusTarget }: { onOpen?: () => void; focusTarget?: () => HTMLElement | null }) {
  const helper = useContext(Helper);
  const returnFocus = useContext(FocusReturn);
  if (!helper) return null;
  return <button type="button" className="familiar-action" aria-label="Talk to Familiar" title="Talk or type to Familiar"
    onClick={event => {
      if (returnFocus) returnFocus.current = focusTarget?.() ?? event.currentTarget;
      onOpen?.(); helper.open(true);
    }}><Mic aria-hidden size={20} /></button>;
}

/**
 * A small nonmodal surface, mobile first: the two modes as icons, then what
 * this place offers in that mode (Explain's topics, with a clip where one
 * exists; Action's choices), then the microphone. How to talk to it is behind
 * the info button, never on the panel itself.
 */
function FamiliarHelperPanel({ helper, bottomInset }: { helper: FamiliarHelperController; bottomInset: number }) {
  const state = useSyncExternalStore(helper.subscribe, helper.getSnapshot, helper.getSnapshot);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [info, setInfo] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const returnFocus = useContext(FocusReturn);
  useEffect(() => {
    if (!state.open) return;
    return () => { if (returnFocus?.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); };
  }, [state.open, returnFocus]);
  useEffect(() => {
    if (state.open) (confirm.current ?? panel.current)?.focus({ preventScroll: true });
  }, [state.open, state.proposal, state.context?.key]);
  useEffect(() => { setText(''); setTyping(false); setInfo(false); }, [state.open, state.context?.key]);
  if (!state.open) return null;
  const busy = state.phase === 'saving';
  const context = state.context;
  // The longest typed command any input action takes: its phrase, a separator and its text.
  const typedLimit = context?.actions.reduce<number | undefined>((longest, action) => action.input
    ? Math.max(longest ?? 0, action.input.maxLength + action.phrases[0].length + 2) : longest, undefined);
  const proposed = state.proposal && context?.actions.find(action => action.id === state.proposal!.actionId);
  const topic = state.mode === 'explain' ? context?.topics.find(entry => entry.id === state.topicId) : undefined;
  const type = (prefill = '') => { helper.useText(); setInfo(false); setTyping(true); setText(prefill); setTimeout(() => input.current?.focus(), 0); };
  // Listening and speaking show on the microphone, not in words.
  const message = state.phase === 'listening' ? '' : state.message;
  const micLabel = state.phase === 'listening' ? 'Done talking' : state.phase === 'speaking' ? 'Speaking' : state.proposal ? 'Speak Confirm or Cancel' : 'Speak';

  return createPortal(<div ref={panel} role="dialog" aria-modal="false" aria-label="Familiar" tabIndex={-1}
    style={{ bottom: `max(${bottomInset}px, env(safe-area-inset-bottom))`, maxHeight: `min(70dvh, calc(100dvh - ${bottomInset + 16}px))` }}
    className="familiar-helper" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); helper.close(); } }}>
    <div className="familiar-helper-top">
      <div className="familiar-helper-modes" role="group" aria-label="Familiar mode">
        {([['explain', 'Explain', Lightbulb], ['action', 'Action', Zap]] as const).map(([mode, label, Icon]) =>
          <button type="button" key={mode} aria-pressed={state.mode === mode && !info} aria-label={label} title={label}
            disabled={busy || Boolean(state.proposal)} onClick={() => { helper.useText(); setTyping(false); setInfo(false); helper.setMode(mode); }}>
            <Icon size={20} aria-hidden /></button>)}
      </div>
      <span className="familiar-helper-place">{context?.title}</span>
      <button type="button" className="familiar-helper-icon" aria-label="Close Familiar" title="Close" disabled={busy} onClick={helper.close}><X size={20} aria-hidden /></button>
    </div>

    {info ? <div className="familiar-helper-info">
      <p><Lightbulb size={16} aria-hidden /> <strong>Explain</strong> shows and tells you how things work here.</p>
      <p><Zap size={16} aria-hidden /> <strong>Action</strong> does things for you. It always asks before it changes anything.</p>
      <p><Mic size={16} aria-hidden /> Tap the microphone and talk, or <Keyboard size={16} aria-hidden /> type. Say “Explain” or “Action” to switch.</p>
      {context?.actions.length ? <p>{context.hint}</p> : null}
      <p className="familiar-helper-quiet">Voice commands are in English for now.</p>
    </div>

    : state.proposal ? <div className="familiar-helper-review">
      <p id="familiar-proposal" className="familiar-helper-proposal">{state.proposal.summary}</p>
      <div className="familiar-helper-answers">
        <button ref={confirm} type="button" aria-describedby="familiar-proposal" disabled={busy} onClick={() => void helper.confirm()}><Check size={18} aria-hidden />Confirm</button>
        {proposed?.preview && <button type="button" disabled={busy} onClick={() => { helper.useText(); helper.hear(); }}><Volume2 size={18} aria-hidden />Hear it</button>}
        <button type="button" disabled={busy} onClick={helper.change}><RotateCcw size={18} aria-hidden />Change</button>
        <button type="button" disabled={busy} onClick={helper.close}><X size={18} aria-hidden />Cancel</button>
      </div>
    </div>

    : state.mode === 'explain' ? <>
      {topic && <div className="familiar-helper-topic">
        {topic.videoUrl && <video className="familiar-helper-clip" src={topic.videoUrl} autoPlay muted loop playsInline
          aria-label={`${topic.label}, shown`} onClick={event => { const clip = event.currentTarget; if (clip.paused) void clip.play(); else clip.pause(); }} />}
        <div className="familiar-helper-topic-text">
          <p>{topic.explanation}</p>
          <button type="button" className="familiar-helper-icon" aria-label={state.phase === 'speaking' ? 'Stop' : 'Hear it again'}
            onClick={() => state.phase === 'speaking' ? helper.quiet() : helper.explain(topic.id)}>
            {state.phase === 'speaking' ? <Square size={16} aria-hidden /> : <Volume2 size={18} aria-hidden />}</button>
        </div>
      </div>}
      {context?.topics.length ? <div className="familiar-helper-topics">
        {context.topics.map(entry => { const Icon = entry.icon ?? Lightbulb; return <button type="button" key={entry.id} aria-pressed={entry.id === state.topicId}
          onClick={() => { helper.useText(); helper.explain(entry.id); }}><Icon size={16} aria-hidden />{entry.label}</button>; })}
      </div> : null}
    </>

    : context?.actions.length ? <div className="familiar-helper-actions">
      {context.actions.map(action => { const Icon = action.icon ?? Zap; const detail = `familiar-action-${action.id}-detail`;
        // Named by its label; the short line under it describes it.
        return <button type="button" key={action.id} disabled={busy} aria-label={action.label} aria-describedby={action.detail ? detail : undefined}
        onClick={() => { if (action.input) type(`${action.phrases[0]}: `); else { helper.useText(); helper.submit(action.phrases[0]); } }}>
        <Icon size={22} aria-hidden /><span className="familiar-helper-tile-text"><span>{action.label}</span>
          {action.detail && <small id={detail}>{action.detail}</small>}</span></button>; })}
    </div> : null}

    <p role="status" aria-live="polite" className="familiar-helper-status">{message}</p>

    {typing && !state.proposal && !info && <form onSubmit={event => { event.preventDefault(); helper.submit(text); }}>
      <input ref={input} aria-label="Type to your Familiar" id="familiar-command" value={text} maxLength={typedLimit} disabled={busy}
        onFocus={helper.useText} onChange={event => setText(event.target.value)} />
      <button type="submit" className="familiar-helper-icon" aria-label="Send" disabled={busy || !text.trim()}><Check size={20} aria-hidden /></button>
    </form>}

    <div className="familiar-helper-bottom">
      <button type="button" className="familiar-helper-icon" aria-label="How to talk to your Familiar" title="How to talk to your Familiar"
        aria-pressed={info} onClick={() => setInfo(!info)}><Info size={20} aria-hidden /></button>
      <button type="button" className="familiar-helper-mic" data-phase={state.phase} aria-label={micLabel} title={micLabel}
        aria-pressed={state.phase === 'listening'} disabled={busy}
        onClick={() => { setInfo(false); if (state.phase === 'listening') { helper.doneTalking(); return; } if (state.phase === 'speaking') helper.quiet(); helper.listen(); }}>
        <Mic size={26} aria-hidden /></button>
      <button type="button" className="familiar-helper-icon" aria-label="Type instead" title="Type instead" aria-pressed={typing}
        disabled={Boolean(state.proposal)} onClick={() => { if (typing) setTyping(false); else type(); }}><Keyboard size={20} aria-hidden /></button>
    </div>
  </div>, document.body);
}

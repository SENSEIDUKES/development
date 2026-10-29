import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Mic, X } from 'lucide-react';
import { FamiliarHelperController, type FamiliarHelperContext, type FamiliarVoice } from '../../../library/familiars/helper';

const Helper = createContext<FamiliarHelperController | null>(null);
const FocusReturn = createContext<RefObject<HTMLElement | null> | null>(null);
/** Hosts without the helper retain the Familiar's original two-action tray. */
export const useFamiliarHelperAvailable = () => Boolean(useContext(Helper));

/** One app-wide owner, independent of whether the Familiar is minimized or on a Reader page. */
export function FamiliarHelperProvider({ voice, language = 'en-US', bottomInset = 88, children }: { voice: FamiliarVoice; language?: string; bottomInset?: number; children: ReactNode }) {
  const helper = useMemo(() => new FamiliarHelperController(voice, language), [voice, language]);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') helper.suspend(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); helper.suspend(); };
  }, [helper]);
  return <Helper.Provider value={helper}><FocusReturn.Provider value={returnFocus}>{children}<FamiliarHelperPanel helper={helper} bottomInset={Math.max(16, bottomInset)} /></FocusReturn.Provider></Helper.Provider>;
}

/** Register only the mounted screen; later screens can supply unrelated actions through the same port. */
export function useFamiliarHelperContext(context: FamiliarHelperContext) {
  const helper = useContext(Helper);
  const owner = useRef(Symbol('familiar-screen'));
  useLayoutEffect(() => { helper?.setContext(owner.current, context); });
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

/** A small nonmodal surface: no conversation history, backdrop, or persistent Reader toolbar. */
function FamiliarHelperPanel({ helper, bottomInset }: { helper: FamiliarHelperController; bottomInset: number }) {
  const state = useSyncExternalStore(helper.subscribe, helper.getSnapshot, helper.getSnapshot);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const returnFocus = useContext(FocusReturn);
  useEffect(() => {
    if (!state.open) return;
    return () => { if (returnFocus?.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); };
  }, [state.open, returnFocus]);
  useEffect(() => {
    if (state.open) (confirm.current ?? panel.current)?.focus({ preventScroll: true });
  }, [state.open, state.proposal, state.context?.key]);
  useEffect(() => { setText(''); setTyping(false); }, [state.open, state.context?.key]);
  if (!state.open) return null;
  const busy = state.phase === 'saving';
  // The longest typed command any input action takes: its phrase, a separator and its text.
  const typedLimit = state.context?.actions.reduce<number | undefined>((longest, action) => action.input
    ? Math.max(longest ?? 0, action.input.maxLength + action.phrases[0].length + 2) : longest, undefined);
  const proposed = state.proposal && state.context?.actions.find(action => action.id === state.proposal!.actionId);
  return createPortal(<div ref={panel} role="dialog" aria-modal="false" aria-label="Familiar helper" tabIndex={-1}
    style={{ bottom: `max(${bottomInset}px, env(safe-area-inset-bottom))`, maxHeight: `min(55dvh, calc(100dvh - ${bottomInset + 16}px))` }}
    className="familiar-helper" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); helper.close(); } }}>
    <div className="familiar-panel-heading">
      <span>Familiar <span className="familiar-helper-context">{state.context?.title}</span></span>
      <button type="button" className="familiar-panel-button" aria-label="Close Familiar helper" disabled={busy} onClick={helper.close}><X size={18} aria-hidden /></button>
    </div>
    <div className="familiar-helper-modes" role="group" aria-label="Familiar mode">
      {(['explain', 'action'] as const).map(mode => <button type="button" key={mode} aria-pressed={state.mode === mode}
        disabled={busy || Boolean(state.proposal)} onClick={() => { helper.useText(); setTyping(false); helper.setMode(mode); }}>
        {mode === 'explain' ? 'Explain' : 'Action'}</button>)}
    </div>
    <p role="status" aria-live="polite" className="familiar-helper-status">{state.message}</p>
    {state.proposal ? <>
      <p id="familiar-proposal" className="familiar-helper-proposal">{state.proposal.summary}</p>
      <div className="familiar-helper-buttons">
        <button ref={confirm} type="button" aria-describedby="familiar-proposal" disabled={busy} onClick={() => void helper.confirm()}>Confirm</button>
        <button type="button" disabled={busy} onClick={helper.close}>Cancel</button>
        {proposed?.preview && <button type="button" disabled={busy} onClick={() => { helper.useText(); helper.hear(); }}>Hear it</button>}
        <button type="button" disabled={busy} onClick={helper.change}>Change</button>
      </div>
    </> : state.context && <>
      <div className="familiar-helper-choices">
        {state.mode === 'explain' ? state.context.topics.map(topic =>
          <button type="button" key={topic.id} disabled={busy} onClick={() => { helper.useText(); helper.submit(topic.phrases[0]); }}>{topic.label}</button>)
        : state.context.actions.map(action =>
          <button type="button" key={action.id} disabled={busy} onClick={() => {
            helper.useText();
            if (action.input) { setTyping(true); setText(`${action.phrases[0]}: `); }
            else helper.submit(action.phrases[0]);
          }}>{action.label}</button>)}
      </div>
      {typing ? <form onSubmit={event => { event.preventDefault(); helper.submit(text); }}>
        <label htmlFor="familiar-command">Type a command</label>
        <input autoFocus id="familiar-command" value={text} maxLength={typedLimit}
          disabled={busy}
          onFocus={helper.useText} onChange={event => setText(event.target.value)} />
        <button type="submit" disabled={busy || !text.trim()}>Review</button>
      </form> : null}
    </>}
    <div className="familiar-helper-input-actions">
    {!state.proposal && !typing && Boolean(state.context) && <button type="button" onClick={() => { helper.useText(); setTyping(true); }}>Type instead</button>}
    <button type="button" className="familiar-helper-mic" disabled={busy || state.phase === 'listening' || state.phase === 'speaking'}
      onClick={helper.listen}><Mic size={16} aria-hidden />{state.proposal ? 'Speak Confirm or Cancel' : 'Speak'}</button>
    </div>
    <p className="familiar-helper-footnote">Voice commands in English; say Explain or Action to switch. Touch and typing are also available.</p>
  </div>, document.body);
}

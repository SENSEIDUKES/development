import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayScrollbar } from '@seihouse/ui';
import { FamiliarClip } from './FamiliarClip';
import { FamiliarGuideView } from './FamiliarGuideView';
import { FamiliarWelcome } from './FamiliarWelcome';
import type { FamiliarGuide, FamiliarOption } from '../shared/familiar';
import { SpokenCode, SpokenCodesProvider } from '@seihouse/sen/presentation';
import { ArrowLeft, Check, Compass, GripVertical, Info, Keyboard, Lightbulb, MessagesSquare, Mic, RotateCcw, SendHorizontal, Square, Volume2, X, Zap } from 'lucide-react';
import { useOptionalNarrativeAudio, type NarrativeAudioPlayback } from '@seihouse/sen/audio';
import { FAMILIAR_BACK_ACTION_ID, FAMILIAR_WAKE_WORD, FamiliarHelperController, type FamiliarHelperContext, type FamiliarLive, type FamiliarPlaceLevel, type FamiliarVoice, type FamiliarWakeWord } from '../../../library/familiars/helper';
import { useFamiliarPanelDrag } from './useFamiliarPanelDrag';

import { FamiliarHelperContextValue as Helper } from './familiarHelperContext';
/**
 * What the Familiar teaches, and who is teaching. The guides play in the
 * Familiar's own card, in place of its topics and actions, from the Guides
 * button beside its microphone, in whichever mode the card is in: the reader
 * watches, follows along on the page and talks to it in one place. A reader
 * who has not met it yet is greeted once (`welcome`), and Show me around
 * opens the card on the guides. Nothing navigates.
 */
export interface FamiliarGuidesConfig {
  guides: readonly FamiliarGuide[];
  /** The Familiar teaching, as the catalogue shows it. */
  familiar: FamiliarOption;
  /** The reader's own name for it. */
  name?: string;
  onSeen?: (guideId: string) => void;
  /** The reader has not met it yet: its card opens once, with its greeting. */
  welcome?: boolean;
  /** The greeting was answered (Show me around or Later): it never opens by itself again. */
  onWelcomed?: () => void;
}
const FocusReturn = createContext<RefObject<HTMLElement | null> | null>(null);
/** Hosts without the helper retain the Familiar's original two-action tray. */
export const useFamiliarHelperAvailable = () => Boolean(useContext(Helper));

export { useFamiliarReadAloud } from './familiarHelperContext';

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

/**
 * One app-wide owner, independent of whether the Familiar is minimized or on a
 * Reader page. With `live`, the microphone starts a live conversation with the
 * equipped `familiar` instead of the device voice.
 */
export function FamiliarHelperProvider({ voice, live, wake, familiar, guides, language = 'en-US', bottomInset = 88, children }: {
  voice: FamiliarVoice; live?: FamiliarLive;
  /** The Familiar's guides, opened from its Guides button (and once, as its greeting). */
  guides?: FamiliarGuidesConfig;
  /** With a wake word, saying "Familiar" calls it as tapping its microphone does. */
  wake?: FamiliarWakeWord;
  familiar?: { name: string; description: string }; language?: string; bottomInset?: number; children: ReactNode;
}) {
  // Recorded lines play on the host's shared player, read when each line starts.
  const narrative = useOptionalNarrativeAudio();
  const narrativeRef = useRef(narrative);
  narrativeRef.current = narrative;
  const helper = useMemo(() => new FamiliarHelperController({
    available: voice.available,
    listen: (...args) => voice.listen(...args),
    speak: (...args) => voice.speak(...args),
    play: voice.play ?? ((url, done, failure) => playLine(() => narrativeRef.current, url, done, failure)),
  }, language, live), [voice, language, live]);
  useEffect(() => { if (familiar) helper.setIdentity({ name: familiar.name, description: familiar.description }); }, [helper, familiar?.name, familiar?.description]);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') helper.suspend(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); helper.suspend(); };
  }, [helper]);
  // The greeting, once, for a reader who has not met the Familiar.
  const [hello, setHello] = useState(false);
  const welcome = Boolean(guides?.welcome);
  useEffect(() => { if (welcome) setHello(true); }, [welcome]);
  // The guide playing in the Familiar's card, if any.
  const [guideAt, setGuideAt] = useState<number | null>(null);
  const answered = () => { if (guides?.welcome) guides.onWelcomed?.(); setHello(false); };
  return <Helper.Provider value={helper}><FocusReturn.Provider value={returnFocus}><FamiliarCodes helper={helper}>{children}
    <FamiliarHelperPanel helper={helper} bottomInset={Math.max(16, bottomInset)} guides={guides} guideAt={guideAt} onGuide={setGuideAt} /></FamiliarCodes>
    {wake?.available && <FamiliarWakeListener helper={helper} wake={wake} language={language} />}
    {hello && guides ? <FamiliarWelcome familiar={guides.familiar} name={guides.name} hasGuides={guides.guides.length > 0} bottomInset={bottomInset}
      onTour={() => { answered(); setGuideAt(0); helper.open(); }} onClose={answered} /> : null}
    </FocusReturn.Provider></Helper.Provider>;
}

/**
 * Spoken codes (N3, C12, F2) show on the page only while the Familiar is in
 * use: its card open or a live conversation on. The rest of the time the page
 * stays as it is.
 */
function FamiliarCodes({ helper, children }: { helper: FamiliarHelperController; children: ReactNode }) {
  const inUse = useSyncExternalStore(helper.subscribe, () => { const state = helper.getSnapshot(); return state.open || Boolean(state.live); }, () => false);
  return <SpokenCodesProvider visible={inUse}>{children}</SpokenCodesProvider>;
}

/**
 * Listens for the wake word while the Familiar is idle and the page is in
 * view; never while it talks, listens, speaks or saves. Hearing it calls the
 * Familiar as its microphone does: a live conversation, or the device voice.
 */
/** How long after hearing the wake word the Familiar opens: the recognizer releases the microphone. */
const WAKE_HANDOVER_MS = 250;

function FamiliarWakeListener({ helper, wake, language }: { helper: FamiliarHelperController; wake: FamiliarWakeWord; language: string }) {
  const state = useSyncExternalStore(helper.subscribe, helper.getSnapshot, helper.getSnapshot);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => {
    const follow = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', follow);
    return () => document.removeEventListener('visibilitychange', follow);
  }, []);
  const idle = visible && !state.live && (state.phase === 'ready' || state.phase === 'review');
  useEffect(() => {
    if (!idle) return;
    let stop: (() => void) | undefined;
    let called = false;
    stop = wake.listen(FAMILIAR_WAKE_WORD, language, () => {
      if (called) return;
      called = true;
      stop?.();
      // The recognizer lets go of the microphone first, so the conversation can take it.
      setTimeout(() => helper.open(true), WAKE_HANDOVER_MS);
    }, message => console.warn('[familiar] the wake word stopped listening:', message));
    return () => stop?.();
  }, [idle, wake, language, helper]);
  return null;
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
      onOpen?.(); helper.open();
    }}><Mic aria-hidden size={20} /></button>;
}

/** The card shows this many topics or actions first; the rest wait behind More / See all, never in a scrolling row. */
const FRONT = 4;

/** A More / See all / Fewer toggle under a short list. */
function ShowMore({ open, more, label, onToggle }: { open: boolean; more: number; label: string; onToggle(): void }) {
  return <button type="button" className="familiar-helper-more" aria-expanded={open} onClick={onToggle}>
    {open ? 'Fewer' : `${label} (${more} more)`}</button>;
}

/**
 * A small nonmodal surface, mobile first: the two modes as icons, then what
 * this place offers in that mode (Explain's topics, with a clip where one
 * exists; Action's choices), then the microphone. How to talk to it is behind
 * the info button, never on the panel itself. Its middle is the Familiar's one
 * media spot: the Guides button beside the microphone plays a guide there, in
 * place of the topics and actions, in whichever mode the card is in.
 */
function FamiliarHelperPanel({ helper, bottomInset, guides, guideAt, onGuide }: {
  helper: FamiliarHelperController; bottomInset: number;
  guides?: FamiliarGuidesConfig; guideAt: number | null; onGuide: (at: number | null) => void;
}) {
  const state = useSyncExternalStore(helper.subscribe, helper.getSnapshot, helper.getSnapshot);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [info, setInfo] = useState(false);
  // The conversation, behind its own button like info: never on the panel itself.
  const [chat, setChat] = useState(false);
  const [said, setSaid] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useFamiliarPanelDrag(panel, state.open, bottomInset);
  const dragInstructions = useId();
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
  useEffect(() => { setChat(false); setSaid(''); }, [state.open]);
  // Closing the card ends the guide; opening it from its Guides button starts one.
  useEffect(() => { if (!state.open) onGuide(null); }, [state.open]); // eslint-disable-line react-hooks/exhaustive-deps
  // A message that never reached the conversation comes back to the box, to send again.
  useEffect(() => { if (state.unsent !== undefined) { const unsent = helper.takeUnsent(); if (unsent) { setSaid(unsent); setChat(true); } } }, [helper, state.unsent]);
  // The newest line stays in view as the conversation goes on.
  useLayoutEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [chat, state.chat]);
  const [allTopics, setAllTopics] = useState(false);
  const [allActions, setAllActions] = useState(false);
  // Only the middle scrolls, with the Library's own scrollbar; the top bar and the microphone stay put.
  const body = useOverlayScrollbar<HTMLDivElement>({ fades: true });
  const chatLog = useOverlayScrollbar<HTMLDivElement>({ fades: true }, log);
  const placeKey = state.context?.key;
  useEffect(() => { setAllTopics(false); setAllActions(false); }, [placeKey]);
  if (!state.open) return null;
  const busy = state.phase === 'saving';
  const context = state.context;
  // The longest typed command any input action takes: its phrase, a separator and its text.
  const typedLimit = context?.actions.reduce<number | undefined>((longest, action) => action.input
    ? Math.max(longest ?? 0, action.input.maxLength + action.phrases[0].length + 2) : longest, undefined);
  const proposed = state.proposal && context?.actions.find(action => action.id === state.proposal!.actionId);
  const topic = state.mode === 'explain' ? context?.topics.find(entry => entry.id === state.topicId) : undefined;
  // What this page needs most first: its front suggestions, everything else behind See all / More.
  // Actions said by a numbered code (N3, C12) are never tiles.
  // "Take me back" is its own pill, never a tile.
  const tiles = context?.actions.filter(action => !(action.code && action.code.number === undefined) && action.id !== FAMILIAR_BACK_ACTION_ID) ?? [];
  const canGoBack = Boolean(state.proposal) || Boolean(context?.actions.some(action => action.id === FAMILIAR_BACK_ACTION_ID));
  const frontActions = Math.min(context?.front || FRONT, FRONT);
  const shownActions = allActions ? tiles : tiles.slice(0, frontActions);
  const topicAt = context?.topics.findIndex(entry => entry.id === state.topicId) ?? -1;
  const shownTopics = allTopics || topicAt >= FRONT ? context?.topics ?? [] : context?.topics.slice(0, FRONT) ?? [];
  const type = (prefill = '') => { helper.useText(); setInfo(false); setChat(false); setTyping(true); setText(prefill); setTimeout(() => input.current?.focus(), 0); };
  // Listening and speaking show on the microphone, not in words.
  const message = state.live?.status === 'connecting' ? 'Connecting…' : state.phase === 'listening' ? '' : state.message;
  // A typed conversation is not listening: its microphone starts listening.
  const micLabel = state.live ? (!state.live.listening ? 'Talk out loud' : state.live.status === 'connecting' ? 'Connecting… tap to stop' : 'Hang up')
    : state.phase === 'listening' ? 'Done talking' : helper.live ? 'Talk with your Familiar'
    : state.phase === 'speaking' ? 'Speaking' : state.proposal ? 'Speak Confirm or Cancel' : 'Speak';

  return createPortal(<div ref={panel} role="dialog" aria-modal="false" aria-label="Familiar" tabIndex={-1}
    style={{ bottom: `max(${bottomInset}px, env(safe-area-inset-bottom))`, maxHeight: `min(70dvh, calc(100dvh - ${bottomInset + 16}px))`, ...drag.style }}
    className="familiar-helper" data-dragging={drag.dragging || undefined} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); helper.close(); } }}>
    <span id={dragInstructions} className="familiar-helper-sr">Drag the top bar to move this card. When focused, use arrow keys to move; hold Shift for larger steps.</span>
    <div className="familiar-helper-top" {...drag.headerProps}>
      <div className="familiar-helper-modes" role="group" aria-label="Familiar mode">
        {([['explain', 'Explain', Lightbulb], ['action', 'Action', Zap]] as const).map(([mode, label, Icon]) =>
          <button type="button" key={mode} aria-pressed={state.mode === mode && !info} aria-label={label} title={label}
            disabled={busy || Boolean(state.proposal)} onClick={() => { helper.useText(); setTyping(false); setInfo(false); setChat(false); onGuide(null); helper.setMode(mode); }}>
            <Icon size={20} aria-hidden /></button>)}
      </div>
      <button type="button" className="familiar-helper-drag-handle" aria-label="Move Familiar card" aria-describedby={dragInstructions}
        title="Drag to move" onKeyDown={drag.onKeyDown}><GripVertical size={16} aria-hidden /><span className="familiar-helper-place">{context?.title}</span></button>
      <button type="button" className="familiar-helper-icon" aria-label="Close Familiar" title="Close" disabled={busy} onClick={helper.close}><X size={20} aria-hidden /></button>
    </div>

    <div ref={body} className="familiar-helper-body">
    {info ? <div className="familiar-helper-info">
      <p><Lightbulb size={16} aria-hidden /> <strong>Explain</strong> shows and tells you how things work here, and answers questions about the app and your story.</p>
      <p><Zap size={16} aria-hidden /> <strong>Action</strong> does things for you. It always asks before it changes anything.</p>
      {helper.live
        ? <p><Mic size={16} aria-hidden /> Tap the microphone and talk with your Familiar like a friend; tap it again to hang up. <MessagesSquare size={16} aria-hidden /> shows the conversation, where you can type to it too.</p>
        : <p><Mic size={16} aria-hidden /> Tap the microphone and talk, or <Keyboard size={16} aria-hidden /> type. Say “Explain” or “Action” to switch.</p>}
      {context?.actions.length ? <p>{context.hint}</p> : null}
      {context?.actions.some(action => action.code) ? <p>Say a code you see on screen, like N2 or C5.</p> : null}
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

    : chat ? <div className="familiar-helper-conversation">
      <div ref={chatLog} className="familiar-helper-chat" role="log" aria-label={`Conversation with ${helper.name}`}>
        {state.chat.length ? state.chat.map((line, index) => <p key={index} className={`familiar-helper-line-${line.speaker}`}>
          {line.speaker !== 'note' && <span className="familiar-helper-sr">{line.speaker === 'reader' ? 'You' : helper.name}: </span>}{line.text}</p>)
          : <p className="familiar-helper-line-note">Nothing said yet. Tap the microphone to talk, or type below.</p>}
      </div>
      <form onSubmit={event => { event.preventDefault(); helper.say(said); setSaid(''); }}>
        <input aria-label={`Message ${helper.name}`} placeholder={`Message ${helper.name}`} value={said} maxLength={500} onChange={event => setSaid(event.target.value)} />
        <button type="submit" className="familiar-helper-icon" aria-label="Send" disabled={!said.trim()}><SendHorizontal size={20} aria-hidden /></button>
      </form>
    </div>

    : guideAt !== null && guides?.guides.length ? <div className="familiar-helper-guide" data-familiar-guides-playing>
      <FamiliarGuideView inCard guides={guides.guides} at={Math.min(guideAt, guides.guides.length - 1)} name={guides.name ?? guides.familiar.name}
        onSeen={guides.onSeen} onStep={by => onGuide(Math.min(guides.guides.length - 1, Math.max(0, guideAt + by)))}
        head={<button type="button" className="familiar-guide-close" aria-label="Close guides" onClick={() => onGuide(null)} data-familiar-guides-close><X size={16} aria-hidden /></button>}
        foot={<button type="button" className="familiar-guide-next" aria-label="Done" onClick={() => onGuide(null)} data-familiar-guides-done><Check size={20} aria-hidden /></button>} />
    </div>

    : state.mode === 'explain' ? <>
      {topic && <div className="familiar-helper-topic">
        {topic.videoUrl && <FamiliarClip src={topic.videoUrl} label={`${topic.label}, shown`} />}
        <div className="familiar-helper-topic-text">
          <p>{topic.explanation}</p>
          <button type="button" className="familiar-helper-icon" aria-label={state.phase === 'speaking' ? 'Stop' : 'Hear it again'}
            onClick={() => state.phase === 'speaking' ? helper.quiet() : helper.explain(topic.id)}>
            {state.phase === 'speaking' ? <Square size={16} aria-hidden /> : <Volume2 size={18} aria-hidden />}</button>
        </div>
      </div>}
      {context?.topics.length ? <div className="familiar-helper-topics" role="group" aria-label="Familiar topics">
        {shownTopics.map(entry => { const Icon = entry.icon ?? Lightbulb; return <button type="button" key={entry.id} aria-pressed={entry.id === state.topicId}
          onClick={() => { helper.useText(); helper.explain(entry.id); }}><Icon size={16} aria-hidden />{entry.label}</button>; })}
        {context.topics.length > FRONT && <ShowMore open={allTopics} more={context.topics.length - FRONT} label="More" onToggle={() => setAllTopics(value => !value)} />}
      </div> : null}
    </>

    : tiles.length ? <div className="familiar-helper-actions">
      {shownActions.map(action => { const Icon = action.icon ?? Zap; const detail = `familiar-action-${action.id}-detail`;
        // Named by its label; the short line under it describes it.
        return <button type="button" key={action.id} disabled={busy} aria-label={action.label} aria-describedby={action.detail ? detail : undefined}
        onClick={() => { if (action.input) type(`${action.phrases[0]}: `); else { helper.useText(); helper.submit(action.phrases[0]); } }}>
        <Icon size={22} aria-hidden /><span className="familiar-helper-tile-text"><span>{action.label}{action.code?.number !== undefined && <SpokenCode code={`${action.code.letter}${action.code.number}`} className="ms-2 align-middle" />}</span>
          {action.detail && <small id={detail}>{action.detail}</small>}</span></button>; })}
      {tiles.length > frontActions && <ShowMore open={allActions} more={tiles.length - frontActions} label="See all" onToggle={() => setAllActions(value => !value)} />}
    </div> : null}

    <p role="status" aria-live="polite" className="familiar-helper-status">{message}</p>
    </div>

    {typing && !state.proposal && !info && <form onSubmit={event => { event.preventDefault(); helper.submit(text); }}>
      <input ref={input} aria-label="Type to your Familiar" id="familiar-command" value={text} maxLength={typedLimit} disabled={busy}
        onFocus={helper.useText} onChange={event => setText(event.target.value)} />
      <button type="submit" className="familiar-helper-icon" aria-label="Send" disabled={busy || !text.trim()}><Check size={20} aria-hidden /></button>
    </form>}

    {/* The rescue, always in reach: back out of a change, or back to the previous screen. It never changes anything. */}
    {canGoBack && <button type="button" className="familiar-helper-back" disabled={busy} onClick={() => { helper.useText(); setInfo(false); helper.back(); }}>
      <ArrowLeft size={18} aria-hidden />{state.proposal ? 'Back out' : 'Take me back'}</button>}

    <div className="familiar-helper-bottom">
      <div className="familiar-helper-bottom-side">
      <button type="button" className="familiar-helper-icon" aria-label="How to talk to your Familiar" title="How to talk to your Familiar"
        aria-pressed={info} onClick={() => { setChat(false); setInfo(!info); }}><Info size={20} aria-hidden /></button>
      {/* This screen's quick actions sit by the microphone: the guides play right here, in the mode the card is in. */}
      {guides?.guides.length ? <button type="button" className="familiar-helper-icon" aria-label="Guides" title="Guides" aria-pressed={guideAt !== null}
        disabled={busy || Boolean(state.proposal)} data-familiar-guides-open
        onClick={() => { setInfo(false); setChat(false); setTyping(false); onGuide(guideAt === null ? 0 : null); }}><Compass size={20} aria-hidden /></button> : null}
      </div>
      <button type="button" className="familiar-helper-mic" data-phase={state.live ? (!state.live.listening ? 'ready' : state.live.status === 'on' ? 'live' : 'connecting') : state.phase}
        aria-label={micLabel} title={micLabel} aria-pressed={Boolean(state.live?.listening) || state.phase === 'listening'} disabled={busy && !state.live}
        onClick={() => {
          setInfo(false);
          if (state.phase === 'listening') { helper.doneTalking(); return; }
          if (helper.live) { if (state.phase === 'speaking') helper.quiet(); helper.talk(); return; }
          if (state.phase === 'speaking') helper.quiet(); helper.listen();
        }}>
        {state.live?.listening && state.live.status === 'on' ? <Square size={22} aria-hidden /> : <Mic size={26} aria-hidden />}</button>
      <div className="familiar-helper-bottom-side is-end">
      {helper.live
        ? <button type="button" className="familiar-helper-icon" aria-label="Conversation" title="Read and type to your Familiar" aria-pressed={chat}
          onClick={() => { setInfo(false); setTyping(false); setChat(!chat); }}><MessagesSquare size={20} aria-hidden /></button>
        : <button type="button" className="familiar-helper-icon" aria-label="Type instead" title="Type instead" aria-pressed={typing}
          disabled={Boolean(state.proposal)} onClick={() => { if (typing) setTyping(false); else type(); }}><Keyboard size={20} aria-hidden /></button>}
      </div>
    </div>
  </div>, document.body);
}

import { useMemo, useRef, useState, type ReactNode } from 'react';
// Front Desk's card styles, from Front Desk itself: the Library's Familiar brings them to every host that installs it.
import '@seihouse/front-desk/styles.css';
import { FrontDeskProvider, useFrontDeskInUse, type FrontDeskGuide, type FrontDeskGuides, type FrontDeskLive, type FrontDeskVoice, type FrontDeskWakeWord } from '@seihouse/front-desk';
import { useOptionalNarrativeAudio, type NarrativeAudioPlayback } from '@seihouse/sen/audio';
import { SpokenCode, SpokenCodesProvider } from '@seihouse/sen/presentation';
import { FamiliarHero } from '../../components/familiar/development/FamiliarHero';
import type { FamiliarOption } from '../../components/familiar/shared/familiar';
import { FAMILIAR_WAKE_WORD, familiarFrontDeskSetup } from './frontDeskSetup';

/**
 * What the Familiar teaches, and who is teaching: Novel Expanded's guides and
 * the reader's Familiar as the catalogue shows it. A reader who has not met it
 * yet is greeted once (`welcome`).
 */
export interface FamiliarGuidesConfig {
  guides: readonly FrontDeskGuide[];
  /** The Familiar teaching, as the catalogue shows it. */
  familiar: FamiliarOption;
  /** The reader's own name for it. */
  name?: string;
  onSeen?: (guideId: string) => void;
  /** The reader has not met it yet: its greeting opens once. */
  welcome?: boolean;
  /** The greeting was answered (Show me around or Later): it never opens by itself again. */
  onWelcomed?: () => void;
}

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

/** The Familiar's face on its greeting: its portrait, or its figure where the portrait cannot load. */
function FamiliarFace({ option }: { option: FamiliarOption }) {
  const [failed, setFailed] = useState(false);
  return option.portraitUrl && !failed
    ? <img src={option.portraitUrl} alt="" decoding="async" onError={() => setFailed(true)} />
    : <FamiliarHero option={option} active={false} />;
}

/** The floating Familiar on the page, so its greeting pops up beside it. */
const companion = () => typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('.familiar-companion');

/** A code's badge on the Familiar's card, which shows only while the card is open. */
const renderCode = (code: string) => <SpokenCodesProvider visible><SpokenCode code={code} className="ms-2 align-middle" /></SpokenCodesProvider>;

/**
 * Spoken codes (N3, C12, F2) show on the page only while the Familiar is in
 * use: its card open or a live conversation on. The rest of the time the page
 * stays as it is.
 */
function FamiliarCodes({ children }: { children: ReactNode }) {
  return <SpokenCodesProvider visible={useFrontDeskInUse()}>{children}</SpokenCodesProvider>;
}

/**
 * The Familiar on SEIHouse Front Desk: Novel Expanded's docs, master action
 * list, code letters, wake word and wording; recorded lines on the app's
 * shared player; SEN's code badges; and the Familiar's face on its greeting.
 * One app-wide owner, independent of whether the Familiar is minimized or on a
 * Reader page. With `live`, the microphone starts a live conversation with the
 * equipped `familiar` instead of the device voice.
 */
export function FamiliarFrontDesk({ voice, live, wake, familiar, guides, language = 'en-US', bottomInset = 88, children }: {
  voice: FrontDeskVoice; live?: FrontDeskLive;
  /** The Familiar's guides, opened from its Guides button (and once, after its greeting). */
  guides?: FamiliarGuidesConfig;
  /** With a wake word, saying "Familiar" calls it as tapping its microphone does. */
  wake?: FrontDeskWakeWord;
  familiar?: { name: string; description: string }; language?: string; bottomInset?: number; children: ReactNode;
}) {
  // Recorded lines play on the host's shared player, read when each line starts.
  const narrative = useOptionalNarrativeAudio();
  const narrativeRef = useRef(narrative);
  narrativeRef.current = narrative;
  const lineVoice = useMemo<FrontDeskVoice>(() => ({
    available: voice.available,
    listen: (...args) => voice.listen(...args),
    speak: (...args) => voice.speak(...args),
    play: voice.play ?? ((url, done, failure) => playLine(() => narrativeRef.current, url, done, failure)),
  }), [voice]);
  const deskGuides = useMemo<FrontDeskGuides | undefined>(() => guides && {
    guides: guides.guides,
    name: guides.name ?? guides.familiar.name,
    face: <FamiliarFace option={guides.familiar} />,
    perch: companion,
    onSeen: guides.onSeen,
    welcome: guides.welcome,
    onWelcomed: guides.onWelcomed,
  }, [guides]);
  return <FrontDeskProvider voice={lineVoice} live={live} wake={wake} wakeWord={FAMILIAR_WAKE_WORD} character={familiar} guides={deskGuides}
    setup={familiarFrontDeskSetup} renderCode={renderCode} language={language} bottomInset={bottomInset}>
    <FamiliarCodes>{children}</FamiliarCodes>
  </FrontDeskProvider>;
}

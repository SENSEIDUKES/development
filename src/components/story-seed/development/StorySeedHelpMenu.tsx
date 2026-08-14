import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronRight, CircleHelp, Pause, Play, Search, X } from 'lucide-react';
import { LibraryButton, LibraryPanel, cn } from '../../library';
import { useDevAudioPlayback } from '../../../audio/DevAudioPlayback';
import {
  DEFAULT_HELP_LANGUAGE,
  STORY_SEED_HELP_ITEMS,
  getHelpTranslation,
  getLibraryHelpItems,
  type StorySeedHelpItem,
  type StorySeedHelpLanguage,
  type StorySeedHelpTranslation,
} from './storySeedHelp';

interface LibraryHelpMenuProps {
  open: boolean;
  onClose: () => void;
  /**
   * Language of the written and spoken guidance. English is the launch
   * language; more slot in through `storySeedHelp.ts` without UI changes.
   */
  language?: StorySeedHelpLanguage;
  /** Current Library surface. Matching topics remain first in the list. */
  page?: string;
  /** Contextual heading shown to the reader. */
  title?: string;
  /** Allows other Library pages to supply their guidance without a new menu. */
  topics?: readonly StorySeedHelpItem[];
}

const PLAYABLE_AUDIO_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);
const HELP_TRACK_PREFIX = 'story-seed-help:';

/** Return a trimmed, browser-playable source or `null` for text-only topics. */
const getPlayableAudioUrl = (audioUrl?: string): string | null => {
  const candidate = audioUrl?.trim();
  if (!candidate) return null;

  try {
    const baseUrl = typeof document === 'undefined'
      ? 'https://library.seihouse.org'
      : document.baseURI;
    const parsedUrl = new URL(candidate, baseUrl);
    const isAudioDataUrl = parsedUrl.protocol === 'data:' && candidate.startsWith('data:audio/');
    return PLAYABLE_AUDIO_PROTOCOLS.has(parsedUrl.protocol) || isAudioDataUrl
      ? candidate
      : null;
  } catch {
    return null;
  }
};

/**
 * StorySeedHelpMenu — the `?` destination for Story Seed guidance.
 *
 * One clean home for the help lines that used to be scattered across section
 * tip boxes. Reveal is hover/tap-to-learn: hovering a topic on desktop shows
 * its info card in the side panel, tapping a topic on mobile expands its card
 * inline. Every card carries the written line and can play the matching
 * spoken line; one line plays at a time and playback stops when the revealed
 * topic changes or the menu closes.
 */
export const LibraryHelpMenu = ({
  open,
  onClose,
  language = DEFAULT_HELP_LANGUAGE,
  page = 'library',
  title = 'Library Help',
  topics = STORY_SEED_HELP_ITEMS,
}: LibraryHelpMenuProps) => {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const activeIdRef = useRef<string | null>(null);
  const playback = useDevAudioPlayback();
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const playingId = playback.isPlaying && playback.currentTrackId?.startsWith(HELP_TRACK_PREFIX)
    ? playback.currentTrackId.slice(HELP_TRACK_PREFIX.length)
    : null;

  const stopAudio = useCallback(() => {
    const activeTrackId = playback.currentTrackId;
    if (activeTrackId?.startsWith(HELP_TRACK_PREFIX)) {
      playback.stop(activeTrackId);
    }
  }, [playback]);

  /** Reveal a topic's card (`null` collapses). Playback belongs to the
      visible card, so switching topics stops the previous line. */
  const revealItem = useCallback((id: string | null) => {
    if (id === activeIdRef.current) return;

    stopAudio();
    activeIdRef.current = id;
    setActiveId(id);
  }, [stopAudio]);

  const toggleItem = useCallback((id: string) => {
    revealItem(activeIdRef.current === id ? null : id);
  }, [revealItem]);

  const toggleAudio = useCallback((
    item: StorySeedHelpItem,
    translation: StorySeedHelpTranslation,
  ) => {
    const audioUrl = getPlayableAudioUrl(translation.audioUrl);
    if (!audioUrl) {
      stopAudio();
      return;
    }

    // The ref is authoritative during rapid taps; React state may not have
    // committed yet, but an existing session can still be stopped safely.
    if (playingId === item.id) {
      stopAudio();
      return;
    }

    stopAudio();
    playback.play({
      id: `${HELP_TRACK_PREFIX}${item.id}`,
      source: audioUrl,
      title: `${item.label} Library Help`,
    });
  }, [playback, playingId, stopAudio]);

  const clearActiveItem = useCallback(() => {
    // Modal closure and visibility changes are hard audio boundaries. Stop
    // explicitly even if selection state was already cleared by another event.
    stopAudio();
    activeIdRef.current = null;
    setActiveId(null);
  }, [stopAudio]);

  const handleClose = useCallback(() => {
    clearActiveItem();
    onClose();
  }, [clearActiveItem, onClose]);

  // Closing the menu silences playback and resets the revealed topic.
  useEffect(() => {
    if (open) return;
    clearActiveItem();
  }, [clearActiveItem, open]);

  // Never leave a line playing after the menu unmounts.
  useEffect(() => () => {
    const activeTrackId = playbackRef.current.currentTrackId;
    if (activeTrackId?.startsWith(HELP_TRACK_PREFIX)) {
      playbackRef.current.stop(activeTrackId);
    }
  }, []);

  // Same shell behavior as the other Story Seed sheets: Escape closes and
  // body scroll locks while the menu is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [handleClose, open]);

  const visibleItems = useMemo(
    () => getLibraryHelpItems(topics, language, page, query),
    [language, page, query, topics],
  );
  const activeItem = useMemo(
    () => visibleItems.find(item => item.id === activeId) ?? null,
    [activeId, visibleItems],
  );
  const activeTranslation = useMemo(
    () => activeItem ? getHelpTranslation(activeItem, language) : undefined,
    [activeItem, language],
  );
  const isActiveIdVisible = activeId === null || activeItem !== null;
  const activeAudioUrl = getPlayableAudioUrl(activeTranslation?.audioUrl);

  // Search and context updates preserve a still-visible card. If its topic
  // disappears, close that card and release its audio as one state change.
  useEffect(() => {
    if (activeId !== null && !isActiveIdVisible) clearActiveItem();
  }, [activeId, clearActiveItem, isActiveIdVisible]);

  // A language/topic data refresh may keep the same id while changing its
  // audio source. Never let the stale source continue under the new copy.
  useEffect(() => {
    if (
      playback.currentTrackId === `${HELP_TRACK_PREFIX}${activeId}`
      && playback.currentSource !== activeAudioUrl
    ) {
      stopAudio();
    }
  }, [activeAudioUrl, activeId, playback.currentSource, playback.currentTrackId, stopAudio]);

  const renderCard = useCallback((item: StorySeedHelpItem) => {
    const translation = getHelpTranslation(item, language);
    if (!translation) return null;
    const playing = playingId === item.id;
    const audioUrl = getPlayableAudioUrl(translation.audioUrl);
    return (
      <div className={cn(
        'rounded-xl border border-[rgba(205,178,113,0.22)] bg-[#0b0e1e]/70 p-4 shadow-[inset_0_0_24px_-14px_rgba(205,178,113,0.35)] transition-[border-color,box-shadow] duration-500 motion-reduce:transition-none',
        // While the system speaks, the card breathes with a soft portal aura.
        playing && 'seed-help-speaking',
      )}>
        <p className="font-serif text-[15px] leading-relaxed text-[#C9C2B2]">{translation.line}</p>
        {translation.detail && (
          <p className="mt-3 border-t border-[rgba(205,178,113,0.14)] pt-3 font-sans text-xs leading-relaxed text-[#918B80]">
            {translation.detail}
          </p>
        )}
        {audioUrl && (
          <button
            type="button"
            onClick={() => toggleAudio(item, translation)}
            aria-pressed={playing}
            className="mt-3.5 inline-flex min-h-11 items-center gap-2 rounded-full border border-portal/40 bg-portal/10 px-4 py-2 font-sc text-[10px] font-bold uppercase tracking-[0.16em] text-portal transition-colors hover:border-portal hover:bg-portal/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            {playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
            {playing ? 'Pause' : 'Listen'} · English
            {playing && (
              <span aria-hidden="true" className="flex h-3 items-center gap-[2.5px]">
                {[0, 1, 2].map(bar => (
                  <span
                    key={bar}
                    className="seed-help-voice-bar block h-3 w-[2px] rounded-full bg-portal"
                    style={{ animationDelay: `${bar * 160}ms` }}
                  />
                ))}
              </span>
            )}
          </button>
        )}
      </div>
    );
  }, [language, playingId, toggleAudio]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center lg:items-center lg:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={handleClose}
            className="story-seed-overlay-scrim absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-xl lg:max-w-3xl"
          >
            <LibraryPanel
              padding="none"
              className="story-seed-overlay-panel flex max-h-[85dvh] flex-col pb-[env(safe-area-inset-bottom)] max-lg:rounded-b-none max-lg:border-x-0 max-lg:border-b-0 max-lg:[padding-left:env(safe-area-inset-left)] max-lg:[padding-right:env(safe-area-inset-right)] lg:pb-0"
            >
              <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
                <div>
                  <p className="font-sc text-[11px] font-bold uppercase tracking-[0.34em] text-neutral-500">
                    <span className="text-[#CDB271]/90">Library</span>
                    <span className="mx-2.5 text-neutral-700">/</span>
                    <span className="text-neutral-400">Guidance</span>
                  </p>
                  <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-[0.14em] text-[#F3EDE0] sm:text-2xl">
                    {title}
                  </h2>
                  <p className="mt-1.5 max-w-md font-serif text-[13px] leading-relaxed text-[#B0A99B]">
                    <span className="lg:hidden">Tap a topic for its guidance.</span>
                    <span className="hidden lg:inline">Hover or select a topic for its guidance.</span>
                    {' '}Each main tip can be listened to in English.
                  </p>
                </div>
                <LibraryButton
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close help"
                  icon={X}
                />
              </div>

              <div className="relative mx-4 mt-4 sm:mx-6">
                <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CDB271]/65" />
                <input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search Library guidance…"
                  aria-label="Search Library guidance"
                  className="min-h-11 w-full rounded-xl border border-neutral-800/80 bg-[#0d1126]/65 py-2.5 pl-10 pr-3 font-sans text-base text-[#F3EDE0] outline-none placeholder:text-neutral-600 focus:border-[rgba(205,178,113,0.5)] focus:ring-2 focus:ring-portal/30 lg:text-sm"
                />
              </div>

              <div className="mt-4 min-h-0 overscroll-contain overflow-y-auto px-4 pb-5 sm:px-6 sm:pb-6">
                <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-5">
                  <ul className="space-y-2">
                    {visibleItems.map(item => {
                      const active = item.id === activeId;
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            aria-expanded={active}
                            // pointerType keeps this a true desktop hover —
                            // touch taps only ever toggle through onClick.
                            onPointerEnter={event => {
                              const supportsDesktopHover = window.matchMedia(
                                '(hover: hover) and (pointer: fine)',
                              ).matches;
                              if (event.pointerType === 'mouse' && supportsDesktopHover) {
                                revealItem(item.id);
                              }
                            }}
                            onClick={() => toggleItem(item.id)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70',
                              active
                                ? 'border-[rgba(205,178,113,0.45)] bg-[rgba(205,178,113,0.08)]'
                                : 'border-neutral-800/70 bg-[#0d1126]/50 hover:border-neutral-700',
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                                active
                                  ? 'border-[rgba(205,178,113,0.5)] bg-[rgba(205,178,113,0.12)] text-[#DDC58A]'
                                  : 'border-[rgba(205,178,113,0.25)] bg-[rgba(11,14,30,0.6)] text-[#CDB271]/80',
                                // The speaking topic's sigil breathes too.
                                playingId === item.id && 'seed-help-speaking',
                              )}
                            >
                              <Icon size={14} />
                            </span>
                            <span className={cn(
                              'min-w-0 flex-1 truncate font-sc text-[11px] font-bold uppercase tracking-[0.14em]',
                              active ? 'text-signal' : 'text-neutral-300',
                            )}
                            >
                              {item.label}
                            </span>
                            <ChevronRight
                              size={14}
                              aria-hidden="true"
                              className={cn(
                                'shrink-0 transition-transform motion-reduce:transition-none',
                                active ? 'rotate-90 text-[#DDC58A]' : 'text-neutral-600',
                              )}
                            />
                          </button>

                          {/* Mobile: the tapped topic's card expands inline. */}
                          <AnimatePresence initial={false}>
                            {active && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                                className="overflow-hidden lg:hidden"
                              >
                                <div className="pt-2">{renderCard(item)}</div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </li>
                      );
                    })}
                    {visibleItems.length === 0 && (
                      <li className="rounded-xl border border-dashed border-neutral-800/90 px-4 py-6 text-center font-sans text-xs text-neutral-500">
                        No Library guidance matches your search.
                      </li>
                    )}
                  </ul>

                  {/* Desktop: the hovered/selected topic's card rests beside
                      the list so hovering reads like a preview. */}
                  <div className="hidden lg:block">
                    {activeItem && activeTranslation ? (
                      renderCard(activeItem)
                    ) : (
                      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-neutral-800/90 px-6 text-center">
                        <CircleHelp size={18} aria-hidden="true" className="text-[#CDB271]/60" />
                        <p className="font-sans text-xs leading-relaxed text-neutral-500">
                          Hover over a topic to reveal its guidance.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </LibraryPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/** Story Seed compatibility export while callers migrate to Library naming. */
export const StorySeedHelpMenu = LibraryHelpMenu;

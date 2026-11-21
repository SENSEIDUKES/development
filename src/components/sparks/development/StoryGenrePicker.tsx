import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Ghost,
  Hammer,
  Rocket,
  Sparkle,
  Sparkles,
  Swords,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GenreIcon } from './GenreIcon';
import { findGenrePreset, GENRE_PRESETS, GENRE_SHELVES, genresOnShelf, type GenreShelfId } from '../../story-seed/shared/storyGenres';
import { NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
const workspaceCompactLabelClass = 'block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1';
import { handleRadioGroupKeyDown, radioGroupTabIndex } from '../../story-seed/shared/radioGroupKeyboard';

/** One sigil per shelf; a genre wears its shelf's sigil. */
export const GENRE_SHELF_SIGILS: Record<GenreShelfId, LucideIcon> = {
  martial: Swords,
  fantasy: WandSparkles,
  system: Zap,
  modern: Building2,
  horror: Ghost,
  political: Crown,
  'sci-fi': Rocket,
  discipline: Hammer,
};

/** One sigil per Story Seed genre path, shared with every surface that names a path. */
export const GENRE_PATH_SIGILS: Record<string, LucideIcon> = Object.fromEntries(
  GENRE_PRESETS.map(preset => [preset.id, GENRE_SHELF_SIGILS[preset.shelf]]),
);

const GENRE_PATH_ACCENT = '#A78BFA';
const CUSTOM_GENRE_PATH_ACCENT = '#D4AF37';

/** One more path beside the genre paths, for a host whose story can start without a genre. */
interface ConjurePath {
  active: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
}

interface OriginGenrePickerProps {
  genre: string;
  onChange: (genre: string) => void;
  /** Keeps element ids unique when another surface shows a picker on the same page. */
  idPrefix?: string;
  /** Story Seed needs a genre; a host that can do without one says so. */
  required?: boolean;
  /** The closed picker's words while no path is chosen. */
  emptyTitle?: string;
  emptyHint?: string;
  conjure?: ConjurePath;
  /**
   * A host with little room (Sparks) shows only the one-line chosen
   * path, without the Genre row, and opens the paths where it likes through
   * `open` / `onOpenChange`.
   */
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A path was chosen from the grid — never called while the writer types their own genre. */
  onSelectPath?: (genre: string) => void;
}

export const OriginGenrePicker = ({
  genre,
  onChange,
  idPrefix = 'origin',
  required = true,
  emptyTitle = 'Choose Story Path',
  emptyHint = 'Martial, System, Horror, or your own',
  conjure,
  compact = false,
  open,
  onOpenChange,
  onSelectPath,
}: OriginGenrePickerProps) => {
  const titleId = `${idPrefix}-genre-title`;
  const shelfPanelId = `${idPrefix}-genre-shelf-panel`;
  const presetsId = `${idPrefix}-genre-presets`;
  const customFieldsId = `${idPrefix}-genre-custom-path-fields`;
  const [ownOpen, setOwnOpen] = useState(false);
  const isGenrePickerOpen = open ?? ownOpen;
  const setIsGenrePickerOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(isGenrePickerOpen) : next;
    if (open === undefined) setOwnOpen(value);
    onOpenChange?.(value);
  };
  const [isCustomPathOpen, setIsCustomPathOpen] = useState(false);
  /** Arrow keys move the choice through the paths; only a tap, Enter or Space picks one. */
  const arrowingRef = useRef(false);
  const arrowThroughPaths = (event: KeyboardEvent<HTMLButtonElement>) => {
    arrowingRef.current = true;
    try { handleRadioGroupKeyDown(event); } finally { arrowingRef.current = false; }
  };
  const conjuring = Boolean(conjure?.active);
  const trimmedGenre = conjuring ? '' : genre.trim();
  const chosenPreset = findGenrePreset(trimmedGenre);
  const isCustomGenre = Boolean(trimmedGenre) && !chosenPreset;
  /** The shelf on show: the chosen genre's, until the creator opens another. */
  const [browsedShelf, setBrowsedShelf] = useState<GenreShelfId | null>(null);
  const openShelf: GenreShelfId = browsedShelf ?? chosenPreset?.shelf ?? GENRE_SHELVES[0].id;
  const shelfGenres = genresOnShelf(openShelf);
  /**
   * On a phone the open shelf's genres are one swipe row (◀ ▶ step it, arrow
   * keys move the choice); from md they lay out as a grid and the arrows go.
   */
  const genreRowRef = useRef<HTMLDivElement>(null);
  const [rowEnds, setRowEnds] = useState({ start: true, end: false });
  // A right-to-left interface scrolls the row from 0 into negative offsets, so
  // the row's ends and its steps are read from the distance travelled.
  const isRtl = (row: HTMLElement) => getComputedStyle(row).direction === 'rtl';
  const followRow = () => {
    const row = genreRowRef.current;
    if (!row) return;
    const travelled = Math.abs(row.scrollLeft);
    setRowEnds({ start: travelled <= 4, end: travelled + row.clientWidth >= row.scrollWidth - 4 });
  };
  const stepRow = (step: 1 | -1) => {
    const row = genreRowRef.current;
    const card = row?.querySelector<HTMLElement>('[role="radio"]');
    if (!row || !card) return;
    row.scrollBy({ left: (isRtl(row) ? -step : step) * (card.offsetWidth + 8), behavior: 'smooth' });
  };
  // Opening a shelf shows its start, or the chosen genre, without moving the page.
  useEffect(() => {
    const row = genreRowRef.current;
    if (!row) return;
    const chosen = row.querySelector<HTMLElement>('[aria-checked="true"]');
    if (chosen) {
      const card = chosen.getBoundingClientRect();
      const frame = row.getBoundingClientRect();
      row.scrollLeft += isRtl(row) ? card.right - frame.right : card.left - frame.left;
    } else {
      row.scrollLeft = 0;
    }
    followRow();
  }, [openShelf, isGenrePickerOpen]);
  const isCustomPathActive = !conjuring && (isCustomPathOpen || isCustomGenre);
  const SelectedGenreSigil = GENRE_PATH_SIGILS[trimmedGenre];
  const leaveConjure = () => { if (conjuring) conjure!.onSelect(); };
  const toggleCustomPath = () => {
    const nextOpen = !isCustomPathActive;
    if (!nextOpen && isCustomGenre) onChange('');
    if (nextOpen) leaveConjure();
    setIsCustomPathOpen(nextOpen);
  };
  const chooseConjure = () => {
    setIsCustomPathOpen(false);
    if (!conjuring) conjure!.onSelect();
    setIsGenrePickerOpen(false);
  };

  return (
    <section className={compact ? 'sen-genre-picker' : 'sen-genre-picker glass-panel p-4 sm:p-5'} aria-labelledby={compact ? undefined : titleId} aria-label={compact ? 'Genre' : undefined}>
      {!compact && <div className="mb-3 flex items-center justify-between gap-3">
        <p id={titleId} className={workspaceCompactLabelClass}>Genre{required && <> <span className="text-[#D9B36C]">*</span></>}</p>
        <button type="button" aria-expanded={isGenrePickerOpen} aria-controls={presetsId} onClick={() => setIsGenrePickerOpen(open => !open)}
          className="story-seed-touch-target inline-flex items-center gap-1 font-sc text-[10px] font-bold uppercase tracking-widest text-[#CDB271] transition-colors hover:text-[#E3C878]">
          {isGenrePickerOpen ? 'Close paths' : 'Pick a path'}<ChevronDown size={13} className={isGenrePickerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>}

      {!isGenrePickerOpen && (
        <button type="button" onClick={() => setIsGenrePickerOpen(true)}
          aria-expanded={compact ? false : undefined} aria-label={compact ? `Genre: ${conjuring ? conjure!.title : trimmedGenre || emptyTitle}. Pick a path` : undefined}
          style={{ '--choice-accent': GENRE_PATH_ACCENT } as CSSProperties}
          className={`glass-choice flex w-full items-center gap-3 text-start ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all ${
            conjuring
              ? 'border-[rgba(212,175,55,0.55)] bg-[rgba(212,175,55,0.1)] shadow-[0_0_12px_rgba(212,175,55,0.28)]'
              : !trimmedGenre
              ? 'border-[rgba(150,166,220,0.2)] bg-[rgba(11,14,30,0.6)]'
              : isCustomGenre
                ? 'border-[rgba(212,175,55,0.55)] bg-[rgba(212,175,55,0.1)] shadow-[0_0_12px_rgba(212,175,55,0.28)]'
                : 'border-[rgba(167,139,250,0.55)] bg-[rgba(167,139,250,0.12)] shadow-[0_0_12px_rgba(167,139,250,0.3)]'
          }`}>
            {conjuring
              ? <Sparkle size={15} style={{ color: CUSTOM_GENRE_PATH_ACCENT }} />
              : trimmedGenre
              ? (SelectedGenreSigil
                  ? <SelectedGenreSigil size={16} className="glass-choice-icon" />
                  : <Sparkles size={15} style={{ color: CUSTOM_GENRE_PATH_ACCENT }} />)
              : <GenreIcon size={18} className="glass-choice-icon" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-sc text-[11px] font-bold uppercase tracking-[0.12em] ${trimmedGenre || conjuring ? 'text-signal' : 'text-neutral-200'}`}>
              {conjuring ? conjure!.title : trimmedGenre || emptyTitle}
            </span>
            <span className={`mt-0.5 block font-sans text-[11px] text-neutral-400 ${compact ? 'truncate' : ''}`}>
              {conjuring ? conjure!.hint : chosenPreset ? chosenPreset.definition : trimmedGenre ? 'Your own path — tap to change' : emptyHint}
            </span>
          </span>
          <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-neutral-400" />
        </button>
      )}

      <AnimatePresence initial={false}>
        {isGenrePickerOpen && (
          <motion.div id={presetsId} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="pt-1">
              <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                <span aria-hidden="true" className="flex items-center gap-1.5">
                  <span className="h-px w-5 bg-gradient-to-r from-transparent to-[rgba(167,139,250,0.55)] sm:w-8" />
                  <Sparkle size={9} className="text-[#A78BFA]" />
                </span>
                <h3 className="font-display text-base font-bold uppercase tracking-[0.14em] text-signal sm:text-lg sm:tracking-[0.22em]">Story Paths</h3>
                <span aria-hidden="true" className="flex items-center gap-1.5">
                  <Sparkle size={9} className="text-[#A78BFA]" />
                  <span className="h-px w-5 bg-gradient-to-l from-transparent to-[rgba(167,139,250,0.55)] sm:w-8" />
                </span>
              </div>
              <p className="mt-1.5 text-center font-sans text-xs text-neutral-400">Open a shelf and choose your genre, or define your own.</p>
            </div>

            <div role="radiogroup" aria-label="Genre shelves" className="sen-genre-shelves mt-4 grid grid-cols-4 gap-2">
              {GENRE_SHELVES.map((shelf, index) => {
                const open = shelf.id === openShelf;
                const holdsChoice = chosenPreset?.shelf === shelf.id;
                const Sigil = GENRE_SHELF_SIGILS[shelf.id];
                return (
                  <button key={shelf.id} type="button" role="radio" aria-checked={open} aria-controls={shelfPanelId}
                    tabIndex={radioGroupTabIndex(open, true, index)}
                    onClick={() => setBrowsedShelf(shelf.id)} onKeyDown={handleRadioGroupKeyDown}
                    data-selected={open} style={{ '--choice-accent': GENRE_PATH_ACCENT } as CSSProperties}
                    className="glass-choice relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 px-1 py-2">
                    <Sigil size={17} aria-hidden="true" className="glass-choice-icon" />
                    <span className={`font-sc text-[10px] font-bold uppercase leading-tight tracking-[0.06em] ${open ? 'text-signal' : 'text-neutral-300'}`}>{shelf.name}</span>
                    {holdsChoice && <span aria-hidden="true" className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#A78BFA] shadow-[0_0_6px_rgba(167,139,250,0.8)]" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 md:hidden">
              <button type="button" aria-label="Previous genres" aria-controls={shelfPanelId} disabled={rowEnds.start} onClick={() => stepRow(-1)}
                className="story-seed-touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(150,166,220,0.22)] text-neutral-300 transition-opacity disabled:opacity-30">
                <ChevronLeft size={18} aria-hidden="true" className="rtl:-scale-x-100" />
              </button>
              <p className="font-sc text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">{shelfGenres.length} genres · swipe</p>
              <button type="button" aria-label="Next genres" aria-controls={shelfPanelId} disabled={rowEnds.end} onClick={() => stepRow(1)}
                className="story-seed-touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(150,166,220,0.22)] text-neutral-300 transition-opacity disabled:opacity-30">
                <ChevronRight size={18} aria-hidden="true" className="rtl:-scale-x-100" />
              </button>
            </div>

            <div ref={genreRowRef} onScroll={followRow} id={shelfPanelId} role="radiogroup" aria-label="Story paths"
              style={{ scrollbarWidth: 'none' }}
              className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain md:mt-3 md:grid md:grid-cols-2 md:overflow-visible">
              {shelfGenres.map((preset, index) => {
                const selected = trimmedGenre === preset.id;
                const definitionId = `${idPrefix}-genre-${index}-definition`;
                return (
                  <button key={preset.id} type="button" role="radio" aria-checked={selected}
                    aria-label={preset.name} aria-describedby={definitionId}
                    tabIndex={radioGroupTabIndex(selected, shelfGenres.some(candidate => candidate.id === trimmedGenre), index)}
                    onClick={() => {
                      setIsCustomPathOpen(false); leaveConjure(); onChange(preset.id);
                      if (!arrowingRef.current) onSelectPath?.(preset.id);
                    }} onKeyDown={arrowThroughPaths}
                    data-selected={selected} style={{ '--choice-accent': GENRE_PATH_ACCENT } as CSSProperties}
                    className="glass-choice flex min-h-[5.5rem] w-[82%] shrink-0 snap-start flex-col items-start justify-center gap-1 px-3.5 py-3 text-start md:min-h-[3.25rem] md:w-full md:gap-0.5 md:py-2.5">
                    <span className={`font-sc text-[11px] font-bold uppercase leading-tight tracking-[0.1em] ${selected ? 'text-signal' : 'text-neutral-200'}`}>{preset.name}</span>
                    <span id={definitionId} className="font-sans text-[11px] leading-snug text-neutral-400">{preset.definition}</span>
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={toggleCustomPath}
              aria-expanded={isCustomPathActive} aria-controls={customFieldsId}
              data-selected={isCustomPathActive} style={{ '--choice-accent': CUSTOM_GENRE_PATH_ACCENT } as CSSProperties}
              className="glass-choice mt-3 flex w-full items-center gap-3 px-4 py-3 text-start">
              <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all ${isCustomPathActive ? 'border-[rgba(212,175,55,0.55)] bg-[rgba(212,175,55,0.1)] shadow-[0_0_12px_rgba(212,175,55,0.28)]' : 'border-[rgba(150,166,220,0.2)] bg-[rgba(11,14,30,0.6)]'}`}>
                <Sparkle size={15} className="glass-choice-icon" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-sc text-[11px] font-bold uppercase tracking-[0.12em] ${isCustomPathActive ? 'text-signal' : 'text-neutral-200'}`}>Define My Own Path</span>
                <span className="mt-0.5 block font-sans text-[11px] text-neutral-400">Craft a genre that&rsquo;s uniquely yours.</span>
              </span>
              <ChevronRight size={15} aria-hidden="true" className={`shrink-0 transition-transform ${isCustomPathActive ? 'rotate-90 text-[#D4AF37]' : 'text-neutral-400'}`} />
            </button>

            <AnimatePresence initial={false}>
              {isCustomPathActive && (
                <motion.div id={customFieldsId} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 rounded-xl border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.04)] p-3">
                    <p className="mb-2 flex items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                      <Sparkles size={11} aria-hidden="true" />Define your genre
                    </p>
                    <LibraryTextBox id={`${idPrefix}-genre-custom-input`} size="compact" value={isCustomPathActive ? genre : ''} onChange={onChange} placeholder="Example: urban xianxia mystery" aria-label="Custom genre" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {conjure && (
              <button type="button" onClick={chooseConjure} aria-pressed={conjuring}
                data-selected={conjuring} style={{ '--choice-accent': CUSTOM_GENRE_PATH_ACCENT } as CSSProperties}
                className="glass-choice mt-3 flex w-full items-center gap-3 px-4 py-3 text-start">
                <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all ${conjuring ? 'border-[rgba(212,175,55,0.55)] bg-[rgba(212,175,55,0.1)] shadow-[0_0_12px_rgba(212,175,55,0.28)]' : 'border-[rgba(150,166,220,0.2)] bg-[rgba(11,14,30,0.6)]'}`}>
                  <Sparkles size={15} className="glass-choice-icon" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-sc text-[11px] font-bold uppercase tracking-[0.12em] ${conjuring ? 'text-signal' : 'text-neutral-200'}`}>{conjure.title}</span>
                  <span className="mt-0.5 block font-sans text-[11px] text-neutral-400">{conjure.hint}</span>
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

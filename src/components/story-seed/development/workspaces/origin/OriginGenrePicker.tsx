import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  Building2,
  Castle,
  ChevronDown,
  ChevronRight,
  Crown,
  Eye,
  FlaskConical,
  Flame,
  GraduationCap,
  History,
  House,
  Layers,
  MoonStar,
  Orbit,
  PawPrint,
  Sparkle,
  Sparkles,
  Sword,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GenreIcon } from '../../GenreIcon';
import { GENRE_PRESETS } from '../../constants';
import { NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { workspaceCompactLabelClass } from '../SeedSectionFrame';
import { handleRadioGroupKeyDown, radioGroupTabIndex } from '../../radioGroupKeyboard';

/** One sigil per Story Seed genre path, shared with every surface that names a path. */
export const GENRE_PATH_SIGILS: Record<string, LucideIcon> = {
  Xianxia: Sword,
  Xuanhuan: Flame,
  'LitRPG / System': Zap,
  'Academy Cultivation': GraduationCap,
  'Kingdom Building': Castle,
  'Crafting / Alchemy': FlaskConical,
  'Beast Taming': PawPrint,
  'Tower Climb': Layers,
  Regression: History,
  'Urban Cultivation': Building2,
  'Apocalypse Cultivation': MoonStar,
  'Cosmic Cultivation': Orbit,
  'Political Intrigue': Crown,
  'Cozy Slice-of-Life': House,
  'Mystery Cultivation': Eye,
};

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
   * A host with little room (Dao Insights) shows only the one-line chosen
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
  emptyHint = 'Xianxia, System, Mystery, or your own',
  conjure,
  compact = false,
  open,
  onOpenChange,
  onSelectPath,
}: OriginGenrePickerProps) => {
  const titleId = `${idPrefix}-genre-title`;
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
  const isCustomGenre = Boolean(trimmedGenre) && !GENRE_PRESETS.some(preset => preset.id === trimmedGenre);
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
    <section className={compact ? '' : 'glass-panel p-4 sm:p-5'} aria-labelledby={compact ? undefined : titleId} aria-label={compact ? 'Genre' : undefined}>
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
          className={`glass-choice flex w-full items-center gap-3 text-left ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
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
              {conjuring ? conjure!.hint : trimmedGenre ? 'Your story path — tap to change' : emptyHint}
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
                <h3 className="whitespace-nowrap font-display text-base font-bold uppercase tracking-[0.14em] text-signal sm:text-lg sm:tracking-[0.22em]">Story Paths</h3>
                <span aria-hidden="true" className="flex items-center gap-1.5">
                  <Sparkle size={9} className="text-[#A78BFA]" />
                  <span className="h-px w-5 bg-gradient-to-l from-transparent to-[rgba(167,139,250,0.55)] sm:w-8" />
                </span>
              </div>
              <p className="mt-1.5 text-center font-sans text-xs text-neutral-400">Choose a path, or define your own.</p>
            </div>

            <div role="radiogroup" aria-label="Story paths" className="mt-4 grid grid-cols-2 gap-2 min-[360px]:grid-cols-3">
              {GENRE_PRESETS.map((preset, index) => {
                const selected = trimmedGenre === preset.id;
                const Sigil = GENRE_PATH_SIGILS[preset.id] ?? Sparkles;
                return (
                  <button key={preset.id} type="button" role="radio" aria-checked={selected}
                    tabIndex={radioGroupTabIndex(selected, GENRE_PRESETS.some(candidate => candidate.id === trimmedGenre), index)}
                    onClick={() => {
                      setIsCustomPathOpen(false); leaveConjure(); onChange(preset.id);
                      if (!arrowingRef.current) onSelectPath?.(preset.id);
                    }} onKeyDown={arrowThroughPaths}
                    data-selected={selected} style={{ '--choice-accent': GENRE_PATH_ACCENT } as CSSProperties}
                    className="glass-choice flex min-h-[5.5rem] flex-col items-center justify-center gap-2 px-1.5 py-3">
                    <span aria-hidden="true" className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${selected ? 'border-[rgba(167,139,250,0.55)] bg-[rgba(167,139,250,0.12)] shadow-[0_0_12px_rgba(167,139,250,0.3)]' : 'border-[rgba(150,166,220,0.2)] bg-[rgba(11,14,30,0.6)]'}`}>
                      <Sigil size={16} className="glass-choice-icon" />
                    </span>
                    <span className={`font-sc text-[10px] font-bold uppercase leading-tight tracking-[0.08em] ${selected ? 'text-signal' : 'text-neutral-300'}`}>{preset.name.replace(/\//g, '/\u200B')}</span>
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={toggleCustomPath}
              aria-expanded={isCustomPathActive} aria-controls={customFieldsId}
              data-selected={isCustomPathActive} style={{ '--choice-accent': CUSTOM_GENRE_PATH_ACCENT } as CSSProperties}
              className="glass-choice mt-3 flex w-full items-center gap-3 px-4 py-3 text-left">
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
                className="glass-choice mt-3 flex w-full items-center gap-3 px-4 py-3 text-left">
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

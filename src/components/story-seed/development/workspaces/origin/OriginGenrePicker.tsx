import { useState, type CSSProperties } from 'react';
import {
  Building2,
  Castle,
  ChevronDown,
  ChevronRight,
  Compass,
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
import { GENRE_PRESETS } from '../../constants';
import { LibraryTextBox } from '../../../../library';
import { workspaceCompactLabelClass } from '../WorkspaceShell';
import { handleRadioGroupKeyDown, radioGroupTabIndex } from '../../radioGroupKeyboard';

const GENRE_PATH_SIGILS: Record<string, LucideIcon> = {
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

interface OriginGenrePickerProps {
  genre: string;
  onChange: (genre: string) => void;
}

export const OriginGenrePicker = ({ genre, onChange }: OriginGenrePickerProps) => {
  const [isGenrePickerOpen, setIsGenrePickerOpen] = useState(false);
  const [isCustomPathOpen, setIsCustomPathOpen] = useState(false);
  const trimmedGenre = genre.trim();
  const isCustomGenre = Boolean(trimmedGenre) && !GENRE_PRESETS.some(preset => preset.id === trimmedGenre);
  const isCustomPathActive = isCustomPathOpen || isCustomGenre;
  const SelectedGenreSigil = GENRE_PATH_SIGILS[trimmedGenre];
  const toggleCustomPath = () => {
    const nextOpen = !isCustomPathActive;
    if (!nextOpen && isCustomGenre) onChange('');
    setIsCustomPathOpen(nextOpen);
  };

  return (
    <section className="glass-panel p-4 sm:p-5" aria-labelledby="origin-genre-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p id="origin-genre-title" className={workspaceCompactLabelClass}>Genre <span className="text-[#D9B36C]">*</span></p>
        <button type="button" aria-expanded={isGenrePickerOpen} aria-controls="origin-genre-presets" onClick={() => setIsGenrePickerOpen(open => !open)}
          className="story-seed-touch-target inline-flex items-center gap-1 font-sc text-[10px] font-bold uppercase tracking-widest text-[#CDB271] transition-colors hover:text-[#E3C878]">
          {isGenrePickerOpen ? 'Close paths' : 'Pick a path'}<ChevronDown size={13} className={isGenrePickerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {!isGenrePickerOpen && (
        <button type="button" onClick={() => setIsGenrePickerOpen(true)}
          style={{ '--choice-accent': GENRE_PATH_ACCENT } as CSSProperties}
          className="glass-choice flex w-full items-center gap-3 px-4 py-3 text-left">
          <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all ${
            !trimmedGenre
              ? 'border-[rgba(150,166,220,0.2)] bg-[rgba(11,14,30,0.6)]'
              : isCustomGenre
                ? 'border-[rgba(212,175,55,0.55)] bg-[rgba(212,175,55,0.1)] shadow-[0_0_12px_rgba(212,175,55,0.28)]'
                : 'border-[rgba(167,139,250,0.55)] bg-[rgba(167,139,250,0.12)] shadow-[0_0_12px_rgba(167,139,250,0.3)]'
          }`}>
            {trimmedGenre
              ? (SelectedGenreSigil
                  ? <SelectedGenreSigil size={16} className="glass-choice-icon" />
                  : <Sparkles size={15} style={{ color: CUSTOM_GENRE_PATH_ACCENT }} />)
              : <Compass size={16} className="glass-choice-icon" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-sc text-[11px] font-bold uppercase tracking-[0.12em] ${trimmedGenre ? 'text-signal' : 'text-neutral-200'}`}>
              {trimmedGenre || 'Choose Story Path'}
            </span>
            <span className="mt-0.5 block font-sans text-[11px] text-neutral-400">
              {trimmedGenre ? 'Your story path — tap to change' : 'Xianxia, System, Mystery, or your own'}
            </span>
          </span>
          <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-neutral-400" />
        </button>
      )}

      <AnimatePresence initial={false}>
        {isGenrePickerOpen && (
          <motion.div id="origin-genre-presets" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
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
                    onClick={() => { setIsCustomPathOpen(false); onChange(preset.id); }} onKeyDown={handleRadioGroupKeyDown}
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
              aria-expanded={isCustomPathActive} aria-controls="genre-custom-path-fields"
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
                <motion.div id="genre-custom-path-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 rounded-xl border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.04)] p-3">
                    <p className="mb-2 flex items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                      <Sparkles size={11} aria-hidden="true" />Define your genre
                    </p>
                    <LibraryTextBox id="genre-custom-input" size="compact" value={isCustomGenre ? genre : ''} onChange={onChange} placeholder="Example: urban xianxia mystery" aria-label="Custom genre" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
